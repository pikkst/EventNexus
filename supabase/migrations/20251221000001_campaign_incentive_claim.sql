-- ============================================
-- Campaign Incentive Claim System
-- ============================================
-- Automatically award campaign incentives on user registration
-- ============================================

-- Function to claim campaign incentive
CREATE OR REPLACE FUNCTION claim_campaign_incentive(
    p_user_id UUID,
    p_campaign_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_campaign RECORD;
    v_incentive JSONB;
    v_spots_remaining INTEGER;
    v_result JSONB;
BEGIN
    -- Get campaign details with row lock
    SELECT * INTO v_campaign
    FROM public.campaigns
    WHERE id = p_campaign_id
    AND status = 'Active'
    FOR UPDATE;
    
    -- Check if campaign exists and is active
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Campaign not found or inactive'
        );
    END IF;
    
    v_incentive := v_campaign.incentive;
    
    -- Check if incentive exists
    IF v_incentive IS NULL OR (v_incentive->>'type') = 'none' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No incentive available'
        );
    END IF;
    
    -- Calculate spots remaining
    v_spots_remaining := (v_incentive->>'limit')::integer - (v_incentive->>'redeemed')::integer;
    
    -- Check if spots are available
    IF v_spots_remaining <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No spots remaining'
        );
    END IF;
    
    -- Handle credits incentive
    IF (v_incentive->>'type') = 'credits' THEN
        -- Add credits to user
        UPDATE public.users
        SET credits = COALESCE(credits, 0) + (v_incentive->>'value')::integer
        WHERE id = p_user_id;
        
        -- Create credit transaction record
        INSERT INTO public.credit_transactions (
            user_id,
            amount,
            transaction_type,
            description,
            balance_after
        ) VALUES (
            p_user_id,
            (v_incentive->>'value')::integer,
            'campaign_reward',
            format('Campaign reward: %s', v_campaign.title),
            (SELECT credits FROM public.users WHERE id = p_user_id)
        );
        
        v_result := jsonb_build_object(
            'success', true,
            'type', 'credits',
            'value', (v_incentive->>'value')::integer,
            'description', format('You received %s credits!', v_incentive->>'value')
        );
    
    -- Handle pro_discount incentive
    ELSIF (v_incentive->>'type') = 'pro_discount' THEN
        -- Store discount for user to claim during upgrade
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            "isRead",
            timestamp,
            metadata
        ) VALUES (
            p_user_id,
            format('Campaign Reward: %s%% Off Pro Plan!', v_incentive->>'value'),
            format('Claim your %s%% discount when upgrading to Pro Plan (valid for %s months)', 
                   v_incentive->>'value',
                   COALESCE(v_incentive->>'durationMonths', '3')),
            'campaign_reward',
            false,
            NOW(),
            jsonb_build_object(
                'campaign_id', p_campaign_id,
                'discount_percentage', (v_incentive->>'value')::integer,
                'duration_months', COALESCE((v_incentive->>'durationMonths')::integer, 3)
            )
        );
        
        v_result := jsonb_build_object(
            'success', true,
            'type', 'pro_discount',
            'value', (v_incentive->>'value')::integer,
            'description', format('You unlocked %s%% off Pro Plan!', v_incentive->>'value')
        );
    
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unknown incentive type'
        );
    END IF;
    
    -- Increment redeemed count
    UPDATE public.campaigns
    SET 
        incentive = jsonb_set(
            incentive,
            '{redeemed}',
            to_jsonb((v_incentive->>'redeemed')::integer + 1)
        ),
        updated_at = NOW()
    WHERE id = p_campaign_id;
    
    -- Increment guestSignups metric
    UPDATE public.campaigns
    SET 
        metrics = jsonb_set(
            metrics,
            '{guestSignups}',
            to_jsonb(COALESCE((metrics->>'guestSignups')::integer, 0) + 1)
        ),
        updated_at = NOW()
    WHERE id = p_campaign_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION claim_campaign_incentive TO authenticated;

COMMENT ON FUNCTION claim_campaign_incentive IS 'Claim campaign incentive for a user and update campaign metrics';
