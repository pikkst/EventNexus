-- QUICK FIX: Update user subscription to premium
-- Copy and paste this into Supabase SQL Editor:
-- https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/sql/new

UPDATE public.users
SET 
  subscription_tier = 'premium',
  subscription_status = 'active',
  updated_at = NOW()
WHERE email = '3dcutandengrave@gmail.com';

-- Verify:
SELECT id, email, subscription_tier, subscription_status, updated_at
FROM public.users
WHERE email = '3dcutandengrave@gmail.com';
