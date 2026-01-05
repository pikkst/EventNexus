-- Scanner Codes System for Mobile Apps
-- Allows event organizers to authenticate mobile scanner apps

-- Scanner codes table
CREATE TABLE IF NOT EXISTS scanner_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE, -- 8-char alphanumeric code
  name TEXT NOT NULL, -- Device/scanner name (e.g., "Main Entrance Scanner")
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional expiration date
  -- Metadata
  device_info JSONB, -- Store device details when first activated
  scan_count INTEGER DEFAULT 0,
  last_scan_location GEOGRAPHY(Point, 4326)
);

-- Scanner sessions table - track active scanner app sessions
CREATE TABLE IF NOT EXISTS scanner_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scanner_code_id UUID NOT NULL REFERENCES scanner_codes(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL, -- JWT or unique session identifier
  device_info JSONB, -- OS, version, model, etc.
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Indexes for performance
CREATE INDEX idx_scanner_codes_event ON scanner_codes(event_id);
CREATE INDEX idx_scanner_codes_organizer ON scanner_codes(organizer_id);
CREATE INDEX idx_scanner_codes_code ON scanner_codes(code);
CREATE INDEX idx_scanner_codes_active ON scanner_codes(is_active) WHERE is_active = true;
CREATE INDEX idx_scanner_sessions_scanner_code ON scanner_sessions(scanner_code_id);
CREATE INDEX idx_scanner_sessions_active ON scanner_sessions(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE scanner_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scanner_sessions ENABLE ROW LEVEL SECURITY;

-- Organizers can manage their own scanner codes
CREATE POLICY "Organizers can view their scanner codes"
  ON scanner_codes FOR SELECT
  USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can create scanner codes for their events"
  ON scanner_codes FOR INSERT
  WITH CHECK (
    auth.uid() = organizer_id AND
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = scanner_codes.event_id 
      AND events.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can update their scanner codes"
  ON scanner_codes FOR UPDATE
  USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their scanner codes"
  ON scanner_codes FOR DELETE
  USING (auth.uid() = organizer_id);

-- Scanner sessions policies (mobile apps use these)
CREATE POLICY "Scanner sessions viewable by code owner"
  ON scanner_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scanner_codes 
      WHERE scanner_codes.id = scanner_sessions.scanner_code_id 
      AND scanner_codes.organizer_id = auth.uid()
    )
  );

-- Function to generate unique scanner code
CREATE OR REPLACE FUNCTION generate_scanner_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed ambiguous chars
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to create scanner code with automatic code generation
CREATE OR REPLACE FUNCTION create_scanner_code(
  p_event_id UUID,
  p_organizer_id UUID,
  p_name TEXT,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(id UUID, code TEXT, name TEXT, event_id UUID) AS $$
DECLARE
  v_code TEXT;
  v_id UUID;
  v_attempt INTEGER := 0;
  v_max_attempts INTEGER := 10;
BEGIN
  -- Verify organizer owns the event
  IF NOT EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = p_event_id 
    AND events.organizer_id = p_organizer_id
  ) THEN
    RAISE EXCEPTION 'Organizer does not own this event';
  END IF;

  -- Generate unique code (retry if collision)
  LOOP
    v_code := generate_scanner_code();
    v_attempt := v_attempt + 1;
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM scanner_codes WHERE code = v_code) THEN
      EXIT;
    END IF;
    
    IF v_attempt >= v_max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique scanner code after % attempts', v_max_attempts;
    END IF;
  END LOOP;

  -- Insert the scanner code
  INSERT INTO scanner_codes (event_id, organizer_id, code, name, expires_at)
  VALUES (p_event_id, p_organizer_id, v_code, p_name, p_expires_at)
  RETURNING scanner_codes.id, scanner_codes.code, scanner_codes.name, scanner_codes.event_id
  INTO v_id, v_code, p_name, p_event_id;

  RETURN QUERY SELECT v_id, v_code, p_name, p_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify scanner code and get event details
CREATE OR REPLACE FUNCTION verify_scanner_code(p_code TEXT)
RETURNS TABLE(
  valid BOOLEAN,
  event_id UUID,
  event_name TEXT,
  scanner_code_id UUID,
  organizer_id UUID,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN sc.is_active 
        AND (sc.expires_at IS NULL OR sc.expires_at > NOW())
        AND e.status = 'active'
      THEN true
      ELSE false
    END as valid,
    sc.event_id,
    e.name as event_name,
    sc.id as scanner_code_id,
    sc.organizer_id,
    sc.expires_at
  FROM scanner_codes sc
  JOIN events e ON e.id = sc.event_id
  WHERE sc.code = p_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record scanner code usage
CREATE OR REPLACE FUNCTION record_scanner_usage(
  p_scanner_code_id UUID,
  p_location GEOGRAPHY DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE scanner_codes
  SET 
    last_used_at = NOW(),
    scan_count = scan_count + 1,
    last_scan_location = COALESCE(p_location, last_scan_location)
  WHERE id = p_scanner_code_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_scanner_code() TO authenticated;
GRANT EXECUTE ON FUNCTION create_scanner_code(UUID, UUID, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_scanner_code(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_scanner_usage(UUID, GEOGRAPHY) TO anon, authenticated;

COMMENT ON TABLE scanner_codes IS 'Scanner codes for mobile app authentication to scan event tickets';
COMMENT ON TABLE scanner_sessions IS 'Active mobile scanner app sessions';
COMMENT ON FUNCTION create_scanner_code IS 'Creates a new scanner code for an event with automatic unique code generation';
COMMENT ON FUNCTION verify_scanner_code IS 'Verifies a scanner code and returns event details for mobile app';
COMMENT ON FUNCTION record_scanner_usage IS 'Records scanner code usage statistics';
