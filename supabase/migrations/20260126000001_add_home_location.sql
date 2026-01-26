-- Add home_location column to users table
-- This is the only missing piece causing 400 errors

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS home_location JSONB DEFAULT NULL;

COMMENT ON COLUMN public.users.home_location IS 'User home location with lat/lng coordinates: {"lat": 59.4370, "lng": 24.7536}';

-- Fix RLS policies to allow anon access where needed

-- Allow anon users to read ticket_templates (already has policy but let's ensure it)
DROP POLICY IF EXISTS "Anon can view active ticket templates" ON public.ticket_templates;
CREATE POLICY "Anon can view active ticket templates"
    ON public.ticket_templates FOR SELECT
    TO anon
    USING (is_active = true);

-- Allow anon users to read event_reviews
DROP POLICY IF EXISTS "Anon can view event reviews" ON public.event_reviews;
CREATE POLICY "Anon can view event reviews"
    ON public.event_reviews FOR SELECT
    TO anon
    USING (true);
