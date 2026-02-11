-- Migration: Create event_ticket_types table for per-event ticket configurations
-- The global ticket_templates table is for visual design templates only.
-- This table stores event-specific ticket types (General, VIP, etc.) with pricing and quantities.

CREATE TABLE IF NOT EXISTS public.event_ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('general', 'vip', 'early_bird', 'day_pass', 'multi_day', 'backstage', 'student', 'group')),
  price NUMERIC NOT NULL DEFAULT 0,
  quantity_total INTEGER NOT NULL DEFAULT 100,
  quantity_available INTEGER NOT NULL DEFAULT 100,
  quantity_sold INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  sale_start TIMESTAMPTZ,
  sale_end TIMESTAMPTZ,
  valid_days INTEGER[],
  includes TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_ticket_types_event ON event_ticket_types(event_id);
CREATE INDEX IF NOT EXISTS idx_event_ticket_types_active ON event_ticket_types(is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE public.event_ticket_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can read active ticket types (for event pages)
CREATE POLICY "Anyone can view active ticket types" ON public.event_ticket_types
  FOR SELECT USING (is_active = TRUE);

-- Event organizers can manage their ticket types
CREATE POLICY "Organizers can manage ticket types" ON public.event_ticket_types
  FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid())
  );

-- Service role has full access (for Edge Functions)
CREATE POLICY "Service role full access to ticket types" ON public.event_ticket_types
  FOR ALL USING (auth.role() = 'service_role');

-- Function to update available quantities when tickets are sold
CREATE OR REPLACE FUNCTION update_event_ticket_type_quantities()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.ticket_template_id IS NOT NULL THEN
      UPDATE event_ticket_types 
      SET 
        quantity_sold = quantity_sold + 1,
        quantity_available = GREATEST(quantity_available - 1, 0),
        updated_at = NOW()
      WHERE id = NEW.ticket_template_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'valid' AND NEW.status = 'refunded' AND NEW.ticket_template_id IS NOT NULL THEN
      UPDATE event_ticket_types 
      SET 
        quantity_sold = GREATEST(quantity_sold - 1, 0),
        quantity_available = quantity_available + 1,
        updated_at = NOW()
      WHERE id = NEW.ticket_template_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on tickets table (if ticket_template_id references event_ticket_types)
-- Note: Only apply if the tickets table references this new table
DROP TRIGGER IF EXISTS trigger_update_event_ticket_quantities ON tickets;
CREATE TRIGGER trigger_update_event_ticket_quantities
  AFTER INSERT OR UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_event_ticket_type_quantities();
