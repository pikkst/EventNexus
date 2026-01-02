-- Check recently created ticket templates
SELECT 
  tt.id,
  tt.event_id,
  e.name as event_name,
  tt.name as ticket_name,
  tt.type,
  tt.price,
  tt.quantity_total,
  tt.quantity_sold,
  tt.created_at
FROM ticket_templates tt
JOIN events e ON e.id = tt.event_id
ORDER BY tt.created_at DESC
LIMIT 10;
