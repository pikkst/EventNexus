-- Fix Pending Payouts to reflect NET (after fees), excluding archived events
-- Date: 2026-01-11

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
  WITH ticket_data AS (
    SELECT 
      e.id AS event_id,
      t.id AS ticket_id,
      t.price_paid,
      p.status AS payout_status,
      u.subscription_tier,
      -- Per-ticket platform fee
      CASE u.subscription_tier
        WHEN 'free' THEN t.price_paid * 0.05
        WHEN 'pro' THEN t.price_paid * 0.03
        WHEN 'premium' THEN t.price_paid * 0.025
        WHEN 'enterprise' THEN t.price_paid * 0.015
        ELSE t.price_paid * 0.05
      END AS platform_fee,
      -- Per-ticket Stripe fee: 2.9% + €0.25
      (t.price_paid * 0.029) + 0.25 AS stripe_fee
    FROM public.events e
    LEFT JOIN public.tickets t ON t.event_id = e.id 
      AND t.status IN ('valid', 'used')
      AND t.payment_status = 'paid'
    LEFT JOIN public.users u ON e.organizer_id = u.id
    LEFT JOIN public.payouts p ON p.event_id = e.id
    WHERE e.organizer_id = org_id
      AND e.archived_at IS NULL
  )
  SELECT 
    (SELECT COUNT(DISTINCT id) FROM public.events WHERE organizer_id = org_id AND archived_at IS NULL)::BIGINT AS total_events,
    COUNT(td.ticket_id)::BIGINT AS total_tickets_sold,
    COALESCE(SUM(td.price_paid), 0) AS total_gross,
    COALESCE(SUM(td.platform_fee), 0) AS total_platform_fees,
    COALESCE(SUM(td.stripe_fee), 0) AS total_stripe_fees,
    COALESCE(SUM(td.price_paid - td.platform_fee - td.stripe_fee), 0) AS total_net,
    
    -- Pending payouts: NET (after fees) for tickets in events without completed payout
    COALESCE(SUM(
      CASE WHEN td.payout_status = 'pending' OR td.payout_status IS NULL 
        THEN td.price_paid - td.platform_fee - td.stripe_fee 
        ELSE 0 END
    ), 0) AS pending_amount,
    
    -- Paid out: NET (after fees) for tickets in events with completed payout
    COALESCE(SUM(
      CASE WHEN td.payout_status IN ('paid', 'completed')
        THEN td.price_paid - td.platform_fee - td.stripe_fee 
        ELSE 0 END
    ), 0) AS paid_amount,
    
    (SELECT u.subscription_tier FROM public.users u WHERE u.id = org_id) AS subscription_tier
  FROM ticket_data td
  GROUP BY org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_organizer_revenue_summary(UUID) TO authenticated;

COMMENT ON FUNCTION get_organizer_revenue_summary(UUID) IS 'Organizer revenue summary totals with NET pending payouts, excluding archived events';
