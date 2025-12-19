-- ============================================
-- Update Financial Ledger to Include Paid Subscriptions
-- ============================================
-- Run this in Supabase SQL Editor
-- This adds subscription revenue for users who actually paid

DROP FUNCTION IF EXISTS get_financial_ledger();

CREATE OR REPLACE FUNCTION get_financial_ledger()
RETURNS TABLE (
    transaction_source TEXT,
    transaction_type TEXT,
    volume TEXT,
    status TEXT,
    amount_cents BIGINT,
    created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH ticket_sales AS (
        SELECT 
            'Ticket Sales: ' || e.name AS source,
            'Revenue' AS type,
            CASE 
                WHEN SUM(t.price) >= 1000 THEN '+€' || ROUND(SUM(t.price) / 1000, 1) || 'k'
                ELSE '+€' || ROUND(SUM(t.price), 0)
            END AS vol,
            'Complete' AS stat,
            (SUM(t.price) * 100)::BIGINT AS amt_cents,
            MAX(t.purchase_date) AS created
        FROM public.tickets t
        JOIN public.events e ON t.event_id = e.id
        WHERE t.status != 'cancelled'
        GROUP BY e.name, e.id
        HAVING SUM(t.price) > 0
        ORDER BY SUM(t.price) DESC
        LIMIT 5
    ),
    platform_fees AS (
        SELECT 
            'Platform Service Fees' AS source,
            'Commission' AS type,
            CASE 
                WHEN SUM(t.price * 0.025) >= 1000 THEN '+€' || ROUND(SUM(t.price * 0.025) / 1000, 1) || 'k'
                ELSE '+€' || ROUND(SUM(t.price * 0.025), 0)
            END AS vol,
            'Complete' AS stat,
            (SUM(t.price * 0.025) * 100)::BIGINT AS amt_cents,
            MAX(t.purchase_date) AS created
        FROM public.tickets t
        WHERE t.status != 'cancelled'
    ),
    subscription_revenue AS (
        SELECT 
            'Subscription: ' || u.subscription_tier AS source,
            'Revenue' AS type,
            CASE u.subscription_tier
                WHEN 'pro' THEN '+€19.99'
                WHEN 'premium' THEN '+€49.99'
                WHEN 'enterprise' THEN '+€149.99'
                ELSE '+€0'
            END AS vol,
            'Complete' AS stat,
            CASE u.subscription_tier
                WHEN 'pro' THEN 1999::BIGINT
                WHEN 'premium' THEN 4999::BIGINT
                WHEN 'enterprise' THEN 14999::BIGINT
                ELSE 0::BIGINT
            END AS amt_cents,
            u.created_at AS created
        FROM public.users u
        WHERE u.subscription_tier != 'free'
          AND u.subscription_status = 'active'
          AND u.stripe_customer_id IS NOT NULL
    )
    SELECT * FROM ticket_sales
    UNION ALL
    SELECT * FROM platform_fees
    UNION ALL
    SELECT * FROM subscription_revenue
    ORDER BY amt_cents DESC
    LIMIT 10;
END;
$$;

GRANT EXECUTE ON FUNCTION get_financial_ledger() TO authenticated;

-- Test the function
SELECT * FROM get_financial_ledger();
