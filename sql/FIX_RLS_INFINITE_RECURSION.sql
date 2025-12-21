-- CRITICAL: Fix infinite recursion in RLS policies
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Drop ALL existing RLS policies on users table
-- ============================================

DROP POLICY IF EXISTS "Public profiles are viewable" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile during signup" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_delete_own" ON public.users;

-- ============================================
-- STEP 2: Create simple, non-recursive policies
-- ============================================

-- Allow anyone to read all user profiles (for public display)
CREATE POLICY "allow_public_read"
ON public.users
FOR SELECT
TO public
USING (true);

-- Allow users to insert their own profile (during signup via trigger)
CREATE POLICY "allow_user_insert"
ON public.users
FOR INSERT
TO public
WITH CHECK (auth.uid() = id);

-- Allow users to update only their own profile
CREATE POLICY "allow_user_update"
ON public.users
FOR UPDATE
TO public
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- STEP 3: Ensure RLS is enabled
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: Verify policies
-- ============================================

SELECT 
    '✅ RLS POLICIES CHECK' as test,
    schemaname,
    tablename,
    policyname,
    cmd as command,
    CASE 
        WHEN qual LIKE '%auth.uid()%' THEN '✅ Uses auth.uid() - OK'
        WHEN qual = 'true' THEN '✅ Public access - OK'
        ELSE '⚠️ Complex policy: ' || qual
    END as policy_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- ============================================
-- STEP 5: Test query to ensure no recursion
-- ============================================

-- This should work without recursion error
SELECT 
    '✅ TEST QUERY' as test,
    id,
    email,
    role
FROM public.users
LIMIT 1;
