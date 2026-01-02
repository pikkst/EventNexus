# Growth Features Deployment Checklist

## 📋 Complete Deployment Guide

This document provides step-by-step instructions for deploying all growth optimization features to production.

---

## Prerequisites

- [x] Supabase project configured
- [x] Resend account created (`noreply@mail.eventnexus.eu`)
- [x] Stripe Connect configured
- [x] GitHub repository with GitHub Pages enabled
- [ ] Domain DNS configured
- [ ] All environment variables ready

---

## Phase 1: Database Setup (CRITICAL FIRST)

### Step 1.1: Run SQL Schema

**What:** Create all new database tables for growth features.

**How:**
1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/sql)
2. Copy entire contents of `sql/referral_and_analytics_tables.sql`
3. Paste into SQL editor
4. Click **Run** button
5. Verify no errors

**Tables Created:**
- `user_behavior` - Tracks user interactions
- `analytics_events` - General event tracking
- `funnel_tracking` - Conversion funnels
- `ab_tests` - A/B test variants
- `user_conversions` - Conversion events
- `feature_usage` - Feature analytics
- `error_logs` - Error tracking
- `retention_tracking` - Cohort analysis
- `credit_transactions` - Credit system log

**Verify:**
```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_behavior', 
  'analytics_events', 
  'funnel_tracking',
  'ab_tests',
  'user_conversions',
  'feature_usage',
  'error_logs',
  'retention_tracking',
  'credit_transactions'
);
```

### Step 1.2: Update Users Table

**What:** Add referral tracking columns to existing `users` table.

**Run this SQL:**
```sql
-- Add referral columns if they don't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS first_action_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON public.users(referred_by);
```

**Verify:**
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('referral_code', 'referred_by', 'first_action_at');
```

---

## Phase 2: Edge Functions Deployment

### Step 2.1: Set Environment Variables

**Navigate to:** [Supabase Edge Functions Settings](https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/settings/functions)

**Add these secrets:**

| Secret Name | Value | Where to get |
|------------|-------|--------------|
| `RESEND_API_KEY` | `re_xxxxxxxxxxxxx` | [Resend Dashboard](https://resend.com/api-keys) |
| `SUPABASE_URL` | `https://anlivujgkjmajkcgbaxw.supabase.co` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | [Supabase Settings > API](https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/settings/api) |

**CLI Command:**
```bash
# From project root
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
npx supabase secrets set SUPABASE_URL=https://anlivujgkjmajkcgbaxw.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

### Step 2.2: Deploy Edge Functions

**Deploy all three functions:**

```bash
# Deploy send-first-action-bonus
npx supabase functions deploy send-first-action-bonus \
  --project-ref anlivujgkjmajkcgbaxw

# Deploy send-weekly-digest
npx supabase functions deploy send-weekly-digest \
  --project-ref anlivujgkjmajkcgbaxw

# Deploy award-first-action-bonus
npx supabase functions deploy award-first-action-bonus \
  --project-ref anlivujgkjmajkcgbaxw
```

**Verify deployment:**
```bash
npx supabase functions list --project-ref anlivujgkjmajkcgbaxw
```

**Test manually:**
```bash
# Test award-first-action-bonus
curl -X POST \
  https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/award-first-action-bonus \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-id","action":"follow_organizer"}'
```

### Step 2.3: Set Up Cron Jobs

**What:** Schedule automated email campaigns.

**Navigate to:** Supabase SQL Editor

**Run:**
```sql
-- Install pg_cron if not already installed
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily first action bonus emails (10:00 AM daily)
SELECT cron.schedule(
    'send-first-action-bonus-daily',
    '0 10 * * *',  -- Daily at 10:00 AM
    $$
    SELECT net.http_post(
        url := 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/send-first-action-bonus',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
        )
    ) AS request_id;
    $$
);

-- Schedule weekly digest emails (Sunday at 9:00 AM)
SELECT cron.schedule(
    'send-weekly-digest-sunday',
    '0 9 * * 0',  -- Every Sunday at 9:00 AM
    $$
    SELECT net.http_post(
        url := 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/send-weekly-digest',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
        )
    ) AS request_id;
    $$
);

-- Verify cron jobs
SELECT * FROM cron.job;
```

**Note:** Replace `YOUR_SERVICE_ROLE_KEY` with actual service role key from Supabase settings.

---

## Phase 3: Frontend Build & Deploy

### Step 3.1: Update Environment Variables

**File:** `.env.local`

**Add/Update:**
```env
# Existing
VITE_SUPABASE_URL=https://anlivujgkjmajkcgbaxw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=your_gemini_api_key_here

# New (if needed for edge functions from client)
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

### Step 3.2: Test Locally

```bash
# Install dependencies (if not done)
npm install

# Run development server
npm run dev

# Test in browser:
# 1. Sign up as new user
# 2. Verify onboarding tutorial appears after 2 seconds
# 3. Navigate to /profile - verify Referral System appears
# 4. Click "Invite Friends" section
# 5. Test copy referral link
# 6. Open browser console - verify no errors
```

### Step 3.3: Build for Production

```bash
# Clean previous build
rm -rf dist/

# Build
npm run build

# Preview locally
npm run preview
# Visit http://localhost:4173
```

**Verify build output:**
- `dist/` folder created
- `dist/index.html` exists
- `dist/assets/` contains JS/CSS bundles
- No build errors in console

### Step 3.4: Deploy to GitHub Pages

**Automatic (GitHub Actions):**
```bash
# Commit all changes
git add .
git commit -m "feat: implement growth optimization features"
git push origin main

# GitHub Actions will automatically:
# 1. Build project
# 2. Deploy to GitHub Pages
# 3. Available at https://www.eventnexus.eu
```

**Manual (if needed):**
```bash
# Build
npm run build

# Deploy using gh-pages
npx gh-pages -d dist

# Or commit dist to gh-pages branch
git add dist -f
git commit -m "Deploy production build"
git subtree push --prefix dist origin gh-pages
```

---

## Phase 4: Resend Email Configuration

### Step 4.1: Verify Domain

**Navigate to:** [Resend Domains](https://resend.com/domains)

**Steps:**
1. Add domain: `eventnexus.eu`
2. Copy DNS records
3. Add to domain DNS provider:
   - TXT record for SPF
   - CNAME records for DKIM
   - DMARC record
4. Click **Verify**
5. Wait for verification (can take 24-48 hours)

**Test email sending:**
```bash
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer YOUR_RESEND_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "noreply@mail.eventnexus.eu",
    "to": "huntersest@gmail.com",
    "subject": "Test Email",
    "html": "<h1>Test successful!</h1>"
  }'
```

### Step 4.2: Configure Email Templates

**Navigate to:** Edge Function logs to monitor email sends

**Monitor:**
- Open [Supabase Functions Logs](https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/functions)
- Filter by function: `send-first-action-bonus`, `send-weekly-digest`
- Check for successful sends
- Verify no errors

---

## Phase 5: Testing & Verification

### Test 5.1: Onboarding Flow

**Steps:**
1. Open incognito browser window
2. Go to `https://www.eventnexus.eu`
3. Sign up with new account
4. After redirect, wait 2 seconds
5. ✅ Onboarding tutorial should appear
6. Complete all 5 steps
7. Verify stored in localStorage: `onboarding_completed=true`

**If not working:**
- Check browser console for errors
- Verify `OnboardingTutorial` component loads
- Check localStorage before/after

### Test 5.2: Referral System

**Steps:**
1. Log in to existing account
2. Navigate to `/profile`
3. Scroll to "Invite Friends" section
4. ✅ Verify referral code displays (8 characters)
5. Click "Copy Link" - verify clipboard
6. Click social share buttons - verify links open

**Test referral reward:**
1. Copy referral link
2. Open incognito window
3. Sign up using referral link: `?ref=ABCD1234`
4. Complete signup
5. Check original user profile
6. ✅ Verify stats: `1 referral`, `50 credits earned`

**Verify in database:**
```sql
-- Check referral codes
SELECT id, name, email, referral_code, referred_by 
FROM public.users 
WHERE referral_code IS NOT NULL;

-- Check credit transactions
SELECT * FROM public.credit_transactions 
WHERE transaction_type = 'referral_bonus' 
ORDER BY timestamp DESC;
```

### Test 5.3: First Action Bonus

**Steps:**
1. Sign up new account
2. Wait 24 hours (or manually trigger function)
3. ✅ Check email for "Claim Your 20 Bonus Credits"
4. Click any action button in email
5. Complete action (register event, follow organizer, etc.)
6. ✅ Verify 20 credits added to account

**Manual trigger (for testing):**
```bash
curl -X POST \
  https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/award-first-action-bonus \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId":"actual-user-uuid","action":"follow_organizer"}'
```

**Verify credits:**
```sql
SELECT id, name, credits 
FROM public.users 
WHERE id = 'user-uuid';

SELECT * FROM public.credit_transactions 
WHERE user_id = 'user-uuid' 
AND transaction_type = 'first_action_bonus';
```

### Test 5.4: Analytics Tracking

**Steps:**
1. Log in to account
2. Navigate to different pages: `/map`, `/dashboard`, `/pricing`
3. Perform actions: view event, like event, purchase ticket
4. Open Supabase SQL Editor

**Verify tracking:**
```sql
-- Page views
SELECT * FROM public.analytics_events 
WHERE user_id = 'your-user-id' 
AND event_type = 'page_view' 
ORDER BY timestamp DESC 
LIMIT 10;

-- User actions
SELECT * FROM public.user_behavior 
WHERE user_id = 'your-user-id' 
ORDER BY timestamp DESC 
LIMIT 10;

-- Feature usage
SELECT * FROM public.feature_usage 
WHERE user_id = 'your-user-id' 
ORDER BY timestamp DESC 
LIMIT 10;
```

### Test 5.5: Personalized Recommendations

**Steps:**
1. View several events in "Music" category
2. Like 2-3 music events
3. Follow a music event organizer
4. Go to `/map` homepage
5. ✅ Verify music events prioritized in recommendations

**Check algorithm:**
```sql
-- View user behavior pattern
SELECT action_type, category, COUNT(*) as count
FROM public.user_behavior
WHERE user_id = 'your-user-id'
GROUP BY action_type, category
ORDER BY count DESC;
```

---

## Phase 6: Monitoring & Optimization

### Monitor 6.1: Set Up Alerts

**Supabase Edge Function Monitoring:**
- Navigate to [Functions Logs](https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/functions)
- Set up alerts for:
  - Error rate > 5%
  - Response time > 5 seconds
  - Email delivery failures

**Database Monitoring:**
```sql
-- Check daily analytics
SELECT 
  DATE(timestamp) as date,
  COUNT(*) as total_events,
  COUNT(DISTINCT user_id) as unique_users
FROM public.analytics_events
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Check referral performance
SELECT 
  COUNT(*) as total_referrals,
  COUNT(DISTINCT referred_by) as active_referrers,
  SUM(50) as total_credits_awarded
FROM public.users
WHERE referred_by IS NOT NULL
AND created_at >= NOW() - INTERVAL '30 days';
```

### Monitor 6.2: Key Metrics Dashboard

**Create admin dashboard queries:**

```sql
-- Onboarding completion rate
WITH new_users AS (
  SELECT COUNT(*) as total
  FROM public.users
  WHERE created_at >= NOW() - INTERVAL '7 days'
),
completed_onboarding AS (
  SELECT COUNT(DISTINCT user_id) as completed
  FROM public.feature_usage
  WHERE feature_name = 'onboarding'
  AND timestamp >= NOW() - INTERVAL '7 days'
)
SELECT 
  new_users.total,
  completed_onboarding.completed,
  ROUND(100.0 * completed_onboarding.completed / new_users.total, 2) as completion_rate_percent
FROM new_users, completed_onboarding;

-- Referral conversion rate
WITH referrals AS (
  SELECT COUNT(*) as sent
  FROM public.user_behavior
  WHERE action_type = 'referral_sent'
  AND timestamp >= NOW() - INTERVAL '30 days'
),
conversions AS (
  SELECT COUNT(*) as converted
  FROM public.users
  WHERE referred_by IS NOT NULL
  AND created_at >= NOW() - INTERVAL '30 days'
)
SELECT 
  referrals.sent,
  conversions.converted,
  ROUND(100.0 * conversions.converted / NULLIF(referrals.sent, 0), 2) as conversion_rate_percent
FROM referrals, conversions;

-- Weekly active users
SELECT 
  COUNT(DISTINCT user_id) as weekly_active_users
FROM public.analytics_events
WHERE timestamp >= NOW() - INTERVAL '7 days';

-- Credit system health
SELECT 
  transaction_type,
  COUNT(*) as transaction_count,
  SUM(amount) as total_credits
FROM public.credit_transactions
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY transaction_type
ORDER BY total_credits DESC;
```

---

## Phase 7: Post-Deployment Optimization

### Week 1: Monitor & Fix

- [ ] Check error logs daily
- [ ] Monitor email delivery rate (target: >95%)
- [ ] Track onboarding completion (target: >40%)
- [ ] Verify referral system working (target: >5% participation)
- [ ] Check analytics data accuracy

### Week 2: A/B Testing

- [ ] Test onboarding tutorial variations
- [ ] Test referral incentive amounts (50 vs 100 credits)
- [ ] Test email subject lines for weekly digest
- [ ] Test feature teaser designs

### Month 1: Iterate

- [ ] Analyze conversion funnels
- [ ] Optimize personalization algorithm weights
- [ ] Add more feature teasers based on usage
- [ ] Expand email templates
- [ ] Launch referral program marketing campaign

---

## Rollback Plan

**If critical issues occur:**

### Step 1: Disable New Features
```bash
# Hide onboarding
localStorage.setItem('onboarding_completed', 'true');

# Disable edge functions
npx supabase functions delete send-first-action-bonus --project-ref anlivujgkjmajkcgbaxw
npx supabase functions delete send-weekly-digest --project-ref anlivujgkjmajkcgbaxw
```

### Step 2: Revert Frontend
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Rebuild and deploy
npm run build
npx gh-pages -d dist
```

### Step 3: Database Cleanup
```sql
-- Disable cron jobs
SELECT cron.unschedule('send-first-action-bonus-daily');
SELECT cron.unschedule('send-weekly-digest-sunday');

-- Tables remain but stop collecting data
```

---

## Success Criteria

### ✅ Deployment Successful When:

1. **Onboarding:**
   - [ ] Appears for all new users
   - [ ] Completion rate > 30%
   - [ ] No JavaScript errors

2. **Referrals:**
   - [ ] All users have unique code
   - [ ] Link sharing works
   - [ ] Credits awarded correctly
   - [ ] Participation rate > 5%

3. **Email Automation:**
   - [ ] First action emails sent daily
   - [ ] Weekly digests sent Sundays
   - [ ] Delivery rate > 95%
   - [ ] No spam complaints

4. **Analytics:**
   - [ ] All events tracked
   - [ ] User behavior recorded
   - [ ] Funnel data accurate
   - [ ] Dashboard queries work

5. **Performance:**
   - [ ] Page load time < 3 seconds
   - [ ] Edge functions respond < 2 seconds
   - [ ] Database queries < 500ms
   - [ ] No user-visible errors

---

## Support Contacts

**Technical Issues:**
- Primary: huntersest@gmail.com
- Supabase: support@supabase.com
- Resend: support@resend.com

**Production URL:** https://www.eventnexus.eu

**Dashboard Links:**
- [Supabase Dashboard](https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw)
- [Resend Dashboard](https://resend.com/emails)
- [Google Analytics](https://analytics.google.com/analytics/web/#/p451867887/reports/intelligenthome)

---

**Last Updated:** December 26, 2025  
**Version:** 1.0.0  
**Status:** Ready for Production Deployment
