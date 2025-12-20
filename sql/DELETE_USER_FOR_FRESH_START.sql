-- CLEAN DELETE - Remove user completely for fresh registration
-- Run this in Supabase SQL Editor

-- Step 1: Delete from public.users (profile)
DELETE FROM public.users 
WHERE email = '3dcutandengrave@gmail.com';

-- Step 2: Delete from auth.users (auth account)
-- This requires admin privileges
DELETE FROM auth.users 
WHERE email = '3dcutandengrave@gmail.com';

-- Step 3: Verify deletion
SELECT 
    'Cleanup verification' as check_type,
    (SELECT COUNT(*) FROM public.users WHERE email = '3dcutandengrave@gmail.com') as profiles_remaining,
    (SELECT COUNT(*) FROM auth.users WHERE email = '3dcutandengrave@gmail.com') as auth_users_remaining,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.users WHERE email = '3dcutandengrave@gmail.com') = 0 
         AND (SELECT COUNT(*) FROM auth.users WHERE email = '3dcutandengrave@gmail.com') = 0
        THEN '✅ Clean slate - ready for fresh registration!'
        ELSE '⚠️ Some data still exists'
    END as status;
