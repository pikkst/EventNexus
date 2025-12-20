-- SIMPLE FIX - Delete wrong profile and create correct one
-- Run this in Supabase SQL Editor

-- Delete the old profile with wrong ID
DELETE FROM public.users
WHERE email = '3dcutandengrave@gmail.com';

-- Create new profile with CORRECT auth ID
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
    '35d306a3-badc-4472-96e9-c3d105c28a4b',  -- CORRECT auth ID
    '3dcutandengrave',
    '3dcutandengrave@gmail.com',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=35d306a3-badc-4472-96e9-c3d105c28a4b',
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

-- Verify success
SELECT 
    '✅ FIXED!' as status,
    u.id as profile_id,
    au.id as auth_id,
    u.name,
    u.email,
    u.role,
    u.subscription_tier
FROM auth.users au
JOIN public.users u ON u.id = au.id
WHERE au.email = '3dcutandengrave@gmail.com';
