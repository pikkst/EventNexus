-- Affiliate Marketing System
-- Tracks affiliate partnerships, referrals, commissions, and payouts

-- Drop existing objects if they exist (clean slate)
-- Drop functions first (they may reference tables)
DROP FUNCTION IF EXISTS process_affiliate_conversion() CASCADE;
DROP FUNCTION IF EXISTS update_affiliate_partners_updated_at() CASCADE;
DROP FUNCTION IF EXISTS generate_affiliate_code(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_affiliate_stats(UUID) CASCADE;

-- Drop tables in reverse dependency order (CASCADE will drop triggers, policies, indexes)
DROP TABLE IF EXISTS public.affiliate_payouts CASCADE;
DROP TABLE IF EXISTS public.affiliate_commissions CASCADE;
DROP TABLE IF EXISTS public.affiliate_referrals CASCADE;
DROP TABLE IF EXISTS public.affiliate_partners CASCADE;

-- Affiliate Partners table (organizers who join the affiliate program)
CREATE TABLE public.affiliate_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  affiliate_code TEXT NOT NULL UNIQUE, -- Unique tracking code for the partner
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'suspended', 'terminated')),
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 15.00, -- Percentage (e.g., 15.00 for 15%)
  total_referrals INTEGER NOT NULL DEFAULT 0,
  total_conversions INTEGER NOT NULL DEFAULT 0,
  total_earnings DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  pending_payout DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  lifetime_earnings DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  cookie_duration_days INTEGER NOT NULL DEFAULT 90, -- Attribution window in days
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_payout_at TIMESTAMPTZ,
  notes TEXT
);

-- Affiliate Referrals table (tracks referred users)
CREATE TABLE public.affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_partner_id UUID NOT NULL REFERENCES public.affiliate_partners(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  conversion_status TEXT NOT NULL DEFAULT 'pending' CHECK (conversion_status IN ('pending', 'converted', 'cancelled')),
  subscription_tier TEXT CHECK (subscription_tier IN ('free', 'pro', 'premium', 'enterprise')),
  conversion_value DECIMAL(10,2) DEFAULT 0.00, -- Value of the subscription
  commission_amount DECIMAL(10,2) DEFAULT 0.00, -- Commission earned from this referral
  converted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- Cookie expiration date
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Affiliate Commissions table (tracks individual commission transactions)
CREATE TABLE public.affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_partner_id UUID NOT NULL REFERENCES public.affiliate_partners(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES public.affiliate_referrals(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('initial_conversion', 'recurring_payment', 'bonus', 'adjustment')),
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  subscription_tier TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Affiliate Payouts table (tracks payout history)
CREATE TABLE public.affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_partner_id UUID NOT NULL REFERENCES public.affiliate_partners(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payout_method TEXT NOT NULL DEFAULT 'stripe_connect',
  stripe_transfer_id TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  failed_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_partners_user_id ON public.affiliate_partners(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_partners_affiliate_code ON public.affiliate_partners(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_partners_status ON public.affiliate_partners(status);

CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_partner_id ON public.affiliate_referrals(affiliate_partner_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referred_user_id ON public.affiliate_referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referral_code ON public.affiliate_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_conversion_status ON public.affiliate_referrals(conversion_status);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_partner_id ON public.affiliate_commissions(affiliate_partner_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_referral_id ON public.affiliate_commissions(referral_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_status ON public.affiliate_commissions(status);

CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_partner_id ON public.affiliate_payouts(affiliate_partner_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_status ON public.affiliate_payouts(status);

-- RLS Policies
ALTER TABLE public.affiliate_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- Affiliate Partners policies
CREATE POLICY "Users can view their own affiliate partner record" ON public.affiliate_partners
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their affiliate partner record" ON public.affiliate_partners
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own affiliate partner record" ON public.affiliate_partners
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all affiliate partners" ON public.affiliate_partners
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Affiliate Referrals policies
CREATE POLICY "Partners can view their referrals" ON public.affiliate_referrals
  FOR SELECT USING (
    affiliate_partner_id IN (
      SELECT id FROM public.affiliate_partners 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert referrals" ON public.affiliate_referrals
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all referrals" ON public.affiliate_referrals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Affiliate Commissions policies
CREATE POLICY "Partners can view their commissions" ON public.affiliate_commissions
  FOR SELECT USING (
    affiliate_partner_id IN (
      SELECT id FROM public.affiliate_partners 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage commissions" ON public.affiliate_commissions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view all commissions" ON public.affiliate_commissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Affiliate Payouts policies
CREATE POLICY "Partners can view their payouts" ON public.affiliate_payouts
  FOR SELECT USING (
    affiliate_partner_id IN (
      SELECT id FROM public.affiliate_partners 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all payouts" ON public.affiliate_payouts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Function to update affiliate_partners.updated_at
CREATE OR REPLACE FUNCTION update_affiliate_partners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_affiliate_partners_updated_at_trigger
BEFORE UPDATE ON public.affiliate_partners
FOR EACH ROW
EXECUTE FUNCTION update_affiliate_partners_updated_at();

-- Function to track referral conversions and update partner stats
CREATE OR REPLACE FUNCTION process_affiliate_conversion()
RETURNS TRIGGER AS $$
DECLARE
  v_partner_id UUID;
  v_commission_rate DECIMAL(5,2);
  v_commission_amount DECIMAL(10,2);
BEGIN
  -- Only process when status changes to converted
  IF NEW.conversion_status = 'converted' AND (OLD.conversion_status IS NULL OR OLD.conversion_status != 'converted') THEN
    -- Get partner details
    SELECT id, commission_rate INTO v_partner_id, v_commission_rate
    FROM public.affiliate_partners
    WHERE id = NEW.affiliate_partner_id;

    -- Calculate commission
    v_commission_amount := (NEW.conversion_value * v_commission_rate / 100);

    -- Update referral record
    NEW.commission_amount := v_commission_amount;
    NEW.converted_at := NOW();

    -- Update partner stats
    UPDATE public.affiliate_partners
    SET 
      total_conversions = total_conversions + 1,
      total_earnings = total_earnings + v_commission_amount,
      pending_payout = pending_payout + v_commission_amount,
      lifetime_earnings = lifetime_earnings + v_commission_amount
    WHERE id = v_partner_id;

    -- Create commission record
    INSERT INTO public.affiliate_commissions (
      affiliate_partner_id,
      referral_id,
      transaction_type,
      amount,
      status,
      subscription_tier
    ) VALUES (
      v_partner_id,
      NEW.id,
      'initial_conversion',
      v_commission_amount,
      'approved',
      NEW.subscription_tier
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER process_affiliate_conversion_trigger
BEFORE UPDATE ON public.affiliate_referrals
FOR EACH ROW
EXECUTE FUNCTION process_affiliate_conversion();

-- Function to generate unique affiliate code
CREATE OR REPLACE FUNCTION generate_affiliate_code(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character uppercase alphanumeric code
    v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || p_user_id::TEXT) FROM 1 FOR 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.affiliate_partners WHERE affiliate_code = v_code) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Function to get affiliate partner stats
CREATE OR REPLACE FUNCTION get_affiliate_stats(p_user_id UUID)
RETURNS TABLE (
  partner_id UUID,
  affiliate_code TEXT,
  status TEXT,
  total_referrals INTEGER,
  active_referrals INTEGER,
  total_conversions INTEGER,
  conversion_rate DECIMAL(5,2),
  total_earnings DECIMAL(10,2),
  pending_payout DECIMAL(10,2),
  lifetime_earnings DECIMAL(10,2),
  commission_rate DECIMAL(5,2),
  cookie_duration_days INTEGER,
  pro_referrals INTEGER,
  premium_referrals INTEGER,
  enterprise_referrals INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ap.id AS partner_id,
    ap.affiliate_code,
    ap.status,
    ap.total_referrals,
    (SELECT COUNT(*) FROM public.affiliate_referrals ar 
     WHERE ar.affiliate_partner_id = ap.id 
     AND ar.conversion_status = 'converted')::INTEGER AS active_referrals,
    ap.total_conversions,
    CASE 
      WHEN ap.total_referrals > 0 THEN (ap.total_conversions::DECIMAL / ap.total_referrals * 100)
      ELSE 0
    END AS conversion_rate,
    ap.total_earnings,
    ap.pending_payout,
    ap.lifetime_earnings,
    ap.commission_rate,
    ap.cookie_duration_days,
    (SELECT COUNT(*) FROM public.affiliate_referrals ar 
     WHERE ar.affiliate_partner_id = ap.id 
     AND ar.subscription_tier = 'pro' 
     AND ar.conversion_status = 'converted')::INTEGER AS pro_referrals,
    (SELECT COUNT(*) FROM public.affiliate_referrals ar 
     WHERE ar.affiliate_partner_id = ap.id 
     AND ar.subscription_tier = 'premium' 
     AND ar.conversion_status = 'converted')::INTEGER AS premium_referrals,
    (SELECT COUNT(*) FROM public.affiliate_referrals ar 
     WHERE ar.affiliate_partner_id = ap.id 
     AND ar.subscription_tier = 'enterprise' 
     AND ar.conversion_status = 'converted')::INTEGER AS enterprise_referrals
  FROM public.affiliate_partners ap
  WHERE ap.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_affiliate_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_affiliate_stats(UUID) TO authenticated;

COMMENT ON TABLE public.affiliate_partners IS 'Organizers enrolled in the affiliate program';
COMMENT ON TABLE public.affiliate_referrals IS 'Users referred by affiliate partners';
COMMENT ON TABLE public.affiliate_commissions IS 'Commission transactions for affiliate partners';
COMMENT ON TABLE public.affiliate_payouts IS 'Payout history for affiliate partners';
