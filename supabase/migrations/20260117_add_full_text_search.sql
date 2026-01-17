-- Enable PostgreSQL full-text search for event discovery
-- This migration creates indexes to speed up event searches by name and description

-- Create a tsvector column for full-text search if it doesn't exist
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Generate initial search vectors from existing data
UPDATE events 
SET search_vector = to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(category, ''))
WHERE search_vector IS NULL;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_events_search_vector ON events USING GIN(search_vector);

-- Create index on frequently filtered columns for faster lookups
CREATE INDEX IF NOT EXISTS idx_events_status_visibility ON events(status, visibility) 
WHERE archived_at IS NULL;

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category) 
WHERE status = 'active' AND archived_at IS NULL;

-- Create a function to update search_vector on INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_events_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', 
    COALESCE(NEW.name, '') || ' ' || 
    COALESCE(NEW.description, '') || ' ' || 
    COALESCE(NEW.category, '') || ' ' ||
    COALESCE(NEW.location::text, '')
  );
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_events_search_vector ON events;

-- Create trigger to auto-update search_vector
CREATE TRIGGER trigger_update_events_search_vector
BEFORE INSERT OR UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION update_events_search_vector();

-- Add comment documenting the search capability
COMMENT ON COLUMN events.search_vector IS 'Full-text search index for event name, description, category, and location';
