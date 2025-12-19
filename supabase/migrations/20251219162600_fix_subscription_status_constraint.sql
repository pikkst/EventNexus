-- Migration: Update subscription_status constraint for all Stripe statuses
-- Date: 2025-12-19
-- Purpose: Allow all Stripe subscription statuses including 'incomplete'

BEGIN;

-- Drop the old constraint
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_subscription_status_check;

-- Add new constraint with all Stripe subscription statuses
-- https://stripe.com/docs/api/subscriptions/object#subscription_object-status
ALTER TABLE public.users
ADD CONSTRAINT users_subscription_status_check 
CHECK (subscription_status IN (
  'active',           -- Subscription is active
  'inactive',         -- Custom status (not from Stripe)
  'cancelled',        -- Subscription was cancelled
  'past_due',         -- Payment failed
  'incomplete',       -- First payment not yet succeeded
  'incomplete_expired', -- First payment expired
  'trialing',         -- In trial period
  'unpaid'            -- Payment failed and all retries exhausted
));

COMMIT;
