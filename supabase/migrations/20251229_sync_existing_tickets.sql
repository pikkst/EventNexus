-- Migration: Sync existing tickets with correct template info and price_paid
-- Description: Updates tickets created before template tracking fix
-- Date: 2025-12-29

-- Ensure price_paid column exists (should already exist from enhanced_ticketing)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'tickets' 
      AND column_name = 'price_paid'
  ) THEN
    ALTER TABLE tickets ADD COLUMN price_paid NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Ensure holder_name column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'tickets' 
      AND column_name = 'holder_name'
  ) THEN
    ALTER TABLE tickets ADD COLUMN holder_name TEXT;
  END IF;
END $$;

-- Ensure holder_email column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'tickets' 
      AND column_name = 'holder_email'
  ) THEN
    ALTER TABLE tickets ADD COLUMN holder_email TEXT;
  END IF;
END $$;

-- Ensure ticket_name column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'tickets' 
      AND column_name = 'ticket_name'
  ) THEN
    ALTER TABLE tickets ADD COLUMN ticket_name TEXT;
  END IF;
END $$;

-- Step 1: Update price_paid from price column where price_paid is null or 0
-- (some old tickets may have 'price' column)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'tickets' 
      AND column_name = 'price'
  ) THEN
    UPDATE tickets
    SET price_paid = COALESCE(price, 0)
    WHERE price_paid IS NULL OR price_paid = 0;
  END IF;
END $$;

-- Step 2: Update ticket_name from template where missing
UPDATE tickets t
SET ticket_name = tt.name
FROM ticket_templates tt
WHERE t.ticket_template_id = tt.id
  AND (t.ticket_name IS NULL OR t.ticket_name = '');

-- Step 3: Update holder_name from user's name where missing
UPDATE tickets t
SET holder_name = u.name
FROM users u
WHERE t.user_id = u.id
  AND (t.holder_name IS NULL OR t.holder_name = '');

-- Step 4: Update holder_email from user's email where missing
UPDATE tickets t
SET holder_email = COALESCE(u.email, 'guest@eventnexus.eu')
FROM users u
WHERE t.user_id = u.id
  AND (t.holder_email IS NULL OR t.holder_email = '');

-- Step 5: Try to match tickets to templates based on event_id and price_paid
-- This is for tickets that don't have ticket_template_id set
UPDATE tickets t
SET 
  ticket_template_id = tt.id,
  ticket_type = tt.type,
  ticket_name = tt.name
FROM (
  SELECT DISTINCT ON (t2.id)
    t2.id as ticket_id,
    tt2.id,
    tt2.type,
    tt2.name,
    tt2.price
  FROM tickets t2
  JOIN ticket_templates tt2 ON t2.event_id = tt2.event_id
  WHERE t2.ticket_template_id IS NULL
    AND tt2.is_active = true
    AND t2.price_paid IS NOT NULL
  ORDER BY t2.id, ABS(t2.price_paid - tt2.price) ASC
) tt
WHERE t.id = tt.ticket_id;

-- Step 6: Set fallback values for tickets still without template info
UPDATE tickets
SET 
  ticket_type = 'general',
  ticket_name = 'Standard Ticket'
WHERE ticket_type IS NULL OR ticket_type = '';

-- Set fallback for missing holder info
UPDATE tickets
SET holder_name = 'Guest'
WHERE holder_name IS NULL OR holder_name = '';

UPDATE tickets
SET holder_email = 'guest@eventnexus.eu'
WHERE holder_email IS NULL OR holder_email = '';

-- Create index on price_paid if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_tickets_price_paid ON tickets(price_paid);

-- Log summary
DO $$
DECLARE
  total_tickets INTEGER;
  with_template INTEGER;
  with_price INTEGER;
  with_holder INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_tickets FROM tickets;
  SELECT COUNT(*) INTO with_template FROM tickets WHERE ticket_template_id IS NOT NULL;
  SELECT COUNT(*) INTO with_price FROM tickets WHERE price_paid > 0;
  SELECT COUNT(*) INTO with_holder FROM tickets WHERE holder_name IS NOT NULL AND holder_email IS NOT NULL;
  
  RAISE NOTICE 'Ticket sync summary:';
  RAISE NOTICE '  Total tickets: %', total_tickets;
  RAISE NOTICE '  With template ID: %', with_template;
  RAISE NOTICE '  With price_paid > 0: %', with_price;
  RAISE NOTICE '  With holder info: %', with_holder;
END $$;
