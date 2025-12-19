-- ============================================
-- Manually Update Subscription After Payment
-- ============================================
-- Use this if webhook wasn't configured when you paid
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/sql

-- First, check current subscription status
SELECT 
  email, 
  subscription_tier, 
  subscription_status,
  stripe_customer_id
FROM public.users 
WHERE email = 'oytreasurecraft@gmail.com';

-- Update to Pro tier
UPDATE public.users 
SET 
  subscription_tier = 'pro',
  subscription_status = 'active'
WHERE email = 'oytreasurecraft@gmail.com';

-- Or update to Premium tier (uncomment if needed)
-- UPDATE public.users 
-- SET 
--   subscription_tier = 'premium',
--   subscription_status = 'active'
-- WHERE email = 'oytreasurecraft@gmail.com';

-- Or update to Enterprise tier (uncomment if needed)
-- UPDATE public.users 
-- SET 
--   subscription_tier = 'enterprise',
--   subscription_status = 'active'
-- WHERE email = 'oytreasurecraft@gmail.com';

-- Verify the update
SELECT 
  email, 
  subscription_tier, 
  subscription_status,
  stripe_customer_id
FROM public.users 
WHERE email = 'oytreasurecraft@gmail.com';
