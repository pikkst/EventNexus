-- Enhanced proximity radar system for smart event notifications
-- This migration adds support for active event notifications with ticket availability

-- ============================================
-- STEP 1: Add new notification type
-- ============================================

-- The notification type enum already includes 'active_event' in types.ts
-- Supabase will handle this automatically through the insert operations

-- ============================================
-- STEP 2: Create enhanced function for nearby events with ticket info
-- ============================================

CREATE OR REPLACE FUNCTION get_nearby_events_with_tickets(
    user_lat DOUBLE PRECISION,
    user_lon DOUBLE PRECISION,
    radius_km DOUBLE PRECISION DEFAULT 10,
    min_tickets INTEGER DEFAULT 1,
    upcoming_window_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    event_id UUID,
    event_name TEXT,
    distance_km DOUBLE PRECISION,
    event_data JSONB,
    available_tickets INTEGER,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    status TEXT
) AS $$
DECLARE
    now_time TIMESTAMPTZ := NOW();
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        ST_Distance(
            e.location_point,
            ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography
        ) / 1000.0 AS distance,
        to_jsonb(e.*) AS event_data,
        COALESCE(
            (e.max_capacity - e.attendees_count),
            999
        ) AS available_tickets,
        (e.date || ' ' || e.time)::TIMESTAMPTZ AS starts_at,
        CASE 
            WHEN e.end_date IS NOT NULL AND e.end_time IS NOT NULL 
            THEN (e.end_date || ' ' || e.end_time)::TIMESTAMPTZ
            ELSE NULL
        END AS ends_at,
        CASE
            -- Event is currently active (started but not ended)
            WHEN (e.date || ' ' || e.time)::TIMESTAMPTZ <= now_time
                AND (
                    e.end_date IS NULL 
                    OR (e.end_date || ' ' || COALESCE(e.end_time, '23:59:59'))::TIMESTAMPTZ > now_time
                )
            THEN 
                -- Check if ending within 2 hours
                CASE 
                    WHEN e.end_date IS NOT NULL 
                        AND (e.end_date || ' ' || COALESCE(e.end_time, '23:59:59'))::TIMESTAMPTZ <= (now_time + INTERVAL '2 hours')
                    THEN 'ending_soon'
                    ELSE 'active'
                END
            -- Event is upcoming (within the specified window)
            WHEN (e.date || ' ' || e.time)::TIMESTAMPTZ > now_time
                AND (e.date || ' ' || e.time)::TIMESTAMPTZ <= (now_time + (upcoming_window_hours || ' hours')::INTERVAL)
            THEN 'upcoming'
            ELSE 'other'
        END AS status
    FROM public.events e
    WHERE e.status = 'active'
        AND e.visibility = 'public'
        AND e.location_point IS NOT NULL
        -- Within search radius
        AND ST_DWithin(
            e.location_point,
            ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography,
            radius_km * 1000
        )
        -- Has minimum available tickets
        AND (e.max_capacity - e.attendees_count) >= min_tickets
        -- Event hasn't ended yet or is currently active
        AND (
            e.end_date IS NULL 
            OR (e.end_date || ' ' || COALESCE(e.end_time, '23:59:59'))::TIMESTAMPTZ > now_time
        )
        -- Only events that are happening now or starting soon
        AND (
            -- Currently active
            (e.date || ' ' || e.time)::TIMESTAMPTZ <= now_time
            OR
            -- Starting within window
            (e.date || ' ' || e.time)::TIMESTAMPTZ <= (now_time + (upcoming_window_hours || ' hours')::INTERVAL)
        )
    ORDER BY 
        -- Prioritize by status: active > ending_soon > upcoming
        CASE 
            WHEN (e.date || ' ' || e.time)::TIMESTAMPTZ <= now_time THEN 1
            ELSE 2
        END,
        -- Then by distance
        distance;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- STEP 3: Add helpful indexes for performance
-- ============================================

-- Index for event status and dates (if not exists)
CREATE INDEX IF NOT EXISTS idx_events_status_date 
ON public.events(status, date, time) 
WHERE status = 'active';

-- Index for event location and visibility
CREATE INDEX IF NOT EXISTS idx_events_location_visibility 
ON public.events(location_point, visibility) 
WHERE status = 'active' AND visibility = 'public';

-- Index for attendees count for ticket availability queries
CREATE INDEX IF NOT EXISTS idx_events_ticket_availability 
ON public.events(max_capacity, attendees_count) 
WHERE status = 'active';

-- Index for notifications by user and type
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_date 
ON public.notifications(user_id, type, created_at);

-- ============================================
-- STEP 4: Grant execute permissions
-- ============================================

GRANT EXECUTE ON FUNCTION get_nearby_events_with_tickets TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_events_with_tickets TO anon;

-- ============================================
-- STEP 5: Add comment for documentation
-- ============================================

COMMENT ON FUNCTION get_nearby_events_with_tickets IS 
'Enhanced proximity radar function that returns nearby events with ticket availability information and event status (active/upcoming/ending_soon). Used for smart notifications about events happening now or starting soon.';
