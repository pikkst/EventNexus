-- ============================================
-- Seed Sample Campaign for Landing Page
-- ============================================
-- Run this in Supabase SQL Editor to create
-- a sample campaign that will appear on the
-- landing page
-- ============================================

-- Delete any existing sample campaigns (optional)
-- DELETE FROM public.campaigns WHERE tracking_code = 'LAUNCH24';

-- Insert a sample campaign matching the landing page design
INSERT INTO public.campaigns (
    id,
    title,
    copy,
    status,
    placement,
    target,
    cta,
    image_url,
    tracking_code,
    incentive,
    metrics,
    tracking,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Experience The Future of Nightlife',
    'Join the map-first revolution. First 100 registrations today get 30 Nexus Credits instantly.',
    'Active',
    'landing_page',
    'attendees',
    'Claim My Credits',
    'https://images.unsplash.com/photo-1514525253361-bee243870d24?auto=format&fit=crop&w=1200&q=80',
    'LAUNCH24',
    jsonb_build_object(
        'type', 'credits',
        'value', 30,
        'limit', 100,
        'redeemed', 42,
        'description', '30 credits bonus'
    ),
    jsonb_build_object(
        'views', 0,
        'clicks', 0,
        'guestSignups', 0,
        'proConversions', 0,
        'revenueValue', 0
    ),
    jsonb_build_object(
        'sources', jsonb_build_object(
            'facebook', 0,
            'x', 0,
            'instagram', 0,
            'direct', 0
        )
    ),
    NOW(),
    NOW()
)
ON CONFLICT (tracking_code) DO UPDATE SET
    title = EXCLUDED.title,
    copy = EXCLUDED.copy,
    status = EXCLUDED.status,
    placement = EXCLUDED.placement,
    target = EXCLUDED.target,
    cta = EXCLUDED.cta,
    image_url = EXCLUDED.image_url,
    incentive = EXCLUDED.incentive,
    updated_at = NOW();

-- Verify the campaign was created
SELECT 
    id,
    title,
    status,
    placement,
    target,
    cta,
    tracking_code,
    (incentive->>'type') AS incentive_type,
    (incentive->>'value')::int AS incentive_value,
    (incentive->>'limit')::int AS incentive_limit,
    (incentive->>'redeemed')::int AS incentive_redeemed,
    ((incentive->>'limit')::int - (incentive->>'redeemed')::int) AS spots_remaining,
    ((incentive->>'value')::decimal * 0.5) AS reward_value_eur,
    created_at,
    '✅ Campaign created successfully' AS status_message
FROM public.campaigns
WHERE tracking_code = 'LAUNCH24';

-- Additional sample campaigns (optional)
-- ============================================

-- Campaign 2: Pro Plan Discount
INSERT INTO public.campaigns (
    title,
    copy,
    status,
    placement,
    target,
    cta,
    image_url,
    tracking_code,
    incentive,
    metrics,
    tracking
) VALUES (
    'Black Friday Special',
    'Get 40% off Pro Plan for the first 3 months. Limited to first 50 organizers who sign up this week.',
    'Active',
    'dashboard',
    'organizers',
    'Upgrade to Pro',
    'https://images.unsplash.com/photo-1607827447604-f05821e5f440?auto=format&fit=crop&w=1200&q=80',
    'BF2024',
    jsonb_build_object(
        'type', 'pro_discount',
        'value', 40,
        'limit', 50,
        'redeemed', 12,
        'durationMonths', 3,
        'description', '40% off Pro for 3 months'
    ),
    jsonb_build_object(
        'views', 0,
        'clicks', 0,
        'guestSignups', 0,
        'proConversions', 0,
        'revenueValue', 0
    ),
    jsonb_build_object(
        'sources', jsonb_build_object(
            'facebook', 0,
            'x', 0,
            'instagram', 0,
            'direct', 0
        )
    )
)
ON CONFLICT (tracking_code) DO NOTHING;

-- Campaign 3: Both Landing Page and Dashboard
INSERT INTO public.campaigns (
    title,
    copy,
    status,
    placement,
    target,
    cta,
    image_url,
    tracking_code,
    incentive,
    metrics,
    tracking
) VALUES (
    'New Year, New Events',
    'Start 2025 right! Create your first event and get 50 bonus credits. Perfect for testing all premium features.',
    'Active',
    'both',
    'all',
    'Start Creating',
    'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?auto=format&fit=crop&w=1200&q=80',
    'NY2025',
    jsonb_build_object(
        'type', 'credits',
        'value', 50,
        'limit', 200,
        'redeemed', 87,
        'description', '50 credits bonus for first event'
    ),
    jsonb_build_object(
        'views', 0,
        'clicks', 0,
        'guestSignups', 0,
        'proConversions', 0,
        'revenueValue', 0
    ),
    jsonb_build_object(
        'sources', jsonb_build_object(
            'facebook', 0,
            'x', 0,
            'instagram', 0,
            'direct', 0
        )
    )
)
ON CONFLICT (tracking_code) DO NOTHING;

-- Verify all campaigns
SELECT 
    title,
    status,
    placement,
    target,
    tracking_code,
    (incentive->>'type') AS type,
    (incentive->>'value')::int AS value,
    (incentive->>'limit')::int - (incentive->>'redeemed')::int AS spots_left,
    created_at
FROM public.campaigns
WHERE status = 'Active'
ORDER BY created_at DESC;

-- Show what will appear on landing page
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'LANDING PAGE CAMPAIGNS';
    RAISE NOTICE '====================================';
    RAISE NOTICE '';
    RAISE NOTICE 'These campaigns will appear on the landing page:';
    RAISE NOTICE '';
END $$;

SELECT 
    '🎯 ' || title AS campaign,
    '💰 ' || (incentive->>'value') || ' ' || (incentive->>'type') AS reward,
    '📊 ' || ((incentive->>'limit')::int - (incentive->>'redeemed')::int)::text || ' spots remaining' AS availability,
    '💵 €' || ((incentive->>'value')::decimal * 0.5)::text || ' value' AS euro_value
FROM public.campaigns
WHERE status = 'Active' 
  AND placement IN ('landing_page', 'both')
ORDER BY created_at DESC;
