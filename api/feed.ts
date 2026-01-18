import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * RSS/Atom Feed Generator for EventNexus
 * Provides event feeds for AI crawlers, aggregators, and social sharing
 * Supports both RSS 2.0 and Atom 1.0 formats
 */

interface EventFeedEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  date: string;
  time: string;
  price: number;
  location: any;
  imageUrl: string;
  organizerId: string;
  created_at: string;
  updated_at: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    const { format = 'rss' } = req.query as { format?: 'rss' | 'atom' };
    const baseUrl = 'https://eventnexus.eu';
    const now = new Date().toISOString();

    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase credentials');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Fetch recent public events
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('visibility', 'public')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('created_at', { ascending: false })
      .limit(50) as { data: EventFeedEntry[] | null; error: any };

    if (error) {
      console.error('Error fetching events:', error);
      return res.status(500).json({ error: 'Failed to fetch events' });
    }

    let feed: string;

    if (format === 'atom') {
      feed = generateAtomFeed(events || [], baseUrl, now);
      res.setHeader('Content-Type', 'application/atom+xml; charset=UTF-8');
    } else {
      feed = generateRSSFeed(events || [], baseUrl, now);
      res.setHeader('Content-Type', 'application/rss+xml; charset=UTF-8');
    }

    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=1800'); // Cache 30 min
    res.setHeader('X-Robots-Tag', 'all');
    res.status(200).send(feed);
  } catch (error) {
    console.error('Feed generation error:', error);
    res.status(500).json({ error: 'Failed to generate feed' });
  }
}

function generateRSSFeed(events: EventFeedEntry[], baseUrl: string, buildDate: string): string {
  let rss = '<?xml version="1.0" encoding="UTF-8"?>\n';
  rss += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">\n';
  rss += '  <channel>\n';
  rss += '    <title>EventNexus - Upcoming Events</title>\n';
  rss += '    <link>https://eventnexus.eu</link>\n';
  rss += '    <description>Discover amazing events, concerts, conferences, and workshops near you</description>\n';
  rss += '    <language>en</language>\n';
  rss += `    <lastBuildDate>${new Date(buildDate).toUTCString()}</lastBuildDate>\n`;
  rss += `    <pubDate>${new Date(buildDate).toUTCString()}</pubDate>\n`;
  rss += `    <atom:link href="${baseUrl}/api/feed" rel="self" type="application/rss+xml" />\n`;
  rss += '    <generator>EventNexus Feed Generator</generator>\n';
  rss += '    <image>\n';
  rss += `      <url>${baseUrl}/favicon.svg</url>\n`;
  rss += '      <title>EventNexus</title>\n';
  rss += `      <link>${baseUrl}</link>\n`;
  rss += '    </image>\n\n';

  for (const event of events) {
    const eventUrl = `${baseUrl}/event/${event.id}`;
    const pubDate = new Date(event.created_at || event.date).toUTCString();
    const category = escapeXml(event.category || 'Event');
    const location = typeof event.location === 'object'
      ? `${event.location.city}, ${event.location.address}`
      : 'Location TBA';

    rss += '    <item>\n';
    rss += `      <title>${escapeXml(event.name)}</title>\n`;
    rss += `      <link>${eventUrl}</link>\n`;
    rss += `      <guid isPermaLink="true">${eventUrl}</guid>\n`;
    rss += `      <description><![CDATA[${event.description}]]></description>\n`;
    rss += `      <category>${category}</category>\n`;
    rss += `      <pubDate>${pubDate}</pubDate>\n`;
    
    if (event.imageUrl) {
      rss += `      <enclosure url="${escapeXml(event.imageUrl)}" type="image/jpeg" />\n`;
    }

    // Add custom elements
    rss += `      <dc:creator>EventNexus</dc:creator>\n`;
    rss += `      <content:encoded><![CDATA[\n`;
    rss += `        <h2>${escapeXml(event.name)}</h2>\n`;
    if (event.imageUrl) {
      rss += `        <img src="${escapeXml(event.imageUrl)}" alt="${escapeXml(event.name)}" style="max-width:100%;" />\n`;
    }
    rss += `        <p>${event.description}</p>\n`;
    rss += `        <p><strong>Date:</strong> ${event.date} ${event.time || ''}</p>\n`;
    rss += `        <p><strong>Location:</strong> ${location}</p>\n`;
    rss += `        <p><strong>Price:</strong> ${event.price === 0 ? 'FREE' : `€${event.price}`}</p>\n`;
    rss += `        <p><a href="${eventUrl}">View Event Details →</a></p>\n`;
    rss += `      ]]></content:encoded>\n`;
    rss += '    </item>\n\n';
  }

  rss += '  </channel>\n';
  rss += '</rss>';
  return rss;
}

function generateAtomFeed(events: EventFeedEntry[], baseUrl: string, updated: string): string {
  let atom = '<?xml version="1.0" encoding="UTF-8"?>\n';
  atom += '<feed xmlns="http://www.w3.org/2005/Atom">\n';
  atom += '  <title>EventNexus - Upcoming Events</title>\n';
  atom += `  <link href="${baseUrl}" />\n`;
  atom += `  <link href="${baseUrl}/api/feed?format=atom" rel="self" />\n`;
  atom += '  <id>https://eventnexus.eu/</id>\n';
  atom += `  <updated>${updated}</updated>\n`;
  atom += '  <subtitle>Discover amazing events, concerts, conferences, and workshops near you</subtitle>\n';
  atom += '  <generator>EventNexus Feed Generator</generator>\n';
  atom += '  <logo>https://eventnexus.eu/favicon.svg</logo>\n\n';

  for (const event of events) {
    const eventUrl = `${baseUrl}/event/${event.id}`;
    const eventUpdated = event.updated_at || event.created_at || event.date;
    const location = typeof event.location === 'object'
      ? `${event.location.city}, ${event.location.address}`
      : 'Location TBA';

    atom += '  <entry>\n';
    atom += `    <title>${escapeXml(event.name)}</title>\n`;
    atom += `    <link href="${eventUrl}" />\n`;
    atom += `    <id>${eventUrl}</id>\n`;
    atom += `    <updated>${eventUpdated}</updated>\n`;
    atom += `    <published>${event.created_at || event.date}</published>\n`;
    atom += '    <author>\n';
    atom += '      <name>EventNexus</name>\n';
    atom += '    </author>\n';
    atom += `    <category term="${escapeXml(event.category || 'Event')}" />\n`;
    atom += '    <summary type="text">' + escapeXml(event.description) + '</summary>\n';
    atom += '    <content type="html"><![CDATA[\n';
    atom += `      <h2>${escapeXml(event.name)}</h2>\n`;
    if (event.imageUrl) {
      atom += `      <img src="${escapeXml(event.imageUrl)}" alt="${escapeXml(event.name)}" style="max-width:100%;" />\n`;
    }
    atom += `      <p>${event.description}</p>\n`;
    atom += `      <p><strong>Date:</strong> ${event.date} ${event.time || ''}</p>\n`;
    atom += `      <p><strong>Location:</strong> ${location}</p>\n`;
    atom += `      <p><strong>Price:</strong> ${event.price === 0 ? 'FREE' : `€${event.price}`}</p>\n`;
    atom += `      <p><a href="${eventUrl}">View Event Details →</a></p>\n`;
    atom += '    ]]></content>\n';
    atom += '  </entry>\n\n';
  }

  atom += '</feed>';
  return atom;
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
