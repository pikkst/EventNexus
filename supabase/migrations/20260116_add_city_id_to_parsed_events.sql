-- Add city_id column to parsed_events table for event discovery tracking
-- This allows linking discovered events back to the city they were found in

ALTER TABLE public.parsed_events 
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.city_configs(city_id) ON DELETE CASCADE;

-- Create index for faster city-based queries
CREATE INDEX IF NOT EXISTS idx_parsed_events_city 
  ON public.parsed_events(city_id, parsed_at DESC);

-- Add city_id to raw_events for complete tracking lineage
ALTER TABLE public.raw_events
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.city_configs(city_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_raw_events_city
  ON public.raw_events(city_id, fetched_at DESC);
