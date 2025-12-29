-- Verify ticket data for Demo Ticket 1
SELECT 
  id,
  ticket_name,
  ticket_type,
  price_paid,
  status,
  payment_status,
  ticket_template_id,
  purchased_at
FROM tickets
WHERE ticket_name = 'Demo Ticket 1'
ORDER BY purchased_at DESC
LIMIT 1;

-- Check if template exists
SELECT 
  t.ticket_name,
  t.ticket_type,
  t.price_paid,
  tt.name as template_name,
  tt.type as template_type,
  tt.price as template_price
FROM tickets t
LEFT JOIN ticket_templates tt ON t.ticket_template_id = tt.id
WHERE t.ticket_name = 'Demo Ticket 1';
