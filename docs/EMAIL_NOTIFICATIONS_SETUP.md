# Email Notifications Setup Guide

## Overview
This guide explains how to configure email notifications for critical brand monitoring alerts using Resend API.

## Prerequisites
- Resend account (free tier: 100 emails/day, 3000/month)
- Domain verified in Resend: `mail.eventnexus.eu` (subdomain protects main domain reputation)
- API key from Resend Dashboard

## Resend Configuration

### 1. Create Resend Account
1. Go to https://resend.com/signup
2. Sign up with email: `jour email`
3. Verify email address

### 2. Add Domain
1. Go to **Domains** → **Add Domain**
2. Enter: `mail.eventnexus.eu` (subdomain recommended by Resend)
3. Add DNS records to domain provider:

   **TXT Record (Verification):**
   ```
   Type: TXT
   Host: mail.eventnexus.eu  (or just "mail" depending on your DNS provider)
   Value: resend=<verification-code>
   ```
   
   **MX Record (Email Routing):**
   ```
   Type: MX
   Host: mail.eventnexus.eu  (or just "mail" depending on your DNS provider)
   Value: feedback-smtp.eu-west-1.amazonses.com
   Priority: 10
   ```

   **DNS Provider Format Examples:**
   - **If your DNS manager shows:** `Host: .eventnexus.eu.` or full domain format
     - Use: `mail.eventnexus.eu` or `mail.eventnexus.eu.` (with trailing dot)
   - **If your DNS manager uses:** relative names
     - Use: `mail` (it will automatically append .eventnexus.eu)
   - **Common providers:**
     - Cloudflare: Use `mail` (relative)
     - Route53/AWS: Use `mail.eventnexus.eu.` (FQDN with trailing dot)
     - Most Estonian providers: Use `mail.eventnexus.eu` (full name without trailing dot)

4. Wait for verification (5-15 minutes)

### 3. Generate API Key
1. Go to **API Keys** → **Create API Key**
2. Name: `EventNexus Brand Monitoring`
3. Permission: **Full Access** (or **Sending Access** if available)
4. Copy API key (starts with `re_...`)

## Supabase Edge Function Configuration

### 1. Set Resend API Key Secret
```bash
cd /workspaces/EventNexus
npx supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

Verify:
```bash
npx supabase secrets list
```

Should show:
```
GITHUB_TOKEN
GOOGLE_SEARCH_KEY
GOOGLE_SEARCH_ENGINE
RESEND_API_KEY  ✅
```

### 2. Update Edge Function to Send Emails

The Edge Function already has email service integrated in `services/emailService.ts`. We need to call it from the monitoring function.

Open: `supabase/functions/brand-monitoring/index.ts`

Add at top:
```typescript
import { sendAlertEmail } from '../_shared/emailService.ts';
```

Add after alert insertion (around line 120):
```typescript
// Send email for critical alerts
if (newAlerts.length > 0) {
  const criticalAlerts = newAlerts.filter(a => a.severity === 'critical');
  
  for (const alert of criticalAlerts) {
    try {
      await sendAlertEmail(alert);
      console.log(`Email sent for critical alert: ${alert.title}`);
    } catch (error) {
      console.error('Email send error:', error);
    }
  }
}
```

### 3. Deploy Updated Edge Function
```bash
npx supabase functions deploy brand-monitoring --no-verify-jwt
```

## Email Templates

### Critical Alert Email
- **From:** `alerts@mail.eventnexus.eu`
- **To:** `huntersest@gmail.com`
- **Subject:** `🚨 CRITICAL: Brand Protection Alert - [Alert Title]`
- **Content:** HTML email with:
  - Alert severity badge
  - Alert title + description
  - URL (if applicable)
  - Detection method
  - Timestamp
  - Action button → Admin Dashboard
  - Legal framework references

### Weekly Summary Email
- **From:** `alerts@mail.eventnexus.eu`
- **To:** `huntersest@gmail.com`
- **Subject:** `📊 Weekly Brand Monitoring Summary`
- **Content:** HTML email with:
  - Total alerts this week
  - Breakdown by severity (Critical/Warning/Info)
  - Top detected issues
  - Response metrics
  - Trend indicators
  - Link to full dashboard

## Testing Email Notifications

### 1. Trigger a Critical Alert
1. Go to Admin → Brand Protection
2. Click **Run Full Scan**
3. Wait for scan to complete
4. Check email inbox (huntersest@gmail.com)
5. Verify email received within 30 seconds

### 2. Manual Test via Edge Function
```bash
curl -X POST https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/brand-monitoring \
  -H "Content-Type: application/json" \
  -d '{"action":"scan-code"}'
```

Check Supabase Functions logs:
```
Console logs:
✅ Email sent for critical alert: LoadEventNexus Repository
```

### 3. Test Email Service Directly
Create test file: `supabase/functions/test-email/index.ts`
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { sendAlertEmail } from '../_shared/emailService.ts';

serve(async (req) => {
  const testAlert = {
    id: 'test-123',
    type: 'code',
    severity: 'critical',
    title: 'TEST ALERT - Email Integration Test',
    description: 'This is a test email to verify Resend integration is working correctly.',
    url: 'https://github.com/test/repo',
    timestamp: new Date().toISOString(),
    status: 'open',
    detected_by: 'manual_test'
  };

  try {
    await sendAlertEmail(testAlert);
    return new Response(JSON.stringify({ success: true, message: 'Test email sent' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

Deploy and test:
```bash
npx supabase functions deploy test-email --no-verify-jwt
curl https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/test-email
```

## Troubleshooting

### Email Not Received

**Check 1: Resend API Key**
```bash
npx supabase secrets list
# Verify RESEND_API_KEY is set
```

**Check 2: Domain Verification**
- Go to Resend Dashboard → Domains
- Status should be **Verified** (green checkmark)
- If pending, check DNS records propagation

**Check 3: Edge Function Logs**
```bash
npx supabase functions logs brand-monitoring --tail
```

Look for:
- `Email sent for critical alert: ...` (success)
- `Email send error: ...` (failure)
- `Resend API error: ...` (API issues)

**Check 4: Spam Folder**
- Check huntersest@gmail.com spam folder
- Mark as "Not Spam" if found
- Add `alerts@mail.eventnexus.eu` to contacts

### Resend API Errors

**401 Unauthorized**
- API key incorrect or expired
- Re-generate API key in Resend Dashboard
- Update Supabase secret

**403 Forbidden**
- Domain not verified
- Email address not allowed (check domain verification)
- API key permissions insufficient

**429 Rate Limited**
- Free tier limit reached (100/day)
- Upgrade to paid plan or reduce alert frequency

**500 Server Error**
- Resend service outage (check status.resend.com)
- Retry after 5 minutes

### Email Not Sending from Edge Function

**Check imports:**
```typescript
// Correct import path
import { sendAlertEmail } from '../_shared/emailService.ts';
```

**Check environment variable:**
```typescript
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
if (!RESEND_API_KEY) {
  console.error('RESEND_API_KEY not configured');
}
```

**Check alert severity:**
```typescript
// Only critical alerts trigger email
if (alert.severity === 'critical') {
  await sendAlertEmail(alert);
}
```

## Weekly Summary Setup (Optional)

### Using pg_cron (Requires Supabase Pro Plan)

1. Enable pg_cron extension in Supabase Dashboard
2. Create Edge Function trigger:

```sql
-- Run every Monday at 9 AM UTC
SELECT cron.schedule(
  'weekly-monitoring-summary',
  '0 9 * * 1',
  $$
    SELECT net.http_post(
      url := 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/send-weekly-summary',
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  $$
);
```

3. Create Edge Function: `supabase/functions/send-weekly-summary/index.ts`
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { sendWeeklySummary } from '../_shared/emailService.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Fetch stats from last 7 days
  const { data: stats } = await supabase
    .from('brand_monitoring_history')
    .select('*')
    .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('date', { ascending: false });

  const weeklyStats = {
    codeScans: stats?.reduce((acc, s) => acc + (s.code_alerts || 0), 0) || 0,
    domainChecks: stats?.reduce((acc, s) => acc + (s.domain_alerts || 0), 0) || 0,
    brandMentions: stats?.reduce((acc, s) => acc + (s.brand_alerts || 0), 0) || 0,
    criticalAlerts: stats?.reduce((acc, s) => acc + s.critical_alerts, 0) || 0,
    warningAlerts: stats?.reduce((acc, s) => acc + s.warning_alerts, 0) || 0,
    infoAlerts: stats?.reduce((acc, s) => acc + s.info_alerts, 0) || 0,
    lastScanTime: new Date(),
  };

  await sendWeeklySummary(weeklyStats);

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

4. Deploy:
```bash
npx supabase functions deploy send-weekly-summary --no-verify-jwt
```

### Alternative: GitHub Actions (Works on any Supabase plan)

Create `.github/workflows/weekly-summary.yml`:
```yaml
name: Weekly Brand Monitoring Summary

on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM UTC
  workflow_dispatch:  # Manual trigger

jobs:
  send-summary:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Edge Function
        run: |
          curl -X POST https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/send-weekly-summary \
            -H "Content-Type: application/json"
```

## Email Deliverability Best Practices

### 1. SPF Record
Add to DNS:

**If your DNS provider uses full domain format (like `.eventnexus.eu.`):**
```
Type: TXT
Host: mail.eventnexus.eu
Value: v=spf1 include:amazonses.com ~all
```

**If your DNS provider uses relative names:**
```
Type: TXT
Name: mail
Value: v=spf1 include:amazonses.com ~all
```

### 2. DKIM (Resend manages automatically)
Verify in Resend Dashboard → Domains → DKIM Status: ✅

### 3. DMARC Record
Add to DNS:

**If your DNS provider uses full domain format:**
```
Type: TXT
Host: _dmarc.mail.eventnexus.eu
Value: v=DMARC1; p=none; rua=mailto:huntersest@gmail.com
```

**If your DNS provider uses relative names:**
```
Type: TXT
Name: _dmarc.mail
Value: v=DMARC1; p=none; rua=mailto:huntersest@gmail.com
```

### 4. PTR Record (Reverse DNS)
Managed by Resend/AWS SES - no action needed

## Monitoring Email Deliverability

### Resend Dashboard
- Go to **Emails** tab
- View delivery status for each email:
  - ✅ **Delivered** - success
  - ⏳ **Pending** - in queue
  - ❌ **Bounced** - failed (check recipient)
  - 📫 **Spam** - marked as spam

### Email Logs
```bash
npx supabase functions logs brand-monitoring --tail
```

Look for:
```
Email sent for critical alert: Repository similarity detected
Email send error: {status: 400, message: "Domain not verified"}
```

## Cost & Limits

### Resend Free Tier
- **100 emails/day**
- **3,000 emails/month**
- **1 verified domain**
- **Email history: 7 days**

### Resend Pro ($20/month)
- **50,000 emails/month**
- **Unlimited domains**
- **Email history: 90 days**
- **Dedicated IP (optional +$50/mo)**
- **SMTP relay**

### Typical Usage
- **Critical alerts:** ~5-10/day (500-3000/month)
- **Weekly summary:** 4/month
- **Total:** Well within free tier limits

## Security & Privacy

### API Key Protection
- ✅ Stored in Supabase Secrets (encrypted at rest)
- ✅ Never committed to git
- ✅ Rotatable via Resend Dashboard
- ✅ Scoped to sending only (no account access)

### Email Content
- ✅ Only admin email (huntersest@gmail.com) receives alerts
- ✅ No PII in emails (only alert metadata)
- ✅ URLs included for transparency
- ✅ Legal framework references included

### Compliance
- ✅ GDPR compliant (EU-hosted SES)
- ✅ No email tracking pixels
- ✅ Unsubscribe link in weekly summary
- ✅ Resend privacy policy: https://resend.com/legal/privacy

## Complete Setup Checklist

- [ ] Resend account created
- [ ] Domain `mail.eventnexus.eu` added to Resend
- [ ] DNS records added (TXT, MX for subdomain)
- [ ] Domain verified (green checkmark)
- [ ] API key generated
- [ ] `RESEND_API_KEY` set in Supabase secrets
- [ ] Edge Function updated with email trigger
- [ ] Edge Function deployed
- [ ] Test email sent successfully
- [ ] Test email received in inbox (not spam)
- [ ] SPF/DKIM/DMARC configured (optional)
- [ ] Weekly summary scheduled (optional)
- [ ] Monitoring dashboard checked

## Next Steps

After email setup is complete:
1. Monitor first 24 hours for successful delivery
2. Check spam folder initially
3. Add `alerts@mail.eventnexus.eu` to Gmail contacts
4. Test critical alert triggering
5. Verify email arrives within 30 seconds
6. Check Resend Dashboard for delivery stats
7. Consider upgrading to Pro if volume increases

## Support

- **Resend Support:** support@resend.com
- **Resend Docs:** https://resend.com/docs
- **Resend Status:** https://status.resend.com
- **EventNexus Maintainer:** huntersest@gmail.com
