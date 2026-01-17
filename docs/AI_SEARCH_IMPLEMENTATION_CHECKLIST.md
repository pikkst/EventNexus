# AI Search Setup - Implementation Checklist

## ✅ COMPLETED (Do Not Change)

### Core Setup
- [x] Enhanced `public/robots.txt` with AI crawler rules
- [x] Added AI meta tags to `index.html`
- [x] Created `src/services/seoService.ts` (346 lines)
- [x] Created `src/hooks/useSEO.ts` (150 lines)
- [x] Created `src/utils/aiSearchOptimization.ts` (230 lines)

### Documentation
- [x] Created `docs/AI_SEARCH_OPTIMIZATION.md`
- [x] Created `docs/AI_SEARCH_QUICK_START.md`
- [x] Created `docs/SEO_IMPLEMENTATION_CHECKLIST.md`
- [x] Created `docs/AI_SEARCH_IMPLEMENTATION_SUMMARY.md`

---

## 🔄 TO DO - Implementation (25 minutes)

### Step 1: EventDetail Component (5 minutes)
- [ ] Open `src/components/EventDetail.tsx`
- [ ] Add import at top:
  ```tsx
  import { useEventSEO } from '@/hooks/useSEO';
  ```
- [ ] Add hook call in component (after other hooks):
  ```tsx
  useEventSEO(event);
  ```
- [ ] Save file
- [ ] Test: Open event page, check browser title/meta tags

**Status:** `Not Started` ⏳

### Step 2: LandingPage Component (5 minutes)
- [ ] Open `src/components/LandingPage.tsx`
- [ ] Add import at top:
  ```tsx
  import { usePageSEO } from '@/hooks/useSEO';
  ```
- [ ] Add hook call in component:
  ```tsx
  usePageSEO({
    path: '/',
    title: 'Discover Your Next Experience',
    description: 'Find amazing events near you. From concerts to conferences, discover and book tickets for unforgettable experiences.',
    image: 'https://www.eventnexus.eu/og-image.png',
    type: 'website'
  });
  ```
- [ ] Save file
- [ ] Test: Open homepage, verify meta tags

**Status:** `Not Started` ⏳

### Step 3: HomeMap Component (5 minutes)
- [ ] Open `src/components/HomeMap.tsx`
- [ ] Add import at top:
  ```tsx
  import { usePageSEO } from '@/hooks/useSEO';
  ```
- [ ] Add hook call in component:
  ```tsx
  usePageSEO({
    path: '/map',
    title: 'Event Map - Discover Events Nearby',
    description: 'Explore events on an interactive map. Find concerts, conferences, workshops, and more near you.',
    image: 'https://www.eventnexus.eu/og-image.png',
    type: 'website'
  });
  ```
- [ ] Save file
- [ ] Test: Open map page, verify meta tags

**Status:** `Not Started` ⏳

### Step 4: AgencyProfile Component (5 minutes)
- [ ] Open `src/components/AgencyProfile.tsx`
- [ ] Add import at top:
  ```tsx
  import { useOrganizationSEO } from '@/hooks/useSEO';
  ```
- [ ] Find where agency data is loaded
- [ ] Add hook call after data is available:
  ```tsx
  useOrganizationSEO(agency);
  ```
- [ ] Save file
- [ ] Test: Open organizer profile, verify meta tags

**Status:** `Not Started` ⏳

---

## ✨ Testing Checklist (10 minutes after implementation)

### Test Event Page
- [ ] Open any event page
- [ ] Check page title: Should show event name
- [ ] Open DevTools (F12) → View Source
- [ ] Search for `<meta name="description"` - should show event summary
- [ ] Search for `og:title` - should show event name
- [ ] Search for `application/ld+json` - should see Event schema
- [ ] Validate schema at https://validator.schema.org/

### Test Homepage
- [ ] Open homepage (/)
- [ ] Check page title: Should show "EventNexus - Discover..."
- [ ] Check meta description
- [ ] Check Open Graph tags
- [ ] Verify JSON-LD schema

### Test Event Map
- [ ] Open map page
- [ ] Verify title and description updated
- [ ] Check meta tags in source

### Test Organizer Profile
- [ ] Open any organizer page (/org/slug)
- [ ] Verify organization name in title
- [ ] Check JSON-LD Organization schema
- [ ] Validate schema

### Browser Console
- [ ] Press F12 → Console tab
- [ ] Should show no SEO errors
- [ ] No warnings about missing data

---

## 📊 Verification Tasks (After Testing)

### Robots.txt
- [ ] Run: `curl https://www.eventnexus.eu/robots.txt`
- [ ] Should see AI crawler rules (GPTBot, Claude-Web, etc.)
- [ ] Should see admin pages blocked

### Google Search Console
- [ ] Submit to Google Search Console
- [ ] Request indexing for homepage
- [ ] Request indexing for sample event
- [ ] Wait 24-48 hours for crawling
- [ ] Check Coverage tab for indexing status

### Meta Tags Verification
- [ ] Use [Facebook Debugger](https://developers.facebook.com/tools/debug/)
- [ ] Paste event page URL
- [ ] Should show correct title, description, image

### Schema Validation
- [ ] Use [Schema.org Validator](https://validator.schema.org/)
- [ ] Paste event page URL
- [ ] Should show valid Event schema
- [ ] Check all required fields present

---

## 🚀 Deployment Checklist

### Before Pushing
- [ ] All 4 components updated with hooks
- [ ] No build errors: `npm run build`
- [ ] No console errors in DevTools
- [ ] All tests passing (if applicable)
- [ ] Meta tags verified on all pages

### Pushing to Production
- [ ] Create feature branch (optional): `git checkout -b ai-search-optimization`
- [ ] Commit changes: `git add . && git commit -m "feat: Add AI search engine optimization"`
- [ ] Push to main: `git push origin main`
- [ ] Verify deployment at https://www.eventnexus.eu

### Post-Deployment
- [ ] Check homepage loads correctly
- [ ] Check event page loads correctly
- [ ] Verify no JavaScript errors in production
- [ ] Monitor server logs for AI crawler activity

---

## 📈 Monitoring (After Deployment)

### Week 1
- [ ] Monitor Google Search Console for crawl activity
- [ ] Check for any crawl errors
- [ ] Verify event pages appear in index

### Week 2-4
- [ ] Check organic traffic increase
- [ ] Monitor AI crawler visits in server logs
- [ ] Verify ChatGPT starts mentioning EventNexus
- [ ] Check Perplexity for event references

### Month 2-3
- [ ] Analyze organic search traffic
- [ ] Track keyword rankings in Google
- [ ] Monitor competitor visibility
- [ ] Plan next optimization phase

---

## 📋 Summary Table

| Component | File | Hook | Status |
|-----------|------|------|--------|
| EventDetail | src/components/EventDetail.tsx | useEventSEO | ⏳ |
| LandingPage | src/components/LandingPage.tsx | usePageSEO | ⏳ |
| HomeMap | src/components/HomeMap.tsx | usePageSEO | ⏳ |
| AgencyProfile | src/components/AgencyProfile.tsx | useOrganizationSEO | ⏳ |
| **Core Setup** | Various | Various | ✅ |
| **Documentation** | docs/ | N/A | ✅ |

---

## 🎯 Time Breakdown

| Task | Time | Status |
|------|------|--------|
| Component 1 (EventDetail) | 5 min | ⏳ |
| Component 2 (LandingPage) | 5 min | ⏳ |
| Component 3 (HomeMap) | 5 min | ⏳ |
| Component 4 (AgencyProfile) | 5 min | ⏳ |
| Testing | 10 min | ⏳ |
| Verification | 5 min | ⏳ |
| **TOTAL** | **35 min** | ⏳ |

**Current Progress:** 80% (Core setup complete)
**Remaining:** 20% (Component implementation)

---

## 💡 Pro Tips

1. **Copy-Paste Ready** - All code is ready to copy from [AI_SEARCH_QUICK_START.md](./AI_SEARCH_QUICK_START.md)
2. **No Breaking Changes** - Existing components work fine without hooks
3. **Easy Rollback** - Can remove hooks if needed, just delete 1-2 lines
4. **Zero Performance Impact** - Hooks run only on page load
5. **Test Each Change** - Verify after each component update

---

## 🔍 Debugging Tips

**Issue:** Meta tags not updating
- Solution: Hard refresh (Ctrl+F5 or Cmd+Shift+R)
- Check: Is hook being called?
- Check: Is component re-rendering?

**Issue:** JSON-LD not appearing
- Solution: Check browser DevTools → Network → check HTML
- Check: Is data loaded before hook runs?
- Try: Use `event?.id` to check if data exists

**Issue:** robots.txt not updating
- Solution: Clear browser cache
- Check: File exists at `/public/robots.txt`
- Test: `curl https://www.eventnexus.eu/robots.txt`

---

## 📞 Questions?

Refer to documentation files:
1. **Quick Help:** [AI_SEARCH_QUICK_START.md](./AI_SEARCH_QUICK_START.md)
2. **Full Guide:** [AI_SEARCH_OPTIMIZATION.md](./AI_SEARCH_OPTIMIZATION.md)
3. **Component List:** [SEO_IMPLEMENTATION_CHECKLIST.md](./SEO_IMPLEMENTATION_CHECKLIST.md)
4. **Summary:** [AI_SEARCH_IMPLEMENTATION_SUMMARY.md](./AI_SEARCH_IMPLEMENTATION_SUMMARY.md)

---

**Start Date:** [Your Date Here]
**Estimated Completion:** [Your Date + 35 minutes]
**Status:** 🔄 In Progress

Good luck! 🚀
