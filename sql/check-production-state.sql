-- Check if RLS policies were actually applied
-- Run this on the PRODUCTION Supabase database

-- 1. Count current policies
SELECT 
    '📊 Current policy count' as info,
    COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public';

-- 2. Check for recursive policies (should be 0)
SELECT 
    '🔴 RECURSIVE POLICIES STILL PRESENT' as warning,
    COUNT(*) as count
FROM pg_policies
WHERE schemaname = 'public'
AND (
    qual::text LIKE '%users.role%'
    OR qual::text LIKE '%FROM users%'
    OR qual::text LIKE '%FROM public.users%'
);

-- 3. Show which policies exist
SELECT 
    '📋 Current policies' as info,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. Check admin user status
SELECT 
    '👤 Admin user' as info,
    id,
    email,
    role,
    subscription_tier,
    status
FROM public.users
WHERE email = 'huntersest@gmail.com';

-- 5. Check if user exists in auth.users
SELECT 
    '🔐 Auth record' as info,
    id,
    email,
    email_confirmed_at,
    last_sign_in_at,
    banned_until
FROM auth.users
WHERE email = 'huntersest@gmail.com';
