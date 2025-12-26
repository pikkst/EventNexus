-- Referral System Tables

-- Add referral code to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_action_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON public.users(referred_by);

-- User Behavior Tracking
CREATE TABLE IF NOT EXISTS public.user_behavior (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('view', 'like', 'attend', 'search')),
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    category TEXT,
    organizer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    search_query TEXT,
    location JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_behavior_user_id ON public.user_behavior(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_action ON public.user_behavior(action);
CREATE INDEX IF NOT EXISTS idx_user_behavior_timestamp ON public.user_behavior(timestamp DESC);

-- Analytics Events
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    category TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON public.analytics_events(timestamp DESC);

-- Funnel Tracking
CREATE TABLE IF NOT EXISTS public.funnel_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funnel TEXT NOT NULL CHECK (funnel IN ('signup', 'subscription', 'ticket_purchase', 'event_creation')),
    step TEXT NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    success BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnel_tracking_funnel ON public.funnel_tracking(funnel);
CREATE INDEX IF NOT EXISTS idx_funnel_tracking_user_id ON public.funnel_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_funnel_tracking_timestamp ON public.funnel_tracking(timestamp DESC);

-- A/B Tests
CREATE TABLE IF NOT EXISTS public.ab_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_name TEXT NOT NULL,
    variant TEXT NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    converted BOOLEAN DEFAULT false,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ab_tests_name ON public.ab_tests(test_name);
CREATE INDEX IF NOT EXISTS idx_ab_tests_variant ON public.ab_tests(variant);
CREATE INDEX IF NOT EXISTS idx_ab_tests_timestamp ON public.ab_tests(timestamp DESC);

-- User Conversions
CREATE TABLE IF NOT EXISTS public.user_conversions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    conversion_type TEXT NOT NULL CHECK (conversion_type IN ('ticket_purchase', 'event_creation', 'subscription_upgrade')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_conversions_user_id ON public.user_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_conversions_type ON public.user_conversions(conversion_type);
CREATE INDEX IF NOT EXISTS idx_user_conversions_timestamp ON public.user_conversions(timestamp DESC);

-- Feature Usage
CREATE TABLE IF NOT EXISTS public.feature_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature_name TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_usage_feature ON public.feature_usage(feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_usage_user_id ON public.feature_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_timestamp ON public.feature_usage(timestamp DESC);

-- Error Logs
CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    context JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_type ON public.error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON public.error_logs(timestamp DESC);

-- Retention Tracking
CREATE TABLE IF NOT EXISTS public.retention_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    days_since_signup INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retention_user_id ON public.retention_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_retention_days ON public.retention_tracking(days_since_signup);
CREATE INDEX IF NOT EXISTS idx_retention_timestamp ON public.retention_tracking(timestamp DESC);

-- Credit Transactions - Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add transaction_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'credit_transactions' 
                   AND column_name = 'transaction_type') THEN
        ALTER TABLE public.credit_transactions 
        ADD COLUMN transaction_type TEXT;
    END IF;

    -- Add metadata column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'credit_transactions' 
                   AND column_name = 'metadata') THEN
        ALTER TABLE public.credit_transactions 
        ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Update constraint on transaction_type if it exists
DO $$ 
BEGIN
    -- Drop old constraint if exists
    ALTER TABLE public.credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_transaction_type_check;
    
    -- Add new constraint with all possible values
    ALTER TABLE public.credit_transactions 
    ADD CONSTRAINT credit_transactions_transaction_type_check 
    CHECK (transaction_type IN ('referral_bonus', 'first_action_bonus', 'purchase', 'credit', 'debit'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);

-- RLS Policies
ALTER TABLE public.user_behavior ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for user_behavior
CREATE POLICY "Users can view own behavior" ON public.user_behavior FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own behavior" ON public.user_behavior FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all behavior" ON public.user_behavior FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Policies for credit_transactions
CREATE POLICY "Users can view own transactions" ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage transactions" ON public.credit_transactions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Admins can view all transactions" ON public.credit_transactions FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Policies for analytics (admin only)
CREATE POLICY "Admins can view analytics" ON public.analytics_events FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));
CREATE POLICY "Service role can insert analytics" ON public.analytics_events FOR INSERT WITH CHECK (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);

-- Functions for conversion metrics
CREATE OR REPLACE FUNCTION get_conversion_metrics(start_date TIMESTAMP WITH TIME ZONE, end_date TIMESTAMP WITH TIME ZONE)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'signups', (SELECT COUNT(*) FROM public.users WHERE created_at BETWEEN start_date AND end_date),
        'subscriptions', (SELECT COUNT(*) FROM public.user_conversions WHERE conversion_type = 'subscription_upgrade' AND timestamp BETWEEN start_date AND end_date),
        'ticketPurchases', (SELECT COUNT(*) FROM public.user_conversions WHERE conversion_type = 'ticket_purchase' AND timestamp BETWEEN start_date AND end_date),
        'eventsCreated', (SELECT COUNT(*) FROM public.user_conversions WHERE conversion_type = 'event_creation' AND timestamp BETWEEN start_date AND end_date)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_conversion_metrics TO authenticated;

COMMENT ON TABLE public.user_behavior IS 'Tracks user interactions for personalization';
COMMENT ON TABLE public.analytics_events IS 'General analytics events tracking';
COMMENT ON TABLE public.funnel_tracking IS 'Conversion funnel step tracking';
COMMENT ON TABLE public.ab_tests IS 'A/B test variant tracking';
COMMENT ON TABLE public.credit_transactions IS 'Credit system transaction log';
