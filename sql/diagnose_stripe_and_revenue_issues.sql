-- ============================================
-- Diagnostic Script for Stripe Connect & Revenue Function Issues
-- Date: 2025-12-28
-- Purpose: Identify problems with free tier Stripe access and RPC errors
-- ============================================

-- 1. CHECK FREE TIER USERS WITH PAID EVENTS (should be able to connect Stripe)
SELECT 
  u.id,
  u.name,
  u.email,
  u.subscription_tier,
  u.credits_balance,
  u.stripe_connect_account_id,
  u.stripe_connect_onboarding_complete,
  u.stripe_connect_charges_enabled,
  COUNT(DISTINCT e.id) as paid_events_count,
  COALESCE(SUM(e.price), 0) as total_event_prices
FROM users u
LEFT JOIN events e ON e.organizer_id = u.id AND e.price > 0
WHERE u.subscription_tier = 'free'
  AND e.id IS NOT NULL  -- Has created events
GROUP BY u.id, u.name, u.email, u.subscription_tier, u.credits_balance, 
         u.stripe_connect_account_id, u.stripe_connect_onboarding_complete, 
         u.stripe_connect_charges_enabled
ORDER BY paid_events_count DESC;

-- 2. CHECK ALL ORGANIZERS WITH PAID EVENTS WITHOUT STRIPE CONNECT
SELECT 
  u.id,
  u.name,
  u.email,
  u.subscription_tier,
  u.stripe_connect_account_id IS NOT NULL as has_stripe_account,
  u.stripe_connect_onboarding_complete,
  COUNT(DISTINCT e.id) as paid_events_count,
  COUNT(DISTINCT t.id) as tickets_sold,
  COALESCE(SUM(t.price), 0) as total_revenue
FROM users u
INNER JOIN events e ON e.organizer_id = u.id AND e.price > 0
LEFT JOIN tickets t ON t.event_id = e.id AND t.payment_status = 'paid' AND t.status != 'cancelled'
WHERE u.stripe_connect_account_id IS NULL
   OR u.stripe_connect_onboarding_complete = FALSE
GROUP BY u.id, u.name, u.email, u.subscription_tier, u.stripe_connect_account_id, 
         u.stripe_connect_onboarding_complete
ORDER BY total_revenue DESC;

-- 3. TEST get_organizer_revenue FUNCTION
-- First check if function exists
SELECT 
  p.proname as function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
  p.provolatile as volatility,
  p.prosecdef as security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('get_organizer_revenue', 'get_organizer_revenue_summary')
  AND n.nspname = 'public';

-- 4. CHECK IF REVENUE FUNCTIONS CAN BE EXECUTED
-- Get a sample organizer ID for testing
DO $$
DECLARE
  test_organizer_id UUID;
BEGIN
  -- Get first organizer with events
  SELECT DISTINCT organizer_id INTO test_organizer_id
  FROM events
  WHERE price > 0
  LIMIT 1;
  
  IF test_organizer_id IS NOT NULL THEN
    RAISE NOTICE 'Testing with organizer ID: %', test_organizer_id;
    
    -- Try to call the function
    BEGIN
      PERFORM * FROM get_organizer_revenue(test_organizer_id);
      RAISE NOTICE 'get_organizer_revenue() works!';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'ERROR in get_organizer_revenue(): %', SQLERRM;
    END;
    
    BEGIN
      PERFORM * FROM get_organizer_revenue_summary(test_organizer_id);
      RAISE NOTICE 'get_organizer_revenue_summary() works!';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'ERROR in get_organizer_revenue_summary(): %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'No organizers with paid events found';
  END IF;
END $$;

-- 5. CHECK TICKETS TABLE STRUCTURE (might be missing columns)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tickets'
  AND column_name IN ('status', 'payment_status', 'price', 'event_id')
ORDER BY ordinal_position;

-- 6. CHECK EVENTS TABLE STRUCTURE
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'events'
  AND column_name IN ('organizer_id', 'price', 'date', 'payout_processed')
ORDER BY ordinal_position;

-- 7. CHECK PAYOUTS TABLE STRUCTURE
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'payouts'
ORDER BY ordinal_position;

-- 8. CHECK RLS POLICIES ON FUNCTIONS
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
WHERE tablename IN ('events', 'tickets', 'payouts', 'users')
ORDER BY tablename, policyname;

-- 9. CHECK ACTUAL DATA FOR A SAMPLE ORGANIZER
-- This shows what data exists for revenue calculation
WITH sample_organizer AS (
  SELECT DISTINCT organizer_id
  FROM events
  WHERE price > 0
  LIMIT 1
)
SELECT 
  'Events' as data_type,
  COUNT(*) as count,
  json_agg(json_build_object(
    'id', e.id,
    'name', e.name,
    'price', e.price,
    'date', e.date
  )) as sample_data
FROM events e
WHERE e.organizer_id = (SELECT organizer_id FROM sample_organizer)

UNION ALL

SELECT 
  'Tickets' as data_type,
  COUNT(*) as count,
  json_agg(json_build_object(
    'id', t.id,
    'event_id', t.event_id,
    'price', t.price,
    'status', t.status,
    'payment_status', t.payment_status
  )) as sample_data
FROM tickets t
JOIN events e ON e.id = t.event_id
WHERE e.organizer_id = (SELECT organizer_id FROM sample_organizer)
LIMIT 5;

-- 10. CHECK USERS TABLE FOR SUBSCRIPTION_TIER VALUES
SELECT 
  subscription_tier,
  COUNT(*) as user_count,
  COUNT(CASE WHEN stripe_connect_account_id IS NOT NULL THEN 1 END) as with_stripe,
  COUNT(CASE WHEN stripe_connect_onboarding_complete THEN 1 END) as onboarding_complete
FROM users
GROUP BY subscription_tier
ORDER BY 
  CASE subscription_tier
    WHEN 'enterprise' THEN 1
    WHEN 'premium' THEN 2
    WHEN 'pro' THEN 3
    WHEN 'free' THEN 4
    ELSE 5
  END;

-- ============================================
-- SUMMARY: What to look for in results
-- ============================================
-- 1. Free tier users with paid events → Should be able to connect Stripe
-- 2. Function existence → Should show get_organizer_revenue functions
-- 3. Function execution → Should work without errors
-- 4. Table structure → Check if all required columns exist
-- 5. RLS policies → Might be blocking function execution
-- 6. Sample data → Verify data exists for testing
-- 7. Subscription tiers → See distribution and Stripe status
