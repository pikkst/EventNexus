-- Fix Pending Payouts calculation to show NET amount instead of GROSS
-- Currently shows €35 (gross), should show €31.73 (net after fees)

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
  WITH ticket_data AS (
    SELECT 
      t.price_paid,
      t.id as ticket_id,
      p.status as payout_status,
      -- Calculate fees per ticket
      CASE u.subscription_tier
        WHEN 'free' THEN t.price_paid * 0.05
        WHEN 'pro' THEN t.price_paid * 0.03
        WHEN 'premium' THEN t.price_paid * 0.025
        WHEN 'enterprise' THEN t.price_paid * 0.015
        ELSE t.price_paid * 0.05
      END as platform_fee,
      (t.price_paid * 0.029) + 0.25 as stripe_fee
    FROM public.events e
    LEFT JOIN public.tickets t ON t.event_id = e.id 
      AND t.status IN ('valid', 'used')
      AND t.payment_status = 'paid'
    LEFT JOIN public.users u ON e.organizer_id = u.id
    LEFT JOIN public.payouts p ON p.event_id = e.id
    WHERE e.organizer_id = org_id
  )
  SELECT 
    (SELECT COUNT(DISTINCT id) FROM public.events WHERE organizer_id = org_id)::BIGINT as total_events,
    COUNT(td.ticket_id)::BIGINT as total_tickets_sold,
    COALESCE(SUM(td.price_paid), 0) as total_gross,
    COALESCE(SUM(td.platform_fee), 0) as total_platform_fees,
    COALESCE(SUM(td.stripe_fee), 0) as total_stripe_fees,
    COALESCE(SUM(td.price_paid - td.platform_fee - td.stripe_fee), 0) as total_net,
    
    -- Pending amount: NET (after fees) for tickets without payout or pending payout
    COALESCE(SUM(
      CASE WHEN td.payout_status = 'pending' OR td.payout_status IS NULL 
      THEN td.price_paid - td.platform_fee - td.stripe_fee 
      ELSE 0 END
    ), 0) as pending_amount,
    
    -- Paid amount: NET (after fees) for tickets with completed payout
    COALESCE(SUM(
      CASE WHEN td.payout_status = 'paid' 
      THEN td.price_paid - td.platform_fee - td.stripe_fee 
      ELSE 0 END
    ), 0) as paid_amount,
    
    (SELECT u.subscription_tier FROM public.users u WHERE u.id = org_id) as subscription_tier
  FROM ticket_data td
  GROUP BY org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_organizer_revenue_summary(UUID) TO authenticated;
