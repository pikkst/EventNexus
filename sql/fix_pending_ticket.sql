-- FIX PENDING TICKET
-- Manually update ticket to paid status since webhook didn't process
-- Payment Intent: pi_3SjkzrJ9WsSrj5gM18uNkjb3 (€10.00, succeeded)

-- 1. Update ticket to paid status (WITHOUT stripe_payment_id - column doesn't exist yet)
UPDATE tickets
SET 
  payment_status = 'paid',
  status = 'valid',
  purchased_at = COALESCE(purchased_at, NOW())
WHERE id = '9dfe9357-ad28-4ae3-85e3-10a929a6f238'
  AND payment_status = 'pending';

-- 2. Verify update
SELECT 
  id,
  ticket_name,
  price_paid,
  status,
  payment_status,
  stripe_session_id,
  qr_code IS NOT NULL as has_qr,
  purchased_at
FROM tickets
WHERE id = '9dfe9357-ad28-4ae3-85e3-10a929a6f238';

-- 3. Update event attendees_count
UPDATE events
SET attendees_count = (
  SELECT COUNT(*) 
  FROM tickets 
  WHERE event_id = events.id 
    AND payment_status = 'paid'
)
WHERE name = 'Demo Party';

-- 4. Verify event stats
SELECT 
  e.name,
  e.attendees_count,
  COUNT(t.id) as actual_paid_tickets,
  COALESCE(SUM(t.price_paid), 0) as total_revenue
FROM events e
LEFT JOIN tickets t ON t.event_id = e.id AND t.payment_status = 'paid'
WHERE e.name = 'Demo Party'
GROUP BY e.id, e.name, e.attendees_count;

-- 5. Create notification for user (optional)
INSERT INTO notifications (user_id, type, title, message, sender_name, "isRead")
VALUES (
  '7a2b5426-32bd-40ba-922b-30a5381981cb',
  'event_update',
  'Tickets Ready!',
  '✓ Payment confirmed! Your ticket for Demo Party is ready with QR code. View it in your profile.',
  'EventNexus',
  false
);
