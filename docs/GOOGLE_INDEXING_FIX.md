# Google Indexing Fix - Deployment Guide

## Problem Summary (Jan 18, 2026)

Google indekseeris ainult 1 lehe (`eventnexus.eu`) ja 17 lehte jäid vigadega:
- 13 lehte: 404 Not Found (dünaamilised route'id ja vale sitemap)
- 2 lehte: Page with redirect (vale domeen `www.`)
- 1 leht: Redirect error
- 1 leht: Blocked by robots.txt (vastuolu sitemap ja robots.txt vahel)

## Root Causes Identified

### 1. Sitemap Issues
- ❌ Sisaldas autentimist vajavaid lehti (`/dashboard`, `/create`, `/notifications`, `/redeem`)
- ❌ Sisaldas robots.txt-ga blokeeritud lehti
- ❌ Vale domeen: `www.eventnexus.eu` asemel peaks olema `eventnexus.eu`
- ❌ Puudusid dünaamilised event/org route'id

### 2. SPA Routing Issues
- ❌ Puudus `_redirects` fail SPA fallback'i jaoks
- ❌ Dünaamilised route'id (`/event/:id`, `/org/:slug`) andsid 404

### 3. robots.txt Conflicts
- ❌ Sitemap lubas lehti, mida robots.txt blokeeris
- ❌ Puudulikud `Allow` direktiivid public route'ide jaoks

## Fixes Applied

### ✅ 1. Fixed sitemap.xml
**Location:** `/public/sitemap.xml`

**Changes:**
- ✅ Eemaldatud kõik autentimist vajavad lehed (`/dashboard`, `/create`, `/notifications`, `/redeem`)
- ✅ Parandatud domeen: `eventnexus.eu` (ilma `www`)
- ✅ Lisatud public browse'i lehed (`/browse`, `/events`)
- ✅ Uuendatud kuupäev: 2026-01-18

**Included pages (12 total):**
```
/ (priority 1.0)
/map (0.9)
/browse (0.9)
/events (0.9)
/pricing (0.8)
/beta (0.7)
/help (0.7)
/privacy (0.5)
/terms (0.5)
/cookies (0.5)
/gdpr (0.5)
/mobile (0.6)
```

### ✅ 2. Created _redirects for SPA
**Location:** `/public/_redirects`

SPA fallback configuration:
```
# Static files directly
/assets/*  /assets/:splat  200
/robots.txt  /robots.txt  200
/sitemap.xml  /sitemap.xml  200

# All other routes to index.html
/*  /index.html  200
```

This ensures:
- ✅ Dünaamilised route'id (`/event/123`, `/org/slug`) töötavad
- ✅ Ei anta 404 Google crawlerile
- ✅ React Router saab handle'ida kõiki route
- ✅ Static assets served korrektselt

### ✅ 3. Updated robots.txt
**Location:** `/public/robots.txt`

**Changes:**
- ✅ Lisatud `Allow: /browse` ja `Allow: /events`
- ✅ Lisatud `Allow: /user/` public profile'ide jaoks
- ✅ Lisatud explicit `Disallow: /notifications` ja `/redeem`
- ✅ Parandatud Googlebot spetsiifilised reeglid
- ✅ Uuendatud kuupäev: 2026-01-18

**Allowed paths:**
```
/map, /browse, /events, /pricing, /mobile, /beta, /beta-signup
/org/*, /agency/*, /user/*, /event/*
/help, /terms, /privacy, /cookies, /gdpr
```

**Blocked paths:**
```
/admin, /dashboard, /profile, /create, /create-event
/scanner, /ticket, /notifications, /redeem
```

### ✅ 4. Created Dynamic Sitemap Generator
**Location:** `/api/sitemap.ts`

Serverless function for future dynamic sitemap:
- ✅ Generates static pages automatically
- 🔄 TODO: Fetch published events from Supabase
- 🔄 TODO: Fetch organizer profiles
- ✅ Caches for 1 hour
- ✅ Ready for Vercel/Netlify deployment

### ✅ 5. Fixed index.html Meta Tags
**Location:** `/index.html`

**Changes:**
- ✅ Canonical URL: `eventnexus.eu` (ilma `www`)
- ✅ Lisatud sitemap link: `<link rel="sitemap">`
- ✅ Open Graph URL parandatud

## Deployment Steps

### 1. Immediate Actions (Manual)
```bash
# Verify changes locally
npm run build
npm run preview

# Check these URLs work:
# http://localhost:4173/
# http://localhost:4173/map
# http://localhost:4173/browse
# http://localhost:4173/event/test-123
# http://localhost:4173/org/test-org
```

### 2. Push to Production
```bash
git add public/sitemap.xml public/robots.txt public/_redirects index.html
git commit -m "fix: Google indexing issues - sitemap, robots.txt, SPA routing"
git push origin main
```

### 3. Verify Deployment
After deployment to `eventnexus.eu`:
```bash
# Check files are accessible
curl https://eventnexus.eu/sitemap.xml
curl https://eventnexus.eu/robots.txt

# Test dynamic routes don't 404
curl -I https://eventnexus.eu/event/test
curl -I https://eventnexus.eu/org/test
```

### 4. Google Search Console Actions

**Immediate (Day 1):**
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Select `eventnexus.eu` property
3. Navigate to **Sitemaps** → Remove old sitemap → Add new: `https://eventnexus.eu/sitemap.xml`
4. Navigate to **URL Inspection** → Test all pages from new sitemap
5. Request indexing for key pages:
   - `https://eventnexus.eu/`
   - `https://eventnexus.eu/map`
   - `https://eventnexus.eu/browse`
   - `https://eventnexus.eu/pricing`
   - `https://eventnexus.eu/help`

**Monitor (7 days):**
6. Check **Coverage Report** daily
7. Fix any new errors immediately
8. Monitor **Indexed pages** count increasing

**Week 2:**
9. Once stable indexing confirmed, implement dynamic sitemap
10. Add published events to sitemap via `/api/sitemap.ts`

## Expected Results

### Week 1 (Jan 18-25)
- ✅ 404 errors should drop from 13 → 0
- ✅ Redirect errors should drop from 3 → 0
- ✅ robots.txt blocks should drop from 1 → 0
- ✅ Indexed pages should increase from 1 → 10-12

### Week 2 (Jan 25-31)
- ✅ All 12 sitemap pages indexed
- ✅ Impressions should increase significantly
- ✅ Ready to add dynamic event URLs

## Monitoring Checklist

### Daily (First Week)
- [ ] Check Google Search Console Coverage Report
- [ ] Verify no new 404s appearing
- [ ] Monitor indexed pages count
- [ ] Check impressions/clicks trending up

### Weekly
- [ ] Review indexed vs not-indexed ratio
- [ ] Analyze top queries and landing pages
- [ ] Identify missing important pages
- [ ] Plan next SEO improvements

## Future Improvements (Phase 2)

### Dynamic Content Indexing
1. **Event Pages** (`/event/:id`)
   - Generate sitemap entries for all published events
   - Update lastmod based on event updates
   - Priority 0.8, changefreq weekly

2. **Organizer Profiles** (`/org/:slug`, `/agency/:slug`)
   - Include verified organizers in sitemap
   - Priority 0.7, changefreq monthly

3. **User Profiles** (`/user/:username`)
   - Include public profiles (optional)
   - Priority 0.5, changefreq monthly

### SEO Enhancements
- [ ] Add structured data (JSON-LD) for events
- [ ] Implement server-side rendering for key pages
- [ ] Add meta descriptions to all routes
- [ ] Optimize images with proper alt texts
- [ ] Add breadcrumb navigation
- [ ] Implement pagination tags for event listings

### Technical SEO
- [ ] Set up redirect from `www.eventnexus.eu` → `eventnexus.eu`
- [ ] Add hreflang tags for future i18n
- [ ] Implement lazy loading for images
- [ ] Add preload/prefetch for critical resources
- [ ] Set up proper caching headers

## Rollback Plan

If indexing gets worse:

```bash
# Revert changes
git revert HEAD
git push origin main

# Restore old sitemap temporarily
git checkout HEAD~1 -- public/sitemap.xml
git commit -m "rollback: restore previous sitemap"
git push origin main
```

## Success Metrics

**Target (30 days):**
- Indexed pages: 1 → 50+ (including dynamic pages)
- Daily impressions: 1-16 → 100+
- Average position: < 50
- Zero 404/redirect/robots.txt errors

## Notes

- Do NOT add authenticated pages to sitemap (`/dashboard`, `/profile`)
- Keep robots.txt and sitemap aligned
- Update sitemap when adding new public routes
- Monitor Search Console weekly
- Document any new SEO changes here

## Contact

Issues/questions: huntersest@gmail.com

---
**Status:** Ready for deployment ✅  
**Last updated:** 2026-01-18  
**Next review:** 2026-01-25
