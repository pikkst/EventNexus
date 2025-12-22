-- ============================================
-- Free Tier Credit System Migration
-- Date: 2025-12-22
-- Purpose: Ensure credit system visibility and proper Free tier configuration
-- ============================================

-- STEP 1: Ensure credits_balance column exists
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS credits_balance INTEGER DEFAULT 100;

-- STEP 2: Sync credits column with credits_balance (use whichever is higher)
UPDATE public.users 
SET credits_balance = GREATEST(COALESCE(credits, 0), COALESCE(credits_balance, 0))
WHERE credits_balance IS NULL OR credits_balance < credits;

-- STEP 3: Give 100 welcome credits to existing Free tier users with 0 balance
UPDATE public.users 
SET credits_balance = 100 
WHERE subscription_tier = 'free' 
  AND (credits_balance IS NULL OR credits_balance = 0)
  AND created_at >= NOW() - INTERVAL '30 days'; -- Only recent signups

-- STEP 4: Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_credits_balance 
ON public.users(credits_balance) 
WHERE subscription_tier = 'free';

-- STEP 5: Add comment for documentation
COMMENT ON COLUMN public.users.credits_balance IS 
'Credit balance for feature unlocks. 1 credit = €0.50 value. Free tier users get 100 welcome credits.';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check Free tier users with credit balances
-- SELECT id, name, email, subscription_tier, credits_balance, created_at
-- FROM public.users
-- WHERE subscription_tier = 'free'
-- ORDER BY created_at DESC
-- LIMIT 20;

-- Check credit distribution
-- SELECT 
--   subscription_tier,
--   COUNT(*) as user_count,
--   AVG(credits_balance) as avg_credits,
--   MIN(credits_balance) as min_credits,
--   MAX(credits_balance) as max_credits
-- FROM public.users
-- GROUP BY subscription_tier;

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- ALTER TABLE public.users DROP COLUMN IF EXISTS credits_balance;
-- DROP INDEX IF EXISTS idx_users_credits_balance;
