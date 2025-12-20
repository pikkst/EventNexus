-- Fix Premium subscription for user 3dcutandengrave@gmail.com
-- Run this in Supabase SQL Editor

-- Update user subscription to Premium tier
UPDATE public.users
SET 
  subscription_tier = 'premium',
  subscription_status = 'active',
  updated_at = NOW()
WHERE email = '3dcutandengrave@gmail.com'
  OR id = 'a9b3789d-5ce9-47c3-8342-8200ac72fdcd';

-- Verify the update
SELECT 
  id,
  email,
  name,
  subscription_tier,
  subscription_status,
  stripe_customer_id,
  stripe_subscription_id,
  created_at,
  updated_at
FROM public.users
WHERE email = '3dcutandengrave@gmail.com'
  OR id = 'a9b3789d-5ce9-47c3-8342-8200ac72fdcd';
