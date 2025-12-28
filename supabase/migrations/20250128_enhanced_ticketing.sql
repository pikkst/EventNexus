-- Migration: Enhanced Ticketing System with Event End Times
-- Description: Adds comprehensive ticketing support with multiple ticket types, 
--              verification system, and event duration tracking

-- Add event end time columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS end_date TEXT,
ADD COLUMN IF NOT EXISTS end_time TEXT,
ADD COLUMN IF NOT EXISTS duration_hours NUMERIC;

-- Create ticket_templates table for different ticket types
CREATE TABLE IF NOT EXISTS ticket_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('general', 'vip', 'early_bird', 'day_pass', 'multi_day', 'backstage', 'student', 'group')),
  price NUMERIC NOT NULL DEFAULT 0,
  quantity_total INTEGER NOT NULL DEFAULT 100,
  quantity_available INTEGER NOT NULL DEFAULT 100,
  quantity_sold INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  sale_start TIMESTAMPTZ,
  sale_end TIMESTAMPTZ,
  valid_days INTEGER[],
  includes TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create enhanced tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_template_id UUID REFERENCES ticket_templates(id) ON DELETE SET NULL,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticket_type TEXT NOT NULL,
  ticket_name TEXT NOT NULL,
  price_paid NUMERIC NOT NULL DEFAULT 0,
  qr_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'cancelled', 'refunded', 'expired')),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id),
  verification_location JSONB,
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT,
  holder_name TEXT NOT NULL,
  holder_email TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create ticket_verifications table for audit trail
CREATE TABLE IF NOT EXISTS ticket_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  verified_by UUID NOT NULL REFERENCES users(id),
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  location JSONB,
  device_info TEXT,
  notes TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ticket_templates_event ON ticket_templates(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_templates_active ON ticket_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_tickets_event ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_qr_code ON tickets(qr_code);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_template ON tickets(ticket_template_id);
CREATE INDEX IF NOT EXISTS idx_verifications_ticket ON ticket_verifications(ticket_id);
CREATE INDEX IF NOT EXISTS idx_verifications_event ON ticket_verifications(event_id);
CREATE INDEX IF NOT EXISTS idx_verifications_verified_by ON ticket_verifications(verified_by);

-- Function to automatically update ticket template quantities
CREATE OR REPLACE FUNCTION update_ticket_template_quantities()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Decrease available quantity when ticket is purchased
    -- Only update if ticket_template_id is not null
    IF NEW.ticket_template_id IS NOT NULL THEN
      UPDATE ticket_templates 
      SET 
        quantity_sold = quantity_sold + 1,
        quantity_available = quantity_available - 1
      WHERE id = NEW.ticket_template_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Increase available quantity when ticket is deleted/refunded
    -- Only update if ticket_template_id is not null
    IF OLD.ticket_template_id IS NOT NULL AND OLD.status != 'refunded' THEN
      UPDATE ticket_templates 
      SET 
        quantity_sold = GREATEST(0, quantity_sold - 1),
        quantity_available = quantity_available + 1
      WHERE id = OLD.ticket_template_id;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Trigger will be created after tickets table exists
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS ticket_template_quantity_trigger ON tickets;

-- Function to calculate event duration
CREATE OR REPLACE FUNCTION calculate_event_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_date IS NOT NULL AND NEW.end_time IS NOT NULL THEN
    -- Calculate duration in hours
    DECLARE
      start_datetime TIMESTAMPTZ;
      end_datetime TIMESTAMPTZ;
    BEGIN
      start_datetime := (NEW.date || ' ' || NEW.time)::TIMESTAMPTZ;
      end_datetime := (NEW.end_date || ' ' || NEW.end_time)::TIMESTAMPTZ;
      NEW.duration_hours := EXTRACT(EPOCH FROM (end_datetime - start_datetime)) / 3600;
    EXCEPTION WHEN OTHERS THEN
      NEW.duration_hours := NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic duration calculation
DROP TRIGGER IF EXISTS event_duration_trigger ON events;
CREATE TRIGGER event_duration_trigger
BEFORE INSERT OR UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION calculate_event_duration();

-- Function to expire old tickets
CREATE OR REPLACE FUNCTION expire_old_tickets()
RETURNS void AS $$
BEGIN
  UPDATE tickets t
  SET status = 'expired'
  FROM events e
  WHERE t.event_id = e.id
    AND t.status = 'valid'
    AND (e.end_date IS NULL AND e.date < CURRENT_DATE - INTERVAL '1 day')
    OR (e.end_date IS NOT NULL AND e.end_date < CURRENT_DATE - INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql;

-- RLS Policies

-- Ticket Templates: Anyone can view active templates for public events
ALTER TABLE ticket_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public ticket templates viewable by all"
  ON ticket_templates FOR SELECT
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = ticket_templates.event_id 
      AND events.visibility = 'public'
    )
  );

CREATE POLICY "Organizers can manage their ticket templates"
  ON ticket_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = ticket_templates.event_id 
      AND events.organizerId = auth.uid()
    )
  );

-- Tickets: Users can view their own tickets
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tickets"
  ON tickets FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can purchase tickets"
  ON tickets FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Organizers can view tickets for their events"
  ON tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = tickets.event_id 
      AND events.organizerId = auth.uid()
    )
  );

CREATE POLICY "Organizers can update ticket status"
  ON tickets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = tickets.event_id 
      AND events.organizerId = auth.uid()
    )
  );

-- Ticket Verifications: Organizers can view verifications for their events
ALTER TABLE ticket_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view verifications"
  ON ticket_verifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = ticket_verifications.event_id 
      AND events.organizerId = auth.uid()
    )
  );

CREATE POLICY "Organizers can create verifications"
  ON ticket_verifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = ticket_verifications.event_id 
      AND events.organizerId = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT ALL ON ticket_templates TO authenticated;
GRANT ALL ON tickets TO authenticated;
GRANT ALL ON ticket_verifications TO authenticated;

-- Create a view for ticket statistics
CREATE OR REPLACE VIEW ticket_stats AS
SELECT 
  e.id as event_id,
  e.name as event_name,
  e.organizerId,
  COUNT(DISTINCT t.id) as total_tickets_sold,
  COUNT(DISTINCT CASE WHEN t.status = 'used' THEN t.id END) as tickets_checked_in,
  COUNT(DISTINCT t.user_id) as unique_attendees,
  COALESCE(SUM(t.price_paid), 0) as total_revenue,
  COALESCE(AVG(t.price_paid), 0) as average_ticket_price,
  COALESCE(SUM(tt.quantity_total), 0) as total_capacity,
  COALESCE(SUM(tt.quantity_available), 0) as tickets_remaining
FROM events e
LEFT JOIN tickets t ON t.event_id = e.id
LEFT JOIN ticket_templates tt ON tt.event_id = e.id AND tt.is_active = true
GROUP BY e.id, e.name, e.organizerId;

-- Grant access to the view
GRANT SELECT ON ticket_stats TO authenticated;

-- Create the trigger AFTER all tables are created
-- This ensures the tickets table and ticket_template_id column exist
CREATE TRIGGER ticket_template_quantity_trigger
AFTER INSERT OR DELETE ON tickets
FOR EACH ROW
EXECUTE FUNCTION update_ticket_template_quantities();

COMMENT ON TABLE ticket_templates IS 'Defines different types of tickets available for events';
COMMENT ON TABLE tickets IS 'Individual ticket purchases with QR codes and verification status';
COMMENT ON TABLE ticket_verifications IS 'Audit trail of ticket verifications at event entrances';
COMMENT ON VIEW ticket_stats IS 'Aggregated statistics for ticket sales and attendance';
