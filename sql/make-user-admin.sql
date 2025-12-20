-- Make huntersest@gmail.com user an administrator
-- User ID: f2ecf6c6-14c1-4dbd-894b-14ee6493d807

-- Ensure user profile exists in public.users table with admin role
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
VALUES (
  'f2ecf6c6-14c1-4dbd-894b-14ee6493d807'::uuid,
  'Admin User'::text,
  'huntersest@gmail.com'::text,
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
)
ON CONFLICT (id) 
DO UPDATE SET
  role = 'admin',
  subscription = 'premium',
  updated_at = NOW();

-- Verify the update
SELECT id, email, role, subscription 
FROM public.users 
WHERE id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807';
