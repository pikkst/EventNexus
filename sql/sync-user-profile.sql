-- Sync user profile from auth.users to public.users
-- Run this in Supabase SQL Editor to fix blog post creation errors

-- Ensure user profile exists in public.users table for authenticated user
INSERT INTO public.users (
  id,
  name,
  email,
  role,
  subscription_tier,
  avatar,
  notification_prefs,
  created_at,
  updated_at
) 
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'full_name', 'User')::text,
  au.email::text,
  'user'::text,
  'free'::text,
  COALESCE(au.raw_user_meta_data->>'avatar_url', au.raw_user_meta_data->>'picture', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || au.id)::text,
  '{
    "proximityAlerts": true,
    "eventUpdates": true,
    "interestedCategories": [],
    "alertRadius": 10
  }'::jsonb,
  au.created_at,
  NOW()
FROM auth.users au
WHERE au.id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807'  -- Replace with your user ID
AND NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO UPDATE SET
  name = COALESCE(EXCLUDED.name, public.users.name),
  avatar = COALESCE(EXCLUDED.avatar, public.users.avatar),
  updated_at = NOW();

-- Verify the user was created/updated
SELECT id, name, email, role, subscription_tier, avatar 
FROM public.users 
WHERE id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807';
