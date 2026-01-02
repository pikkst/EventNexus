-- Check Demo Party event and its ticket templates

-- 1. Event price field
SELECT 
  'EVENT PRICE FIELD' as check_type,
  id,
  name,
  price as event_price_field,
  max_capacity
FROM events
WHERE id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e';

-- 2. Ticket templates for this event
SELECT 
  'TICKET TEMPLATES' as check_type,
  id,
  event_id,
  name as ticket_name,
  price as ticket_price,
  quantity_available,
  is_active
FROM ticket_templates
WHERE event_id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'
ORDER BY price ASC;

-- 3. Price range calculation
SELECT 
  'PRICE RANGE' as check_type,
  MIN(price) as min_price,
  MAX(price) as max_price,
  CASE 
    WHEN MIN(price) = MAX(price) THEN '€' || MIN(price)::text
    WHEN MIN(price) = 0 AND MAX(price) > 0 THEN 'FREE - €' || MAX(price)::text
    WHEN MIN(price) > 0 THEN '€' || MIN(price)::text || ' - €' || MAX(price)::text
    ELSE 'FREE'
  END as price_display
FROM ticket_templates
WHERE event_id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'
  AND is_active = true;

-- 4. Recommended fix: Update event price to minimum ticket price
-- UNCOMMENT TO FIX:
/*
UPDATE events e
SET price = (
  SELECT COALESCE(MIN(price), 0)
  FROM ticket_templates
  WHERE event_id = e.id
    AND is_active = true
)
WHERE e.id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e';
*/
