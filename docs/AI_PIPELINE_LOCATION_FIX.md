# AI Pipeline Location Fix - Estonia/Canada Event Mix-up

## Problem
AI pipeline was creating events in wrong countries - mixing up Estonian and Canadian events due to:
1. No country code constraint in geocoding API calls
2. AI prompts not strictly validating country boundaries
3. Missing distance validation from city center

## Solution
Fixed in `/workspaces/EventNexus/supabase/functions/discover-events-ai/index.ts`:

### Changes Made:

1. **Fetch country_code from database**
   - Updated city_configs query to include `country_code` field
   - Added fallback logic for manual city entries

2. **Enforce country in all geocoding**
   - Added `countrycodes` parameter to Nominatim API calls
   - Updated all geocoding function signatures to accept and use `country_code`
   - Enhanced Gemini geocoding prompts with explicit country validation

3. **Strengthen AI validation prompts**
   - Search prompt now explicitly mentions ISO country code
   - Added strong rejection rules for events from wrong countries
   - Emphasized location filter in both Flash and Pro model prompts

4. **Add coordinate distance validation**
   - Events > 50km from city center are rejected
   - Prevents cross-country confusion (e.g., London, Ontario vs London, UK)

5. **Update database migration**
   - Added Canada (`ca`) country code to migration
   - Created emergency fix SQL script

## Deployment Steps

### 1. Apply Database Migration (if needed)
```bash
# Check if Canada cities have country_code set
# In Supabase SQL Editor, run:
psql -f /workspaces/EventNexus/sql/fix-country-code-canada.sql
```

Or manually in SQL Editor:
```sql
UPDATE public.city_configs 
SET country_code = 'ca' 
WHERE country = 'Canada' 
  AND (country_code IS NULL OR country_code = '');
```

### 2. Deploy Edge Function
```bash
# From project root
cd /workspaces/EventNexus

# Deploy the updated function
supabase functions deploy discover-events-ai
```

### 3. Verify Deployment
1. Go to https://eventnexus.eu/admin/ai-agents
2. Select an Estonian city (e.g., Tallinn)
3. Click "Step 1: Discover Events"
4. Wait for completion
5. Check logs - should see only Estonian events
6. Verify coordinates are in Estonia (lat ~58-59, lng ~24-28)

### 4. Test with Canada (if needed)
1. Select a Canadian city
2. Run discovery
3. Check logs - should see only Canadian events
4. Verify coordinates are in Canada (lat ~43-56, lng ~-79 to -123)

## Expected Behavior After Fix

### Estonian Cities:
- ✅ Only finds events in Estonia
- ✅ Geocoding constrained to `countrycodes=ee`
- ✅ AI rejects events with addresses outside Estonia
- ✅ Distance validation rejects >50km from city

### Canadian Cities:
- ✅ Only finds events in Canada
- ✅ Geocoding constrained to `countrycodes=ca`
- ✅ AI rejects events with addresses outside Canada
- ✅ Distance validation rejects >50km from city

## Monitoring

Check logs in Supabase Dashboard:
1. Go to Logs > Edge Functions
2. Filter by `discover-events-ai`
3. Look for:
   - `⊘ Skip (too far)` - events rejected by distance check
   - Coordinate values matching expected country ranges
   - No USA/Canada events in Estonian cities (and vice versa)

## Rollback (if needed)

If issues occur, revert the function:
```bash
git checkout HEAD~1 supabase/functions/discover-events-ai/index.ts
supabase functions deploy discover-events-ai
```

## Testing Checklist

- [ ] Database migration applied (Canada has country_code='ca')
- [ ] Edge function deployed successfully
- [ ] Test Estonian city - gets only Estonian events
- [ ] Test Canadian city - gets only Canadian events (if configured)
- [ ] No cross-country contamination in logs
- [ ] Coordinates within expected ranges
- [ ] Distance validation working (check logs for "Skip (too far)")

## Files Changed

1. `/workspaces/EventNexus/supabase/functions/discover-events-ai/index.ts` - Main fix
2. `/workspaces/EventNexus/supabase/migrations/20260110000001_add_country_code_to_cities.sql` - Added Canada
3. `/workspaces/EventNexus/sql/fix-country-code-canada.sql` - Emergency fix script

## Notes

- The fix is backward compatible - existing cities without country_code will get 'ee' as default
- Gemini prompts now explicitly reject wrong-country events at multiple stages
- Nominatim API now strictly filters by country code
- 50km distance check provides additional safety net

---

**Status:** Ready for deployment
**Priority:** High - Fixes critical location data quality issue
**Risk:** Low - Changes are defensive (add validation, no logic removal)
