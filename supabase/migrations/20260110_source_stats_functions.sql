-- Function to calculate and update source free event statistics
-- Run after publishing events to keep stats current

CREATE OR REPLACE FUNCTION calculate_source_free_ratio(p_source_id UUID)
RETURNS TABLE(
  source_id UUID,
  free_count INT,
  total_count INT,
  free_ratio DECIMAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p_source_id,
    COUNT(e.id) FILTER (WHERE e.price = 0)::INT AS free_count,
    COUNT(e.id)::INT AS total_count,
    (
      CASE 
        WHEN COUNT(e.id) > 0 
        THEN LEAST(1.00, COUNT(e.id) FILTER (WHERE e.price = 0)::DECIMAL / COUNT(e.id))
        ELSE 0.50::DECIMAL
      END
    ) AS free_ratio
  FROM raw_events re
  JOIN parsed_events pe ON pe.raw_event_id = re.id
  JOIN event_confidence ec ON ec.parsed_event_id = pe.id
  LEFT JOIN events e ON e.id = ec.event_id AND e.status = 'active'
  WHERE re.source_id = p_source_id;
END;
$$;

-- Function to auto-update source stats after event publish
CREATE OR REPLACE FUNCTION update_source_stats_on_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source_id UUID;
  v_stats RECORD;
  v_parsed_event_id UUID;
BEGIN
  -- Get parsed_event_id from event_confidence (NEW is from events table)
  SELECT parsed_event_id INTO v_parsed_event_id
  FROM event_confidence
  WHERE event_id = NEW.id
  LIMIT 1;

  IF v_parsed_event_id IS NULL THEN
    RETURN NEW; -- No parsed event linked
  END IF;

  -- Get source_id from parsed_event → raw_event
  SELECT re.source_id INTO v_source_id
  FROM parsed_events pe
  JOIN raw_events re ON re.id = pe.raw_event_id
  WHERE pe.id = v_parsed_event_id;

  IF v_source_id IS NOT NULL THEN
    -- Calculate new stats
    SELECT * INTO v_stats FROM calculate_source_free_ratio(v_source_id);

    -- Update source record
    UPDATE event_sources
    SET
      free_event_count = v_stats.free_count,
      total_event_count = v_stats.total_count,
      free_event_ratio = v_stats.free_ratio,
      -- Boost source_score for high free ratio (50 base + 50 * ratio)
      source_score = LEAST(100, 50 + (v_stats.free_ratio * 50)::INT)
    WHERE id = v_source_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to auto-update stats when events are published
DROP TRIGGER IF EXISTS trigger_update_source_stats ON events;
CREATE TRIGGER trigger_update_source_stats
  AFTER INSERT ON events
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION update_source_stats_on_publish();

-- Also update when events are archived (decrease counts)
CREATE OR REPLACE FUNCTION update_source_stats_on_archive()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source_id UUID;
  v_stats RECORD;
  v_parsed_event_id UUID;
BEGIN
  -- Only trigger if status changes to archived
  IF OLD.status = 'active' AND NEW.status = 'archived' THEN
    -- Get parsed_event_id from event_confidence
    SELECT parsed_event_id INTO v_parsed_event_id
    FROM event_confidence
    WHERE event_id = NEW.id
    LIMIT 1;

    IF v_parsed_event_id IS NULL THEN
      RETURN NEW; -- No parsed event linked
    END IF;

    SELECT re.source_id INTO v_source_id
    FROM parsed_events pe
    JOIN raw_events re ON re.id = pe.raw_event_id
    WHERE pe.id = v_parsed_event_id;

    IF v_source_id IS NOT NULL THEN
      SELECT * INTO v_stats FROM calculate_source_free_ratio(v_source_id);

      UPDATE event_sources
      SET
        free_event_count = v_stats.free_count,
        total_event_count = v_stats.total_count,
        free_event_ratio = v_stats.free_ratio,
        source_score = LEAST(100, 50 + (v_stats.free_ratio * 50)::INT)
      WHERE id = v_source_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_source_stats_archive ON events;
CREATE TRIGGER trigger_update_source_stats_archive
  AFTER UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_source_stats_on_archive();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_source_free_ratio(UUID) TO authenticated, anon;

COMMENT ON FUNCTION calculate_source_free_ratio IS 
  'Calculates free event statistics for a given source. Returns free_count, total_count, and free_ratio.';
COMMENT ON FUNCTION update_source_stats_on_publish IS 
  'Trigger function to automatically update source statistics when new event is published';
COMMENT ON FUNCTION update_source_stats_on_archive IS 
  'Trigger function to update source statistics when event is archived';
