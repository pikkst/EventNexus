-- ============================================
-- Quick Diagnostic for Specific User
-- User ID from logs: 7a2b5426-32bd-40ba-922b-30a5381981cb
-- ============================================

-- Check this specific user's Stripe Connect status
SELECT 
  id,
  name,
  email,
  subscription_tier,
  stripe_connect_account_id,
  stripe_connect_onboarding_complete,
  stripe_connect_charges_enabled,
  stripe_connect_payouts_enabled,
  created_at
FROM users
WHERE id = '7a2b5426-32bd-40ba-922b-30a5381981cb';

-- Check if user has any events
SELECT 
  id,
  name,
  price,
  date,
  status,
  organizer_id
FROM events
WHERE organizer_id = '7a2b5426-32bd-40ba-922b-30a5381981cb';

-- Check if tickets table has the new columns
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tickets'
  AND column_name IN ('payment_status', 'price')
ORDER BY ordinal_position;
