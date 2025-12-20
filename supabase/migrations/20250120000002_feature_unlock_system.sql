-- ============================================
-- Feature Unlock & Credit System Redesign
-- ============================================
-- Credits allow FREE tier users to unlock premium features
-- 1 credit = 0.5 EUR value
-- New users get 100 credits welcome bonus
-- ============================================

-- Feature unlocks table
CREATE TABLE IF NOT EXISTS public.feature_unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL,
    credits_spent INTEGER NOT NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    CONSTRAINT unique_user_feature_event UNIQUE(user_id, feature_name, event_id)
);

-- Credit transactions table (track all credit movements)
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- Positive for credits added, negative for credits spent
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'welcome_bonus',
        'purchase',
        'admin_grant',
        'feature_unlock',
        'refund',
        'subscription_bonus',
        'referral_bonus',
        'promotion'
    )),
    description TEXT,
    balance_after INTEGER NOT NULL,
    reference_id UUID, -- Reference to feature_unlock or purchase
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Ticket scans table (for ticket verification)
CREATE TABLE IF NOT EXISTS public.ticket_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    scanned_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    scan_result TEXT NOT NULL CHECK (scan_result IN (
        'valid',
        'invalid',
        'already_used',
        'expired',
        'cancelled',
        'manual_validation'
    )),
    notes TEXT,
    device_info JSONB DEFAULT '{}'::jsonb
);

-- Add missing columns to tickets table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'ticket_type') THEN
        ALTER TABLE public.tickets ADD COLUMN ticket_type TEXT DEFAULT 'general';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'price') THEN
        ALTER TABLE public.tickets ADD COLUMN price NUMERIC(10,2) DEFAULT 0.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'scanned_at') THEN
        ALTER TABLE public.tickets ADD COLUMN scanned_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'scanned_by') THEN
        ALTER TABLE public.tickets ADD COLUMN scanned_by UUID REFERENCES public.users(id);
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feature_unlocks_user_id ON public.feature_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_unlocks_feature_name ON public.feature_unlocks(feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_unlocks_event_id ON public.feature_unlocks(event_id);
CREATE INDEX IF NOT EXISTS idx_feature_unlocks_expires_at ON public.feature_unlocks(expires_at);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_ticket_scans_ticket_id ON public.ticket_scans(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_event_id ON public.ticket_scans(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_scanned_by ON public.ticket_scans(scanned_by);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_scanned_at ON public.ticket_scans(scanned_at);

-- RLS Policies for feature_unlocks
ALTER TABLE public.feature_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feature unlocks"
    ON public.feature_unlocks
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users cannot directly insert feature unlocks"
    ON public.feature_unlocks
    FOR INSERT
    WITH CHECK (false); -- Must use RPC function

CREATE POLICY "Admins can view all feature unlocks"
    ON public.feature_unlocks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- RLS Policies for credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit transactions"
    ON public.credit_transactions
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all credit transactions"
    ON public.credit_transactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- RLS Policies for ticket_scans
ALTER TABLE public.ticket_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view own event scans"
    ON public.ticket_scans
    FOR SELECT
    USING (
        scanned_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = ticket_scans.event_id
            AND events.organizer_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all ticket scans"
    ON public.ticket_scans
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Function to record credit transaction
CREATE OR REPLACE FUNCTION record_credit_transaction(
    p_user_id UUID,
    p_amount INTEGER,
    p_transaction_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_current_balance INTEGER;
BEGIN
    -- Get current balance
    SELECT credits INTO v_current_balance
    FROM public.users
    WHERE id = p_user_id;
    
    -- Insert transaction record
    INSERT INTO public.credit_transactions (
        user_id,
        amount,
        transaction_type,
        description,
        balance_after,
        reference_id
    ) VALUES (
        p_user_id,
        p_amount,
        p_transaction_type,
        p_description,
        v_current_balance,
        p_reference_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unlock a feature
CREATE OR REPLACE FUNCTION unlock_feature_for_user(
    p_user_id UUID,
    p_feature_name TEXT,
    p_credits_cost INTEGER,
    p_event_id UUID DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_current_credits INTEGER;
    v_new_balance INTEGER;
    v_unlock_id UUID;
BEGIN
    -- Get current credits
    SELECT credits INTO v_current_credits
    FROM public.users
    WHERE id = p_user_id;
    
    -- Check if user has enough credits
    IF v_current_credits < p_credits_cost THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Insufficient credits'
        );
    END IF;
    
    -- Check if feature already unlocked
    IF EXISTS (
        SELECT 1 FROM public.feature_unlocks
        WHERE user_id = p_user_id
        AND feature_name = p_feature_name
        AND (event_id = p_event_id OR (event_id IS NULL AND p_event_id IS NULL))
        AND (expires_at IS NULL OR expires_at > NOW())
        AND is_active = true
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Feature already unlocked'
        );
    END IF;
    
    -- Deduct credits
    v_new_balance := v_current_credits - p_credits_cost;
    UPDATE public.users
    SET credits = v_new_balance
    WHERE id = p_user_id;
    
    -- Create feature unlock
    INSERT INTO public.feature_unlocks (
        user_id,
        feature_name,
        credits_spent,
        event_id,
        expires_at
    ) VALUES (
        p_user_id,
        p_feature_name,
        p_credits_cost,
        p_event_id,
        p_expires_at
    ) RETURNING id INTO v_unlock_id;
    
    -- Record transaction
    PERFORM record_credit_transaction(
        p_user_id,
        -p_credits_cost,
        'feature_unlock',
        'Unlocked: ' || p_feature_name,
        v_unlock_id
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Feature unlocked successfully',
        'unlock_id', v_unlock_id,
        'credits_remaining', v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award welcome credits
CREATE OR REPLACE FUNCTION award_welcome_credits(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_already_awarded BOOLEAN;
BEGIN
    -- Check if already awarded
    SELECT EXISTS (
        SELECT 1 FROM public.credit_transactions
        WHERE user_id = p_user_id
        AND transaction_type = 'welcome_bonus'
    ) INTO v_already_awarded;
    
    IF v_already_awarded THEN
        RETURN false;
    END IF;
    
    -- Add 100 welcome credits
    UPDATE public.users
    SET credits = credits + 100
    WHERE id = p_user_id;
    
    -- Record transaction
    PERFORM record_credit_transaction(
        p_user_id,
        100,
        'welcome_bonus',
        'Welcome to EventNexus! Enjoy 100 free credits (€50 value)'
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically award welcome credits to new users
CREATE OR REPLACE FUNCTION trigger_award_welcome_credits()
RETURNS TRIGGER AS $$
BEGIN
    -- Award credits after a short delay to ensure user profile is complete
    PERFORM award_welcome_credits(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER award_welcome_credits_trigger
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_award_welcome_credits();

-- Function to get user's feature access
CREATE OR REPLACE FUNCTION check_feature_access(
    p_user_id UUID,
    p_feature_name TEXT,
    p_event_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_tier TEXT;
    v_has_unlock BOOLEAN;
BEGIN
    -- Get user tier
    SELECT subscription_tier INTO v_user_tier
    FROM public.users
    WHERE id = p_user_id;
    
    -- Check if feature is included in tier (simplified - should match featureUnlockService.ts logic)
    IF v_user_tier IN ('premium', 'enterprise') THEN
        RETURN true; -- Premium and Enterprise have most features
    END IF;
    
    -- Check if user has unlocked this feature
    SELECT EXISTS (
        SELECT 1 FROM public.feature_unlocks
        WHERE user_id = p_user_id
        AND feature_name = p_feature_name
        AND (event_id = p_event_id OR (event_id IS NULL AND p_event_id IS NULL))
        AND (expires_at IS NULL OR expires_at > NOW())
        AND is_active = true
    ) INTO v_has_unlock;
    
    RETURN v_has_unlock;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.feature_unlocks IS 'Tracks premium features unlocked by free tier users using credits';
COMMENT ON TABLE public.credit_transactions IS 'Audit log of all credit movements (purchases, spending, bonuses)';
COMMENT ON TABLE public.ticket_scans IS 'Log of ticket scans for entry verification';
COMMENT ON FUNCTION unlock_feature_for_user IS 'Unlock a premium feature for a user by spending credits';
COMMENT ON FUNCTION award_welcome_credits IS 'Give 100 welcome credits to new users (one-time only)';
COMMENT ON FUNCTION check_feature_access IS 'Check if user has access to a feature (via tier or unlock)';
