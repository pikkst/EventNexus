-- DIRECT FIX FOR 3dcutandengrave@gmail.com
-- Run this in Supabase SQL Editor

-- First, let's see what we have
SELECT 
    'Auth user exists' as check_type,
    au.id,
    au.email,
    au.confirmed_at
FROM auth.users au
WHERE au.email = '3dcutandengrave@gmail.com';

-- Now create the profile directly
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
WHERE au.email = '3dcutandengrave@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = au.id
);

-- Verify the profile was created
SELECT 
    'Profile created successfully' as status,
    u.id,
    u.name,
    u.email,
    u.role,
    u.subscription_tier,
    u.subscription_status,
    u.created_at
FROM public.users u
WHERE u.email = '3dcutandengrave@gmail.com';
