-- Check users table schema for followed_organizers column
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND column_name LIKE '%follow%'
ORDER BY ordinal_position;

-- Check if followed_organizers column exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'users' 
      AND column_name = 'followed_organizers'
) as followed_organizers_exists;
