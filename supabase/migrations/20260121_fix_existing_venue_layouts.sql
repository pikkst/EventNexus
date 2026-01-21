-- Fix existing events that have venue layouts but missing has_seating flag
-- This migration updates events that have associated venue layouts but don't have the proper flags set

-- Update events table to set has_seating=true and venue_layout_id for events that have venue layouts
UPDATE events e
SET 
    has_seating = true,
    venue_layout_id = vl.id
FROM venue_layouts vl
WHERE 
    e.id = vl.event_id 
    AND (e.has_seating IS NULL OR e.has_seating = false OR e.venue_layout_id IS NULL);

-- Verify the update
SELECT 
    e.id,
    e.name,
    e.has_seating,
    e.venue_layout_id,
    vl.name as venue_layout_name
FROM events e
INNER JOIN venue_layouts vl ON e.id = vl.event_id
WHERE e.has_seating = true
ORDER BY e.created_at DESC;
