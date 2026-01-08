-- Check existing columns in events table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'events'
ORDER BY ordinal_position;

-- Check if location columns exist with different names
SELECT column_name 
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'events'
  AND (
    column_name LIKE '%location%' 
    OR column_name LIKE '%lat%' 
    OR column_name LIKE '%lng%'
    OR column_name LIKE '%lon%'
    OR column_name LIKE '%geo%'
  );
