-- ============================================
-- Campaign System Verification Script
-- ============================================
-- Run this in Supabase SQL Editor to verify
-- campaign system is properly set up
-- ============================================

-- Section 1: Check Tables Existence
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'CAMPAIGN SYSTEM VERIFICATION';
    RAISE NOTICE '====================================';
    RAISE NOTICE '';
    RAISE NOTICE '1. CHECKING TABLES...';
    RAISE NOTICE '';
END $$;

-- Check campaigns table
SELECT CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaigns') 
    THEN '✅ campaigns table EXISTS'
    ELSE '❌ campaigns table MISSING'
END AS result;

-- Check system_config table
SELECT CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'system_config') 
    THEN '✅ system_config table EXISTS'
    ELSE '❌ system_config table MISSING'
END AS result;

-- Check social_media_accounts table
SELECT CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'social_media_accounts') 
    THEN '✅ social_media_accounts table EXISTS'
    ELSE '❌ social_media_accounts table MISSING'
END AS result;

-- Check campaign_social_content table
SELECT CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaign_social_content') 
    THEN '✅ campaign_social_content table EXISTS'
    ELSE '❌ campaign_social_content table MISSING'
END AS result;

-- Section 2: Check Campaigns Table Schema
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '2. CHECKING CAMPAIGNS TABLE SCHEMA...';
    RAISE NOTICE '';
END $$;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('id', 'title', 'copy', 'status', 'placement', 'target', 'cta', 'tracking_code') 
        THEN '✅'
        ELSE '⚠️'
    END AS status
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'campaigns'
ORDER BY ordinal_position;

-- Section 3: Check Constraints and Indexes
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '3. CHECKING CONSTRAINTS...';
    RAISE NOTICE '';
END $$;

-- Check status constraint
SELECT CASE 
    WHEN EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%campaigns%status%'
    ) 
    THEN '✅ Status constraint EXISTS (Active/Draft/Paused/Completed)'
    ELSE '❌ Status constraint MISSING'
END AS result;

-- Check placement constraint
SELECT CASE 
    WHEN EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%campaigns%placement%'
    ) 
    THEN '✅ Placement constraint EXISTS (landing_page/dashboard/both)'
    ELSE '❌ Placement constraint MISSING'
END AS result;

-- Check target constraint
SELECT CASE 
    WHEN EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%campaigns%target%'
    ) 
    THEN '✅ Target constraint EXISTS (attendees/organizers/all)'
    ELSE '❌ Target constraint MISSING'
END AS result;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '4. CHECKING INDEXES...';
    RAISE NOTICE '';
END $$;

-- Check indexes
SELECT 
    indexname,
    indexdef,
    CASE 
        WHEN indexname IN ('idx_campaigns_status', 'idx_campaigns_placement', 'idx_campaigns_target') 
        THEN '✅'
        ELSE '⚠️'
    END AS status
FROM pg_indexes
WHERE tablename = 'campaigns'
ORDER BY indexname;

-- Section 4: Check RLS Policies
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '5. CHECKING RLS POLICIES...';
    RAISE NOTICE '';
END $$;

-- Check if RLS is enabled
SELECT CASE 
    WHEN relrowsecurity = true 
    THEN '✅ RLS ENABLED on campaigns table'
    ELSE '❌ RLS DISABLED on campaigns table'
END AS result
FROM pg_class
WHERE relname = 'campaigns';

-- List all policies
SELECT 
    policyname,
    CASE cmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END AS command,
    CASE 
        WHEN policyname LIKE '%admin%' THEN '✅ Admin policy'
        WHEN policyname LIKE '%public%' OR policyname LIKE '%active%' THEN '✅ Public read policy'
        ELSE '⚠️'
    END AS status
FROM pg_policies
WHERE tablename = 'campaigns';

-- Section 5: Check Database Functions
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '6. CHECKING DATABASE FUNCTIONS...';
    RAISE NOTICE '';
END $$;

-- Check increment_campaign_metric function
SELECT CASE 
    WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'increment_campaign_metric'
    ) 
    THEN '✅ increment_campaign_metric function EXISTS'
    ELSE '❌ increment_campaign_metric function MISSING'
END AS result;

-- Check increment_campaign_source function
SELECT CASE 
    WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'increment_campaign_source'
    ) 
    THEN '✅ increment_campaign_source function EXISTS'
    ELSE '❌ increment_campaign_source function MISSING'
END AS result;

-- Section 6: Check System Configuration
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '7. CHECKING SYSTEM CONFIGURATION...';
    RAISE NOTICE '';
END $$;

-- List all system config entries
SELECT 
    key,
    value,
    updated_at,
    CASE 
        WHEN key IN ('global_ticket_fee', 'credit_value', 'maintenance_mode', 'platform_name') 
        THEN '✅'
        ELSE '⚠️'
    END AS status
FROM public.system_config
ORDER BY key;

-- Section 7: Check Existing Campaigns
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '8. CHECKING EXISTING CAMPAIGNS...';
    RAISE NOTICE '';
END $$;

SELECT 
    COUNT(*) AS total_campaigns,
    SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active_campaigns,
    SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) AS draft_campaigns,
    SUM(CASE WHEN status = 'Paused' THEN 1 ELSE 0 END) AS paused_campaigns,
    SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_campaigns
FROM public.campaigns;

-- Show active campaigns for landing page
SELECT 
    id,
    title,
    status,
    placement,
    target,
    cta,
    (incentive->>'type') AS incentive_type,
    (incentive->>'value')::int AS incentive_value,
    (incentive->>'limit')::int AS incentive_limit,
    (incentive->>'redeemed')::int AS incentive_redeemed,
    (metrics->>'clicks')::int AS total_clicks,
    created_at,
    '✅ ACTIVE' AS display_status
FROM public.campaigns
WHERE status = 'Active' 
  AND placement IN ('landing_page', 'both')
ORDER BY created_at DESC;

-- Section 8: Test Campaign Creation (Dry Run)
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '9. TEST CAMPAIGN STRUCTURE...';
    RAISE NOTICE '';
    RAISE NOTICE 'Example campaign structure for admin to create:';
    RAISE NOTICE '';
    RAISE NOTICE '{';
    RAISE NOTICE '  "title": "Limited Offer",';
    RAISE NOTICE '  "copy": "Join the map-first revolution. First 100 registrations get 30 credits.",';
    RAISE NOTICE '  "status": "Active",';
    RAISE NOTICE '  "placement": "landing_page",';
    RAISE NOTICE '  "target": "attendees",';
    RAISE NOTICE '  "cta": "Claim My Credits",';
    RAISE NOTICE '  "tracking_code": "LAUNCH24",';
    RAISE NOTICE '  "incentive": {';
    RAISE NOTICE '    "type": "credits",';
    RAISE NOTICE '    "value": 30,';
    RAISE NOTICE '    "limit": 100,';
    RAISE NOTICE '    "redeemed": 42';
    RAISE NOTICE '  },';
    RAISE NOTICE '  "metrics": {';
    RAISE NOTICE '    "views": 0,';
    RAISE NOTICE '    "clicks": 0,';
    RAISE NOTICE '    "guestSignups": 0,';
    RAISE NOTICE '    "proConversions": 0,';
    RAISE NOTICE '    "revenueValue": 0';
    RAISE NOTICE '  }';
    RAISE NOTICE '}';
    RAISE NOTICE '';
END $$;

-- Section 9: Admin User Check
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '10. CHECKING ADMIN USERS...';
    RAISE NOTICE '';
END $$;

SELECT 
    id,
    name,
    email,
    role,
    subscription_tier,
    credits,
    '✅ Can create campaigns' AS permission_status
FROM public.users
WHERE role = 'admin';

-- Section 10: Social Media Integration Check
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '11. CHECKING SOCIAL MEDIA INTEGRATION...';
    RAISE NOTICE '';
END $$;

-- Check social media accounts
SELECT 
    COUNT(*) AS total_accounts,
    SUM(CASE WHEN platform = 'facebook' THEN 1 ELSE 0 END) AS facebook_accounts,
    SUM(CASE WHEN platform = 'instagram' THEN 1 ELSE 0 END) AS instagram_accounts,
    SUM(CASE WHEN platform = 'twitter' THEN 1 ELSE 0 END) AS twitter_accounts,
    SUM(CASE WHEN platform = 'linkedin' THEN 1 ELSE 0 END) AS linkedin_accounts
FROM public.social_media_accounts;

-- Section 11: Feature Unlock System Check
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '12. CHECKING FEATURE UNLOCK SYSTEM...';
    RAISE NOTICE '';
END $$;

-- Check feature_unlocks table
SELECT CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feature_unlocks') 
    THEN '✅ feature_unlocks table EXISTS'
    ELSE '❌ feature_unlocks table MISSING'
END AS result;

-- Check credit_transactions table
SELECT CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_transactions') 
    THEN '✅ credit_transactions table EXISTS'
    ELSE '❌ credit_transactions table MISSING'
END AS result;

-- Check ticket_scans table
SELECT CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ticket_scans') 
    THEN '✅ ticket_scans table EXISTS'
    ELSE '❌ ticket_scans table MISSING'
END AS result;

-- Section 12: Summary Report
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'VERIFICATION COMPLETE';
    RAISE NOTICE '====================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Review results above to ensure:';
    RAISE NOTICE '1. All tables exist with correct schema';
    RAISE NOTICE '2. RLS policies are enabled and configured';
    RAISE NOTICE '3. Database functions are created';
    RAISE NOTICE '4. System config has default values';
    RAISE NOTICE '5. At least one admin user exists';
    RAISE NOTICE '6. Active campaigns show on landing page';
    RAISE NOTICE '';
    RAISE NOTICE 'If any checks show ❌, run the missing migrations:';
    RAISE NOTICE '- supabase/migrations/20250119000002_admin_features.sql';
    RAISE NOTICE '- supabase/migrations/20250120000001_social_media_integration.sql';
    RAISE NOTICE '- supabase/migrations/20250120000002_feature_unlock_system.sql';
    RAISE NOTICE '';
END $$;

-- Final Summary Statistics
SELECT 
    'CAMPAIGN SYSTEM STATUS' AS category,
    json_build_object(
        'tables_exist', (
            SELECT COUNT(*) = 7 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('campaigns', 'system_config', 'social_media_accounts', 'social_media_posts', 'campaign_social_content', 'feature_unlocks', 'credit_transactions')
        ),
        'total_campaigns', (SELECT COUNT(*) FROM public.campaigns),
        'active_campaigns', (SELECT COUNT(*) FROM public.campaigns WHERE status = 'Active'),
        'landing_page_campaigns', (SELECT COUNT(*) FROM public.campaigns WHERE status = 'Active' AND placement IN ('landing_page', 'both')),
        'admin_users', (SELECT COUNT(*) FROM public.users WHERE role = 'admin'),
        'system_config_entries', (SELECT COUNT(*) FROM public.system_config),
        'social_accounts_configured', (SELECT COUNT(*) FROM public.social_media_accounts)
    ) AS status_summary;
