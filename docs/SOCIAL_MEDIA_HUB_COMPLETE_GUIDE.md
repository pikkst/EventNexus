# Social Media Hub - Complete Setup Guide

## Probleemid ja Lahendused

### 1. OAuth Flow ei tööta UI-s
**Põhjus:** `/me/accounts` API tagastab `{data: []}` isegi kui permissions on õiged.

**Lahendus:** Kasuta **manuaalset ühendamist** kuni Meta API bug on parandatud.

---

## Täielik Seadistus (Töötav!)

### Samm 1: Meta App Seadistus

1. **Mine:** https://developers.facebook.com/apps/1527493881796179/settings/basic/
2. **Kontrolli:**
   - App ID: `1527493881796179` ✅
   - App Secret: `6d56544a86f98e40365d560139e489c1` ✅
   - App Domains: `www.eventnexus.eu` ✅
   - Valid OAuth Redirect URIs: `https://www.eventnexus.eu/oauth-callback.html` ✅

### Samm 2: Database OAuth Config

Käivita Supabase SQL Editoris:

```sql
INSERT INTO system_config (key, value, description, updated_at)
VALUES
  ('facebook_client_id', '"1527493881796179"', 'Facebook/Instagram App ID', NOW()),
  ('facebook_client_secret', '"6d56544a86f98e40365d560139e489c1"', 'Facebook/Instagram App Secret', NOW())
ON CONFLICT (key) 
DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
```

### Samm 3: Hangi PAGE ACCESS TOKEN

#### Variant A: Graph API Explorer (Lihtne)

1. Mine: https://developers.facebook.com/tools/explorer/
2. Vali **EventNexus** app (dropdown üleval)
3. Vajuta **"Generate Access Token"** → **"Get Page Access Token"** (MITTE User Token!)
4. Vali **EventNexus** leht
5. Kopeeri token (algab `EAA...`)

#### Variant B: cURL (Kui Explorer ei tööta)

```bash
# Hangi USER token Graph API Explorerist
USER_TOKEN="<sinu_user_token>"

# Konverteeri PAGE tokeniks
curl -X GET "https://graph.facebook.com/v18.0/864504226754704?fields=access_token&access_token=$USER_TOKEN"
```

Vastus:
```json
{
  "access_token": "EAAVtP2I4llMBQfNMyqxZC1icE7CFv...",
  "id": "864504226754704"
}
```

### Samm 4: Salvesta Manuaalselt EventNexus'es

1. **Logi sisse:** https://www.eventnexus.eu
2. **Mine:** Admin Dashboard → Social Media Hub
3. **Leia:** "Manual Connection (Recommended)" sektsioon
4. **Sisesta:**

**Facebook:**
- Page ID: `864504226754704`
- Page Name: `EventNexus`
- Page Access Token: *(kleepige token Graph API Explorerist)*

**Instagram:**
- IG Business Account ID: `17841473316101833`
- Username: `blogpieesti`
- Access Token: *(SAMA token kui Facebook)*

5. **Vajuta:** `💾 Salvesta Facebook` ja `💾 Salvesta Instagram`

### Samm 5: Testi Posting'ut

1. Mine **Campaign Engine**
2. Genereeri campaign
3. Vajuta **📘 Facebook** ja **📸 Instagram**
4. Kontrolli:
   - Facebook: https://facebook.com/EventNexus
   - Instagram: https://instagram.com/blogpieesti

---

## Troubleshooting

### "Invalid OAuth access token"
**Põhjus:** Kasutad USER tokenit, mitte PAGE tokenit.  
**Lahendus:** Järgi Samm 3, variant A - vali "Get Page Access Token"

### "403 Forbidden - requires pages_manage_posts"
**Põhjus:** TOKEN TYPE vale (user vs page).  
**Lahendus:** PAGE ACCESS TOKEN on vaja, mitte user token!

### "/me/accounts returns empty {data: []}"
**Põhjus:** Meta API bug või permission issue.  
**Lahendus:** Kasuta Variant B (cURL) PAGE tokeni hankimiseks.

### "Object with ID '122161929416394717' does not exist"
**Põhjus:** Vana USER ID andmebaasis.  
**Lahendus:**
```sql
DELETE FROM social_media_accounts WHERE user_id = (SELECT id FROM auth.users WHERE email = 'huntersest@gmail.com');
```

### Posting töötab Instagram'is aga mitte Facebook'is
**Põhjus:** Erinevad tokenid salvestatud.  
**Lahendus:** Kasuta **SAMA PAGE TOKENIT** mõlemale platvormile!

---

## Token Types - Selgitus

| Token Type | ID | Posting | OAuth Flow |
|------------|-----|---------|------------|
| **USER TOKEN** | `122161929416394717` (user) | ❌ Ei tööta | ✅ Saadakse OAuth'ist |
| **PAGE TOKEN** | `864504226754704` (page) | ✅ Töötab | ⚠️ Vajab konverteerimist |

**Reegel:** Postita Page'le = Vaja PAGE TOKENIT!

---

## Database Schema

```sql
-- social_media_accounts table
user_id       UUID         -- EventNexus user
platform      TEXT         -- 'facebook', 'instagram'
account_id    TEXT         -- PAGE ID (864504226754704) või IG ID (17841473316101833)
account_name  TEXT         -- 'EventNexus' või 'blogpieesti'
access_token  TEXT         -- PAGE ACCESS TOKEN (sama mõlemale!)
is_connected  BOOLEAN      -- true kui ühendatud
expires_at    TIMESTAMP    -- Token aegumise aeg
```

---

## API Endpoints

### Facebook Posting
```
POST https://graph.facebook.com/v18.0/{page_id}/feed
Body:
{
  "message": "Campaign content",
  "link": "https://www.eventnexus.eu",
  "access_token": "PAGE_ACCESS_TOKEN"
}
```

### Instagram Posting
```
# Step 1: Create media container
POST https://graph.facebook.com/v18.0/{ig_account_id}/media
Body:
{
  "image_url": "https://...",
  "caption": "Campaign content",
  "access_token": "PAGE_ACCESS_TOKEN"
}

# Step 2: Publish container
POST https://graph.facebook.com/v18.0/{ig_account_id}/media_publish
Body:
{
  "creation_id": "{container_id}",
  "access_token": "PAGE_ACCESS_TOKEN"
}
```

---

## Maintenance

### Token Refresh (iga 60 päeva)
1. Hangi uus PAGE ACCESS TOKEN Graph API Explorerist
2. Mine Social Media Hub → Manual Connection
3. Sisesta uued tokenid
4. Vajuta "Salvesta"

### Kontrolli Connection Status
```sql
SELECT platform, account_name, is_connected, expires_at
FROM social_media_accounts
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'huntersest@gmail.com');
```

---

## Kontakt
Probleemide korral: huntersest@gmail.com
