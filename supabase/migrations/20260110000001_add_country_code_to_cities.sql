-- Add country_code column to city_configs for geocoding
-- This enables the AI pipeline to use country-specific geocoding instead of hardcoded Estonia

ALTER TABLE public.city_configs 
  ADD COLUMN IF NOT EXISTS country_code TEXT;

-- Update country codes for existing cities
-- ISO 3166-1 alpha-2 codes (lowercase for Nominatim API)

-- Estonia
UPDATE public.city_configs SET country_code = 'ee' WHERE country = 'Estonia';

-- Europe
UPDATE public.city_configs SET country_code = 'nl' WHERE country = 'Netherlands';
UPDATE public.city_configs SET country_code = 'ad' WHERE country = 'Andorra';
UPDATE public.city_configs SET country_code = 'tr' WHERE country = 'Turkey';
UPDATE public.city_configs SET country_code = 'az' WHERE country = 'Azerbaijan';
UPDATE public.city_configs SET country_code = 'de' WHERE country = 'Germany';
UPDATE public.city_configs SET country_code = 'ch' WHERE country = 'Switzerland';
UPDATE public.city_configs SET country_code = 'sk' WHERE country = 'Slovakia';
UPDATE public.city_configs SET country_code = 'be' WHERE country = 'Belgium';
UPDATE public.city_configs SET country_code = 'ro' WHERE country = 'Romania';
UPDATE public.city_configs SET country_code = 'hu' WHERE country = 'Hungary';
UPDATE public.city_configs SET country_code = 'md' WHERE country = 'Moldova';
UPDATE public.city_configs SET country_code = 'gb' WHERE country = 'United Kingdom';
UPDATE public.city_configs SET country_code = 'va' WHERE country = 'Vatican City';
UPDATE public.city_configs SET country_code = 'ie' WHERE country = 'Ireland';
UPDATE public.city_configs SET country_code = 'fi' WHERE country = 'Finland';
UPDATE public.city_configs SET country_code = 'mt' WHERE country = 'Malta';
UPDATE public.city_configs SET country_code = 'dk' WHERE country = 'Denmark';
UPDATE public.city_configs SET country_code = 'lu' WHERE country = 'Luxembourg';
UPDATE public.city_configs SET country_code = 'pt' WHERE country = 'Portugal';
UPDATE public.city_configs SET country_code = 'si' WHERE country = 'Slovenia';
UPDATE public.city_configs SET country_code = 'es' WHERE country = 'Spain';
UPDATE public.city_configs SET country_code = 'mc' WHERE country = 'Monaco';
UPDATE public.city_configs SET country_code = 'no' WHERE country = 'Norway';
UPDATE public.city_configs SET country_code = 'fr' WHERE country = 'France';
UPDATE public.city_configs SET country_code = 'me' WHERE country = 'Montenegro';
UPDATE public.city_configs SET country_code = 'cz' WHERE country = 'Czechia';
UPDATE public.city_configs SET country_code = 'is' WHERE country = 'Iceland';
UPDATE public.city_configs SET country_code = 'it' WHERE country = 'Italy';
UPDATE public.city_configs SET country_code = 'sm' WHERE country = 'San Marino';
UPDATE public.city_configs SET country_code = 'ba' WHERE country = 'Bosnia and Herzegovina';
UPDATE public.city_configs SET country_code = 'se' WHERE country = 'Sweden';
UPDATE public.city_configs SET country_code = 'al' WHERE country = 'Albania';
UPDATE public.city_configs SET country_code = 'li' WHERE country = 'Liechtenstein';
UPDATE public.city_configs SET country_code = 'lt' WHERE country = 'Lithuania';
UPDATE public.city_configs SET country_code = 'pl' WHERE country = 'Poland';
UPDATE public.city_configs SET country_code = 'at' WHERE country = 'Austria';
UPDATE public.city_configs SET country_code = 'hr' WHERE country = 'Croatia';
UPDATE public.city_configs SET country_code = 'gr' WHERE country = 'Greece';
UPDATE public.city_configs SET country_code = 'cy' WHERE country = 'Cyprus';
UPDATE public.city_configs SET country_code = 'kz' WHERE country = 'Kazakhstan';
UPDATE public.city_configs SET country_code = 'rs' WHERE country = 'Serbia';
UPDATE public.city_configs SET country_code = 'ua' WHERE country = 'Ukraine';
UPDATE public.city_configs SET country_code = 'by' WHERE country = 'Belarus';
UPDATE public.city_configs SET country_code = 'ru' WHERE country = 'Russia';
UPDATE public.city_configs SET country_code = 'mk' WHERE country = 'North Macedonia';
UPDATE public.city_configs SET country_code = 'bg' WHERE country = 'Bulgaria';
UPDATE public.city_configs SET country_code = 'am' WHERE country = 'Armenia';

-- United States
UPDATE public.city_configs SET country_code = 'us' WHERE country = 'United States';

-- Add comment
COMMENT ON COLUMN public.city_configs.country_code IS 'ISO 3166-1 alpha-2 country code (lowercase) for Nominatim geocoding API';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_city_configs_country_code ON public.city_configs(country_code);
