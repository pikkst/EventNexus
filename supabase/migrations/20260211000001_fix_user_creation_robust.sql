-- ============================================
-- Fix User Creation: More Robust Trigger & Fallback
-- ============================================
-- Date: 2026-02-11
-- Problem: New users (both Google OAuth and manual signup) are not
-- being created in the public.users table because:
--   1. The handle_new_user trigger silently swallows errors
--   2. The ensure_user_profile RPC may fail if columns changed
--   3. Schema changes may have added NOT NULL columns the trigger doesn't set
-- ============================================

-- Step 1: Check and log current trigger status
DO $$
DECLARE
    trigger_exists BOOLEAN;
    func_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) INTO trigger_exists;
    
    SELECT EXISTS(
        SELECT 1 FROM pg_proc 
        WHERE proname = 'handle_new_user'
    ) INTO func_exists;
    
    RAISE NOTICE 'Trigger on_auth_user_created exists: %', trigger_exists;
    RAISE NOTICE 'Function handle_new_user exists: %', func_exists;
END $$;

-- Step 2: Recreate handle_new_user with better error handling and all columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    user_name TEXT;
    user_avatar TEXT;
    user_email TEXT;
    debug_info TEXT;
BEGIN
    -- Extract email (required)
    user_email := COALESCE(NEW.email, '');
    
    -- Extract name from OAuth metadata or email
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'display_name',
        SPLIT_PART(user_email, '@', 1)
    );
    
    -- Extract avatar from OAuth metadata or generate one
    user_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        NEW.raw_user_meta_data->>'avatar',
        NEW.raw_user_meta_data->>'profile_image',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id::text
    );
    
    -- Log for debugging
    debug_info := format('email=%s, name=%s, avatar_len=%s, provider=%s', 
        user_email, user_name, length(user_avatar), 
        COALESCE(NEW.raw_app_meta_data->>'provider', 'email'));
    RAISE LOG 'handle_new_user: Creating profile for user % (%)', NEW.id, debug_info;
    
    -- Insert user profile with ON CONFLICT to handle race conditions
    INSERT INTO public.users (
        id,
        email,
        name,
        avatar,
        role,
        subscription_tier,
        credits,
        credits_balance,
        notification_prefs,
        followed_organizers,
        created_at,
        updated_at,
        last_login
    )
    VALUES (
        NEW.id,
        user_email,
        user_name,
        user_avatar,
        'user',
        'free',
        100,
        100,
        jsonb_build_object(
            'pushEnabled', true,
            'emailEnabled', true,
            'proximityAlerts', true,
            'eventUpdates', true,
            'interestedCategories', '[]'::jsonb,
            'alertRadius', 10,
            'notifyActiveEvents', true,
            'notifyUpcomingEvents', true,
            'upcomingEventWindow', 24,
            'minAvailableTickets', 1
        ),
        '[]'::jsonb,
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        last_login = NOW(),
        updated_at = NOW(),
        email = COALESCE(EXCLUDED.email, public.users.email),
        name = CASE 
            WHEN public.users.name IS NULL OR public.users.name = '' OR public.users.name LIKE '%@%' 
                THEN EXCLUDED.name
            ELSE public.users.name
        END,
        avatar = CASE
            WHEN EXCLUDED.avatar LIKE '%dicebear%' AND public.users.avatar NOT LIKE '%dicebear%' 
                THEN public.users.avatar
            WHEN EXCLUDED.avatar NOT LIKE '%dicebear%' 
                THEN EXCLUDED.avatar
            ELSE public.users.avatar
        END;
    
    RAISE LOG 'handle_new_user: Successfully created/updated profile for user %', NEW.id;
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Log detailed error for debugging
        RAISE WARNING 'handle_new_user FAILED for user %: % (SQLSTATE: %, DETAIL: %)', 
            NEW.id, SQLERRM, SQLSTATE, 
            format('email=%s, name=%s', user_email, user_name);
        -- Don't fail the auth signup - the frontend will retry via ensure_user_profile
        RETURN NEW;
END;
$$;

-- Step 3: Recreate trigger (drop first to ensure it's fresh)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Recreate ensure_user_profile with better handling
DROP FUNCTION IF EXISTS public.ensure_user_profile(UUID);

CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    user_exists BOOLEAN;
    auth_record record;
    user_name TEXT;
    user_avatar TEXT;
    user_email TEXT;
BEGIN
    -- Check if user profile exists
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = user_id) INTO user_exists;
    
    IF user_exists THEN
        -- Profile exists, just update last_login
        UPDATE public.users 
        SET last_login = NOW(), updated_at = NOW()
        WHERE id = user_id;
        RETURN;
    END IF;
    
    -- User profile doesn't exist, fetch auth data and create
    SELECT * INTO auth_record FROM auth.users WHERE id = user_id;
    
    IF auth_record IS NULL THEN
        RAISE WARNING 'ensure_user_profile: No auth user found for ID %', user_id;
        RETURN;
    END IF;
    
    -- Extract user data from auth record
    user_email := COALESCE(auth_record.email, '');
    user_name := COALESCE(
        auth_record.raw_user_meta_data->>'full_name',
        auth_record.raw_user_meta_data->>'name',
        auth_record.raw_user_meta_data->>'display_name',
        SPLIT_PART(user_email, '@', 1)
    );
    user_avatar := COALESCE(
        auth_record.raw_user_meta_data->>'avatar_url',
        auth_record.raw_user_meta_data->>'picture',
        auth_record.raw_user_meta_data->>'avatar',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=' || auth_record.id::text
    );
    
    RAISE LOG 'ensure_user_profile: Creating profile for user % (email: %)', user_id, user_email;
    
    -- Create profile with all required fields
    INSERT INTO public.users (
        id,
        email,
        name,
        avatar,
        role,
        subscription_tier,
        credits,
        credits_balance,
        notification_prefs,
        followed_organizers,
        created_at,
        updated_at,
        last_login
    )
    VALUES (
        user_id,
        user_email,
        user_name,
        user_avatar,
        'user',
        'free',
        100,
        100,
        jsonb_build_object(
            'pushEnabled', true,
            'emailEnabled', true,
            'proximityAlerts', true,
            'eventUpdates', true,
            'interestedCategories', '[]'::jsonb,
            'alertRadius', 10,
            'notifyActiveEvents', true,
            'notifyUpcomingEvents', true,
            'upcomingEventWindow', 24,
            'minAvailableTickets', 1
        ),
        '[]'::jsonb,
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        last_login = NOW(),
        updated_at = NOW();
    
    RAISE LOG 'ensure_user_profile: Profile created successfully for user %', user_id;
    
EXCEPTION
    WHEN others THEN
        RAISE WARNING 'ensure_user_profile FAILED for user %: % (SQLSTATE: %)', 
            user_id, SQLERRM, SQLSTATE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(UUID) TO anon;

-- Step 5: Ensure RLS policies allow user self-creation
DROP POLICY IF EXISTS "Users can create their own profile" ON public.users;
CREATE POLICY "Users can create their own profile" ON public.users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Step 6: Ensure followed_organizers column has a default (common cause of trigger failure)
DO $$
BEGIN
    -- Add default for followed_organizers if it doesn't have one
    ALTER TABLE public.users ALTER COLUMN followed_organizers SET DEFAULT '[]'::jsonb;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'followed_organizers default already set or column does not exist: %', SQLERRM;
END $$;

-- Step 7: Retroactively fix any auth users that don't have profiles
-- This will create profiles for all existing auth users who are missing them
DO $$
DECLARE
    auth_user record;
    fixed_count INTEGER := 0;
BEGIN
    FOR auth_user IN
        SELECT au.id, au.email, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN public.users pu ON pu.id = au.id
        WHERE pu.id IS NULL
    LOOP
        INSERT INTO public.users (
            id, email, name, avatar, role, subscription_tier,
            credits, credits_balance, notification_prefs, followed_organizers,
            created_at, updated_at, last_login
        )
        VALUES (
            auth_user.id,
            COALESCE(auth_user.email, ''),
            COALESCE(
                auth_user.raw_user_meta_data->>'full_name',
                auth_user.raw_user_meta_data->>'name',
                SPLIT_PART(COALESCE(auth_user.email, 'user'), '@', 1)
            ),
            COALESCE(
                auth_user.raw_user_meta_data->>'avatar_url',
                auth_user.raw_user_meta_data->>'picture',
                'https://api.dicebear.com/7.x/avataaars/svg?seed=' || auth_user.id::text
            ),
            'user',
            'free',
            100,
            100,
            jsonb_build_object(
                'pushEnabled', true,
                'emailEnabled', true,
                'proximityAlerts', true,
                'eventUpdates', true,
                'interestedCategories', '[]'::jsonb,
                'alertRadius', 10
            ),
            '[]'::jsonb,
            NOW(),
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
        
        fixed_count := fixed_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Fixed % orphaned auth users (created missing profiles)', fixed_count;
END $$;

-- Step 8: Verify
DO $$
DECLARE
    trigger_exists BOOLEAN;
    orphan_count INTEGER;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) INTO trigger_exists;
    
    SELECT COUNT(*) INTO orphan_count
    FROM auth.users au
    LEFT JOIN public.users pu ON pu.id = au.id
    WHERE pu.id IS NULL;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ User creation fix applied';
    RAISE NOTICE '   Trigger active: %', trigger_exists;
    RAISE NOTICE '   Orphan auth users remaining: %', orphan_count;
    RAISE NOTICE '============================================';
END $$;
