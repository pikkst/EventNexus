-- Remove platform commission from ticket sales
-- Platform now earns revenue exclusively from subscription tier payments
-- Only Stripe's own processing fees (2.9% + €0.25) remain on ticket sales

-- Update get_organizer_revenue function: platform fee = 0%
DROP FUNCTION IF EXISTS get_organizer_revenue(UUID);

CREATE OR REPLACE FUNCTION get_organizer_revenue(org_id UUID)
RETURNS TABLE (
  event_id UUID,
  event_name VARCHAR(255),
  event_date DATE,
  tickets_sold BIGINT,
  gross_revenue NUMERIC,
  subscription_tier VARCHAR(50),
  platform_fee_percent NUMERIC,
  platform_fee_amount NUMERIC,
  stripe_fee_amount NUMERIC,
  net_revenue NUMERIC,
  payout_status TEXT,
  payout_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as event_id,
    e.name as event_name,
    e.date as event_date,
    COUNT(t.id)::BIGINT as tickets_sold,
    COALESCE(SUM(t.price_paid), 0) as gross_revenue,
    u.subscription_tier,
    
    -- Platform fee percentage: 0% for all tiers (no platform commission)
    0::NUMERIC as platform_fee_percent,
    
    -- Platform fee amount: always 0
    0::NUMERIC as platform_fee_amount,
    
    -- Stripe fee: 2.9% + €0.25 per transaction
    (COALESCE(SUM(t.price_paid), 0) * 0.029) + (COUNT(t.id)::NUMERIC * 0.25) as stripe_fee_amount,
    
    -- Net revenue: gross minus Stripe fees only (no platform commission)
    COALESCE(SUM(t.price_paid), 0) - 
    ((COALESCE(SUM(t.price_paid), 0) * 0.029) + (COUNT(t.id)::NUMERIC * 0.25)) as net_revenue,
    
    -- Payout status
    COALESCE(p.status, 'pending') as payout_status,
    p.processed_at as payout_date
    
  FROM public.events e
  LEFT JOIN public.tickets t ON t.event_id = e.id AND t.status = 'valid' AND t.payment_status = 'paid'
  LEFT JOIN public.users u ON e.organizer_id = u.id
  LEFT JOIN public.payouts p ON p.event_id = e.id
  WHERE e.organizer_id = org_id
    AND e.archived_at IS NULL
  GROUP BY e.id, e.name, e.date, u.subscription_tier, p.status, p.processed_at
  ORDER BY e.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_organizer_revenue_summary function: platform fees = 0
DROP FUNCTION IF EXISTS get_organizer_revenue_summary(UUID);

CREATE OR REPLACE FUNCTION get_organizer_revenue_summary(org_id UUID)
RETURNS TABLE (
  total_events BIGINT,
  total_tickets_sold BIGINT,
  total_gross NUMERIC,
  total_platform_fees NUMERIC,
  total_stripe_fees NUMERIC,
  total_net NUMERIC,
  pending_amount NUMERIC,
  paid_amount NUMERIC,
  subscription_tier VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT e.id)::BIGINT as total_events,
    COUNT(t.id)::BIGINT as total_tickets_sold,
    COALESCE(SUM(t.price_paid), 0) as total_gross,
    
    -- Total platform fees: always 0 (no platform commission)
    0::NUMERIC as total_platform_fees,
    
    -- Total Stripe fees
    (COALESCE(SUM(t.price_paid), 0) * 0.029) + (COUNT(t.id)::NUMERIC * 0.25) as total_stripe_fees,
    
    -- Total net revenue: gross minus Stripe fees only
    COALESCE(SUM(t.price_paid), 0) - 
    ((COALESCE(SUM(t.price_paid), 0) * 0.029) + (COUNT(t.id)::NUMERIC * 0.25)) as total_net,
    
    -- Pending vs paid out
    COALESCE(SUM(CASE WHEN p.status = 'pending' OR p.status IS NULL THEN t.price_paid ELSE 0 END), 0) as pending_amount,
    COALESCE(SUM(CASE WHEN p.status = 'paid' THEN t.price_paid ELSE 0 END), 0) as paid_amount,
    
    u.subscription_tier
    
  FROM public.events e
  LEFT JOIN public.tickets t ON t.event_id = e.id AND t.status = 'valid' AND t.payment_status = 'paid'
  LEFT JOIN public.users u ON e.organizer_id = u.id
  LEFT JOIN public.payouts p ON p.event_id = e.id
  WHERE e.organizer_id = org_id
    AND e.archived_at IS NULL
  GROUP BY u.subscription_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update pending payouts net calculation (if function exists)
DROP FUNCTION IF EXISTS get_pending_payouts_net(UUID);

CREATE OR REPLACE FUNCTION get_pending_payouts_net(org_id UUID)
RETURNS TABLE (
  event_id UUID,
  event_name VARCHAR(255),
  event_date DATE,
  gross_amount NUMERIC,
  platform_fee NUMERIC,
  stripe_fee NUMERIC,
  net_amount NUMERIC,
  ticket_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as event_id,
    e.name as event_name,
    e.date as event_date,
    COALESCE(SUM(t.price_paid), 0) as gross_amount,
    -- No platform fee
    0::NUMERIC as platform_fee,
    -- Stripe fee
    (COALESCE(SUM(t.price_paid), 0) * 0.029) + (COUNT(t.id)::NUMERIC * 0.25) as stripe_fee,
    -- Net = gross - stripe fees only
    COALESCE(SUM(t.price_paid), 0) - 
    ((COALESCE(SUM(t.price_paid), 0) * 0.029) + (COUNT(t.id)::NUMERIC * 0.25)) as net_amount,
    COUNT(t.id)::BIGINT as ticket_count
  FROM public.events e
  LEFT JOIN public.tickets t ON t.event_id = e.id AND t.status = 'valid' AND t.payment_status = 'paid'
  WHERE e.organizer_id = org_id
    AND e.payout_processed = false
    AND e.date < NOW() - INTERVAL '2 days'
    AND e.archived_at IS NULL
  GROUP BY e.id, e.name, e.date
  HAVING COUNT(t.id) > 0
  ORDER BY e.date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update global_ticket_fee to 0 in system_config
UPDATE system_config SET value = '0'::jsonb WHERE key = 'global_ticket_fee';

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_organizer_revenue(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_organizer_revenue_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_payouts_net(UUID) TO authenticated;

COMMENT ON FUNCTION get_organizer_revenue(UUID) IS 'Get revenue breakdown by event — 0% platform commission, only Stripe fees';
COMMENT ON FUNCTION get_organizer_revenue_summary(UUID) IS 'Get revenue summary — 0% platform commission, only Stripe fees';
COMMENT ON FUNCTION get_pending_payouts_net(UUID) IS 'Get pending payouts — 0% platform commission, only Stripe fees';
