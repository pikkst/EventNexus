# Instagram & Facebook Business Login Setup Guide

Complete step-by-step guide for connecting Instagram Business and Facebook Pages to EventNexus.

---

## Prerequisites

1. **Instagram Business Account** (not personal account)
2. **Facebook Page** linked to your Instagram account
3. **Meta Developer Account** at https://developers.facebook.com

---

## Step 1: Create Meta App

1. Go to https://developers.facebook.com/apps
2. Click **"Create App"**
3. Select **"Business"** as app type
4. Fill in:
   - **App Name:** EventNexus Social
   - **App Contact Email:** huntersest@gmail.com
   - **Business Account:** (Select or create one)
5. Click **"Create App"**

---

## Step 2: Configure Business Login

### Add Facebook Login Product

1. In your app dashboard, click **"Add Product"**
2. Find **"Facebook Login"** → Click **"Set Up"**
3. Select **"Web"** platform

### Set Redirect URLs

1. Go to **Facebook Login → Settings** in left sidebar
2. Under **"Valid OAuth Redirect URIs"**, add:
   ```
   https://www.eventnexus.eu/admin/social-callback
   http://localhost:3000/admin/social-callback
   ```
3. Click **"Save Changes"**

### Configure Instagram Business Login

1. In left sidebar, go to **"Use cases"** → **"Configure"** next to Authentication and account creation
2. Under **"Instagram business login"**, click **"Go to settings"**
3. Set **Redirect URL:**
   ```
   https://www.eventnexus.eu/admin/social-callback
   ```
4. Click **"Save"**

---

## Step 3: Set Up Webhooks (Optional but Recommended)

### Deploy Webhook Edge Functions

First, deploy the webhook handlers to Supabase:

```bash
# Deploy Instagram webhook
cd /workspaces/EventNexus
supabase functions deploy instagram-webhook

# Deploy Facebook webhook
supabase functions deploy facebook-webhook
```

### Configure Webhooks in Meta App

1. In your Meta app, go to **"Webhooks"** in left sidebar
2. Click **"Configure webhooks"**

#### For Instagram:
- **Callback URL:** `https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/instagram-webhook`
- **Verify Token:** `EVENTNEXUS_INSTAGRAM_WEBHOOK_SECRET_2024`
- Click **"Verify and Save"**

#### For Facebook:
- **Callback URL:** `https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/facebook-webhook`
- **Verify Token:** `EVENTNEXUS_FACEBOOK_WEBHOOK_SECRET_2024`
- Click **"Verify and Save"**

### Subscribe to Webhook Events

After verification, select which events you want to receive:
- ✅ comments
- ✅ mentions
- ✅ messages (if using Messenger)
- ✅ feed (for new posts)

---

## Step 4: Get API Credentials

1. Go to **Settings → Basic** in left sidebar
2. Copy these values:
   - **App ID** (this is your Client ID)
   - **App Secret** (click "Show" to reveal)

---

## Step 5: Request Permissions

### For Testing (Development Mode)

Your app is in **Development Mode** by default. You can test with:
- Your own account
- Test users
- Up to 5 additional accounts (add them as Testers)

### For Production (Live Mode)

1. Go to **App Review → Permissions and Features**
2. Request these permissions:

**For Instagram:**
- ✅ `instagram_basic` - Basic profile info
- ✅ `instagram_content_publish` - Publish posts
- ✅ `instagram_manage_comments` - Manage comments
- ✅ `instagram_manage_insights` - View analytics

**For Facebook:**
- ✅ `pages_manage_posts` - Post on behalf of pages
- ✅ `pages_read_engagement` - Read page insights
- ✅ `pages_show_list` - Access page list

3. Fill out **App Review** questionnaire explaining EventNexus use case
4. Submit for review (can take 1-3 days)

---

## Step 6: Add Credentials to EventNexus

1. Log in as admin to EventNexus
2. Go to **Admin Dashboard → Social Media Hub**
3. Scroll to **"API Configuration"** section
4. For **Facebook/Instagram**, enter:
   - **Client ID:** (App ID from Step 4)
   - **Client Secret:** (App Secret from Step 4)
5. Keys are auto-saved to database

---

## Step 7: Connect Your Account

1. In **Social Media Hub**, find **Facebook** card
2. Click **"Connect Facebook"**
3. OAuth popup opens → Log in with Facebook
4. Select your **Facebook Page**
5. Select your **Instagram Business Account**
6. Grant requested permissions
7. You'll be redirected back → Connection complete ✅

Repeat for Instagram card (same credentials, different flow).

---

## Troubleshooting

### "Invalid OAuth Redirect URI"
- Make sure redirect URL is **exactly** `https://www.eventnexus.eu/admin/social-callback`
- No trailing slash
- Protocol must match (https vs http)

### "Instagram Business Account not found"
- Ensure your Instagram is a **Business Account** (not Personal/Creator)
- It must be linked to a Facebook Page
- Go to Instagram → Settings → Account → Switch to Business Account

### "Webhook verification failed"
- Check verify token matches exactly: `EVENTNEXUS_INSTAGRAM_WEBHOOK_SECRET_2024`
- Ensure Edge Function is deployed and accessible
- Test webhook URL in browser: should respond with 405 Method Not Allowed

### "Permissions not granted"
- In Development Mode, only test users can use the app
- Add your account as a Test User in Meta app settings
- Or submit for App Review to go Live

### "App not published"
- For webhooks to work, app must be in **Live Mode**
- Submit App Review or switch to Live Mode (limited features)

---

## Testing the Integration

### Test Instagram Post:

```typescript
// In Admin Dashboard → Campaign Engine
const campaign = {
  title: 'Test Campaign',
  copy: 'Testing EventNexus integration! 🚀'
};

const content = await generateSocialMediaContentWithImages(campaign);
const results = await publishToConnectedPlatforms(content);

console.log('Instagram result:', results.instagram);
// Should show: { success: true, postId: '...' }
```

### Check Webhook Logs:

```bash
# View Instagram webhook logs
supabase functions logs instagram-webhook

# View Facebook webhook logs
supabase functions logs facebook-webhook
```

---

## Security Best Practices

1. **Never commit credentials** - Use environment variables
2. **Rotate secrets regularly** - Change App Secret every 90 days
3. **Limit permissions** - Only request what you need
4. **Monitor webhook logs** - Watch for suspicious activity
5. **Use HTTPS only** - No HTTP in production

---

## Required Environment Variables

Add these to Supabase Edge Functions secrets:

```bash
supabase secrets set INSTAGRAM_WEBHOOK_VERIFY_TOKEN="EVENTNEXUS_INSTAGRAM_WEBHOOK_SECRET_2024"
supabase secrets set FACEBOOK_WEBHOOK_VERIFY_TOKEN="EVENTNEXUS_FACEBOOK_WEBHOOK_SECRET_2024"
```

---

## Quick Reference

| Setting | Value |
|---------|-------|
| **Redirect URI** | `https://www.eventnexus.eu/admin/social-callback` |
| **Instagram Webhook URL** | `https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/instagram-webhook` |
| **Facebook Webhook URL** | `https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/facebook-webhook` |
| **Verify Token (Instagram)** | `EVENTNEXUS_INSTAGRAM_WEBHOOK_SECRET_2024` |
| **Verify Token (Facebook)** | `EVENTNEXUS_FACEBOOK_WEBHOOK_SECRET_2024` |
| **Meta Developer Portal** | https://developers.facebook.com/apps |

---

## Support

- **Meta Documentation:** https://developers.facebook.com/docs/instagram-api
- **EventNexus Support:** huntersest@gmail.com
- **Admin Dashboard:** https://www.eventnexus.eu/#/admin

---

*Last updated: December 21, 2025*
