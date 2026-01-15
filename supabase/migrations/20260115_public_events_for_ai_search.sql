-- Public Events View for AI Search Engines
-- Purpose: Make events discoverable by ChatGPT, Claude, Perplexity without authentication
-- Created: 2026-01-15

-- Create public view for active, published events (bypasses RLS)
CREATE OR REPLACE VIEW public_events AS
SELECT 
  id,
  name,
  description,
  category,
  date,
  location,
  location_point,
  price,
  organizer_id,
  image,
  attendees_count,
  max_capacity,
  created_at,
  updated_at,
  status,
  tags
FROM events
WHERE status IN ('active', 'published')
  AND date >= NOW();

-- Grant public access to the view
GRANT SELECT ON public_events TO anon, authenticated;

-- Create function to get public event by ID
CREATE OR REPLACE FUNCTION get_public_event(event_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  date TIMESTAMPTZ,
  location JSONB,
  location_point GEOGRAPHY,
  price NUMERIC,
  organizer_id UUID,
  image TEXT,
  attendees_count INTEGER,
  max_capacity INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  status TEXT,
  tags TEXT[],
  organizer_name TEXT,
  organizer_avatar TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.description,
    e.category,
    e.date,
    e.location,
    e.location_point,
    e.price,
    e.organizer_id,
    e.image,
    e.attendees_count,
    e.max_capacity,
    e.created_at,
    e.updated_at,
    e.status,
    e.tags,
    u.name as organizer_name,
    u.avatar as organizer_avatar
  FROM public_events e
  LEFT JOIN users u ON e.organizer_id = u.id
  WHERE e.id = event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get all public events
CREATE OR REPLACE FUNCTION get_all_public_events(
  limit_count INTEGER DEFAULT 100,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  date TIMESTAMPTZ,
  location JSONB,
  location_point GEOGRAPHY,
  price NUMERIC,
  image TEXT,
  attendees_count INTEGER,
  max_capacity INTEGER,
  tags TEXT[],
  organizer_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.description,
    e.category,
    e.date,
    e.location,
    e.location_point,
    e.price,
    e.image,
    e.attendees_count,
    e.max_capacity,
    e.tags,
    u.name as organizer_name
  FROM public_events e
  LEFT JOIN users u ON e.organizer_id = u.id
  ORDER BY e.date ASC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_public_event TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_all_public_events TO anon, authenticated;

-- Comment documentation
COMMENT ON VIEW public_events IS 'Public view of published events for AI search engines (bypasses RLS)';
COMMENT ON FUNCTION get_public_event IS 'Get single public event with organizer details';
COMMENT ON FUNCTION get_all_public_events IS 'Get all public events with pagination';
