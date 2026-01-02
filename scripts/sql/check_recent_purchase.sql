-- Check the most recent ticket purchase
SELECT 
  t.id,
  t.event_id,
  t.user_id,
  t.ticket_name,
  t.price_paid,
  t.payment_status,
  t.stripe_session_id,
  t.stripe_payment_id,
  t.purchased_at,
  t.status,
  e.name as event_name,
  u.email as purchaser_email
FROM tickets t
LEFT JOIN events e ON t.event_id = e.id
LEFT JOIN users u ON t.user_id = u.id
WHERE t.stripe_session_id = 'cs_test_a1uQ496vmrhMoGKMUTt9cpcuUCqHZ8E2lcrRln2gSemCflDkTppu5nOnrn'
   OR t.purchased_at > NOW() - INTERVAL '10 minutes'
ORDER BY t.purchased_at DESC
LIMIT 5;
