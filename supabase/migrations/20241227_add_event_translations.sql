-- Add translations support to events table
-- This enables AI auto-translation feature for multilingual event descriptions

-- Add translations column to store multilingual content
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN public.events.translations IS 'Multilingual translations of event description. Format: {"en": "English text", "es": "Spanish text", "fr": "French text", etc.}';

-- Create index for faster queries on translations
CREATE INDEX IF NOT EXISTS idx_events_translations ON public.events USING gin (translations);

-- Update existing events to have empty translations object if null
UPDATE public.events 
SET translations = '{}'::jsonb 
WHERE translations IS NULL;
