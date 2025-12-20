# Brand Monitoring - Production Deployment Guide

Complete guide for deploying brand monitoring system to production with Supabase Edge Functions.

## Architecture

```
Client (Admin Dashboard)
    ↓
brandMonitoringService.ts
    ↓
Supabase Edge Function (brand-monitoring)
    ↓
External APIs (GitHub, WHOIS, Google, Twitter, etc.)
    ↓
Supabase Database (brand_monitoring_alerts, monitoring_stats)
```

**Key Benefits:**
- ✅ API keys stored securely in Supabase Secrets (not in client code)
- ✅ Server-side API calls (no CORS issues)
- ✅ Rate limiting controlled on server
- ✅ Better security and performance

---

## Step 1: Deploy Edge Function

### Option A: Supabase CLI (Recommended)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref anlivujgkjmajkcgbaxw

# Deploy the Edge Function
supabase functions deploy brand-monitoring

# Verify deployment
supabase functions list
```

### Option B: Supabase Dashboard

1. Go to Supabase Dashboard → Edge Functions
2. Click "Create New Function"
3. Name: `brand-monitoring`
4. Copy content from `/workspaces/EventNexus/supabase/functions/brand-monitoring/index.ts`
5. Click "Deploy"

---

## Step 2: Configure API Secrets

### Using Supabase CLI

```bash
# GitHub API (Required for code monitoring)
supabase secrets set GITHUB_TOKEN=ghp_your_github_token_here

# WHOIS API (Required for domain monitoring)
supabase secrets set WHOIS_API_KEY=your_whois_api_key_here

# Google Custom Search (Optional - for search monitoring)
supabase secrets set GOOGLE_SEARCH_KEY=your_google_api_key
supabase secrets set GOOGLE_SEARCH_ENGINE=your_search_engine_id

# Twitter API (Optional - for social monitoring)
supabase secrets set TWITTER_BEARER_TOKEN=your_twitter_bearer_token

# Facebook API (Optional - for social monitoring)
supabase secrets set FACEBOOK_APP_ID=your_facebook_app_id
supabase secrets set FACEBOOK_APP_SECRET=your_facebook_app_secret

# Brand Monitoring Service (Optional)
supabase secrets set BRAND_MONITORING_API_KEY=your_brand_api_key
```

### Using Supabase Dashboard

1. Go to Project Settings → Edge Functions
2. Scroll to "Secrets" section
3. Add each secret:
   - Name: `GITHUB_TOKEN`
   - Value: `ghp_your_token`
4. Click "Add Secret"
5. Repeat for all secrets

### Verify Secrets

```bash
# List all secrets (values are hidden)
supabase secrets list
```

---

## Step 3: Run Database Migration

```bash
# Connect to your Supabase database
supabase db push

# Or manually in Supabase SQL Editor:
# Copy and run: sql/create-brand-monitoring-tables.sql
```

Verify tables created:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('brand_monitoring_alerts', 'monitoring_stats');
```

---

## Step 4: Test Edge Function

### Test from Terminal

```bash
# Get your anon key from Supabase Dashboard
ANON_KEY="your_supabase_anon_key"
PROJECT_URL="https://anlivujgkjmajkcgbaxw.supabase.co"

# Test comprehensive scan (requires admin authentication)
curl -X POST "${PROJECT_URL}/functions/v1/brand-monitoring" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"action": "comprehensive"}'
```

### Test from Admin Dashboard

1. Log in as admin user
2. Go to Admin Command Center → Brand Protection
3. Click "Scan Now" in any section
4. Check console for results
5. Verify alerts appear in database:
```sql
SELECT * FROM brand_monitoring_alerts ORDER BY timestamp DESC LIMIT 10;
```

---

## Step 5: Configure API Keys

### GitHub API Setup

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes:
   - `repo` (for code search)
   - `read:org` (optional)
4. Generate token
5. Copy token and add to Supabase:
   ```bash
   supabase secrets set GITHUB_TOKEN=ghp_your_token_here
   ```

### WHOIS API Setup

1. Register at https://whoisxmlapi.com/
2. Get free API key (1000 requests/month)
3. Add to Supabase:
   ```bash
   supabase secrets set WHOIS_API_KEY=your_key_here
   ```

### Google Custom Search Setup

1. Create project at https://console.cloud.google.com/
2. Enable "Custom Search API"
3. Create credentials (API key)
4. Create Search Engine at https://cse.google.com/
5. Add both to Supabase:
   ```bash
   supabase secrets set GOOGLE_SEARCH_KEY=your_key
   supabase secrets set GOOGLE_SEARCH_ENGINE=your_engine_id
   ```

### Twitter API Setup

1. Apply for developer account at https://developer.twitter.com/
2. Create app and get Bearer Token
3. Add to Supabase:
   ```bash
   supabase secrets set TWITTER_BEARER_TOKEN=your_token
   ```

---

## Step 6: Set Up Automated Monitoring

### Option A: Supabase Cron Jobs

Create automated scans that run periodically:

```sql
-- Run comprehensive scan every 6 hours
SELECT cron.schedule(
  'brand-monitoring-comprehensive',
  '0 */6 * * *', -- Every 6 hours
  $$
  SELECT net.http_post(
    url := 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/brand-monitoring',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{"action": "comprehensive"}'::jsonb
  );
  $$
);

-- Run code scan daily at 2 AM
SELECT cron.schedule(
  'brand-monitoring-code',
  '0 2 * * *', -- Daily at 2 AM
  $$
  SELECT net.http_post(
    url := 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/brand-monitoring',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{"action": "scan-code"}'::jsonb
  );
  $$
);

-- Run social monitoring every hour
SELECT cron.schedule(
  'brand-monitoring-social',
  '0 * * * *', -- Every hour
  $$
  SELECT net.http_post(
    url := 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/brand-monitoring',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{"action": "scan-social"}'::jsonb
  );
  $$
);
```

### Option B: External Cron Service

Use services like:
- **GitHub Actions** - Free for public repos
- **Vercel Cron** - Integrated with deployments
- **Render Cron Jobs** - Simple setup

Example GitHub Action:
```yaml
# .github/workflows/brand-monitoring.yml
name: Brand Monitoring
on:
  schedule:
    - cron: '0 */6 * * *' # Every 6 hours
  workflow_dispatch: # Manual trigger

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - name: Run Comprehensive Scan
        run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/brand-monitoring" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"action": "comprehensive"}'
```

---

## Step 7: Configure Alerting

### Email Notifications

Add email alerts for critical findings:

```typescript
// In Edge Function: supabase/functions/brand-monitoring/index.ts
// After creating alerts, send email for critical ones

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function sendCriticalAlert(alert: any) {
  const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
  
  if (!SENDGRID_API_KEY) return;

  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: 'huntersest@gmail.com' }],
        subject: `🚨 Critical Alert: ${alert.title}`,
      }],
      from: { email: 'alerts@eventnexus.eu' },
      content: [{
        type: 'text/html',
        value: `
          <h2>Critical Brand Monitoring Alert</h2>
          <p><strong>Type:</strong> ${alert.type}</p>
          <p><strong>Title:</strong> ${alert.title}</p>
          <p><strong>Description:</strong> ${alert.description}</p>
          <p><strong>URL:</strong> <a href="${alert.url}">${alert.url}</a></p>
          <p><strong>Time:</strong> ${new Date(alert.timestamp).toLocaleString()}</p>
        `,
      }],
    }),
  });
}
```

Add to secrets:
```bash
supabase secrets set SENDGRID_API_KEY=your_sendgrid_key
```

---

## Troubleshooting

### Issue: Edge Function not deploying

**Solution:**
```bash
# Check function logs
supabase functions logs brand-monitoring

# Redeploy with verbose output
supabase functions deploy brand-monitoring --debug
```

### Issue: API rate limits exceeded

**Solution:**
- Reduce scan frequency in cron jobs
- Implement caching in Edge Function
- Use pagination for large result sets
- Check API service quotas

### Issue: Secrets not found in Edge Function

**Solution:**
```bash
# Verify secrets are set
supabase secrets list

# Re-set any missing secrets
supabase secrets set SECRET_NAME=value

# Redeploy function after setting secrets
supabase functions deploy brand-monitoring
```

### Issue: Unauthorized errors

**Solution:**
- Verify user has admin role in database
- Check RLS policies are enabled
- Use service role key for cron jobs

---

## Monitoring & Maintenance

### Check Function Health

```bash
# View recent invocations
supabase functions logs brand-monitoring --tail

# Check for errors
supabase functions logs brand-monitoring --level error
```

### Monitor API Usage

Track API quotas:
- **GitHub:** 5,000 requests/hour (authenticated)
- **WHOIS:** Check your plan limits
- **Google Search:** 100 queries/day (free tier)
- **Twitter:** Varies by endpoint

### Database Cleanup

Remove old alerts periodically:
```sql
-- Delete alerts older than 90 days
DELETE FROM brand_monitoring_alerts
WHERE timestamp < NOW() - INTERVAL '90 days';

-- Or archive instead of delete
CREATE TABLE brand_monitoring_alerts_archive AS
SELECT * FROM brand_monitoring_alerts
WHERE timestamp < NOW() - INTERVAL '90 days';

DELETE FROM brand_monitoring_alerts
WHERE timestamp < NOW() - INTERVAL '90 days';
```

---

## Security Checklist

- [ ] All API keys stored in Supabase Secrets (not in code)
- [ ] Edge Function verifies admin role before scanning
- [ ] RLS policies enabled on monitoring tables
- [ ] Service role key not exposed in client code
- [ ] Rate limiting implemented for API calls
- [ ] Secrets rotation schedule established (quarterly)
- [ ] Error logs monitored for security issues
- [ ] Database backups enabled

---

## Cost Estimation

### API Costs (Monthly)

- **GitHub API:** Free (5,000 requests/hour)
- **WHOIS API:** $10-50/month (1,000-10,000 requests)
- **Google Search:** Free (100/day) or $5/1000 queries
- **Twitter API:** Free or $100/month (Basic tier)
- **Supabase Edge Functions:** Free tier includes 500K requests

**Estimated Total:** $0-200/month depending on usage

### Optimization Tips

1. Cache results for 1-24 hours depending on urgency
2. Use batch API calls where possible
3. Start with GitHub + WHOIS only, add others later
4. Monitor usage and adjust scan frequency

---

## Next Steps

1. ✅ Deploy Edge Function
2. ✅ Configure API secrets
3. ✅ Run database migration
4. ✅ Test from admin dashboard
5. ✅ Set up automated scans
6. ✅ Configure email alerts
7. 📧 Document response procedures for alerts
8. 📊 Create monitoring dashboard for API usage

---

## Support

For deployment issues:

**Email:** huntersest@gmail.com  
**Subject:** "Brand Monitoring Deployment Help"

Include:
- Error messages from `supabase functions logs`
- Which step you're on
- What API keys you've configured
- Screenshots if applicable

---

**Last Updated:** December 20, 2025  
**Deployment Time:** ~30 minutes (with API keys ready)
