-- ============================================
-- EventNexus - Add Missing Components
-- ============================================
-- Based on diagnostic results, this adds only what's missing
-- ============================================

-- ============================================
-- STEP 1: Enable PostGIS for geospatial features
-- ============================================
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================
-- STEP 2: Add missing columns to USERS table
-- ============================================

-- Rename 'subscription' to 'subscription_tier' and update check constraint
DO $$ 
BEGIN
    -- Check if old subscription column exists and new one doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'subscription')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'subscription_tier') THEN
        ALTER TABLE public.users RENAME COLUMN subscription TO subscription_tier;
    END IF;
    
    -- Add subscription_tier if it doesn't exist at all
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'subscription_tier') THEN
        ALTER TABLE public.users ADD COLUMN subscription_tier TEXT NOT NULL DEFAULT 'free';
    END IF;

    -- Add agency_profile
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'agency_profile') THEN
        ALTER TABLE public.users ADD COLUMN agency_profile JSONB DEFAULT NULL;
    END IF;

    -- Add last_login
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'last_login') THEN
        ALTER TABLE public.users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Update role constraint to include all needed roles
DO $$
BEGIN
    -- Drop old constraint if it exists
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
    
    -- Add new constraint
    ALTER TABLE public.users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('user', 'admin', 'organizer', 'agency', 'attendee'));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Role constraint update skipped';
END $$;

-- Update subscription_tier constraint
DO $$
BEGIN
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_subscription_tier_check;
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_subscription_check;
    
    ALTER TABLE public.users ADD CONSTRAINT users_subscription_tier_check 
        CHECK (subscription_tier IN ('free', 'pro', 'premium', 'enterprise'));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Subscription constraint update skipped';
END $$;

-- ============================================
-- STEP 3: Add missing columns to EVENTS table
-- ============================================

DO $$ 
BEGIN
    -- Add location_point for geospatial queries
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'location_point') THEN
        ALTER TABLE public.events ADD COLUMN location_point GEOGRAPHY(POINT, 4326);
    END IF;

    -- Rename image_url to image if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'image_url')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'image') THEN
        ALTER TABLE public.events RENAME COLUMN image_url TO image;
    END IF;

    -- Rename max_attendees to max_capacity
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'max_attendees')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'max_capacity') THEN
        ALTER TABLE public.events RENAME COLUMN max_attendees TO max_capacity;
    END IF;

    -- Add tags array
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'tags') THEN
        ALTER TABLE public.events ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;

    -- Add status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'status') THEN
        ALTER TABLE public.events ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;

-- Add status constraint
DO $$
BEGIN
    ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_status_check;
    ALTER TABLE public.events ADD CONSTRAINT events_status_check 
        CHECK (status IN ('active', 'cancelled', 'completed', 'draft'));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Status constraint update skipped';
END $$;

-- Populate location_point from existing location JSONB
UPDATE public.events 
SET location_point = ST_SetSRID(
    ST_MakePoint(
        (location->>'lng')::float,
        (location->>'lat')::float
    ),
    4326
)
WHERE location IS NOT NULL AND location_point IS NULL;

-- ============================================
-- STEP 4: Add missing columns to NOTIFICATIONS table
-- ============================================

DO $$ 
BEGIN
    -- Rename is_read to "isRead" to match app expectations
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'is_read')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'isRead') THEN
        ALTER TABLE public.notifications RENAME COLUMN is_read TO "isRead";
    END IF;

    -- Add metadata
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'metadata') THEN
        ALTER TABLE public.notifications ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Add type constraint
DO $$
BEGIN
    ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
    ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
        CHECK (type IN ('proximity_radar', 'event_update', 'ticket_purchase', 'system', 'admin'));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notification type constraint update skipped';
END $$;

-- ============================================
-- STEP 5: Add missing columns to TICKETS table
-- ============================================

DO $$ 
BEGIN
    -- Rename purchased_at to purchase_date
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'purchased_at')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'purchase_date') THEN
        ALTER TABLE public.tickets RENAME COLUMN purchased_at TO purchase_date;
    END IF;

    -- Add price
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'price') THEN
        ALTER TABLE public.tickets ADD COLUMN price NUMERIC(10, 2) NOT NULL DEFAULT 0;
    END IF;

    -- Add ticket_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'ticket_type') THEN
        ALTER TABLE public.tickets ADD COLUMN ticket_type TEXT NOT NULL DEFAULT 'standard';
    END IF;

    -- Add used_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'used_at') THEN
        ALTER TABLE public.tickets ADD COLUMN used_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add metadata
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'metadata') THEN
        ALTER TABLE public.tickets ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Update status constraint
DO $$
BEGIN
    ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
    ALTER TABLE public.tickets ADD CONSTRAINT tickets_status_check 
        CHECK (status IN ('valid', 'used', 'cancelled', 'expired'));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Ticket status constraint update skipped';
END $$;

-- ============================================
-- STEP 6: Create analytics tables
-- ============================================

CREATE TABLE IF NOT EXISTS public.event_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    views INTEGER DEFAULT 0,
    ticket_sales INTEGER DEFAULT 0,
    revenue NUMERIC(10, 2) DEFAULT 0,
    conversion_rate NUMERIC(5, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, date)
);

CREATE TABLE IF NOT EXISTS public.platform_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_events INTEGER DEFAULT 0,
    total_users INTEGER DEFAULT 0,
    total_tickets INTEGER DEFAULT 0,
    total_revenue NUMERIC(12, 2) DEFAULT 0,
    active_sessions INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(metric_date)
);

CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    device_type TEXT
);

-- ============================================
-- STEP 7: Create indexes
-- ============================================

-- Geospatial index for events
CREATE INDEX IF NOT EXISTS idx_events_location_point ON public.events USING GIST(location_point);

-- Status indexes
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_tags ON public.events USING GIN(tags);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_event_date ON public.event_analytics(event_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_date ON public.platform_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.user_sessions(ended_at) WHERE ended_at IS NULL;

-- ============================================
-- STEP 8: Create geospatial functions
-- ============================================

-- Function to calculate distance between points (in km)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
DECLARE
    distance DOUBLE PRECISION;
BEGIN
    distance := ST_Distance(
        ST_SetSRID(ST_MakePoint(lon1, lat1), 4326)::geography,
        ST_SetSRID(ST_MakePoint(lon2, lat2), 4326)::geography
    ) / 1000.0;
    RETURN distance;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get nearby events
CREATE OR REPLACE FUNCTION get_nearby_events(
    user_lat DOUBLE PRECISION,
    user_lon DOUBLE PRECISION,
    radius_km DOUBLE PRECISION DEFAULT 10
)
RETURNS TABLE (
    event_id UUID,
    event_name TEXT,
    distance_km DOUBLE PRECISION,
    event_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        ST_Distance(
            e.location_point,
            ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography
        ) / 1000.0 AS distance,
        to_jsonb(e.*) AS event_data
    FROM public.events e
    WHERE e.status = 'active'
        AND e.location_point IS NOT NULL
        AND ST_DWithin(
            e.location_point,
            ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography,
            radius_km * 1000
        )
    ORDER BY distance;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to update event location_point when location JSONB changes
CREATE OR REPLACE FUNCTION update_event_location_point()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.location IS NOT NULL THEN
        NEW.location_point = ST_SetSRID(
            ST_MakePoint(
                (NEW.location->>'lng')::float,
                (NEW.location->>'lat')::float
            ),
            4326
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update event analytics
CREATE OR REPLACE FUNCTION update_event_analytics(
    p_event_id UUID,
    p_views INTEGER DEFAULT 0,
    p_ticket_sales INTEGER DEFAULT 0,
    p_revenue NUMERIC DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.event_analytics (event_id, date, views, ticket_sales, revenue)
    VALUES (p_event_id, CURRENT_DATE, p_views, p_ticket_sales, p_revenue)
    ON CONFLICT (event_id, date) 
    DO UPDATE SET
        views = event_analytics.views + EXCLUDED.views,
        ticket_sales = event_analytics.ticket_sales + EXCLUDED.ticket_sales,
        revenue = event_analytics.revenue + EXCLUDED.revenue,
        conversion_rate = CASE 
            WHEN (event_analytics.views + EXCLUDED.views) > 0 
            THEN ((event_analytics.ticket_sales + EXCLUDED.ticket_sales)::numeric / (event_analytics.views + EXCLUDED.views)::numeric * 100)
            ELSE 0
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update platform metrics
CREATE OR REPLACE FUNCTION update_platform_metrics()
RETURNS VOID AS $$
DECLARE
    v_total_events INTEGER;
    v_total_users INTEGER;
    v_total_tickets INTEGER;
    v_total_revenue NUMERIC;
BEGIN
    SELECT COUNT(*) INTO v_total_events FROM public.events WHERE status = 'active';
    SELECT COUNT(*) INTO v_total_users FROM public.users;
    SELECT COUNT(*) INTO v_total_tickets FROM public.tickets WHERE status = 'valid';
    SELECT COALESCE(SUM(price), 0) INTO v_total_revenue FROM public.tickets WHERE status IN ('valid', 'used');
    
    INSERT INTO public.platform_metrics (
        metric_date, total_events, total_users, total_tickets, total_revenue
    )
    VALUES (
        CURRENT_DATE, v_total_events, v_total_users, v_total_tickets, v_total_revenue
    )
    ON CONFLICT (metric_date)
    DO UPDATE SET
        total_events = EXCLUDED.total_events,
        total_users = EXCLUDED.total_users,
        total_tickets = EXCLUDED.total_tickets,
        total_revenue = EXCLUDED.total_revenue;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 9: Create/Update triggers
-- ============================================

-- Drop old trigger if exists, create new one
DROP TRIGGER IF EXISTS update_event_location_point_trigger ON public.events;
CREATE TRIGGER update_event_location_point_trigger
    BEFORE INSERT OR UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION update_event_location_point();

-- ============================================
-- STEP 10: Enable RLS on new tables
-- ============================================

ALTER TABLE public.event_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 11: Create RLS policies for new tables
-- ============================================

-- Analytics policies
CREATE POLICY "Organizers can view analytics for their events"
    ON public.event_analytics FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.events WHERE id = event_analytics.event_id AND organizer_id = auth.uid()));

CREATE POLICY "Admins can view all analytics"
    ON public.event_analytics FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Platform metrics policies (admin only)
CREATE POLICY "Admins can view platform metrics"
    ON public.platform_metrics FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- User sessions policies
CREATE POLICY "Users can view their own sessions"
    ON public.user_sessions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions"
    ON public.user_sessions FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- STEP 12: Update existing policies for enhanced security
-- ============================================

-- Drop and recreate event policies to include status checks
DROP POLICY IF EXISTS "Anyone can view public events" ON public.events;
CREATE POLICY "Anyone can view active events"
    ON public.events FOR SELECT
    USING (status = 'active' OR organizer_id = auth.uid());

DROP POLICY IF EXISTS "Organizers can manage their events" ON public.events;
CREATE POLICY "Organizers can update their own events"
    ON public.events FOR UPDATE
    USING (organizer_id = auth.uid());

CREATE POLICY "Organizers can delete their own events"
    ON public.events FOR DELETE
    USING (organizer_id = auth.uid());

CREATE POLICY "Admins can manage all events"
    ON public.events FOR ALL
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Add policy for system to create notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true);

-- ============================================
-- STEP 13: Grant permissions
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sessions TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;

-- ============================================
-- STEP 14: Initialize data
-- ============================================

-- Initial platform metrics
INSERT INTO public.platform_metrics (metric_date, total_events, total_users, total_tickets, total_revenue)
VALUES (CURRENT_DATE, 0, 0, 0, 0)
ON CONFLICT (metric_date) DO NOTHING;

-- ============================================
-- SUCCESS
-- ============================================

DO $$ 
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE 'Added: PostGIS extension, missing columns, analytics tables, geospatial functions';
    RAISE NOTICE 'Updated: RLS policies, triggers, constraints';
END $$;
