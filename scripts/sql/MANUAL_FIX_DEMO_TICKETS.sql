-- Manual ticket confirmation for Demo Party
-- Run this if redirect verification didn't work

-- First, check current status
SELECT 
  id,
  ticket_name,
  price_paid,
  payment_status,
  stripe_session_id,
  purchased_at
FROM tickets
WHERE event_id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'
ORDER BY purchased_at DESC;

-- If tickets are stuck in 'pending' and payment was completed in Stripe,
-- manually update them:

UPDATE tickets
SET 
  payment_status = 'paid',
  stripe_payment_id = COALESCE(stripe_payment_id, 'manual_confirm_' || id::text),
  qr_code = 'ENX-' || id::text || '-' || SUBSTRING(MD5(id::text || 'secret'), 1, 12)
WHERE event_id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'
  AND payment_status = 'pending';

-- Verify update
SELECT 
  id,
  ticket_name,
  price_paid,
  payment_status,
  stripe_payment_id,
  qr_code
FROM tickets
WHERE event_id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'
ORDER BY purchased_at DESC;

-- Check event attendee count (should be updated by trigger)
SELECT 
  id,
  name,
  attendees_count
FROM events
WHERE id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e';
