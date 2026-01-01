-- Check all Demo Party tickets status
SELECT 
  id,
  ticket_name,
  price_paid,
  payment_status,
  stripe_session_id,
  purchased_at,
  status
FROM tickets
WHERE event_id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'
ORDER BY purchased_at DESC;

-- Summary by payment status
SELECT 
  payment_status,
  COUNT(*) as count,
  SUM(price_paid) as revenue
FROM tickets
WHERE event_id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'
GROUP BY payment_status;
