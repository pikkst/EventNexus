-- Fix handle_new_user trigger to use correct column names
-- Run this in Supabase SQL Editor

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
        notification_prefs
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
        )
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- User already exists, skip
        RETURN NEW;
    WHEN others THEN
        -- Log the error and continue
        RAISE WARNING 'Error creating user profile: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify trigger is still attached
SELECT 
    t.tgname as trigger_name,
    t.tgenabled as enabled,
    c.relname as table_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE t.tgname = 'on_auth_user_created';
