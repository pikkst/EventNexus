-- Fix notifications table permissions for service_role
-- This allows admin broadcast notifications to work properly

-- Grant full permissions to service_role for notifications table
GRANT ALL ON public.notifications TO service_role;

-- Ensure service_role can use sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Verify permissions
SELECT 
    grantee, 
    table_schema, 
    table_name, 
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'notifications'
  AND grantee IN ('service_role', 'authenticated', 'anon')
ORDER BY grantee, privilege_type;
