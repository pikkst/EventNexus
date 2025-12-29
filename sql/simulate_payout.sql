-- SIMULATE successful payout without Stripe transfer
-- This demonstrates that "Paid Out" calculation works correctly

-- Calculate exact amounts for Demo Party
WITH payout_calc AS (
  SELECT 
    e.id as event_id,
    e.organizer_id as user_id,
    e.date as event_date,
    COUNT(t.id) as ticket_count,
    SUM(t.price_paid) as gross_eur,
    SUM(t.price_paid) * 0.05 as platform_fee_eur,
    SUM(t.price_paid * 0.029) + (COUNT(t.id) * 0.25) as stripe_fee_eur,
    SUM(t.price_paid) - (SUM(t.price_paid) * 0.05) - (SUM(t.price_paid * 0.029) + (COUNT(t.id) * 0.25)) as net_eur
  FROM events e
  LEFT JOIN tickets t ON t.event_id = e.id 
    AND t.payment_status = 'paid'
    AND t.status IN ('valid', 'used')
  WHERE e.name = 'Demo Party'
  GROUP BY e.id, e.organizer_id, e.date
)
-- Insert simulated payout
INSERT INTO payouts (
  user_id,
  event_id,
  gross_amount,
  platform_fee,
  net_amount,
  ticket_count,
  status,
  event_date,
  payout_eligible_date,
  processed_at,
  stripe_transfer_id,
  error_message
)
SELECT 
  user_id,
  event_id,
  (gross_eur * 100)::BIGINT, -- Convert to cents
  (platform_fee_eur * 100)::BIGINT,
  (net_eur * 100)::BIGINT,
  ticket_count,
  'paid', -- Mark as paid (simulated)
  event_date,
  NOW(),
  NOW(),
  'sim_' || gen_random_uuid()::text, -- Simulated transfer ID
  'Test mode simulation - no actual Stripe transfer'
FROM payout_calc
RETURNING 
  id,
  event_id,
  gross_amount / 100.0 as gross_eur,
  platform_fee / 100.0 as platform_fee_eur,
  net_amount / 100.0 as net_eur,
  status;

-- Verify payout was created
SELECT 
  p.id,
  e.name as event_name,
  p.gross_amount / 100.0 as gross_eur,
  p.platform_fee / 100.0 as platform_fee_eur,
  p.net_amount / 100.0 as net_eur,
  p.status,
  p.stripe_transfer_id,
  p.processed_at
FROM payouts p
JOIN events e ON p.event_id = e.id
WHERE e.name = 'Demo Party'
ORDER BY p.created_at DESC
LIMIT 1;

-- Check revenue summary now shows paid out amount
-- Run in frontend or via RPC:
-- SELECT * FROM get_organizer_revenue_summary('7a2b5426-32bd-40ba-922b-30a5381981cb');
