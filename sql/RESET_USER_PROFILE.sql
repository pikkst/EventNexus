-- RESET USER PROFILE - Delete and recreate
-- Run this in Supabase SQL Editor

-- Step 1: Delete existing profile
DELETE FROM public.users
WHERE email = '3dcutandengrave@gmail.com';

-- Step 2: Recreate with correct data
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
WHERE au.email = '3dcutandengrave@gmail.com';

-- Verify
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    u.subscription_tier,
    u.subscription_status,
    u.status,
    'Profile recreated successfully!' as result
FROM public.users u
WHERE u.email = '3dcutandengrave@gmail.com';
