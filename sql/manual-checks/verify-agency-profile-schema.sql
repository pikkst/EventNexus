-- EventNexus Agency Profile Schema Verification Script
-- Run this in Supabase SQL Editor to verify all necessary fields exist
-- for Agency Profile functionality

-- Check if users table exists and has all required columns
DO $$ 
DECLARE
    missing_columns TEXT[] := '{}';
    col_name TEXT;
BEGIN
    RAISE NOTICE '=== Checking Users Table Schema ===';
    
    -- Check for each required column (subscription is optional for backwards compatibility)
    FOREACH col_name IN ARRAY ARRAY['id', 'name', 'email', 'bio', 'location', 'role', 'subscription_tier', 'avatar', 'credits', 'agency_slug', 'followed_organizers', 'branding', 'notification_prefs', 'status', 'suspended_at', 'suspension_reason', 'banned_at', 'ban_reason']
    LOOP
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = col_name
        ) THEN
            missing_columns := array_append(missing_columns, col_name);
            RAISE NOTICE '❌ Missing column: %', col_name;
        ELSE
            RAISE NOTICE '✅ Column exists: %', col_name;
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'Missing columns in users table: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE '✅ All required columns exist in users table';
    END IF;
END $$;

-- Verify agency_slug column details
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'users'
    AND column_name = 'agency_slug';

-- Verify branding column is JSONB
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'users'
    AND column_name = 'branding';

-- Check if events table has organizer_id
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'events'
    AND column_name = 'organizer_id';

-- Sample query to verify agency_slug uniqueness constraint
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public' 
    AND table_name = 'users'
    AND constraint_type IN ('UNIQUE', 'PRIMARY KEY');

-- Check RLS policies on users table
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
WHERE schemaname = 'public' 
    AND tablename = 'users';

-- Test query: Fetch users with agency_slug set
SELECT 
    id,
    name,
    email,
    agency_slug,
    subscription_tier,
    role,
    CASE 
        WHEN branding IS NOT NULL THEN 'Has branding'
        ELSE 'No branding'
    END as branding_status
FROM users
WHERE agency_slug IS NOT NULL;

-- Test query: Count users by role and subscription
SELECT 
    role,
    subscription_tier,
    COUNT(*) as user_count,
    COUNT(agency_slug) as users_with_slug
FROM users
GROUP BY role, subscription_tier
ORDER BY role, subscription_tier;

-- Verify storage buckets for avatars and banners
SELECT 
    id,
    name,
    public,
    created_at
FROM storage.buckets
WHERE name IN ('avatars', 'banners');

-- Final summary
DO $$ 
BEGIN
    RAISE NOTICE '=== Schema verification complete ===';
    RAISE NOTICE 'Review the results above to ensure all fields exist';
    RAISE NOTICE 'For agency profiles to work properly:';
    RAISE NOTICE '1. users.agency_slug should be VARCHAR(100) nullable';
    RAISE NOTICE '2. users.branding should be JSONB nullable';
    RAISE NOTICE '3. events.organizer_id should reference users.id';
    RAISE NOTICE '4. RLS policies should allow reading public agency profiles';
END $$;
