-- ============================================
-- Fix User Signup Trigger
-- ============================================
-- This migration creates the missing trigger that automatically
-- creates a user profile in public.users when a new user signs up
-- via auth.users.
-- ============================================

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert new user into public.users table
    INSERT INTO public.users (
        id,
        email,
        name,
        avatar,
        role,
        subscription_tier,
        notification_prefs,
        created_at,
        updated_at,
        last_login
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(
            NEW.raw_user_meta_data->>'avatar',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id::text
        ),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
        'free',
        jsonb_build_object(
            'proximityAlerts', true,
            'eventUpdates', true,
            'interestedCategories', '[]'::jsonb,
            'alertRadius', 10
        ),
        NOW(),
        NOW(),
        NOW()
    );
    
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Log error but don't fail the auth signup
        RAISE WARNING 'Error creating user profile for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
