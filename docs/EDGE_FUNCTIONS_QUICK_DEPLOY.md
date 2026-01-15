# 🚀 Edge Functions Deployment Guide

## Quick Start

### 1. Set Email Service Key
```bash
# Sign up at https://resend.com (free tier available)
# Get your API key from Resend dashboard
# Set it in Supabase secrets:
npx supabase secrets set RESEND_API_KEY your_resend_api_key_here
```

### 2. Configure Scheduled Task (supabase/config.toml)

Add this to your `supabase/config.toml`:

```toml
[functions."process-event-reports"]
schedule = "0 * * * *"
```

This runs the process-event-reports function every hour at minute 0.

### 3. Deploy Edge Functions

```bash
# Navigate to project root
cd /workspaces/EventNexus

# Deploy both functions
npx supabase functions deploy process-event-reports
npx supabase functions deploy send-report-notifications

# Or deploy all at once
npx supabase functions deploy
```

### 4. Verify Deployment

Check functions were deployed:
```bash
npx supabase functions list
```

You should see:
- ✅ process-event-reports
- ✅ send-report-notifications

### 5. Test Locally (Optional)

```bash
# Start local Supabase
npx supabase start

# In another terminal, serve functions
npx supabase functions serve

# Test the scheduled function
curl -X POST http://localhost:54321/functions/v1/process-event-reports \
  -H "Authorization: Bearer $ANON_KEY"

# Test email notification
curl -X POST http://localhost:54321/functions/v1/send-report-notifications \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"reportId": "test-id", "action": "created"}'
```

---

## What These Functions Do

### 📧 send-report-notifications
**Runs:** On-demand when reports are created or status changes
**Does:**
- Sends email to organizer when report is created
- Sends email to reporter when status changes
- Beautiful HTML templates
- Links back to organizer hub

**Triggered from:**
- `createEventReport()` in dbService.ts
- `updateReportStatus()` in dbService.ts

### ⏰ process-event-reports
**Runs:** Every hour (configurable via cron)
**Does:**
- 🚫 Auto-hides events with 5+ open reports
- 📧 Emails organizer about auto-hiding
- ⚠️ Flags organizers with 10+ total reports for admin review
- 🔔 Notifies admins of problematic organizers

**Thresholds:**
```
REPORT_THRESHOLD = 5     (auto-hide after 5 reports)
SUSPEND_THRESHOLD = 10   (flag after 10 reports)
```

---

## Monitor Execution

### In Supabase Dashboard:
1. Go to your project → Edge Functions
2. Click function name
3. View "Execution logs" and "Errors"

### Common Logs:
```
✅ Auto-hidden event: EventName (5 reports)
✉️ Email sent to user@email.com
⚠️ Organizer ORG_ID has 10 total reports
Error in send-report-notifications: ...
```

---

## Troubleshooting

### Email not sending?
```bash
# 1. Check RESEND_API_KEY is set
npx supabase secrets list

# 2. Verify it's correct at https://resend.com/keys
# 3. Check logs in Supabase dashboard
# 4. Test Resend API directly:
curl https://api.resend.com/emails \
  -X POST \
  -H 'Authorization: Bearer YOUR_RESEND_KEY' \
  -d '{"from":"noreply@eventnexus.eu","to":"test@example.com","subject":"Test"}'
```

### Cron not running?
```bash
# 1. Verify schedule in supabase/config.toml
cat supabase/config.toml | grep -A2 "process-event-reports"

# 2. Push config to Supabase
npx supabase db push

# 3. Wait up to 1 hour for next execution
# 4. Check logs in dashboard
```

### Function deployment fails?
```bash
# 1. Check for Deno/TypeScript errors
npx supabase functions deploy process-event-reports --debug

# 2. Install dependencies if needed
npx supabase functions deploy send-report-notifications

# 3. Clean and retry
rm -rf .supabase/functions/.deno
npx supabase functions deploy
```

---

## Configuration

### Adjust Thresholds

Edit `/supabase/functions/process-event-reports/index.ts`:

```typescript
const REPORT_THRESHOLD = 5;      // Change to 3 for stricter
const SUSPEND_THRESHOLD = 10;    // Change to 5 for lower
```

Then redeploy:
```bash
npx supabase functions deploy process-event-reports
```

### Change Cron Schedule

Edit `supabase/config.toml`:

```toml
# Every hour (current)
schedule = "0 * * * *"

# Every 30 minutes
schedule = "*/30 * * * *"

# Every 6 hours
schedule = "0 */6 * * *"

# Daily at 9 AM UTC
schedule = "0 9 * * *"
```

Then push:
```bash
npx supabase db push
```

---

## Environment Variables Required

These must be set in Supabase secrets:

| Variable | Description | How to Get |
|----------|-------------|-----------|
| `RESEND_API_KEY` | Email service API key | [resend.com/keys](https://resend.com/keys) |
| `SUPABASE_URL` | Auto-configured | N/A |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-configured | N/A |

---

## Security Notes

✅ **Secure:**
- Service role key only in Edge Functions (server-side)
- RLS policies protect report data
- Anonymous reports don't expose identity
- Rate limiting via Supabase Auth

⚠️ **Monitor:**
- Spam reports (implement cooldown if needed)
- Organizers disputing suspensions
- Admins overriding too many reports

---

## Future Enhancements

Consider adding:
1. 📊 Weekly admin digest emails
2. 🤖 AI spam detection
3. 🔄 Auto-report cleanup (archive old resolved)
4. 📱 Push notifications
5. 🔔 Slack/Discord alerts for admins

