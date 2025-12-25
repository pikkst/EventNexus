-- PUHASTA andmebaas ja sisesta ÕIGED väärtused

-- 1. Kustuta KÕIK vanad ühendused
DELETE FROM social_media_accounts 
WHERE user_id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807';

-- 2. Kontrolli, et kustutatud
SELECT * FROM social_media_accounts 
WHERE user_id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807';

-- Nüüd sisesta Graph API Explorer'ist saadud ÕIGED väärtused:
-- OLULINE: Token peab olema PAGE ACCESS TOKEN, mitte User token!
-- 
-- Kuidas saada:
-- 1. Mine https://developers.facebook.com/tools/explorer/
-- 2. Vali EventNexus app
-- 3. Kl "Get Token" → "Get Page Access Token"
-- 4. Vali EventNexus leht
-- 5. Kopeeri token (algab EAA...)
-- 6. Kleebi siia alla REPLACE_WITH_PAGE_TOKEN kohale

INSERT INTO social_media_accounts (
  id, user_id, platform, account_id, account_name, 
  access_token, expires_at, is_connected, created_at, updated_at
) VALUES
-- Facebook Page
(
  gen_random_uuid(),
  'f2ecf6c6-14c1-4dbd-894b-14ee6493d807',
  'facebook',
  '864504226754704',
  'EventNexus',
  'REPLACE_WITH_PAGE_TOKEN',
  NOW() + INTERVAL '60 days',
  true,
  NOW(),
  NOW()
),
-- Instagram Business Account (kasutab sama tokenit!)
(
  gen_random_uuid(),
  'f2ecf6c6-14c1-4dbd-894b-14ee6493d807',
  'instagram',
  '17841473316101833',
  'blogpieesti',
  'REPLACE_WITH_PAGE_TOKEN',
  NOW() + INTERVAL '60 days',
  true,
  NOW(),
  NOW()
);

-- Kontrolli tulemust
SELECT 
  platform,
  account_id,
  account_name,
  LEFT(access_token, 30) || '...' as token_preview,
  is_connected
FROM social_media_accounts 
WHERE user_id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807'
ORDER BY platform;
