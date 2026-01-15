# Cron Scheduling Options for process-event-reports

## Option 1: Supabase Dashboard (Manual)

1. Go to: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/functions
2. Click **process-event-reports**
3. Look for "Schedule" tab or button at the top
4. Set cron expression: `0 * * * *` (every hour)
5. Save

## Option 2: EasyCron (Free External Service)

1. Go to: https://www.easycron.com/
2. Create free account
3. Add new cron job:
   - URL: `https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/process-event-reports`
   - Method: POST
   - Headers: 
     ```
     Authorization: Bearer YOUR_ANON_KEY
     Content-Type: application/json
     ```
   - Cron expression: `0 * * * *`
4. Save and enable

## Option 3: GitHub Actions (Free)

Create `.github/workflows/cron-reports.yml`:

```yaml
name: Process Event Reports

on:
  schedule:
    - cron: '0 * * * *'  # Every hour

jobs:
  process-reports:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger process-event-reports
        run: |
          curl -X POST \
            https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/process-event-reports \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json"
```

Then add `SUPABASE_ANON_KEY` to GitHub secrets.

## Option 4: Node.js Cron (Local Development)

Install: `npm install node-cron`

Create `scripts/cron-jobs.js`:

```javascript
const cron = require('node-cron');
const fetch = require('node-fetch');

// Run every hour at minute 0
cron.schedule('0 * * * *', async () => {
  console.log('⏰ Running process-event-reports...');
  
  try {
    const response = await fetch(
      'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/process-event-reports',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Response:', response.status);
  } catch (error) {
    console.error('❌ Error:', error);
  }
});

console.log('🚀 Cron scheduler started');
```

## Recommended Setup

**For Production:** Use EasyCron (Option 2) - simple, reliable, free tier available

**For Development:** Use GitHub Actions (Option 3) - integrated with repo

**Quick Test:** Run manually from dashboard

---

## Test Manual Trigger

```bash
curl -X POST \
  https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/process-event-reports \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Verify It's Working

Check in Supabase Dashboard:
1. Edge Functions → process-event-reports → Logs
2. Look for execution logs
3. Should see entries like: "✅ Auto-hidden event:" or "Processing..."
