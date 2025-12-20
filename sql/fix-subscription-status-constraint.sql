-- Update subscription_status constraint to include all Stripe statuses
-- Current: active, inactive, cancelled, past_due
-- Add: incomplete, incomplete_expired, trialing, unpaid

BEGIN;

-- Drop the old constraint
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_subscription_status_check;

-- Add new constraint with all Stripe subscription statuses
ALTER TABLE public.users
ADD CONSTRAINT users_subscription_status_check 
CHECK (subscription_status IN (
  'active',
  'inactive', 
  'cancelled',
  'past_due',
  'incomplete',
  'incomplete_expired',
  'trialing',
  'unpaid'
));

COMMIT;

-- Verify
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass 
  AND conname = 'users_subscription_status_check';
