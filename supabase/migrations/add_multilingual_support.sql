-- ============================================================================
-- EventNexus Multilingual Support Migration
-- ============================================================================
-- This migration adds multilingual event support with automatic translation
-- capabilities for Pro, Premium, and Enterprise tier users.
--
-- Features:
-- - User language preferences
-- - Event multilingual flag
-- - Original language tracking
-- - Structured translations storage (JSONB)
--
-- Usage: Run this in Supabase SQL Editor
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD LANGUAGE PREFERENCE TO USERS TABLE
-- ----------------------------------------------------------------------------
-- Stores user's preferred language for viewing events
-- Default: 'en' (English)
-- Supported: 'en', 'et', 'fi', 'sv', 'de', 'fr', 'es', 'ru', 'pl'

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'en'
CHECK (preferred_language IN ('en', 'et', 'fi', 'sv', 'de', 'fr', 'es', 'ru', 'pl'));

COMMENT ON COLUMN public.users.preferred_language IS 
'User preferred language for viewing events. Used for auto-translation display.';


-- ----------------------------------------------------------------------------
-- 2. ADD MULTILINGUAL FIELDS TO EVENTS TABLE
-- ----------------------------------------------------------------------------

-- Flag to indicate if event supports multiple languages
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS is_multilingual BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.events.is_multilingual IS 
'If TRUE, event is auto-translated for viewers. Only available for Pro+ tiers.';


-- Original language the event was created in
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS original_language VARCHAR(5) DEFAULT 'en'
CHECK (original_language IN ('en', 'et', 'fi', 'sv', 'de', 'fr', 'es', 'ru', 'pl'));

COMMENT ON COLUMN public.events.original_language IS 
'Language code the event was originally created in. Auto-detected from location.';


-- Structured translations storage
-- Format: { "et": { "name": "...", "description": "...", "aboutText": "..." }, "fi": {...}, ... }
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT NULL;

COMMENT ON COLUMN public.events.translations IS 
'JSONB object containing translations. Structure: { "langCode": { "name": "...", "description": "...", "aboutText": "..." } }';


-- ----------------------------------------------------------------------------
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ----------------------------------------------------------------------------

-- Index for filtering multilingual events
CREATE INDEX IF NOT EXISTS idx_events_is_multilingual 
ON public.events(is_multilingual) 
WHERE is_multilingual = TRUE;

-- Index for filtering by original language
CREATE INDEX IF NOT EXISTS idx_events_original_language 
ON public.events(original_language);

-- GIN index for translations JSONB queries (faster lookups)
CREATE INDEX IF NOT EXISTS idx_events_translations_gin 
ON public.events USING GIN (translations);

-- Index for user language preference (faster profile queries)
CREATE INDEX IF NOT EXISTS idx_users_preferred_language 
ON public.users(preferred_language);


-- ----------------------------------------------------------------------------
-- 4. UPDATE ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
-- Allow users to update their own language preference

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can update their own language preference" ON public.users;

-- Create new policy for language preference updates
CREATE POLICY "Users can update their own language preference"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


-- ----------------------------------------------------------------------------
-- 5. SET DEFAULT VALUES FOR EXISTING RECORDS
-- ----------------------------------------------------------------------------

-- Set all existing users to English by default
UPDATE public.users
SET preferred_language = 'en'
WHERE preferred_language IS NULL;

-- Set all existing events to non-multilingual
UPDATE public.events
SET is_multilingual = FALSE,
    original_language = 'en'
WHERE is_multilingual IS NULL;


-- ----------------------------------------------------------------------------
-- 6. CREATE HELPER FUNCTION FOR TRANSLATION VALIDATION
-- ----------------------------------------------------------------------------

-- Function to validate translation structure
CREATE OR REPLACE FUNCTION validate_event_translations()
RETURNS TRIGGER AS $$
BEGIN
  -- If translations exist, validate structure
  IF NEW.translations IS NOT NULL THEN
    -- Check if translations is a valid JSON object
    IF jsonb_typeof(NEW.translations) != 'object' THEN
      RAISE EXCEPTION 'translations must be a JSON object';
    END IF;
    
    -- Check if each language has required fields
    IF NOT (
      SELECT bool_and(
        value ? 'name' AND 
        value ? 'description' AND
        jsonb_typeof(value->'name') = 'string' AND
        jsonb_typeof(value->'description') = 'string'
      )
      FROM jsonb_each(NEW.translations)
    ) THEN
      RAISE EXCEPTION 'Each translation must have "name" and "description" fields as strings';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
DROP TRIGGER IF EXISTS validate_event_translations_trigger ON public.events;
CREATE TRIGGER validate_event_translations_trigger
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION validate_event_translations();


-- ----------------------------------------------------------------------------
-- 7. CREATE HELPER FUNCTION TO GET TRANSLATED EVENT
-- ----------------------------------------------------------------------------

-- Function to get event in specific language
CREATE OR REPLACE FUNCTION get_event_translation(
  event_id UUID,
  language_code VARCHAR(5)
)
RETURNS TABLE (
  name TEXT,
  description TEXT,
  about_text TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(
      (e.translations->language_code->>'name')::TEXT,
      (e.translations->e.original_language->>'name')::TEXT,
      e.name
    ) AS name,
    COALESCE(
      (e.translations->language_code->>'description')::TEXT,
      (e.translations->e.original_language->>'description')::TEXT,
      e.description
    ) AS description,
    COALESCE(
      (e.translations->language_code->>'aboutText')::TEXT,
      (e.translations->e.original_language->>'aboutText')::TEXT,
      e.about_text
    ) AS about_text
  FROM public.events e
  WHERE e.id = event_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_event_translation IS 
'Returns event content in requested language. Falls back to original language or default if translation not available.';


-- ----------------------------------------------------------------------------
-- 8. CREATE VIEW FOR MULTILINGUAL EVENTS STATS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW multilingual_events_stats AS
SELECT 
  COUNT(*) FILTER (WHERE is_multilingual = TRUE) AS total_multilingual,
  COUNT(*) FILTER (WHERE is_multilingual = FALSE) AS total_single_language,
  COUNT(*) AS total_events,
  COUNT(DISTINCT original_language) AS languages_used,
  original_language,
  COUNT(*) AS events_per_language
FROM public.events
GROUP BY original_language
ORDER BY events_per_language DESC;

COMMENT ON VIEW multilingual_events_stats IS 
'Statistics view showing multilingual event distribution and language usage.';


-- ----------------------------------------------------------------------------
-- 9. GRANT PERMISSIONS
-- ----------------------------------------------------------------------------

-- Grant access to authenticated users
GRANT SELECT ON multilingual_events_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_translation TO authenticated;


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify the migration
DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Multilingual Support Migration Complete!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Added columns:';
  RAISE NOTICE '  ✓ users.preferred_language (VARCHAR)';
  RAISE NOTICE '  ✓ events.is_multilingual (BOOLEAN)';
  RAISE NOTICE '  ✓ events.original_language (VARCHAR)';
  RAISE NOTICE '  ✓ events.translations (JSONB)';
  RAISE NOTICE '';
  RAISE NOTICE 'Created indexes:';
  RAISE NOTICE '  ✓ idx_events_is_multilingual';
  RAISE NOTICE '  ✓ idx_events_original_language';
  RAISE NOTICE '  ✓ idx_events_translations_gin';
  RAISE NOTICE '  ✓ idx_users_preferred_language';
  RAISE NOTICE '';
  RAISE NOTICE 'Created functions:';
  RAISE NOTICE '  ✓ validate_event_translations()';
  RAISE NOTICE '  ✓ get_event_translation()';
  RAISE NOTICE '';
  RAISE NOTICE 'Created views:';
  RAISE NOTICE '  ✓ multilingual_events_stats';
  RAISE NOTICE '';
  RAISE NOTICE 'Supported languages (9):';
  RAISE NOTICE '  EN, ET, FI, SV, DE, FR, ES, RU, PL';
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
END $$;
