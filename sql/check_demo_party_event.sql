-- Quick diagnostic for "Demo Party" event
-- ID: 57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e

-- 1. Check event details
SELECT 
  'EVENT DETAILS' as check_type,
  id,
  name,
  visibility,
  status,
  archived_at,
  date,
  time,
  location
FROM events 
WHERE id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e';

-- 2. Check if it passes getEvents() filters
SELECT 
  'PASSES getEvents() FILTER' as check_type,
  CASE 
    WHEN status = 'active' THEN '✓' ELSE '✗ status not active' 
  END as status_check,
  CASE 
    WHEN visibility IN ('public', 'semi-private') THEN '✓' ELSE '✗ visibility is ' || visibility 
  END as visibility_check,
  CASE 
    WHEN archived_at IS NULL THEN '✓' ELSE '✗ archived at ' || archived_at::text 
  END as archive_check,
  CASE 
    WHEN location->'lat' IS NOT NULL AND location->'lng' IS NOT NULL THEN '✓' 
    ELSE '✗ missing coordinates' 
  END as location_check
FROM events 
WHERE id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e';

-- 3. Show what needs to be fixed
SELECT 
  'REQUIRED FIXES' as check_type,
  CASE 
    WHEN status != 'active' THEN 'Change status to active: UPDATE events SET status = ''active'' WHERE id = ''57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'';'
    WHEN visibility NOT IN ('public', 'semi-private') THEN 'Change visibility: UPDATE events SET visibility = ''public'' WHERE id = ''57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'';'
    WHEN archived_at IS NOT NULL THEN 'Unarchive: UPDATE events SET archived_at = NULL WHERE id = ''57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'';'
    ELSE '✓ No fixes needed - event should be visible'
  END as fix_query
FROM events 
WHERE id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e';

-- 4. Compare with working events
SELECT 
  'COMPARISON: Working events' as check_type,
  id,
  name,
  visibility,
  status,
  archived_at IS NULL as not_archived
FROM events
WHERE status = 'active'
  AND visibility IN ('public', 'semi-private')
  AND archived_at IS NULL
LIMIT 3;
