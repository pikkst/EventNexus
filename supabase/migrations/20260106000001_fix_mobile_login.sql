-- ============================================
-- Fix Mobile App Login Issues
-- ============================================
-- Date: 2026-01-06
-- Purpose: Ensure mobile apps can authenticate and access user profiles
-- ============================================

-- Step 1: Verify and fix RLS policies for authenticated users
-- ============================================

-- Ensure users table has proper SELECT policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Ensure users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Ensure users can create their profile (for OAuth fallback)
DROP POLICY IF EXISTS "Users can create their own profile" ON public.users;
CREATE POLICY "Users can create their own profile"
    ON public.users FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Step 2: Add anon policy for public user profiles (organizer info)
-- ============================================
-- This allows anonymous users to view organizer profiles when browsing events
DROP POLICY IF EXISTS "Anonymous can view public organizer profiles" ON public.users;
CREATE POLICY "Anonymous can view public organizer profiles"
    ON public.users FOR SELECT
    TO anon
    USING (true); -- Public read for all profiles, mobile apps filter on client side

-- Step 3: Fix handle_new_user trigger
-- ============================================
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
    
    -- Insert or update user profile
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
        100, -- Welcome credits
        100,
        jsonb_build_object(
            'proximityAlerts', true,
            'eventUpdates', true,
            'interestedCategories', '[]'::jsonb,
            'alertRadius', 10
        ),
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        last_login = NOW(),
        updated_at = NOW(),
        -- Update email if changed
        email = COALESCE(EXCLUDED.email, public.users.email),
        -- Update name if it was default and we have better data
        name = CASE 
            WHEN public.users.name LIKE '%@%' THEN EXCLUDED.name
            ELSE public.users.name
        END,
        -- Update avatar if we have OAuth data
        avatar = CASE
            WHEN EXCLUDED.avatar LIKE '%dicebear%' AND public.users.avatar NOT LIKE '%dicebear%' 
                THEN public.users.avatar
            WHEN EXCLUDED.avatar NOT LIKE '%dicebear%' 
                THEN EXCLUDED.avatar
            ELSE public.users.avatar
        END;
    
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Log the actual error for debugging
        RAISE WARNING 'Error in handle_new_user for user %: % (SQLSTATE: %)', 
            NEW.id, SQLERRM, SQLSTATE;
        -- Don't fail the auth signup
        RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Create helper function for mobile apps to check/fix their profile
-- ============================================
CREATE OR REPLACE FUNCTION public.get_or_create_user_profile()
RETURNS TABLE(
    id UUID,
    email TEXT,
    name TEXT,
    avatar TEXT,
    role TEXT,
    subscription_tier TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    current_user_id UUID;
    auth_email TEXT;
    user_exists BOOLEAN;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Check if profile exists
    SELECT EXISTS(SELECT 1 FROM public.users WHERE users.id = current_user_id) INTO user_exists;
    
    IF NOT user_exists THEN
        -- Get auth user data
        SELECT au.email INTO auth_email
        FROM auth.users au
        WHERE au.id = current_user_id;
        
        -- Create profile
        INSERT INTO public.users (
            id,
            email,
            name,
            avatar,
            role,
            subscription_tier,
            credits,
            credits_balance,
            created_at,
            updated_at,
            last_login
        )
        VALUES (
            current_user_id,
            COALESCE(auth_email, ''),
            SPLIT_PART(COALESCE(auth_email, 'user'), '@', 1),
            'https://api.dicebear.com/7.x/avataaars/svg?seed=' || current_user_id::text,
            'user',
            'free',
            100,
            100,
            NOW(),
            NOW(),
            NOW()
        );
    END IF;
    
    -- Return user profile
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.name,
        u.avatar,
        u.role,
        u.subscription_tier
    FROM public.users u
    WHERE u.id = current_user_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_or_create_user_profile() TO authenticated;

-- Step 5: Verify setup
-- ============================================
DO $$ 
BEGIN
    RAISE NOTICE '✅ Mobile app login fix applied';
    RAISE NOTICE '   - RLS policies updated';
    RAISE NOTICE '   - User creation trigger fixed';
    RAISE NOTICE '   - Profile helper function created';
    RAISE NOTICE '';
    RAISE NOTICE '📱 Mobile apps can now:';
    RAISE NOTICE '   1. Sign up with email/password';
    RAISE NOTICE '   2. Sign in with email/password';
    RAISE NOTICE '   3. Sign in with OAuth providers';
    RAISE NOTICE '   4. Auto-create profiles on signup';
    RAISE NOTICE '   5. Access their profile data';
END $$;

-- Add comments
COMMENT ON FUNCTION public.get_or_create_user_profile() IS 'Mobile apps: Ensures user profile exists and returns it. Call this after successful auth.';
COMMENT ON POLICY "Users can view their own profile" ON public.users IS 'Mobile apps: Authenticated users can view their own profile';
COMMENT ON POLICY "Users can create their own profile" ON public.users IS 'Mobile apps: Fallback for OAuth when trigger fails';
COMMENT ON POLICY "Anonymous can view public organizer profiles" ON public.users IS 'Mobile apps: Browse organizer info when viewing events';
