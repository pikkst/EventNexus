-- Add agency_slug column to users table for custom URL slugs
-- This allows Enterprise tier users to have custom URLs like eventnexus.eu/#/agency/their-company

DO $$ 
BEGIN
    -- Add agency_slug column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'agency_slug') THEN
        ALTER TABLE public.users ADD COLUMN agency_slug TEXT UNIQUE;
    END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_agency_slug ON public.users(agency_slug);

-- Add comment explaining the column
COMMENT ON COLUMN public.users.agency_slug IS 'Custom URL slug for agency profile pages (e.g., "acme-events" for eventnexus.eu/#/agency/acme-events)';

-- Optional: Backfill existing users with slugs based on their names
-- This generates slugs from names for existing users who don't have one
UPDATE public.users 
SET agency_slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE agency_slug IS NULL 
  AND name IS NOT NULL
  AND subscription_tier IN ('pro', 'premium', 'enterprise');
