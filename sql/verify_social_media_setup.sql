-- Comprehensive Social Media Accounts Verification Script
-- Run this in Supabase SQL Editor to diagnose issues

-- ============================================
-- SECTION 1: Check Data Exists
-- ============================================
\echo '=== SECTION 1: Check if social_media_accounts table has data ==='

SELECT 
    'Total Records' as metric,
    COUNT(*) as value
FROM public.social_media_accounts;

SELECT 
    'By Platform' as metric,
    platform,
    COUNT(*) as count
FROM public.social_media_accounts
GROUP BY platform;

-- ============================================
-- SECTION 2: Show All Records in Detail
-- ============================================
\echo '=== SECTION 2: All social_media_accounts records ==='

SELECT 
    id,
    user_id,
    platform,
    account_id,
    account_name,
    is_connected,
    CASE 
        WHEN expires_at > NOW() THEN '✅ Valid'
        ELSE '❌ Expired'
    END as token_status,
    created_at,
    updated_at
FROM public.social_media_accounts
ORDER BY created_at DESC;

-- ============================================
-- SECTION 3: Check Admin User Access
-- ============================================
\echo '=== SECTION 3: Admin users who can manage social media ==='

SELECT 
    u.id as user_id,
    u.email,
    u.role,
    COUNT(sma.id) as connected_accounts
FROM public.users u
LEFT JOIN public.social_media_accounts sma ON u.id = sma.user_id
WHERE u.role = 'admin'
GROUP BY u.id, u.email, u.role;

-- ============================================
-- SECTION 4: Check RLS Policies
-- ============================================
\echo '=== SECTION 4: RLS Policies on social_media_accounts ==='

SELECT 
    policyname,
    permissive,
    roles,
    cmd as operation,
    qual as "SELECT condition",
    with_check as "INSERT/UPDATE condition"
FROM pg_policies
WHERE tablename = 'social_media_accounts'
ORDER BY cmd, policyname;

-- ============================================
-- SECTION 5: Verify RLS is Enabled
-- ============================================
\echo '=== SECTION 5: Check if RLS is enabled ==='

SELECT 
    tablename,
    rowsecurity,
    CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as status
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'social_media_accounts';

-- ============================================
-- SECTION 6: Test Current User Access
-- ============================================
\echo '=== SECTION 6: What current user can see (auth.uid() based) ==='
\echo 'Note: This query respects RLS policies'

SELECT 
    'Current auth.uid()' as check_type,
    auth.uid() as current_user_id;

-- Simulate what the component query would fetch:
SELECT 
    'Records visible to current user' as check_type,
    COUNT(*) as count
FROM public.social_media_accounts
WHERE user_id = auth.uid();

-- ============================================
-- SECTION 7: Check Table Structure
-- ============================================
\echo '=== SECTION 7: Table structure ==='

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'social_media_accounts'
ORDER BY ordinal_position;

-- ============================================
-- SECTION 8: Manual Insert Test (Optional)
-- ============================================
\echo '=== SECTION 8: Sample data (if you need to insert test records) ==='
\echo 'To insert test records for testing, run:'
\echo ''
\echo 'INSERT INTO public.social_media_accounts ('
\echo '    user_id, platform, account_id, account_name, access_token, is_connected, expires_at'
\echo ') VALUES ('
\echo '    ''YOUR_USER_UUID'', ''facebook'', ''864504226754704'', ''EventNexus'',' 
\echo '    ''test_token_here'', true, NOW() + INTERVAL ''60 days'''
\echo ');'
\echo ''
\echo 'Replace YOUR_USER_UUID with the admin user ID from Section 3 above.'
