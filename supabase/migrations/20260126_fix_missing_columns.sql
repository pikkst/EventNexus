-- Fix missing columns and tables that are causing 400 errors
-- This migration adds missing columns to users table and ensures all tables exist

-- Add home_location to users table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'home_location') THEN
        ALTER TABLE public.users ADD COLUMN home_location JSONB DEFAULT NULL;
        COMMENT ON COLUMN public.users.home_location IS 'User home location with lat/lng coordinates: {"lat": 59.4370, "lng": 24.7536}';
    END IF;
END $$;

-- Ensure event_reviews table exists with correct structure
CREATE TABLE IF NOT EXISTS public.event_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_event_reviews_event_id ON public.event_reviews(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reviews_user_id ON public.event_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_event_reviews_created_at ON public.event_reviews(created_at DESC);

-- Enable RLS on event_reviews
ALTER TABLE public.event_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for event_reviews
DROP POLICY IF EXISTS "Anyone can view event reviews" ON public.event_reviews;
CREATE POLICY "Anyone can view event reviews"
    ON public.event_reviews FOR SELECT
    TO public
    USING (true);

DROP POLICY IF EXISTS "Users can create reviews for events" ON public.event_reviews;
CREATE POLICY "Users can create reviews for events"
    ON public.event_reviews FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reviews" ON public.event_reviews;
CREATE POLICY "Users can update their own reviews"
    ON public.event_reviews FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.event_reviews;
CREATE POLICY "Users can delete their own reviews"
    ON public.event_reviews FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Ensure user_buddies table exists
CREATE TABLE IF NOT EXISTS public.user_buddies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id_1 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_id_2 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id_1, user_id_2, event_id),
    CHECK (user_id_1 < user_id_2) -- Ensure consistent ordering
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_buddies_user_id_1 ON public.user_buddies(user_id_1);
CREATE INDEX IF NOT EXISTS idx_user_buddies_user_id_2 ON public.user_buddies(user_id_2);
CREATE INDEX IF NOT EXISTS idx_user_buddies_event_id ON public.user_buddies(event_id);
CREATE INDEX IF NOT EXISTS idx_user_buddies_status ON public.user_buddies(status);

-- Enable RLS on user_buddies
ALTER TABLE public.user_buddies ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_buddies
DROP POLICY IF EXISTS "Users can view their buddy connections" ON public.user_buddies;
CREATE POLICY "Users can view their buddy connections"
    ON public.user_buddies FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

DROP POLICY IF EXISTS "Users can create buddy requests" ON public.user_buddies;
CREATE POLICY "Users can create buddy requests"
    ON public.user_buddies FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

DROP POLICY IF EXISTS "Users can update their buddy connections" ON public.user_buddies;
CREATE POLICY "Users can update their buddy connections"
    ON public.user_buddies FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

DROP POLICY IF EXISTS "Users can delete their buddy connections" ON public.user_buddies;
CREATE POLICY "Users can delete their buddy connections"
    ON public.user_buddies FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- Create or replace get_event_memories function
CREATE OR REPLACE FUNCTION public.get_event_memories(p_event_id UUID)
RETURNS TABLE (
    id UUID,
    event_id UUID,
    user_id UUID,
    media_url TEXT,
    media_type TEXT,
    caption TEXT,
    created_at TIMESTAMPTZ,
    user_name TEXT,
    user_avatar TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        em.id,
        em.event_id,
        em.user_id,
        em.media_url,
        em.media_type,
        em.caption,
        em.created_at,
        u.name as user_name,
        u.avatar as user_avatar
    FROM public.event_memories em
    LEFT JOIN public.users u ON em.user_id = u.id
    WHERE em.event_id = p_event_id
    ORDER BY em.created_at DESC;
END;
$$;

-- Create or replace get_buddy_matches function
CREATE OR REPLACE FUNCTION public.get_buddy_matches(p_event_id UUID, p_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    name TEXT,
    avatar TEXT,
    shared_interests TEXT[],
    match_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH event_attendees AS (
        SELECT DISTINCT t.user_id
        FROM public.tickets t
        WHERE t.event_id = p_event_id
        AND t.user_id != p_user_id
        AND t.user_id IS NOT NULL
    ),
    user_interests AS (
        SELECT preferences->'interests' as interests
        FROM public.users
        WHERE id = p_user_id
    )
    SELECT 
        u.id,
        u.id as user_id,
        u.name,
        u.avatar,
        COALESCE(
            ARRAY(
                SELECT jsonb_array_elements_text(u.preferences->'interests')
                INTERSECT
                SELECT jsonb_array_elements_text((SELECT interests FROM user_interests))
            ),
            ARRAY[]::TEXT[]
        ) as shared_interests,
        COALESCE(array_length(
            ARRAY(
                SELECT jsonb_array_elements_text(u.preferences->'interests')
                INTERSECT
                SELECT jsonb_array_elements_text((SELECT interests FROM user_interests))
            ),
            1
        ), 0) as match_score
    FROM public.users u
    INNER JOIN event_attendees ea ON u.id = ea.user_id
    WHERE u.preferences->'interests' IS NOT NULL
    ORDER BY match_score DESC, u.name
    LIMIT 20;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_event_memories(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_buddy_matches(UUID, UUID) TO authenticated, anon;
