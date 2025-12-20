-- ============================================================
-- EventNexus Database Schema Viewer
-- ============================================================
-- Purpose: Quick overview of current database structure
-- Run this to see what tables, columns, and data exist
-- ============================================================

-- Show all tables
SELECT 
    '=== EXISTING TABLES ===' as info;

SELECT 
    schemaname as schema,
    tablename as table_name,
    tableowner as owner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Show users table structure
SELECT 
    '=== USERS TABLE STRUCTURE ===' as info;

SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Show events table structure
SELECT 
    '=== EVENTS TABLE STRUCTURE ===' as info;

SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'events'
ORDER BY ordinal_position;

-- Show tickets table structure
SELECT 
    '=== TICKETS TABLE STRUCTURE ===' as info;

SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'tickets'
ORDER BY ordinal_position;

-- Show notifications table structure (if exists)
SELECT 
    '=== NOTIFICATIONS TABLE STRUCTURE ===' as info;

SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'notifications'
ORDER BY ordinal_position;

-- Show row counts
SELECT 
    '=== TABLE ROW COUNTS ===' as info;

SELECT 
    'users' as table_name, 
    COUNT(*) as row_count 
FROM users
UNION ALL
SELECT 
    'events', 
    COUNT(*) 
FROM events
UNION ALL
SELECT 
    'tickets', 
    COUNT(*) 
FROM tickets
UNION ALL
SELECT 
    'notifications', 
    COUNT(*) 
FROM notifications;

-- Show subscription tier distribution
SELECT 
    '=== SUBSCRIPTION TIER DISTRIBUTION ===' as info;

SELECT 
    COALESCE(subscription_tier, subscription, 'unknown') as tier,
    COUNT(*) as user_count
FROM users
GROUP BY COALESCE(subscription_tier, subscription, 'unknown')
ORDER BY user_count DESC;

-- Show featured events count
SELECT 
    '=== FEATURED EVENTS (Premium Feature) ===' as info;

SELECT 
    COUNT(*) as featured_events,
    COUNT(*) FILTER (WHERE is_featured = true) as currently_featured
FROM events;

-- Show events with custom branding
SELECT 
    '=== EVENTS WITH CUSTOM BRANDING ===' as info;

SELECT 
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE custom_branding IS NOT NULL) as with_branding
FROM events;

-- Show all indexes
SELECT 
    '=== DATABASE INDEXES ===' as info;

SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Show RLS policies
SELECT 
    '=== ROW LEVEL SECURITY POLICIES ===' as info;

SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check for missing columns (Premium features)
SELECT 
    '=== PREMIUM FEATURE COLUMNS CHECK ===' as info;

SELECT 
    'events.is_featured' as feature,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'is_featured'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status
UNION ALL
SELECT 
    'events.custom_branding',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'custom_branding'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 
    'tickets.custom_branding',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'custom_branding'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 
    'users.subscription_tier',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'subscription_tier'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 
    'users.affiliate_code',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'affiliate_code'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 
    'event_analytics table',
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'event_analytics'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 
    'affiliate_referrals table',
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'affiliate_referrals'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END;

-- Show sample data from users (safe - no passwords)
SELECT 
    '=== SAMPLE USER DATA (First 5) ===' as info;

SELECT 
    id,
    name,
    email,
    role,
    COALESCE(subscription_tier, subscription) as tier,
    created_at
FROM users
ORDER BY created_at DESC
LIMIT 5;

-- Show sample events
SELECT 
    '=== SAMPLE EVENTS (First 5) ===' as info;

SELECT 
    id,
    name,
    category,
    date,
    price,
    is_featured,
    CASE WHEN custom_branding IS NOT NULL THEN 'Yes' ELSE 'No' END as has_branding,
    attendees_count,
    created_at
FROM events
ORDER BY created_at DESC
LIMIT 5;
