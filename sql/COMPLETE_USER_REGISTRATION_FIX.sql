-- COMPLETE FIX FOR USER REGISTRATION ISSUES
-- Run this in Supabase SQL Editor
-- This fixes both the immediate problem and prevents future issues

-- ============================================
-- STEP 1: Fix the trigger function
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
        NEW.id,
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
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- User already exists, skip
        RETURN NEW;
    WHEN others THEN
        -- Log the error and continue
        RAISE WARNING 'Error creating user profile for %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 2: Ensure trigger exists and is enabled
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 3: Fix any existing users without profiles
-- ============================================
DO $$
DECLARE
    auth_user RECORD;
    created_count INTEGER := 0;
BEGIN
    -- Find all auth.users without a profile in public.users
    FOR auth_user IN 
        SELECT au.id, au.email, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN public.users u ON u.id = au.id
        WHERE u.id IS NULL
        AND au.confirmed_at IS NOT NULL  -- Only for confirmed users
    LOOP
        BEGIN
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
                auth_user.id,
                COALESCE(auth_user.raw_user_meta_data->>'name', SPLIT_PART(auth_user.email, '@', 1)),
                auth_user.email,
                'https://api.dicebear.com/7.x/avataaars/svg?seed=' || auth_user.id::text,
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
            );
            created_count := created_count + 1;
            RAISE NOTICE 'Created profile for user: % (%)', auth_user.email, auth_user.id;
        EXCEPTION
            WHEN unique_violation THEN
                RAISE NOTICE 'Profile already exists for: %', auth_user.email;
            WHEN others THEN
                RAISE WARNING 'Error creating profile for %: %', auth_user.email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Created % missing user profiles', created_count;
END $$;

-- ============================================
-- STEP 4: Verify everything is working
-- ============================================
SELECT 
    'Total auth users' as check_type,
    COUNT(*) as count
FROM auth.users
WHERE confirmed_at IS NOT NULL

UNION ALL

SELECT 
    'Total user profiles' as check_type,
    COUNT(*) as count
FROM public.users

UNION ALL

SELECT 
    'Auth users without profile' as check_type,
    COUNT(*) as count
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
WHERE u.id IS NULL AND au.confirmed_at IS NOT NULL;

-- Show specific user for debugging (3dcutandengrave@gmail.com)
SELECT 
    'User check: 3dcutandengrave@gmail.com' as info,
    u.id,
    u.name,
    u.email,
    u.role,
    u.subscription_tier,
    u.subscription_status,
    u.created_at,
    au.confirmed_at as email_confirmed
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
WHERE au.email = '3dcutandengrave@gmail.com';
