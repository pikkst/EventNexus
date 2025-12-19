-- ============================================
-- Fix Revenue By Tier Function
-- ============================================
-- Include subscription revenue in the calculation
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_revenue_by_tier()
RETURNS TABLE (
    name TEXT,
    value NUMERIC,
    color TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.subscription_tier as tier_name,
        -- Calculate revenue from both tickets and subscriptions
        (COALESCE(SUM(t.price), 0) + 
         CASE u.subscription_tier
            WHEN 'pro' THEN COUNT(DISTINCT CASE WHEN u.subscription_status = 'active' THEN u.id END) * 19.99
            WHEN 'premium' THEN COUNT(DISTINCT CASE WHEN u.subscription_status = 'active' THEN u.id END) * 49.99
            WHEN 'enterprise' THEN COUNT(DISTINCT CASE WHEN u.subscription_status = 'active' THEN u.id END) * 149.99
            ELSE 0
         END
        ) as total_revenue,
        CASE u.subscription_tier
            WHEN 'free' THEN '#94a3b8'
            WHEN 'pro' THEN '#6366f1'
            WHEN 'premium' THEN '#10b981'
            WHEN 'enterprise' THEN '#f97316'
            ELSE '#64748b'
        END as tier_color
    FROM public.users u
    LEFT JOIN public.tickets t ON t.user_id = u.id AND t.status IN ('valid', 'used')
    GROUP BY u.subscription_tier
    HAVING (COALESCE(SUM(t.price), 0) + 
         CASE u.subscription_tier
            WHEN 'pro' THEN COUNT(DISTINCT CASE WHEN u.subscription_status = 'active' THEN u.id END) * 19.99
            WHEN 'premium' THEN COUNT(DISTINCT CASE WHEN u.subscription_status = 'active' THEN u.id END) * 49.99
            WHEN 'enterprise' THEN COUNT(DISTINCT CASE WHEN u.subscription_status = 'active' THEN u.id END) * 149.99
            ELSE 0
         END) > 0
    ORDER BY 
        CASE u.subscription_tier
            WHEN 'enterprise' THEN 1
            WHEN 'premium' THEN 2
            WHEN 'pro' THEN 3
            WHEN 'free' THEN 4
            ELSE 5
        END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Test the function
SELECT * FROM get_revenue_by_tier();
