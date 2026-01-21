-- Add seat_id column to tickets table for venue seating integration
-- This allows tickets to be linked to specific seats or zones in venue layouts

-- Add seat_id column (nullable since old tickets won't have seats)
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS seat_id TEXT;

-- Create index for faster lookups when checking which seats are booked
CREATE INDEX IF NOT EXISTS idx_tickets_seat_id ON tickets(seat_id);

-- Add comment for documentation
COMMENT ON COLUMN tickets.seat_id IS 'References venue_layouts.items[].id for seat/zone assignments';
