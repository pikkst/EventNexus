-- Add free event tracking columns to event_sources table
-- This enables prioritization of sources that provide more free events

ALTER TABLE event_sources 
ADD COLUMN IF NOT EXISTS free_event_ratio DECIMAL(3,2) DEFAULT 0.50
  CHECK (free_event_ratio >= 0.00 AND free_event_ratio <= 1.00),
ADD COLUMN IF NOT EXISTS free_event_count INT DEFAULT 0
  CHECK (free_event_count >= 0),
ADD COLUMN IF NOT EXISTS total_event_count INT DEFAULT 0
  CHECK (total_event_count >= 0);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_sources_free_ratio 
  ON event_sources(free_event_ratio DESC) 
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_event_sources_city_free 
  ON event_sources(city_id, free_event_ratio DESC) 
  WHERE active = true;

-- Add comments
COMMENT ON COLUMN event_sources.free_event_ratio IS 
  'Percentage of free events from this source (0.00-1.00). Higher = better source for free events.';
COMMENT ON COLUMN event_sources.free_event_count IS 
  'Total number of free events successfully published from this source';
COMMENT ON COLUMN event_sources.total_event_count IS 
  'Total number of events (free + paid) published from this source';

-- Update existing sources with initial values (analyze historical data)
UPDATE event_sources es
SET 
  free_event_count = COALESCE(stats.free_count, 0),
  total_event_count = COALESCE(stats.total_count, 0),
  free_event_ratio = CASE 
    WHEN COALESCE(stats.total_count, 0) > 0 
    THEN LEAST(1.00, COALESCE(stats.free_count, 0)::DECIMAL / stats.total_count)
    ELSE 0.50 -- Default for sources with no data yet
  END
FROM (
  SELECT 
    re.source_id,
    COUNT(e.id) FILTER (WHERE e.is_free = true) AS free_count,
    COUNT(e.id) AS total_count
  FROM raw_events re
  JOIN parsed_events pe ON pe.raw_event_id = re.id
  JOIN event_confidence ec ON ec.parsed_event_id = pe.id
  LEFT JOIN events e ON e.id = ec.event_id AND e.status = 'active'
  GROUP BY re.source_id
) stats
WHERE es.id = stats.source_id;

COMMENT ON TABLE event_sources IS 
  'Event sources with free event tracking. Use free_event_ratio to prioritize sources for discovery pipeline.';
