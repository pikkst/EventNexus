-- Add master passkey to system_config table
-- Run this in Supabase SQL Editor

-- Insert or update master passkey (value must be JSON format)
INSERT INTO public.system_config (key, value, updated_at)
VALUES ('master_passkey', '"NEXUS_MASTER_2025"'::json, NOW())
ON CONFLICT (key) 
DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- Verify the entry was created
SELECT * FROM public.system_config WHERE key = 'master_passkey';

-- To change the passkey later, run:
-- UPDATE public.system_config 
-- SET value = '"YOUR_NEW_PASSKEY_HERE"'::json, updated_at = NOW() 
-- WHERE key = 'master_passkey';
