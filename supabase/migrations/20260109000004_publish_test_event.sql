-- Manually publish Fresh Test Event
-- This is a one-time fix for the test event that got stuck

INSERT INTO public.events (
  name,
  description,
  category,
  date,
  time,
  location,
  location_point,
  price,
  organizer_id,
  image,
  status,
  tags,
  import_source,
  confidence_score,
  city_id
)
SELECT 
  (structured_json->>'name')::TEXT,
  (structured_json->>'description')::TEXT,
  (structured_json->>'category')::TEXT,
  (structured_json->>'start_time')::TIMESTAMPTZ::DATE,
  (structured_json->>'start_time')::TIMESTAMPTZ::TIME,
  jsonb_build_object(
    'address', structured_json->>'location_address',
    'lat', (structured_json->>'location_lat')::NUMERIC,
    'lng', (structured_json->>'location_lng')::NUMERIC
  ),
  ST_SetSRID(
    ST_MakePoint(
      (structured_json->>'location_lng')::NUMERIC,
      (structured_json->>'location_lat')::NUMERIC
    ), 
    4326
  ),
  0,
  'f2ecf6c6-14c1-4dbd-894b-14ee6493d807', -- Admin user
  NULL, -- No image for now, we'll add AI generation later
  'active',
  ARRAY[(structured_json->>'category')::TEXT],
  'ai_agent',
  88,
  NULL -- Will be filled by trigger if city_id is in location
FROM public.parsed_events
WHERE id = 'bcac85ec-e419-4442-8ad3-3ea9c8b75462';

-- Link the confidence record to the published event
UPDATE public.event_confidence
SET event_id = (SELECT id FROM public.events WHERE name = 'Fresh Test Event' AND date = '2026-03-20')
WHERE parsed_event_id = 'bcac85ec-e419-4442-8ad3-3ea9c8b75462';

-- Create version record
INSERT INTO public.event_versions (event_id, version_number, changes_json, change_type)
SELECT 
  id,
  1,
  '{"type": "initial_creation", "source": "ai_agent"}'::JSONB,
  'ai_update'
FROM public.events
WHERE name = 'Fresh Test Event' AND date = '2026-03-20';

-- Log the decision
INSERT INTO public.ai_decision_log (
  event_id,
  parsed_event_id,
  decision_type,
  decision_result,
  reasoning,
  confidence_score,
  ai_model
)
SELECT 
  e.id,
  'bcac85ec-e419-4442-8ad3-3ea9c8b75462',
  'publish',
  'published_unclaimed',
  jsonb_build_object('confidence_score', 88, 'status', 'unclaimed'),
  88,
  'manual_publish'
FROM public.events e
WHERE e.name = 'Fresh Test Event' AND e.date = '2026-03-20';
