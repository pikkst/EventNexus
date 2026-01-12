-- Force re-fetch Visit Narva main events page by deleting its raw_events entry
-- This will make fetch-sources re-download the page with HTML cleaning applied

DELETE FROM public.raw_events 
WHERE source_id = (
  SELECT id FROM public.event_sources 
  WHERE url = 'https://visitnarva.ee/et/uritused-narvas'
  AND city_id = (SELECT city_id FROM public.city_configs WHERE city_name = 'Narva')
);

-- Show the source that will be re-fetched
SELECT id, url, source_score, created_at 
FROM public.event_sources 
WHERE url = 'https://visitnarva.ee/et/uritused-narvas'
AND city_id = (SELECT city_id FROM public.city_configs WHERE city_name = 'Narva');
