-- Add test prospect for marketing system
INSERT INTO public.marketing_prospects (
  name,
  email,
  website,
  country,
  category,
  description,
  language,
  status,
  metadata
) VALUES (
  'Hunter - EventNexus Founder',
  'huntersest@gmail.com',
  'https://www.eventnexus.eu',
  'EE',
  'Technology',
  'EventNexus platform founder - testing AI marketing system with real platform data',
  'et',
  'new',
  '{"company": "EventNexus OÜ", "role": "Founder", "test": true}'::jsonb
)
ON CONFLICT (email) 
DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = 'new',
  metadata = EXCLUDED.metadata
RETURNING *;
