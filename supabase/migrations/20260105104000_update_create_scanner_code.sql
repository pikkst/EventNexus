-- Update create_scanner_code to be auth-aware and avoid missing organizer context
CREATE OR REPLACE FUNCTION public.create_scanner_code(
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
  v_organizer UUID := COALESCE(p_organizer_id, auth.uid());
BEGIN
  IF v_organizer IS NULL THEN
    RAISE EXCEPTION 'Organizer context missing. Please sign in and try again.';
  END IF;

  PERFORM 1 FROM public.events WHERE id = p_event_id AND organizer_id = v_organizer;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organizer does not own this event';
  END IF;

  LOOP
    v_code := generate_scanner_code();
    v_attempt := v_attempt + 1;

    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.scanner_codes WHERE code = v_code);

    IF v_attempt >= v_max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique scanner code after % attempts', v_max_attempts;
    END IF;
  END LOOP;

  INSERT INTO public.scanner_codes (event_id, organizer_id, code, name, expires_at)
  VALUES (p_event_id, v_organizer, v_code, p_name, p_expires_at)
  RETURNING scanner_codes.id, scanner_codes.code, scanner_codes.name, scanner_codes.event_id
  INTO v_id, v_code, p_name, p_event_id;

  RETURN QUERY SELECT v_id, v_code, p_name, p_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_scanner_code(UUID, UUID, TEXT, TIMESTAMPTZ) TO authenticated;
COMMENT ON FUNCTION public.create_scanner_code(UUID, UUID, TEXT, TIMESTAMPTZ) IS 'Creates a new scanner code for an event with automatic unique code generation (auth-aware).';
