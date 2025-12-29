-- Create TEST PAYOUT manually to verify Stripe transfer
-- This simulates what process-scheduled-payouts would do

-- First, get event and organizer details
SELECT 
  e.id as event_id,
  e.name as event_name,
  e.organizer_id,
  u.name as organizer_name,
  u.stripe_connect_account_id,
  COUNT(t.id) as ticket_count,
  SUM(t.price_paid) as gross_amount,
  -- Platform fee (5% for free tier)
  SUM(t.price_paid) * 0.05 as platform_fee,
  -- Stripe fee (2.9% + €0.25 per tx)
  SUM(t.price_paid * 0.029) + (COUNT(t.id) * 0.25) as stripe_fee,
  -- Net amount
  SUM(t.price_paid) - (SUM(t.price_paid) * 0.05) - (SUM(t.price_paid * 0.029) + (COUNT(t.id) * 0.25)) as net_amount
FROM events e
JOIN users u ON e.organizer_id = u.id
LEFT JOIN tickets t ON t.event_id = e.id 
  AND t.payment_status = 'paid'
  AND t.status IN ('valid', 'used')
WHERE e.name = 'Demo Party'
GROUP BY e.id, e.name, e.organizer_id, u.name, u.stripe_connect_account_id;

-- WARNING: This will create actual Stripe transfer if you have Stripe Connect account set up!
-- Uncomment below ONLY if you want to test real payout:

/*
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
  stripe_transfer_id
)
SELECT 
  e.organizer_id,
  e.id,
  (SUM(t.price_paid) * 100)::BIGINT, -- Convert to cents
  (SUM(t.price_paid) * 0.05 * 100)::BIGINT, -- Platform fee in cents
  ((SUM(t.price_paid) - (SUM(t.price_paid) * 0.05) - (SUM(t.price_paid * 0.029) + (COUNT(t.id) * 0.25))) * 100)::BIGINT, -- Net in cents
  COUNT(t.id),
  'pending', -- Start as pending, will be 'paid' after Stripe transfer
  e.date,
  NOW(),
  NOW(),
  NULL -- Will be filled by Stripe transfer
FROM events e
LEFT JOIN tickets t ON t.event_id = e.id 
  AND t.payment_status = 'paid'
WHERE e.name = 'Demo Party'
GROUP BY e.id, e.organizer_id, e.date
RETURNING *;
*/
