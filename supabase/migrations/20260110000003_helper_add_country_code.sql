-- Helper function for admins to add new country code mappings
-- Usage: SELECT add_country_code_mapping('Country Name', 'cc', ARRAY['Alternative Name 1', 'Alt 2']);

CREATE OR REPLACE FUNCTION public.add_country_code_mapping(
  p_country_name TEXT,
  p_country_code TEXT,
  p_alternative_names TEXT[] DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
  existing_code TEXT;
BEGIN
  -- Validate inputs
  IF p_country_name IS NULL OR p_country_name = '' THEN
    RAISE EXCEPTION 'Country name cannot be empty';
  END IF;
  
  IF p_country_code IS NULL OR p_country_code = '' THEN
    RAISE EXCEPTION 'Country code cannot be empty';
  END IF;
  
  -- Validate country code format (2 lowercase letters)
  IF p_country_code !~ '^[a-z]{2}$' THEN
    RAISE EXCEPTION 'Country code must be 2 lowercase letters (ISO 3166-1 alpha-2)';
  END IF;
  
  -- Check if already exists
  SELECT country_code INTO existing_code
  FROM public.country_codes
  WHERE LOWER(country_name) = LOWER(p_country_name);
  
  IF existing_code IS NOT NULL THEN
    -- Update existing entry
    UPDATE public.country_codes
    SET country_code = p_country_code,
        alternative_names = p_alternative_names,
        updated_at = NOW()
    WHERE LOWER(country_name) = LOWER(p_country_name);
    
    RAISE NOTICE 'Updated country code mapping: % -> %', p_country_name, p_country_code;
  ELSE
    -- Insert new entry
    INSERT INTO public.country_codes (country_name, country_code, alternative_names)
    VALUES (p_country_name, p_country_code, p_alternative_names);
    
    RAISE NOTICE 'Added new country code mapping: % -> %', p_country_name, p_country_code;
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to add country code mapping: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only admins can execute this function
REVOKE EXECUTE ON FUNCTION public.add_country_code_mapping FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_country_code_mapping TO authenticated;

-- Example usage (commented out):
-- SELECT add_country_code_mapping('Georgia', 'ge', ARRAY['საქართველო', 'Sakartvelo']);
-- SELECT add_country_code_mapping('Costa Rica', 'cr', ARRAY['República de Costa Rica']);
