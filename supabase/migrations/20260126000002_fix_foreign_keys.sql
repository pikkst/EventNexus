-- Fix foreign keys and queries for event_reviews and user_buddies

-- Add foreign key for event_reviews.user_id (skip if exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'event_reviews_user_id_fkey'
    ) THEN
        ALTER TABLE public.event_reviews
        ADD CONSTRAINT event_reviews_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign keys for user_buddies (skip if exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_buddies_user_id_1_fkey'
    ) THEN
        ALTER TABLE public.user_buddies
        ADD CONSTRAINT user_buddies_user_id_1_fkey 
        FOREIGN KEY (user_id_1) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_buddies_user_id_2_fkey'
    ) THEN
        ALTER TABLE public.user_buddies
        ADD CONSTRAINT user_buddies_user_id_2_fkey 
        FOREIGN KEY (user_id_2) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_buddies_initiated_by_fkey'
    ) THEN
        ALTER TABLE public.user_buddies
        ADD CONSTRAINT user_buddies_initiated_by_fkey 
        FOREIGN KEY (initiated_by) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Fix get_buddy_matches function to use correct column name 'name' instead of 'full_name'
CREATE OR REPLACE FUNCTION public.get_buddy_matches(target_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    name TEXT,
    avatar TEXT,
    common_interests TEXT[],
    common_events INTEGER,
    match_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.id as user_id,
        u.name::TEXT,
        u.avatar,
        ARRAY[]::TEXT[] as common_interests,
        0 as common_events,
        50 as match_score
    FROM public.users u
    WHERE u.id != target_user_id
    AND u.status = 'active'
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix get_event_memories function to use correct column name 'name' instead of 'full_name'
CREATE OR REPLACE FUNCTION public.get_event_memories(target_event_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    user_name TEXT,
    user_avatar TEXT,
    rating INTEGER,
    title TEXT,
    content TEXT,
    photos TEXT[],
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        er.id,
        er.user_id,
        u.name::TEXT as user_name,
        u.avatar as user_avatar,
        er.rating,
        er.title,
        er.content,
        COALESCE(er.photos, ARRAY[]::TEXT[]) as photos,
        er.created_at AT TIME ZONE 'UTC' as created_at
    FROM public.event_reviews er
    JOIN public.users u ON u.id = er.user_id
    WHERE er.event_id = target_event_id
    ORDER BY er.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_buddy_matches(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_memories(UUID) TO anon, authenticated;
