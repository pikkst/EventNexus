-- CRITICAL FIX - Ensure trigger works for ALL future registrations
-- This MUST be run to fix the root cause
-- Run this in Supabase SQL Editor

-- ============================================
-- PART 1: DROP and RECREATE trigger function with correct implementation
-- ============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create the correct function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert new user profile using auth user's ID
    INSERT INTO public.users (
        id, 
        name, 
        email, 
        avatar, 
        role, 
        subscription_tier,
        subscription_status,
        credits, 
        followed_organizers, 
        notification_prefs,
        status
    )
    VALUES (
        NEW.id,  -- Use auth.users ID directly
        COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
        NEW.email,
        'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id::text,
        'attendee',
        'free',
        'active',
        0,
        '[]'::jsonb,
        jsonb_build_object(
            'pushEnabled', true,
            'emailEnabled', true,
            'proximityAlerts', true,
            'alertRadius', 5,
            'interestedCategories', '[]'::jsonb
        ),
        'active'
    )
    ON CONFLICT (id) DO NOTHING;  -- Skip if already exists
    
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Log error but don't fail the auth registration
        RAISE WARNING 'Failed to create user profile for %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$;

-- ============================================
-- PART 2: Ensure trigger is attached and enabled
-- ============================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PART 3: Grant necessary permissions
-- ============================================

-- Grant execute permission on function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;

-- ============================================
-- PART 4: Fix any existing users without profiles
-- ============================================

-- Create profiles for confirmed users who don't have one
INSERT INTO public.users (
    id, 
    name, 
    email, 
    avatar, 
    role, 
    subscription_tier,
    subscription_status,
    credits, 
    followed_organizers, 
    notification_prefs,
    status
)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'name', SPLIT_PART(au.email, '@', 1)),
    au.email,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || au.id::text,
    'attendee',
    'free',
    'active',
    0,
    '[]'::jsonb,
    jsonb_build_object(
        'pushEnabled', true,
        'emailEnabled', true,
        'proximityAlerts', true,
        'alertRadius', 5,
        'interestedCategories', '[]'::jsonb
    ),
    'active'
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
WHERE u.id IS NULL 
AND au.confirmed_at IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PART 5: Verify everything is working
-- ============================================

-- Check trigger exists
SELECT 
    '✅ TRIGGER CHECK' as test,
    t.tgname as trigger_name,
    CASE t.tgenabled
        WHEN 'O' THEN '✅ ENABLED'
        ELSE '❌ DISABLED - PROBLEM!'
    END as status,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_auth_user_created';

-- Check function exists and contains required columns
SELECT 
    '✅ FUNCTION CHECK' as test,
    CASE 
        WHEN prosrc LIKE '%status%' AND prosrc LIKE '%subscription_tier%' 
        THEN '✅ Function includes all required columns'
        ELSE '❌ Function missing columns - PROBLEM!'
    END as status
FROM pg_proc
WHERE proname = 'handle_new_user';

-- Count users without profiles
SELECT 
    '✅ MISSING PROFILES CHECK' as test,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All confirmed users have profiles'
        ELSE '⚠️ ' || COUNT(*) || ' users still missing profiles'
    END as status
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
WHERE u.id IS NULL AND au.confirmed_at IS NOT NULL;

-- Show all auth users and their profile status
SELECT 
    '📊 USER STATUS REPORT' as report,
    au.email,
    au.confirmed_at IS NOT NULL as email_confirmed,
    u.id IS NOT NULL as has_profile,
    CASE 
        WHEN u.id IS NOT NULL THEN '✅ OK'
        WHEN au.confirmed_at IS NULL THEN '⏳ Waiting for email confirmation'
        ELSE '❌ MISSING PROFILE'
    END as status
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
ORDER BY au.created_at DESC
LIMIT 10;
