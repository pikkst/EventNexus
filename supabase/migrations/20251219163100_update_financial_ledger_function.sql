-- Update financial ledger function to show subscription payments from new table
-- This replaces the user-based subscription revenue query

BEGIN;

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
    subscription_payments_summary AS (
        SELECT 
            'Subscription: ' || sp.subscription_tier AS source,
            'Revenue' AS type,
            '+€' || ROUND(sp.amount_cents / 100.0, 2) AS vol,
            CASE sp.status
                WHEN 'succeeded' THEN 'Complete'
                WHEN 'pending' THEN 'Pending'
                WHEN 'failed' THEN 'Failed'
                WHEN 'refunded' THEN 'Refunded'
                ELSE 'Unknown'
            END AS stat,
            sp.amount_cents AS amt_cents,
            sp.created_at AS created
        FROM public.subscription_payments sp
        WHERE sp.status = 'succeeded'
        ORDER BY sp.created_at DESC
        LIMIT 10
    )
    SELECT * FROM ticket_sales
    UNION ALL
    SELECT * FROM platform_fees
    UNION ALL
    SELECT * FROM subscription_payments_summary
    ORDER BY created_at DESC, amt_cents DESC
    LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION get_financial_ledger() TO authenticated;

COMMENT ON FUNCTION get_financial_ledger() IS 'Admin-only function to retrieve financial ledger data including subscription payments';

COMMIT;
