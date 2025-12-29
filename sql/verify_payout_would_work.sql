-- Verify payout would work in production
-- Shows exactly what would happen

SELECT 
  '✓ PAYOUT READY' as status,
  e.name as event,
  e.date as event_date,
  NOW() - e.date::timestamp as days_since,
  u.name as organizer,
  u.stripe_connect_account_id,
  -- Revenue calculation
  COUNT(t.id) as tickets_sold,
  SUM(t.price_paid) as gross_revenue,
  SUM(t.price_paid * 0.05) as platform_fee_5pct,
  SUM(t.price_paid * 0.029 + 0.25) as stripe_fees,
  SUM(
    t.price_paid - 
    (t.price_paid * 0.05) - 
    (t.price_paid * 0.029 + 0.25)
  ) as net_to_organizer,
  -- What would be transferred
  CONCAT('€', ROUND(CAST(SUM(
    t.price_paid - 
    (t.price_paid * 0.05) - 
    (t.price_paid * 0.029 + 0.25)
  ) AS numeric), 2)) as stripe_transfer_amount
FROM events e
JOIN users u ON e.organizer_id = u.id
JOIN tickets t ON t.event_id = e.id
WHERE e.name = 'Demo Party'
  AND t.payment_status = 'paid'
  AND e.date < NOW() - INTERVAL '2 days'
  AND e.payout_processed = false
  AND u.stripe_connect_onboarding_complete = true
GROUP BY e.id, e.name, e.date, u.id, u.name, u.stripe_connect_account_id;

-- Show platform balance requirement
SELECT 
  '💰 PLATFORM BALANCE' as info,
  CONCAT('Need: €', ROUND(CAST(SUM(
    t.price_paid - 
    (t.price_paid * 0.05) - 
    (t.price_paid * 0.029 + 0.25)
  ) AS numeric), 2)) as need,
  'Available in production after real sales' as note
FROM tickets t
WHERE t.event_id IN (SELECT id FROM events WHERE name = 'Demo Party')
  AND t.payment_status = 'paid';
