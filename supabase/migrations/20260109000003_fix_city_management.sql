-- Fix city_configs for UI management
-- Add latitude/longitude columns and admin RLS policies

-- Add latitude and longitude columns for simple coordinate storage
ALTER TABLE public.city_configs 
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);

-- Add index for coordinate lookups
CREATE INDEX IF NOT EXISTS idx_city_configs_coordinates 
  ON public.city_configs(latitude, longitude);

-- Add is_active column alias for UI compatibility
ALTER TABLE public.city_configs 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN;

-- Sync is_active with active column (active is the source of truth)
UPDATE public.city_configs SET is_active = active WHERE is_active IS NULL;

-- Create trigger to keep is_active synced with active
CREATE OR REPLACE FUNCTION sync_city_active_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_active := NEW.active;
  NEW.active := COALESCE(NEW.is_active, NEW.active);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER city_active_sync_trigger
  BEFORE INSERT OR UPDATE ON public.city_configs
  FOR EACH ROW
  EXECUTE FUNCTION sync_city_active_status();

-- Update geo_bounds from latitude/longitude when they exist
CREATE OR REPLACE FUNCTION update_geo_bounds_from_coords()
RETURNS TRIGGER AS $$
BEGIN
  -- If lat/lng are provided, create a simple point-based polygon (small bounding box)
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    -- Create a 0.1 degree (~11km) bounding box around the point
    NEW.geo_bounds := ST_MakeEnvelope(
      NEW.longitude - 0.05, 
      NEW.latitude - 0.05,
      NEW.longitude + 0.05, 
      NEW.latitude + 0.05,
      4326
    )::GEOMETRY;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER city_geo_bounds_sync_trigger
  BEFORE INSERT OR UPDATE ON public.city_configs
  FOR EACH ROW
  WHEN (NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL)
  EXECUTE FUNCTION update_geo_bounds_from_coords();

-- Extract latitude/longitude from existing geo_bounds (for display)
UPDATE public.city_configs
SET 
  latitude = ST_Y(ST_Centroid(geo_bounds)),
  longitude = ST_X(ST_Centroid(geo_bounds))
WHERE geo_bounds IS NOT NULL AND latitude IS NULL;

-- Add admin RLS policies for INSERT, UPDATE, DELETE
CREATE POLICY "Admins can insert city configs" 
  ON public.city_configs FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update city configs" 
  ON public.city_configs FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete city configs" 
  ON public.city_configs FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Comment on new columns
COMMENT ON COLUMN public.city_configs.latitude IS 'City center latitude for simple coordinate display';
COMMENT ON COLUMN public.city_configs.longitude IS 'City center longitude for simple coordinate display';
COMMENT ON COLUMN public.city_configs.is_active IS 'UI-friendly alias for active column';

-- Update existing test cities with proper coordinates
UPDATE public.city_configs SET latitude = 59.4370, longitude = 24.7536 WHERE city_name = 'Tallinn';
UPDATE public.city_configs SET latitude = 58.3780, longitude = 26.7290 WHERE city_name = 'Tartu';
UPDATE public.city_configs SET latitude = 58.3858, longitude = 24.4971 WHERE city_name = 'Pärnu';
UPDATE public.city_configs SET latitude = 59.3759, longitude = 28.1903 WHERE city_name = 'Narva';
UPDATE public.city_configs SET latitude = 58.3638, longitude = 25.5900 WHERE city_name = 'Viljandi';
UPDATE public.city_configs SET latitude = 52.5200, longitude = 13.4050 WHERE city_name = 'Berlin';

-- Delete duplicate test cities
DELETE FROM public.city_configs WHERE city_name IN ('Test City', 'TestCity');
