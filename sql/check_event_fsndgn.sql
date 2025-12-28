-- ============================================
-- Check Specific Event: fsndgn (ID: 193fc997-8322-4fdc-bee3-c49c612dc752)
-- Should have: 100x €10 Normal + 25 or 10x €25 VIP
-- ============================================

-- 1. Check event details
SELECT 
  id,
  name,
  price,
  date,
  status,
  organizer_id
FROM events
WHERE id = '193fc997-8322-4fdc-bee3-c49c612dc752';

-- 2. Count tickets by type for this event
SELECT 
  ticket_type,
  COUNT(*) as ticket_count,
  COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_count,
  SUM(CASE WHEN payment_status = 'paid' THEN price ELSE 0 END) as revenue,
  MIN(price) as min_price,
  MAX(price) as max_price
FROM tickets
WHERE event_id = '193fc997-8322-4fdc-bee3-c49c612dc752'
GROUP BY ticket_type;

-- 3. Show all tickets for this event
SELECT 
  id,
  ticket_type,
  price,
  status,
  payment_status,
  user_id,
  qr_code
FROM tickets
WHERE event_id = '193fc997-8322-4fdc-bee3-c49c612dc752'
ORDER BY ticket_type, price DESC;

-- 4. Check if Stripe Connect is set up for organizer
SELECT 
  id,
  name,
  email,
  stripe_connect_account_id,
  stripe_connect_onboarding_complete,
  stripe_connect_charges_enabled
FROM users
WHERE id = 'aa5983cc-3889-43dc-a6dc-4eeb3db9805e';
