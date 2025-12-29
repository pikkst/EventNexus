-- Debug missing ticket in My Tickets
-- Kasutaja ostis Demo Ticket 1 (€10), aga ei ilmu My Tickets lehel

-- 1. CHECK ALL TICKETS FOR THIS EVENT
SELECT 
  t.id,
  t.user_id,
  t.event_id,
  t.ticket_name,
  t.ticket_type,
  t.price_paid,
  t.status,
  t.payment_status,
  t.purchased_at,
  t.qr_code,
  t.holder_name,
  t.holder_email,
  u.name as user_name,
  u.email as user_email,
  e.name as event_name
FROM tickets t
LEFT JOIN users u ON t.user_id = u.id
LEFT JOIN events e ON t.event_id = e.id
WHERE e.name = 'Demo Party'
ORDER BY t.purchased_at DESC;

-- 2. CHECK IF USER_ID MATCHES
SELECT 
  t.id as ticket_id,
  t.user_id as ticket_user_id,
  t.holder_email,
  u.id as profile_user_id,
  u.email as profile_email,
  CASE 
    WHEN t.user_id = u.id THEN '✓ MATCH'
    ELSE '✗ MISMATCH'
  END as match_status
FROM tickets t
LEFT JOIN users u ON t.holder_email = u.email
WHERE t.event_id IN (SELECT id FROM events WHERE name = 'Demo Party')
ORDER BY t.purchased_at DESC;

-- 3. CHECK PAYMENT STATUS
SELECT 
  ticket_name,
  status,
  payment_status,
  stripe_payment_id,
  stripe_session_id,
  purchased_at,
  CASE 
    WHEN status = 'valid' AND payment_status = 'paid' THEN '✓ Should show in My Tickets'
    ELSE '✗ Will not show'
  END as visibility
FROM tickets
WHERE event_id IN (SELECT id FROM events WHERE name = 'Demo Party')
ORDER BY purchased_at DESC;

-- 4. CHECK RLS POLICY ACCESS
-- Run this as the user to see what they can see
-- Replace 'USER_ID_HERE' with actual user ID
/*
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "USER_ID_HERE"}';

SELECT 
  id,
  ticket_name,
  status,
  payment_status
FROM tickets
WHERE event_id IN (SELECT id FROM events WHERE name = 'Demo Party');

RESET ROLE;
*/

-- 5. CHECK STRIPE WEBHOOK PROCESSING
SELECT 
  t.id,
  t.ticket_name,
  t.stripe_session_id,
  t.stripe_payment_id,
  t.payment_status,
  t.status,
  t.qr_code,
  CASE 
    WHEN t.stripe_payment_id IS NULL THEN '✗ No payment ID'
    WHEN t.qr_code IS NULL THEN '✗ No QR code'
    WHEN t.payment_status != 'paid' THEN '✗ Not paid'
    WHEN t.status != 'valid' THEN '✗ Not valid'
    ELSE '✓ All fields OK'
  END as completeness
FROM tickets t
WHERE t.event_id IN (SELECT id FROM events WHERE name = 'Demo Party')
ORDER BY t.purchased_at DESC;

-- 6. EXPECTED REVENUE CHECK
SELECT 
  e.name as event_name,
  COUNT(t.id) as total_tickets,
  COUNT(CASE WHEN t.payment_status = 'paid' THEN 1 END) as paid_tickets,
  COALESCE(SUM(CASE WHEN t.payment_status = 'paid' THEN t.price_paid END), 0) as total_revenue,
  STRING_AGG(DISTINCT t.ticket_name, ', ') as ticket_types
FROM events e
LEFT JOIN tickets t ON t.event_id = e.id
WHERE e.name = 'Demo Party'
GROUP BY e.id, e.name;
