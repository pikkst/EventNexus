-- Run these in order in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/sql/new

-- STEP 1: Create subscription_payments table
-- From: supabase/migrations/20251219163000_subscription_payments_table.sql

BEGIN;

CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_tier TEXT NOT NULL CHECK (subscription_tier IN ('pro', 'premium', 'enterprise')),
  amount_cents BIGINT NOT NULL,
  currency TEXT DEFAULT 'eur',
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'succeeded' CHECK (status IN ('succeeded', 'failed', 'pending', 'refunded')),
  billing_reason TEXT,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_user_id ON public.subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_created_at ON public.subscription_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_stripe_invoice ON public.subscription_payments(stripe_invoice_id);

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all subscription payments"
  ON public.subscription_payments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Users can view own subscription payments"
  ON public.subscription_payments FOR SELECT
  USING (auth.uid() = user_id);

COMMIT;

-- STEP 2: Update financial_ledger function
-- From: supabase/migrations/20251219163100_update_financial_ledger_function.sql

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

COMMIT;
