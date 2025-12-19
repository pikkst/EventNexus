-- Grant execute permissions on statistics functions
-- Run this in Supabase SQL Editor

-- Grant execute to authenticated users (admin check happens in Edge Function)
GRANT EXECUTE ON FUNCTION get_infrastructure_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_infrastructure_statistics() TO anon;
GRANT EXECUTE ON FUNCTION get_infrastructure_statistics() TO service_role;

GRANT EXECUTE ON FUNCTION get_platform_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_statistics() TO anon;
GRANT EXECUTE ON FUNCTION get_platform_statistics() TO service_role;

-- Verify grants
SELECT 
    routine_name,
    routine_type,
    string_agg(privilege_type, ', ') as privileges,
    grantee
FROM information_schema.routine_privileges
WHERE routine_name IN ('get_infrastructure_statistics', 'get_platform_statistics')
GROUP BY routine_name, routine_type, grantee
ORDER BY routine_name, grantee;
