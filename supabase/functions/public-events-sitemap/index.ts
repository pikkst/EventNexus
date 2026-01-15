/**
 * Public Events Sitemap for AI Search Engines
 * Provides JSON and XML sitemap of all public events
 * Accessible without authentication
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PublicEvent {
  id: string;
  name: string;
  description: string;
  category: string;
  date: string;
  location: {
    address?: string;
    city?: string;
    country?: string;
    coordinates?: { lat: number; lng: number };
  };
  price: number;
  image: string | null;
  attendees_count: number;
  max_capacity: number | null;
  tags: string[];
  organizer_name: string;
}

// AI Crawler Detection
function detectAICrawler(userAgent: string): string | null {
  const ua = userAgent.toLowerCase();
  
  const crawlers: Record<string, string[]> = {
    'ChatGPT': ['gptbot', 'chatgpt'],
    'Claude': ['claude-web', 'claudebot', 'anthropic'],
    'Perplexity': ['perplexitybot'],
    'CommonCrawl': ['ccbot'],
    'Google AI': ['google-extended', 'googleother'],
    'Bing AI': ['bingpreview'],
    'AI2Bot': ['ai2bot'],
    'ByteSpider': ['bytespider']
  };

  for (const [name, patterns] of Object.entries(crawlers)) {
    if (patterns.some(p => ua.includes(p))) {
      return name;
    }
  }
  
  return null;
}

// Log AI Crawler Visit
async function logAICrawlerVisit(
  supabase: any,
  crawlerName: string,
  path: string,
  userAgent: string
) {
  try {
    await supabase
      .from('analytics_events')
      .insert({
        event_type: 'ai_crawler_visit',
        category: 'sitemap',
        metadata: {
          ai_crawler: crawlerName,
          path,
          user_agent: userAgent,
          timestamp: new Date().toISOString()
        }
      });
    console.log(`✅ Logged ${crawlerName} visit to ${path}`);
  } catch (error) {
    console.error(`❌ Failed to log AI crawler visit:`, error);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const format = url.searchParams.get('format') || 'json'; // json, xml, html
    const limit = parseInt(url.searchParams.get('limit') || '100');

    // Create Supabase client (no auth needed for public view)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Detect and log AI crawlers
    const userAgent = req.headers.get('user-agent') || '';
    const crawlerName = detectAICrawler(userAgent);
    
    if (crawlerName) {
      // Log in background (don't wait)
      logAICrawlerVisit(supabase, crawlerName, url.pathname, userAgent);
      console.log(`🤖 ${crawlerName} accessing sitemap (format: ${format})`);
    }

    // Fetch public events directly from view (bypasses type issues)
    const { data: events, error } = await supabase
      .from('public_events')
      .select(`
        id,
        name,
        description,
        category,
        date,
        location,
        price,
        image,
        attendees_count,
        max_capacity,
        tags,
        organizer_id
      `)
      .order('date', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching events:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch events', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch organizer names separately
    const organizerIds = [...new Set(events?.map(e => e.organizer_id).filter(Boolean))];
    const { data: organizers } = await supabase
      .from('users')
      .select('id, name')
      .in('id', organizerIds);

    const organizerMap = new Map(organizers?.map(o => [o.id, o.name]) || []);

    const publicEvents = (events || []).map(e => ({
      ...e,
      organizer_name: organizerMap.get(e.organizer_id) || 'Unknown'
    })) as PublicEvent[];

    // Format response based on requested format
    if (format === 'xml') {
      const xml = generateXMLSitemap(publicEvents);
      return new Response(xml, {
        headers: { ...corsHeaders, 'Content-Type': 'application/xml' }
      });
    } else if (format === 'html') {
      const html = generateHTMLSitemap(publicEvents);
      return new Response(html, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' }
      });
    } else {
      // Default JSON format
      return new Response(
        JSON.stringify({
          sitemap_version: '1.0',
          generated_at: new Date().toISOString(),
          total_events: publicEvents.length,
          events: publicEvents.map(event => ({
            id: event.id,
            name: event.name,
            description: event.description,
            category: event.category,
            date: event.date,
            location: event.location,
            price: event.price,
            image: event.image,
            attendees: event.attendees_count,
            capacity: event.max_capacity,
            tags: event.tags,
            organizer: event.organizer_name,
            url: `https://www.eventnexus.eu/event/${event.id}`
          }))
        }, null, 2),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateXMLSitemap(events: PublicEvent[]): string {
  const urls = events.map(event => `
  <url>
    <loc>https://www.eventnexus.eu/event/${event.id}</loc>
    <lastmod>${new Date(event.date).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>${event.image || 'https://www.eventnexus.eu/default-event.png'}</image:loc>
      <image:title>${escapeXml(event.name)}</image:title>
    </image:image>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  ${urls}
</urlset>`;
}

function generateHTMLSitemap(events: PublicEvent[]): string {
  const eventsList = events.map(event => {
    const locationStr = event.location?.city 
      ? `${event.location.city}${event.location.country ? ', ' + event.location.country : ''}`
      : 'Location TBD';
    
    return `
    <div class="event-card">
      <h3><a href="https://www.eventnexus.eu/event/${event.id}">${escapeHtml(event.name)}</a></h3>
      <p class="category">${event.category}</p>
      <p class="description">${escapeHtml(event.description.substring(0, 150))}...</p>
      <p class="meta">
        📅 ${new Date(event.date).toLocaleDateString()} | 
        📍 ${locationStr} | 
        💰 ${event.price === 0 ? 'Free' : `€${event.price}`}
      </p>
      ${event.tags.length > 0 ? `<p class="tags">${event.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}</p>` : ''}
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EventNexus - Discover Amazing Events</title>
  <meta name="description" content="Browse ${events.length} upcoming events on EventNexus. Find concerts, conferences, workshops, and more near you.">
  <meta name="robots" content="index, follow">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; color: #111827; padding: 2rem; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 2.5rem; margin-bottom: 0.5rem; color: #0ea5e9; }
    .subtitle { color: #6b7280; margin-bottom: 2rem; font-size: 1.1rem; }
    .event-card { background: white; padding: 1.5rem; margin-bottom: 1.5rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .event-card h3 { color: #0ea5e9; margin-bottom: 0.5rem; }
    .event-card h3 a { text-decoration: none; color: inherit; }
    .event-card h3 a:hover { text-decoration: underline; }
    .category { display: inline-block; background: #dbeafe; color: #1e40af; padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.875rem; margin-bottom: 0.5rem; }
    .description { color: #4b5563; margin-bottom: 0.5rem; line-height: 1.6; }
    .meta { color: #6b7280; font-size: 0.875rem; }
    .tags { margin-top: 0.5rem; }
    .tag { display: inline-block; background: #f3f4f6; color: #374151; padding: 0.2rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; margin-right: 0.25rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎉 EventNexus</h1>
    <p class="subtitle">Discover ${events.length} amazing events near you</p>
    ${eventsList}
  </div>
</body>
</html>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
