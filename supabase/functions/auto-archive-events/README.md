# Auto-Archive Events Edge Function

This Edge Function automatically archives events that have been completed for more than 1 day.

## Setup

### 1. Deploy the Function
```bash
supabase functions deploy auto-archive-events
```

### 2. Set Up Cron Job (Option A - Supabase Cron)

Add to your Supabase project SQL editor:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the Edge Function to run daily at 2 AM UTC
SELECT cron.schedule(
  'auto-archive-completed-events',
  '0 2 * * *',  -- Every day at 2:00 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/auto-archive-events',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    ) as request_id;
  $$
);
```

### 2. Set Up Cron Job (Option B - External Cron Service)

Use services like:
- **Cron-job.org**: Free cron service
- **EasyCron**: Free tier available
- **GitHub Actions**: With scheduled workflows

Example GitHub Action (`.github/workflows/auto-archive.yml`):
```yaml
name: Auto-Archive Events
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  auto-archive:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Auto-Archive
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            https://YOUR_PROJECT_REF.supabase.co/functions/v1/auto-archive-events
```

### 3. Manual Trigger (For Testing)

You can manually trigger the function:

```bash
# Using curl
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/auto-archive-events

# Or from your app
import { runAutoArchiveCompletedEvents } from './services/dbService';
const count = await runAutoArchiveCompletedEvents();
console.log(`Archived ${count} events`);
```

## What It Does

1. Finds all active events that ended more than 1 day ago
2. Archives them by setting `archived_at`, `archived_by`, and `status = 'archived'`
3. Creates a notification for each organizer
4. Returns the count of archived events

## Response

```json
{
  "success": true,
  "archivedCount": 5,
  "message": "Successfully archived 5 completed events"
}
```

## Monitoring

Check Supabase Function logs:
```bash
supabase functions logs auto-archive-events
```

## Notes

- Events are only archived if they ended more than 1 day ago
- Organizers receive notifications when their events are archived
- Archived events can still be restored by organizers
- This prevents the database from filling with old active events
