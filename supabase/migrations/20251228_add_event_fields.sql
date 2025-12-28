-- ============================================
-- Add Missing Event Fields
-- Date: 2025-12-28
-- Purpose: Add end_date, end_time, and is_featured columns to events table
-- ============================================

-- Add end_date column (optional)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'events' 
        AND column_name = 'end_date'
    ) THEN
        ALTER TABLE public.events 
        ADD COLUMN end_date TEXT;
    END IF;
END $$;

-- Add end_time column (optional)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'events' 
        AND column_name = 'end_time'
    ) THEN
        ALTER TABLE public.events 
        ADD COLUMN end_time TEXT;
    END IF;
END $$;

-- Add is_featured column (Premium feature)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'events' 
        AND column_name = 'is_featured'
    ) THEN
        ALTER TABLE public.events 
        ADD COLUMN is_featured BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add custom_branding column (Premium feature)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'events' 
        AND column_name = 'custom_branding'
    ) THEN
        ALTER TABLE public.events 
        ADD COLUMN custom_branding JSONB;
    END IF;
END $$;

-- Add translations column (multilingual support)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'events' 
        AND column_name = 'translations'
    ) THEN
        ALTER TABLE public.events 
        ADD COLUMN translations JSONB;
    END IF;
END $$;

-- Create index for featured events
CREATE INDEX IF NOT EXISTS idx_events_featured 
ON public.events(is_featured, status) 
WHERE is_featured = true AND status = 'active';

-- Add comments
COMMENT ON COLUMN public.events.end_date IS 'Optional end date for multi-day events (TEXT format: YYYY-MM-DD)';
COMMENT ON COLUMN public.events.end_time IS 'Optional end time for events (TEXT format: HH:MM)';
COMMENT ON COLUMN public.events.is_featured IS 'Whether event is featured (Premium/unlocked feature)';
COMMENT ON COLUMN public.events.custom_branding IS 'Custom branding settings for Premium events';
COMMENT ON COLUMN public.events.translations IS 'Multilingual translations for event details';
