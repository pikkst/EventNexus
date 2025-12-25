-- Verify user_campaigns table setup

-- 1. Check if table exists and view structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_campaigns'
ORDER BY ordinal_position;

-- 2. Check RLS policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_campaigns';

-- 3. Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_campaigns';

-- 4. Check triggers
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'user_campaigns';

-- 5. Test RLS with sample data (will fail if table doesn't exist)
-- Uncomment to test:
-- SELECT COUNT(*) as campaign_count FROM user_campaigns;
