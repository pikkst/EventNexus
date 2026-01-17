-- Check RLS policies for events table
-- Run this in Supabase SQL Editor

-- 1. Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'events';

-- 2. Check all RLS policies on events table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;

-- 3. Check if policies allow SELECT for anon users
-- (The WITH clause shows the filter condition)
SELECT 
  policyname,
  qual as "SELECT_condition"
FROM pg_policies 
WHERE tablename = 'events' AND cmd = 'SELECT';

-- 4. Test: Can anon user see events? (simulating anonymous access)
-- Note: This test might not work perfectly in SQL editor, 
-- but shows if there are any restrictive SELECT policies

-- 5. Alternative: Check role-based access
SELECT * FROM pg_roles WHERE rolname IN ('anon', 'authenticated');

-- SUCCESS INDICATORS:
-- ✅ rowsecurity = true (RLS is enabled)
-- ✅ SELECT policy exists and is permissive (permissive = true)
-- ✅ SELECT policy qual includes events that should be visible
-- ✅ If qual is NULL, policy allows all rows

-- COMMON ISSUES:
-- ❌ rowsecurity = false → RLS not enabled (everyone can see)
-- ❌ SELECT policy has very restrictive qual → might hide AI-created events
-- ❌ No SELECT policy → might deny all access

-- AI PIPELINE EVENTS:
-- AI events should be visible to anon users unless:
-- 1. Event has is_public = false (if such field exists)
-- 2. Event is expired (check date/time fields)
-- 3. Event location is NULL or invalid
