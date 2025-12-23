-- Check and update Stripe public key in system_config
-- Run this in Supabase SQL Editor after applying migration 20251223000002

-- 1. Check current value
SELECT 
  key, 
  value,
  updated_at,
  pg_typeof(value) as value_type
FROM public.system_config 
WHERE key = 'stripe_public_key';

-- 2. Check RLS policies on system_config
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'system_config'
ORDER BY policyname;

-- 3. Update with your actual Stripe test public key
-- Replace pk_test_YOUR_ACTUAL_KEY with your real key from Stripe Dashboard
UPDATE public.system_config 
SET 
  value = '"pk_test_YOUR_ACTUAL_KEY"'::jsonb,
  updated_at = NOW()
WHERE key = 'stripe_public_key';

-- 4. Verify the update
SELECT 
  key, 
  value,
  updated_at
FROM public.system_config 
WHERE key = 'stripe_public_key';

-- 5. Test access as authenticated user (simulate frontend query)
-- This should return the key without 406 error
SELECT value 
FROM public.system_config 
WHERE key = 'stripe_public_key';

-- ✅ Expected result: Should return the Stripe public key
-- ❌ If you get an error, the RLS policy migration didn't apply correctly
