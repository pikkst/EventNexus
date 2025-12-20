-- URGENT FIX - Create profile for new user NOW
-- Run this in Supabase SQL Editor

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
    '13f2acc6-a3d0-4e03-830f-abf202db246c',
    '3dcutandengrave',
    '3dcutandengrave@gmail.com',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=13f2acc6-a3d0-4e03-830f-abf202db246c',
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

-- Verify
SELECT id, name, email, role FROM public.users 
WHERE email = '3dcutandengrave@gmail.com';
