-- ============================================
-- EventNexus SAFE Migration Script
-- ============================================
-- This script safely handles existing tables and adds missing components
-- Run the diagnostic script (00000000000000_check_database_state.sql) first!
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================
-- STEP 1: Drop existing policies (safe to re-run)
-- ============================================

DO $$ 
BEGIN
    -- Drop all existing policies
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
    DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
    DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
    DROP POLICY IF EXISTS "Anyone can view active events" ON public.events;
    DROP POLICY IF EXISTS "Organizers can create events" ON public.events;
    DROP POLICY IF EXISTS "Organizers can update their own events" ON public.events;
    DROP POLICY IF EXISTS "Organizers can delete their own events" ON public.events;
    DROP POLICY IF EXISTS "Admins can manage all events" ON public.events;
    DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Users can view their own tickets" ON public.tickets;
    DROP POLICY IF EXISTS "Event organizers can view tickets for their events" ON public.tickets;
    DROP POLICY IF EXISTS "Users can purchase tickets" ON public.tickets;
    DROP POLICY IF EXISTS "Admins can manage all tickets" ON public.tickets;
    DROP POLICY IF EXISTS "Organizers can view analytics for their events" ON public.event_analytics;
    DROP POLICY IF EXISTS "Admins can view all analytics" ON public.event_analytics;
    DROP POLICY IF EXISTS "Admins can view platform metrics" ON public.platform_metrics;
    DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
    DROP POLICY IF EXISTS "Admins can view all sessions" ON public.user_sessions;

    -- Drop existing triggers
    DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
    DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
    DROP TRIGGER IF EXISTS update_event_location_point_trigger ON public.events;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Some policies or triggers did not exist, continuing...';
END $$;

-- ============================================
-- STEP 2: Create or Update USERS table
-- ============================================

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL
);

-- Add missing columns to users table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'avatar') THEN
        ALTER TABLE public.users ADD COLUMN avatar TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE public.users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'subscription_tier') THEN
        ALTER TABLE public.users ADD COLUMN subscription_tier TEXT NOT NULL DEFAULT 'free';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'notification_prefs') THEN
        ALTER TABLE public.users ADD COLUMN notification_prefs JSONB DEFAULT '{"proximityAlerts": true, "eventUpdates": true, "interestedCategories": [], "alertRadius": 10}'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'agency_profile') THEN
        ALTER TABLE public.users ADD COLUMN agency_profile JSONB DEFAULT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'created_at') THEN
        ALTER TABLE public.users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'updated_at') THEN
        ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'last_login') THEN
        ALTER TABLE public.users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Add constraints to users table if they don't exist
DO $$
BEGIN
    -- Add role constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
        ALTER TABLE public.users ADD CONSTRAINT users_role_check 
            CHECK (role IN ('user', 'admin', 'organizer', 'agency'));
    END IF;
    
    -- Add subscription_tier constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_subscription_tier_check') THEN
        ALTER TABLE public.users ADD CONSTRAINT users_subscription_tier_check 
            CHECK (subscription_tier IN ('free', 'pro', 'premium', 'enterprise'));
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Some constraints already exist, continuing...';
END $$;

-- ============================================
-- STEP 3: Create or Update EVENTS table
-- ============================================

CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    location JSONB NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    organizer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    image TEXT
);

-- Add missing columns to events table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'location_point') THEN
        ALTER TABLE public.events ADD COLUMN location_point GEOGRAPHY(POINT, 4326);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'attendees_count') THEN
        ALTER TABLE public.events ADD COLUMN attendees_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'max_capacity') THEN
        ALTER TABLE public.events ADD COLUMN max_capacity INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'tags') THEN
        ALTER TABLE public.events ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'status') THEN
        ALTER TABLE public.events ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'created_at') THEN
        ALTER TABLE public.events ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'updated_at') THEN
        ALTER TABLE public.events ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Add constraints to events table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_status_check') THEN
        ALTER TABLE public.events ADD CONSTRAINT events_status_check 
            CHECK (status IN ('active', 'cancelled', 'completed', 'draft'));
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Status constraint already exists, continuing...';
END $$;

-- ============================================
-- STEP 4: Create or Update NOTIFICATIONS table
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    sender_name TEXT,
    "isRead" BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to notifications
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'metadata') THEN
        ALTER TABLE public.notifications ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Add constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_type_check') THEN
        ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
            CHECK (type IN ('proximity_radar', 'event_update', 'ticket_purchase', 'system', 'admin'));
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notification constraint already exists, continuing...';
END $$;

-- ============================================
-- STEP 5: Create or Update TICKETS table
-- ============================================

CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    price NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'valid',
    qr_code TEXT NOT NULL UNIQUE,
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to tickets
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'ticket_type') THEN
        ALTER TABLE public.tickets ADD COLUMN ticket_type TEXT NOT NULL DEFAULT 'standard';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'used_at') THEN
        ALTER TABLE public.tickets ADD COLUMN used_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'metadata') THEN
        ALTER TABLE public.tickets ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Add constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_status_check') THEN
        ALTER TABLE public.tickets ADD CONSTRAINT tickets_status_check 
            CHECK (status IN ('valid', 'used', 'cancelled', 'expired'));
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Ticket constraint already exists, continuing...';
END $$;

-- ============================================
-- STEP 6: Create supporting tables
-- ============================================

-- Event Analytics
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

-- Platform Metrics
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

-- User Sessions
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

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_subscription ON public.users(subscription_tier);

CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON public.events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_location_point ON public.events USING GIST(location_point);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON public.notifications(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, "isRead") WHERE "isRead" = FALSE;

CREATE INDEX IF NOT EXISTS idx_tickets_event ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_qr ON public.tickets(qr_code);

CREATE INDEX IF NOT EXISTS idx_analytics_event_date ON public.event_analytics(event_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_date ON public.platform_metrics(metric_date DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.user_sessions(ended_at) WHERE ended_at IS NULL;

-- ============================================
-- STEP 8: Create functions
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
-- STEP 9: Create triggers
-- ============================================

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_location_point_trigger
    BEFORE INSERT OR UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION update_event_location_point();

-- ============================================
-- STEP 10: Enable RLS and create policies
-- ============================================

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
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update all users"
    ON public.users FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Events policies
CREATE POLICY "Anyone can view active events"
    ON public.events FOR SELECT
    USING (status = 'active' OR organizer_id = auth.uid());

CREATE POLICY "Organizers can create events"
    ON public.events FOR INSERT
    WITH CHECK (auth.uid() = organizer_id AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('organizer', 'agency', 'admin')));

CREATE POLICY "Organizers can update their own events"
    ON public.events FOR UPDATE
    USING (organizer_id = auth.uid());

CREATE POLICY "Organizers can delete their own events"
    ON public.events FOR DELETE
    USING (organizer_id = auth.uid());

CREATE POLICY "Admins can manage all events"
    ON public.events FOR ALL
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

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
    USING (EXISTS (SELECT 1 FROM public.events WHERE id = tickets.event_id AND organizer_id = auth.uid()));

CREATE POLICY "Users can purchase tickets"
    ON public.tickets FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all tickets"
    ON public.tickets FOR ALL
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Analytics policies
CREATE POLICY "Organizers can view analytics for their events"
    ON public.event_analytics FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.events WHERE id = event_analytics.event_id AND organizer_id = auth.uid()));

CREATE POLICY "Admins can view all analytics"
    ON public.event_analytics FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Platform metrics policies
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
-- STEP 11: Grants
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;

-- ============================================
-- STEP 12: Initial data
-- ============================================

INSERT INTO public.platform_metrics (metric_date, total_events, total_users, total_tickets, total_revenue)
VALUES (CURRENT_DATE, 0, 0, 0, 0)
ON CONFLICT (metric_date) DO NOTHING;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE 'All tables, indexes, functions, triggers, and RLS policies are now in place.';
END $$;
