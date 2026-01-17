-- ============================================
-- Phase 1: Social Features Infrastructure
-- ============================================
-- Event attendees, user interests, check-ins, and social feed tables

-- 1. EVENT ATTENDEES TABLE
CREATE TABLE IF NOT EXISTS public.event_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'friends_only', 'hidden')),
    status TEXT DEFAULT 'going' CHECK (status IN ('going', 'interested', 'maybe')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON public.event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON public.event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_status ON public.event_attendees(status);
CREATE INDEX IF NOT EXISTS idx_event_attendees_visibility ON public.event_attendees(visibility);

-- 2. USER INTERESTS TABLE
CREATE TABLE IF NOT EXISTS public.user_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    categories TEXT[] DEFAULT '{}'::text[],  -- Array of category strings
    preferred_days TEXT[] DEFAULT '{}'::text[],  -- 'Monday', 'Tuesday', etc.
    preferred_time TEXT DEFAULT 'any',  -- 'morning', 'afternoon', 'evening', 'any'
    bio TEXT DEFAULT '',
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON public.user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_is_public ON public.user_interests(is_public);
CREATE INDEX IF NOT EXISTS idx_user_interests_categories ON public.user_interests USING GIN(categories);

-- 3. EVENT CHECK-INS TABLE
CREATE TABLE IF NOT EXISTS public.event_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMPTZ DEFAULT NOW(),
    post_text TEXT DEFAULT '',
    media_url TEXT,
    location_lat FLOAT8,
    location_lng FLOAT8,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_checkins_event_id ON public.event_checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_user_id ON public.event_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_checked_in_at ON public.event_checkins(checked_in_at);

-- 4. USER FEED ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.user_feed_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('checkin', 'rsvp', 'review', 'photo', 'achievement')),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    content JSONB DEFAULT '{}',  -- Flexible content storage
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_feed_items_user_id ON public.user_feed_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feed_items_type ON public.user_feed_items(type);
CREATE INDEX IF NOT EXISTS idx_user_feed_items_event_id ON public.user_feed_items(event_id);
CREATE INDEX IF NOT EXISTS idx_user_feed_items_is_public ON public.user_feed_items(is_public);
CREATE INDEX IF NOT EXISTS idx_user_feed_items_created_at ON public.user_feed_items(created_at DESC);

-- 5. RLS POLICIES

-- Event Attendees Policies
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attendees with public visibility"
    ON public.event_attendees FOR SELECT
    USING (visibility = 'public' OR user_id = auth.uid());

CREATE POLICY "Users can manage own attendee records"
    ON public.event_attendees FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Event organizers can view all attendees of their events"
    ON public.event_attendees FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_attendees.event_id
            AND events.organizer_id = auth.uid()
        )
    );

-- User Interests Policies
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public interests"
    ON public.user_interests FOR SELECT
    USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can manage own interests"
    ON public.user_interests FOR ALL
    USING (user_id = auth.uid());

-- Event Check-ins Policies
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view check-ins"
    ON public.event_checkins FOR SELECT
    USING (true);

CREATE POLICY "Users can create own check-ins"
    ON public.event_checkins FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own check-ins"
    ON public.event_checkins FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- User Feed Policies
ALTER TABLE public.user_feed_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public feed items"
    ON public.user_feed_items FOR SELECT
    USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can manage own feed items"
    ON public.user_feed_items FOR ALL
    USING (user_id = auth.uid());

-- 6. HELPER FUNCTIONS

-- Function to get event attendee count
CREATE OR REPLACE FUNCTION get_event_attendee_count(p_event_id UUID)
RETURNS INTEGER AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.event_attendees
    WHERE event_id = p_event_id
    AND visibility != 'hidden'
    AND status = 'going';
$$ LANGUAGE SQL STABLE;

-- Function to get user's interested categories
CREATE OR REPLACE FUNCTION get_user_interests(p_user_id UUID)
RETURNS TEXT[] AS $$
    SELECT COALESCE(categories, '{}'::text[])
    FROM public.user_interests
    WHERE user_id = p_user_id;
$$ LANGUAGE SQL STABLE;

-- Function to check if user is attending event
CREATE OR REPLACE FUNCTION is_user_attending(p_user_id UUID, p_event_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS(
        SELECT 1 FROM public.event_attendees
        WHERE user_id = p_user_id
        AND event_id = p_event_id
        AND status = 'going'
    );
$$ LANGUAGE SQL STABLE;

-- Function to get event attendees for display
CREATE OR REPLACE FUNCTION get_event_attendees_preview(p_event_id UUID, p_limit INT DEFAULT 5)
RETURNS TABLE(user_id UUID, name TEXT, avatar_url TEXT) AS $$
    SELECT 
        u.id,
        u.name,
        u.avatar
    FROM public.event_attendees ea
    JOIN public.users u ON u.id = ea.user_id
    WHERE ea.event_id = p_event_id
    AND ea.visibility = 'public'
    AND ea.status = 'going'
    ORDER BY ea.joined_at DESC
    LIMIT p_limit;
$$ LANGUAGE SQL STABLE;

COMMENT ON TABLE public.event_attendees IS 'Tracks which users are attending, interested in, or maybe attending events';
COMMENT ON TABLE public.user_interests IS 'Stores user preferences and interests for event recommendations';
COMMENT ON TABLE public.event_checkins IS 'Records user check-ins at events with optional posts and media';
COMMENT ON TABLE public.user_feed_items IS 'Activity feed items for social discovery';
COMMENT ON FUNCTION get_event_attendee_count IS 'Returns count of visible attendees for an event';
COMMENT ON FUNCTION get_user_interests IS 'Returns array of interested categories for a user';
COMMENT ON FUNCTION is_user_attending IS 'Checks if user is attending a specific event';
COMMENT ON FUNCTION get_event_attendees_preview IS 'Returns preview of event attendees for display';
