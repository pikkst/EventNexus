-- Check campaigns table structure to find user ownership column
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'campaigns'
ORDER BY ordinal_position;

-- Check if campaigns table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'campaigns'
) as campaigns_table_exists;
