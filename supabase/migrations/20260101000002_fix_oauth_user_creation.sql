-- ============================================
-- Fix OAuth User Creation and RLS Policies
-- ============================================
-- This migration fixes issues with OAuth users not being able to
-- access their profiles after signing up via Google/Facebook.
-- ============================================

-- Add INSERT policy for authenticated users to create their own profile
-- This allows OAuth users to create their profile if the trigger fails
CREATE POLICY "Users can create their own profile" ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Improve the handle_new_user trigger to better handle OAuth data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    user_name TEXT;
    user_avatar TEXT;
BEGIN
    -- Extract name from OAuth metadata or email
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        SPLIT_PART(NEW.email, '@', 1)
    );
    
    -- Extract avatar from OAuth metadata or generate one
    user_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        NEW.raw_user_meta_data->>'avatar',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id::text
    );
    
    -- Insert new user into public.users table
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
        NEW.email,
        user_name,
        user_avatar,
        'user',
        'free',
        100, -- Default welcome credits
        100, -- Initial balance
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
        -- If user already exists, just update last_login
        last_login = NOW(),
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Log error but don't fail the auth signup
        RAISE WARNING 'Error creating user profile for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Recreate the trigger to ensure it's active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Add a helper function to check if a user profile exists and create if missing
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id UUID)
RETURNS public.users
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    user_record public.users;
    auth_record record;
BEGIN
    -- Check if user profile exists
    SELECT * INTO user_record FROM public.users WHERE id = user_id;
    
    IF user_record IS NULL THEN
        -- User profile doesn't exist, fetch from auth.users and create
        SELECT * INTO auth_record FROM auth.users WHERE id = user_id;
        
        IF auth_record IS NOT NULL THEN
            -- Create the missing profile
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
                auth_record.id,
                auth_record.email,
                COALESCE(
                    auth_record.raw_user_meta_data->>'full_name',
                    auth_record.raw_user_meta_data->>'name',
                    SPLIT_PART(auth_record.email, '@', 1)
                ),
                COALESCE(
                    auth_record.raw_user_meta_data->>'avatar_url',
                    auth_record.raw_user_meta_data->>'picture',
                    auth_record.raw_user_meta_data->>'avatar',
                    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || auth_record.id::text
                ),
                'user',
                'free',
                100,
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
            RETURNING * INTO user_record;
        END IF;
    END IF;
    
    RETURN user_record;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.ensure_user_profile IS 
'Ensures a user profile exists in public.users for the given auth user. Creates one if missing. Used as fallback for OAuth users.';
