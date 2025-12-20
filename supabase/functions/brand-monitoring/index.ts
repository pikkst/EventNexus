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

  return alerts;
}

// Domain Scanning
async function scanDomains() {
  const WHOIS_API_KEY = Deno.env.get('WHOIS_API_KEY');
  if (!WHOIS_API_KEY) {
    console.log('WHOIS API key not configured');
    return [];
  }

  const alerts: any[] = [];
  const variants = [
    'eventnexuss.eu',
    'eventnexus.com',
    'event-nexus.eu',
    'eventnexuz.eu',
    'evetnexus.eu',
    'eventsnexus.eu'
  ];

  try {
    for (const domain of variants) {
      const response = await fetch(
        `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${WHOIS_API_KEY}&domainName=${domain}&outputFormat=JSON`
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.WhoisRecord) {
          alerts.push({
            type: 'domain',
            severity: 'warning',
            title: `Suspicious domain registered: ${domain}`,
            description: `Domain ${domain} is registered. Registrant: ${data.WhoisRecord.registrant?.name || 'Unknown'}`,
            url: `https://${domain}`,
            timestamp: new Date().toISOString(),
            status: 'open',
            detected_by: 'whois_scan',
            metadata: { domain, registrar: data.WhoisRecord.registrarName }
          });
        }
      }
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

// Social Media Monitoring
async function scanSocial() {
  const TWITTER_TOKEN = Deno.env.get('TWITTER_BEARER_TOKEN');
  
  if (!TWITTER_TOKEN) {
    console.log('Twitter API not configured');
    return [];
  }

  const alerts: any[] = [];

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
          title: 'Twitter mention',
          description: tweet.text,
          url: `https://twitter.com/i/web/status/${tweet.id}`,
          timestamp: new Date().toISOString(),
          status: 'open',
          detected_by: 'twitter_scan',
          metadata: { tweetId: tweet.id }
        });
      }
    }
  } catch (error) {
    console.error('Social scan error:', error);
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
