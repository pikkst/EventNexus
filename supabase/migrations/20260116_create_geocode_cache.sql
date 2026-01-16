-- Create geocode_cache table for persistent address-to-coordinates caching
-- This reduces API calls to Nominatim and Gemini by storing geocoding results

CREATE TABLE IF NOT EXISTS public.geocode_cache (
  address_hash TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  country TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_latitude CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT valid_longitude CHECK (longitude >= -180 AND longitude <= 180)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_geocode_cache_country ON public.geocode_cache(country);
CREATE INDEX IF NOT EXISTS idx_geocode_cache_cached_at ON public.geocode_cache(cached_at);

-- Add comments
COMMENT ON TABLE public.geocode_cache IS 'Persistent cache for geocoded addresses to reduce API calls';
COMMENT ON COLUMN public.geocode_cache.address_hash IS 'Hash of normalized address + country (used as primary key)';
COMMENT ON COLUMN public.geocode_cache.address IS 'Original address string (for reference)';
COMMENT ON COLUMN public.geocode_cache.cached_at IS 'When this geocode was cached (valid for 30 days)';

-- Enable Row Level Security (RLS)
ALTER TABLE public.geocode_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow Edge Functions to read/write
CREATE POLICY "Allow Edge Functions full access to geocode_cache"
  ON public.geocode_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read (for debugging/transparency)
CREATE POLICY "Allow authenticated users to read geocode_cache"
  ON public.geocode_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Automatic cleanup: Delete cached entries older than 90 days
-- This prevents the cache from growing indefinitely
CREATE OR REPLACE FUNCTION public.cleanup_old_geocode_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.geocode_cache
  WHERE cached_at < NOW() - INTERVAL '90 days';
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_geocode_cache IS 'Deletes geocode cache entries older than 90 days';
