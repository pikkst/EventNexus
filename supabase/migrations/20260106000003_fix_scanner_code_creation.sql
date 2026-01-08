-- ============================================
-- Fix Scanner Code Creation Issues
-- ============================================
-- Date: 2026-01-06
-- Purpose: Fix 400 error when creating scanner codes from web platform
-- ============================================

-- Step 1: Ensure scanner_codes table exists with correct schema
-- ============================================
CREATE TABLE IF NOT EXISTS public.scanner_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL DEFAULT 'Scanner',
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    scan_count INTEGER NOT NULL DEFAULT 0,
    device_info JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'scanner_codes' 
                   AND column_name = 'updated_at') THEN
        ALTER TABLE public.scanner_codes ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'scanner_codes' 
                   AND column_name = 'is_active') THEN
        ALTER TABLE public.scanner_codes ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'scanner_codes' 
                   AND column_name = 'last_used_at') THEN
        ALTER TABLE public.scanner_codes ADD COLUMN last_used_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'scanner_codes' 
                   AND column_name = 'scan_count') THEN
        ALTER TABLE public.scanner_codes ADD COLUMN scan_count INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'scanner_codes' 
                   AND column_name = 'device_info') THEN
        ALTER TABLE public.scanner_codes ADD COLUMN device_info JSONB;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scanner_codes_event_id ON public.scanner_codes(event_id);
CREATE INDEX IF NOT EXISTS idx_scanner_codes_organizer_id ON public.scanner_codes(organizer_id);
CREATE INDEX IF NOT EXISTS idx_scanner_codes_code ON public.scanner_codes(code);
CREATE INDEX IF NOT EXISTS idx_scanner_codes_is_active ON public.scanner_codes(is_active);

-- Step 2: Recreate generate_scanner_code function
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_scanner_code()
RETURNS TEXT 
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed ambiguous chars (I, O, 1, 0)
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Step 3: Create trigger function to auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_scanner_code_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS scanner_codes_updated_at ON public.scanner_codes;
CREATE TRIGGER scanner_codes_updated_at
    BEFORE UPDATE ON public.scanner_codes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_scanner_code_updated_at();

-- Step 4: Fix create_scanner_code function to handle NULL properly
-- ============================================
CREATE OR REPLACE FUNCTION public.create_scanner_code(
  p_event_id UUID,
  p_organizer_id UUID,
  p_name TEXT,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(id UUID, code TEXT, name TEXT, event_id UUID) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT;
  v_id UUID;
  v_attempt INTEGER := 0;
  v_max_attempts INTEGER := 10;
  v_organizer UUID;
  v_scanner_name TEXT;
BEGIN
  -- Get organizer ID (from parameter or current user)
  v_organizer := COALESCE(p_organizer_id, auth.uid());
  
  -- Validate organizer context
  IF v_organizer IS NULL THEN
    RAISE EXCEPTION 'Organizer context missing. Please sign in and try again.';
  END IF;

  -- Verify organizer owns the event
  PERFORM 1 FROM public.events WHERE events.id = p_event_id AND events.organizer_id = v_organizer;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organizer does not own this event or event does not exist';
  END IF;

  -- Use provided name or default
  v_scanner_name := COALESCE(NULLIF(TRIM(p_name), ''), 'Scanner');

  -- Generate unique code with retry logic
  LOOP
    v_code := generate_scanner_code();
    v_attempt := v_attempt + 1;

    -- Check if code is unique
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.scanner_codes WHERE scanner_codes.code = v_code);

    -- Fail after max attempts
    IF v_attempt >= v_max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique scanner code after % attempts', v_max_attempts;
    END IF;
  END LOOP;

  -- Insert new scanner code
  INSERT INTO public.scanner_codes (
    event_id,
    organizer_id,
    code,
    name,
    expires_at,
    is_active,
    scan_count,
    created_at,
    updated_at
  )
  VALUES (
    p_event_id,
    v_organizer,
    v_code,
    v_scanner_name,
    p_expires_at,
    true,
    0,
    NOW(),
    NOW()
  )
  RETURNING 
    scanner_codes.id,
    scanner_codes.code,
    scanner_codes.name,
    scanner_codes.event_id
  INTO v_id, v_code, v_scanner_name, p_event_id;

  -- Return the created code
  RETURN QUERY SELECT v_id AS id, v_code AS code, v_scanner_name AS name, p_event_id AS event_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.generate_scanner_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_scanner_code(UUID, UUID, TEXT, TIMESTAMPTZ) TO authenticated;

-- Step 4: Add RLS policies
-- ============================================
ALTER TABLE public.scanner_codes ENABLE ROW LEVEL SECURITY;

-- Organizers can view their own scanner codes
DROP POLICY IF EXISTS "Organizers can view their own scanner codes" ON public.scanner_codes;
CREATE POLICY "Organizers can view their own scanner codes"
    ON public.scanner_codes FOR SELECT
    TO authenticated
    USING (organizer_id = auth.uid());

-- Organizers can create scanner codes for their events
DROP POLICY IF EXISTS "Organizers can create scanner codes" ON public.scanner_codes;
CREATE POLICY "Organizers can create scanner codes"
    ON public.scanner_codes FOR INSERT
    TO authenticated
    WITH CHECK (
        organizer_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.events 
            WHERE events.id = scanner_codes.event_id 
            AND events.organizer_id = auth.uid()
        )
    );

-- Organizers can update their own scanner codes
DROP POLICY IF EXISTS "Organizers can update their own scanner codes" ON public.scanner_codes;
CREATE POLICY "Organizers can update their own scanner codes"
    ON public.scanner_codes FOR UPDATE
    TO authenticated
    USING (organizer_id = auth.uid())
    WITH CHECK (organizer_id = auth.uid());

-- Organizers can delete their own scanner codes
DROP POLICY IF EXISTS "Organizers can delete their own scanner codes" ON public.scanner_codes;
CREATE POLICY "Organizers can delete their own scanner codes"
    ON public.scanner_codes FOR DELETE
    TO authenticated
    USING (organizer_id = auth.uid());

-- Step 5: Add comments
-- ============================================
COMMENT ON TABLE public.scanner_codes IS 'Scanner codes for mobile app authentication';
COMMENT ON FUNCTION public.generate_scanner_code() IS 'Generates a unique 8-character alphanumeric scanner code';
COMMENT ON FUNCTION public.create_scanner_code(UUID, UUID, TEXT, TIMESTAMPTZ) IS 'Creates a new scanner code with automatic unique code generation and event ownership validation';
COMMENT ON FUNCTION public.verify_scanner_code(TEXT) IS 'Verifies a scanner code and returns event details for mobile app (case-insensitive)';
COMMENT ON FUNCTION public.record_scanner_usage(UUID, TEXT) IS 'Records scanner code usage with timestamp and optional location';

-- Step 6: Fix verify_scanner_code function to handle status case-insensitively
-- ============================================
CREATE OR REPLACE FUNCTION public.verify_scanner_code(p_code TEXT)
RETURNS TABLE(
  valid BOOLEAN,
  event_id UUID,
  event_name TEXT,
  scanner_code_id UUID,
  organizer_id UUID,
  expires_at TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN sc.is_active 
        AND (sc.expires_at IS NULL OR sc.expires_at > NOW())
        AND UPPER(e.status) = 'ACTIVE' -- Case-insensitive comparison
      THEN true
      ELSE false
    END as valid,
    sc.event_id,
    e.name as event_name,
    sc.id as scanner_code_id,
    sc.organizer_id,
    sc.expires_at
  FROM public.scanner_codes sc
  JOIN public.events e ON e.id = sc.event_id
  WHERE sc.code = UPPER(p_code); -- Case-insensitive code matching
  
  -- Return false result if code not found
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::UUID, NULL::UUID, NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_scanner_code(TEXT) TO anon, authenticated;

-- Step 7: Add record_scanner_usage function if missing
-- ============================================
CREATE OR REPLACE FUNCTION public.record_scanner_usage(
  p_scanner_code_id UUID,
  p_location TEXT DEFAULT NULL
)
RETURNS VOID 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.scanner_codes
  SET 
    last_used_at = NOW(),
    scan_count = scan_count + 1,
    device_info = CASE 
      WHEN p_location IS NOT NULL THEN 
        COALESCE(device_info, '{}'::jsonb) || jsonb_build_object('last_location', p_location)
      ELSE device_info
    END
  WHERE id = p_scanner_code_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_scanner_usage(UUID, TEXT) TO authenticated;

-- Step 8: Verification
-- ============================================
DO $$ 
BEGIN
    RAISE NOTICE '✅ Scanner code system fixed';
    RAISE NOTICE '   - Table schema verified';
    RAISE NOTICE '   - Functions recreated';
    RAISE NOTICE '   - RLS policies applied';
    RAISE NOTICE '   - verify_scanner_code fixed for case-insensitive matching';
    RAISE NOTICE '   - record_scanner_usage function added';
    RAISE NOTICE '';
    RAISE NOTICE '📱 Test creating a scanner code:';
    RAISE NOTICE '   SELECT * FROM public.create_scanner_code(';
    RAISE NOTICE '     ''event-uuid-here''::uuid,';
    RAISE NOTICE '     auth.uid(),';
    RAISE NOTICE '     ''Test Scanner'',';
    RAISE NOTICE '     NULL';
    RAISE NOTICE '   );';
    RAISE NOTICE '';
    RAISE NOTICE '📱 Test verifying a scanner code:';
    RAISE NOTICE '   SELECT * FROM public.verify_scanner_code(''TESTCODE'');';
END $$;
