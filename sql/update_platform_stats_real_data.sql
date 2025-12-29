-- Update get_platform_statistics to use REAL DATA from production
-- Includes actual ticket revenue, payouts, and financial metrics

-- First, create a helper function for all organizers revenue summary
CREATE OR REPLACE FUNCTION get_all_organizers_revenue_summary()
RETURNS TABLE (
    organizer_id UUID,
    pending_amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.organizer_id,
        COALESCE(SUM(
            t.price_paid - 
            (t.price_paid * CASE u.subscription_tier
                WHEN 'free' THEN 0.05
                WHEN 'pro' THEN 0.03
                WHEN 'premium' THEN 0.025
                WHEN 'enterprise' THEN 0.015
                ELSE 0.05
            END) -
            (t.price_paid * 0.029 + 0.25)
        ), 0) as pending_amount
    FROM events e
    JOIN users u ON e.organizer_id = u.id
    LEFT JOIN tickets t ON t.event_id = e.id AND t.payment_status = 'paid' AND t.status IN ('valid', 'used')
    WHERE e.payout_processed = false
      AND e.date < NOW() - INTERVAL '2 days'
    GROUP BY e.organizer_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_all_organizers_revenue_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_organizers_revenue_summary() TO service_role;

CREATE OR REPLACE FUNCTION get_platform_statistics()
RETURNS JSON AS $$
DECLARE
    v_stats JSON;
    v_total_events BIGINT;
    v_total_users BIGINT;
    v_total_organizers BIGINT;
    v_total_tickets BIGINT;
    v_total_revenue NUMERIC;
    v_platform_fees NUMERIC;
    v_gross_revenue NUMERIC;
    v_total_payouts NUMERIC;
    v_pending_payouts NUMERIC;
    v_conversion_rate NUMERIC;
    v_avg_ticket_price NUMERIC;
    v_revenue_free NUMERIC;
    v_revenue_pro NUMERIC;
    v_revenue_premium NUMERIC;
    v_revenue_enterprise NUMERIC;
    v_active_users BIGINT;
    v_retention_rate NUMERIC;
BEGIN
    -- Get event and user counts
    SELECT 
        COUNT(*) FILTER (WHERE status = 'active'),
        (SELECT COUNT(*) FROM public.users),
        (SELECT COUNT(DISTINCT organizer_id) FROM public.events WHERE status = 'active')
    INTO v_total_events, v_total_users, v_total_organizers
    FROM public.events;
    
    -- Get REAL ticket and revenue data from tickets table
    SELECT 
        COUNT(*),
        COALESCE(SUM(price_paid), 0)
    INTO v_total_tickets, v_gross_revenue
    FROM public.tickets 
    WHERE payment_status = 'paid' 
      AND status IN ('valid', 'used');
    
    -- Get REAL payout data from payouts table
    SELECT 
        COALESCE(SUM(gross_amount), 0) / 100.0,  -- Convert cents to euros
        COALESCE(SUM(platform_fee), 0) / 100.0,   -- Platform fees in euros
        COALESCE(SUM(net_amount), 0) / 100.0      -- Net paid to organizers
    INTO v_total_revenue, v_platform_fees, v_total_payouts
    FROM public.payouts
    WHERE status = 'paid';
    
    -- Calculate pending payouts (eligible but not yet processed)
    SELECT COALESCE(SUM(pending_amount), 0)
    INTO v_pending_payouts
    FROM get_all_organizers_revenue_summary();
    
    -- Calculate conversion rate (tickets per user)
    v_conversion_rate := CASE 
        WHEN v_total_users > 0 THEN (v_total_tickets::NUMERIC / v_total_users::NUMERIC * 100)
        ELSE 0 
    END;
    
    -- Calculate average ticket price
    v_avg_ticket_price := CASE
        WHEN v_total_tickets > 0 THEN (v_gross_revenue / v_total_tickets)
        ELSE 0
    END;
    
    -- Calculate revenue by subscription tier
    SELECT 
        COALESCE(SUM(CASE WHEN u.subscription_tier = 'free' THEN t.price_paid ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN u.subscription_tier = 'pro' THEN t.price_paid ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN u.subscription_tier = 'premium' THEN t.price_paid ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN u.subscription_tier = 'enterprise' THEN t.price_paid ELSE 0 END), 0)
    INTO v_revenue_free, v_revenue_pro, v_revenue_premium, v_revenue_enterprise
    FROM public.tickets t
    JOIN public.events e ON t.event_id = e.id
    JOIN public.users u ON e.organizer_id = u.id
    WHERE t.payment_status = 'paid' 
      AND t.status IN ('valid', 'used');
    
    -- Calculate retention rate based on user activity (use purchase_date from old schema)
    SELECT COUNT(DISTINCT user_id)
    INTO v_active_users
    FROM public.tickets
    WHERE COALESCE(purchased_at, purchase_date) > NOW() - INTERVAL '30 days';
    
    v_retention_rate := CASE 
        WHEN v_total_users > 0 THEN (v_active_users::NUMERIC / v_total_users::NUMERIC * 100)
        ELSE 0 
    END;
    
    -- Build JSON response with REAL DATA
    SELECT json_build_object(
        'totalEvents', COALESCE(v_total_events, 0),
        'totalUsers', COALESCE(v_total_users, 0),
        'totalOrganizers', COALESCE(v_total_organizers, 0),
        'totalTickets', COALESCE(v_total_tickets, 0),
        
        -- REAL FINANCIAL DATA
        'totalRevenue', ROUND(COALESCE(v_gross_revenue, 0), 2),
        'platformFees', ROUND(COALESCE(v_platform_fees, 0), 2),
        'totalPayouts', ROUND(COALESCE(v_total_payouts, 0), 2),
        'pendingPayouts', ROUND(COALESCE(v_pending_payouts, 0), 2),
        
        -- METRICS
        'conversionRate', ROUND(COALESCE(v_conversion_rate, 0), 2),
        'avgTicketPrice', ROUND(COALESCE(v_avg_ticket_price, 0), 2),
        'retentionRate', ROUND(COALESCE(v_retention_rate, 0), 1),
        
        -- FORMATTED DISPLAY VALUES 
        'monthlyGPV', ('€' || ROUND(COALESCE(v_gross_revenue / 1000, 0), 1) || 'k')::TEXT,
        'creditPool', (ROUND(COALESCE(v_total_users * 5.0 / 1000000, 0), 1) || 'M')::TEXT,
        'globalFee', ROUND(2.5, 1),  -- Return number, frontend adds %
        'platformConversion', ROUND(COALESCE(v_conversion_rate, 0), 1),  -- Return number, frontend adds %
        
        -- REVENUE BY TIER (for charts - values must be numbers not strings)
        'revenueByTier', json_build_array(
            json_build_object(
                'name', 'Free',
                'value', COALESCE(v_revenue_free, 0)::NUMERIC,
                'color', '#94a3b8',
                'tier', 'free'
            ),
            json_build_object(
                'name', 'Pro',
                'value', COALESCE(v_revenue_pro, 0)::NUMERIC,
                'color', '#6366f1',
                'tier', 'pro'
            ),
            json_build_object(
                'name', 'Premium',
                'value', COALESCE(v_revenue_premium, 0)::NUMERIC,
                'color', '#10b981',
                'tier', 'premium'
            ),
            json_build_object(
                'name', 'Enterprise',
                'value', COALESCE(v_revenue_enterprise, 0)::NUMERIC,
                'color', '#f97316',
                'tier', 'enterprise'
            )
        ),
        
        'lastUpdated', NOW()
    ) INTO v_stats;
    
    RETURN v_stats;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_platform_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_statistics() TO anon;
GRANT EXECUTE ON FUNCTION get_platform_statistics() TO service_role;

-- ========================================
-- Update get_financial_ledger for REAL DATA
-- ========================================

-- Drop old function first (signature changed)
DROP FUNCTION IF EXISTS get_financial_ledger();

CREATE OR REPLACE FUNCTION get_financial_ledger()
RETURNS TABLE (
    transaction_source TEXT,
    transaction_type TEXT,
    volume NUMERIC,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    (
        -- Ticket sales (revenue in)
        SELECT 
            e.name::TEXT as transaction_source,
            'Ticket Revenue'::TEXT as transaction_type,
            t.price_paid as volume,
            CASE 
                WHEN t.payment_status = 'paid' THEN 'Settled'::TEXT
                WHEN t.payment_status = 'pending' THEN 'Processing'::TEXT
                ELSE 'Failed'::TEXT
            END as status
        FROM tickets t
        JOIN events e ON t.event_id = e.id
        WHERE t.payment_status = 'paid'
        
        UNION ALL
        
        -- Payouts (money out to organizers) - EXCLUDE failed payouts
        SELECT 
            e.name::TEXT as transaction_source,
            'Organizer Payout'::TEXT as transaction_type,
            -(p.net_amount / 100.0) as volume,  -- Negative because it's outgoing, convert cents to euros
            CASE 
                WHEN p.status = 'paid' THEN 'Settled'::TEXT
                WHEN p.status = 'processing' THEN 'Processing'::TEXT
                WHEN p.status = 'pending' THEN 'Pending'::TEXT
                ELSE 'Failed'::TEXT
            END as status
        FROM payouts p
        JOIN events e ON p.event_id = e.id
        WHERE p.status IN ('paid', 'processing', 'pending')  -- Only show non-failed payouts
    )
    ORDER BY transaction_source DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_financial_ledger() TO authenticated;
GRANT EXECUTE ON FUNCTION get_financial_ledger() TO service_role;
