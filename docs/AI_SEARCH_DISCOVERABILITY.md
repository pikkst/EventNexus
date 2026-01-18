# AI & Search Engine Discoverability Guide

## Overview

EventNexus on nüüd täielikult optimeeritud nii traditsiooniliste otsingumootorite (Google, Bing) kui ka AI agentide (Gemini, Claude, GPT, Perplexity) jaoks. Kõik avalikud leheküljed, eriti eventid, on crawl'itavad ja indexeeritavad.

## 🎯 Implemented Features

### 1. Dynamic Sitemap with Events ✅
**File:** `/api/sitemap.ts` (Vercel/Netlify serverless function)

**Features:**
- ✅ Fetches all published public events from Supabase
- ✅ Includes organizer/agency profiles with slugs
- ✅ Google News sitemap tags for recent events
- ✅ Proper lastmod dates from database
- ✅ 1-hour cache with stale-while-revalidate
- ✅ Supports up to 1000 events + 500 organizers

**URL:** `https://eventnexus.eu/api/sitemap`

**Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <!-- Static pages -->
  <url>
    <loc>https://eventnexus.eu/</loc>
    <priority>1.0</priority>
  </url>
  
  <!-- Dynamic events -->
  <url>
    <loc>https://eventnexus.eu/event/abc123</loc>
    <lastmod>2026-01-18</lastmod>
    <priority>0.8</priority>
    <news:news>
      <news:title>Summer Music Festival</news:title>
    </news:news>
  </url>
  
  <!-- Organizers -->
  <url>
    <loc>https://eventnexus.eu/org/tallinn-events</loc>
    <priority>0.7</priority>
  </url>
</urlset>
```

### 2. Structured Data (JSON-LD) ✅
**File:** `/src/utils/structuredData.ts`

**Schemas Implemented:**
- ✅ `Event` - Google Rich Results for events
- ✅ `Organization` - Organizer profiles
- ✅ `BreadcrumbList` - Navigation hierarchy
- ✅ `WebSite` - Search action support
- ✅ `ItemList` - Event browsing pages

**Example Usage:**
```typescript
import { generateEventStructuredData, injectStructuredData } from '@/utils/structuredData';

// In EventDetail component
useEffect(() => {
  if (event) {
    const structuredData = generateEventStructuredData(event, organizer);
    injectStructuredData(structuredData);
  }
  return () => removeStructuredData();
}, [event]);
```

**Generated Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Summer Music Festival",
  "description": "Amazing outdoor concert...",
  "startDate": "2026-07-15T18:00",
  "location": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Vabaduse väljak 1",
      "addressLocality": "Tallinn"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 59.4370,
      "longitude": 24.7536
    }
  },
  "offers": {
    "@type": "Offer",
    "price": "25.00",
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock"
  }
}
```

### 3. RSS/Atom Feeds ✅
**File:** `/api/feed.ts` (Vercel/Netlify serverless function)

**Features:**
- ✅ RSS 2.0 format for traditional readers
- ✅ Atom 1.0 format for modern aggregators
- ✅ Up to 50 recent public events
- ✅ Full HTML content with images
- ✅ Categories and locations
- ✅ 30-minute cache

**URLs:**
- RSS: `https://eventnexus.eu/api/feed`
- Atom: `https://eventnexus.eu/api/feed?format=atom`

**RSS Example:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>EventNexus - Upcoming Events</title>
    <link>https://eventnexus.eu</link>
    <description>Discover amazing events...</description>
    
    <item>
      <title>Summer Music Festival</title>
      <link>https://eventnexus.eu/event/abc123</link>
      <guid>https://eventnexus.eu/event/abc123</guid>
      <category>Music</category>
      <description>...</description>
      <enclosure url="https://..." type="image/jpeg" />
    </item>
  </channel>
</rss>
```

### 4. Comprehensive robots.txt ✅
**File:** `/public/robots.txt`

**AI Agents Explicitly Allowed:**
- ✅ Google (Googlebot, Google-Extended, GoogleOther)
- ✅ OpenAI (GPTBot, ChatGPT-User, OAI-SearchBot)
- ✅ Anthropic (Claude-Web, anthropic-ai)
- ✅ Perplexity (PerplexityBot)
- ✅ Common Crawlers (CCBot, FacebookBot, Twitterbot, LinkedInBot)
- ✅ Bing (Bingbot, BingPreview)
- ✅ Yandex, Baidu

**Public Pages Allowed:**
```
Allow: /
Allow: /api/sitemap
Allow: /api/feed
Allow: /event/*       # All event detail pages
Allow: /org/*         # Organizer profiles
Allow: /agency/*      # Agency profiles
Allow: /user/*        # Public user profiles
Allow: /events        # Event listing
Allow: /browse        # Event browsing
Allow: /map           # Event map
Allow: /pricing       # Pricing page
Allow: /help          # Help center
Allow: /terms, /privacy, /cookies, /gdpr
```

**Private Pages Blocked:**
```
Disallow: /admin
Disallow: /dashboard
Disallow: /profile
Disallow: /create
Disallow: /notifications
Disallow: /ticket/*
```

### 5. Dynamic Meta Tags ✅
**File:** `/src/utils/metaTags.ts`

**Features:**
- ✅ Update title, description per page
- ✅ Open Graph tags (Facebook, LinkedIn)
- ✅ Twitter Cards
- ✅ Article-specific tags (published/modified time)
- ✅ Canonical URLs
- ✅ Helper functions for events and organizers

**Example Usage:**
```typescript
import { updateMetaTags, generateEventMetaTags } from '@/utils/metaTags';

// In EventDetail component
useEffect(() => {
  if (event) {
    const metaConfig = generateEventMetaTags(event);
    updateMetaTags(metaConfig);
  }
  return () => resetMetaTags();
}, [event]);
```

### 6. SPA Routing Fallback ✅
**File:** `/public/_redirects`

Ensures all dynamic routes work without 404:
```
/assets/*  /assets/:splat  200
/*  /index.html  200
```

## 🤖 AI Agent Integration

### How AI Agents Will Discover Events

1. **Via Sitemap:**
   ```
   AI Agent → https://eventnexus.eu/sitemap.xml
            → https://eventnexus.eu/api/sitemap (dynamic)
            → Discovers /event/{id} URLs
            → Crawls event detail pages
   ```

2. **Via RSS/Atom Feed:**
   ```
   AI Agent → https://eventnexus.eu/api/feed
            → Gets 50 recent events with full HTML
            → Parses structured content
   ```

3. **Via robots.txt:**
   ```
   AI Agent → https://eventnexus.eu/robots.txt
            → Sees explicit Allow rules
            → Discovers /api/sitemap and /api/feed
            → Crawls allowed paths
   ```

4. **Via Structured Data:**
   ```
   AI Agent → https://eventnexus.eu/event/abc123
            → Finds <script type="application/ld+json">
            → Extracts Event schema
            → Understands event details, location, pricing
   ```

### Supported AI Agents

| Agent | User-Agent | Purpose | Access |
|-------|-----------|---------|--------|
| Google Gemini | `Google-Extended`, `GoogleOther` | Training, Search | Full |
| OpenAI GPT | `GPTBot`, `ChatGPT-User` | Training, Chat | Full |
| Anthropic Claude | `Claude-Web`, `anthropic-ai` | Training, Chat | Full |
| Perplexity | `PerplexityBot` | Real-time Search | Full |
| Common Crawlers | `CCBot`, `FacebookBot` | Social Sharing | Limited |

## 📊 What Data is Accessible

### Public Event Data
- ✅ Event name, description, about text
- ✅ Date, time, location (address, coordinates)
- ✅ Category, price, image
- ✅ Organizer information
- ✅ Attendee count, max capacity
- ✅ Translations (if multilingual)

### Organizer/Agency Profiles
- ✅ Name, bio, avatar
- ✅ Social media links
- ✅ Slug/profile URL
- ✅ Verified status

### Blocked Private Data
- ❌ User dashboards
- ❌ Admin panels
- ❌ Private events
- ❌ Ticket details
- ❌ Personal notifications
- ❌ Payment information

## 🚀 Deployment Instructions

### 1. Deploy Serverless Functions

#### Vercel
```bash
# Functions in /api/ directory are automatically deployed
vercel deploy
```

#### Netlify
```bash
# Create netlify.toml
cat > netlify.toml << EOF
[build]
  functions = "api"
  publish = "dist"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
EOF

netlify deploy --prod
```

### 2. Update Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Select `eventnexus.eu` property
3. Navigate to **Sitemaps**
4. Remove old sitemap
5. Add new sitemaps:
   - `https://eventnexus.eu/sitemap.xml` (static fallback)
   - `https://eventnexus.eu/api/sitemap` (dynamic)
6. Submit for indexing

### 3. Test Endpoints

```bash
# Test dynamic sitemap
curl https://eventnexus.eu/api/sitemap | head -50

# Test RSS feed
curl https://eventnexus.eu/api/feed | head -50

# Test Atom feed
curl "https://eventnexus.eu/api/feed?format=atom" | head -50

# Test robots.txt
curl https://eventnexus.eu/robots.txt | grep -A5 "AI AGENTS"
```

### 4. Verify Structured Data

Use Google Rich Results Test:
```
https://search.google.com/test/rich-results?url=https://eventnexus.eu/event/{id}
```

### 5. Monitor Crawling

Check Google Search Console → Coverage → Indexed pages

Expected within 7 days:
- Static pages: 12 indexed
- Event pages: 50+ indexed (as they're added)
- Organizer pages: 20+ indexed

## 🔍 Usage Examples

### Event Component Integration

```typescript
// src/components/EventDetail.tsx
import { useEffect } from 'react';
import { generateEventStructuredData, injectStructuredData, removeStructuredData } from '@/utils/structuredData';
import { updateMetaTags, generateEventMetaTags, resetMetaTags } from '@/utils/metaTags';

export function EventDetail({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EventNexusEvent | null>(null);
  const [organizer, setOrganizer] = useState<User | null>(null);

  useEffect(() => {
    // Fetch event...
  }, [eventId]);

  // SEO optimization
  useEffect(() => {
    if (!event) return;

    // Update meta tags
    const metaConfig = generateEventMetaTags(event);
    updateMetaTags(metaConfig);

    // Add structured data
    const structuredData = generateEventStructuredData(event, organizer);
    injectStructuredData(structuredData);

    // Cleanup on unmount
    return () => {
      resetMetaTags();
      removeStructuredData();
    };
  }, [event, organizer]);

  // Component JSX...
}
```

### Event Listing Page

```typescript
// src/pages/BrowseEvents.tsx
import { generateEventListStructuredData } from '@/utils/structuredData';

export function BrowseEvents() {
  const [events, setEvents] = useState<EventNexusEvent[]>([]);

  useEffect(() => {
    if (events.length > 0) {
      const listSchema = generateEventListStructuredData(events);
      injectStructuredData(listSchema);
    }
  }, [events]);

  // Component JSX...
}
```

### Organizer Profile

```typescript
// src/pages/OrganizerProfile.tsx
import { generateOrganizerStructuredData } from '@/utils/structuredData';
import { generateOrganizerMetaTags } from '@/utils/metaTags';

export function OrganizerProfile({ slug }: { slug: string }) {
  const [organizer, setOrganizer] = useState<User | null>(null);

  useEffect(() => {
    if (!organizer) return;

    // Meta tags
    const metaConfig = generateOrganizerMetaTags(organizer);
    updateMetaTags(metaConfig);

    // Structured data
    const orgSchema = generateOrganizerStructuredData(organizer);
    injectStructuredData(orgSchema);

    return () => {
      resetMetaTags();
      removeStructuredData();
    };
  }, [organizer]);

  // Component JSX...
}
```

## 📈 Expected Outcomes

### Week 1 (Jan 18-25, 2026)
- ✅ Dynamic sitemap indexed by Google
- ✅ RSS/Atom feeds discovered by aggregators
- ✅ AI agents start crawling event pages
- ✅ 10-20 events appear in Google Search

### Month 1 (Jan-Feb 2026)
- ✅ 50-100 events indexed
- ✅ Rich Results show in Google (Event cards)
- ✅ AI chatbots can answer "events in Tallinn"
- ✅ Social shares show proper previews

### Month 3 (Jan-Mar 2026)
- ✅ 200+ events indexed
- ✅ Organic traffic from event searches
- ✅ AI-driven discovery (ChatGPT, Claude, Perplexity)
- ✅ Featured in Google Discover

## 🛠 Troubleshooting

### Sitemap not updating
```bash
# Check Vercel/Netlify function logs
vercel logs
# or
netlify functions:log sitemap

# Manually clear cache
curl -X PURGE https://eventnexus.eu/api/sitemap
```

### Events not appearing in sitemap
```sql
-- Check events table
SELECT id, name, visibility, date 
FROM events 
WHERE visibility = 'public' 
AND date >= CURRENT_DATE 
ORDER BY date 
LIMIT 10;

-- Check if slugs exist for organizers
SELECT id, name, slug, role 
FROM users 
WHERE role IN ('organizer', 'agency') 
AND slug IS NOT NULL;
```

### Structured data errors
Use [Google Rich Results Test](https://search.google.com/test/rich-results):
- Paste event URL
- Check for errors/warnings
- Fix schema in `src/utils/structuredData.ts`

### AI agent blocked
Check robots.txt:
```bash
curl https://eventnexus.eu/robots.txt | grep -A10 "User-agent: GPTBot"
```

Should show `Allow:` rules, not `Disallow`.

## 🎓 Best Practices

### For Event Creators
- ✅ Use descriptive event names
- ✅ Write detailed descriptions (200+ chars)
- ✅ Add high-quality images
- ✅ Fill in all location details
- ✅ Set accurate dates/times
- ✅ Choose relevant categories

### For Organizers
- ✅ Complete profile bio
- ✅ Add social media links
- ✅ Use professional avatar
- ✅ Create unique slug

### For Developers
- ✅ Keep meta tags updated per route
- ✅ Inject structured data on mount
- ✅ Clean up on unmount
- ✅ Test with Google Rich Results
- ✅ Monitor Search Console weekly

## 📚 Resources

- [Schema.org Event](https://schema.org/Event)
- [Google Search Central](https://developers.google.com/search)
- [OpenAI GPTBot](https://platform.openai.com/docs/gptbot)
- [Anthropic Claude Web](https://www.anthropic.com/index/claude-web)
- [RSS 2.0 Specification](https://www.rssboard.org/rss-specification)
- [Atom 1.0 Specification](https://datatracker.ietf.org/doc/html/rfc4287)

## 🔐 Privacy & Compliance

- ✅ Only public data in feeds
- ✅ No personal user information
- ✅ GDPR compliant exports
- ✅ Robots.txt respects privacy zones
- ✅ AI agents cannot access admin/dashboard

## 📞 Support

Issues/questions: huntersest@gmail.com

---
**Status:** Production Ready ✅  
**Last updated:** 2026-01-18  
**Next review:** 2026-02-01
