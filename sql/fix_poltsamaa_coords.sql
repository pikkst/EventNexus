-- SQL Script to fix/remove wrongly geocoded events in Põltsamaa
-- These were geocoded to Jõgeva (approx 40km away) due to Gemini hallucination

-- Option 1: Delete the wrong events so they can be re-discovered correctly
DELETE FROM events 
WHERE city_id = '3251de4e-c68b-4bba-bddb-700d03dd47a8' 
  AND import_source = 'ai_agent'
  AND (
    -- Check for coordinates that are near Jõgeva (lng approx 26.39) instead of Põltsamaa (lng approx 25.96)
    ST_Distance(
      location_point, 
      ST_SetSRID(ST_MakePoint(26.386, 58.654), 4326)::geography
    ) < 5000 -- Within 5km of the wrong "Jõgeva" longitude but same latitude
  );

-- Option 2: Also clear the processing status of raw events to allow re-parsing if needed
-- (Though the events will likely be picked up again by the next discover run anyway)
UPDATE raw_events 
SET processing_status = 'pending'
WHERE id IN (
  SELECT raw_event_id 
  FROM parsed_events pe
  JOIN event_confidence ec ON ec.parsed_event_id = pe.id
  WHERE pe.city_id = '3251de4e-c68b-4bba-bddb-700d03dd47a8'
);
