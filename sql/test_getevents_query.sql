-- Test the exact query that getEvents() uses
-- This simulates what the frontend receives

-- What getEvents() should return
SELECT 
  'QUERY: getEvents() - Public & Semi-private events' as query_type,
  id,
  name,
  visibility,
  status,
  archived_at,
  date,
  time,
  location->'city' as city,
  location->'lat' as lat,
  location->'lng' as lng
FROM events
WHERE status = 'active'
  AND visibility IN ('public', 'semi-private')
  AND archived_at IS NULL
ORDER BY date ASC;

-- Count how many events would be returned
SELECT 
  'EVENT COUNT' as info,
  COUNT(*) as total_events
FROM events
WHERE status = 'active'
  AND visibility IN ('public', 'semi-private')
  AND archived_at IS NULL;

-- Check if specific event is included
SELECT 
  'DEMO PARTY CHECK' as info,
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ Demo Party WOULD be returned by getEvents()'
    ELSE '✗ Demo Party would NOT be returned'
  END as result
FROM events
WHERE id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'
  AND status = 'active'
  AND visibility IN ('public', 'semi-private')
  AND archived_at IS NULL;

-- Check RLS policies in effect (as anonymous user)
-- This shows what an unauthenticated user would see
SET ROLE anon;

SELECT 
  'AS ANONYMOUS USER (not logged in)' as role_check,
  id,
  name,
  visibility,
  date,
  time
FROM events
WHERE status = 'active'
  AND visibility IN ('public', 'semi-private')
  AND archived_at IS NULL;

-- Reset to normal
RESET ROLE;

-- Check as authenticated user
-- Replace this user ID with the organizer ID: 39d43eec-6f3d-4683-9650-48be4f904c8f
-- Note: This requires you to be logged in with that user's session

SELECT 
  'AS AUTHENTICATED USER (logged in as organizer)' as role_check,
  'Run this in Supabase client with authenticated session' as note;
