import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Dynamic sitemap generator for EventNexus
 * Generates XML sitemap with public pages, published events, organizers, and agencies
 * Crawlable by Google, Bing, and AI agents (Gemini, Claude, GPT)
 */

interface EventSitemapEntry {
  id: string;
  updated_at: string;
  name: string;
  category: string;
}

interface OrganizerSitemapEntry {
  slug: string;
  updated_at: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    const baseUrl = 'https://eventnexus.eu';
    const now = new Date().toISOString().split('T')[0];

    // Initialize Supabase client (uses anon key for public data)
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase credentials');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Static pages with their priorities
    const staticPages = [
      { path: '/', priority: 1.0, changefreq: 'daily' },
      { path: '/map', priority: 0.9, changefreq: 'daily' },
      { path: '/browse', priority: 0.9, changefreq: 'daily' },
      { path: '/events', priority: 0.9, changefreq: 'daily' },
      { path: '/pricing', priority: 0.8, changefreq: 'monthly' },
      { path: '/beta', priority: 0.7, changefreq: 'monthly' },
      { path: '/help', priority: 0.7, changefreq: 'monthly' },
      { path: '/privacy', priority: 0.5, changefreq: 'yearly' },
      { path: '/terms', priority: 0.5, changefreq: 'yearly' },
      { path: '/cookies', priority: 0.5, changefreq: 'yearly' },
      { path: '/gdpr', priority: 0.5, changefreq: 'yearly' },
      { path: '/mobile', priority: 0.6, changefreq: 'monthly' },
    ];

    // Fetch published public events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, updated_at, name, category')
      .eq('visibility', 'public')
      .gte('date', now) // Future events only
      .order('date', { ascending: true })
      .limit(1000) as { data: EventSitemapEntry[] | null; error: any };

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
    }

    // Fetch organizer/agency profiles with slugs
    const { data: organizers, error: orgsError } = await supabase
      .from('users')
      .select('slug, updated_at')
      .in('role', ['organizer', 'agency'])
      .not('slug', 'is', null)
      .limit(500) as { data: OrganizerSitemapEntry[] | null; error: any };

    if (orgsError) {
      console.error('Error fetching organizers:', orgsError);
    }

    // Build XML sitemap
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"\n';
    xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

    // Add static pages
    for (const page of staticPages) {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}${page.path}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    }

    // Add published events
    if (events && events.length > 0) {
      for (const event of events) {
        const lastmod = event.updated_at ? event.updated_at.split('T')[0] : now;
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/event/${event.id}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        // Add news sitemap tags for recent events
        const eventDate = new Date(lastmod);
        const daysSinceUpdate = Math.floor((Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceUpdate <= 2) {
          xml += '    <news:news>\n';
          xml += '      <news:publication>\n';
          xml += '        <news:name>EventNexus</news:name>\n';
          xml += '        <news:language>en</news:language>\n';
          xml += '      </news:publication>\n';
          xml += `      <news:publication_date>${event.updated_at}</news:publication_date>\n`;
          xml += `      <news:title>${escapeXml(event.name)}</news:title>\n`;
          xml += `      <news:keywords>${escapeXml(event.category)}</news:keywords>\n`;
          xml += '    </news:news>\n';
        }
        xml += '  </url>\n';
      }
    }

    // Add organizer/agency profiles
    if (organizers && organizers.length > 0) {
      for (const org of organizers) {
        const lastmod = org.updated_at ? org.updated_at.split('T')[0] : now;
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/org/${org.slug}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>monthly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += '  </url>\n';
        // Also add /agency/ variant
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/agency/${org.slug}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>monthly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += '  </url>\n';
      }
    }

    xml += '</urlset>';

    res.setHeader('Content-Type', 'application/xml; charset=UTF-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('X-Robots-Tag', 'all');
    res.status(200).send(xml);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).json({ error: 'Failed to generate sitemap' });
  }
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
