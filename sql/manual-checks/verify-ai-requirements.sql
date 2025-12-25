-- ============================================================
-- EventNexus AI Tools Database Requirements Verification
-- ============================================================
-- Purpose: Verify that all database structures needed for
-- Enterprise Success Manager AI tools are in place
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'AI TOOLS DATABASE REQUIREMENTS CHECK';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- Check events table required fields
DO $$
BEGIN
    RAISE NOTICE '1. EVENTS TABLE - Required for AI Tools:';
    RAISE NOTICE '';
    
    -- Core fields
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_name = 'events' AND column_name = 'id') THEN
        RAISE NOTICE '   ✓ id (UUID) - Event identification';
    ELSE
        RAISE NOTICE '   ✗ MISSING: id';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_name = 'events' AND column_name = 'name') THEN
        RAISE NOTICE '   ✓ name - Event title';
    ELSE
        RAISE NOTICE '   ✗ MISSING: name';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_name = 'events' AND column_name = 'organizer_id') THEN
        RAISE NOTICE '   ✓ organizer_id - Links events to users';
    ELSE
        RAISE NOTICE '   ✗ MISSING: organizer_id';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_name = 'events' AND column_name = 'price') THEN
        RAISE NOTICE '   ✓ price - For revenue calculations';
    ELSE
        RAISE NOTICE '   ✗ MISSING: price';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_name = 'events' AND column_name = 'attendees_count') THEN
        RAISE NOTICE '   ✓ attendees_count - For analytics';
    ELSE
        RAISE NOTICE '   ✗ MISSING: attendees_count';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_name = 'events' AND column_name = 'category') THEN
        RAISE NOTICE '   ✓ category - Event classification';
    ELSE
        RAISE NOTICE '   ✗ MISSING: category';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_name = 'events' AND column_name = 'date') THEN
        RAISE NOTICE '   ✓ date - Event scheduling';
    ELSE
        RAISE NOTICE '   ✗ MISSING: date';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_name = 'events' AND column_name = 'status') THEN
        RAISE NOTICE '   ✓ status - Filter active events';
    ELSE
        RAISE NOTICE '   ✗ MISSING: status';
    END IF;
    
    -- Premium fields
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_name = 'events' AND column_name = 'is_featured') THEN
        RAISE NOTICE '   ✓ is_featured - Premium tier feature';
    ELSE
        RAISE NOTICE '   ⚠ is_featured MISSING (Premium feature)';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_name = 'events' AND column_name = 'custom_branding') THEN
        RAISE NOTICE '   ✓ custom_branding - Premium tier feature';
    ELSE
        RAISE NOTICE '   ⚠ custom_branding MISSING (Premium feature)';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- Check users table required fields
DO $$
BEGIN
    RAISE NOTICE '2. USERS TABLE - Required for AI Context:';
    RAISE NOTICE '';
    
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'id') THEN
        RAISE NOTICE '   ✓ id (UUID) - User identification';
    ELSE
        RAISE NOTICE '   ✗ MISSING: id';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'name') THEN
        RAISE NOTICE '   ✓ name - Personalized greetings';
    ELSE
        RAISE NOTICE '   ✗ MISSING: name';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'email') THEN
        RAISE NOTICE '   ✓ email - User contact';
    ELSE
        RAISE NOTICE '   ✗ MISSING: email';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'subscription_tier') THEN
        RAISE NOTICE '   ✓ subscription_tier - Access control';
    ELSE
        RAISE NOTICE '   ⚠ subscription_tier MISSING (may use subscription instead)';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'role') THEN
        RAISE NOTICE '   ✓ role - User permissions';
    ELSE
        RAISE NOTICE '   ✗ MISSING: role';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'branding') THEN
        RAISE NOTICE '   ✓ branding - Enterprise customization';
    ELSE
        RAISE NOTICE '   ⚠ branding MISSING (Enterprise feature)';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- Check AI tool function requirements
DO $$
DECLARE
    event_count INTEGER;
    user_count INTEGER;
    test_user_id UUID;
    test_events INTEGER;
BEGIN
    RAISE NOTICE '3. AI TOOL FUNCTION TESTS:';
    RAISE NOTICE '';
    
    -- Test 1: get_platform_events
    SELECT COUNT(*) INTO event_count FROM events WHERE status = 'active';
    RAISE NOTICE '   ✓ get_platform_events: % active events found', event_count;
    
    -- Test 2: get_my_events (requires organizer_id)
    SELECT id INTO test_user_id FROM users LIMIT 1;
    IF test_user_id IS NOT NULL THEN
        SELECT COUNT(*) INTO test_events FROM events WHERE organizer_id = test_user_id;
        RAISE NOTICE '   ✓ get_my_events: Works (test user has % events)', test_events;
    ELSE
        RAISE NOTICE '   ⚠ get_my_events: No users to test';
    END IF;
    
    -- Test 3: analyze_performance (requires price, attendees_count)
    SELECT COUNT(*) INTO event_count 
    FROM events 
    WHERE price IS NOT NULL AND attendees_count IS NOT NULL;
    RAISE NOTICE '   ✓ analyze_performance: % events have price & attendee data', event_count;
    
    RAISE NOTICE '';
END $$;

-- Summary
DO $$
DECLARE
    missing_critical INTEGER := 0;
    missing_premium INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- Count missing critical fields
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'organizer_id') THEN
        missing_critical := missing_critical + 1;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'price') THEN
        missing_critical := missing_critical + 1;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'attendees_count') THEN
        missing_critical := missing_critical + 1;
    END IF;
    
    -- Count missing premium fields
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'is_featured') THEN
        missing_premium := missing_premium + 1;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'custom_branding') THEN
        missing_premium := missing_premium + 1;
    END IF;
    
    IF missing_critical = 0 THEN
        RAISE NOTICE '✅ CORE AI TOOLS: Ready to use';
        RAISE NOTICE '   - get_my_events: ✓';
        RAISE NOTICE '   - get_platform_events: ✓';
        RAISE NOTICE '   - analyze_performance: ✓';
    ELSE
        RAISE NOTICE '❌ CORE AI TOOLS: % critical fields missing', missing_critical;
    END IF;
    
    RAISE NOTICE '';
    
    IF missing_premium = 0 THEN
        RAISE NOTICE '✅ PREMIUM FEATURES: Database ready';
        RAISE NOTICE '   - Featured events: ✓';
        RAISE NOTICE '   - Custom branding: ✓';
    ELSE
        RAISE NOTICE '⚠️  PREMIUM FEATURES: % fields missing', missing_premium;
        RAISE NOTICE '   Run check-and-update-schema.sql to add them';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🤖 AI GENERATION TOOLS: No database required';
    RAISE NOTICE '   - generate_flyer: Uses Gemini AI';
    RAISE NOTICE '   - generate_ad_campaign: Uses Gemini AI';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;
