-- Debug: Why is Demo Party not eligible for payout?

-- Check event date and eligibility
SELECT 
  e.id,
  e.name,
  e.date,
  e.end_date,
  NOW() as current_time,
  e.date::timestamp as event_date,
  NOW() - e.date::timestamp as time_since_event,
  NOW() - INTERVAL '2 days' as cutoff_date,
  CASE 
    WHEN e.date::timestamp < NOW() - INTERVAL '2 days' THEN '✓ Event is 2+ days old'
    ELSE '✗ Event is too recent (need 2+ days)'
  END as date_eligibility,
  e.payout_processed,
  CASE 
    WHEN e.payout_processed = true THEN '✗ Already paid out'
    ELSE '✓ Not yet paid'
  END as payout_eligibility
FROM events e
WHERE e.name = 'Demo Party';

-- Check organizer Stripe Connect status
SELECT 
  u.id,
  u.name,
  u.email,
  u.stripe_connect_account_id,
  u.stripe_connect_onboarding_complete,
  u.stripe_connect_payouts_enabled,
  CASE 
    WHEN u.stripe_connect_account_id IS NULL THEN '✗ No Stripe account'
    WHEN u.stripe_connect_onboarding_complete = false THEN '✗ Onboarding incomplete'
    WHEN u.stripe_connect_payouts_enabled = false THEN '✗ Payouts not enabled'
    ELSE '✓ Ready for payouts'
  END as stripe_status
FROM users u
WHERE u.email = 'llmatic.oy@gmail.com';

-- Check if tickets exist
SELECT 
  COUNT(*) as total_tickets,
  COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_tickets,
  SUM(CASE WHEN payment_status = 'paid' THEN price_paid ELSE 0 END) as total_revenue
FROM tickets t
WHERE t.event_id IN (SELECT id FROM events WHERE name = 'Demo Party');
