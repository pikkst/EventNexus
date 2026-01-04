# SEO Implementation Guide - EventNexus

## Overview
EventNexus has comprehensive SEO optimization implemented across all pages, with dynamic meta tag management for user-generated content (events and agency profiles). All content is in **English only** for optimal Google SEO performance.

## Key Features

### 1. Dynamic Meta Tag Management
- **File:** `utils/seoUtils.ts`
- **Functions:**
  - `updatePageMeta()` - Updates title, description, Open Graph, Twitter Cards
  - `generateEventSEO()` - SEO for individual event pages
  - `generateAgencySEO()` - SEO for organizer/agency profiles
  - `generatePricingSEO()` - SEO for pricing page
  - `generateMapSEO()` - SEO for event discovery map
  - `generateDashboardSEO()` - SEO for organizer dashboard
  - `generateCreateEventSEO()` - SEO for event creation flow
  - `resetToHomepageSEO()` - Resets to default homepage SEO

### 2. Structured Data (JSON-LD)
All event pages include Schema.org structured data for rich results:
```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Event Name",
  "description": "Event description",
  "startDate": "2026-01-15T19:00",
  "location": {
    "@type": "Place",
    "name": "Venue Name",
    "address": {...},
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 58.3780,
      "longitude": 26.7290
    }
  },
  "offers": {
    "@type": "Offer",
    "price": "25.00",
    "priceCurrency": "EUR"
  }
}
```

Agency profiles include Organization structured data:
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Agency Name",
  "description": "Agency bio",
  "url": "https://eventnexus.eu/agency/slug",
  "logo": "...",
  "sameAs": ["twitter.com/...", "instagram.com/..."]
}
```

### 3. Meta Tags Implemented

#### Base Meta Tags (index.html)
- Title, description, keywords
- Canonical URL
- Robots directives (index, follow)
- Language (en)

#### Open Graph Tags
- og:type, og:site_name
- og:url, og:title, og:description
- og:image (1200x630px)
- og:image:alt, og:locale

#### Twitter Card Tags
- twitter:card (summary_large_image)
- twitter:title, twitter:description
- twitter:image, twitter:image:alt

## Component Integration

### Pages with Dynamic SEO

1. **EventDetail.tsx** - Event pages
   - Uses `generateEventSEO(event, organizerName)`
   - Includes Schema.org Event structured data
   - Updates on event load, cleans up on unmount

2. **AgencyProfile.tsx** - Organizer profiles
   - Uses `generateAgencySEO(organizer, eventCount)`
   - Includes Schema.org Organization structured data
   - Updates when organizer data loads

3. **PricingPage.tsx** - Pricing plans
   - Uses `generatePricingSEO()`
   - Static meta tags optimized for conversion

4. **HomeMap.tsx** - Event discovery map
   - Uses `generateMapSEO()`
   - Optimized for "events near me" searches

5. **Dashboard.tsx** - Organizer dashboard
   - Uses `generateDashboardSEO()`
   - Private page (noindex via robots.txt)

6. **EventCreationFlow.tsx** - Event creation
   - Uses `generateCreateEventSEO()`
   - Optimized for "create event" keywords

7. **LandingPage.tsx** - Homepage
   - Uses `resetToHomepageSEO()`
   - Default meta tags from index.html

### Implementation Pattern
```tsx
import { generateEventSEO, updatePageMeta, cleanupSEO } from '../utils/seoUtils';

// In component:
useEffect(() => {
  if (data) {
    const seoTags = generateEventSEO(data);
    updatePageMeta(seoTags);
  }

  // Cleanup when component unmounts
  return () => {
    cleanupSEO();
  };
}, [data]);
```

## SEO Best Practices Implemented

### 1. URL Structure
- Clean URLs via `BrowserRouter` (no hash routing)
- Semantic paths: `/event/:id`, `/agency/:slug`
- Canonical URLs on all pages

### 2. Performance
- Lazy loading for non-critical components
- Optimized images (WebP where possible)
- CDN delivery for static assets

### 3. Content Quality
- **All English content** - No mixed languages for SEO consistency
- Unique meta descriptions per page
- Keyword-rich titles (under 60 chars)
- Descriptions under 160 chars
- Alt text on all images

### 4. Mobile Optimization
- Responsive design
- Mobile-first approach
- Touch-friendly UI elements
- Fast mobile load times

### 5. Crawlability
- **robots.txt** - `/public/robots.txt`
  - Allows all crawlers
  - Disallows admin and private pages
  - Points to sitemap
- **sitemap.xml** - `/public/sitemap.xml`
  - Static pages included
  - Priority and change frequency set
  - Updated regularly

## URL Patterns

### Public Pages (Indexed)
- `/` - Homepage
- `/map` - Event discovery map
- `/event/:id` - Event detail pages
- `/agency/:slug` - Organizer profiles (Pro+ only)
- `/pricing` - Pricing plans
- `/help` - Help center
- `/privacy`, `/terms`, `/cookies`, `/gdpr` - Legal pages

### Private Pages (Not Indexed)
- `/admin/*` - Admin pages
- `/dashboard` - Organizer dashboard
- `/profile` - User profile
- `/notifications` - User notifications
- `/create` - Event creation (gated)

## Google Search Console Setup

### Required Actions
1. **Verify Domain:** eventnexus.eu
2. **Submit Sitemap:** https://eventnexus.eu/sitemap.xml
3. **Monitor Coverage:** Check indexed pages
4. **Fix Errors:** Address crawl errors
5. **Performance:** Monitor search performance

### Tracking
- Google Analytics: G-JD7P5ZKF4L
- Meta Pixel: 843922238425309
- Track: PageView on route changes

## Testing SEO

### Manual Tests
1. **View Source:** Check meta tags in browser
2. **Google Rich Results Test:** https://search.google.com/test/rich-results
3. **PageSpeed Insights:** https://pagespeed.web.dev/
4. **Mobile-Friendly Test:** https://search.google.com/test/mobile-friendly

### Tools
- **Lighthouse** - Chrome DevTools audit
- **Screaming Frog** - Crawl analysis
- **Ahrefs/SEMrush** - Competitive analysis

## Monitoring & Maintenance

### Weekly
- Check Google Search Console for errors
- Monitor indexed pages count
- Review search performance

### Monthly
- Update sitemap with new static pages
- Review and update meta descriptions
- Analyze top-performing keywords

### Quarterly
- Audit all page titles and descriptions
- Update structured data as needed
- Review competitor SEO strategies

## Future Enhancements

### Dynamic Sitemap Generation
Create API endpoint to generate dynamic sitemap with:
- All public events
- All Pro+ organizer profiles
- Updated daily via cron job

```typescript
// Future implementation
export async function generateDynamicSitemap(): Promise<string> {
  const events = await getPublicEvents();
  const agencies = await getPublicAgencies();
  
  // Generate XML with all URLs
  return sitemapXML;
}
```

### Multilingual SEO (Future)
While currently English-only, future expansion could include:
- `hreflang` tags for language variants
- Country-specific sitemaps
- Localized content with proper SEO tags

### Advanced Structured Data
- **BreadcrumbList** - Navigation breadcrumbs
- **FAQPage** - FAQ sections
- **Review** - User reviews and ratings
- **AggregateRating** - Combined ratings

## Troubleshooting

### Meta Tags Not Updating
- Check browser cache (hard refresh: Ctrl+Shift+R)
- Verify `useEffect` cleanup is running
- Check console for errors

### Structured Data Errors
- Validate with Google Rich Results Test
- Ensure all required fields present
- Check date formats (ISO 8601)

### Pages Not Indexed
- Check robots.txt isn't blocking
- Verify canonical URLs are correct
- Submit to Google Search Console
- Wait 1-2 weeks for crawl

## Resources

- [Google Search Central](https://developers.google.com/search)
- [Schema.org Event](https://schema.org/Event)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)

---

**Last Updated:** January 4, 2026
**Maintained by:** EventNexus Development Team
**Contact:** huntersest@gmail.com
