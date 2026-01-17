# Edge Functions Deployment Guide

## Quick Deploy via Supabase Dashboard

### 1. Open Supabase Dashboard
Go to: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/functions

### 2. Deploy discover-events-ai
1. Click **discover-events-ai** function
2. Go to **Code** tab
3. Copy all code from: `supabase/functions/discover-events-ai/index.ts`
4. Paste into dashboard editor
5. Click **Deploy**

### 3. Deploy publish-event
1. Click **publish-event** function
2. Go to **Code** tab
3. Copy all code from: `supabase/functions/publish-event/index.ts`
4. Paste into dashboard editor
5. Click **Deploy**

### 4. Verify Deployment
1. Go to **Invocations** tab for each function
2. Check **Logs** for recent executions
3. Should see new function code running

---

## Why Manual Deploy?

GitHub Actions only deploys frontend (React/Vite).
Edge Functions require Supabase CLI or Dashboard deploy.

**Recent changes:**
- `discover-events-ai`: .single() → .maybeSingle() + improved error logging
- `publish-event`: Added coordinate fallbacks + persistent geocode caching

---

## Alternative: Local CLI Deploy

If you have Supabase CLI installed:

```bash
# Install Supabase CLI (macOS/Linux/WSL only)
brew install supabase/tap/supabase

# Login
supabase login

# Deploy functions
supabase functions deploy discover-events-ai publish-event --no-verify
```

**Note:** Windows users should use WSL or Supabase Dashboard method above.

---

## Troubleshooting

**Functions still failing?**

Check:
1. ✅ Edge Functions code is deployed (see version in Supabase Dashboard)
2. ✅ GEMINI_API_KEY environment variable is set in Supabase
3. ✅ raw_events and parsed_events tables exist with correct schema
4. ✅ event_sources table has EventScout AI source entries

View logs in Supabase Dashboard → Edge Functions → [function name] → Logs
