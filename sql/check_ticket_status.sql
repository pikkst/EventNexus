-- Check current status of the ticket
SELECT 
  id,
  ticket_name,
  price_paid,
  status,
  payment_status,
  purchased_at,
  qr_code IS NOT NULL as has_qr,
  user_id,
  event_id
FROM tickets
WHERE id = '9dfe9357-ad28-4ae3-85e3-10a929a6f238';

-- Check if it was already updated
SELECT 
  id,
  ticket_name,
  status,
  payment_status,
  purchased_at
FROM tickets
WHERE event_id IN (SELECT id FROM events WHERE name = 'Demo Party')
ORDER BY purchased_at DESC;
