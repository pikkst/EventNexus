-- Create missing user profile for 3dcutandengrave@gmail.com
-- Run this in Supabase SQL Editor

-- First, find the user ID
DO $$
DECLARE
    user_uuid uuid;
    user_email text := '3dcutandengrave@gmail.com';
BEGIN
    -- Get the user ID from auth.users
    SELECT id INTO user_uuid
    FROM auth.users
    WHERE email = user_email;

    IF user_uuid IS NULL THEN
        RAISE NOTICE 'User not found in auth.users with email: %', user_email;
    ELSE
        RAISE NOTICE 'Found user ID: %', user_uuid;
        
        -- Check if profile already exists
        IF EXISTS (SELECT 1 FROM public.users WHERE id = user_uuid) THEN
            RAISE NOTICE 'Profile already exists for user %', user_uuid;
        ELSE
            -- Create the profile
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
                user_uuid,
                SPLIT_PART(user_email, '@', 1),
                user_email,
                'https://api.dicebear.com/7.x/avataaars/svg?seed=' || user_uuid::text,
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
            
            RAISE NOTICE 'Profile created successfully for user %', user_uuid;
        END IF;
    END IF;
END $$;

-- Verify the user profile was created
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    u.subscription_tier,
    u.subscription_status,
    u.created_at,
    au.confirmed_at
FROM public.users u
JOIN auth.users au ON au.id = u.id
WHERE u.email = '3dcutandengrave@gmail.com';
