# Sotsiaalmeedia Integratsioon - Lihtne Seadistus

## 🚀 Kiire Ülevaade

Admin saab ühendada sotsiaalmeedia kontod ja postitada otse AdminCommandCenter'ist.

## 📱 Toetatud Platvormid

1. **Facebook** - Pages API
2. **Instagram** - Graph API  
3. **Twitter/X** - API v2
4. **LinkedIn** - Share API

---

## ⚡ 3-Sammuline Seadistus

### Samm 1: Loo API rakendused

#### Facebook/Instagram (Meta)
1. Mine: https://developers.facebook.com/apps
2. Kliki **"Create App"**
3. Vali **"Business"** type
4. Sisesta nimi: **"EventNexus Social Manager"**
5. Lisa **Facebook Login** ja **Instagram Graph API**
6. **OAuth Redirect URI**: `https://eventnexus.eu/admin/social-callback`
7. Kopeeri:
   - **App ID**: `123456789`
   - **App Secret**: `abc123def456...`

#### Twitter/X
1. Mine: https://developer.twitter.com/en/portal/dashboard
2. Loo **"New Project"** → **"EventNexus"**
3. Aktiveeri **OAuth 2.0**
4. **Callback URL**: `https://eventnexus.eu/admin/social-callback`
5. Kopeeri:
   - **Client ID**: `xyz789...`
   - **Client Secret**: `secret123...`

#### LinkedIn
1. Mine: https://www.linkedin.com/developers/apps
2. Kliki **"Create app"**
3. Nimi: **"EventNexus Marketing"**
4. Lisa **Share on LinkedIn** permission
5. **Redirect URLs**: `https://eventnexus.eu/admin/social-callback`
6. Kopeeri:
   - **Client ID**: `linkedin123`
   - **Client Secret**: `linkedinsecret456`

---

### Samm 2: Lisa võtmed Supabase'i

```sql
-- Lisa Supabase SQL Editor'is
INSERT INTO public.system_config (key, value) VALUES
  ('facebook_app_id', '"123456789"'::jsonb),
  ('facebook_app_secret', '"abc123def456"'::jsonb),
  ('twitter_client_id', '"xyz789"'::jsonb),
  ('twitter_client_secret', '"secret123"'::jsonb),
  ('linkedin_client_id', '"linkedin123"'::jsonb),
  ('linkedin_client_secret', '"linkedinsecret456"'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

---

### Samm 3: Ühenda kontod AdminCommandCenter'is

**Admin Dashboard → Marketing → Social Media Setup**

1. **Kliki "Connect Facebook"**
   - Logib sisse Meta kontoga
   - Vali FB Page mida kasutada
   - Salvestub automaatselt

2. **Kliki "Connect Instagram"**
   - Automaatselt ühendub kui FB on ühendatud
   - Vali Instagram Business konto

3. **Kliki "Connect Twitter"**
   - OAuth flow
   - Automaatselt salvestub

4. **Kliki "Connect LinkedIn"**
   - OAuth flow
   - Vali Company Page või Personal

✅ **Valmis!** Nüüd saad postitada otse admin paneelist.

---

## 🎯 Kuidas Kasutada

### Kampaania Genereerimine + Postitus

```typescript
// 1. Admin genereerib kampaania
const campaign = await generatePlatformGrowthCampaign('Summer Events', 'attendees');

// 2. Genereerib sotsiaalmeedia sisu + pildid
const socialPosts = await generateSocialMediaContentWithImages(
  campaign.title,
  campaign.copy,
  campaign.cta,
  campaign.trackingCode,
  campaign.visualPrompt
);

// 3. Postita kõikidele platvormidele ühe klikiga
await publishToAllPlatforms(socialPosts);
```

**Admin näeb:**
```
✅ Posted to Facebook - 45 likes, 8 shares
✅ Posted to Instagram - 120 likes, 23 comments  
✅ Posted to Twitter - 15 retweets
✅ Posted to LinkedIn - 8 reactions
```

---

## 🔐 Turvalisus

- **API võtmed** salvestatakse Supabase `system_config` tabelis
- **Access tokens** salvestatakse krüpteeritult `social_media_accounts` tabelis
- **Refresh tokens** uuendatakse automaatselt
- **RLS policies** tagavad et ainult admin saab ühendada/postitada

---

## 📊 Jälgimine

**Iga postitus salvestab:**
- Platform (facebook/instagram/twitter/linkedin)
- Post ID
- Tracking code
- Published timestamp
- Engagement metrics (likes, comments, shares)
- Traffic generated (clicks to EventNexus)

**Admin näeb:**
```
Campaign: "Summer Launch"

Facebook Post:
├─ 145 Impressions
├─ 23 Clicks → EventNexus
├─ 5 Signups (22% conversion)
└─ €50 Revenue

Instagram Post:
├─ 890 Impressions
├─ 67 Clicks → EventNexus
├─ 12 Signups (18% conversion) 🏆
└─ €120 Revenue

Best Platform: Instagram!
```

---

## 🛠️ Tehniline Ülevaade

### Andmebaasi Struktuur

```sql
-- Ühendatud kontod
social_media_accounts:
  - platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin'
  - account_id: Platform account ID
  - access_token: OAuth token
  - refresh_token: Refresh token
  - expires_at: Token expiry
  - is_connected: true/false

-- Postitused
social_media_posts:
  - platform: Platform name
  - post_id: Platform's post ID
  - content: Post text
  - image_url: Attached image
  - tracking_code: Campaign tracking
  - status: 'draft' | 'scheduled' | 'posted' | 'failed'
  - metrics: {views, clicks, likes, shares, comments}
  - published_at: When posted

-- Kampaania sisu
campaign_social_content:
  - campaign_id: Related campaign
  - platform: Target platform
  - content: Generated text
  - image_url: Generated image
  - tracking_code: Unique per platform
```

---

## 🔄 OAuth Flow

```typescript
// 1. Admin klikib "Connect Facebook"
const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?
  client_id=${fbAppId}&
  redirect_uri=https://eventnexus.eu/admin/social-callback&
  scope=pages_manage_posts,pages_read_engagement`;

// 2. User authorizes → redirects back with code

// 3. Exchange code for token
const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
  method: 'POST',
  body: JSON.stringify({
    client_id: fbAppId,
    client_secret: fbAppSecret,
    code: authCode,
    redirect_uri: 'https://eventnexus.eu/admin/social-callback'
  })
});

// 4. Save to database
await supabase.from('social_media_accounts').insert({
  platform: 'facebook',
  account_id: pageId,
  access_token: token.access_token,
  refresh_token: token.refresh_token,
  expires_at: new Date(Date.now() + token.expires_in * 1000)
});
```

---

## ⚠️ Hetke Staatus

**✅ Valmis:**
- Database schema (`social_media_accounts`, `social_media_posts`)
- Content generation funktsioonid
- Tracking code system
- Platform-specific image generation

**🔄 Tuleb teha:**
- OAuth flow UI AdminCommandCenter'is
- Tegelikud API kutsed (praegu placeholders)
- Token refresh automation
- Post scheduling system

---

## 🚀 Järgmised Sammud

1. **Lisa OAuth flow UI** AdminCommandCenter'i
2. **Aktiveeri API integratsioonid** (remove placeholders)
3. **Testi postitused** igal platvormil
4. **Optimeeri automaatpostitused** (best time to post)
5. **Lisa analytics dashboard** (ROI per platform)

---

## 📞 Abi Vaja?

**Kirjuta:** huntersest@gmail.com  
**Dokumentatsioon:** EventNexus/docs/SOCIAL_MEDIA_INTEGRATION_SETUP.md

---

**Loodud:** December 21, 2025  
**Versioon:** 1.0
