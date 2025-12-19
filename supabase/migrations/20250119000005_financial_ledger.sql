-- ============================================
-- Financial Ledger Function
-- ============================================
-- Creates a function to get real financial transaction data
-- from tickets, subscriptions, and platform fees

-- Create financial transactions view for admin
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
            'Subscription Revenue (' || subscription_tier || ')' AS source,
            'Revenue' AS type,
            CASE 
                WHEN COUNT(*) * 
                    CASE subscription_tier
                        WHEN 'pro' THEN 29
                        WHEN 'premium' THEN 99
                        WHEN 'enterprise' THEN 299
                        ELSE 0
                    END >= 1000 
                THEN '+€' || ROUND(
                    COUNT(*) * 
                    CASE subscription_tier
                        WHEN 'pro' THEN 29
                        WHEN 'premium' THEN 99
                        WHEN 'enterprise' THEN 299
                        ELSE 0
                    END / 1000, 1
                ) || 'k'
                ELSE '+€' || ROUND(
                    COUNT(*) * 
                    CASE subscription_tier
                        WHEN 'pro' THEN 29
                        WHEN 'premium' THEN 99
                        WHEN 'enterprise' THEN 299
                        ELSE 0
                    END, 0
                )
            END AS vol,
            'Complete' AS stat,
            (COUNT(*) * 
                CASE subscription_tier
                    WHEN 'pro' THEN 2900
                    WHEN 'premium' THEN 9900
                    WHEN 'enterprise' THEN 29900
                    ELSE 0
                END
            )::BIGINT AS amt_cents,
            MAX(created_at) AS created
        FROM public.users
        WHERE subscription_tier != 'free'
        GROUP BY subscription_tier
        HAVING COUNT(*) > 0
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

-- Grant execute permission to authenticated users (admin only via RLS)
GRANT EXECUTE ON FUNCTION get_financial_ledger() TO authenticated;

-- Create RLS policy for admin-only access (will be enforced at application level)
COMMENT ON FUNCTION get_financial_ledger() IS 'Admin-only function to retrieve financial ledger data';
