# AI Agent Improvements - Deployment Guide
**Date:** 2026-01-12  
**Target:** Fix AI agents to reliably find 5+ free events per city

## 🎯 Issues Fixed

### 1. City Health View - NULL Values ❌→✅
**Problem:** City health display showed NULL for `total_events`, `free_events_count`, `events_7d`  
**Root Cause:** SQL view had hardcoded zeros instead of actual event data  
**Fix:** Updated `city_health_view` to include JOINs with `events` and `event_confidence` tables

### 2. Bootstrap - Not Finding Enough FREE Events ❌→✅  
**Problem:** Only finding 1/5 free events (Springfield example)  
**Root Cause:** Search queries didn't prioritize FREE-specific sources  
**Fix:** 
- Reordered Google Search queries to put FREE events FIRST
- Enhanced Gemini prompt to demand 15-20 FREE-focused sources
- Added localized FREE terms (gratis, tasuta, ilmaiset, gratuit, kostenlose)

### 3. Ensure-Free-Events - Not Aggressive Enough ❌→✅
**Problem:** Function gave up after first attempt  
**Root Cause:** Only tried 1 fetch cycle, fetched only 5 sources  
**Fix:**
- Runs 2 full fetch→parse→validate→publish cycles
- Fetches up to 15 free-focused sources (was 5)
- Publishes 2x needed events as buffer
- Triggers AI source discovery if still insufficient ("desperate mode")

### 4. Geocoding Failures - 50%+ Rejection Rate ❌→✅
**Problem:** Many addresses failed geocoding (e.g., "NART Kunstiresidentuur, Joala 18, Narva")  
**Root Cause:** Only 2 search variations tried  
**Fix:** Enhanced to 8+ strategies:
1. Full address + country
2. Venue + city + country
3. Venue + country
4. Cleaned venue (no room numbers)
5. City + venue (reversed)
6. Venue + city (no country)
7. Address without special chars
8. Address without street numbers

### 5. Dashboard Display - Incorrect Data ❌→✅
**Problem:** Frontend showed 0 for total_events and free_events_count  
**Root Cause:** Hardcoded to 0 instead of reading from health_view  
**Fix:** Changed to read `health.total_events` and `health.free_events_count`

---

## 📦 Files Changed

### Database Migration (NEW)
```
/workspaces/EventNexus/supabase/migrations/20260112_fix_city_health_complete_metrics.sql
```
- Drops and recreates `city_health_view` with real event data
- Adds `total_events` and `free_events_count` columns
- Refreshes materialized view snapshot
- Adds index on `free_events_count`

### Edge Functions (MODIFIED)
```
/workspaces/EventNexus/supabase/functions/bootstrap-city/index.ts
```
- Lines ~96-165: Enhanced Google Search queries (FREE-first priority)
- Lines ~272-340: Enhanced Gemini prompt (demands 15-20 FREE sources)

```
/workspaces/EventNexus/supabase/functions/ensure-free-events/index.ts
```
- Lines ~90-340: Complete rewrite - 2x aggressive, runs multiple cycles, discovers new sources

```
/workspaces/EventNexus/supabase/functions/parse-event-ai/index.ts
```
- Lines ~428-520: Enhanced `geocodeAddress()` with 8+ search strategies

### Frontend (MODIFIED)
```
/workspaces/EventNexus/components/AIAgentDashboard.tsx
```
- Lines ~323-324: Changed from hardcoded 0 to `health.total_events` and `health.free_events_count`

---

## 🚀 Deployment Steps

### Step 1: Deploy Database Migration
```bash
cd /workspaces/EventNexus
supabase db push
```
Or via Supabase Dashboard:
1. Go to SQL Editor
2. Open `20260112_fix_city_health_complete_metrics.sql`
3. Run the migration
4. Verify: `SELECT * FROM city_health_view LIMIT 5;`

### Step 2: Deploy Edge Functions
```bash
# Deploy updated functions (one by one for safety)
supabase functions deploy bootstrap-city
supabase functions deploy ensure-free-events  
supabase functions deploy parse-event-ai
```

Or bulk deploy:
```bash
supabase functions deploy --no-verify-jwt
```

### Step 3: Deploy Frontend
```bash
npm run build
# Deploy dist/ to production (GitHub Pages or custom domain)
```

### Step 4: Verify Deployment
1. Open `https://eventnexus.eu/admin/ai-agents`
2. Select a city (e.g., Springfield)
3. Click "Run Pipeline"
4. Monitor logs - should now see:
   - ✅ "Geocoding with 8 strategies"
   - ✅ "AGGRESSIVE: Re-fetching 15 free-focused sources"
   - ✅ "Cycle 1/2: Fetched X items"
   - ✅ "5/5 free events" (instead of "1/5")

5. Check City Health display:
   - Total Events should show real number (not 0)
   - Free Events should show real count (not 0)

---

## 📊 Expected Results

### Before vs After

| Metric | Before | After |
|--------|--------|-------|
| Free events found (Springfield) | 1/5 (⚠️ warning) | 5+/5 (✅ success) |
| Geocoding success rate | ~50% | ~85%+ |
| Total events displayed | 0 (NULL) | Actual count |
| Free events displayed | 0 (NULL) | Actual count |
| Sources discovered | 8 sources | 15-20 sources |
| Fetch cycles | 1 attempt | 2 aggressive cycles |

---

## 🔍 Testing Checklist

- [ ] Database migration applied successfully
- [ ] City health view shows real event counts (not zeros)
- [ ] Bootstrap discovers 15+ sources per city
- [ ] Geocoding tries 8+ variations before failing
- [ ] Ensure-free-events runs 2 fetch cycles
- [ ] Pipeline logs show "AGGRESSIVE" mode messages
- [ ] Cities reach 5/5 free events minimum
- [ ] Dashboard displays correct metrics

---

## 🆘 Rollback Plan

If issues occur, rollback in reverse order:

### Rollback Frontend
```bash
git checkout HEAD~1 components/AIAgentDashboard.tsx
npm run build && deploy
```

### Rollback Edge Functions
```bash
git checkout HEAD~1 supabase/functions/bootstrap-city/index.ts
git checkout HEAD~1 supabase/functions/ensure-free-events/index.ts
git checkout HEAD~1 supabase/functions/parse-event-ai/index.ts
supabase functions deploy --no-verify-jwt
```

### Rollback Database (CAUTION)
```sql
-- Run in Supabase SQL Editor
DROP VIEW IF EXISTS city_health_view CASCADE;
-- Then re-run previous migration version
```

---

## 📝 Notes

1. **Rate Limits:** Geocoding still respects Nominatim 1req/sec limit
2. **Performance:** Aggressive mode takes ~3-5min per city (worth it for 5+ events!)
3. **Cost:** No additional costs (using free Gemini API + Nominatim)
4. **Monitoring:** Check Agent Logs tab for detailed pipeline progress

---

## ✅ Success Criteria

✅ Each city finds minimum 5 FREE events  
✅ City Health shows accurate event counts  
✅ Geocoding success rate >80%  
✅ Pipeline completes without errors  
✅ Dashboard displays real-time metrics  

---

**Deployed by:** AI Agent Optimization Team  
**Review required:** Yes (test on staging first)  
**Breaking changes:** None (backward compatible)
