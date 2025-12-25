-- Quick check: View current Stripe configuration
-- Run this in Supabase SQL Editor to see what keys are stored

SELECT 
  key, 
  value,
  updated_at
FROM public.system_config 
WHERE key LIKE '%stripe%'
ORDER BY key;

-- Also check Supabase secrets (Edge Function environment variables)
-- These won't show values, but you can verify they exist
-- Go to: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/settings/functions

-- Expected secrets for Edge Functions:
-- ✓ STRIPE_SECRET_KEY (for create-checkout and stripe-webhook functions)
-- ✓ STRIPE_WEBHOOK_SECRET (for webhook signature verification)
-- ✓ STRIPE_PRICE_PRO (price_1SgXusJ9WsSrj5gMbJdADsvy)
-- ✓ STRIPE_PRICE_PREMIUM (price_1SgXwZJ9WsSrj5gMehBiDgWp)
-- ✓ STRIPE_PRICE_ENTERPRISE (price_1SgXxRJ9WsSrj5gMLhDEB26O)

-- Expected in system_config table:
-- ✓ stripe_public_key (pk_test_... or pk_live_...)
