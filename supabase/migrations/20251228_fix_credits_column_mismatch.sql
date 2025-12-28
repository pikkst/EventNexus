-- ============================================
-- Fix Credit Column Mismatch
-- Date: 2025-12-28
-- Issue: Database functions use 'credits' but application uses 'credits_balance'
-- Solution: Update all database functions to use 'credits_balance'
-- ============================================

-- Update unlock_feature_for_user function to use credits_balance
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
    -- Get current credits from credits_balance column
    SELECT COALESCE(credits_balance, 0) INTO v_current_credits
    FROM public.users
    WHERE id = p_user_id;
    
    -- Check if user has enough credits
    IF v_current_credits < p_credits_cost THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Insufficient credits',
            'current_credits', v_current_credits,
            'required_credits', p_credits_cost
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
    
    -- Deduct credits from credits_balance column
    v_new_balance := v_current_credits - p_credits_cost;
    UPDATE public.users
    SET credits_balance = v_new_balance
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
    
    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Feature unlocked successfully',
        'unlock_id', v_unlock_id,
        'credits_remaining', v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update record_credit_transaction function to use credits_balance
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
    -- Get current balance from credits_balance column
    SELECT COALESCE(credits_balance, 0) INTO v_current_balance
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

-- Update award_welcome_credits function to use credits_balance
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
    
    -- Add 100 welcome credits to credits_balance column
    UPDATE public.users
    SET credits_balance = COALESCE(credits_balance, 0) + 100
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

-- Sync any remaining credits from old 'credits' column to 'credits_balance'
UPDATE public.users
SET credits_balance = GREATEST(COALESCE(credits, 0), COALESCE(credits_balance, 0))
WHERE credits > COALESCE(credits_balance, 0);

-- Add comment
COMMENT ON FUNCTION unlock_feature_for_user IS 'Unlock a premium feature for a user by spending credits from credits_balance column';
COMMENT ON FUNCTION record_credit_transaction IS 'Record a credit transaction using credits_balance column';
COMMENT ON FUNCTION award_welcome_credits IS 'Award 100 welcome credits to new users using credits_balance column';
