-- Confirm admin user email and ensure proper setup
-- Run this in Supabase SQL Editor

-- First, check if user exists
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'admin@eventnexus.com';

-- Confirm the email if not already confirmed
UPDATE auth.users 
SET email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email = 'admin@eventnexus.com' 
AND email_confirmed_at IS NULL;

-- Ensure user profile exists in public.users table
INSERT INTO public.users (
  id,
  name,
  email,
  role,
  subscription,
  avatar,
  followed_organizers,
  notification_prefs,
  created_at,
  updated_at
) 
SELECT 
  au.id,
  'Admin User'::text,
  'admin@eventnexus.com'::text,
  'admin'::text,
  'premium'::text,
  'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'::text,
  '[]'::jsonb,
  '{
    "pushEnabled": true,
    "emailEnabled": true,
    "proximityAlerts": true,
    "alertRadius": 25,
    "interestedCategories": ["Conference", "Workshop", "Party", "Concert", "Sports", "Cultural", "Business", "Community"]
  }'::jsonb,
  NOW(),
  NOW()
FROM auth.users au
WHERE au.email = 'admin@eventnexus.com'
AND NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
);

-- Verify the setup
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  pu.name,
  pu.role,
  pu.subscription
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'admin@eventnexus.com';