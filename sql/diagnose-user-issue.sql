-- Check what's wrong with existing user profile
-- Run this in Supabase SQL Editor

-- 1. Check if profile exists and what data it has
SELECT 
    'Existing profile data' as check_type,
    u.id,
    u.name,
    u.email,
    u.role,
    u.subscription_tier,
    u.subscription_status,
    u.status,
    u.credits,
    u.followed_organizers,
    u.notification_prefs,
    u.created_at,
    u.updated_at
FROM public.users u
WHERE u.email = '3dcutandengrave@gmail.com';

-- 2. Check auth user
SELECT 
    'Auth user data' as check_type,
    au.id,
    au.email,
    au.confirmed_at,
    au.email_confirmed_at,
    au.last_sign_in_at,
    au.created_at
FROM auth.users au
WHERE au.email = '3dcutandengrave@gmail.com';

-- 3. Check if IDs match
SELECT 
    'ID matching check' as check_type,
    CASE 
        WHEN au.id = u.id THEN 'IDs MATCH ✓'
        ELSE 'IDs DO NOT MATCH ✗ - THIS IS THE PROBLEM!'
    END as status,
    au.id as auth_id,
    u.id as profile_id
FROM auth.users au
LEFT JOIN public.users u ON u.email = au.email
WHERE au.email = '3dcutandengrave@gmail.com';

-- 4. Check RLS policies on users table
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
WHERE tablename = 'users'
ORDER BY policyname;
