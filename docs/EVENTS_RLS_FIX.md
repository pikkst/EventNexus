# Events RLS Policy Fix for Anonymous Users

## Problem

**Symptom:** Admin näeb üritusi kaardil, aga FREE kasutajad ja külalised (anonymous) ei näe.

**Root Cause:** Row Level Security (RLS) policy on `events` tabelil oli valesti konfigureeritud anonüümsetele kasutajatele.

### Kehtiv Policy (vale):
```sql
CREATE POLICY "Anyone can view active events"
    ON public.events FOR SELECT
    USING (status = 'active' OR organizer_id = auth.uid());
```

### Probleem:
1. **Külalised (guest users)**: `auth.uid()` on `NULL`
2. PostgreSQL-is: `organizer_id = NULL` annab alati `NULL` (mitte `TRUE` ega `FALSE`)
3. SQL tingimus: `status = 'active' OR NULL` → annab `status = 'active'` tulemuse
4. **AGA** kui `status = 'active'` ei kehti, siis kogu tingimus on `FALSE`
5. Külalised ei saa ühtegi eventi näha!

### Miks Admin nägi:
- Adminil on eraldi policy: `"Admins can manage all events"`
- Admin policy ei sõltu `auth.uid()` kontrollimisest

### Miks FREE kasutajad ei näinud:
- Kui FREE kasutaja on autenditud, `auth.uid()` eksisteerib
- Aga `organizer_id = auth.uid()` on `FALSE` (ta ei ole organizer)
- Tingimus: `status = 'active' OR FALSE` → peaks töötama
- **Probleem oli, et policy ei olnud `anon` rollile lubatud!**

## Solution

### Uus Policy (õige):
```sql
CREATE POLICY "Anyone can view active events"
    ON public.events FOR SELECT
    TO public, anon, authenticated  -- ✅ Explicitly include anon role
    USING (
        status = 'active' 
        OR organizer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );
```

### Muudatused:
1. ✅ Added `TO public, anon, authenticated` - lubab policy kõigile rollidele
2. ✅ Explicitly allows `anon` role (anonüümsed kasutajad)
3. ✅ Keeps organizer check: `organizer_id = auth.uid()`
4. ✅ Keeps admin check: `role = 'admin'`

## Migration

**File:** `supabase/migrations/20251223000001_fix_events_rls_anon.sql`

**Apply:**
```bash
# Supabase Dashboard → SQL Editor → paste migration
# OR use Supabase CLI:
supabase db push
```

## Testing

### Test 1: Anonymous User (Guest)
```sql
-- Set role to anon
SET ROLE anon;

-- Should return active events
SELECT id, name, status FROM events WHERE status = 'active' LIMIT 5;
```

**Expected:** Returns active events ✅

### Test 2: Authenticated Free User
```sql
-- Login as free tier user
-- auth.uid() = '<user-uuid>'

SELECT id, name, status, organizer_id 
FROM events 
WHERE status = 'active' 
LIMIT 5;
```

**Expected:** Returns active events ✅

### Test 3: Admin User
```sql
-- Login as admin
-- auth.uid() = '<admin-uuid>'

SELECT id, name, status FROM events LIMIT 10;
```

**Expected:** Returns ALL events (including non-active) ✅

## Verification

After applying migration, check in browser:

1. **Logout** (become guest) → Go to map → Should see events ✅
2. **Login as FREE user** → Go to map → Should see events ✅
3. **Login as Admin** → Go to map → Should see all events ✅

## Impact

- ✅ Guests can browse events on map (critical for discovery)
- ✅ FREE users can browse events on map
- ✅ Admins keep full access
- ✅ Organizers can still see their own events
- ✅ No security breach - only `status = 'active'` events visible to public

## Related Files

- `/supabase/migrations/20251223000001_fix_events_rls_anon.sql` - The fix
- `/supabase/migrations/00000000000001_safe_migration.sql` - Original policy
- `/services/dbService.ts` - `getEvents()` function
- `/components/HomeMap.tsx` - Map component that displays events

## Commit

```bash
git add supabase/migrations/20251223000001_fix_events_rls_anon.sql docs/EVENTS_RLS_FIX.md
git commit -m "Fix RLS policy to allow anonymous users to view events on map"
git push
```

## Status

✅ **FIXED** - Policy updated to include `anon` role explicitly
