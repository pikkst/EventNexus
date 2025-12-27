-- Quick check if metadata column exists in notifications table
-- Run this in Supabase SQL Editor to verify migration status

SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'notifications' 
  AND column_name = 'metadata';

-- Expected result if migration IS run:
-- column_name | data_type | is_nullable
-- metadata    | jsonb     | YES

-- Expected result if migration NOT run:
-- (empty - no rows)
