-- Check the date field type and current timestamp comparison

-- 1. Show current database time
SELECT 
  'CURRENT DATABASE TIME' as check_type,
  NOW() as current_timestamp,
  NOW()::date as current_date,
  NOW()::time as current_time;

-- 2. Show Demo Party event timestamps
SELECT 
  'DEMO PARTY TIMESTAMPS' as check_type,
  id,
  name,
  date,
  time,
  date::timestamp as date_as_timestamp,
  (date::date || ' ' || time)::timestamp as combined_datetime,
  CASE 
    WHEN (date::date || ' ' || time)::timestamp < NOW() THEN '⚠ Event has passed'
    ELSE '✓ Event is upcoming'
  END as time_status
FROM events
WHERE id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e';

-- 3. Check if date field is actually TIMESTAMPTZ or just DATE
SELECT 
  'DATE COLUMN TYPE' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name IN ('date', 'time', 'end_date', 'end_time');

-- 4. Future events check (what would show on the map if we filter by date > NOW())
SELECT 
  'FUTURE EVENTS (if filtered by date > NOW())' as check_type,
  id,
  name,
  date,
  time,
  CASE 
    WHEN date > NOW() THEN '✓ Would show (date > NOW())'
    ELSE '✗ Would NOT show (date <= NOW())'
  END as would_show
FROM events
WHERE status = 'active'
  AND visibility IN ('public', 'semi-private')
  AND archived_at IS NULL;

-- 5. Update event to tomorrow to test
-- UNCOMMENT TO FIX:
-- UPDATE events 
-- SET date = (CURRENT_DATE + INTERVAL '1 day')::timestamptz + TIME '20:00:00'
-- WHERE id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e';
