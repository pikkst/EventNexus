-- Test incoming email webhook
-- Run this query after sending test email to check if it arrived

SELECT 
  id,
  from_email,
  from_name,
  subject,
  status,
  priority,
  created_at
FROM admin_inbox 
ORDER BY created_at DESC 
LIMIT 10;

-- If no results, check Edge Function logs:
-- https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/logs/edge-functions
-- Filter: receive-email
