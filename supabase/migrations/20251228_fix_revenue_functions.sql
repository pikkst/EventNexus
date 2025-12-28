-- Fix revenue functions to use price_paid instead of price column
-- tickets table has price_paid, not price

-- Drop and recreate get_organizer_revenue function with correct column
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
    
    -- Platform fee percentage based on tier
    CASE u.subscription_tier
      WHEN 'free' THEN 0.05
      WHEN 'pro' THEN 0.03
      WHEN 'premium' THEN 0.025
      WHEN 'enterprise' THEN 0.015
      ELSE 0.05
    END as platform_fee_percent,
    
    -- Platform fee amount
    CASE u.subscription_tier
      WHEN 'free' THEN COALESCE(SUM(t.price_paid), 0) * 0.05
      WHEN 'pro' THEN COALESCE(SUM(t.price_paid), 0) * 0.03
      WHEN 'premium' THEN COALESCE(SUM(t.price_paid), 0) * 0.025
      WHEN 'enterprise' THEN COALESCE(SUM(t.price_paid), 0) * 0.015
      ELSE COALESCE(SUM(t.price_paid), 0) * 0.05
    END as platform_fee_amount,
    
    -- Stripe fee: 2.9% + €0.25 per transaction
    (COALESCE(SUM(t.price_paid), 0) * 0.029) + (COUNT(t.id)::NUMERIC * 0.25) as stripe_fee_amount,
    
    -- Net revenue after all fees
    COALESCE(SUM(t.price_paid), 0) - 
    (CASE u.subscription_tier
      WHEN 'free' THEN COALESCE(SUM(t.price_paid), 0) * 0.05
      WHEN 'pro' THEN COALESCE(SUM(t.price_paid), 0) * 0.03
      WHEN 'premium' THEN COALESCE(SUM(t.price_paid), 0) * 0.025
      WHEN 'enterprise' THEN COALESCE(SUM(t.price_paid), 0) * 0.015
      ELSE COALESCE(SUM(t.price_paid), 0) * 0.05
    END) - 
    ((COALESCE(SUM(t.price_paid), 0) * 0.029) + (COUNT(t.id)::NUMERIC * 0.25)) as net_revenue,
    
    -- Payout status
    COALESCE(p.status, 'pending') as payout_status,
    p.processed_at as payout_date
    
  FROM public.events e
  LEFT JOIN public.tickets t ON t.event_id = e.id AND t.status = 'valid' AND t.payment_status = 'paid'
  LEFT JOIN public.users u ON e.organizer_id = u.id
  LEFT JOIN public.payouts p ON p.event_id = e.id
  WHERE e.organizer_id = org_id
  GROUP BY e.id, e.name, e.date, u.subscription_tier, p.status, p.processed_at
  ORDER BY e.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate get_organizer_revenue_summary function
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
    
    -- Total platform fees
    CASE u.subscription_tier
      WHEN 'free' THEN COALESCE(SUM(t.price_paid), 0) * 0.05
      WHEN 'pro' THEN COALESCE(SUM(t.price_paid), 0) * 0.03
      WHEN 'premium' THEN COALESCE(SUM(t.price_paid), 0) * 0.025
      WHEN 'enterprise' THEN COALESCE(SUM(t.price_paid), 0) * 0.015
      ELSE COALESCE(SUM(t.price_paid), 0) * 0.05
    END as total_platform_fees,
    
    -- Total Stripe fees
    (COALESCE(SUM(t.price_paid), 0) * 0.029) + (COUNT(t.id)::NUMERIC * 0.25) as total_stripe_fees,
    
    -- Total net revenue
    COALESCE(SUM(t.price_paid), 0) - 
    (CASE u.subscription_tier
      WHEN 'free' THEN COALESCE(SUM(t.price_paid), 0) * 0.05
      WHEN 'pro' THEN COALESCE(SUM(t.price_paid), 0) * 0.03
      WHEN 'premium' THEN COALESCE(SUM(t.price_paid), 0) * 0.025
      WHEN 'enterprise' THEN COALESCE(SUM(t.price_paid), 0) * 0.015
      ELSE COALESCE(SUM(t.price_paid), 0) * 0.05
    END) - 
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
  GROUP BY u.subscription_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_organizer_revenue(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_organizer_revenue_summary(UUID) TO authenticated;
