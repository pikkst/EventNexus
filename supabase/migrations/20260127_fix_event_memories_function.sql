-- Fix get_event_memories function return type mismatch
-- The users.name column is varchar(255) but function expects TEXT

-- Drop all variants of the function (there may be multiple signatures)
DROP FUNCTION IF EXISTS public.get_event_memories(UUID);
DROP FUNCTION IF EXISTS public.get_event_memories(UUID, INTEGER);

-- Create function with limit parameter (as code expects)
CREATE OR REPLACE FUNCTION public.get_event_memories(p_event_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    event_id UUID,
    user_id UUID,
    media_url TEXT,
    media_type TEXT,
    caption TEXT,
    created_at TIMESTAMPTZ,
    user_name VARCHAR(255),  -- Changed from TEXT to match users.name type
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
        em.memory_type as media_type,  -- Map memory_type to media_type
        em.review_text as caption,      -- Map review_text to caption
        em.created_at,
        u.name as user_name,
        u.avatar as user_avatar
    FROM public.event_memories em
    LEFT JOIN public.users u ON em.user_id = u.id
    WHERE em.event_id = p_event_id
    ORDER BY em.created_at DESC
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_memories(UUID, INTEGER) TO authenticated, anon;

COMMENT ON FUNCTION public.get_event_memories IS 'Retrieves event memories with user info - fixed VARCHAR type, with limit parameter';
