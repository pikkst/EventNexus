-- Update all events to show minimum ticket price
-- This ensures map markers show correct "FROM €X" pricing

-- 1. Check current event prices vs ticket prices
SELECT 
  'PRICE MISMATCH CHECK' as check_type,
  e.id,
  e.name,
  e.price as current_event_price,
  COALESCE(MIN(tt.price), 0) as min_ticket_price,
  COALESCE(MAX(tt.price), 0) as max_ticket_price,
  CASE 
    WHEN e.price != COALESCE(MIN(tt.price), 0) THEN '⚠ NEEDS UPDATE'
    ELSE '✓ Correct'
  END as status
FROM events e
LEFT JOIN ticket_templates tt ON tt.event_id = e.id AND tt.is_active = true
WHERE e.status = 'active'
  AND e.archived_at IS NULL
GROUP BY e.id, e.name, e.price
ORDER BY e.created_at DESC;

-- 2. Update Demo Party event specifically
UPDATE events e
SET price = (
  SELECT COALESCE(MIN(price), 0)
  FROM ticket_templates
  WHERE event_id = e.id
    AND is_active = true
)
WHERE e.id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e';

-- 3. Update ALL events to have correct minimum price
-- This is a one-time fix for all existing events
UPDATE events e
SET price = (
  SELECT COALESCE(MIN(tt.price), 0)
  FROM ticket_templates tt
  WHERE tt.event_id = e.id
    AND tt.is_active = true
)
WHERE e.status = 'active'
  AND e.archived_at IS NULL
  AND EXISTS (
    SELECT 1 FROM ticket_templates
    WHERE event_id = e.id AND is_active = true
  );

-- 4. Verify the fix
SELECT 
  'AFTER UPDATE' as check_type,
  e.id,
  e.name,
  e.price as event_price,
  COALESCE(MIN(tt.price), 0) as min_ticket_price,
  COALESCE(MAX(tt.price), 0) as max_ticket_price
FROM events e
LEFT JOIN ticket_templates tt ON tt.event_id = e.id AND tt.is_active = true
WHERE e.id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'
GROUP BY e.id, e.name, e.price;
