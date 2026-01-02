-- EventNexus Event Visibility Diagnostic Script
-- Run this in Supabase SQL Editor to diagnose why an event isn't showing on the map

-- ============================================================================
-- SECTION 1: Check specific event by ID
-- ============================================================================
-- ⚠️ REPLACE THIS ID WITH YOUR EVENT ID:
WITH event_to_check AS (
  SELECT '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'::uuid as event_id
)

-- SECTION 1: EVENT DETAILS
SELECT 
  '=== EVENT DETAILS ===' AS section,
  e.id,
  e.name,
  e.visibility,
  e.status,
  e.archived_at,
  e.date,
  e.time,
  e.location,
  e.organizer_id,
  e.created_at,
  e.updated_at,
  CASE 
    WHEN e.visibility = 'public' THEN '✓ Should show on map (public)'
    WHEN e.visibility = 'semi-private' THEN '✓ Should show on map (semi-private)'
    WHEN e.visibility = 'private' THEN '✗ Hidden from map (private)'
    ELSE '⚠ Unknown visibility type!'
  END AS map_visibility_status,
  CASE 
    WHEN e.status = 'active' THEN '✓ Active'
    WHEN e.status = 'draft' THEN '✗ Draft (not shown)'
    WHEN e.status = 'cancelled' THEN '✗ Cancelled'
    ELSE '⚠ Unknown status'
  END AS status_check,
  CASE 
    WHEN e.archived_at IS NULL THEN '✓ Not archived'
    ELSE '✗ ARCHIVED at ' || e.archived_at::text
  END AS archive_status
FROM event_to_check c
LEFT JOIN events e ON e.id = c.event_id;

-- ============================================================================
-- SECTION 2: Check if event would be returned by getEvents() query
-- ============================================================================
WITH event_to_check AS (
  SELECT '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'::uuid as event_id
)
SELECT 
  '=== GETEVENTS() QUERY TEST ===' AS section,
  COUNT(*) as matching_events,
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ Event WOULD be returned by getEvents()'
    ELSE '✗ Event would NOT be returned by getEvents()'
  END AS result
FROM event_to_check c
LEFT JOIN events e ON e.id = c.event_id
WHERE e.id IS NOT NULL
  AND e.status = 'active'
  AND e.visibility IN ('public', 'semi-private')
  AND e.archived_at IS NULL;

-- ============================================================================
-- SECTION 3: Check if event would be returned by getAllEvents() query
-- ============================================================================
WITH event_to_check AS (
  SELECT '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'::uuid as event_id
)
SELECT 
  '=== GETALLEVENTS() QUERY TEST ===' AS section,
  COUNT(*) as matching_events,
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ Event WOULD be returned by getAllEvents()'
    ELSE '✗ Event would NOT be returned by getAllEvents()'
  END AS result
FROM event_to_check c
LEFT JOIN events e ON e.id = c.event_id
WHERE e.id IS NOT NULL
  AND e.status = 'active'
  AND e.archived_at IS NULL;

-- ============================================================================
-- SECTION 4: Check location data validity
-- ============================================================================
WITH event_to_check AS (
  SELECT '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'::uuid as event_id
)
SELECT 
  '=== LOCATION DATA CHECK ===' AS section,
  e.location,
  e.location->'lat' as latitude,
  e.location->'lng' as longitude,
  e.location->'address' as address,
  e.location->'city' as city,
  CASE 
    WHEN e.location->'lat' IS NOT NULL AND e.location->'lng' IS NOT NULL THEN '✓ Has coordinates'
    ELSE '✗ Missing coordinates'
  END AS coordinates_status,
  CASE 
    WHEN (e.location->>'lat')::float BETWEEN -90 AND 90 
     AND (e.location->>'lng')::float BETWEEN -180 AND 180 
    THEN '✓ Coordinates are valid'
    ELSE '✗ Coordinates out of range'
  END AS coordinates_validity
FROM event_to_check c
LEFT JOIN events e ON e.id = c.event_id;

-- ============================================================================
-- SECTION 5: Check date/time validity
-- ============================================================================
WITH event_to_check AS (
  SELECT '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'::uuid as event_id
)
SELECT 
  '=== DATE/TIME CHECK ===' AS section,
  e.date as event_date,
  e.time as event_time,
  CASE 
    WHEN e.date >= NOW() THEN '✓ Future event'
    ELSE '⚠ Past event (may still show)'
  END AS date_status,
  CASE 
    WHEN e.date IS NOT NULL THEN '✓ Has date'
    ELSE '✗ Missing date'
  END AS date_presence
FROM event_to_check c
LEFT JOIN events e ON e.id = c.event_id;

-- ============================================================================
-- SECTION 6: Check organizer validity
-- ============================================================================
WITH event_to_check AS (
  SELECT '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'::uuid as event_id
)
SELECT 
  '=== ORGANIZER CHECK ===' AS section,
  e.organizer_id,
  u.name as organizer_name,
  u.email as organizer_email,
  u.role as organizer_role,
  CASE 
    WHEN u.id IS NOT NULL THEN '✓ Organizer exists'
    ELSE '✗ Organizer not found'
  END AS organizer_status
FROM event_to_check c
LEFT JOIN events e ON e.id = c.event_id
LEFT JOIN users u ON e.organizer_id = u.id;

-- ============================================================================
-- SECTION 7: Similar events that ARE showing (for comparison)
-- ============================================================================
SELECT 
  '=== SIMILAR VISIBLE EVENTS (for comparison) ===' AS section,
  id,
  name,
  visibility,
  status,
  archived_at,
  location->'city' as city,
  date
FROM events
WHERE status = 'active'
  AND visibility IN ('public', 'semi-private')
  AND archived_at IS NULL
  AND date >= NOW() - INTERVAL '7 days'
ORDER BY date
LIMIT 5;

-- ============================================================================
-- SECTION 8: Count all events by visibility and status
-- ============================================================================
SELECT 
  '=== GLOBAL EVENT STATISTICS ===' AS section,
  visibility,
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN archived_at IS NULL THEN 1 END) as not_archived,
  COUNT(CASE WHEN archived_at IS NOT NULL THEN 1 END) as archived
FROM events
GROUP BY visibility, status
ORDER BY visibility, status;

-- ============================================================================
-- SECTION 9: RLS Policy Check (if policies exist)
-- ============================================================================
SELECT 
  '=== RLS POLICIES ===' AS section,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as row_filter,
  with_check
FROM pg_policies
WHERE tablename = 'events'
ORDER BY policyname;

-- ============================================================================
-- SECTION 10: Recommended fixes based on common issues
-- ============================================================================
WITH event_to_check AS (
  SELECT '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'::uuid as event_id
)
SELECT 
  '=== DIAGNOSTIC SUMMARY & FIXES ===' AS section,
  CASE 
    WHEN e.id IS NULL THEN 
      '✗ EVENT NOT FOUND - Check if ID is correct'
    WHEN e.status != 'active' THEN 
      '✗ FIX: UPDATE events SET status = ''active'' WHERE id = ''' || e.id || ''';'
    WHEN e.visibility NOT IN ('public', 'semi-private') THEN 
      '⚠ Event is private - Change to public: UPDATE events SET visibility = ''public'' WHERE id = ''' || e.id || ''';'
    WHEN e.archived_at IS NOT NULL THEN 
      '✗ FIX: UPDATE events SET archived_at = NULL, archived_by = NULL WHERE id = ''' || e.id || ''';'
    WHEN e.location->'lat' IS NULL OR e.location->'lng' IS NULL THEN 
      '✗ FIX: Missing coordinates - Update location field with proper lat/lng'
    ELSE 
      '✓ Event looks correct! Check frontend console for errors.'
  END AS diagnosis_and_fix
FROM event_to_check c
LEFT JOIN events e ON e.id = c.event_id;

-- ============================================================================
-- QUICK FIX: Uncomment and modify ID below to automatically fix common issues
-- ============================================================================

-- Fix 1: Make event active
-- UPDATE events SET status = 'active' WHERE id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e';

-- Fix 2: Make event public
-- UPDATE events SET visibility = 'public' WHERE id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e';

-- Fix 3: Unarchive event
-- UPDATE events SET archived_at = NULL, archived_by = NULL WHERE id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e';

-- Fix 4: Set current date if missing
-- UPDATE events SET date = NOW() + INTERVAL '1 day' WHERE id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e' AND date IS NULL;

-- Verify fixes:
-- SELECT id, name, visibility, status, archived_at FROM events WHERE id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e';
