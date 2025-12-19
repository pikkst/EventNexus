-- Fix RLS policies for users table to allow authenticated users to read their own data

-- Drop existing restrictive policies if any
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow users to update their own profile  
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Admin full access
CREATE POLICY "Admin full access to users"
ON public.users
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- Verify policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users';
