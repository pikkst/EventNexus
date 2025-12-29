-- Manual payout simulation for testing
-- This creates payout record without actual Stripe transfer (test mode workaround)

BEGIN;

-- Calculate the payout amounts
WITH payout_calc AS (
  SELECT 
    e.id as event_id,
    e.organizer_id,
    u.stripe_connect_account_id,
    COUNT(t.id) as ticket_count,
    SUM(t.price_paid) as gross_amount,
    SUM(t.price_paid * 0.05) as platform_fee,
    SUM(t.price_paid * 0.029 + 0.25) as stripe_fee,
    SUM(
      t.price_paid - 
      (t.price_paid * 0.05) - 
      (t.price_paid * 0.029 + 0.25)
    ) as net_amount
  FROM events e
  JOIN users u ON e.organizer_id = u.id
  JOIN tickets t ON t.event_id = e.id
  WHERE e.name = 'Demo Party'
    AND t.payment_status = 'paid'
    AND e.date < NOW() - INTERVAL '2 days'
    AND e.payout_processed = false
  GROUP BY e.id, e.organizer_id, u.stripe_connect_account_id
)
INSERT INTO payouts (
  id,
  event_id,
  organizer_id,
  gross_amount,
  platform_fee,
  net_amount,
  stripe_transfer_id,
  status,
  created_at,
  processed_at
)
SELECT 
  gen_random_uuid(),
  event_id,
  organizer_id,
  CAST(gross_amount * 100 AS BIGINT), -- Convert to cents
  CAST(platform_fee * 100 AS BIGINT),
  CAST(net_amount * 100 AS BIGINT),
  'test_manual_transfer_' || substr(md5(random()::text), 1, 16), -- Fake transfer ID
  'paid', -- Mark as paid for testing
  NOW(),
  NOW()
FROM payout_calc
RETURNING 
  id,
  event_id,
  CONCAT('€', ROUND(CAST(gross_amount AS numeric) / 100, 2)) as gross,
  CONCAT('€', ROUND(CAST(platform_fee AS numeric) / 100, 2)) as fee,
  CONCAT('€', ROUND(CAST(net_amount AS numeric) / 100, 2)) as net,
  stripe_transfer_id,
  status;

-- Mark event as paid out
UPDATE events 
SET 
  payout_processed = true,
  updated_at = NOW()
WHERE name = 'Demo Party'
RETURNING 
  id,
  name,
  '✓ Marked as paid out' as status;

COMMIT;

-- Verify the payout
SELECT 
  '📊 PAYOUT CREATED' as result,
  p.id,
  e.name as event,
  u.name as organizer,
  u.email as organizer_email,
  CONCAT('€', ROUND(CAST(p.gross_amount AS numeric) / 100, 2)) as gross,
  CONCAT('€', ROUND(CAST(p.platform_fee AS numeric) / 100, 2)) as platform_fee,
  CONCAT('€', ROUND(CAST(p.net_amount AS numeric) / 100, 2)) as net_paid,
  p.stripe_transfer_id,
  p.status,
  p.processed_at
FROM payouts p
JOIN events e ON p.event_id = e.id
JOIN users u ON p.organizer_id = u.id
WHERE e.name = 'Demo Party'
ORDER BY p.created_at DESC
LIMIT 1;
