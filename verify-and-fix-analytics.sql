-- Verify and create analytics functions for Edge Functions
-- Run this in Supabase SQL Editor to fix 400 errors

-- 1. Check if functions exist
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name IN ('get_platform_statistics', 'get_infrastructure_statistics', 'get_revenue_by_tier')
ORDER BY routine_name;

-- 2. If functions don't exist, run the full migration:
-- Copy and run the entire file: /workspaces/EventNexus/supabase/migrations/20250101000003_analytics_functions.sql

-- 3. Test the functions manually
SELECT get_platform_statistics();
SELECT get_infrastructure_statistics();
SELECT * FROM get_revenue_by_tier();

-- 4. Verify RLS policies allow function execution
-- Functions with SECURITY DEFINER should bypass RLS, but verify:
SELECT 
    p.proname as function_name,
    p.prosecdef as is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname IN ('get_platform_statistics', 'get_infrastructure_statistics', 'get_revenue_by_tier');
