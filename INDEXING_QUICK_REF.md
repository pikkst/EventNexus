# Event Indexing - Quick Reference

## What Changed?
EventNexus now automatically indexes all user-created events on Google Search. Users can find events directly through Google Search!

## For Developers

### Files Modified
1. **`public/robots.txt`** - Removed blocking of public pages
2. **`public/sitemap.xml`** - Added missing routes
3. **`public/sitemap-index.xml`** - NEW: Master sitemap index
4. **`supabase/functions/sitemap-events/index.ts`** - NEW: Dynamic events sitemap
5. **`utils/seoUtils.ts`** - Fixed location handling in descriptions
6. **`EVENT_INDEXING_GUIDE.md`** - Full technical documentation

### Deploy Edge Function
```bash
cd /workspaces/EventNexus
supabase functions deploy sitemap-events --project-id anlivujgkjmajkcgbaxw
```

### Verify Deployment
```bash
bash scripts/test-sitemap.sh
```

## For Google Search Console Admins

### Steps to Activate
1. Go to: https://search.google.com/search-console
2. Select EventNexus property
3. Go to **Sitemaps** (left sidebar)
4. Add new sitemap: `https://www.eventnexus.eu/sitemap-index.xml`
5. Click "Submit"

### Monitor Progress
- Check **Coverage** report daily for the first week
- Look for events appearing in "Indexed" count
- Use "Inspect URL" to debug specific event pages

## How It Works

```
Google Bot
    ↓
robots.txt → sitemap-index.xml
    ↓
sitemap.xml (static)     sitemap-events (dynamic)
    ↓                              ↓
[/map, /pricing, ...]      [/event/uuid1, /event/uuid2, ...]
    ↓                              ↓
SEO Meta Tags            Event Schema + Meta Tags
    ↓                              ↓
Google Search Results
```

## What Gets Indexed

### ✅ Public Events
- All events with `visibility = 'public'`
- Updated in real-time (cached 1 hour)
- Shows in search results with rich snippets

### ✅ Semi-Private Events  
- Events with `visibility = 'semi-private'`
- Included in sitemap for discovery
- Users can still access if they have link

### ❌ Private Events
- Events with `visibility = 'private'`
- NOT included in sitemap (hidden from search)
- Only accessible via direct link

## SEO Features Included

✨ **Rich Snippets in Search Results**
- Event name, date, time
- Location with map marker
- Price and availability
- Event image

💬 **Social Media Previews**
- Proper Open Graph tags
- Twitter Card support
- Beautiful share previews

📍 **Structured Data (Schema.org)**
- Event schema for Google rich results
- Enables Google Events carousel
- Improves click-through rates

## Expected Results

After deployment:

**Day 1-2:**
- Sitemap submitted and processed
- Google begins crawling event pages

**Week 1:**
- Events start appearing in search results
- Rich snippets display with dates/prices
- Check Coverage report for status

**Week 2-3:**
- All public events should be indexed
- Search traffic to platform increases
- Events appear in Google Maps
- Featured in Events carousel

## Troubleshooting

**Q: Events not showing up?**
A: Events take 24-48 hours to index. Check Search Console Coverage report.

**Q: Old events still showing?**
A: Mark events as archived to remove from search. They'll be removed within days.

**Q: My private event is visible in search?**
A: Check event visibility setting. Change to "private" to hide from search.

**Q: SEO tags not updating?**
A: Clear cache (Ctrl+Shift+Del). Check console for errors. Verify EventDetail component loads.

## Performance

- **Sitemap updates:** Every 1 hour (automatically)
- **Event discovery:** 24-48 hours typical
- **Rich snippets:** Show within 2-7 days
- **Search traffic:** Usually visible after week 1

## URLs

- **Sitemap Index:** https://www.eventnexus.eu/sitemap-index.xml
- **Static Sitemap:** https://www.eventnexus.eu/sitemap.xml
- **Events Sitemap:** https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/sitemap-events

---

**Status:** ✅ READY FOR PRODUCTION
**Last Updated:** January 14, 2026
