-- WORKING FIX - Creates profile for 3dcutandengrave@gmail.com
-- Run this in Supabase SQL Editor

-- Create the profile directly with correct column names
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
    'active',  -- Subscription status
    0,
    '[]'::jsonb,
    jsonb_build_object(
        'pushEnabled', true,
        'emailEnabled', true,
        'proximityAlerts', true,
        'alertRadius', 5,
        'interestedCategories', '[]'::jsonb
    ),
    'active'  -- User account status
FROM auth.users au
WHERE au.email = '3dcutandengrave@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = au.id
)
ON CONFLICT (id) DO UPDATE
SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    avatar = EXCLUDED.avatar;

-- Verify success
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    u.subscription_tier,
    u.subscription_status,
    u.status,
    u.created_at,
    'SUCCESS - Profile created!' as result
FROM public.users u
WHERE u.email = '3dcutandengrave@gmail.com';
