-- Fix infinite recursion in users RLS policies
-- Error: 42P17 - infinite recursion detected

-- 1. DROP ALL existing policies on users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admin full access to users" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Public profiles viewable" ON public.users;

-- 2. Create simple, non-recursive policies

-- Allow users to read their own profile
CREATE POLICY "users_select_own"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "users_update_own"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile (for auto-creation)
CREATE POLICY "users_insert_own"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 3. Verify policies are correct
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

-- 4. Test by selecting current user
SELECT id, email, role, subscription_tier 
FROM public.users 
WHERE id = auth.uid();
