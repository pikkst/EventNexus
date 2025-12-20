-- Check RLS policies on users table
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users';

-- Test if you can read your own profile
SELECT id, email, role, subscription_tier, credits
FROM public.users 
WHERE id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807';

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';

-- Try to select as the authenticated user would
SET request.jwt.claim.sub = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807';
SELECT * FROM public.users WHERE id = auth.uid();
