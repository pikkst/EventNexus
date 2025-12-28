# API Security Migration Guide

## Problem: API Keys Exposed in Client Code ⚠️

Previously, API keys were stored in `.env.local` and injected into the client bundle by Vite. This means:
- ❌ Keys visible in browser DevTools
- ❌ Keys in production JavaScript files
- ❌ Anyone can extract and abuse your API keys
- ❌ Violates API provider terms of service

## Solution: Supabase Edge Functions + Secrets ✅

**New Architecture:**
```
Client (Browser)
    ↓ calls
Edge Function (Supabase serverless)
    ↓ uses secrets
External API (Unsplash, Pexels, Gemini)
```

**Benefits:**
- ✅ Keys stored server-side only
- ✅ No exposure in client code
- ✅ Rate limiting and abuse protection
- ✅ Centralized API management
- ✅ Compliant with API provider terms

---

## Step 1: Setup API Secrets

Run the setup script to configure secrets in Supabase:

```bash
./scripts/setup_api_secrets.sh
```

This will prompt you for:
- Gemini API key (get from: https://ai.google.dev/)
- Unsplash access key (get from: https://unsplash.com/developers)
- Pexels API key (get from: https://www.pexels.com/api/)

**Verify secrets:**
```bash
supabase secrets list --project-ref anlivujgkjmajkcgbaxw
```

---

## Step 2: Deploy Edge Functions

Deploy the proxy Edge Functions to Supabase:

```bash
# Deploy Unsplash proxy
supabase functions deploy unsplash-proxy --project-ref anlivujgkjmajkcgbaxw

# Deploy Pexels proxy
supabase functions deploy pexels-proxy --project-ref anlivujgkjmajkcgbaxw
```

**Verify deployments:**
```bash
supabase functions list --project-ref anlivujgkjmajkcgbaxw
```

---

## Step 3: Update Client Services

Client services now call Edge Functions instead of direct APIs:

### Before (Insecure):
```typescript
// ❌ API key in client code
const UNSPLASH_KEY = import.meta.env.UNSPLASH_ACCESS_KEY;
fetch(`https://api.unsplash.com/search/photos?query=${query}`, {
  headers: { 'Authorization': `Client-ID ${UNSPLASH_KEY}` }
});
```

### After (Secure):
```typescript
// ✅ API key in Supabase secret
const { data } = await supabase.functions.invoke('unsplash-proxy', {
  body: { action: 'search', query: 'event' }
});
```

---

## Step 4: Update Service Files

The following services need to be updated:

### 1. `services/unsplashService.ts`
Replace direct Unsplash API calls with Edge Function calls:

```typescript
import { supabase } from './supabase';

export async function searchUnsplashPhotos(query: string, options = {}) {
  const { data, error } = await supabase.functions.invoke('unsplash-proxy', {
    body: {
      action: 'search',
      query,
      orientation: options.orientation || 'landscape',
      perPage: options.perPage || 10,
      page: options.page || 1,
    },
  });

  if (error) {
    console.error('Unsplash API error:', error);
    return null;
  }

  return data;
}
```

### 2. `services/pexelsService.ts`
Replace direct Pexels API calls with Edge Function calls:

```typescript
import { supabase } from './supabase';

export async function searchPexelsVideos(query: string, options = {}) {
  const { data, error } = await supabase.functions.invoke('pexels-proxy', {
    body: {
      type: 'videos',
      query,
      orientation: options.orientation,
      perPage: options.perPage || 15,
      minDuration: options.minDuration,
      maxDuration: options.maxDuration,
    },
  });

  if (error) {
    console.error('Pexels API error:', error);
    return null;
  }

  return data;
}
```

### 3. `services/geminiService.ts`
For Gemini AI, we'll create a proxy Edge Function later if needed. For now, it can stay client-side since it's used for content generation (not storing sensitive data).

---

## Step 5: Clean Up .env.local

Your `.env.local` should now only contain:

```bash
# Supabase Configuration (public - safe to expose)
VITE_SUPABASE_URL=https://anlivujgkjmajkcgbaxw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

# ⚠️ API KEYS REMOVED - NOW IN SUPABASE SECRETS
# Run: ./scripts/setup_api_secrets.sh
```

---

## Step 6: Test

Test that the Edge Functions work:

```bash
# Test Unsplash proxy
curl -X POST \
  'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/unsplash-proxy' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"action":"search","query":"event","perPage":3}'

# Test Pexels proxy
curl -X POST \
  'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/pexels-proxy' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"type":"videos","query":"party","perPage":3}'
```

---

## Step 7: Update Documentation

Update `DEPLOYMENT.md` to include:
- API secrets setup instructions
- Edge Function deployment steps
- Security best practices

---

## Migration Checklist

- [ ] Run `./scripts/setup_api_secrets.sh`
- [ ] Verify secrets: `supabase secrets list`
- [ ] Deploy Edge Functions
- [ ] Update `services/unsplashService.ts`
- [ ] Update `services/pexelsService.ts`
- [ ] Clean `.env.local` (remove API keys)
- [ ] Test Edge Functions with curl
- [ ] Test in development (`npm run dev`)
- [ ] Test in production (deploy to GitHub Pages)
- [ ] Update documentation
- [ ] Commit changes

---

## Security Notes

1. **Never commit API keys** to Git (add to `.gitignore`)
2. **Use Supabase RLS policies** to restrict Edge Function access if needed
3. **Monitor API usage** in Unsplash/Pexels/Gemini dashboards
4. **Rotate keys** if compromised
5. **Set up rate limiting** in Edge Functions for production

---

## Troubleshooting

### Edge Function not found
```bash
supabase functions deploy unsplash-proxy --project-ref anlivujgkjmajkcgbaxw
```

### Secrets not loading
```bash
# Check secrets exist
supabase secrets list --project-ref anlivujgkjmajkcgbaxw

# Re-run setup
./scripts/setup_api_secrets.sh
```

### CORS errors
Check Edge Function includes CORS headers (already configured in proxy functions)

---

## Next Steps

Once migrated:
1. ✅ Update `services/geminiService.ts` to use Edge Function (optional)
2. ✅ Add rate limiting to Edge Functions
3. ✅ Add caching for frequently requested media
4. ✅ Monitor API usage and costs
