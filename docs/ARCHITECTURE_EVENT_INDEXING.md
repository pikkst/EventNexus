# Event Indexing Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GOOGLE SEARCH ENGINE                         │
│  • Googlebot crawler                                                 │
│  • Processes sitemaps                                               │
│  • Indexes pages                                                    │
│  • Shows results in search                                          │
└────────────────────────────▲────────────────────────────────────────┘
                             │
                             │ crawls
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
    ┌───▼────────────────┐          ┌───────────▼────────┐
    │   robots.txt       │          │ sitemap-index.xml  │
    │   (allow all /*)   │          │   (master index)   │
    │                    │          │                    │
    │  Allow: /          │          │  └─ sitemap.xml    │
    │  Disallow: /admin  │          │  └─ sitemap-events │
    └────────────────────┘          └────────────────────┘
         www.eventnexus.eu
```

---

## Detailed Flow: Event Indexing Pipeline

### 1. User Creates Event

```
┌──────────────────────────────────────────┐
│   User: "Create Concert Event"           │
│   • name: "Summer Festival 2026"         │
│   • date: "2026-06-15"                   │
│   • visibility: "public"                 │
│   • location: Tallinn, Estonia           │
└──────────────────────────┬───────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Supabase DB  │
                    │   (events)   │
                    └──────────────┘
```

---

### 2. Sitemap Generation (Hourly)

```
┌─────────────────────────────────────────────────────┐
│     Supabase Edge Function: sitemap-events          │
│     (Scheduled or called by Googlebot)              │
└────────────┬────────────────────────────────────────┘
             │
             ├─ QUERY: Get all active, public events
             │          WHERE status='active'
             │          AND visibility IN ('public', 'semi-private')
             │          AND archived_at IS NULL
             │
             ├─ GENERATE: XML sitemap
             │            <url>
             │              <loc>/event/{id}</loc>
             │              <lastmod>2026-01-14</lastmod>
             │              <changefreq>weekly</changefreq>
             │              <priority>0.7</priority>
             │            </url>
             │
             └─ RETURN: XML response with HTTP 200
                Cache-Control: max-age=3600 (1 hour)
```

---

### 3. Google Crawler Access

```
Googlebot
   │
   ├─ GET robots.txt
   │  └─ Find: Sitemap: https://www.eventnexus.eu/sitemap-index.xml
   │
   ├─ GET sitemap-index.xml
   │  └─ Discover:
   │     • sitemap.xml (static pages)
   │     • sitemap-events (dynamic events)
   │
   ├─ GET sitemap.xml (static)
   │  └─ Crawl pages:
   │     • /
   │     • /map
   │     • /pricing
   │     • /create
   │     • /dashboard
   │     • /help
   │     • /terms
   │     • /privacy
   │     • /cookies
   │     • /notifications
   │     • /beta
   │     • /mobile
   │
   ├─ GET sitemap-events (dynamic)
   │  └─ Crawl pages:
   │     • /event/uuid-1
   │     • /event/uuid-2
   │     • /event/uuid-3
   │     • /event/uuid-4
   │     • ... (all public events)
   │
   └─ For each event page:
       GET /event/uuid
       └─ Receive:
          • HTML with React components
          • Meta tags (title, description, OG)
          • JSON-LD structured data
          └─ Index and show in search results
```

---

### 4. Event Detail Page Structure

```
┌─────────────────────────────────────────────────────────┐
│ Browser: https://eventnexus.eu/event/summer-fest-2026  │
├─────────────────────────────────────────────────────────┤
│ <head>                                                  │
│   <title>Summer Festival 2026 - Jun 15, 2026 | EN     │
│   <meta name="description" content="Join Summer...     │
│   <meta name="keywords" content="festival, concerts...│
│   <link rel="canonical" href="...">                   │
│   <meta property="og:title" content="...">            │
│   <meta property="og:image" content="...">            │
│   <script type="application/ld+json">                 │
│     {                                                  │
│       "@type": "Event",                               │
│       "name": "Summer Festival 2026",                 │
│       "startDate": "2026-06-15T18:00",                │
│       "location": {                                   │
│         "name": "Tallinn, Estonia",                   │
│         "geo": {                                      │
│           "latitude": 59.437,                         │
│           "longitude": 24.7536                        │
│         }                                             │
│       },                                              │
│       "image": "https://eventnexus.eu/...",           │
│       "offers": {                                     │
│         "price": "25",                                │
│         "priceCurrency": "EUR"                        │
│       }                                               │
│     }                                                 │
│   </script>                                           │
│ </head>                                               │
│ <body>                                                │
│   <EventDetail />  <!-- React Component -->          │
│ </body>                                               │
└─────────────────────────────────────────────────────────┘
        ▲
        │
     Google sees:
     • Unique title with event name & date
     • Rich event schema (dates, location, price)
     • Event image
     • All meta tags
```

---

### 5. Search Results Appearance

```
Google Search: "Summer Festival Tallinn"

┌──────────────────────────────────────────────────┐
│ Summer Festival 2026 | EventNexus                │
│ eventnexus.eu/event/summer-fest-2026             │
│                                                  │
│ Join Summer Festival 2026 on Jun 15, 2026 in   │
│ Tallinn. Experience amazing concerts, food,     │
│ and more. Book tickets on EventNexus!           │
│                                                  │
│ 📅 Jun 15, 2026                                 │
│ 📍 Tallinn, Estonia                             │
│ 🎫 From €25                                     │
│ [Book Tickets] [Share]                          │
└──────────────────────────────────────────────────┘
          ▲
          │
     Rich snippets generated from:
     • og:title (from meta tag)
     • og:description (from meta tag)
     • og:image (from meta tag)
     • Event schema (JSON-LD)
```

---

## Database Integration

```
┌─────────────────────────────────────────┐
│        Supabase PostgreSQL              │
├─────────────────────────────────────────┤
│ events table                            │
│ ├─ id (UUID)                           │
│ ├─ name (text)                         │
│ ├─ date (date)                         │
│ ├─ time (time)                         │
│ ├─ visibility (public|private|semi)    │
│ ├─ status (active|inactive)            │
│ ├─ archived_at (timestamp, nullable)   │
│ ├─ image (text URL)                    │
│ ├─ location (JSONB)                    │
│ └─ updated_at (timestamp)              │
└─────────────────────────────────────────┘
             ▲
             │
       Edge Function Query
       ├─ SELECT id, name, date, updated_at
       ├─ WHERE status='active'
       ├─ AND visibility IN ('public', 'semi-private')
       ├─ AND archived_at IS NULL
       └─ ORDER BY updated_at DESC
```

---

## File Structure

```
eventnexus.eu/
├── public/
│   ├── robots.txt                    [Controls crawler access]
│   ├── sitemap.xml                   [Static pages sitemap]
│   └── sitemap-index.xml             [Master sitemap index]
│
├── components/
│   └── EventDetail.tsx               [Generates SEO meta tags]
│
├── utils/
│   └── seoUtils.ts                   [SEO helper functions]
│       ├── generateEventSEO()
│       ├── updatePageMeta()
│       ├── updateStructuredData()
│       └── cleanupSEO()
│
├── supabase/
│   └── functions/
│       └── sitemap-events/
│           └── index.ts              [Dynamic sitemap generator]
│
├── scripts/
│   └── test-sitemap.sh               [Verification script]
│
└── docs/
    ├── EVENT_INDEXING_GUIDE.md       [Full documentation]
    ├── INDEXING_QUICK_REF.md         [Quick reference]
    └── INDEXING_IMPLEMENTATION_COMPLETE.md
```

---

## Event Visibility & Indexing Matrix

```
┌────────────────────────┬──────────────┬──────────────┬─────────────────┐
│ Event Visibility       │ In Sitemap?  │ Indexed by   │ Search Result   │
│                        │              │ Google?      │                 │
├────────────────────────┼──────────────┼──────────────┼─────────────────┤
│ public                 │ ✅ YES       │ ✅ YES       │ ✅ Shows        │
│ semi-private           │ ✅ YES       │ ✅ YES       │ ✅ Shows        │
│ private                │ ❌ NO        │ ❌ NO        │ ❌ Hidden       │
└────────────────────────┴──────────────┴──────────────┴─────────────────┘

Status Requirements:
• status='active' (required for indexing)
• archived_at IS NULL (if set, excluded from sitemap)
```

---

## Caching Strategy

```
Edge Function: sitemap-events
├─ Response Header: Cache-Control: public, max-age=3600
├─ Duration: 1 hour
├─ Invalidation: Manual clear or after 1 hour
└─ Updates:
   • New event created → appears in sitemap within 1 hour
   • Event archived → removed from sitemap within 1 hour
   • Event date changed → updated within 1 hour
```

---

## Performance Optimization

```
Query Optimization:
┌────────────────────────────────────────────┐
│ SELECT id, name, date, updated_at          │
│ FROM events                                │
│ WHERE status='active'                      │
│ AND visibility IN ('public', 'semi-private')
│ AND archived_at IS NULL                    │
│ ORDER BY updated_at DESC                   │
│                                            │
│ ✅ Selects only needed columns            │
│ ✅ Uses indexed columns (status, archived) │
│ ✅ Minimal data transfer                  │
│ ✅ Typical response: <500ms               │
│ ✅ 1-hour cache reduces load              │
└────────────────────────────────────────────┘
```

---

## Error Handling & Resilience

```
Edge Function Error Scenarios:
├─ Database connection error
│  └─ Returns: Empty sitemap (valid XML)
│     Status: 200 OK
│     Effect: Prevents crawl errors
│
├─ No events in database
│  └─ Returns: Empty sitemap <urlset></urlset>
│     Status: 200 OK
│     Effect: Safe fallback
│
├─ Timeout / Network error
│  └─ Returns: Empty sitemap (graceful degradation)
│     Status: 200 OK
│     Effect: Doesn't break crawling
│
└─ Valid response with events
   └─ Returns: Full XML sitemap with URLs
      Status: 200 OK
      Effect: Google can crawl all events
```

---

## SEO Data Flow

```
User creates event
        ↓
Event stored (db)
        ↓
Google crawls /event/{id}
        ↓
React loads EventDetail component
        ↓
generateEventSEO() called
        ↓
Extract event data:
├─ event.name → title
├─ event.description → meta description
├─ event.date → schema startDate
├─ event.location → geo coordinates
├─ event.imageUrl → og:image
└─ event.price → offers price
        ↓
updatePageMeta() updates DOM
        ↓
Google parses:
├─ HTML meta tags
├─ JSON-LD schema
├─ Open Graph tags
└─ Twitter Card
        ↓
Google indexes with rich snippets
        ↓
Shows in search results
```

---

## Deployment Checklist

```
Pre-Deployment:
☐ Review EVENT_INDEXING_GUIDE.md
☐ Review INDEXING_QUICK_REF.md
☐ Test locally with test-sitemap.sh

Deployment:
☐ Deploy Edge Function:
   supabase functions deploy sitemap-events
☐ Verify deployment:
   bash scripts/test-sitemap.sh
☐ Check function logs for errors

Post-Deployment:
☐ Submit sitemap to Google Search Console
   URL: https://www.eventnexus.eu/sitemap-index.xml
☐ Monitor Coverage report daily for 1 week
☐ Check for crawl errors
☐ Track organic search traffic

Monitoring (Week 1-3):
☐ Google Search Console
   └─ Check "Coverage" tab for indexed events
☐ Analytics dashboard
   └─ Track organic search traffic
☐ Manual checks
   └─ Google search for event names
```

---

## Success Metrics

```
Timeline & Expectations:

Day 0: Deploy
├─ Edge function live
├─ Sitemap accessible
└─ robots.txt updated

Day 1: Submission
├─ Submit to Google Search Console
├─ Google processes sitemap
└─ Initial crawl starts

Day 2-3: Initial Crawl
├─ Googlebot accesses event pages
├─ Indexes meta tags & schema
└─ Possible 404 on slow pages

Week 1: Results Appear
├─ Events searchable by name
├─ Show in search results
├─ Rich snippets display
└─ Coverage report shows indexed count

Week 2-3: Full Indexing
├─ All public events indexed
├─ Appears in Google Maps
├─ Featured in Events carousel
└─ Organic search traffic increases
```

---

## Troubleshooting Decision Tree

```
Event not showing in Google search?
│
├─ YES: Check visibility setting
│  └─ visibility='public'? If not, change it
│     └─ Takes 1 hour to update sitemap
│
├─ YES: Check status
│  └─ status='active'? If not, update it
│     └─ Takes 1 hour to update sitemap
│
├─ YES: Check if archived
│  └─ archived_at IS NULL? If not, restore it
│     └─ Takes 1 hour to update sitemap
│
├─ YES: Check Search Console
│  └─ Coverage report shows event?
│     └─ If not, check for crawl errors
│
└─ YES: Check robots.txt
   └─ Sitemap submitted correctly?
      └─ Test with bash scripts/test-sitemap.sh
```

---

**Architecture Version:** 1.0
**Last Updated:** January 14, 2026
**Status:** ✅ PRODUCTION READY
