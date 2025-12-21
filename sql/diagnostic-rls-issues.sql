-- Quick diagnostic: Check which tables are causing timeouts
-- Run this FIRST before the comprehensive fix

-- 1. Show all tables with RLS enabled
SELECT 
    '📊 Tables with RLS enabled' as info,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC, tablename;

-- 2. Find policies that reference the users table (THESE ARE RECURSIVE)
SELECT 
    '🔴 RECURSIVE POLICIES' as warning,
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN definition LIKE '%EXISTS%SELECT%users%' THEN 'EXISTS query on users'
        WHEN definition LIKE '%users.role%' THEN 'Direct users.role reference'
        ELSE 'Other users reference'
    END as recursion_type
FROM pg_policies
WHERE schemaname = 'public'
AND (
    definition LIKE '%users.role%'
    OR definition LIKE '%FROM users%'
    OR definition LIKE '%FROM public.users%'
)
ORDER BY tablename, policyname;

-- 3. Count total recursive policies
SELECT 
    '⚠️ TOTAL RECURSIVE POLICIES' as critical,
    COUNT(*) as count,
    'These must be dropped to fix timeouts' as action
FROM pg_policies
WHERE schemaname = 'public'
AND (
    definition LIKE '%users.role%'
    OR definition LIKE '%FROM users%'
    OR definition LIKE '%FROM public.users%'
);

-- 4. Test a simple query on users table
SELECT 
    '✅ Users table test' as test,
    COUNT(*) as user_count
FROM public.users
LIMIT 1;
