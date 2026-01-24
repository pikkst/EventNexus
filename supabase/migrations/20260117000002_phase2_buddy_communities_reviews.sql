-- Phase 2: Buddy Matching, Communities, and Reviews System
-- Created: 2026-01-17
-- Tables: user_buddies, event_communities, community_members, event_reviews

-- 1. User Buddy/Friends System
CREATE TABLE IF NOT EXISTS user_buddies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, blocked
  common_interests TEXT[] DEFAULT '{}', -- shared categories
  common_events INTEGER DEFAULT 0, -- number of shared events
  initiated_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id_1, user_id_2),
  CONSTRAINT different_users CHECK (user_id_1 != user_id_2),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'blocked'))
);

-- 2. Event Communities/Groups
CREATE TABLE IF NOT EXISTS event_communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- music, sports, art, tech, etc.
  interests TEXT[] DEFAULT '{}', -- related event categories
  avatar_url TEXT,
  banner_url TEXT,
  is_public BOOLEAN DEFAULT true,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Community Membership
CREATE TABLE IF NOT EXISTS community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES event_communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- member, moderator, organizer
  joined_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(community_id, user_id)
);

-- 4. Event Reviews and Ratings
CREATE TABLE IF NOT EXISTS event_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), -- 1-5 stars
  title TEXT,
  content TEXT,
  atmosphere_rating INTEGER CHECK (atmosphere_rating >= 1 AND atmosphere_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
  organization_rating INTEGER CHECK (organization_rating >= 1 AND organization_rating <= 5),
  photos TEXT[] DEFAULT '{}', -- URLs to review photos
  is_verified_attendee BOOLEAN DEFAULT false, -- purchased ticket
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(event_id, user_id)
);

-- 5. Review Helpful Votes
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES event_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_helpful BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(review_id, user_id)
);

-- 6. User Following System (enhanced social graph)
CREATE TABLE IF NOT EXISTS user_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(follower_id, following_id),
  CONSTRAINT different_users CHECK (follower_id != following_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_buddies_user1 ON user_buddies(user_id_1);
CREATE INDEX IF NOT EXISTS idx_user_buddies_user2 ON user_buddies(user_id_2);
CREATE INDEX IF NOT EXISTS idx_user_buddies_status ON user_buddies(status);
CREATE INDEX IF NOT EXISTS idx_communities_organizer ON event_communities(organizer_id);
CREATE INDEX IF NOT EXISTS idx_communities_category ON event_communities(category);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_community ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_event_reviews_event ON event_reviews(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reviews_user ON event_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_event_reviews_rating ON event_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_review_votes_review ON review_helpful_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_user_followers_follower ON user_followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_followers_following ON user_followers(following_id);

-- Row Level Security (RLS) Policies

-- user_buddies RLS
ALTER TABLE user_buddies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_see_their_buddies" ON user_buddies CASCADE;
CREATE POLICY "users_see_their_buddies"
  ON user_buddies FOR SELECT
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

DROP POLICY IF EXISTS "users_create_buddy_requests" ON user_buddies CASCADE;
CREATE POLICY "users_create_buddy_requests"
  ON user_buddies FOR INSERT
  WITH CHECK (auth.uid() = initiated_by);

DROP POLICY IF EXISTS "users_update_buddy_status" ON user_buddies CASCADE;
CREATE POLICY "users_update_buddy_status"
  ON user_buddies FOR UPDATE
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- event_communities RLS
ALTER TABLE event_communities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_communities_readable" ON event_communities CASCADE;
CREATE POLICY "public_communities_readable"
  ON event_communities FOR SELECT
  USING (is_public = true OR auth.uid() = organizer_id);

DROP POLICY IF EXISTS "users_create_communities" ON event_communities CASCADE;
CREATE POLICY "users_create_communities"
  ON event_communities FOR INSERT
  WITH CHECK (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "organizers_update_communities" ON event_communities CASCADE;
CREATE POLICY "organizers_update_communities"
  ON event_communities FOR UPDATE
  USING (auth.uid() = organizer_id);

-- community_members RLS
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_see_community_members" ON community_members CASCADE;
CREATE POLICY "users_see_community_members"
  ON community_members FOR SELECT
  USING (true); -- public

DROP POLICY IF EXISTS "users_join_communities" ON community_members CASCADE;
CREATE POLICY "users_join_communities"
  ON community_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_leave_communities" ON community_members CASCADE;
CREATE POLICY "users_leave_communities"
  ON community_members FOR DELETE
  USING (auth.uid() = user_id OR 
         auth.uid() IN (
           SELECT organizer_id FROM event_communities 
           WHERE id = community_members.community_id
         ));

-- event_reviews RLS
ALTER TABLE event_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_reviews_readable" ON event_reviews CASCADE;
CREATE POLICY "public_reviews_readable"
  ON event_reviews FOR SELECT
  USING (true); -- reviews are public

DROP POLICY IF EXISTS "users_create_own_reviews" ON event_reviews CASCADE;
CREATE POLICY "users_create_own_reviews"
  ON event_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_update_own_reviews" ON event_reviews CASCADE;
CREATE POLICY "users_update_own_reviews"
  ON event_reviews FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_delete_own_reviews" ON event_reviews CASCADE;
CREATE POLICY "users_delete_own_reviews"
  ON event_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- review_helpful_votes RLS
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_votes_readable" ON review_helpful_votes CASCADE;
CREATE POLICY "public_votes_readable"
  ON review_helpful_votes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "users_vote_on_reviews" ON review_helpful_votes CASCADE;
CREATE POLICY "users_vote_on_reviews"
  ON review_helpful_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_update_own_votes" ON review_helpful_votes CASCADE;
CREATE POLICY "users_update_own_votes"
  ON review_helpful_votes FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_delete_own_votes" ON review_helpful_votes CASCADE;
CREATE POLICY "users_delete_own_votes"
  ON review_helpful_votes FOR DELETE
  USING (auth.uid() = user_id);

-- user_followers RLS
ALTER TABLE user_followers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_followers_readable" ON user_followers CASCADE;
CREATE POLICY "public_followers_readable"
  ON user_followers FOR SELECT
  USING (true); -- follower graphs are public

DROP POLICY IF EXISTS "users_follow_others" ON user_followers CASCADE;
CREATE POLICY "users_follow_others"
  ON user_followers FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "users_unfollow" ON user_followers CASCADE;
CREATE POLICY "users_unfollow"
  ON user_followers FOR DELETE
  USING (auth.uid() = follower_id);

-- Helper Functions

-- Function to get buddy matches for a user (users with common interests)
CREATE OR REPLACE FUNCTION get_buddy_matches(p_user_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  avatar TEXT,
  common_categories TEXT[],
  common_event_count INT,
  similarity_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.full_name,
    u.avatar,
    array_intersect(ui.categories, (SELECT categories FROM user_interests WHERE user_id = p_user_id)),
    COALESCE(COUNT(DISTINCT ea.event_id), 0)::INT,
    (
      ARRAY_LENGTH(array_intersect(ui.categories, (SELECT categories FROM user_interests WHERE user_id = p_user_id)), 1)::FLOAT / 
      GREATEST(ARRAY_LENGTH(ui.categories, 1), 1)
    )::FLOAT
  FROM auth.users u
  JOIN user_interests ui ON u.id = ui.user_id
  LEFT JOIN event_attendees ea ON (
    (ea.user_id = p_user_id AND EXISTS (
      SELECT 1 FROM event_attendees ea2 
      WHERE ea2.user_id = u.id AND ea2.event_id = ea.event_id
    )) OR
    (ea.user_id = u.id AND EXISTS (
      SELECT 1 FROM event_attendees ea2 
      WHERE ea2.user_id = p_user_id AND ea2.event_id = ea.event_id
    ))
  )
  WHERE u.id != p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM user_buddies 
      WHERE (user_id_1 = p_user_id AND user_id_2 = u.id) 
         OR (user_id_1 = u.id AND user_id_2 = p_user_id)
    )
  GROUP BY u.id, u.name, u.avatar, ui.categories
  ORDER BY similarity_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get event average rating
CREATE OR REPLACE FUNCTION get_event_rating(p_event_id UUID)
RETURNS TABLE (
  avg_rating FLOAT,
  total_reviews INT,
  avg_atmosphere FLOAT,
  avg_value FLOAT,
  avg_organization FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(rating)::NUMERIC, 2)::FLOAT,
    COUNT(*)::INT,
    ROUND(AVG(atmosphere_rating)::NUMERIC, 2)::FLOAT,
    ROUND(AVG(value_rating)::NUMERIC, 2)::FLOAT,
    ROUND(AVG(organization_rating)::NUMERIC, 2)::FLOAT
  FROM event_reviews
  WHERE event_id = p_event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user following count
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
  followers_count INT,
  following_count INT,
  friends_count INT,
  reviews_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT CASE WHEN follower_id = p_user_id THEN following_id END)::INT as followers,
    COUNT(DISTINCT CASE WHEN following_id = p_user_id THEN follower_id END)::INT as following,
    COUNT(DISTINCT CASE 
      WHEN (user_id_1 = p_user_id OR user_id_2 = p_user_id) AND status = 'accepted' 
      THEN CASE WHEN user_id_1 = p_user_id THEN user_id_2 ELSE user_id_1 END
    END)::INT as friends,
    COUNT(DISTINCT review_id)::INT as reviews
  FROM (
    SELECT * FROM user_followers WHERE following_id = p_user_id OR follower_id = p_user_id
    UNION ALL
    SELECT id, user_id_1, user_id_2, NULL, NULL, NULL, NULL, NULL, NULL FROM user_buddies WHERE user_id_1 = p_user_id OR user_id_2 = p_user_id
    UNION ALL
    SELECT id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM event_reviews WHERE user_id = p_user_id
  ) combined
  CROSS JOIN LATERAL (
    SELECT * FROM event_reviews WHERE user_id = p_user_id LIMIT 1
  ) reviews
  GROUP BY combined.id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_buddies TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_communities TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_members TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_reviews TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON review_helpful_votes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_followers TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_buddy_matches TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_event_rating TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats TO anon, authenticated;
