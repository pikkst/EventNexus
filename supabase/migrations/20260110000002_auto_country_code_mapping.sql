-- Automatic Country Code Detection System
-- Automatically maps country names to ISO 3166-1 alpha-2 codes for new cities

-- 1. Create country_codes mapping table
CREATE TABLE IF NOT EXISTS public.country_codes (
  id SERIAL PRIMARY KEY,
  country_name TEXT NOT NULL UNIQUE,
  country_code TEXT NOT NULL,
  alternative_names TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE public.country_codes IS 'Mapping table for country names to ISO 3166-1 alpha-2 codes';
COMMENT ON COLUMN public.country_codes.country_name IS 'Primary country name (English)';
COMMENT ON COLUMN public.country_codes.country_code IS 'ISO 3166-1 alpha-2 code (lowercase for Nominatim)';
COMMENT ON COLUMN public.country_codes.alternative_names IS 'Alternative country names (local languages, etc.)';

-- 2. Populate country codes mapping
INSERT INTO public.country_codes (country_name, country_code, alternative_names) VALUES
-- Europe
('Estonia', 'ee', ARRAY['Eesti', 'Estland']),
('Netherlands', 'nl', ARRAY['Nederland', 'Holland']),
('Andorra', 'ad', ARRAY['Andorre']),
('Turkey', 'tr', ARRAY['Türkiye', 'Turkiye']),
('Azerbaijan', 'az', ARRAY['Azərbaycan']),
('Germany', 'de', ARRAY['Deutschland', 'Allemagne']),
('Switzerland', 'ch', ARRAY['Schweiz', 'Suisse', 'Svizzera', 'Svizra']),
('Slovakia', 'sk', ARRAY['Slovensko']),
('Belgium', 'be', ARRAY['België', 'Belgique', 'Belgien']),
('Romania', 'ro', ARRAY['România']),
('Hungary', 'hu', ARRAY['Magyarország']),
('Moldova', 'md', ARRAY['Republica Moldova']),
('United Kingdom', 'gb', ARRAY['UK', 'Great Britain', 'England', 'Scotland', 'Wales', 'Northern Ireland']),
('Vatican City', 'va', ARRAY['Holy See', 'Città del Vaticano']),
('Ireland', 'ie', ARRAY['Éire', 'Poblacht na hÉireann']),
('Finland', 'fi', ARRAY['Suomi']),
('Malta', 'mt', ARRAY['Repubblika ta'' Malta']),
('Denmark', 'dk', ARRAY['Danmark']),
('Luxembourg', 'lu', ARRAY['Lëtzebuerg', 'Luxemburg']),
('Portugal', 'pt', ARRAY['República Portuguesa']),
('Slovenia', 'si', ARRAY['Slovenija']),
('Spain', 'es', ARRAY['España', 'Espana']),
('Monaco', 'mc', ARRAY['Principauté de Monaco']),
('Norway', 'no', ARRAY['Norge', 'Noreg']),
('France', 'fr', ARRAY['République française']),
('Montenegro', 'me', ARRAY['Crna Gora']),
('Czechia', 'cz', ARRAY['Czech Republic', 'Česká republika', 'Česko']),
('Iceland', 'is', ARRAY['Ísland']),
('Italy', 'it', ARRAY['Italia', 'Repubblica Italiana']),
('San Marino', 'sm', ARRAY['Repubblica di San Marino']),
('Bosnia and Herzegovina', 'ba', ARRAY['Bosna i Hercegovina']),
('Sweden', 'se', ARRAY['Sverige']),
('Albania', 'al', ARRAY['Shqipëri', 'Shqipëria']),
('Liechtenstein', 'li', ARRAY['Fürstentum Liechtenstein']),
('Lithuania', 'lt', ARRAY['Lietuva']),
('Poland', 'pl', ARRAY['Polska']),
('Austria', 'at', ARRAY['Österreich', 'Osterreich']),
('Croatia', 'hr', ARRAY['Hrvatska']),
('Greece', 'gr', ARRAY['Ελλάδα', 'Ellada', 'Hellas']),
('Cyprus', 'cy', ARRAY['Κύπρος', 'Kıbrıs']),
('Kazakhstan', 'kz', ARRAY['Қазақстан', 'Qazaqstan']),
('Serbia', 'rs', ARRAY['Србија', 'Srbija']),
('Ukraine', 'ua', ARRAY['Україна', 'Ukraina']),
('Belarus', 'by', ARRAY['Беларусь', 'Bielaruś']),
('Russia', 'ru', ARRAY['Россия', 'Rossiya', 'Russian Federation']),
('North Macedonia', 'mk', ARRAY['Macedonia', 'Македонија', 'Makedonija']),
('Bulgaria', 'bg', ARRAY['България', 'Balgariya']),
('Armenia', 'am', ARRAY['Հայաստան', 'Hayastan']),
('Latvia', 'lv', ARRAY['Latvija']),

-- Americas
('United States', 'us', ARRAY['USA', 'US', 'America', 'United States of America']),
('Canada', 'ca', ARRAY[]::text[]),
('Mexico', 'mx', ARRAY['México', 'Estados Unidos Mexicanos']),
('Brazil', 'br', ARRAY['Brasil']),
('Argentina', 'ar', ARRAY['República Argentina']),
('Chile', 'cl', ARRAY['República de Chile']),

-- Asia
('Japan', 'jp', ARRAY['日本', 'Nippon', 'Nihon']),
('China', 'cn', ARRAY['中国', 'Zhongguo', 'People''s Republic of China', 'PRC']),
('South Korea', 'kr', ARRAY['Korea', '대한민국', 'Republic of Korea']),
('India', 'in', ARRAY['भारत', 'Bharat']),
('Thailand', 'th', ARRAY['ประเทศไทย', 'Prathet Thai']),
('Singapore', 'sg', ARRAY['新加坡', 'Singapura']),
('Malaysia', 'my', ARRAY[]::text[]),
('Indonesia', 'id', ARRAY['Republik Indonesia']),
('Vietnam', 'vn', ARRAY['Việt Nam']),
('Philippines', 'ph', ARRAY['Pilipinas']),

-- Oceania
('Australia', 'au', ARRAY['Commonwealth of Australia']),
('New Zealand', 'nz', ARRAY['Aotearoa'])

ON CONFLICT (country_name) DO UPDATE 
  SET country_code = EXCLUDED.country_code,
      alternative_names = EXCLUDED.alternative_names,
      updated_at = NOW();

-- 3. Create function to automatically detect and set country_code
CREATE OR REPLACE FUNCTION public.auto_set_country_code()
RETURNS TRIGGER AS $$
DECLARE
  detected_code TEXT;
BEGIN
  -- Only run if country_code is NULL or empty
  IF NEW.country_code IS NULL OR NEW.country_code = '' THEN
    -- Try exact match first
    SELECT country_code INTO detected_code
    FROM public.country_codes
    WHERE LOWER(country_name) = LOWER(NEW.country)
    LIMIT 1;
    
    -- If no exact match, try alternative names
    IF detected_code IS NULL THEN
      SELECT country_code INTO detected_code
      FROM public.country_codes
      WHERE LOWER(NEW.country) = ANY(
        SELECT LOWER(unnest(alternative_names))
      )
      LIMIT 1;
    END IF;
    
    -- If still no match, try partial match (contains)
    IF detected_code IS NULL THEN
      SELECT country_code INTO detected_code
      FROM public.country_codes
      WHERE LOWER(country_name) LIKE '%' || LOWER(NEW.country) || '%'
         OR LOWER(NEW.country) LIKE '%' || LOWER(country_name) || '%'
      LIMIT 1;
    END IF;
    
    -- Set the detected code (or NULL if not found)
    NEW.country_code := detected_code;
    
    -- Log if not found for manual review
    IF detected_code IS NULL THEN
      RAISE WARNING 'Could not auto-detect country_code for country: %. Please add to country_codes table.', NEW.country;
    ELSE
      RAISE NOTICE 'Auto-detected country_code "%" for country "%"', detected_code, NEW.country;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger on city_configs
DROP TRIGGER IF EXISTS auto_set_country_code_trigger ON public.city_configs;
CREATE TRIGGER auto_set_country_code_trigger
  BEFORE INSERT OR UPDATE OF country ON public.city_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_country_code();

-- 5. Backfill existing cities that don't have country_code
UPDATE public.city_configs
SET country_code = cc.country_code
FROM public.country_codes cc
WHERE city_configs.country_code IS NULL
  AND LOWER(city_configs.country) = LOWER(cc.country_name);

-- 6. Log cities that still don't have country_code
DO $$
DECLARE
  missing_cities TEXT;
BEGIN
  SELECT string_agg(DISTINCT country, ', ')
  INTO missing_cities
  FROM public.city_configs
  WHERE country_code IS NULL;
  
  IF missing_cities IS NOT NULL THEN
    RAISE WARNING 'Cities without country_code (need manual mapping): %', missing_cities;
  ELSE
    RAISE NOTICE 'All cities have country_codes assigned! ✓';
  END IF;
END $$;

-- 7. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_country_codes_name 
  ON public.country_codes(LOWER(country_name));

-- 8. Enable RLS (admin only can modify)
ALTER TABLE public.country_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage country codes"
  ON public.country_codes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

CREATE POLICY "Everyone can read country codes"
  ON public.country_codes
  FOR SELECT
  TO public
  USING (true);
