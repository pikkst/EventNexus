-- Check recent notifications in database
SELECT 
  id,
  title,
  message,
  type,
  sender_name,
  created_at,
  metadata
FROM public.notifications
WHERE user_id = 'd8c49b37-b82d-4d8e-a8f7-dcc66c22ef2c'
ORDER BY created_at DESC
LIMIT 5;

-- Check if metadata column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
  AND table_schema = 'public'
  AND column_name = 'metadata';
