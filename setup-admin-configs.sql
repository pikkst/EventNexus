-- Complete Admin Dashboard Configuration Setup
-- Run this in Supabase SQL Editor after creating the database schema

-- 1. MASTER PASSKEY (already done)
-- Already inserted: master_passkey

-- 2. SYSTEM CONFIGURATION DEFAULTS
INSERT INTO public.system_config (key, value, updated_at)
VALUES 
    ('global_ticket_fee', '2.5'::json, NOW()),
    ('credit_value', '0.50'::json, NOW()),
    ('maintenance_mode', 'false'::json, NOW())
ON CONFLICT (key) 
DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- 3. API KEYS - STRIPE (Payments)
INSERT INTO public.system_config (key, value, updated_at)
VALUES 
    ('stripe_pk', '"pk_test_..."'::json, NOW()),
    ('stripe_sk', '"sk_test_..."'::json, NOW()),
    ('stripe_wh', '"whsec_..."'::json, NOW())
ON CONFLICT (key) 
DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- 4. API KEYS - SUPABASE (Database)
-- Use your actual Supabase credentials
INSERT INTO public.system_config (key, value, updated_at)
VALUES 
    ('supabase_url', '"https://anlivujgkjmajkcgbaxw.supabase.co"'::json, NOW()),
    ('supabase_anon', '"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFubGl2dWpna2ptYWprY2diYXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTY0OTQsImV4cCI6MjA4MTU3MjQ5NH0.5SzkZg_PMqgdMClS1ftg4ZT_Ddyq1zOi-ZOLe1yuRgY"'::json, NOW()),
    ('supabase_svc', '"your_service_role_key_here"'::json, NOW())
ON CONFLICT (key) 
DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- 5. API KEYS - GEMINI (AI)
INSERT INTO public.system_config (key, value, updated_at)
VALUES 
    ('gemini_key', '"your_gemini_api_key_here"'::json, NOW()),
    ('gemini_model', '"gemini-2.5-flash"'::json, NOW())
ON CONFLICT (key) 
DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- 6. API KEYS - MAPBOX (Maps)
INSERT INTO public.system_config (key, value, updated_at)
VALUES 
    ('mapbox_token', '"your_mapbox_token_here"'::json, NOW()),
    ('mapbox_styleId', '"mapbox://styles/mapbox/dark-v11"'::json, NOW())
ON CONFLICT (key) 
DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- 7. API KEYS - GITHUB (Dev Tools)
INSERT INTO public.system_config (key, value, updated_at)
VALUES 
    ('github_appId', '"your_github_app_id"'::json, NOW()),
    ('github_secret', '"your_github_secret"'::json, NOW()),
    ('github_repo', '"pikkst/EventNexus"'::json, NOW())
ON CONFLICT (key) 
DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- 8. API KEYS - EMAIL (SendGrid)
INSERT INTO public.system_config (key, value, updated_at)
VALUES 
    ('email_provider', '"SendGrid"'::json, NOW()),
    ('email_key', '"your_sendgrid_api_key"'::json, NOW()),
    ('email_from', '"noreply@eventnexus.com"'::json, NOW())
ON CONFLICT (key) 
DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- VERIFY ALL CONFIGURATIONS
SELECT 
    key, 
    value,
    updated_at
FROM public.system_config
ORDER BY 
    CASE 
        WHEN key = 'master_passkey' THEN 1
        WHEN key LIKE 'global_%' OR key LIKE '%_mode' OR key LIKE 'credit_%' THEN 2
        WHEN key LIKE 'stripe_%' THEN 3
        WHEN key LIKE 'supabase_%' THEN 4
        WHEN key LIKE 'gemini_%' THEN 5
        WHEN key LIKE 'mapbox_%' THEN 6
        WHEN key LIKE 'github_%' THEN 7
        WHEN key LIKE 'email_%' THEN 8
        ELSE 9
    END,
    key;

-- COUNT TOTAL CONFIGURATIONS
SELECT COUNT(*) as total_configs FROM public.system_config;

-- CONFIGURATIONS NEEDED FOR ADMIN DASHBOARD:
-- ✅ 1 master passkey
-- ✅ 3 system configs (fee, credit, maintenance)
-- ✅ 3 Stripe keys
-- ✅ 3 Supabase keys
-- ✅ 2 Gemini keys
-- ✅ 2 Mapbox keys
-- ✅ 3 GitHub keys
-- ✅ 3 Email keys
-- = 20 total configurations

-- NOTE: Replace placeholder values with your actual API keys!
-- The admin can also update these through the Settings tab after unlocking with master passkey.
