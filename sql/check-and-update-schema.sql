-- ============================================================
-- EventNexus Database Schema Check and Update Script
-- ============================================================
-- Purpose: Check current database schema and add missing fields
-- for Pro and Premium tier features
-- 
-- Run this in Supabase SQL Editor to:
-- 1. Check what exists in your database
-- 2. Add missing columns and tables
-- 3. See a summary of changes
--
-- Date: 2025-12-20
-- ============================================================

-- ============================================================
-- STEP 1: CHECK EXISTING SCHEMA
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CHECKING CURRENT DATABASE SCHEMA';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- Check if tables exist
DO $$
BEGIN
    RAISE NOTICE '1. CHECKING TABLES:';
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        RAISE NOTICE '   ✓ users table exists';
    ELSE
        RAISE NOTICE '   ✗ users table MISSING';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events') THEN
        RAISE NOTICE '   ✓ events table exists';
    ELSE
        RAISE NOTICE '   ✗ events table MISSING';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tickets') THEN
        RAISE NOTICE '   ✓ tickets table exists';
    ELSE
        RAISE NOTICE '   ✗ tickets table MISSING';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        RAISE NOTICE '   ✓ notifications table exists';
    ELSE
        RAISE NOTICE '   ✗ notifications table MISSING';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_analytics') THEN
        RAISE NOTICE '   ✓ event_analytics table exists';
    ELSE
        RAISE NOTICE '   ✗ event_analytics table MISSING (will create)';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'affiliate_referrals') THEN
        RAISE NOTICE '   ✓ affiliate_referrals table exists';
    ELSE
        RAISE NOTICE '   ✗ affiliate_referrals table MISSING (will create)';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- Check users table columns
DO $$
BEGIN
    RAISE NOTICE '2. CHECKING USERS TABLE COLUMNS:';
    
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'subscription_tier') THEN
        RAISE NOTICE '   ✓ subscription_tier exists';
    ELSE
        RAISE NOTICE '   ✗ subscription_tier MISSING (will add)';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'subscription') THEN
        RAISE NOTICE '   ✓ subscription exists';
    ELSE
        RAISE NOTICE '   ✗ subscription MISSING';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'branding') THEN
        RAISE NOTICE '   ✓ branding exists';
    ELSE
        RAISE NOTICE '   ✗ branding MISSING';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'stripe_customer_id') THEN
        RAISE NOTICE '   ✓ stripe_customer_id exists';
    ELSE
        RAISE NOTICE '   ✗ stripe_customer_id MISSING (will add)';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'stripe_connect_account_id') THEN
        RAISE NOTICE '   ✓ stripe_connect_account_id exists';
    ELSE
        RAISE NOTICE '   ✗ stripe_connect_account_id MISSING (will add)';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- Check events table columns
DO $$
BEGIN
    RAISE NOTICE '3. CHECKING EVENTS TABLE COLUMNS:';
    
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'is_featured') THEN
        RAISE NOTICE '   ✓ is_featured exists';
    ELSE
        RAISE NOTICE '   ✗ is_featured MISSING (will add)';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'custom_branding') THEN
        RAISE NOTICE '   ✓ custom_branding exists';
    ELSE
        RAISE NOTICE '   ✗ custom_branding MISSING (will add)';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- Check tickets table columns
DO $$
BEGIN
    RAISE NOTICE '4. CHECKING TICKETS TABLE COLUMNS:';
    
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'custom_branding') THEN
        RAISE NOTICE '   ✓ custom_branding exists';
    ELSE
        RAISE NOTICE '   ✗ custom_branding MISSING (will add)';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'event_name') THEN
        RAISE NOTICE '   ✓ event_name exists';
    ELSE
        RAISE NOTICE '   ✗ event_name MISSING (will add)';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'event_location') THEN
        RAISE NOTICE '   ✓ event_location exists';
    ELSE
        RAISE NOTICE '   ✗ event_location MISSING (will add)';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================
-- STEP 2: ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ADDING MISSING COLUMNS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- Add missing columns to users table
DO $$
BEGIN
    -- Add subscription_tier (same as subscription for backward compatibility)
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'subscription_tier') THEN
        ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(50) DEFAULT 'free' 
            CHECK (subscription_tier IN ('free', 'pro', 'premium', 'enterprise'));
        
        -- Copy existing subscription values to subscription_tier
        UPDATE users SET subscription_tier = subscription WHERE subscription IS NOT NULL;
        
        RAISE NOTICE '✓ Added subscription_tier column to users table';
    END IF;
    
    -- Add Stripe fields
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'stripe_customer_id') THEN
        ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
        RAISE NOTICE '✓ Added stripe_customer_id column to users table';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'stripe_connect_account_id') THEN
        ALTER TABLE users ADD COLUMN stripe_connect_account_id TEXT;
        RAISE NOTICE '✓ Added stripe_connect_account_id column to users table';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'stripe_connect_onboarding_complete') THEN
        ALTER TABLE users ADD COLUMN stripe_connect_onboarding_complete BOOLEAN DEFAULT false;
        RAISE NOTICE '✓ Added stripe_connect_onboarding_complete column to users table';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'stripe_connect_charges_enabled') THEN
        ALTER TABLE users ADD COLUMN stripe_connect_charges_enabled BOOLEAN DEFAULT false;
        RAISE NOTICE '✓ Added stripe_connect_charges_enabled column to users table';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'affiliate_code') THEN
        ALTER TABLE users ADD COLUMN affiliate_code TEXT UNIQUE;
        RAISE NOTICE '✓ Added affiliate_code column to users table';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- Add missing columns to events table
DO $$
BEGIN
    -- Add is_featured for Premium tier map placement
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'is_featured') THEN
        ALTER TABLE events ADD COLUMN is_featured BOOLEAN DEFAULT false;
        RAISE NOTICE '✓ Added is_featured column to events table';
    END IF;
    
    -- Add custom_branding for Premium tier branding
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'custom_branding') THEN
        ALTER TABLE events ADD COLUMN custom_branding JSONB;
        RAISE NOTICE '✓ Added custom_branding column to events table';
    END IF;
    
    -- Add view count for analytics
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'view_count') THEN
        ALTER TABLE events ADD COLUMN view_count INTEGER DEFAULT 0;
        RAISE NOTICE '✓ Added view_count column to events table';
    END IF;
    
    -- Add share count for analytics
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'share_count') THEN
        ALTER TABLE events ADD COLUMN share_count INTEGER DEFAULT 0;
        RAISE NOTICE '✓ Added share_count column to events table';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- Add missing columns to tickets table
DO $$
BEGIN
    -- Add custom_branding (copied from event)
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'custom_branding') THEN
        ALTER TABLE tickets ADD COLUMN custom_branding JSONB;
        RAISE NOTICE '✓ Added custom_branding column to tickets table';
    END IF;
    
    -- Add event_name for easy display
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'event_name') THEN
        ALTER TABLE tickets ADD COLUMN event_name TEXT;
        RAISE NOTICE '✓ Added event_name column to tickets table';
    END IF;
    
    -- Add event_location for easy display
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'event_location') THEN
        ALTER TABLE tickets ADD COLUMN event_location TEXT;
        RAISE NOTICE '✓ Added event_location column to tickets table';
    END IF;
    
    -- Add price paid
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'price_paid') THEN
        ALTER TABLE tickets ADD COLUMN price_paid DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✓ Added price_paid column to tickets table';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================
-- STEP 3: CREATE NEW TABLES FOR PREMIUM FEATURES
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CREATING NEW TABLES';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- Create event_analytics table (Premium feature)
CREATE TABLE IF NOT EXISTS event_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    views INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    traffic_sources JSONB DEFAULT '{}'::jsonb,
    demographics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, date)
);

-- Create affiliate_referrals table (Premium feature)
CREATE TABLE IF NOT EXISTS affiliate_referrals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    referrer_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    referred_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    referral_code TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'completed')),
    subscription_tier VARCHAR(50),
    commission_rate DECIMAL(5,4) DEFAULT 0.15, -- 15%
    total_earned DECIMAL(10,2) DEFAULT 0,
    last_payout_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(referrer_id, referred_user_id)
);

-- Create affiliate_earnings table (Premium feature)
CREATE TABLE IF NOT EXISTS affiliate_earnings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    referral_id UUID REFERENCES affiliate_referrals(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    source VARCHAR(100) NOT NULL, -- 'subscription', 'upgrade', etc
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payout_history table
CREATE TABLE IF NOT EXISTS payout_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL,
    net_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
    stripe_payout_id TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_analytics') THEN
        RAISE NOTICE '✓ event_analytics table created/exists';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'affiliate_referrals') THEN
        RAISE NOTICE '✓ affiliate_referrals table created/exists';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'affiliate_earnings') THEN
        RAISE NOTICE '✓ affiliate_earnings table created/exists';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payout_history') THEN
        RAISE NOTICE '✓ payout_history table created/exists';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CREATING INDEXES';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_events_featured ON events(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_affiliate_code ON users(affiliate_code) WHERE affiliate_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_analytics_event ON event_analytics(event_id);
CREATE INDEX IF NOT EXISTS idx_event_analytics_date ON event_analytics(date);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referrer ON affiliate_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referred ON affiliate_referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_status ON affiliate_referrals(status);
CREATE INDEX IF NOT EXISTS idx_payout_history_user ON payout_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_history_status ON payout_history(status);

DO $$
BEGIN
    RAISE NOTICE '✓ All indexes created';
    RAISE NOTICE '';
END $$;

-- ============================================================
-- STEP 5: ENABLE ROW LEVEL SECURITY ON NEW TABLES
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ENABLING ROW LEVEL SECURITY';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

ALTER TABLE event_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_analytics
DROP POLICY IF EXISTS "Event organizers can view their analytics" ON event_analytics;
CREATE POLICY "Event organizers can view their analytics" ON event_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_analytics.event_id 
            AND events.organizer_id = auth.uid()
        )
    );

-- RLS Policies for affiliate_referrals
DROP POLICY IF EXISTS "Users can view their own referrals" ON affiliate_referrals;
CREATE POLICY "Users can view their own referrals" ON affiliate_referrals
    FOR SELECT USING (referrer_id = auth.uid() OR referred_user_id = auth.uid());

-- RLS Policies for affiliate_earnings
DROP POLICY IF EXISTS "Users can view their own earnings" ON affiliate_earnings;
CREATE POLICY "Users can view their own earnings" ON affiliate_earnings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM affiliate_referrals 
            WHERE affiliate_referrals.id = affiliate_earnings.referral_id 
            AND affiliate_referrals.referrer_id = auth.uid()
        )
    );

-- RLS Policies for payout_history
DROP POLICY IF EXISTS "Users can view their own payouts" ON payout_history;
CREATE POLICY "Users can view their own payouts" ON payout_history
    FOR SELECT USING (user_id = auth.uid());

DO $$
BEGIN
    RAISE NOTICE '✓ RLS policies created for new tables';
    RAISE NOTICE '';
END $$;

-- ============================================================
-- STEP 6: CREATE TRIGGERS AND FUNCTIONS
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CREATING TRIGGERS AND FUNCTIONS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- Function to update affiliate referral totals
CREATE OR REPLACE FUNCTION update_affiliate_totals()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
        UPDATE affiliate_referrals
        SET total_earned = total_earned + NEW.amount,
            last_payout_at = NOW()
        WHERE id = NEW.referral_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_affiliate_totals_trigger ON affiliate_earnings;
CREATE TRIGGER update_affiliate_totals_trigger
    AFTER UPDATE ON affiliate_earnings
    FOR EACH ROW
    EXECUTE FUNCTION update_affiliate_totals();

-- Function to auto-copy branding to tickets
CREATE OR REPLACE FUNCTION copy_branding_to_ticket()
RETURNS TRIGGER AS $$
DECLARE
    event_branding JSONB;
    event_title TEXT;
    event_loc TEXT;
BEGIN
    -- Get event branding, name, and location
    SELECT custom_branding, name, location->>'city' 
    INTO event_branding, event_title, event_loc
    FROM events 
    WHERE id = NEW.event_id;
    
    -- Update ticket with branding and event info
    NEW.custom_branding := event_branding;
    NEW.event_name := event_title;
    NEW.event_location := event_loc;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS copy_branding_to_ticket_trigger ON tickets;
CREATE TRIGGER copy_branding_to_ticket_trigger
    BEFORE INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION copy_branding_to_ticket();

-- Function to auto-generate affiliate code
CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.subscription_tier IN ('premium', 'enterprise') AND NEW.affiliate_code IS NULL THEN
        NEW.affiliate_code := 'REF-' || UPPER(SUBSTRING(MD5(NEW.id::text) FROM 1 FOR 8));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generate_affiliate_code_trigger ON users;
CREATE TRIGGER generate_affiliate_code_trigger
    BEFORE INSERT OR UPDATE OF subscription_tier ON users
    FOR EACH ROW
    EXECUTE FUNCTION generate_affiliate_code();

DO $$
BEGIN
    RAISE NOTICE '✓ All triggers and functions created';
    RAISE NOTICE '';
END $$;

-- ============================================================
-- STEP 7: FINAL SUMMARY
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DATABASE UPDATE COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Summary of changes:';
    RAISE NOTICE '-------------------';
    RAISE NOTICE '✓ Added is_featured column to events (Premium map placement)';
    RAISE NOTICE '✓ Added custom_branding columns to events and tickets';
    RAISE NOTICE '✓ Added analytics columns (view_count, share_count)';
    RAISE NOTICE '✓ Added Stripe integration columns to users';
    RAISE NOTICE '✓ Added affiliate_code column to users';
    RAISE NOTICE '✓ Created event_analytics table (Premium analytics)';
    RAISE NOTICE '✓ Created affiliate_referrals table (Premium affiliate program)';
    RAISE NOTICE '✓ Created affiliate_earnings table (tracking commissions)';
    RAISE NOTICE '✓ Created payout_history table (organizer payouts)';
    RAISE NOTICE '✓ Created all necessary indexes';
    RAISE NOTICE '✓ Enabled RLS on all new tables';
    RAISE NOTICE '✓ Created auto-update triggers for branding and affiliates';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '-----------';
    RAISE NOTICE '1. Test creating a Premium event and verify is_featured = true';
    RAISE NOTICE '2. Test ticket generation and verify custom_branding is copied';
    RAISE NOTICE '3. Test affiliate code generation for Premium users';
    RAISE NOTICE '4. Verify RLS policies work correctly';
    RAISE NOTICE '';
    RAISE NOTICE 'All Pro and Premium tier features are now supported!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;
