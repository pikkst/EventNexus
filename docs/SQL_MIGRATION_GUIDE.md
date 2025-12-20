# Brand Monitoring SQL Migration Guide

## Overview
This guide will help you execute the SQL migrations for the Brand Monitoring enhancements system.

## Prerequisites
- Access to Supabase Dashboard (https://supabase.com/dashboard)
- Admin role in EventNexus project
- Project URL: `https://anlivujgkjmajkcgbaxw.supabase.co`

## What Gets Created

### 1. **Whitelist Table** (`brand_monitoring_whitelist`)
- Prevents false positives from re-appearing
- Stores URL, title, reason, whitelisted_by admin, timestamp
- UNIQUE constraint on (url, title) combo
- Admin-only RLS policy

### 2. **Notes Table** (`brand_monitoring_notes`)
- Stores admin comments/notes on alerts
- Links to alert_id (CASCADE delete)
- Tracks created_by admin + timestamp
- Admin-only RLS policy

### 3. **Priority Column** (added to `brand_monitoring_alerts`)
- Values: 'low', 'medium' (default), 'high'
- CHECK constraint ensures valid values
- Indexed for fast filtering

### 4. **Historical Stats Table** (`brand_monitoring_history`)
- Daily snapshots of monitoring stats
- Tracks: total, critical, warning, info counts
- Tracks: new today, resolved today
- UNIQUE date constraint (one row per day)
- Admin-only view policy

### 5. **Functions**
- `snapshot_daily_stats()` - captures daily stats (for pg_cron)
- `get_alert_trends(days)` - returns last N days of data for charts
- `update_updated_at_column()` - auto-updates timestamp trigger

### 6. **Performance Indexes**
- idx_alerts_status
- idx_alerts_severity  
- idx_alerts_type
- idx_alerts_priority
- idx_alerts_timestamp
- idx_whitelist_lookup

## Migration Steps

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select **EventNexus** project
3. Click **SQL Editor** in left sidebar
4. Click **New query** button

### Step 2: Copy SQL Script
Open the file: `/workspaces/EventNexus/sql/brand-monitoring-enhancements.sql`

Copy the entire contents (all 180 lines).

### Step 3: Execute Migration
1. Paste the SQL into the SQL Editor
2. Click **Run** button (bottom right)
3. Wait for execution (~2-5 seconds)
4. Verify success message: "Success. No rows returned"

### Step 4: Verify Tables Created
1. Click **Table Editor** in left sidebar
2. Check for new tables:
   - ✅ `brand_monitoring_whitelist`
   - ✅ `brand_monitoring_notes`
   - ✅ `brand_monitoring_history`

3. Check `brand_monitoring_alerts` table:
   - ✅ New column: `priority` (text)
   - ✅ New column: `updated_at` (timestamptz)

### Step 5: Test RLS Policies
Run this test query in SQL Editor:
```sql
-- Should return empty (whitelist is empty initially)
SELECT * FROM brand_monitoring_whitelist;

-- Should return empty (no notes yet)
SELECT * FROM brand_monitoring_notes;

-- Should return empty (no snapshots yet)
SELECT * FROM brand_monitoring_history;

-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('snapshot_daily_stats', 'get_alert_trends');
```

Expected results:
- Empty result sets (tables created but no data)
- 2 functions listed (snapshot_daily_stats, get_alert_trends)

### Step 6: Test Snapshot Function
```sql
-- Manually trigger daily snapshot
SELECT snapshot_daily_stats();

-- Verify snapshot created
SELECT * FROM brand_monitoring_history ORDER BY date DESC LIMIT 1;
```

You should see one row with today's date and current alert counts.

### Step 7: Test Trend Function
```sql
-- Get last 30 days of stats (will be mostly empty initially)
SELECT * FROM get_alert_trends(30);
```

Should return today's snapshot data.

## Usage Examples

### Add to Whitelist (via UI)
1. Go to Admin → Brand Protection
2. Click **Whitelist** button on an alert
3. Enter reason: "Not related to our platform"
4. Submit → alert disappears + added to whitelist table

### Verify Whitelist Entry
```sql
SELECT * FROM brand_monitoring_whitelist 
ORDER BY created_at DESC 
LIMIT 5;
```

### Add Note to Alert (via UI - Part 3)
Coming in Part 3/5 implementation.

### View Historical Trends (via UI - Part 4)
Coming in Part 4/5 implementation (Chart.js graph).

## Troubleshooting

### Error: "relation already exists"
- **Cause:** Tables already created from previous run
- **Solution:** Safe to ignore, or drop tables first:
```sql
DROP TABLE IF EXISTS brand_monitoring_history CASCADE;
DROP TABLE IF EXISTS brand_monitoring_notes CASCADE;
DROP TABLE IF EXISTS brand_monitoring_whitelist CASCADE;
ALTER TABLE brand_monitoring_alerts DROP COLUMN IF EXISTS priority CASCADE;
ALTER TABLE brand_monitoring_alerts DROP COLUMN IF EXISTS updated_at CASCADE;
```

### Error: "permission denied"
- **Cause:** Not logged in as admin user
- **Solution:** Sign in with admin account (huntersest@gmail.com)

### Error: "column does not exist"
- **Cause:** Missing column from previous migrations
- **Solution:** Re-run individual ALTER TABLE statements

### RLS Policy Not Working
- **Cause:** User role is not 'admin'
- **Solution:** Run this to check your role:
```sql
SELECT id, email, role FROM users WHERE email = 'huntersest@gmail.com';
```

Should show `role = 'admin'`. If not, run:
```sql
UPDATE users SET role = 'admin' WHERE email = 'huntersest@gmail.com';
```

## Next Steps After Migration

### 1. Test Whitelist in UI
- Scan for alerts
- Click "Whitelist" on false positive
- Enter reason
- Verify alert disappears
- Check whitelist table in Supabase

### 2. Deploy Edge Function Update (Part 2 completion)
Edge Function needs to check whitelist before inserting alerts:
```typescript
// In brand-monitoring/index.ts
const { data: whitelist } = await supabase
  .from('brand_monitoring_whitelist')
  .select('url, title');

const whitelistSet = new Set(
  whitelist?.map(w => `${w.url}||${w.title}`) || []
);

const filtered = newAlerts.filter(a => 
  !whitelistSet.has(`${a.url}||${a.title}`)
);
```

### 3. Continue with Part 3 (Notes System)
- Add MessageSquare icon button to alerts
- Create notes modal UI
- Display notes list under alerts
- Test adding/viewing notes

### 4. Continue with Part 4 (Trend Charts)
- Install Chart.js: `npm install react-chartjs-2 chart.js`
- Create TrendChart component
- Call `get_alert_trends(30)` for data
- Display line graph in Overview tab

### 5. Continue with Part 5 (Email + History)
- Configure RESEND_API_KEY in Supabase secrets
- Update Edge Function to send critical alert emails
- Add 8th tab "History" to UI
- Show resolved/deleted alerts

## Maintenance

### Daily Snapshot (Optional - requires pg_cron extension)
If your Supabase plan supports pg_cron:
```sql
-- Run daily at midnight UTC
SELECT cron.schedule(
  'daily-monitoring-snapshot',
  '0 0 * * *',
  $$SELECT snapshot_daily_stats();$$
);
```

### Weekly Summary Email (Part 5)
Will be triggered by pg_cron:
```sql
-- Run weekly on Monday at 9 AM UTC
SELECT cron.schedule(
  'weekly-monitoring-summary',
  '0 9 * * 1',
  $$SELECT supabase.http_post(...);$$ -- calls Edge Function
);
```

## Complete!

✅ Migration successful when:
- All 3 tables exist
- 2 columns added to alerts table
- 2 functions created
- 6 indexes created
- RLS policies active
- Test snapshot works

**Now ready for Part 3/5: Notes System** 🎉
