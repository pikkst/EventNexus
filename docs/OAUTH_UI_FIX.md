# Fix OAuth Redirect Message UI

## Problem
When users log in or register with Google, they see an unfriendly message showing the technical Supabase URL:
```
Logite uuesti sisse rakendusse anlivujgkjmajkcgbaxw.supabase.co
```

This appears because Supabase's default OAuth confirmation screen displays the project's technical URL instead of the user-facing domain.

## Solution
Configure the **Site URL** in Supabase project settings to use the custom domain (EventNexus domain).

### Steps to Fix

1. **Go to Supabase Dashboard**
   - Open: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/settings/general

2. **Locate General Settings**
   - Navigate to **Settings** → **General**

3. **Update Site URL**
   - Find the **Site URL** field
   - Change from: `https://anlivujgkjmajkcgbaxw.supabase.co`
   - Change to: `https://www.eventnexus.eu`
   - Click **Save**

4. **Update OAuth Redirect URLs**
   - Go to **Settings** → **Auth Providers** → **Google**
   - Ensure the redirect URI is configured correctly:
     ```
     https://www.eventnexus.eu/auth/v1/callback
     ```
   - Also add for development (if needed):
     ```
     http://localhost:3000/auth/v1/callback
     ```
   - Click **Save**

5. **Verify Configuration**
   - In the same OAuth settings, the "Site URL" should now show your custom domain
   - The confirmation message will now display:
     ```
     Logite uuesti sisse rakendusse www.eventnexus.eu
     ```

### Important Notes
- This change affects the OAuth confirmation screen shown by Supabase
- It does not change the app's redirect URL (already configured in `services/dbService.ts`)
- The fix applies globally to all OAuth providers (Google, Facebook, etc.)
- Changes take effect immediately

### Code Reference
The redirect URLs are already properly configured in the codebase:

**File**: `services/dbService.ts`
```typescript
// For production
if (window.location.origin.includes('eventnexus.eu')) {
  return 'https://www.eventnexus.eu/profile';
}
```

The Site URL configuration above ensures the Supabase OAuth screen message matches this domain.

## Related Documentation
- Supabase Auth Settings: https://supabase.com/docs/guides/auth/social-login
- Site URL Purpose: Used for email confirmation links, password reset links, and OAuth confirmation messages
