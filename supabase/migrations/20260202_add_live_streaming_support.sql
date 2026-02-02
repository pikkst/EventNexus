-- Migration: Add Live Streaming Support for Premium/Enterprise Events
-- Created: 2026-02-02
-- Purpose: Enable online/virtual events with live streaming, analytics, and chat

-- ============================================================================
-- 1. ADD STREAMING COLUMNS TO EVENTS TABLE
-- ============================================================================

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS event_type VARCHAR(20) DEFAULT 'physical' CHECK (event_type IN ('physical', 'online', 'hybrid')),
ADD COLUMN IF NOT EXISTS streaming_url TEXT,
ADD COLUMN IF NOT EXISTS streaming_platform VARCHAR(50) CHECK (streaming_platform IN ('youtube', 'vimeo', 'custom', 'twitch', 'zoom', NULL)),
ADD COLUMN IF NOT EXISTS streaming_embed_code TEXT,
ADD COLUMN IF NOT EXISTS max_online_attendees INTEGER,
ADD COLUMN IF NOT EXISTS requires_registration BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS stream_starts_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stream_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS replay_available BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS replay_url TEXT;

COMMENT ON COLUMN public.events.is_online IS 'Legacy flag - kept for backward compatibility. Use event_type instead.';
COMMENT ON COLUMN public.events.event_type IS 'Event delivery type: physical (in-person), online (virtual), or hybrid (both)';
COMMENT ON COLUMN public.events.streaming_url IS 'Direct URL to live stream (YouTube Live URL, Vimeo URL, custom RTMP, etc.)';
COMMENT ON COLUMN public.events.streaming_platform IS 'Platform hosting the stream for optimized embed';
COMMENT ON COLUMN public.events.streaming_embed_code IS 'Full iframe/embed code for custom streaming solutions';
COMMENT ON COLUMN public.events.max_online_attendees IS 'Maximum concurrent viewers allowed (NULL = unlimited for Enterprise)';
COMMENT ON COLUMN public.events.stream_starts_at IS 'Exact timestamp when live stream begins (may differ from event start)';
COMMENT ON COLUMN public.events.replay_available IS 'Whether recording will be available after stream ends';

-- ============================================================================
-- 2. CREATE LIVE STREAM ANALYTICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.live_stream_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  
  -- Viewer metrics
  peak_concurrent_viewers INTEGER DEFAULT 0,
  total_unique_viewers INTEGER DEFAULT 0,
  average_watch_time_seconds INTEGER DEFAULT 0,
  total_watch_time_minutes INTEGER DEFAULT 0,
  
  -- Engagement metrics
  chat_messages_count INTEGER DEFAULT 0,
  reactions_count INTEGER DEFAULT 0,
  questions_asked INTEGER DEFAULT 0,
  polls_responded INTEGER DEFAULT 0,
  
  -- Quality metrics
  average_bitrate_kbps INTEGER,
  buffering_incidents INTEGER DEFAULT 0,
  stream_uptime_percentage DECIMAL(5,2) DEFAULT 100.00,
  
  -- Geographic distribution
  viewers_by_country JSONB DEFAULT '{}',
  viewers_by_city JSONB DEFAULT '{}',
  
  -- Timestamps
  stream_started_at TIMESTAMPTZ,
  stream_ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_live_stream_analytics_event_id ON public.live_stream_analytics(event_id);
CREATE INDEX idx_live_stream_analytics_created_at ON public.live_stream_analytics(created_at DESC);

COMMENT ON TABLE public.live_stream_analytics IS 'Real-time analytics for live streaming events';

-- ============================================================================
-- 3. CREATE LIVE STREAM SESSIONS TABLE (for concurrent viewer tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.live_stream_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Session data
  session_token VARCHAR(100) NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  country VARCHAR(100),
  city VARCHAR(100),
  
  -- Viewing metrics
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  watch_duration_seconds INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Quality tracking
  buffering_events INTEGER DEFAULT 0,
  quality_changes INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_live_stream_sessions_event_id ON public.live_stream_sessions(event_id);
CREATE INDEX idx_live_stream_sessions_user_id ON public.live_stream_sessions(user_id);
CREATE INDEX idx_live_stream_sessions_active ON public.live_stream_sessions(event_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_live_stream_sessions_joined_at ON public.live_stream_sessions(joined_at DESC);

COMMENT ON TABLE public.live_stream_sessions IS 'Individual viewer sessions for real-time concurrent viewer tracking';

-- ============================================================================
-- 4. CREATE LIVE CHAT MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.live_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Message content
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'emoji', 'question', 'poll', 'system')),
  
  -- Moderation
  is_pinned BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  is_highlighted BOOLEAN DEFAULT FALSE,
  deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  
  -- Metadata
  user_name VARCHAR(255), -- Cached for performance
  user_avatar TEXT, -- Cached for performance
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_live_chat_messages_event_id ON public.live_chat_messages(event_id, created_at DESC);
CREATE INDEX idx_live_chat_messages_user_id ON public.live_chat_messages(user_id);
CREATE INDEX idx_live_chat_messages_pinned ON public.live_chat_messages(event_id) WHERE is_pinned = TRUE;
CREATE INDEX idx_live_chat_messages_deleted ON public.live_chat_messages(event_id) WHERE is_deleted = FALSE;

COMMENT ON TABLE public.live_chat_messages IS 'Real-time chat messages during live streaming events';

-- ============================================================================
-- 5. CREATE LIVE POLLS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.live_polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Poll content
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- [{"id": "1", "text": "Option A", "votes": 0}, ...]
  
  -- Settings
  is_active BOOLEAN DEFAULT TRUE,
  allow_multiple_votes BOOLEAN DEFAULT FALSE,
  show_results_before_close BOOLEAN DEFAULT TRUE,
  
  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closes_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_live_polls_event_id ON public.live_polls(event_id);
CREATE INDEX idx_live_polls_active ON public.live_polls(event_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 6. CREATE LIVE REACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.live_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Reaction data
  reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('like', 'love', 'clap', 'fire', 'wow', 'laugh')),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_live_reactions_event_id ON public.live_reactions(event_id, created_at DESC);
CREATE INDEX idx_live_reactions_user_id ON public.live_reactions(user_id);

-- ============================================================================
-- 7. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.live_stream_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_stream_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_reactions ENABLE ROW LEVEL SECURITY;

-- Analytics: Organizers can view their event analytics
CREATE POLICY "Organizers can view their event stream analytics"
ON public.live_stream_analytics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = live_stream_analytics.event_id
    AND events.organizer_id = auth.uid()
  )
);

-- Analytics: Organizers can update their event analytics
CREATE POLICY "Organizers can update their event stream analytics"
ON public.live_stream_analytics FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = live_stream_analytics.event_id
    AND events.organizer_id = auth.uid()
  )
);

-- Sessions: Users can view active sessions for events they have access to
CREATE POLICY "Users can view stream sessions for accessible events"
ON public.live_stream_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = live_stream_sessions.event_id
    AND (events.visibility = 'public' OR events.organizer_id = auth.uid())
  )
);

-- Sessions: Users can insert their own sessions
CREATE POLICY "Users can create their own stream sessions"
ON public.live_stream_sessions FOR INSERT
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Sessions: Users can update their own sessions
CREATE POLICY "Users can update their own stream sessions"
ON public.live_stream_sessions FOR UPDATE
USING (user_id = auth.uid() OR user_id IS NULL);

-- Chat: Users can view chat for accessible events
CREATE POLICY "Users can view chat for accessible events"
ON public.live_chat_messages FOR SELECT
USING (
  NOT is_deleted AND
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = live_chat_messages.event_id
    AND (events.visibility = 'public' OR events.organizer_id = auth.uid())
  )
);

-- Chat: Authenticated users can post messages
CREATE POLICY "Authenticated users can post chat messages"
ON public.live_chat_messages FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Chat: Organizers can delete/moderate messages
CREATE POLICY "Organizers can moderate chat messages"
ON public.live_chat_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = live_chat_messages.event_id
    AND events.organizer_id = auth.uid()
  )
);

-- Polls: Users can view polls for accessible events
CREATE POLICY "Users can view polls for accessible events"
ON public.live_polls FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = live_polls.event_id
    AND (events.visibility = 'public' OR events.organizer_id = auth.uid())
  )
);

-- Polls: Organizers can create/manage polls
CREATE POLICY "Organizers can manage polls for their events"
ON public.live_polls FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = live_polls.event_id
    AND events.organizer_id = auth.uid()
  )
);

-- Reactions: Users can view reactions
CREATE POLICY "Users can view reactions for accessible events"
ON public.live_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = live_reactions.event_id
    AND (events.visibility = 'public' OR events.organizer_id = auth.uid())
  )
);

-- Reactions: Authenticated users can add reactions
CREATE POLICY "Authenticated users can add reactions"
ON public.live_reactions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 8. DATABASE FUNCTIONS
-- ============================================================================

-- Function to get current concurrent viewers for an event
CREATE OR REPLACE FUNCTION get_concurrent_viewers(p_event_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.live_stream_sessions
    WHERE event_id = p_event_id
    AND is_active = TRUE
    AND joined_at >= NOW() - INTERVAL '5 minutes' -- Active in last 5 minutes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update stream analytics in real-time
CREATE OR REPLACE FUNCTION update_stream_analytics(p_event_id UUID)
RETURNS void AS $$
DECLARE
  v_analytics_id UUID;
  v_peak_viewers INTEGER;
  v_total_viewers INTEGER;
  v_avg_watch_time INTEGER;
  v_chat_count INTEGER;
  v_reactions_count INTEGER;
BEGIN
  -- Calculate metrics
  SELECT 
    COUNT(DISTINCT id),
    AVG(watch_duration_seconds)::INTEGER
  INTO v_total_viewers, v_avg_watch_time
  FROM public.live_stream_sessions
  WHERE event_id = p_event_id;
  
  SELECT get_concurrent_viewers(p_event_id)
  INTO v_peak_viewers;
  
  SELECT COUNT(*) INTO v_chat_count
  FROM public.live_chat_messages
  WHERE event_id = p_event_id AND NOT is_deleted;
  
  SELECT COUNT(*) INTO v_reactions_count
  FROM public.live_reactions
  WHERE event_id = p_event_id;
  
  -- Upsert analytics
  INSERT INTO public.live_stream_analytics (
    event_id,
    peak_concurrent_viewers,
    total_unique_viewers,
    average_watch_time_seconds,
    chat_messages_count,
    reactions_count,
    updated_at
  ) VALUES (
    p_event_id,
    GREATEST(v_peak_viewers, COALESCE((SELECT peak_concurrent_viewers FROM public.live_stream_analytics WHERE event_id = p_event_id), 0)),
    v_total_viewers,
    v_avg_watch_time,
    v_chat_count,
    v_reactions_count,
    NOW()
  )
  ON CONFLICT (event_id) 
  DO UPDATE SET
    peak_concurrent_viewers = GREATEST(EXCLUDED.peak_concurrent_viewers, live_stream_analytics.peak_concurrent_viewers),
    total_unique_viewers = EXCLUDED.total_unique_viewers,
    average_watch_time_seconds = EXCLUDED.average_watch_time_seconds,
    chat_messages_count = EXCLUDED.chat_messages_count,
    reactions_count = EXCLUDED.reactions_count,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update analytics when sessions change
CREATE OR REPLACE FUNCTION trigger_update_stream_analytics()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_stream_analytics(COALESCE(NEW.event_id, OLD.event_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analytics_on_session_change
AFTER INSERT OR UPDATE OR DELETE ON public.live_stream_sessions
FOR EACH ROW EXECUTE FUNCTION trigger_update_stream_analytics();

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.live_stream_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.live_stream_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.live_chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.live_polls TO authenticated;
GRANT SELECT, INSERT ON public.live_reactions TO authenticated;

GRANT EXECUTE ON FUNCTION get_concurrent_viewers TO authenticated;
GRANT EXECUTE ON FUNCTION update_stream_analytics TO authenticated;

-- ============================================================================
-- 10. ONLINE EVENT ACCESS CONTROL FUNCTIONS
-- ============================================================================

-- Function to check if user has valid ticket/access to online event
CREATE OR REPLACE FUNCTION has_online_event_access(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_event RECORD;
  v_ticket_count INTEGER;
BEGIN
  -- Get event details
  SELECT 
    event_type, 
    requires_registration, 
    price, 
    organizer_id,
    max_online_attendees
  INTO v_event
  FROM public.events
  WHERE id = p_event_id;
  
  -- Event not found
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Physical events don't use this function
  IF v_event.event_type = 'physical' THEN
    RETURN FALSE;
  END IF;
  
  -- Organizer always has access
  IF v_event.organizer_id = p_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Free events without registration requirement
  IF v_event.price = 0 AND (v_event.requires_registration = FALSE OR v_event.requires_registration IS NULL) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has valid ticket
  SELECT COUNT(*)
  INTO v_ticket_count
  FROM public.tickets
  WHERE event_id = p_event_id
  AND user_id = p_user_id
  AND status IN ('paid', 'valid')
  AND used_at IS NULL; -- Ticket not yet marked as "used"
  
  RETURN v_ticket_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark ticket as used for online event (when user joins stream)
CREATE OR REPLACE FUNCTION use_online_event_ticket(
  p_event_id UUID,
  p_user_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  ticket_id UUID
) AS $$
DECLARE
  v_ticket_id UUID;
  v_ticket_status TEXT;
BEGIN
  -- Find the user's ticket for this event
  SELECT id, status
  INTO v_ticket_id, v_ticket_status
  FROM public.tickets
  WHERE event_id = p_event_id
  AND user_id = p_user_id
  AND status IN ('paid', 'valid')
  ORDER BY purchased_at DESC
  LIMIT 1;
  
  -- No valid ticket found
  IF v_ticket_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'No valid ticket found for this event'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Ticket already used
  IF v_ticket_status = 'used' THEN
    RETURN QUERY SELECT FALSE, 'Ticket already used'::TEXT, v_ticket_id;
    RETURN;
  END IF;
  
  -- Mark ticket as used (for online events, this happens when they join the stream)
  UPDATE public.tickets
  SET 
    status = 'used',
    used_at = NOW(),
    scanned_by = p_user_id -- Self-scan for online events
  WHERE id = v_ticket_id;
  
  RETURN QUERY SELECT TRUE, 'Access granted'::TEXT, v_ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if event has reached max online attendees
CREATE OR REPLACE FUNCTION check_online_event_capacity(p_event_id UUID)
RETURNS TABLE(
  can_join BOOLEAN,
  current_viewers INTEGER,
  max_viewers INTEGER,
  message TEXT
) AS $$
DECLARE
  v_current_viewers INTEGER;
  v_max_viewers INTEGER;
BEGIN
  -- Get max viewers limit
  SELECT max_online_attendees
  INTO v_max_viewers
  FROM public.events
  WHERE id = p_event_id;
  
  -- NULL means unlimited
  IF v_max_viewers IS NULL THEN
    v_current_viewers := get_concurrent_viewers(p_event_id);
    RETURN QUERY SELECT TRUE, v_current_viewers, NULL::INTEGER, 'Unlimited capacity'::TEXT;
    RETURN;
  END IF;
  
  -- Get current active viewers
  v_current_viewers := get_concurrent_viewers(p_event_id);
  
  -- Check if capacity reached
  IF v_current_viewers >= v_max_viewers THEN
    RETURN QUERY SELECT FALSE, v_current_viewers, v_max_viewers, 'Event at maximum capacity'::TEXT;
  ELSE
    RETURN QUERY SELECT TRUE, v_current_viewers, v_max_viewers, 'Capacity available'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policy: Users can only view their own tickets (ensure exists)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-runability)
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Organizers can view event tickets" ON public.tickets;

-- Recreate policies to ensure they're up to date
CREATE POLICY "Users can view their own tickets"
ON public.tickets FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: Event organizers can view all tickets for their events
CREATE POLICY "Organizers can view event tickets"
ON public.tickets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = tickets.event_id
    AND events.organizer_id = auth.uid()
  )
);

GRANT EXECUTE ON FUNCTION has_online_event_access TO authenticated;
GRANT EXECUTE ON FUNCTION use_online_event_ticket TO authenticated;
GRANT EXECUTE ON FUNCTION check_online_event_capacity TO authenticated;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Live streaming support migration completed successfully!';
  RAISE NOTICE '📊 Tables created: live_stream_analytics, live_stream_sessions, live_chat_messages, live_polls, live_reactions';
  RAISE NOTICE '🔐 RLS policies enabled for all streaming tables';
  RAISE NOTICE '⚡ Real-time analytics functions created';
  RAISE NOTICE '🎫 Online event access control functions created';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next Steps:';
  RAISE NOTICE '1. Create Edge Function for stream access validation';
  RAISE NOTICE '2. Update frontend to check has_online_event_access() before showing player';
  RAISE NOTICE '3. Call use_online_event_ticket() when user joins stream';
  RAISE NOTICE '4. Monitor concurrent viewers with check_online_event_capacity()';
END $$;
