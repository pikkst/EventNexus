-- Check ticket purchase issue
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
  e.name as event_name,
  e.organizer_id,
  u.email as purchaser_email
FROM tickets t
LEFT JOIN events e ON t.event_id = e.id
LEFT JOIN users u ON t.user_id = u.id
ORDER BY t.purchased_at DESC
LIMIT 10;
