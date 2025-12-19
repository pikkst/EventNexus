-- Fix revenue by tier to include subscription payments
-- Current function only counts ticket sales, ignoring subscription revenue

BEGIN;

DROP FUNCTION IF EXISTS get_revenue_by_tier();

CREATE OR REPLACE FUNCTION get_revenue_by_tier()
RETURNS TABLE (
    name TEXT,
    value NUMERIC,
    color TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH subscription_revenue AS (
        SELECT 
            sp.subscription_tier,
            SUM(sp.amount_cents / 100.0) as sub_revenue
        FROM public.subscription_payments sp
        WHERE sp.status = 'succeeded'
        GROUP BY sp.subscription_tier
    ),
    ticket_revenue AS (
        SELECT 
            u.subscription_tier,
            SUM(t.price) as ticket_revenue
        FROM public.users u
        LEFT JOIN public.tickets t ON t.user_id = u.id AND t.status IN ('valid', 'used')
        GROUP BY u.subscription_tier
    )
    SELECT 
        COALESCE(sr.subscription_tier, tr.subscription_tier, 'free') as tier_name,
        COALESCE(sr.sub_revenue, 0) + COALESCE(tr.ticket_revenue, 0) as total_revenue,
        CASE COALESCE(sr.subscription_tier, tr.subscription_tier, 'free')
            WHEN 'free' THEN '#94a3b8'
            WHEN 'pro' THEN '#6366f1'
            WHEN 'premium' THEN '#10b981'
            WHEN 'enterprise' THEN '#f97316'
            ELSE '#64748b'
        END as tier_color
    FROM subscription_revenue sr
    FULL OUTER JOIN ticket_revenue tr ON sr.subscription_tier = tr.subscription_tier
    WHERE COALESCE(sr.sub_revenue, 0) + COALESCE(tr.ticket_revenue, 0) > 0
    ORDER BY 
        CASE COALESCE(sr.subscription_tier, tr.subscription_tier, 'free')
            WHEN 'free' THEN 1
            WHEN 'pro' THEN 2
            WHEN 'premium' THEN 3
            WHEN 'enterprise' THEN 4
            ELSE 5
        END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_revenue_by_tier() TO authenticated;

COMMENT ON FUNCTION get_revenue_by_tier() IS 'Returns revenue breakdown by subscription tier including both subscription payments and ticket sales';

COMMIT;
