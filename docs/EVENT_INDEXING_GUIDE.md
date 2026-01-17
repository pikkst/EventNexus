# Event Indexing & SEO Implementation Guide

## Overview
This document explains the comprehensive changes made to ensure all user-created events on EventNexus are properly indexed by Google and discoverable through search.

## Problem Statement
- Google Search Console showed 13 pages returning 404 errors
- Static pages like `/dashboard`, `/notifications`, etc. were being blocked by overly restrictive `robots.txt`
- User-created events weren't being indexed by Google
- No dynamic sitemap for events existed

## Solutions Implemented

### 1. Fixed robots.txt Blocking Rules
**File:** `public/robots.txt`

**Changes:**
- Removed blocking of `/dashboard`, `/notifications`, `/profile` (all public pages)
- Kept only `/admin` and `/admin/*` disallowed (private pages)
- Optimized crawl delays: Googlebot (0), Bingbot (1)

**Before:**
```
Disallow: /admin
Disallow: /admin/*
Disallow: /profile
Disallow: /dashboard
Disallow: /notifications
```

**After:**
```
Disallow: /admin
Disallow: /admin/*
```

### 2. Enhanced Static Sitemap
**File:** `public/sitemap.xml`

**Changes:**
- Added missing routes: `/beta`, `/mobile`
- Updated all `lastmod` dates to 2026-01-14
- Proper priority levels for each page
- Covers all static public-facing routes

### 3. Created Sitemap Index
**File:** `public/sitemap-index.xml`

**Purpose:** Provides a master index of all sitemaps for Google to discover

**Structure:**
```xml
<sitemapindex>
  <sitemap>
    <loc>https://www.eventnexus.eu/sitemap.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/sitemap-events</loc>
  </sitemap>
</sitemapindex>
```

### 4. Dynamic Event Sitemap (Edge Function)
**File:** `supabase/functions/sitemap-events/index.ts`

**What it does:**
- Fetches all public and semi-private events from the database
- Generates a live XML sitemap for all events
- Includes event ID, last update date, and proper change frequency
- Automatically caches for 1 hour to reduce database load
- Returns 200 OK even if no events exist (graceful degradation)

**Features:**
- ✅ Queries only active, non-archived events
- ✅ Excludes private events
- ✅ Includes `lastmod` date for proper crawl prioritization
- ✅ Sets `changefreq` to "weekly" for events
- ✅ Sets `priority` to 0.7 (between static pages and homepage)
- ✅ Proper error handling with fallback XML response

**URL:**
```
https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/sitemap-events
```

### 5. Fixed SEO Meta Tags for Events
**File:** `utils/seoUtils.ts`

**Improvements:**
- Fixed description generation to properly handle location object
- Generates comprehensive structured data (Schema.org Event)
- Creates all necessary Open Graph tags for social sharing
- Includes Twitter Card metadata
- Sets canonical URLs for each event

**Generated Meta Tags:**
```html
<title>Event Name - Mon, Jan 14, 2026 | EventNexus</title>
<meta name="description" content="Join Event Name on Mon, Jan 14, 2026 in Tallinn...">
<meta name="keywords" content="Event Name, category event, Tallinn events...">
<link rel="canonical" href="https://eventnexus.eu/event/{id}">
<meta property="og:title" content="Event Name">
<meta property="og:image" content="{event.imageUrl}">
```

**Structured Data (JSON-LD):**
```json
{
  "@type": "Event",
  "name": "Event Name",
  "startDate": "2026-01-14T18:00",
  "location": {
    "@type": "Place",
    "address": {
      "addressLocality": "Tallinn",
      "addressCountry": "EE"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 59.437,
      "longitude": 24.7536
    }
  },
  "offers": {
    "@type": "Offer",
    "price": "25",
    "priceCurrency": "EUR"
  }
}
```

### 6. Component Integration
**File:** `components/EventDetail.tsx`

**Status:** ✅ Already properly configured

The EventDetail component:
- Uses `generateEventSEO()` to create SEO tags when event loads
- Calls `updatePageMeta()` to update document title and meta tags
- Cleans up SEO on component unmount with `cleanupSEO()`
- Each event page now has unique, search-engine-optimized content

## How It Works

### Event Discovery Flow

1. **Google crawls robots.txt**
   ↓
2. **Finds sitemap-index.xml reference**
   ↓
3. **Fetches sitemap-index.xml**
   ↓
4. **Discovers two sitemaps:**
   - `/sitemap.xml` (static pages)
   - `/functions/v1/sitemap-events` (dynamic events)
   ↓
5. **Crawls all URLs in both sitemaps**
   ↓
6. **For each event page:**
   - Loads React component
   - EventDetail triggers SEO meta tag update
   - Google sees:
     * Unique title with event name and date
     * Comprehensive meta description
     * Event schema markup for rich results
     * Open Graph tags for social sharing
   ↓
7. **Event gets indexed with rich snippets**

## Key Benefits

✅ **Public Visibility:** All public events now discoverable via Google Search
✅ **Rich Snippets:** Events show with dates, locations, prices in search results
✅ **Dynamic Updates:** Sitemap auto-updates when events are created/modified
✅ **Proper Caching:** 1-hour cache on dynamic sitemap prevents DB overload
✅ **SEO Best Practices:** Schema.org structured data included
✅ **Social Sharing:** Open Graph tags allow beautiful previews on social media

## Testing

### Manual Testing
Run the test script:
```bash
bash scripts/test-sitemap.sh
```

This verifies:
- ✅ Dynamic sitemap returns 200 OK
- ✅ Valid XML structure
- ✅ robots.txt references correct sitemap
- ✅ sitemap-index.xml exists and is valid

### Google Search Console
1. Go to https://search.google.com/search-console
2. Add the sitemap URLs:
   - `https://www.eventnexus.eu/sitemap-index.xml`
3. Check "Coverage" report to see indexed events
4. Look for any crawl errors in "Coverage" → "Errors"

### Browser Developer Tools
1. Open any event detail page
2. Right-click → "Inspect" → "Head"
3. Verify meta tags are present:
   - `<title>` with event name and date
   - `<meta name="description">`
   - `<meta property="og:image">`
   - `<script type="application/ld+json">` with Event schema

## Deployment Checklist

- [x] Updated `robots.txt` to allow public pages
- [x] Enhanced `sitemap.xml` with static routes
- [x] Created `sitemap-index.xml`
- [x] Created Edge Function for dynamic events sitemap
- [x] Fixed SEO utility functions
- [x] Verified EventDetail component integration
- [ ] Deploy Edge Function: `bash supabase/deploy-functions.sh`
- [ ] Submit sitemap to Google Search Console
- [ ] Monitor Search Console for indexing progress
- [ ] Check Core Web Vitals scores

## Edge Function Deployment

To deploy the new `sitemap-events` function:

```bash
cd /workspaces/EventNexus
supabase functions deploy sitemap-events --project-id anlivujgkjmajkcgbaxw
```

Or using the batch deployment:
```bash
cd /workspaces/EventNexus/supabase
bash deploy-functions.sh
```

## Troubleshooting

### Sitemap not showing events?
- Check that events have `status='active'` in database
- Verify events have `visibility` in ('public', 'semi-private')
- Check that `archived_at` is NULL
- View function logs: `supabase functions logs sitemap-events`

### Meta tags not updating on event pages?
- Clear browser cache (Ctrl+Shift+Delete)
- Check React DevTools to verify EventDetail component loads
- Verify `seoUtils.ts` functions are imported correctly
- Check console for errors with `updatePageMeta()`

### Google not crawling events?
- Submit sitemap-index.xml to Google Search Console
- Check "Coverage" report for any errors
- Use "Inspect URL" tool to debug individual event pages
- Wait 24-48 hours for initial crawl

## Performance Considerations

- **Sitemap caching:** 1 hour (3600 seconds) to balance freshness vs. load
- **Event query:** Optimized to select only needed columns (id, name, date, updated_at)
- **Batch processing:** Google typically crawls sitemaps in batches
- **Rate limiting:** Google respects robots.txt crawl-delay of 1 second

## Future Improvements

1. **Organization/Agency Sitemaps:** Generate sitemap for organizer pages
2. **Image Sitemaps:** Add image URLs for visual search
3. **Event Categories:** Separate sitemaps per category for targeted crawling
4. **Pagination:** When event count exceeds 50,000, split into multiple sitemaps
5. **Real-time Updates:** Use Supabase webhooks to notify Google of new events immediately

## References

- Google Search Central: https://developers.google.com/search
- Schema.org Event Type: https://schema.org/Event
- Sitemap Protocol: https://www.sitemaps.org/protocol.html
- Open Graph Protocol: https://ogp.me/

---

**Last Updated:** January 14, 2026
**Document Version:** 1.0
