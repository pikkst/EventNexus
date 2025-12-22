-- ============================================
-- Organizer Revenue Dashboard Function
-- Date: 2025-12-22
-- Purpose: Real-time revenue tracking with platform fee calculation
-- ============================================

-- Drop existing functions to allow type changes
DROP FUNCTION IF EXISTS get_organizer_revenue(UUID);
DROP FUNCTION IF EXISTS get_organizer_revenue_summary(UUID);

-- STEP 1: Create function to get organizer revenue breakdown
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
    COALESCE(SUM(t.price), 0) as gross_revenue,
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
      WHEN 'free' THEN COALESCE(SUM(t.price), 0) * 0.05
      WHEN 'pro' THEN COALESCE(SUM(t.price), 0) * 0.03
      WHEN 'premium' THEN COALESCE(SUM(t.price), 0) * 0.025
      WHEN 'enterprise' THEN COALESCE(SUM(t.price), 0) * 0.015
      ELSE COALESCE(SUM(t.price), 0) * 0.05
    END as platform_fee_amount,
    
    -- Stripe fee: 2.9% + €0.25 per transaction
    (COALESCE(SUM(t.price), 0) * 0.029) + (COUNT(t.id)::NUMERIC * 0.25) as stripe_fee_amount,
    
    -- Net revenue after all fees
    COALESCE(SUM(t.price), 0) - 
    (CASE u.subscription_tier
      WHEN 'free' THEN COALESCE(SUM(t.price), 0) * 0.05
      WHEN 'pro' THEN COALESCE(SUM(t.price), 0) * 0.03
      WHEN 'premium' THEN COALESCE(SUM(t.price), 0) * 0.025
      WHEN 'enterprise' THEN COALESCE(SUM(t.price), 0) * 0.015
      ELSE COALESCE(SUM(t.price), 0) * 0.05
    END) - 
    ((COALESCE(SUM(t.price), 0) * 0.029) + (COUNT(t.id)::NUMERIC * 0.25)) as net_revenue,
    
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

-- STEP 2: Create summary function for total revenue
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
    COALESCE(SUM(t.price), 0) as total_gross,
    
    -- Total platform fees
    CASE u.subscription_tier
      WHEN 'free' THEN COALESCE(SUM(t.price), 0) * 0.05
      WHEN 'pro' THEN COALESCE(SUM(t.price), 0) * 0.03
      WHEN 'premium' THEN COALESCE(SUM(t.price), 0) * 0.025
      WHEN 'enterprise' THEN COALESCE(SUM(t.price), 0) * 0.015
      ELSE COALESCE(SUM(t.price), 0) * 0.05
    END as total_platform_fees,
    
    -- Total Stripe fees
    (COALESCE(SUM(t.price), 0) * 0.029) + (COUNT(t.id)::NUMERIC * 0.25) as total_stripe_fees,
    
    -- Total net revenue
    COALESCE(SUM(t.price), 0) - 
    (CASE u.subscription_tier
      WHEN 'free' THEN COALESCE(SUM(t.price), 0) * 0.05
      WHEN 'pro' THEN COALESCE(SUM(t.price), 0) * 0.03
      WHEN 'premium' THEN COALESCE(SUM(t.price), 0) * 0.025
      WHEN 'enterprise' THEN COALESCE(SUM(t.price), 0) * 0.015
      ELSE COALESCE(SUM(t.price), 0) * 0.05
    END) - 
    ((COALESCE(SUM(t.price), 0) * 0.029) + (COUNT(t.id)::NUMERIC * 0.25)) as total_net,
    
    -- Pending vs paid out
    COALESCE(SUM(CASE WHEN p.status = 'pending' OR p.status IS NULL THEN t.price ELSE 0 END), 0) as pending_amount,
    COALESCE(SUM(CASE WHEN p.status = 'paid' THEN t.price ELSE 0 END), 0) as paid_amount,
    
    u.subscription_tier
    
  FROM public.events e
  LEFT JOIN public.tickets t ON t.event_id = e.id AND t.status = 'valid' AND t.payment_status = 'paid'
  LEFT JOIN public.users u ON e.organizer_id = u.id
  LEFT JOIN public.payouts p ON p.event_id = e.id
  WHERE e.organizer_id = org_id
  GROUP BY u.subscription_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Grant execute permissions
GRANT EXECUTE ON FUNCTION get_organizer_revenue(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_organizer_revenue_summary(UUID) TO authenticated;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Test revenue breakdown for specific organizer
-- SELECT * FROM get_organizer_revenue('YOUR_ORGANIZER_ID_HERE');

-- Test revenue summary
-- SELECT * FROM get_organizer_revenue_summary('YOUR_ORGANIZER_ID_HERE');

-- ============================================
-- EXAMPLE OUTPUT
-- ============================================

-- Revenue breakdown returns:
-- event_id | event_name | tickets_sold | gross_revenue | platform_fee_percent | platform_fee_amount | stripe_fee_amount | net_revenue | payout_status
-- uuid | "Summer Festival" | 50 | 1250.00 | 0.03 | 37.50 | 37.50 | 1175.00 | "pending"
-- uuid | "Workshop NYC" | 25 | 625.00 | 0.03 | 18.75 | 18.75 | 587.50 | "paid"

-- Summary returns:
-- total_events | total_tickets_sold | total_gross | total_platform_fees | total_stripe_fees | total_net | pending_payouts | paid_out
-- 2 | 75 | 1875.00 | 56.25 | 56.25 | 1762.50 | 1250.00 | 625.00
