-- Add visibility field to events table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'events' 
                   AND column_name = 'visibility') THEN
        ALTER TABLE public.events 
        ADD COLUMN visibility TEXT DEFAULT 'public' 
        CHECK (visibility IN ('public', 'private', 'semi-private'));
    END IF;
END $$;

-- Create index for visibility filtering
CREATE INDEX IF NOT EXISTS idx_events_visibility ON public.events(visibility);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON public.events(organizer_id);
