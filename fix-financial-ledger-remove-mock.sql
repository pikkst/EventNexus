-- ============================================
-- Remove Mock Subscription Data from Financial Ledger
-- ============================================
-- Run this in Supabase SQL Editor to update the get_financial_ledger() function
-- This removes calculated subscription revenue and only shows real ticket transactions

-- Drop and recreate the function without subscription_revenue CTE
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
    )
    SELECT * FROM ticket_sales
    UNION ALL
    SELECT * FROM platform_fees
    ORDER BY amt_cents DESC
    LIMIT 10;
END;
$$;

-- Grant execute permission to authenticated users (admin only via RLS)
GRANT EXECUTE ON FUNCTION get_financial_ledger() TO authenticated;

-- Verify the function
SELECT * FROM get_financial_ledger();
