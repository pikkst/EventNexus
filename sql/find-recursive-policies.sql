-- Find ALL tables with RLS policies that reference users table
-- Run this in Supabase SQL Editor to diagnose the problem

-- Check all RLS policies across all tables
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND (
    qual LIKE '%users%' 
    OR with_check LIKE '%users%'
    OR qual LIKE '%auth.uid()%'
)
ORDER BY tablename, policyname;
