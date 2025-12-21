-- Find ALL tables with recursive RLS policies that reference the users table
-- This will show us which tables still need fixing

SELECT DISTINCT
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND (
    definition LIKE '%users%'
    OR definition LIKE '%auth.uid()%'
)
GROUP BY tablename
ORDER BY tablename;

-- Show all policies that might be recursive
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN definition LIKE '%EXISTS%SELECT%users%' THEN '🔴 RECURSIVE'
        WHEN definition LIKE '%users.role%' THEN '🔴 RECURSIVE'
        WHEN definition LIKE '%auth.uid()%' THEN '✅ SAFE'
        ELSE '❓ UNKNOWN'
    END as status,
    LEFT(definition, 100) as definition_preview
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY 
    CASE 
        WHEN definition LIKE '%EXISTS%SELECT%users%' THEN 1
        WHEN definition LIKE '%users.role%' THEN 2
        WHEN definition LIKE '%auth.uid()%' THEN 3
        ELSE 4
    END,
    tablename;
