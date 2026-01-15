import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml; charset=utf-8',
};

/**
 * Public Events Sitemap for AI Search Engines
 * Generates XML sitemap with all published events
 * Accessible by: ChatGPT, Claude, Perplexity, Google, Bing
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Fetch all public events using the public function
    const { data: events, error } = await supabase.rpc('get_all_public_events', {
      limit_count: 1000,
      offset_count: 0
    });

    if (error) {
      console.error('Error fetching public events:', error);
      throw error;
    }

    // Generate XML sitemap
    const baseUrl = 'https://www.eventnexus.eu';
    const now = new Date().toISOString();
    
    const urls = events.map((event: any) => {
      const eventDate = event.start_date ? new Date(event.start_date).toISOString() : now;
      return `
    <url>
      <loc>${baseUrl}/events/${event.id}</loc>
      <lastmod>${eventDate}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
      <event:event xmlns:event="http://www.google.com/schemas/sitemap-event/1.0">
        <event:name>${escapeXml(event.name)}</event:name>
        <event:description>${escapeXml(event.description?.substring(0, 200) || '')}</event:description>
        <event:location>${escapeXml(event.location || '')}</event:location>
        <event:start_date>${event.start_date || ''}</event:start_date>
        <event:category>${escapeXml(event.category || '')}</event:category>
        <event:organizer>${escapeXml(event.organizer_name || '')}</event:organizer>
        <event:price>${event.ticket_price || 0}</event:price>
      </event:event>
    </url>`;
    }).join('');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:event="http://www.google.com/schemas/sitemap-event/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!-- EventNexus Public Events Sitemap -->
  <!-- Last Updated: ${now} -->
  <!-- Total Events: ${events.length} -->
  
  <!-- Static Pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/events</loc>
    <lastmod>${now}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/pricing</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <!-- Event Pages -->
  ${urls}
</urlset>`;

    return new Response(sitemap, {
      headers: corsHeaders,
      status: 200,
    });

  } catch (error) {
    console.error('Sitemap generation error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
