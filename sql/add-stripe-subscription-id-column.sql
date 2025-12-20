-- Add missing stripe_subscription_id column to users table
-- This column is needed for webhook to track Stripe subscription IDs

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id 
ON public.users(stripe_subscription_id);

-- Verify column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public' 
  AND column_name = 'stripe_subscription_id';
