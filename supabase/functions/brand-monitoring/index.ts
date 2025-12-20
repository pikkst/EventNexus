// Supabase Edge Function for Brand Monitoring
// Handles all external API calls securely on server-side

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MonitoringRequest {
  action: 'scan-code' | 'scan-domain' | 'scan-brand' | 'scan-search' | 'scan-social' | 'scan-competitors' | 'comprehensive';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify admin user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action }: MonitoringRequest = await req.json();

    let alerts: any[] = [];

    switch (action) {
      case 'scan-code':
        alerts = await scanGitHubCode();
        break;
      case 'scan-domain':
        alerts = await scanDomains();
        break;
      case 'scan-brand':
        alerts = await scanBrand();
        break;
      case 'scan-search':
        alerts = await scanSearch();
        break;
      case 'scan-social':
        alerts = await scanSocial();
        break;
      case 'scan-competitors':
        alerts = await scanCompetitors();
        break;
      case 'comprehensive':
        alerts = await runComprehensiveScan();
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Store alerts in database
    if (alerts.length > 0) {
      const { error } = await supabase
        .from('brand_monitoring_alerts')
        .insert(alerts);

      if (error) {
        console.error('Error storing alerts:', error);
      }
    }

    // Update stats
    await updateMonitoringStats(supabase, alerts);

    return new Response(
      JSON.stringify({ success: true, alertCount: alerts.length, alerts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in brand monitoring:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// GitHub Code Scanning
async function scanGitHubCode() {
  const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
  if (!GITHUB_TOKEN) {
    console.log('GitHub token not configured');
    return [];
  }

  const alerts: any[] = [];

  try {
    // Search for EventNexus mentions in code
    const searchQueries = [
      'EventNexus',
      'eventnexus.eu',
      'event-nexus'
    ];

    for (const query of searchQueries) {
      const response = await fetch(
        `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=10`,
        {
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'EventNexus-Monitor'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        for (const item of data.items || []) {
          // Skip own repository
          if (item.repository.full_name === 'pikkst/EventNexus') continue;

          alerts.push({
            type: 'code',
            severity: 'warning',
            title: `Code mention in ${item.repository.full_name}`,
            description: `Found "${query}" in ${item.path}`,
            url: item.html_url,
            timestamp: new Date().toISOString(),
            status: 'open',
            detected_by: 'github_scan',
            metadata: { repository: item.repository.full_name, path: item.path }
          });
        }
      }
    }
  } catch (error) {
    console.error('GitHub scan error:', error);
  }

  // Add Package Registry Monitoring (npm, PyPI)
  try {
    // Scan npm registry
    const npmResponse = await fetch(
      'https://registry.npmjs.org/-/v1/search?text=eventnexus&size=20'
    );
    
    if (npmResponse.ok) {
      const npmData = await npmResponse.json();
      for (const pkg of npmData.objects || []) {
        // Skip if it's our official package
        if (pkg.package.name === 'eventnexus' || pkg.package.publisher?.username === 'pikkst') continue;
        
        alerts.push({
          type: 'code',
          severity: 'warning',
          title: `Suspicious npm package: ${pkg.package.name}`,
          description: `Package "${pkg.package.name}" may be typosquatting. Description: ${pkg.package.description?.substring(0, 150) || 'No description'}`,
          url: pkg.package.links?.npm || `https://www.npmjs.com/package/${pkg.package.name}`,
          timestamp: new Date().toISOString(),
          status: 'open',
          detected_by: 'npm_registry',
          metadata: { 
            package: pkg.package.name, 
            version: pkg.package.version,
            registry: 'npm'
          }
        });
      }
    }
  } catch (error) {
    console.error('npm registry scan error:', error);
  }

  // Scan PyPI registry
  try {
    const pypiSearch = await fetch(
      'https://pypi.org/search/?q=eventnexus&o='
    );
    // PyPI search returns HTML, so we'll check specific package
    const pypiPackages = ['eventnexus', 'event-nexus', 'eventnexuss'];
    
    for (const pkgName of pypiPackages) {
      try {
        const pkgResponse = await fetch(`https://pypi.org/pypi/${pkgName}/json`);
        if (pkgResponse.ok) {
          const pkgData = await pkgResponse.json();
          alerts.push({
            type: 'code',
            severity: 'warning',
            title: `Suspicious PyPI package: ${pkgName}`,
            description: `Python package "${pkgName}" found on PyPI. ${pkgData.info.summary || 'No summary'}`,
            url: `https://pypi.org/project/${pkgName}/`,
            timestamp: new Date().toISOString(),
            status: 'open',
            detected_by: 'pypi_registry',
            metadata: { 
              package: pkgName,
              version: pkgData.info.version,
              registry: 'pypi'
            }
          });
        }
      } catch (pkgError) {
        // Package doesn't exist, which is good
        continue;
      }
    }
  } catch (error) {
    console.error('PyPI registry scan error:', error);
  }

  // Certificate Transparency Logs - Find SSL certificates
  try {
    const ctResponse = await fetch(
      'https://crt.sh/?q=%25eventnexus%25&output=json',
      { signal: AbortSignal.timeout(10000) }
    );
    
    if (ctResponse.ok) {
      const ctData = await ctResponse.json();
      const seenDomains = new Set();
      
      for (const cert of ctData.slice(0, 10)) {
        const domain = cert.name_value.toLowerCase();
        
        // Skip our own domain and duplicates
        if (domain === 'eventnexus.eu' || domain === '*.eventnexus.eu' || seenDomains.has(domain)) {
          continue;
        }
        
        seenDomains.add(domain);
        
        alerts.push({
          type: 'domain',
          severity: 'warning',
          title: `SSL certificate issued for: ${domain}`,
          description: `Certificate Transparency log shows SSL cert for "${domain}". Issuer: ${cert.issuer_name}`,
          url: `https://crt.sh/?q=${encodeURIComponent(domain)}`,
          timestamp: new Date().toISOString(),
          status: 'open',
          detected_by: 'cert_transparency',
          metadata: { 
            domain,
            issuer: cert.issuer_name,
            serial: cert.serial_number
          }
        });
      }
    }
  } catch (error) {
    console.error('Certificate Transparency scan error:', error);
  }

  return alerts;
}

// Domain Scanning - uses free public WHOIS APIs
async function scanDomains() {
  const alerts: any[] = [];
  const variants = [
    'eventnexuss.eu',
    'eventnexus.com',
    'event-nexus.eu',
    'eventnexuz.eu',
    'evetnexus.eu',
    'eventsnexus.eu'
  ];

  // Try with API key first (if available)
  const WHOIS_API_KEY = Deno.env.get('WHOIS_API_KEY');

  try {
    for (const domain of variants) {
      try {
        let domainInfo = null;

        // Method 1: Try WhoisXML API if key available
        if (WHOIS_API_KEY) {
          const response = await fetch(
            `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${WHOIS_API_KEY}&domainName=${domain}&outputFormat=JSON`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.WhoisRecord) {
              domainInfo = {
                registered: true,
                registrant: data.WhoisRecord.registrant?.name || 'Unknown',
                registrar: data.WhoisRecord.registrarName
              };
            }
          }
        }

        // Method 2: Free RDAP lookup (no API key needed)
        if (!domainInfo) {
          const rdapResponse = await fetch(
            `https://rdap.verisign.com/com/v1/domain/${domain}`
          );
          if (rdapResponse.ok) {
            const rdapData = await rdapResponse.json();
            if (rdapData.status && !rdapData.status.includes('inactive')) {
              domainInfo = {
                registered: true,
                registrant: rdapData.entities?.[0]?.vcardArray?.[1]?.[1]?.[3] || 'Unknown',
                registrar: rdapData.entities?.[0]?.handle || 'Unknown'
              };
            }
          }
        }

        // Method 3: Simple DNS check (always free)
        if (!domainInfo) {
          try {
            const dnsCheck = await fetch(`https://${domain}`, { 
              method: 'HEAD',
              signal: AbortSignal.timeout(5000) 
            });
            if (dnsCheck.ok || dnsCheck.status < 500) {
              domainInfo = {
                registered: true,
                registrant: 'Unknown (DNS active)',
                registrar: 'Unknown'
              };
            }
          } catch (dnsError) {
            // Domain likely not registered
            console.log(`Domain ${domain} appears unregistered`);
          }
        }

        // Create alert if domain is registered
        if (domainInfo?.registered) {
          alerts.push({
            type: 'domain',
            severity: 'warning',
            title: `Suspicious domain registered: ${domain}`,
            description: `Domain ${domain} is registered. Registrant: ${domainInfo.registrant}`,
            url: `https://${domain}`,
            timestamp: new Date().toISOString(),
            status: 'open',
            detected_by: 'domain_scan',
            metadata: { 
              domain, 
              registrar: domainInfo.registrar,
              method: WHOIS_API_KEY ? 'whois_api' : 'free_rdap_dns'
            }
          });
        }
      } catch (domainError) {
        console.error(`Error checking domain ${domain}:`, domainError);
      }
    }

    // URLScan.io security check (free, no API key needed)
    try {
      const urlscanResponse = await fetch(
        'https://urlscan.io/api/v1/search/?q=domain:eventnexus',
        {
          headers: { 'User-Agent': 'EventNexus-Monitor' },
          signal: AbortSignal.timeout(10000)
        }
      );

      if (urlscanResponse.ok) {
        const urlscanData = await urlscanResponse.json();
        
        for (const result of (urlscanData.results || []).slice(0, 5)) {
          const scanDomain = new URL(result.page.url).hostname;
          
          // Skip our own domain
          if (scanDomain === 'eventnexus.eu') continue;
          
          const verdictScore = result.verdicts?.overall?.score || 0;
          const isMalicious = result.verdicts?.overall?.malicious || false;
          
          if (isMalicious || verdictScore > 50) {
            alerts.push({
              type: 'domain',
              severity: 'critical',
              title: `Malicious domain detected: ${scanDomain}`,
              description: `URLScan.io flagged "${scanDomain}" as potentially malicious (score: ${verdictScore})`,
              url: result.result,
              timestamp: new Date().toISOString(),
              status: 'open',
              detected_by: 'urlscan_security',
              metadata: {
                domain: scanDomain,
                score: verdictScore,
                malicious: isMalicious,
                scan_id: result._id
              }
            });
          }
        }
      }
    } catch (urlscanError) {
      console.error('URLScan.io error:', urlscanError);
    }

  } catch (error) {
    console.error('WHOIS scan error:', error);
  }

  return alerts;
}

// Brand Monitoring
async function scanBrand() {
  // Placeholder - requires specific brand monitoring API
  console.log('Brand scanning - implement with Brandwatch/Mention API');
  return [];
}

// Search Engine Monitoring
async function scanSearch() {
  const GOOGLE_API_KEY = Deno.env.get('GOOGLE_SEARCH_KEY');
  const SEARCH_ENGINE_ID = Deno.env.get('GOOGLE_SEARCH_ENGINE');
  
  if (!GOOGLE_API_KEY || !SEARCH_ENGINE_ID) {
    console.log('Google Search API not configured');
    return [];
  }

  const alerts: any[] = [];

  try {
    const query = 'EventNexus clone OR "EventNexus alternative"';
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}`
    );

    if (response.ok) {
      const data = await response.json();
      
      for (const item of data.items || []) {
        alerts.push({
          type: 'search',
          severity: 'info',
          title: `Search result: ${item.title}`,
          description: item.snippet,
          url: item.link,
          timestamp: new Date().toISOString(),
          status: 'open',
          detected_by: 'google_search',
          metadata: { searchQuery: query }
        });
      }
    }
  } catch (error) {
    console.error('Search scan error:', error);
  }

  return alerts;
}

// Social Media Monitoring - uses free Nitter scraper (no API key needed)
async function scanSocial() {
  const alerts: any[] = [];

  // Try Twitter API if token available
  const TWITTER_TOKEN = Deno.env.get('TWITTER_BEARER_TOKEN');
  
  if (TWITTER_TOKEN) {
    try {
      const query = 'EventNexus -from:EventNexusApp';
      const response = await fetch(
        `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=10`,
        {
          headers: {
            'Authorization': `Bearer ${TWITTER_TOKEN}`,
            'User-Agent': 'EventNexus-Monitor'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        for (const tweet of data.data || []) {
          alerts.push({
            type: 'social',
            severity: 'info',
            title: 'Twitter mention detected',
            description: tweet.text.substring(0, 200),
            url: `https://twitter.com/i/web/status/${tweet.id}`,
            timestamp: new Date().toISOString(),
            status: 'open',
            detected_by: 'twitter_api',
            metadata: { tweetId: tweet.id, source: 'twitter_api' }
          });
        }
      }
    } catch (error) {
      console.error('Twitter API error:', error);
    }
  }

  // Fallback: Use free Nitter scraper (no API key needed)
  if (alerts.length === 0) {
    try {
      const nitterInstances = [
        'https://nitter.poast.org',
        'https://nitter.privacydev.net',
        'https://nitter.net'
      ];

      for (const instance of nitterInstances) {
        try {
          const searchUrl = `${instance}/search?q=EventNexus&f=tweets`;
          const response = await fetch(searchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            signal: AbortSignal.timeout(10000)
          });

          if (response.ok) {
            const html = await response.text();
            
            // Basic HTML parsing to find tweets
            const tweetMatches = html.match(/class="tweet-content[^>]*>([\s\S]*?)<\/div/gi) || [];
            const usernameMatches = html.match(/class="username"[^>]*>@([^<]+)</gi) || [];
            const linkMatches = html.match(/href="([^"]+\/status\/\d+)"/gi) || [];

            const maxResults = Math.min(tweetMatches.length, usernameMatches.length, linkMatches.length, 5);

            for (let i = 0; i < maxResults; i++) {
              const tweetContent = tweetMatches[i]
                .replace(/<[^>]*>/g, '')
                .replace(/&[a-z]+;/gi, '')
                .trim()
                .substring(0, 200);

              const username = usernameMatches[i].match(/@([^<]+)/)?.[1] || 'unknown';
              const tweetPath = linkMatches[i].match(/href="([^"]+)"/)?.[1] || '';
              const tweetUrl = tweetPath.startsWith('http') ? tweetPath : `https://twitter.com${tweetPath}`;

              if (tweetContent.toLowerCase().includes('eventnexus')) {
                alerts.push({
                  type: 'social',
                  severity: 'info',
                  title: `Twitter mention by @${username}`,
                  description: tweetContent,
                  url: tweetUrl,
                  timestamp: new Date().toISOString(),
                  status: 'open',
                  detected_by: 'nitter_scraper',
                  metadata: { 
                    username, 
                    source: 'nitter_free',
                    instance: instance 
                  }
                });
              }
            }

            // If found tweets, break the loop
            if (alerts.length > 0) break;
          }
        } catch (instanceError) {
          console.log(`Nitter instance ${instance} failed, trying next...`);
          continue;
        }
      }

      if (alerts.length === 0) {
        console.log('No Twitter mentions found via Nitter scraper');
      }
    } catch (error) {
      console.error('Nitter scraper error:', error);
    }
  }

  return alerts;
}

// Competitor Analysis
async function scanCompetitors() {
  // Placeholder - requires custom implementation
  console.log('Competitor scanning - implement custom logic');
  return [];
}

// Comprehensive Scan
async function runComprehensiveScan() {
  const [codeAlerts, domainAlerts, searchAlerts, socialAlerts] = await Promise.all([
    scanGitHubCode(),
    scanDomains(),
    scanSearch(),
    scanSocial()
  ]);

  return [...codeAlerts, ...domainAlerts, ...searchAlerts, ...socialAlerts];
}

// Update monitoring stats
async function updateMonitoringStats(supabase: any, alerts: any[]) {
  const stats = {
    code_scans: alerts.filter(a => a.type === 'code').length,
    domain_checks: alerts.filter(a => a.type === 'domain').length,
    brand_mentions: alerts.filter(a => a.type === 'brand').length,
    search_results: alerts.filter(a => a.type === 'search').length,
    social_mentions: alerts.filter(a => a.type === 'social').length,
    competitor_alerts: alerts.filter(a => a.type === 'competitor').length,
    critical_alerts: alerts.filter(a => a.severity === 'critical').length,
    warning_alerts: alerts.filter(a => a.severity === 'warning').length,
    info_alerts: alerts.filter(a => a.severity === 'info').length,
    last_scan_time: new Date().toISOString()
  };

  await supabase
    .from('monitoring_stats')
    .upsert({ id: 1, ...stats });
}
