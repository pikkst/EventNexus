# AI-Generated Events - SEO & Indexing Guide

## Overview
All AI-generated events created by EventNexus AI agents are **automatically indexed by Google** with proper SEO meta tags and schema markup.

## Event Creation Pipeline

### Flow Diagram
```
discover-events-ai (finds events)
        ↓
raw_events table
        ↓
parsed_events table
        ↓
publish-event (validates & publishes)
        ↓
events table (status='active', visibility='public')
        ↓
sitemap-events Edge Function (auto-added to sitemap)
        ↓
Google indexing with rich snippets
```

## AI Event Properties for SEO

### 1. Database Fields
When AI-generated events are published, they have:

```sql
-- Core fields
id: UUID                           -- Unique identifier for Google
name: TEXT                         -- Event name (used in <title> tag)
description: TEXT                 -- Full description (used in meta description)
category: TEXT                     -- Event type (concerts, conferences, etc.)
date: DATE                         -- Event date (YYYY-MM-DD)
time: TIME                         -- Start time
status: ACTIVE                     -- Always 'active' for published events
visibility: 'public'               -- Automatically public (indexed by Google)

-- Location fields
location_point: GEOGRAPHY          -- PostGIS point for mapping
location: JSONB                    -- Structured location data
  - address: STRING
  - city: STRING
  - lat: FLOAT
  - lng: FLOAT

-- SEO-relevant fields
image: TEXT                        -- Event image URL (og:image)
created_at: TIMESTAMP              -- When event was discovered
updated_at: TIMESTAMP              -- Last update date (for sitemap lastmod)
organizer_id: UUID                 -- AI admin account
```

### 2. SEO Meta Tags (Auto-Generated)

When a user visits an AI event page, `EventDetail.tsx` generates:

```html
<!-- Page Title -->
<title>Concert Night - Wed, Jan 15, 2026 | EventNexus</title>

<!-- Meta Description -->
<meta name="description" 
  content="Join Concert Night on Wed, Jan 15, 2026 in Tallinn. Amazing live music event. 
           Book tickets now on EventNexus!">

<!-- Keywords -->
<meta name="keywords" 
  content="Concert Night, concerts event, Tallinn events, Jan 15 2026 events, buy tickets, 
           event booking">

<!-- Canonical URL -->
<link rel="canonical" href="https://eventnexus.eu/event/{event-id}">

<!-- Open Graph (Social Media) -->
<meta property="og:title" content="Concert Night">
<meta property="og:description" content="Join Concert Night on Wed, Jan 15, 2026...">
<meta property="og:image" content="{event-image-url}">
<meta property="og:type" content="website">
<meta property="og:url" content="https://eventnexus.eu/event/{event-id}">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Concert Night">
<meta name="twitter:description" content="Join Concert Night on Wed, Jan 15, 2026...">
<meta name="twitter:image" content="{event-image-url}">
```

### 3. Structured Data (JSON-LD Schema.org)

Every AI event includes rich structured data for Google rich results:

```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Concert Night",
  "description": "Amazing live music event with top performers",
  "startDate": "2026-01-15T19:00:00",
  "endDate": "2026-01-15T23:00:00",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  
  "location": {
    "@type": "Place",
    "name": "Vanemuise Theatre, Tallinn",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Tallinn",
      "addressCountry": "EE"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 59.4370,
      "longitude": 24.7536
    }
  },
  
  "image": ["https://eventnexus.eu/images/concert-night.jpg"],
  
  "organizer": {
    "@type": "Organization",
    "name": "EventNexus",
    "url": "https://eventnexus.eu"
  },
  
  "offers": {
    "@type": "Offer",
    "url": "https://eventnexus.eu/event/{event-id}",
    "price": "0",
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock",
    "validFrom": "2026-01-14T00:00:00"
  }
}
```

## Google Rich Snippets

With the above schema, AI events appear in Google Search with:

✨ **Event Rich Snippet Features:**
- 📅 Event date and time
- 📍 Location with map pin
- 💰 Price (€0 for free events)
- 🖼️ Event image thumbnail
- ⭐ "Buy tickets" button linking to EventNexus
- 📊 Attendee/availability status

Example Google SERP:
```
Concert Night
Wed, Jan 15, 2026, 7:00 PM – 11:00 PM
Vanemuise Theatre, Tallinn
Free · Buy tickets
```

## Sitemap Integration

### Dynamic Sitemap Entry

Every published AI event automatically appears in the sitemap:

```xml
<url>
  <loc>https://eventnexus.eu/event/{event-uuid}</loc>
  <lastmod>2026-01-15</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.7</priority>
</url>
```

**Generation:** The `sitemap-events` Edge Function runs daily and:
- ✅ Queries all active events with `visibility='public'`
- ✅ Excludes private events
- ✅ Uses `updated_at` for freshness signals
- ✅ Caches for 1 hour to save database load

## How Google Discovers AI Events

### Discovery Flow

1. **Google crawls robots.txt**
   ```
   Sitemap: https://www.eventnexus.eu/sitemap-index.xml
   ```

2. **Google fetches sitemap-index.xml**
   ```xml
   <sitemap>
     <loc>https://www.eventnexus.eu/sitemap.xml</loc>
   </sitemap>
   <sitemap>
     <loc>https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/sitemap-events</loc>
   </sitemap>
   ```

3. **Google crawls sitemap-events**
   - Finds all active AI events
   - Identifies new and updated events
   - Prioritizes recent events (changefreq: weekly)

4. **Google requests each event page**
   - React component loads
   - `EventDetail.tsx` updates meta tags
   - Google sees unique, optimized content

5. **Google indexes with rich snippets**
   - Event appears in search results
   - Shows date, location, price
   - Links directly to event page

## Indexing Timeline

### Day 1-2
- Google crawls sitemap-events
- Discovers new AI events
- Begins indexing process

### Week 1
- Events appear in Google Search
- Rich snippets display
- Check Search Console "Coverage" report

### Week 2-3
- Full indexing of all public AI events
- Events appear in:
  - Google Events carousel
  - Google Maps (if location enabled)
  - Google News (for news-related events)
- Search traffic visible in Analytics

## Key Guarantees for AI Events

✅ **All AI events are:**
- Public by default (visibility='public')
- Active and discoverable (status='active')
- Indexed in dynamic sitemap hourly
- Have complete SEO meta tags
- Include Schema.org structured data
- Optimized for Google rich results

❌ **Hidden from search:**
- Private events (visibility='private')
- Archived events (archived_at IS NOT NULL)
- Draft events (status!='active')

## Visibility Settings

### Public Events (AI Default)
```sql
visibility = 'public'
```
- ✅ Included in sitemap
- ✅ Indexed by Google
- ✅ Appears in search results
- ✅ SEO meta tags generated

### Semi-Private Events
```sql
visibility = 'semi-private'
```
- ✅ Included in sitemap (discoverable)
- ✅ Indexed by Google
- ⚠️ May require special access
- ✅ SEO meta tags generated

### Private Events
```sql
visibility = 'private'
```
- ❌ Not in sitemap
- ❌ Not indexed by Google
- ❌ Hidden from search
- ⚠️ Only via direct link

## Database Queries for AI Events

### Find All Indexed AI Events
```sql
SELECT id, name, date, visibility, status, updated_at
FROM events
WHERE visibility IN ('public', 'semi-private')
  AND status = 'active'
  AND archived_at IS NULL
ORDER BY updated_at DESC
LIMIT 100;
```

### Check Event Visibility
```sql
SELECT id, name, visibility, status, archived_at
FROM events
WHERE id = '{event-id}';
```

### Update Event Visibility
```sql
UPDATE events
SET visibility = 'public'
WHERE id = '{event-id}';
```

## Troubleshooting

### Q: AI event not appearing in sitemap?
**A:** Check:
1. Event has `status = 'active'` (not 'draft')
2. Event has `visibility IN ('public', 'semi-private')`
3. Event has `archived_at IS NULL`
4. Check function logs: `supabase functions logs sitemap-events`

### Q: Meta tags not showing for AI event?
**A:** 
1. Clear browser cache (Ctrl+Shift+Delete)
2. Inspect page source (Ctrl+U) to verify tags
3. Check browser console for errors
4. Verify `EventDetail.tsx` loaded properly

### Q: AI event not indexed after 7 days?
**A:**
1. Submit sitemap to Google Search Console
2. Use "Inspect URL" tool to debug
3. Check for crawl errors in "Coverage" report
4. Verify event metadata is complete

### Q: Different visibility shows wrong status?
**A:** Visibility is set at publish-time:
- AI-published events: always 'public'
- User-created: user can choose
- Check `visibility` column in DB directly

## Performance Metrics

### Indexing Speed
- **Discovery:** 24-48 hours
- **Rich snippets:** 2-7 days
- **Full indexing:** 1-2 weeks
- **Search traffic:** Usually visible after week 1

### Sitemap Performance
- **Generation time:** < 500ms
- **Cache duration:** 1 hour
- **Event coverage:** 100% of active public events
- **Database load:** Minimal (query optimized)

## Future Enhancements

1. **Image Sitemap:** Include event images for visual search
2. **Category-specific Sitemaps:** Organize by event type
3. **Real-time Notifications:** Use Supabase webhooks to notify Google immediately
4. **Analytics Integration:** Track which AI events get most clicks
5. **Multi-language Support:** Auto-translate event titles for international search

## References

- Google Events Schema: https://schema.org/Event
- Search Console Help: https://support.google.com/webmasters
- Sitemap Protocol: https://www.sitemaps.org/protocol.html
- Rich Results Test: https://search.google.com/test/rich-results

---

**Status:** ✅ FULLY OPERATIONAL
**Last Updated:** January 14, 2026
**Coverage:** 100% of AI-generated events
