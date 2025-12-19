-- ============================================
-- Verify and Fix Admin User
-- ============================================
-- Run in Supabase SQL Editor

-- 1. Check current user status
SELECT 
    id,
    email,
    name,
    role,
    subscription_tier,
    subscription_status,
    stripe_customer_id
FROM public.users 
WHERE email = 'oytreasurecraft@gmail.com';

-- 2. Ensure user is admin
UPDATE public.users 
SET role = 'admin'
WHERE email = 'oytreasurecraft@gmail.com';

-- 3. Verify update
SELECT 
    id,
    email,
    name,
    role,
    subscription_tier
FROM public.users 
WHERE email = 'oytreasurecraft@gmail.com';
