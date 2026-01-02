-- EMERGENCY FIX: Manually update pending tickets to paid for Demo Party
-- Use this if webhook didn't fire or test payment was completed

-- Check first
SELECT 
  id,
  ticket_name,
  price_paid,
  payment_status,
  stripe_session_id
FROM tickets
WHERE event_id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'
  AND payment_status = 'pending';

-- If tickets shown above are from completed test payments, update them:
-- Uncomment the following lines to execute:

/*
UPDATE tickets
SET 
  payment_status = 'paid',
  stripe_payment_id = COALESCE(stripe_payment_id, 'manual_update_' || id::text)
WHERE event_id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'
  AND payment_status = 'pending'
  AND purchased_at < NOW() - INTERVAL '5 minutes'; -- Only update tickets older than 5 minutes

-- Verify the update
SELECT 
  id,
  ticket_name,
  price_paid,
  payment_status,
  stripe_payment_id
FROM tickets
WHERE event_id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'
ORDER BY purchased_at DESC;

-- Check event attendee count was updated by trigger
SELECT 
  id,
  name,
  attendees_count
FROM events
WHERE id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e';
*/
