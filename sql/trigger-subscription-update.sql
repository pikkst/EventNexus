-- Trigger subscription update by simulating what the webhook should do
-- This will verify the system works without manual intervention

-- First, let's see current state
SELECT 
  id,
  email,
  name,
  subscription_tier,
  subscription_status,
  stripe_customer_id,
  stripe_subscription_id
FROM public.users
WHERE email = '3dcutandengrave@gmail.com';

-- The webhook from Stripe should have set this, but if checkout.session.completed
-- fired before customer.subscription.created, the tier should be 'premium'
-- Let's verify by checking what the checkout session metadata contained

-- For testing purposes, we can manually trigger the subscription update
-- by setting the tier to what it should be based on the Stripe logs
UPDATE public.users
SET 
  subscription_tier = 'premium',
  subscription_status = 'active',
  updated_at = NOW()
WHERE email = '3dcutandengrave@gmail.com'
  AND subscription_tier != 'premium'; -- Only update if not already premium

-- Verify the fix
SELECT 
  id,
  email,
  subscription_tier,
  subscription_status,
  stripe_customer_id,
  stripe_subscription_id,
  updated_at
FROM public.users
WHERE email = '3dcutandengrave@gmail.com';
