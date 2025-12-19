-- Setup Admin User for EventNexus
-- Run this in Supabase SQL Editor

-- First, check if your user exists in auth.users
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'huntersest@gmail.com';

-- If email_confirmed_at is NULL, confirm it:
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'huntersest@gmail.com' 
AND email_confirmed_at IS NULL;

-- Check if user profile exists in public.users
SELECT id, email, role, subscription_tier 
FROM public.users 
WHERE email = 'huntersest@gmail.com';

-- If profile doesn't exist, create it:
INSERT INTO public.users (
    id, 
    name, 
    email, 
    role, 
    subscription_tier, 
    credits, 
    avatar,
    notification_prefs
)
SELECT 
    id,
    'Admin User',
    email,
    'admin',
    'enterprise',
    1000,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || id,
    jsonb_build_object(
        'interestedCategories', '[]'::jsonb,
        'alertRadius', 10,
        'proximityAlerts', true,
        'eventUpdates', true,
        'ticketReminders', true
    )
FROM auth.users 
WHERE email = 'huntersest@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- If profile exists but not admin, update it:
UPDATE public.users 
SET 
    role = 'admin',
    subscription_tier = 'enterprise',
    credits = 1000
WHERE email = 'huntersest@gmail.com';

-- Verify setup:
SELECT 
    u.id,
    u.email,
    u.role,
    u.subscription_tier,
    u.credits,
    au.email_confirmed_at
FROM public.users u
JOIN auth.users au ON au.id = u.id
WHERE u.email = 'huntersest@gmail.com';
