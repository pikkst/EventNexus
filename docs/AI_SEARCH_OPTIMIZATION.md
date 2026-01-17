# AI Search Engine Optimization Setup

## Overview

EventNexus is now optimized for AI search engines and LLM indexing (ChatGPT, Claude, Perplexity, etc.). This document explains the setup and implementation.

## What's New

### 1. **Enhanced robots.txt** (`/public/robots.txt`)
- Allows all major AI crawlers: GPTBot, Claude-Web, PerplexityBot, CCBot, anthropic-ai
- Blocks admin pages (`/admin`, `/admin/*`) for all crawlers
- Blocks private user pages (`/dashboard`, `/profile`, `/create`, `/scanner`, `/ticket`) for all crawlers
- Public pages are fully crawlable:
  - `/map` - Event discovery map
  - `/pricing` - Pricing information
  - `/mobile` - Mobile apps page
  - `/beta` - Beta invitation page
  - `/org/:slug`, `/agency/:slug` - Organizer profiles
  - `/event/:id` - Event details

### 2. **SEO Service** (`/src/services/seoService.ts`)
Provides utilities for managing structured data and meta tags:

- **generateEventSchema()** - Creates JSON-LD for events with full metadata
- **generateOrganizationSchema()** - Creates JSON-LD for organizers
- **generateLocalBusinessSchema()** - Geo-targeted schema for events
- **generateWebsiteSchema()** - Website-level structured data
- **generateBreadcrumbSchema()** - Navigation breadcrumbs for crawlers
- **updateMetaTags()** - Dynamically update Open Graph, Twitter, and meta tags
- **injectStructuredData()** - Inject JSON-LD into document head

### 3. **AI Search Optimization Utils** (`/src/utils/aiSearchOptimization.ts`)
Specific utilities for AI crawler optimization:

- **generateAIContentSummary()** - Semantic summary for AI comprehension
- **generateEmbeddingMetadata()** - Prepare data for AI embeddings
- **generatePlainTextForAI()** - Convert data to plain text (no HTML)
- **identifyAICrawler()** - Detect AI crawler from User-Agent
- **sanitizeURLForCrawler()** - Remove tracking parameters for crawlers

### 4. **useSEO React Hook** (`/src/hooks/useSEO.ts`)
Unified SEO management for components:

```tsx
import { useSEO, useEventSEO } from '@/hooks/useSEO';

// For event pages
const EventDetail = ({ event }) => {
  useEventSEO(event);
  return <div>...</div>;
};

// For custom pages
const CustomPage = () => {
  const { setSEO } = useSEO({
    title: 'My Page',
    description: 'Page description',
    url: 'https://www.eventnexus.eu/my-page'
  });
  return <div>...</div>;
};
```

### 5. **Enhanced index.html**
Added comprehensive meta tags:
- AI crawler authorization headers
- Semantic web metadata
- JSON-LD template placeholder
- Content security policies
- Multiple robot meta tags for different crawlers

## How It Works

### For Event Pages
1. When `EventDetail` component loads, `useEventSEO()` is called
2. Hook extracts event data: name, description, image, date, location
3. Updates page meta tags dynamically
4. Injects Event JSON-LD schema into document head
5. AI crawlers see:
   - Title: `{Event Name} - EventNexus`
   - Meta description with event details
   - Structured data with full event information
   - Geographic coordinates for local search
   - Ticket pricing information

### For Organizer Pages
1. When `AgencyProfile` component loads, `useOrganizationSEO()` is called
2. Hook extracts organizer data: name, description, logo, website
3. Updates page meta tags
4. Injects Organization JSON-LD schema
5. AI crawlers see complete organizer profile

### For Admin Pages
- Automatically set to `noindex, nofollow`
- Blocked in robots.txt for all crawlers
- Not indexed by search engines or AI crawlers

## Integration Guide

### Adding SEO to Existing Components

```tsx
import { useEventSEO } from '@/hooks/useSEO';
import { generateEventSchema } from '@/services/seoService';

const MyEventComponent = ({ event }) => {
  // Automatically manages meta tags and structured data
  useEventSEO(event);
  
  return <div>{event.name}</div>;
};
```

### Custom Pages

```tsx
import { usePageSEO } from '@/hooks/useSEO';

const MyPage = () => {
  usePageSEO({
    path: '/my-page',
    title: 'My Page Title',
    description: 'Page description for AI crawlers',
    image: 'https://...'
  });
  
  return <div>Content</div>;
};
```

## What AI Crawlers See

### 1. **GPTBot / ChatGPT**
- Reads all public pages
- Indexes event listings, organizer profiles
- Uses structured data for context
- Generates summaries for ChatGPT plugins

### 2. **Claude-Web / Anthropic**
- Authorized via `claude-crawl-allowlist` meta tag
- Indexes events with full metadata
- Uses JSON-LD for semantic understanding

### 3. **PerplexityBot**
- Crawls event data for Perplexity answers
- Uses OpenGraph tags for summaries
- Respects structured data

### 4. **Google/Bing**
- Traditional search engine optimization
- Enhanced with JSON-LD
- Local business schema for geo-search

## Performance Impact

- **Zero** runtime overhead - SEO utilities run only on page load/change
- Meta tags updated efficiently in document head
- JSON-LD injected once per page
- No blocking operations
- Lazy-loaded SEO services

## Maintenance

### Adding New Pages
1. Import appropriate SEO hook (`useEventSEO`, `usePageSEO`, etc.)
2. Call hook with page data
3. That's it! Meta tags and structured data are automatic

### Updating Page Content
1. Pass updated data to SEO hook
2. Meta tags update automatically
3. AI crawlers see new content on next crawl

### Monitoring Crawlers
Check server logs for these User-Agent strings:
- `GPTBot` - OpenAI crawler
- `Claude-Web` - Anthropic crawler
- `PerplexityBot` - Perplexity AI crawler
- `CCBot` - Common Crawl
- `Googlebot` - Google
- `Bingbot` - Microsoft Bing

## Testing

### 1. **Check Robots.txt**
```
curl https://www.eventnexus.eu/robots.txt
```

### 2. **Test JSON-LD**
Open any event page in browser, inspect:
```javascript
// In console
document.querySelector('script[data-seo-schema]')
```

### 3. **Check Meta Tags**
```javascript
// See all meta tags
document.querySelectorAll('meta')

// See Open Graph tags
document.querySelectorAll('meta[property^="og:"]')
```

### 4. **Use SEO Tools**
- [Google Search Console](https://search.google.com/search-console)
- [Schema.org Validator](https://validator.schema.org/)
- [Facebook Debugger](https://developers.facebook.com/tools/debug/)

## Future Enhancements

1. **Sitemaps** - Generate dynamic XML sitemaps for all events
2. **Feeds** - Create RSS/Atom feeds for AI indexing
3. **Breadcrumbs** - Add breadcrumb schema navigation
4. **FAQ Schema** - Add FAQ sections to help pages
5. **Video Schema** - If adding video event recordings
6. **Event Aggregator** - Become source for AI-powered event aggregators

## Compliance

- ✅ No tracking of AI crawlers
- ✅ Respects robot.txt rules
- ✅ No personally identifiable information exposed
- ✅ User data remains private (dashboard/profile not indexed)
- ✅ Admin pages fully protected
- ✅ GDPR compliant

## Support

For issues or questions about AI search optimization:
1. Check the SEO hook implementation
2. Verify structured data with schema.org validator
3. Review robots.txt configuration
4. Check browser console for errors

---

**Last Updated:** January 15, 2026
**Maintained by:** EventNexus Development Team
