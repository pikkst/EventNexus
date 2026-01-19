-- Translation Cache System
-- Stores translated content to avoid re-translating same content
-- Optimized for high-traffic scenarios (1000-1,000,000 visitors)

-- 1. Event Translations Cache Table
CREATE TABLE IF NOT EXISTS public.event_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  language_code VARCHAR(5) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  about_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one translation per event per language
  UNIQUE(event_id, language_code)
);

-- 2. Generic Content Translation Cache (for UI, descriptions, etc.)
CREATE TABLE IF NOT EXISTS public.translation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_text TEXT NOT NULL,
  source_language VARCHAR(5) NOT NULL DEFAULT 'en',
  target_language VARCHAR(5) NOT NULL,
  translated_text TEXT NOT NULL,
  context VARCHAR(50), -- 'event_name', 'event_description', 'ui_label', etc.
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Fast lookup index
  UNIQUE(source_text, source_language, target_language, context)
);

-- 3. User Language Preferences
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'en';

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_translations_event_id ON public.event_translations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_translations_language ON public.event_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_translation_cache_lookup ON public.translation_cache(source_text, target_language, context);
CREATE INDEX IF NOT EXISTS idx_translation_cache_usage ON public.translation_cache(usage_count DESC, last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_preferred_language ON public.users(preferred_language);

-- 5. Function to get or create translation
CREATE OR REPLACE FUNCTION get_cached_translation(
  p_source_text TEXT,
  p_source_lang VARCHAR(5),
  p_target_lang VARCHAR(5),
  p_context VARCHAR(50)
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_translation TEXT;
BEGIN
  -- Try to get from cache
  SELECT translated_text INTO v_translation
  FROM public.translation_cache
  WHERE source_text = p_source_text
    AND source_language = p_source_lang
    AND target_language = p_target_lang
    AND (context = p_context OR context IS NULL);
  
  -- Update usage stats if found
  IF FOUND THEN
    UPDATE public.translation_cache
    SET usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE source_text = p_source_text
      AND source_language = p_source_lang
      AND target_language = p_target_lang
      AND (context = p_context OR context IS NULL);
  END IF;
  
  RETURN v_translation;
END;
$$;

-- 6. Function to store translation in cache
CREATE OR REPLACE FUNCTION store_translation(
  p_source_text TEXT,
  p_source_lang VARCHAR(5),
  p_target_lang VARCHAR(5),
  p_translated_text TEXT,
  p_context VARCHAR(50)
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.translation_cache (
    source_text,
    source_language,
    target_language,
    translated_text,
    context,
    usage_count,
    last_used_at
  )
  VALUES (
    p_source_text,
    p_source_lang,
    p_target_lang,
    p_translated_text,
    p_context,
    1,
    NOW()
  )
  ON CONFLICT (source_text, source_language, target_language, context)
  DO UPDATE SET
    translated_text = EXCLUDED.translated_text,
    usage_count = public.translation_cache.usage_count + 1,
    last_used_at = NOW();
END;
$$;

-- 7. Function to batch get event translations
CREATE OR REPLACE FUNCTION get_event_translations(
  p_event_ids UUID[],
  p_language_code VARCHAR(5)
)
RETURNS TABLE (
  event_id UUID,
  name TEXT,
  description TEXT,
  about_text TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    et.event_id,
    et.name,
    et.description,
    et.about_text
  FROM public.event_translations et
  WHERE et.event_id = ANY(p_event_ids)
    AND et.language_code = p_language_code;
END;
$$;

-- 8. Function to cleanup old unused translations (run periodically)
CREATE OR REPLACE FUNCTION cleanup_unused_translations()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete translations not used in 90 days with low usage
  DELETE FROM public.translation_cache
  WHERE last_used_at < NOW() - INTERVAL '90 days'
    AND usage_count < 5;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- 9. RLS Policies
ALTER TABLE public.event_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;

-- Everyone can read translations
CREATE POLICY "Anyone can read event translations"
  ON public.event_translations FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read translation cache"
  ON public.translation_cache FOR SELECT
  USING (true);

-- Only authenticated users can create translations
CREATE POLICY "Authenticated users can insert event translations"
  ON public.event_translations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert translations"
  ON public.translation_cache FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Only event owners can update their event translations
CREATE POLICY "Event owners can update their translations"
  ON public.event_translations FOR UPDATE
  USING (
    event_id IN (
      SELECT id FROM public.events
      WHERE organizer_id = auth.uid()
    )
  );

-- 10. Automatic updated_at trigger for event_translations
CREATE OR REPLACE FUNCTION update_event_translation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_translations_updated_at
  BEFORE UPDATE ON public.event_translations
  FOR EACH ROW
  EXECUTE FUNCTION update_event_translation_timestamp();

-- 11. Add comment for documentation
COMMENT ON TABLE public.event_translations IS 'Cached translations for events to avoid re-translating content';
COMMENT ON TABLE public.translation_cache IS 'Generic translation cache for any text content';
COMMENT ON FUNCTION get_cached_translation IS 'Retrieve cached translation and update usage stats';
COMMENT ON FUNCTION store_translation IS 'Store new translation in cache with upsert logic';
COMMENT ON FUNCTION get_event_translations IS 'Batch retrieve event translations for multiple events';
COMMENT ON FUNCTION cleanup_unused_translations IS 'Remove old unused translations to keep database efficient';
