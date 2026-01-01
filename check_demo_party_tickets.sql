-- Check current ticket status
SELECT 
  id,
  ticket_name,
  price_paid,
  payment_status,
  stripe_session_id,
  stripe_payment_id,
  purchased_at,
  status
FROM tickets
WHERE event_id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'
ORDER BY purchased_at DESC;

-- Check if revenue functions can see them
SELECT 
  'Total Tickets' as metric,
  COUNT(*) as count,
  COALESCE(SUM(price_paid), 0) as revenue
FROM tickets
WHERE event_id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'
UNION ALL
SELECT 
  'Paid Tickets' as metric,
  COUNT(*) as count,
  COALESCE(SUM(price_paid), 0) as revenue
FROM tickets
WHERE event_id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'
  AND payment_status = 'paid'
UNION ALL
SELECT 
  'Pending Tickets' as metric,
  COUNT(*) as count,
  COALESCE(SUM(price_paid), 0) as revenue
FROM tickets
WHERE event_id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'
  AND payment_status = 'pending';
