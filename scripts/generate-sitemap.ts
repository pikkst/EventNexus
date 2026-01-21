#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Build-time sitemap generator for GitHub Pages deployment
 * Fetches data from Supabase and generates static sitemap.xml
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

interface BlogPostSitemapEntry {
  slug: string;
  published_at: string;
  updated_at: string;
  title: string | { en: string };
}

async function generateSitemap() {
  try {
    console.log('🗺️  Generating sitemap.xml...');
    
    const baseUrl = 'https://eventnexus.eu';
    const now = new Date().toISOString().split('T')[0];

    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing Supabase credentials in environment');
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Static pages with priorities (all public pages for AI crawlers)
    const staticPages = [
      // Main pages - highest priority
      { path: '/', priority: 1.0, changefreq: 'daily' },
      { path: '/map', priority: 0.9, changefreq: 'daily' },
      { path: '/browse', priority: 0.9, changefreq: 'daily' },
      { path: '/events', priority: 0.9, changefreq: 'daily' },
      { path: '/blog', priority: 0.9, changefreq: 'daily' },
      
      // Signup & pricing pages
      { path: '/pricing', priority: 0.8, changefreq: 'monthly' },
      { path: '/beta', priority: 0.7, changefreq: 'monthly' },
      { path: '/beta-signup', priority: 0.7, changefreq: 'monthly' },
      
      // Mobile & apps
      { path: '/mobile', priority: 0.6, changefreq: 'monthly' },
      
      // Help & support
      { path: '/help', priority: 0.7, changefreq: 'monthly' },
      
      // Legal pages (important for AI to understand policies)
      { path: '/privacy', priority: 0.5, changefreq: 'yearly' },
      { path: '/terms', priority: 0.5, changefreq: 'yearly' },
      { path: '/cookies', priority: 0.5, changefreq: 'yearly' },
      { path: '/gdpr', priority: 0.5, changefreq: 'yearly' },
    ];

    console.log('📡 Fetching published events...');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, updated_at, name, category')
      .eq('visibility', 'public')
      .gte('date', now)
      .order('date', { ascending: true })
      .limit(1000) as { data: EventSitemapEntry[] | null; error: any };

    if (eventsError) {
      console.error('⚠️  Error fetching events:', eventsError);
    } else {
      console.log(`✅ Found ${events?.length || 0} published events`);
    }

    console.log('📡 Fetching organizer profiles...');
    const { data: organizers, error: orgsError } = await supabase
      .from('users')
      .select('slug, updated_at')
      .in('role', ['organizer', 'agency'])
      .not('slug', 'is', null)
      .limit(500) as { data: OrganizerSitemapEntry[] | null; error: any };

    if (orgsError) {
      console.error('⚠️  Error fetching organizers:', orgsError);
    } else {
      console.log(`✅ Found ${organizers?.length || 0} organizer profiles`);
    }

    console.log('📡 Fetching blog posts...');
    const { data: blogPosts, error: blogError } = await supabase
      .from('blog_posts')
      .select('slug, published_at, updated_at, title')
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(1000) as { data: BlogPostSitemapEntry[] | null; error: any };

    if (blogError) {
      console.error('⚠️  Error fetching blog posts:', blogError);
    } else {
      console.log(`✅ Found ${blogPosts?.length || 0} blog posts`);
    }

    // Build XML sitemap with AI-optimized namespaces
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<!-- EventNexus Dynamic Sitemap - Optimized for Google, Bing, Gemini, Claude, GPT and other AI crawlers -->\n';
    xml += '<!-- Last generated: ' + new Date().toISOString() + ' -->\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"\n';
    xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n';
    xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

    // Add static pages with AI-friendly descriptions
    xml += '  <!-- Core Platform Pages (Public & AI-crawlable) -->\n';
    for (const page of staticPages) {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}${page.path}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    }

    // Add published events (Dynamic content for AI discovery)
    xml += '\n  <!-- Published Public Events (Live Data) -->\n';
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

    // Add organizer/agency profiles (Business entities for AI)
    xml += '\n  <!-- Organizer & Agency Profiles -->\n';
    if (organizers && organizers.length > 0) {
      for (const org of organizers) {
        const lastmod = org.updated_at ? org.updated_at.split('T')[0] : now;
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/org/${org.slug}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>monthly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += '  </url>\n';
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/agency/${org.slug}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>monthly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += '  </url>\n';
      }
    }

    // Add blog posts (Content for AI knowledge base)
    xml += '\n  <!-- Blog Articles & News (AI Training Data) -->\n';
    if (blogPosts && blogPosts.length > 0) {
      for (const post of blogPosts) {
        const lastmod = post.updated_at ? post.updated_at.split('T')[0] : now;
        const pubDate = post.published_at;
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/blog/${post.slug}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        
        // Add news sitemap tags for recent blog posts
        const postDate = new Date(pubDate);
        const daysSincePublish = Math.floor((Date.now() - postDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSincePublish <= 7) {
          xml += '    <news:news>\n';
          xml += '      <news:publication>\n';
          xml += '        <news:name>EventNexus Blog</news:name>\n';
          xml += '        <news:language>en</news:language>\n';
          xml += '      </news:publication>\n';
          xml += `      <news:publication_date>${pubDate}</news:publication_date>\n`;
          const titleEn = typeof post.title === 'object' ? (post.title as any).en : post.title;
          xml += `      <news:title>${escapeXml(titleEn || 'Blog Post')}</news:title>\n`;
          xml += '    </news:news>\n';
        }
        xml += '  </url>\n';
      }
    }

    xml += '</urlset>';

    // Write to public directory
    const publicDir = path.join(process.cwd(), 'public');
    const sitemapPath = path.join(publicDir, 'sitemap.xml');
    
    fs.writeFileSync(sitemapPath, xml, 'utf-8');
    
    const totalUrls = staticPages.length + 
                      (events?.length || 0) + 
                      (organizers?.length || 0) * 2 + 
                      (blogPosts?.length || 0);
    
    console.log(`✅ Sitemap generated successfully: ${sitemapPath}`);
    console.log(`📊 Total URLs: ${totalUrls}`);
    console.log(`   - Static pages: ${staticPages.length}`);
    console.log(`   - Events: ${events?.length || 0}`);
    console.log(`   - Organizers: ${(organizers?.length || 0) * 2} (org + agency URLs)`);
    console.log(`   - Blog posts: ${blogPosts?.length || 0}`);
    
  } catch (error) {
    console.error('❌ Sitemap generation failed:', error);
    process.exit(1);
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

// Run the generator
generateSitemap();
