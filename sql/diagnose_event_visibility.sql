-- EventNexus Event Visibility Diagnostic Script
-- Run this in Supabase SQL Editor to diagnose why an event isn't showing on the map

-- ============================================================================
-- SECTION 1: Check specific event by ID
-- ============================================================================
-- Replace this ID with your event ID:
\set event_id '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'

SELECT 
  '=== EVENT DETAILS ===' AS section,
  id,
  name,
  visibility,
  status,
  archived_at,
  date,
  time,
  location,
  organizer_id,
  created_at,
  updated_at,
  CASE 
    WHEN visibility = 'public' THEN '✓ Should show on map (public)'
    WHEN visibility = 'semi-private' THEN '✓ Should show on map (semi-private)'
    WHEN visibility = 'private' THEN '✗ Hidden from map (private)'
    ELSE '⚠ Unknown visibility type!'
  END AS map_visibility_status,
  CASE 
    WHEN status = 'active' THEN '✓ Active'
    WHEN status = 'draft' THEN '✗ Draft (not shown)'
    WHEN status = 'cancelled' THEN '✗ Cancelled'
    ELSE '⚠ Unknown status'
  END AS status_check,
  CASE 
    WHEN archived_at IS NULL THEN '✓ Not archived'
    ELSE '✗ ARCHIVED at ' || archived_at::text
  END AS archive_status
FROM events 
WHERE id = :'event_id';

-- ============================================================================
-- SECTION 2: Check if event would be returned by getEvents() query
-- ============================================================================
SELECT 
  '=== GETEVENTS() QUERY TEST ===' AS section,
  COUNT(*) as matching_events,
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ Event WOULD be returned by getEvents()'
    ELSE '✗ Event would NOT be returned by getEvents()'
  END AS result
FROM events
WHERE id = :'event_id'
  AND status = 'active'
  AND visibility IN ('public', 'semi-private')
  AND archived_at IS NULL;

-- ============================================================================
-- SECTION 3: Check if event would be returned by getAllEvents() query
-- ============================================================================
SELECT 
  '=== GETALLEVENTS() QUERY TEST ===' AS section,
  COUNT(*) as matching_events,
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ Event WOULD be returned by getAllEvents()'
    ELSE '✗ Event would NOT be returned by getAllEvents()'
  END AS result
FROM events
WHERE id = :'event_id'
  AND status = 'active'
  AND archived_at IS NULL;

-- ============================================================================
-- SECTION 4: Check location data validity
-- ============================================================================
SELECT 
  '=== LOCATION DATA CHECK ===' AS section,
  location,
  location->'lat' as latitude,
  location->'lng' as longitude,
  location->'address' as address,
  location->'city' as city,
  CASE 
    WHEN location->'lat' IS NOT NULL AND location->'lng' IS NOT NULL THEN '✓ Has coordinates'
    ELSE '✗ Missing coordinates'
  END AS coordinates_status,
  CASE 
    WHEN (location->>'lat')::float BETWEEN -90 AND 90 
     AND (location->>'lng')::float BETWEEN -180 AND 180 
    THEN '✓ Coordinates are valid'
    ELSE '✗ Coordinates out of range'
  END AS coordinates_validity
FROM events
WHERE id = :'event_id';

-- ============================================================================
-- SECTION 5: Check date/time validity
-- ============================================================================
SELECT 
  '=== DATE/TIME CHECK ===' AS section,
  date as event_date,
  time as event_time,
  CASE 
    WHEN date >= NOW() THEN '✓ Future event'
    ELSE '⚠ Past event (may still show)'
  END AS date_status,
  CASE 
    WHEN date IS NOT NULL THEN '✓ Has date'
    ELSE '✗ Missing date'
  END AS date_presence
FROM events
WHERE id = :'event_id';

-- ============================================================================
-- SECTION 6: Check organizer validity
-- ============================================================================
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
FROM events e
LEFT JOIN users u ON e.organizer_id = u.id
WHERE e.id = :'event_id';

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
FROM events e
WHERE e.id = :'event_id'
UNION ALL
SELECT 
  '=== DIAGNOSTIC SUMMARY & FIXES ===' AS section,
  '⚠ EVENT NOT FOUND IN DATABASE - Event may have been deleted or ID is incorrect' as diagnosis_and_fix
WHERE NOT EXISTS (SELECT 1 FROM events WHERE id = :'event_id');

-- ============================================================================
-- QUICK FIX: Uncomment lines below to automatically fix common issues
-- ============================================================================

-- Fix 1: Make event active
-- UPDATE events SET status = 'active' WHERE id = :'event_id';

-- Fix 2: Make event public
-- UPDATE events SET visibility = 'public' WHERE id = :'event_id';

-- Fix 3: Unarchive event
-- UPDATE events SET archived_at = NULL, archived_by = NULL WHERE id = :'event_id';

-- Fix 4: Set current date if missing
-- UPDATE events SET date = NOW() + INTERVAL '1 day' WHERE id = :'event_id' AND date IS NULL;

-- Verify fixes:
-- SELECT id, name, visibility, status, archived_at FROM events WHERE id = :'event_id';
