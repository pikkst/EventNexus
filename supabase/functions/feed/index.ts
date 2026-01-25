/**
 * RSS/Atom Feed for Events and Blog Posts
 * Provides dynamic feed for AI agents, RSS readers, and search engines
 * Accessible without authentication
 * Supports both RSS 2.0 and Atom 1.0 formats
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Event {
  id: string;
  name: string;
  description: string;
  category: string;
  date: string;
  location: any;
  price: number;
  image: string | null;
  created_at: string;
  updated_at: string;
  organizer_name: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featured_image_url: string | null;
  published_at: string;
  updated_at: string;
  author: {
    name: string;
  } | null;
}

// Escape XML special characters
function escapeXml(text: string | any): string {
  if (!text) return '';
  // Handle JSONB multilingual fields
  if (typeof text === 'object') {
    text = text.en || text.et || text.ru || '';
  }
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Strip HTML tags for description
function stripHtml(html: string | any): string {
  if (!html) return '';
  // Handle JSONB multilingual fields
  if (typeof html === 'object') {
    html = html.en || html.et || html.ru || '';
  }
  if (typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Generate RSS 2.0 Feed
function generateRSS(events: Event[], blogPosts: BlogPost[]): string {
  const now = new Date().toUTCString();
  const baseUrl = 'https://eventnexus.eu';

  let items = '';

  // Add blog posts
  for (const post of blogPosts) {
    const pubDate = new Date(post.published_at).toUTCString();
    const description = escapeXml(stripHtml(post.excerpt || post.content).substring(0, 300));
    const author = post.author?.name || 'EventNexus Team';

    items += `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
      <description>${description}...</description>
      <pubDate>${pubDate}</pubDate>
      <author>${escapeXml(author)}</author>
      <category>Blog</category>
      ${post.featured_image_url ? `<enclosure url="${escapeXml(post.featured_image_url)}" type="image/jpeg" />` : ''}
    </item>`;
  }

  // Add events
  for (const event of events) {
    const pubDate = new Date(event.created_at).toUTCString();
    const eventDate = new Date(event.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const location = event.location?.city || event.location?.address || 'Location TBA';
    const description = escapeXml(stripHtml(event.description).substring(0, 300));
    const price = event.price === 0 ? 'Free' : `€${event.price}`;

    items += `
    <item>
      <title>${escapeXml(event.name)}</title>
      <link>${baseUrl}/event/${event.id}</link>
      <guid isPermaLink="true">${baseUrl}/event/${event.id}</guid>
      <description>${description}... | Date: ${eventDate} | Location: ${location} | Price: ${price}</description>
      <pubDate>${pubDate}</pubDate>
      <author>${escapeXml(event.organizer_name || 'EventNexus')}</author>
      <category>${escapeXml(event.category)}</category>
      ${event.image ? `<enclosure url="${escapeXml(event.image)}" type="image/jpeg" />` : ''}
    </item>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>EventNexus - Events &amp; Blog Feed</title>
    <link>${baseUrl}</link>
    <description>Discover upcoming events and latest news from EventNexus - Your ultimate event discovery platform</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${baseUrl}/api/feed" rel="self" type="application/rss+xml" />
    <image>
      <url>${baseUrl}/logo-optimized.svg</url>
      <title>EventNexus</title>
      <link>${baseUrl}</link>
    </image>
    ${items}
  </channel>
</rss>`;
}

// Generate Atom 1.0 Feed
function generateAtom(events: Event[], blogPosts: BlogPost[]): string {
  const now = new Date().toISOString();
  const baseUrl = 'https://eventnexus.eu';

  let entries = '';

  // Add blog posts
  for (const post of blogPosts) {
    const published = new Date(post.published_at).toISOString();
    const updated = new Date(post.updated_at).toISOString();
    const summary = escapeXml(stripHtml(post.excerpt || post.content).substring(0, 300));
    const author = post.author?.name || 'EventNexus Team';

    entries += `
  <entry>
    <title>${escapeXml(post.title)}</title>
    <link href="${baseUrl}/blog/${post.slug}" />
    <id>${baseUrl}/blog/${post.slug}</id>
    <published>${published}</published>
    <updated>${updated}</updated>
    <summary type="text">${summary}...</summary>
    <author>
      <name>${escapeXml(author)}</name>
    </author>
    <category term="Blog" />
  </entry>`;
  }

  // Add events
  for (const event of events) {
    const published = new Date(event.created_at).toISOString();
    const updated = new Date(event.updated_at).toISOString();
    const eventDate = new Date(event.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const location = event.location?.city || event.location?.address || 'Location TBA';
    const summary = escapeXml(stripHtml(event.description).substring(0, 300));
    const price = event.price === 0 ? 'Free' : `€${event.price}`;

    entries += `
  <entry>
    <title>${escapeXml(event.name)}</title>
    <link href="${baseUrl}/event/${event.id}" />
    <id>${baseUrl}/event/${event.id}</id>
    <published>${published}</published>
    <updated>${updated}</updated>
    <summary type="text">${summary}... | Date: ${eventDate} | Location: ${location} | Price: ${price}</summary>
    <author>
      <name>${escapeXml(event.organizer_name || 'EventNexus')}</name>
    </author>
    <category term="${escapeXml(event.category)}" />
  </entry>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>EventNexus - Events &amp; Blog Feed</title>
  <link href="${baseUrl}/api/feed" rel="self" />
  <link href="${baseUrl}" />
  <id>${baseUrl}</id>
  <updated>${now}</updated>
  <subtitle>Discover upcoming events and latest news from EventNexus</subtitle>
  <logo>${baseUrl}/logo-optimized.svg</logo>
  ${entries}
</feed>`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const format = url.searchParams.get('format') || 'rss'; // rss or atom
    const limit = parseInt(url.searchParams.get('limit') || '50'); // Default 50 items
    const includeEvents = url.searchParams.get('events') !== 'false'; // Include events by default
    const includeBlog = url.searchParams.get('blog') !== 'false'; // Include blog by default

    // Create Supabase client (no auth needed for public view)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch published events (upcoming only)
    let events: Event[] = [];
    if (includeEvents) {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, description, category, date, location, price, image, created_at, updated_at, organizer:users!organizer_id(name)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(Math.floor(limit * 0.7)); // 70% of limit for events

      if (error) throw error;
      
      // Transform organizer data
      events = (data || []).map((e: any) => ({
        ...e,
        organizer_name: e.organizer?.name || 'EventNexus'
      }));
    }

    // Fetch published blog posts
    let blogPosts: BlogPost[] = [];
    if (includeBlog) {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, content, excerpt, featured_image_url, published_at, updated_at, author:users(name)')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(Math.floor(limit * 0.3)); // 30% of limit for blog

      if (error) throw error;
      blogPosts = data || [];
    }

    // Generate feed based on format
    let feedContent: string;
    let contentType: string;

    if (format === 'atom') {
      feedContent = generateAtom(events, blogPosts);
      contentType = 'application/atom+xml';
    } else {
      feedContent = generateRSS(events, blogPosts);
      contentType = 'application/rss+xml';
    }

    console.log(`✅ Generated ${format.toUpperCase()} feed: ${events.length} events, ${blogPosts.length} blog posts`);

    return new Response(feedContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': `${contentType}; charset=utf-8`,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('❌ Feed generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
