-- ============================================================
-- EventNexus AI Tools Readiness Check
-- ============================================================
-- Returns results as tables (works in Supabase SQL Editor)
-- ============================================================

-- 1. CHECK EVENTS TABLE COLUMNS
SELECT 
    '1. EVENTS TABLE COLUMNS' as check_section,
    CASE 
        WHEN column_name IN ('id', 'name', 'organizer_id', 'price', 'attendees_count', 'category', 'date', 'status')
        THEN '✅ CORE'
        WHEN column_name IN ('is_featured', 'custom_branding')
        THEN '⭐ PREMIUM'
        ELSE '📋 OTHER'
    END as importance,
    column_name,
    data_type,
    CASE WHEN is_nullable = 'YES' THEN 'Nullable' ELSE 'Required' END as nullable_status
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'events'
  AND column_name IN (
    'id', 'name', 'organizer_id', 'price', 'attendees_count', 
    'category', 'date', 'status', 'is_featured', 'custom_branding',
    'description', 'location', 'image', 'max_capacity', 'visibility'
  )
ORDER BY 
    CASE 
        WHEN column_name IN ('id', 'name', 'organizer_id', 'price', 'attendees_count', 'category', 'date', 'status') THEN 1
        WHEN column_name IN ('is_featured', 'custom_branding') THEN 2
        ELSE 3
    END,
    column_name;

-- 2. CHECK USERS TABLE COLUMNS
SELECT 
    '2. USERS TABLE COLUMNS' as check_section,
    CASE 
        WHEN column_name IN ('id', 'name', 'email', 'role')
        THEN '✅ CORE'
        WHEN column_name IN ('subscription_tier', 'branding')
        THEN '⭐ PREMIUM'
        ELSE '📋 OTHER'
    END as importance,
    column_name,
    data_type,
    CASE WHEN is_nullable = 'YES' THEN 'Nullable' ELSE 'Required' END as nullable_status
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND column_name IN (
    'id', 'name', 'email', 'role', 'subscription_tier', 
    'subscription', 'branding', 'avatar', 'bio'
  )
ORDER BY 
    CASE 
        WHEN column_name IN ('id', 'name', 'email', 'role') THEN 1
        WHEN column_name IN ('subscription_tier', 'branding') THEN 2
        ELSE 3
    END,
    column_name;

-- 3. DATABASE STATISTICS
SELECT 
    '3. DATABASE STATISTICS' as check_section,
    'Total Events' as metric,
    COUNT(*)::text as value
FROM events
UNION ALL
SELECT 
    '3. DATABASE STATISTICS',
    'Active Events',
    COUNT(*)::text
FROM events WHERE status = 'active'
UNION ALL
SELECT 
    '3. DATABASE STATISTICS',
    'Featured Events (Premium)',
    COUNT(*)::text
FROM events WHERE is_featured = true
UNION ALL
SELECT 
    '3. DATABASE STATISTICS',
    'Events with Branding (Premium)',
    COUNT(*)::text
FROM events WHERE custom_branding IS NOT NULL
UNION ALL
SELECT 
    '3. DATABASE STATISTICS',
    'Total Users',
    COUNT(*)::text
FROM users
UNION ALL
SELECT 
    '3. DATABASE STATISTICS',
    'Enterprise Users',
    COUNT(*)::text
FROM users WHERE subscription_tier = 'enterprise';

-- 4. AI TOOLS READINESS
SELECT 
    '4. AI TOOLS READINESS' as check_section,
    tool_name,
    CASE 
        WHEN requirements_met THEN '✅ READY'
        ELSE '❌ NOT READY'
    END as status,
    missing_fields
FROM (
    -- get_my_events check
    SELECT 
        'get_my_events' as tool_name,
        EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'events' 
            AND column_name IN ('id', 'organizer_id', 'status')
            GROUP BY table_name
            HAVING COUNT(*) = 3
        ) as requirements_met,
        CASE 
            WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'organizer_id')
            THEN 'Missing: organizer_id'
            ELSE 'All fields present'
        END as missing_fields
    
    UNION ALL
    
    -- get_platform_events check
    SELECT 
        'get_platform_events',
        EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'events' 
            AND column_name IN ('id', 'status')
            GROUP BY table_name
            HAVING COUNT(*) = 2
        ),
        'All fields present'
    
    UNION ALL
    
    -- analyze_performance check
    SELECT 
        'analyze_performance',
        EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'events' 
            AND column_name IN ('price', 'attendees_count', 'organizer_id')
            GROUP BY table_name
            HAVING COUNT(*) = 3
        ),
        CASE 
            WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'price')
            THEN 'Missing: price'
            WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'attendees_count')
            THEN 'Missing: attendees_count'
            ELSE 'All fields present'
        END
    
    UNION ALL
    
    -- generate_flyer check
    SELECT 
        'generate_flyer (AI)',
        true,
        'No database required'
    
    UNION ALL
    
    -- generate_ad_campaign check
    SELECT 
        'generate_ad_campaign (AI)',
        true,
        'No database required'
) tools;

-- 5. PREMIUM FEATURES CHECK
SELECT 
    '5. PREMIUM FEATURES' as check_section,
    feature_name,
    CASE 
        WHEN is_available THEN '✅ AVAILABLE'
        ELSE '⚠️  MISSING'
    END as status,
    action_needed
FROM (
    SELECT 
        'Featured Map Placement' as feature_name,
        EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'events' AND column_name = 'is_featured'
        ) as is_available,
        CASE 
            WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'is_featured')
            THEN 'Run check-and-update-schema.sql'
            ELSE 'Column exists'
        END as action_needed
    
    UNION ALL
    
    SELECT 
        'Custom Branding',
        EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'events' AND column_name = 'custom_branding'
        ),
        CASE 
            WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'custom_branding')
            THEN 'Run check-and-update-schema.sql'
            ELSE 'Column exists'
        END
    
    UNION ALL
    
    SELECT 
        'Enterprise Branding',
        EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'branding'
        ),
        CASE 
            WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'branding')
            THEN 'Column should exist by default'
            ELSE 'Column exists'
        END
    
    UNION ALL
    
    SELECT 
        'Affiliate Program',
        EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE tablename = 'affiliate_referrals'
        ),
        CASE 
            WHEN NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'affiliate_referrals')
            THEN 'Run check-and-update-schema.sql'
            ELSE 'Table exists'
        END
) features;

-- 6. FINAL SUMMARY
SELECT 
    '6. SUMMARY' as check_section,
    category,
    status,
    details
FROM (
    SELECT 
        1 as sort_order,
        'Core AI Tools' as category,
        CASE 
            WHEN (
                SELECT COUNT(*) FROM information_schema.columns 
                WHERE table_name = 'events' 
                AND column_name IN ('id', 'organizer_id', 'price', 'attendees_count', 'status')
            ) = 5
            THEN '✅ READY'
            ELSE '❌ NOT READY'
        END as status,
        'get_my_events, get_platform_events, analyze_performance' as details
    
    UNION ALL
    
    SELECT 
        2,
        'AI Generation',
        '✅ READY',
        'generate_flyer, generate_ad_campaign (no DB needed)'
    
    UNION ALL
    
    SELECT 
        3,
        'Premium Features',
        CASE 
            WHEN (
                SELECT COUNT(*) FROM information_schema.columns 
                WHERE table_name = 'events' 
                AND column_name IN ('is_featured', 'custom_branding')
            ) = 2
            THEN '✅ READY'
            ELSE '⚠️  PARTIAL'
        END,
        'Featured placement, Custom branding'
    
    UNION ALL
    
    SELECT 
        4,
        'Enterprise Features',
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'branding')
            THEN '✅ READY'
            ELSE '⚠️  MISSING'
        END,
        'White-label dashboard, Custom landing pages'
) summary
ORDER BY sort_order;
