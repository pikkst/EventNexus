-- Test RLS policy for user tickets
-- Run as authenticated user to see what they can access

-- 1. Check RLS policies on tickets table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'tickets';

-- 2. Test direct query as service role (bypassing RLS)
SELECT 
  id,
  ticket_name,
  price_paid,
  status,
  payment_status,
  user_id,
  event_id,
  purchased_at
FROM tickets
WHERE user_id = '7a2b5426-32bd-40ba-922b-30a5381981cb'
ORDER BY purchased_at DESC;

-- 3. Check if both tickets are visible
SELECT 
  t.id,
  t.ticket_name,
  t.price_paid,
  t.status,
  t.payment_status,
  e.name as event_name,
  t.purchased_at
FROM tickets t
LEFT JOIN events e ON t.event_id = e.id
WHERE t.user_id = '7a2b5426-32bd-40ba-922b-30a5381981cb'
ORDER BY t.purchased_at DESC;

-- 4. Verify event exists and is accessible
SELECT 
  id,
  name,
  date,
  status,
  attendees_count
FROM events
WHERE name = 'Demo Party';
