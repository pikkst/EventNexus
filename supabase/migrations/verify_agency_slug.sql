-- Verification script for agency_slug implementation
-- Run this in Supabase SQL Editor to verify everything is set up correctly

-- 1. Check if agency_slug column exists
SELECT 
    'agency_slug column' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'agency_slug'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING - Run 20241228_add_agency_slug.sql'
    END as status;

-- 2. Check if index exists
SELECT 
    'idx_users_agency_slug index' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'users' 
            AND indexname = 'idx_users_agency_slug'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING - Run 20241228_add_agency_slug.sql'
    END as status;

-- 3. Check column properties
SELECT 
    'agency_slug unique constraint' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu 
                ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_schema = 'public'
            AND tc.table_name = 'users'
            AND ccu.column_name = 'agency_slug'
            AND tc.constraint_type = 'UNIQUE'
        ) THEN '✅ UNIQUE CONSTRAINT EXISTS'
        ELSE '⚠️ NO UNIQUE CONSTRAINT'
    END as status;

-- 4. Show users with agency_slug
SELECT 
    '--- Users with agency_slug ---' as info,
    '' as count;

SELECT 
    id,
    name,
    email,
    agency_slug,
    subscription_tier,
    created_at
FROM public.users
WHERE agency_slug IS NOT NULL
ORDER BY created_at DESC;

-- 5. Show count summary
SELECT 
    subscription_tier,
    COUNT(*) as total_users,
    COUNT(agency_slug) as users_with_slug,
    COUNT(*) - COUNT(agency_slug) as users_without_slug
FROM public.users
GROUP BY subscription_tier
ORDER BY 
    CASE subscription_tier
        WHEN 'enterprise' THEN 1
        WHEN 'premium' THEN 2
        WHEN 'pro' THEN 3
        WHEN 'free' THEN 4
    END;

-- 6. Check for duplicate slugs (should be 0)
SELECT 
    'Duplicate slug check' as check_name,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO DUPLICATES'
        ELSE '❌ DUPLICATES FOUND: ' || COUNT(*)::text
    END as status
FROM (
    SELECT agency_slug, COUNT(*) as count
    FROM public.users
    WHERE agency_slug IS NOT NULL
    GROUP BY agency_slug
    HAVING COUNT(*) > 1
) duplicates;

-- 7. Show users missing slugs who should have them (Pro+ tiers)
SELECT 
    '--- Users needing slugs (Pro+) ---' as info,
    '' as details;

SELECT 
    id,
    name,
    email,
    subscription_tier
FROM public.users
WHERE agency_slug IS NULL
AND subscription_tier IN ('pro', 'premium', 'enterprise')
ORDER BY subscription_tier, name;

-- 8. Test URL generation
SELECT 
    '--- Sample URLs ---' as info,
    '' as url;

SELECT 
    name as agency_name,
    agency_slug,
    'https://eventnexus.eu/#/agency/' || agency_slug as public_url,
    subscription_tier
FROM public.users
WHERE agency_slug IS NOT NULL
LIMIT 5;
