-- Check users table for name-related columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND (column_name LIKE '%name%' OR column_name LIKE '%email%')
ORDER BY ordinal_position;
