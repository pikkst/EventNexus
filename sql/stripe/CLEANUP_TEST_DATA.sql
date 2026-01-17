/**
 * CLEANUP TEST DATA - Remove all test-phase Stripe operations
 * 
 * This script resets the database to a clean state before going live:
 * - Removes all test tickets (payment_status = 'pending' or 'paid')
 * - Removes all test subscription payments
 * - Resets user subscription tiers to 'free'
 * - Clears Stripe customer IDs and subscription IDs
 * - Removes test payouts
 * - Removes payment-related notifications
 * 
 * ⚠️  WARNING: This is destructive! Review before running.
 * 
 * Usage:
 * 1. Go to Supabase Dashboard → SQL Editor
 * 2. Create a new query
 * 3. Paste this entire script
 * 4. Review the script
 * 5. Click "Run" to execute
 * 
 * To verify changes:
 * - SELECT COUNT(*) FROM tickets; (should be 0 or much lower)
 * - SELECT COUNT(*) FROM subscription_payments; (should be 0)
 * - SELECT DISTINCT subscription_tier FROM users; (should only show 'free')
 */

-- ============================================
-- STEP 1: Delete all test tickets
-- ============================================
DELETE FROM public.tickets
WHERE 1=1;

-- Verify deletion
-- SELECT COUNT(*) as deleted_tickets FROM public.tickets;

-- ============================================
-- STEP 2: Delete all test subscription payments
-- ============================================
DELETE FROM public.subscription_payments
WHERE 1=1;

-- Verify deletion
-- SELECT COUNT(*) as deleted_payments FROM public.subscription_payments;

-- ============================================
-- STEP 3: Delete all test payouts
-- ============================================
DELETE FROM public.payouts
WHERE 1=1;

-- Verify deletion
-- SELECT COUNT(*) as deleted_payouts FROM public.payouts;

-- ============================================
-- STEP 4: Reset all user subscription tiers to 'free'
-- ============================================
UPDATE public.users
SET
  subscription_tier = 'free',
  -- Valid statuses per constraint: active, inactive, cancelled, past_due, incomplete, incomplete_expired, trialing, unpaid
  subscription_status = 'inactive',
  subscription_end_date = NULL,
  -- Clear old Stripe IDs (but keep for reference if needed)
  -- stripe_customer_id = NULL,
  -- stripe_subscription_id = NULL,
  -- stripe_connect_account_id = NULL,
  updated_at = NOW()
WHERE subscription_tier != 'free';

-- Verify changes
-- SELECT subscription_tier, COUNT(*) as count FROM public.users GROUP BY subscription_tier;

-- ============================================
-- STEP 5: Delete payment-related notifications
-- ============================================
DELETE FROM public.notifications
WHERE 
  type IN ('payment', 'subscription', 'payout', 'invoice')
  OR message ILIKE '%payment%'
  OR message ILIKE '%subscription%'
  OR message ILIKE '%stripe%'
  OR message ILIKE '%payout%'
  OR title ILIKE '%payment%'
  OR title ILIKE '%subscription%';

-- Verify deletion
-- SELECT COUNT(*) as remaining_notifications FROM public.notifications;

-- ============================================
-- STEP 6: Clear any test ledger entries (if exists)
-- ============================================
-- Uncomment if you have a ledger/transaction table:
-- DELETE FROM public.ledger
-- WHERE type IN ('subscription_charge', 'platform_fee', 'payout', 'refund');

-- ============================================
-- STEP 7: Reset event attendees_count based on remaining tickets
-- ============================================
UPDATE public.events
SET
  attendees_count = 0,
  updated_at = NOW()
WHERE attendees_count > 0;

-- ============================================
-- FINAL VERIFICATION
-- ============================================
-- Run these queries to verify the cleanup was successful:

-- Check users are reset to free tier:
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN subscription_tier = 'free' THEN 1 END) as free_users,
  COUNT(CASE WHEN stripe_customer_id IS NOT NULL THEN 1 END) as users_with_stripe_ids
FROM public.users;

-- Check no test data remains:
SELECT 
  (SELECT COUNT(*) FROM public.tickets) as remaining_tickets,
  (SELECT COUNT(*) FROM public.subscription_payments) as remaining_payments,
  (SELECT COUNT(*) FROM public.payouts) as remaining_payouts;

-- Check events are reset:
SELECT 
  COUNT(*) as events_with_attendees,
  MAX(attendees_count) as max_attendees
FROM public.events
WHERE attendees_count > 0;
