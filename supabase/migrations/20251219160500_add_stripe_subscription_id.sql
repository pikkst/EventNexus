-- Migration: Add stripe_subscription_id column
-- Date: 2025-12-19
-- Purpose: Store Stripe subscription ID for webhook handling

BEGIN;

-- Add the missing column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id 
ON public.users(stripe_subscription_id);

-- Add comment
COMMENT ON COLUMN public.users.stripe_subscription_id IS 'Stripe subscription ID for recurring payments';

COMMIT;
