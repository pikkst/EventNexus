-- ============================================
-- EventNexus Complete Database Schema
-- ============================================
-- This migration creates all tables, indexes, RLS policies,
-- triggers, and functions for the EventNexus platform.
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================
-- TABLES
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'organizer', 'agency')),
    subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium', 'enterprise')),
    notification_prefs JSONB DEFAULT '{
        "proximityAlerts": true,
        "eventUpdates": true,
        "interestedCategories": [],
        "alertRadius": 10
    }'::jsonb,
    agency_profile JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table with geospatial support
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    location JSONB NOT NULL,
    location_point GEOGRAPHY(POINT, 4326),
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    organizer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    image TEXT,
    attendees_count INTEGER DEFAULT 0,
    max_capacity INTEGER,
    tags TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed', 'draft')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('proximity_radar', 'event_update', 'ticket_purchase', 'system', 'admin')),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    sender_name TEXT,
    "isRead" BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    ticket_type TEXT NOT NULL DEFAULT 'standard',
    price NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'cancelled', 'expired')),
    qr_code TEXT NOT NULL UNIQUE,
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Event Analytics table for tracking
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

-- Platform metrics for admin monitoring
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

-- User sessions for tracking
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
-- INDEXES
-- ============================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_subscription ON public.users(subscription_tier);

-- Event indexes
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON public.events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_location_point ON public.events USING GIST(location_point);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON public.notifications(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, "isRead") WHERE "isRead" = FALSE;

-- Ticket indexes
CREATE INDEX IF NOT EXISTS idx_tickets_event ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_qr ON public.tickets(qr_code);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_event_date ON public.event_analytics(event_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_date ON public.platform_metrics(metric_date DESC);

-- Session indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.user_sessions(ended_at) WHERE ended_at IS NULL;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update location_point from location JSONB
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
    ) / 1000.0; -- Convert meters to kilometers
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
        AND ST_DWithin(
            e.location_point,
            ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography,
            radius_km * 1000
        )
    ORDER BY distance;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

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
        metric_date,
        total_events,
        total_users,
        total_tickets,
        total_revenue
    )
    VALUES (
        CURRENT_DATE,
        v_total_events,
        v_total_users,
        v_total_tickets,
        v_total_revenue
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
-- TRIGGERS
-- ============================================

-- Updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Location point trigger
CREATE TRIGGER update_event_location_point_trigger
    BEFORE INSERT OR UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION update_event_location_point();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
    ON public.users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all users"
    ON public.users FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Events policies
CREATE POLICY "Anyone can view active events"
    ON public.events FOR SELECT
    USING (status = 'active' OR organizer_id = auth.uid());

CREATE POLICY "Organizers can create events"
    ON public.events FOR INSERT
    WITH CHECK (
        auth.uid() = organizer_id AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() 
            AND role IN ('organizer', 'agency', 'admin')
        )
    );

CREATE POLICY "Organizers can update their own events"
    ON public.events FOR UPDATE
    USING (organizer_id = auth.uid());

CREATE POLICY "Organizers can delete their own events"
    ON public.events FOR DELETE
    USING (organizer_id = auth.uid());

CREATE POLICY "Admins can manage all events"
    ON public.events FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
    ON public.notifications FOR DELETE
    USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true);

-- Tickets policies
CREATE POLICY "Users can view their own tickets"
    ON public.tickets FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Event organizers can view tickets for their events"
    ON public.tickets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE id = tickets.event_id
            AND organizer_id = auth.uid()
        )
    );

CREATE POLICY "Users can purchase tickets"
    ON public.tickets FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all tickets"
    ON public.tickets FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Analytics policies
CREATE POLICY "Organizers can view analytics for their events"
    ON public.event_analytics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE id = event_analytics.event_id
            AND organizer_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all analytics"
    ON public.event_analytics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Platform metrics policies (admin only)
CREATE POLICY "Admins can view platform metrics"
    ON public.platform_metrics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- User sessions policies
CREATE POLICY "Users can view their own sessions"
    ON public.user_sessions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions"
    ON public.user_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- GRANTS
-- ============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant access to tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;

-- ============================================
-- INITIAL DATA SEEDING (optional)
-- ============================================

-- Create default admin user (update with your email)
-- This will be done separately via confirm-admin-user.sql

-- Initial platform metrics
INSERT INTO public.platform_metrics (metric_date, total_events, total_users, total_tickets, total_revenue)
VALUES (CURRENT_DATE, 0, 0, 0, 0)
ON CONFLICT (metric_date) DO NOTHING;

COMMENT ON TABLE public.users IS 'User accounts with role-based access';
COMMENT ON TABLE public.events IS 'Events with geospatial location support';
COMMENT ON TABLE public.notifications IS 'User notifications including proximity alerts';
COMMENT ON TABLE public.tickets IS 'Event tickets with QR codes';
COMMENT ON TABLE public.event_analytics IS 'Daily analytics per event';
COMMENT ON TABLE public.platform_metrics IS 'Platform-wide metrics for admin monitoring';
COMMENT ON TABLE public.user_sessions IS 'User session tracking';
