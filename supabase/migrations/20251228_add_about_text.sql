-- ============================================
-- Add About Text Field to Events
-- Date: 2025-12-28
-- Purpose: Add rich text "about" field for detailed event information
-- ============================================

-- Add about_text column for detailed event description
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'events' 
        AND column_name = 'about_text'
    ) THEN
        ALTER TABLE public.events 
        ADD COLUMN about_text TEXT;
    END IF;
END $$;

COMMENT ON COLUMN public.events.about_text IS 'Detailed about text displayed in event detail page - supports rich formatting';
