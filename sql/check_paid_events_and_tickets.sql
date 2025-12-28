-- ============================================
-- Check Event with Multiple Ticket Types
-- Looking for event with 100x €10 tickets + VIP tickets
-- ============================================

-- 1. Check all paid events (price > 0)
SELECT 
  e.id,
  e.name,
  e.price as base_price,
  e.organizer_id,
  u.name as organizer_name,
  u.email as organizer_email,
  e.created_at
FROM events e
JOIN users u ON e.organizer_id = u.id
WHERE e.price > 0
ORDER BY e.created_at DESC
LIMIT 10;

-- 2. Check if tickets table has ticket_type or tier column
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tickets'
  AND column_name LIKE '%type%' OR column_name LIKE '%tier%'
ORDER BY ordinal_position;

-- 3. Check all tickets for paid events
SELECT 
  t.id,
  t.event_id,
  e.name as event_name,
  t.price,
  t.status,
  t.payment_status,
  t.ticket_type,
  t.user_id
FROM tickets t
JOIN events e ON t.event_id = e.id
WHERE e.price > 0
ORDER BY e.created_at DESC
LIMIT 20;

-- 4. Count tickets by event and ticket type
SELECT 
  e.id,
  e.name,
  e.price as event_price,
  t.ticket_type,
  COUNT(t.id) as total_tickets,
  COUNT(CASE WHEN t.payment_status = 'paid' THEN 1 END) as paid_tickets,
  SUM(CASE WHEN t.payment_status = 'paid' THEN t.price ELSE 0 END) as total_revenue
FROM events e
LEFT JOIN tickets t ON t.event_id = e.id
WHERE e.price > 0
GROUP BY e.id, e.name, e.price, t.ticket_type
ORDER BY e.created_at DESC;

-- 5. Check specific user's paid events
SELECT 
  e.id,
  e.name,
  e.price,
  e.date,
  e.status
FROM events e
WHERE e.organizer_id IN (
  '7a2b5426-32bd-40ba-922b-30a5381981cb',  -- llmatic.oy
  'aa5983cc-3889-43dc-a6dc-4eeb3db9805e'   -- plog.pieesti
)
AND e.price > 0
ORDER BY e.created_at DESC;
