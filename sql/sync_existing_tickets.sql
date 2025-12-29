-- Sync existing tickets with correct template info and price_paid
-- This updates tickets that were created before the template tracking fix

-- First, add price_paid if it doesn't exist (safe operation)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'price_paid'
  ) THEN
    ALTER TABLE tickets ADD COLUMN price_paid NUMERIC;
  END IF;
END $$;

-- Update price_paid from price column where price_paid is null
UPDATE tickets
SET price_paid = COALESCE(price_paid, price, 0)
WHERE price_paid IS NULL OR price_paid = 0;

-- Update ticket_name where it's missing
UPDATE tickets t
SET ticket_name = COALESCE(
  (SELECT name FROM ticket_templates WHERE id = t.ticket_template_id LIMIT 1),
  'Standard Ticket'
)
WHERE ticket_name IS NULL OR ticket_name = '';

-- Update holder_name from user's name where missing
UPDATE tickets t
SET holder_name = COALESCE(
  holder_name,
  (SELECT name FROM users WHERE id = t.user_id LIMIT 1),
  'Guest'
)
WHERE holder_name IS NULL OR holder_name = '';

-- Update holder_email from user's email where missing
UPDATE tickets t
SET holder_email = COALESCE(
  holder_email,
  (SELECT email FROM users WHERE id = t.user_id LIMIT 1),
  'guest@eventnexus.eu'
)
WHERE holder_email IS NULL OR holder_email = '';

-- Try to match tickets to templates based on event_id and price
-- Only update if ticket_template_id is NULL
UPDATE tickets t
SET 
  ticket_template_id = tt.id,
  ticket_type = tt.type,
  ticket_name = tt.name
FROM ticket_templates tt
WHERE t.ticket_template_id IS NULL
  AND t.event_id = tt.event_id
  AND t.price_paid = tt.price
  AND tt.is_active = true
  LIMIT 1;

-- For tickets that still don't have a template, try to find closest match by price
UPDATE tickets t
SET 
  ticket_template_id = subquery.template_id,
  ticket_type = subquery.template_type,
  ticket_name = subquery.template_name
FROM (
  SELECT DISTINCT ON (t2.id)
    t2.id as ticket_id,
    tt2.id as template_id,
    tt2.type as template_type,
    tt2.name as template_name
  FROM tickets t2
  JOIN ticket_templates tt2 ON t2.event_id = tt2.event_id
  WHERE t2.ticket_template_id IS NULL
    AND tt2.is_active = true
  ORDER BY t2.id, ABS(t2.price_paid - tt2.price) ASC
) subquery
WHERE t.id = subquery.ticket_id;

-- For remaining tickets without template, use fallback values
UPDATE tickets
SET 
  ticket_type = COALESCE(ticket_type, 'general'),
  ticket_name = COALESCE(ticket_name, 'Standard Ticket')
WHERE ticket_template_id IS NULL;

-- Show summary of updated tickets
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
  'With price_paid' as metric,
  COUNT(*) as count
FROM tickets
WHERE price_paid > 0
UNION ALL
SELECT 
  'With holder info' as metric,
  COUNT(*) as count
FROM tickets
WHERE holder_name IS NOT NULL AND holder_email IS NOT NULL;
