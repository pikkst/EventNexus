-- Verify ticket sync migration results

-- 1. Overall ticket summary
SELECT 
  'Total tickets' as metric,
  COUNT(*) as count
FROM tickets
UNION ALL
SELECT 
  'With template ID' as metric,
  COUNT(*) as count
FROM tickets
WHERE ticket_template_id IS NOT NULL
UNION ALL
SELECT 
  'With price_paid > 0' as metric,
  COUNT(*) as count
FROM tickets
WHERE price_paid > 0
UNION ALL
SELECT 
  'With holder info' as metric,
  COUNT(*) as count
FROM tickets
WHERE holder_name IS NOT NULL AND holder_email IS NOT NULL;

-- 2. Check specific ticket (the VIP ticket mentioned in the issue)
SELECT 
  t.id,
  t.ticket_type,
  t.ticket_name,
  t.price_paid,
  t.holder_name,
  t.holder_email,
  tt.name as template_name,
  tt.type as template_type,
  tt.price as template_price,
  e.name as event_name
FROM tickets t
LEFT JOIN ticket_templates tt ON t.ticket_template_id = tt.id
LEFT JOIN events e ON t.event_id = e.id
WHERE t.price_paid = 25.00
ORDER BY t.purchased_at DESC
LIMIT 5;

-- 3. Check tickets by type distribution
SELECT 
  ticket_type,
  COUNT(*) as count,
  SUM(price_paid) as total_revenue
FROM tickets
GROUP BY ticket_type
ORDER BY count DESC;

-- 4. Check tickets without template match (should be minimal)
SELECT 
  t.id,
  t.ticket_type,
  t.ticket_name,
  t.price_paid,
  e.name as event_name,
  (SELECT COUNT(*) FROM ticket_templates WHERE event_id = t.event_id) as templates_available
FROM tickets t
LEFT JOIN events e ON t.event_id = e.id
WHERE t.ticket_template_id IS NULL
LIMIT 10;
