# OAuth Authentication Setup Guide

This guide explains how to configure Google and Facebook OAuth authentication for EventNexus.

## Implementation Complete ✅

The code implementation is now complete:
- ✅ OAuth sign-in methods added to `services/dbService.ts`
- ✅ Google and Facebook buttons in `AuthModal.tsx` are now functional
- ✅ Auth state listener in `App.tsx` automatically handles OAuth callbacks
- ✅ User profiles are created/fetched after successful OAuth authentication

## Supabase OAuth Configuration

To enable Google and Facebook sign-in, you need to configure OAuth providers in your Supabase project.

### 1. Google OAuth Setup

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw
   - Go to **Authentication** → **Providers** → **Google**

2. **Create Google OAuth App**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   
3. **Configure OAuth Consent Screen**
   - Go to **OAuth consent screen**
   - Add app name: **EventNexus**
   - Add support email
   - Add authorized domains: `eventnexus.eu`, `supabase.co`
   - Add scopes: `email`, `profile`, `openid`

4. **Set Authorized Redirect URIs**
   - Add this exact URL:
     ```
     https://anlivujgkjmajkcgbaxw.supabase.co/auth/v1/callback
     ```
   - Copy your **Client ID** and **Client Secret**

5. **Configure in Supabase**
   - Paste Client ID in **Client ID** field
   - Paste Client Secret in **Client Secret** field
   - Click **Save**

### 2. Facebook OAuth Setup

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw
   - Go to **Authentication** → **Providers** → **Facebook**

2. **Create Facebook App**
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Click **Create App**
   - Select **Consumer** app type
   - Add app name: **EventNexus**
   - Add app contact email

3. **Add Facebook Login Product**
   - In your app dashboard, click **Add Product**
   - Find **Facebook Login** and click **Set Up**
   - Select **Web** platform

4. **Configure Facebook Login Settings**
   - Go to **Facebook Login** → **Settings**
   - Add **Valid OAuth Redirect URIs** (add ALL of these):
     ```
     https://anlivujgkjmajkcgbaxw.supabase.co/auth/v1/callback
     https://www.eventnexus.eu/EventNexus/
     https://www.eventnexus.eu/
     http://localhost:3000/
     ```
   - **CRITICAL**: Make sure to add ALL URLs above, including both production variants
   - Save changes

5. **Get App Credentials**
   - Go to **Settings** → **Basic**
   - Copy your **App ID** and **App Secret**

6. **Configure in Supabase**
   - Paste App ID in **Client ID** field
   - Paste App Secret in **Client Secret** field
   - Click **Save**

7. **Make App Live**
   - Go to **Settings** → **Basic**
   - Toggle **App Mode** from Development to **Live**
   - Add **Privacy Policy URL**: `https://www.eventnexus.eu/#/privacy`
   - Add **Terms of Service URL**: `https://www.eventnexus.eu/#/terms`
   - Add **App Icon** (1024x1024 PNG)

### 3. Additional Configuration

#### Enable Providers in Supabase
Both providers should be **enabled** in Supabase:
- Go to **Authentication** → **Providers**
- Ensure Google is **Enabled** ✅
- Ensure Facebook is **Enabled** ✅

#### Redirect URLs
The OAuth redirect URLs are configured to use a dedicated callback page for better reliability:

**Production redirect:**
- **Primary**: `https://www.eventnexus.eu/oauth-callback.html` ✅ (Recommended)
- Fallback: `https://www.eventnexus.eu/EventNexus/#/profile`

**Development redirect:**
- `http://localhost:3000/#/profile`

The callback page (`public/oauth-callback.html`) handles both:
1. **Supabase Auth OAuth** (Google, Facebook user login) - detects tokens in URL hash
2. **Social Media OAuth** (posting to platforms) - detects authorization code in query params

**IMPORTANT**: Make sure ALL these URLs are added to:

1. **Supabase Dashboard** → **Authentication** → **URL Configuration** → **Redirect URLs**:
   ```
   https://www.eventnexus.eu/oauth-callback.html
   https://eventnexus.eu/oauth-callback.html
   https://www.eventnexus.eu/EventNexus/#/profile
   https://www.eventnexus.eu/#/profile
   http://localhost:3000/#/profile
   ```

2. **Facebook Developer Console** → **Facebook Login** → **Settings** → **Valid OAuth Redirect URIs**:
   ```
   https://anlivujgkjmajkcgbaxw.supabase.co/auth/v1/callback
   https://www.eventnexus.eu/oauth-callback.html
   https://eventnexus.eu/oauth-callback.html
   https://www.eventnexus.eu/EventNexus/
   https://www.eventnexus.eu/
   http://localhost:3000/
   ```

3. **Google Cloud Console** → **Credentials** → **Authorized redirect URIs**:
   ```
   https://anlivujgkjmajkcgbaxw.supabase.co/auth/v1/callback
   ```

## How It Works

### User Flow

1. **User clicks Google/Facebook button** in AuthModal
2. **OAuth handler initiates** the OAuth flow via Supabase
3. **User is redirected** to Google/Facebook consent screen
4. **User grants permission**
5. **Provider redirects back** to EventNexus with auth code
6. **Supabase exchanges** auth code for access token
7. **Auth state listener** in App.tsx detects SIGNED_IN event
8. **User profile is created/fetched** from database
9. **User is logged in** and redirected to profile page

### Technical Details

#### Code Structure

1. **OAuth Methods** (`services/dbService.ts`):
```typescript
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${window.location.pathname}#/profile`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    }
  });
  return { data, error };
};
```

2. **UI Component** (`components/AuthModal.tsx`):
```typescript
const handleGoogleSignIn = async () => {
  setOauthLoading(true);
  const { data, error } = await signInWithGoogle();
  if (error) {
    setError('Failed to sign in with Google');
    setOauthLoading(false);
  }
  // OAuth redirect happens automatically
};
```

3. **Auth State Listener** (`App.tsx`):
```typescript
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    const userData = await getUser(session.user.id);
    setUser(userData);
  }
});
```

#### Database Integration

When a user signs in via OAuth:
1. Supabase creates an auth user automatically
2. Our RLS policies ensure a user profile is created in `public.users`
3. The profile inherits email and metadata from the OAuth provider
4. User gets default credits (100) for new accounts

## Testing OAuth

### Local Development Testing

1. **Start dev server**:
```bash
npm run dev
```

2. **Open AuthModal** and click Google/Facebook button

3. **Verify redirect** works and you're signed in

4. **Check console** for OAuth logs

### Production Testing

1. **Deploy to production**:
```bash
npm run build
```

2. **Test on** `https://www.eventnexus.eu`

3. **Verify** OAuth callbacks work with production URLs

### Troubleshooting

#### "URL on blokeeritud / Redirect URI mismatch" (Facebook)
**Probleem:** Facebook OAuth annab vea "URL is blocked" või "Redirect failed"

**Lahendus:**
1. Mine [Facebook Developers Console](https://developers.facebook.com/)
2. Vali oma EventNexus app
3. **Facebook Login** → **Settings**
4. **Valid OAuth Redirect URIs** - kontrolli, et kõik need URLid on lisatud:
   ```
   https://anlivujgkjmajkcgbaxw.supabase.co/auth/v1/callback
   https://www.eventnexus.eu/EventNexus/
   https://www.eventnexus.eu/
   http://localhost:3000/
   ```
5. Salvesta muudatused
6. **Oluline**: Veendu, et rakendus on **LIVE režiimis**:
   - Mine **Settings** → **Basic**
   - **App Mode** peab olema: **Live** ✅ (mitte Development)
   - Lisa **Privacy Policy URL**: `https://www.eventnexus.eu/#/privacy`
   - Lisa **Terms of Service URL**: `https://www.eventnexus.eu/#/terms`
7. Kontrolli ka **Supabase Dashboard**:
   - **Authentication** → **URL Configuration** → **Redirect URLs**
   - Lisa kõik ülaltoodud URLid

#### "Redirect URI mismatch" error (Google)
- Ensure redirect URIs match exactly in provider settings
- Check both Supabase callback URL and application redirect URL
- Google only needs: `https://anlivujgkjmajkcgbaxw.supabase.co/auth/v1/callback`

#### "App not verified" (Google)
- Submit app for verification in Google Cloud Console
- Or add test users in OAuth consent screen

#### "App not live" (Facebook)
- Switch app mode from Development to Live
- Add required privacy policy and terms URLs

#### OAuth popup blocked
- Browser may block popups - user needs to allow
- OAuth will open in same tab by default

#### User profile not created
- Check Supabase logs for RLS policy errors
- Verify `public.users` table has proper triggers
- Check user email is confirmed in Supabase Auth

## Security Best Practices

1. **Never commit OAuth secrets** - they're in Supabase dashboard only
2. **Use HTTPS in production** - OAuth requires secure connections
3. **Validate redirect URLs** - only allow your domains
4. **Monitor OAuth logs** - check for suspicious activity
5. **Regular token rotation** - refresh secrets periodically

## Support

For OAuth configuration issues:
- **Supabase Support**: https://supabase.com/support
- **Google OAuth Docs**: https://developers.google.com/identity/protocols/oauth2
- **Facebook Login Docs**: https://developers.facebook.com/docs/facebook-login

For EventNexus OAuth implementation issues:
- Contact: huntersest@gmail.com
