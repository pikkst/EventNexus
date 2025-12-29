-- STEP 1: Temporarily move event to past for payout testing
-- Demo Party: 30 Dec 2025 → 26 Dec 2025 (3 days ago, eligible for payout)

UPDATE events
SET 
  date = '2025-12-26',
  end_date = '2025-12-26'
WHERE name = 'Demo Party';

-- Verify change
SELECT 
  id,
  name,
  date,
  end_date,
  NOW() - date::timestamp as days_since_event
FROM events
WHERE name = 'Demo Party';

-- Check if event is now eligible for payout (2+ days old)
SELECT 
  e.id,
  e.name,
  e.date,
  e.organizer_id,
  u.stripe_connect_account_id,
  u.stripe_connect_onboarding_complete,
  COUNT(t.id) as paid_tickets,
  SUM(t.price_paid) as gross_eur,
  CASE 
    WHEN e.date::timestamp < NOW() - INTERVAL '2 days' THEN '✓ ELIGIBLE for payout'
    ELSE '✗ Not eligible (event too recent)'
  END as eligibility
FROM events e
JOIN users u ON e.organizer_id = u.id
LEFT JOIN tickets t ON t.event_id = e.id 
  AND t.payment_status = 'paid'
WHERE e.name = 'Demo Party'
GROUP BY e.id, e.name, e.date, e.organizer_id, u.stripe_connect_account_id, u.stripe_connect_onboarding_complete;

-- NOTE: After testing, restore date with:
-- UPDATE events SET date = '2025-12-30', end_date = '2025-12-30' WHERE name = 'Demo Party';
