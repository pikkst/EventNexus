-- Check current user subscription status in database
-- Run this in Supabase SQL Editor to see what's actually stored

SELECT 
  id,
  email,
  name,
  subscription_tier,
  subscription_status,
  subscription_end_date,
  stripe_customer_id,
  stripe_subscription_id,
  created_at,
  updated_at
FROM public.users
WHERE email = '3dcutandengrave@gmail.com'
  OR id = 'a9b3789d-5ce9-47c3-8342-8200ac72fdcd';
