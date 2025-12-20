-- FIX ID MISMATCH - Create correct profile for auth user
-- Run this in Supabase SQL Editor

-- Step 1: Backup old profile data (if it has valuable information)
SELECT 
    'Old profile backup' as info,
    id as old_id,
    name,
    email,
    role,
    subscription_tier,
    credits,
    followed_organizers,
    branding,
    agency_profile
FROM public.users
WHERE email = '3dcutandengrave@gmail.com';

-- Step 2: Delete old profile (it has wrong ID anyway)
-- The old profile will be backed up above if you need the data
DELETE FROM public.users
WHERE email = '3dcutandengrave@gmail.com'
AND id != '35d306a3-badc-4472-96e9-c3d105c28a4b';

-- Step 3: Create NEW profile with CORRECT auth ID
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
    'attendee',  -- Correct role
    'free',      -- Start with free tier
    'active',    -- Active subscription
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
)
ON CONFLICT (id) DO UPDATE
SET 
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    subscription_tier = EXCLUDED.subscription_tier,
    subscription_status = EXCLUDED.subscription_status,
    status = EXCLUDED.status;

-- Step 4: Verify the fix
SELECT 
    'NEW PROFILE CHECK' as info,
    u.id as profile_id,
    au.id as auth_id,
    CASE 
        WHEN u.id = au.id THEN '✅ IDs MATCH NOW!'
        ELSE '❌ Still broken'
    END as status,
    u.name,
    u.email,
    u.role,
    u.subscription_tier,
    u.subscription_status,
    u.status
FROM auth.users au
JOIN public.users u ON u.id = au.id
WHERE au.email = '3dcutandengrave@gmail.com';

-- Step 5: Confirm old profile was deleted
SELECT 
    'Old profile deleted' as info,
    COUNT(*) as deleted_count
FROM public.users
WHERE email LIKE '3dcutandengrave%'
AND id != '35d306a3-badc-4472-96e9-c3d105c28a4b';
