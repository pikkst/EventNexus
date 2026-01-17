-- Reset all test mode Stripe Connect accounts
-- Run this in Supabase SQL Editor to clear test mode connect account IDs
-- Users can then reconnect in live mode

-- Clear all test mode connect account IDs (those starting with acct_1Skt or other test patterns)
UPDATE users
SET 
  stripe_connect_account_id = NULL,
  stripe_connect_onboarding_complete = false,
  stripe_connect_details_submitted = false,
  stripe_connect_charges_enabled = false,
  stripe_connect_payouts_enabled = false
WHERE stripe_connect_account_id IS NOT NULL;

-- Verify results
SELECT 
  id,
  email,
  stripe_connect_account_id,
  stripe_connect_onboarding_complete
FROM users
WHERE stripe_connect_account_id IS NOT NULL;

-- Should return 0 rows after cleanup
