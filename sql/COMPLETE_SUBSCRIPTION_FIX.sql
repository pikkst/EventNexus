-- ============================================
-- Complete Subscription Payment Fixes
-- ============================================
-- Run this complete script in Supabase SQL Editor
-- This includes all fixes for subscription payment tracking
-- and admin dashboard financial display
-- ============================================

BEGIN;

-- ============================================
-- 1. Create subscription_payments table (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subscription_tier TEXT NOT NULL,
    amount_cents BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'succeeded',
    stripe_invoice_id TEXT,
    stripe_subscription_id TEXT,
    billing_reason TEXT,
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_subscription_payments_user_id ON public.subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON public.subscription_payments(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_tier ON public.subscription_payments(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_created ON public.subscription_payments(created_at DESC);

-- Enable RLS
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (if not exists will prevent errors)
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view own subscription payments" ON public.subscription_payments;
    DROP POLICY IF EXISTS "Admins can view all subscription payments" ON public.subscription_payments;
    
    -- Recreate policies
    CREATE POLICY "Users can view own subscription payments"
        ON public.subscription_payments
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    
    CREATE POLICY "Admins can view all subscription payments"
        ON public.subscription_payments
        FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.users
                WHERE id = auth.uid() AND role = 'admin'
            )
        );
END $$;

-- ============================================
-- 2. Update financial ledger function
-- ============================================
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
    ORDER BY created DESC, amt_cents DESC
    LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION get_financial_ledger() TO authenticated;

COMMENT ON FUNCTION get_financial_ledger() IS 'Admin-only function to retrieve financial ledger data including subscription payments';

-- ============================================
-- 3. Fix revenue by tier function
-- ============================================
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

-- ============================================
-- Verification Queries
-- ============================================
-- Run these after to verify everything works

-- Check subscription_payments table
SELECT COUNT(*) as payment_count, 
       SUM(amount_cents) / 100.0 as total_revenue_euros
FROM public.subscription_payments 
WHERE status = 'succeeded';

-- Check revenue by tier
SELECT * FROM get_revenue_by_tier();

-- Check financial ledger
SELECT transaction_source, volume, status 
FROM get_financial_ledger() 
LIMIT 10;
