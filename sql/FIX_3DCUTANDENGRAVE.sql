-- Fix 3dcutandengrave@gmail.com profile - remove old and create new
-- Run this in Supabase SQL Editor

-- Step 1: Check current situation
SELECT 
    'Current situation' as info,
    au.id as auth_id,
    u.id as profile_id,
    u.email,
    CASE 
        WHEN au.id = u.id THEN '✅ IDs match'
        ELSE '❌ IDs DO NOT MATCH - will fix'
    END as status
FROM auth.users au
LEFT JOIN public.users u ON u.email = au.email
WHERE au.email = '3dcutandengrave@gmail.com';

-- Step 2: Delete ALL profiles with this email (even wrong ID ones)
DELETE FROM public.users 
WHERE email = '3dcutandengrave@gmail.com';

-- Step 3: Create profile with CORRECT auth ID
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
    '3dcutandengrave',
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

-- Step 4: Verify fix
SELECT 
    '✅ FIXED!' as status,
    au.id as auth_id,
    u.id as profile_id,
    u.email,
    u.name,
    u.role,
    CASE 
        WHEN au.id = u.id THEN '✅ IDs NOW MATCH - Can login!'
        ELSE '❌ Still broken'
    END as result
FROM auth.users au
JOIN public.users u ON u.id = au.id
WHERE au.email = '3dcutandengrave@gmail.com';
