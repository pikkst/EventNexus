-- Auto-create public.users profile when auth.users is created
-- This prevents UUID errors when users try to create blog posts

-- Function to auto-create public user profile
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    'user',
    'free',
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id),
    '{
      "proximityAlerts": true,
      "eventUpdates": true,
      "interestedCategories": [],
      "alertRadius": 10
    }'::jsonb,
    NEW.created_at,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- Also sync existing auth users who don't have public profiles
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
  COALESCE(au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'full_name', 'User'),
  au.email,
  'user',
  'free',
  COALESCE(au.raw_user_meta_data->>'avatar_url', au.raw_user_meta_data->>'picture', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || au.id),
  '{
    "proximityAlerts": true,
    "eventUpdates": true,
    "interestedCategories": [],
    "alertRadius": 10
  }'::jsonb,
  au.created_at,
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;
