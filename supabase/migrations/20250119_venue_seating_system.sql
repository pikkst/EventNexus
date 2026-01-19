-- Migration: Venue Seating & Zone Designer System
-- Description: Adds comprehensive venue layout design with seat/zone mapping
--              for events with seating arrangements

-- Create venue_layouts table for storing venue designs
CREATE TABLE IF NOT EXISTS venue_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Venue Layout',
  canvas_width INTEGER NOT NULL DEFAULT 800,
  canvas_height INTEGER NOT NULL DEFAULT 600,
  background_image TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_venue_layouts_event ON venue_layouts(event_id);

-- Add venue_layout_id to events table for quick reference
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS has_seating BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS venue_layout_id UUID REFERENCES venue_layouts(id) ON DELETE SET NULL;

-- Update ticket metadata to support seating info
-- The metadata column already exists in tickets table, we just document the structure:
-- metadata.seat_id - ID of the VenueItem (seat/zone) from venue_layouts.items
-- metadata.seat_name - Display name (e.g., "VIP Row A Seat 12")
-- metadata.seat_type - Type: 'seat', 'zone', or 'stage'
-- metadata.zone_name - Zone name if seat is in a zone
-- metadata.row_label - Row label if applicable
-- metadata.seat_number - Seat number within row/zone
-- metadata.zone_capacity - Total capacity of zone if zone ticket

-- Function to automatically update venue_layout updated_at
CREATE OR REPLACE FUNCTION update_venue_layout_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic timestamp update
DROP TRIGGER IF EXISTS venue_layout_update_trigger ON venue_layouts;
CREATE TRIGGER venue_layout_update_trigger
BEFORE UPDATE ON venue_layouts
FOR EACH ROW
EXECUTE FUNCTION update_venue_layout_timestamp();

-- Function to check seat/zone availability
CREATE OR REPLACE FUNCTION check_venue_item_availability(
  p_event_id UUID,
  p_venue_item_id TEXT
)
RETURNS TABLE(
  is_available BOOLEAN,
  booked_count INTEGER,
  capacity INTEGER
) AS $$
DECLARE
  v_layout JSONB;
  v_item JSONB;
  v_booked_count INTEGER;
  v_capacity INTEGER;
BEGIN
  -- Get the venue layout items
  SELECT items INTO v_layout
  FROM venue_layouts
  WHERE event_id = p_event_id;

  -- Find the specific item
  SELECT item INTO v_item
  FROM jsonb_array_elements(v_layout) AS item
  WHERE item->>'id' = p_venue_item_id;

  -- Get capacity from item (for zones)
  v_capacity := COALESCE((v_item->>'capacity')::INTEGER, 1);

  -- Count existing bookings for this venue item
  SELECT COUNT(*) INTO v_booked_count
  FROM tickets
  WHERE event_id = p_event_id
    AND metadata->>'seat_id' = p_venue_item_id
    AND status IN ('valid', 'used');

  -- Return availability
  RETURN QUERY SELECT 
    v_booked_count < v_capacity AS is_available,
    v_booked_count,
    v_capacity;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for venue_layouts

ALTER TABLE venue_layouts ENABLE ROW LEVEL SECURITY;

-- Anyone can view venue layouts for public events
CREATE POLICY "Anyone can view public venue layouts"
  ON venue_layouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = venue_layouts.event_id 
      AND events.visibility = 'public'
    )
  );

-- Organizers can manage their venue layouts
CREATE POLICY "Organizers can manage their venue layouts"
  ON venue_layouts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = venue_layouts.event_id 
      AND events.organizer_id = auth.uid()
    )
  );

-- Update ticket_templates to support venue item references
ALTER TABLE ticket_templates
ADD COLUMN IF NOT EXISTS venue_item_id TEXT,
ADD COLUMN IF NOT EXISTS venue_item_type TEXT CHECK (venue_item_type IN ('seat', 'zone', 'stage'));

-- Create index for venue item lookups
CREATE INDEX IF NOT EXISTS idx_ticket_templates_venue_item ON ticket_templates(venue_item_id);

COMMENT ON TABLE venue_layouts IS 'Stores venue seating and zone layouts for events';
COMMENT ON COLUMN venue_layouts.items IS 'JSONB array of venue items: {id, type, x, y, width?, height?, shape?, name, price, seatNumber?, capacity?, color?}';
COMMENT ON COLUMN events.has_seating IS 'Whether event uses venue seating/zone designer';
COMMENT ON COLUMN ticket_templates.venue_item_id IS 'References a VenueItem.id from venue_layouts.items JSONB';
