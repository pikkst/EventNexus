# Mobile Apps Backend Synchronization Guide

**Date:** January 5, 2026  
**Apps:** EventNexusScanner (staff) & EventNexusLiveMap (attendees)

## Overview

Both mobile apps connect directly to the same Supabase backend as the web platform. No separate API or middleware needed - they share the same PostgreSQL database, authentication system, and Row Level Security policies.

---

## Critical Backend Requirements

### 1. Supabase Configuration

**Required Environment Variables:**
```bash
VITE_SUPABASE_URL=https://anlivujgkjmajkcgbaxw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Mobile App Configuration:**
- Android: `mobile/android/EventNexus[Scanner|LiveMap]/app/src/main/kotlin/.../SupabaseClient.kt`
- iOS: `mobile/ios/EventNexus[Scanner|LiveMap]/EventNexus[Scanner|LiveMap]/Services/SupabaseManager.swift`

Both apps use the **public anon key** (never ship service role key to clients).

---

### 2. Database Migrations

**Essential Migration:**
```bash
supabase/migrations/20260105100000_mobile_apps_permissions.sql
```

This migration ensures:
- ✅ Anonymous users can browse active events (Live Map)
- ✅ Authenticated users can view/purchase tickets (Live Map)
- ✅ Authenticated users can view their notifications (Live Map)
- ✅ Organizers can scan and validate tickets (Scanner)
- ✅ Users can view/update their own profiles (Both)

**Run Migration:**
```bash
# Via Supabase CLI
supabase db push

# Or via Supabase Dashboard
# Go to SQL Editor → New Query → Paste migration → Run
```

---

### 3. Row Level Security (RLS) Policies

#### Events Table
```sql
-- Anonymous users can browse active events
CREATE POLICY "Anyone can view active events"
    ON public.events FOR SELECT
    TO public, anon, authenticated
    USING (status = 'active' OR organizer_id = auth.uid());
```

#### Tickets Table
```sql
-- Users can view their own tickets
CREATE POLICY "Users can view their own tickets"
    ON public.tickets FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Organizers can scan tickets for their events
CREATE POLICY "Organizers can view tickets for their events"
    ON public.tickets FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.events 
            WHERE events.id = tickets.event_id 
            AND events.organizer_id = auth.uid()
        )
    );

-- Organizers can update ticket status (mark as scanned)
CREATE POLICY "Organizers can update ticket scan status"
    ON public.tickets FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.events 
            WHERE events.id = tickets.event_id 
            AND events.organizer_id = auth.uid()
        )
    );
```

#### Notifications Table
```sql
-- Users can view/update/delete their own notifications
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());
```

---

### 4. Authentication Flow

#### Live Map App
1. User opens app → browses events **without login** (anonymous access)
2. User clicks "Buy Ticket" → prompted to sign in
3. After sign in → can purchase tickets and view "My Tickets" tab
4. QR codes generated from ticket data

#### Scanner App
1. Staff opens app → enters scanner code (8-character code)
2. App validates code with backend → starts scanning session
3. Each scan validates ticket in real-time via Supabase
4. Updates ticket status (marks as `used`)

---

### 5. Edge Functions (Optional but Recommended)

**Proximity Radar Function:**
```bash
supabase/functions/proximity-radar/index.ts
```

- Purpose: Sends notifications when events are near user's location
- Uses PostGIS for geospatial queries
- Triggered by user location updates from Live Map app

**Deploy:**
```bash
supabase functions deploy proximity-radar
```

---

## Database Schema Requirements

### Minimum Required Tables

| Table | Required Columns | Mobile App Usage |
|-------|-----------------|------------------|
| `events` | id, name, location, latitude, longitude, status, category, date | Live Map: browse events on map |
| `tickets` | id, event_id, user_id, qr_code, status | Both: ticket purchase, validation |
| `notifications` | id, user_id, title, message, read_at | Live Map: push notifications |
| `users` | id, email, name, role, avatar_url | Both: user profiles, auth |

### Geospatial Extension (for Live Map)
```sql
-- Enable PostGIS for location queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geospatial index for performance
CREATE INDEX IF NOT EXISTS events_location_idx 
ON events USING GIST (ST_MakePoint(longitude, latitude)::geography);
```

---

## Testing Backend Sync

### Test 1: Anonymous Event Browsing
```sql
-- Run as anonymous user (no auth)
SET ROLE anon;
SELECT COUNT(*) FROM events WHERE status = 'active';
-- Expected: Returns count of active events
```

### Test 2: Ticket Purchase
```sql
-- Run as authenticated user
SELECT * FROM tickets WHERE user_id = auth.uid();
-- Expected: Returns user's tickets
```

### Test 3: Ticket Scanning
```sql
-- Run as organizer
SELECT t.* FROM tickets t
INNER JOIN events e ON e.id = t.event_id
WHERE e.organizer_id = auth.uid();
-- Expected: Returns tickets for organizer's events
```

---

## Common Issues & Solutions

### Issue 1: "Row Level Security Error"
**Symptom:** Mobile app shows empty results or 403 errors

**Solution:**
1. Run migration: `20260105100000_mobile_apps_permissions.sql`
2. Verify RLS is enabled: `SELECT * FROM pg_tables WHERE tablename IN ('events', 'tickets') AND rowsecurity = true;`
3. Check policies exist: `SELECT * FROM pg_policies WHERE tablename = 'events';`

### Issue 2: "Events not visible in Live Map"
**Symptom:** Map shows no events even though events exist

**Solution:**
1. Ensure events have `status = 'active'`
2. Verify `latitude` and `longitude` are not NULL
3. Check RLS policy includes `anon` role:
```sql
DROP POLICY IF EXISTS "Anyone can view active events" ON public.events;
CREATE POLICY "Anyone can view active events"
    ON public.events FOR SELECT
    TO public, anon, authenticated
    USING (status = 'active');
```

### Issue 3: "Cannot purchase tickets"
**Symptom:** User is signed in but ticket purchase fails

**Solution:**
1. Verify user is authenticated: check `auth.uid()` returns UUID
2. Check ticket INSERT policy exists
3. Ensure `tickets` table has proper columns: `user_id`, `event_id`, `qr_code`

### Issue 4: "Scanner cannot validate tickets"
**Symptom:** Scanner app says "Invalid Code" or shows no tickets

**Solution:**
1. Verify organizer is signed in (not using scanner code for auth - that's for session tracking)
2. Check organizer owns the event: `SELECT * FROM events WHERE organizer_id = auth.uid();`
3. Verify tickets exist for event: `SELECT COUNT(*) FROM tickets WHERE event_id = 'event-uuid';`

---

## Security Best Practices

### 1. Never Ship Service Role Key to Mobile Apps
❌ **WRONG:**
```kotlin
// NEVER DO THIS
val supabase = createSupabaseClient(
    supabaseUrl = SUPABASE_URL,
    supabaseKey = SERVICE_ROLE_KEY // ❌ Security risk!
)
```

✅ **CORRECT:**
```kotlin
val supabase = createSupabaseClient(
    supabaseUrl = SUPABASE_URL,
    supabaseKey = ANON_KEY // ✅ Public anon key only
)
```

### 2. Use RLS Policies, Not Client-Side Checks
❌ **WRONG:** Filtering data in mobile app code
✅ **CORRECT:** Let database RLS policies enforce access control

### 3. Validate Permissions Server-Side
Scanner codes should be validated via database function, not hardcoded in app.

---

## Monitoring & Debugging

### View Active Policies
```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd AS operation
FROM pg_policies 
WHERE tablename IN ('events', 'tickets', 'notifications', 'users')
ORDER BY tablename, policyname;
```

### Check User Authentication
```sql
SELECT auth.uid() AS current_user_id;
-- If returns NULL → user not authenticated
-- If returns UUID → user is authenticated
```

### Monitor API Usage
Go to Supabase Dashboard → Settings → API → View logs for mobile app requests

---

## Deployment Checklist

- [ ] Run migration `20260105100000_mobile_apps_permissions.sql`
- [ ] Verify all RLS policies exist (events, tickets, notifications, users)
- [ ] Test anonymous event browsing (no login required)
- [ ] Test authenticated ticket purchase
- [ ] Test scanner code validation
- [ ] Test QR code generation for tickets
- [ ] Deploy proximity-radar Edge Function (optional)
- [ ] Enable PostGIS extension for geospatial queries
- [ ] Configure Supabase Auth redirect URLs for deep linking
- [ ] Update mobile app configs with correct Supabase URL and anon key
- [ ] Test on production Supabase instance before app release

---

## Support & Resources

- **Migration File:** `supabase/migrations/20260105100000_mobile_apps_permissions.sql`
- **Database Service:** `services/dbService.ts` (web platform reference)
- **Mobile Repositories:**
  - Android: `services/EventRepository.kt`, `TicketRepository.kt`
  - iOS: `Services/EventRepository.swift`, `Services/TicketRepository.swift`
- **Contact:** huntersest@gmail.com
- **Documentation:** `mobile/LIVE_MAP_APPS.md`, `MOBILE_SCANNER_APPS_DELIVERY.md`

---

**Status:** ✅ All permissions configured and ready for production deployment
