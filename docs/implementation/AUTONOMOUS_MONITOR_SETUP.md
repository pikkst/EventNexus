# Autonomous Operations Monitor - Setup Guide

## 🎯 What Was Added

Real-time AI monitoring system for autonomous campaign operations with terminal-style log viewer.

## 📁 Files Created/Modified

### New Files:
1. **`components/AutonomousMonitor.tsx`** - Terminal-style monitoring component
2. **`sql/create_autonomous_operations.sql`** - Added autonomous_logs table and logging functions

### Modified Files:
1. **`components/AutonomousOperations.tsx`** - Added "Monitor" tab with real-time terminal

## 🗄️ Database Changes

### New Table: `autonomous_logs`
```sql
CREATE TABLE autonomous_logs (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  action_type TEXT NOT NULL,
  campaign_id UUID REFERENCES campaigns(id),
  campaign_title TEXT,
  message TEXT NOT NULL,
  details JSONB,
  status TEXT CHECK (status IN ('checking', 'action_taken', 'no_action', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### New Function: `log_autonomous_action()`
Logs all AI decisions and actions for real-time monitoring.

### Enhanced Function: `run_autonomous_operations_with_posting()`
Now logs every step:
- Operation start
- Campaigns analyzed
- Actions taken (pause/scale/post)
- Operation complete

## 🚀 Deployment Steps

### 1. Deploy SQL to Supabase
```bash
# Copy the entire content of sql/create_autonomous_operations.sql
# Paste into Supabase SQL Editor
# Run the script
```

### 2. Test the Function
```sql
-- Run autonomous operations
SELECT * FROM run_autonomous_operations_with_posting();

-- Check logs
SELECT * FROM autonomous_logs ORDER BY timestamp DESC LIMIT 20;
```

### 3. Build & Deploy Frontend
```bash
cd /workspaces/EventNexus
npm run build
# Deploy to production
```

## 🖥️ How to Use

### Admin Dashboard Access:
1. Navigate to **Admin Dashboard**
2. Click **Autonomous Operations**
3. Click **MONITOR** tab (default)

### Monitor Interface Features:
- **🖥️ Terminal-style log viewer** - See real-time AI decisions
- **📊 Live stats cards** - Total checks, campaigns analyzed, actions taken
- **▶️ Run Now button** - Manually trigger autonomous operations
- **🔄 Auto-refresh** - Logs update every 10 seconds

### Log Entry Types:
- 🔵 **checking** - AI analyzing campaigns
- ⚡ **action_taken** - Action executed (pause/scale/post)
- ⚪ **no_action** - No action needed
- 🔴 **error** - Error occurred

### Example Log Output:
```
19:48:49 🤖 Starting autonomous operations cycle
19:48:50 🔍 Analyzed 0 active campaigns
19:48:50 ℹ️ Autonomous operations completed - 0 actions taken
```

## 🐛 Why 0 Actions?

The system found **0 active campaigns** meeting criteria:

### For Auto-Pause:
- Need: ROI < 1.0x AND spend > $50
- Need: `campaign_performance` table with metrics

### For Auto-Scale:
- Need: ROI ≥ 3.0x AND 10+ conversions
- Need: `campaign_performance` table with metrics

### For Auto-Post:
- Need: CTR > 2% AND views > 0
- Need: Campaign `metrics` JSONB with clicks/views

## 📝 Next Steps to See AI in Action

### Option 1: Create Test Campaign with Metrics
```sql
-- Insert test campaign
INSERT INTO campaigns (id, title, copy, status, metrics, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Test High-Performing Campaign',
  'This is a test campaign',
  'Active',
  '{"views": 1000, "clicks": 50, "conversions": 15}'::JSONB,
  NOW(),
  NOW()
);

-- Add performance data
INSERT INTO campaign_performance (campaign_id, total_spend, roi, ctr, total_conversions)
SELECT id, 100.0, 4.5, 5.0, 15
FROM campaigns WHERE title = 'Test High-Performing Campaign';
```

### Option 2: Connect Real Social Accounts
1. Go to **Social Media Settings**
2. Connect Instagram/Facebook
3. AI will auto-post high-performing campaigns

### Option 3: Run with Lower Thresholds
Modify `autonomous_rules` table:
```sql
UPDATE autonomous_rules
SET condition = '{"metric": "roi", "operator": "<", "threshold": 10.0}'::JSONB
WHERE rule_name = 'Low ROI Pause';
```

## 🔍 Debugging

### Check Active Campaigns:
```sql
SELECT id, title, status, metrics FROM campaigns WHERE status = 'Active';
```

### Check Performance Data:
```sql
SELECT * FROM campaign_performance;
```

### Check Autonomous Logs:
```sql
SELECT 
  timestamp,
  action_type,
  campaign_title,
  message,
  status
FROM autonomous_logs
ORDER BY timestamp DESC
LIMIT 50;
```

### Check Last Autonomous Run:
```sql
SELECT * FROM autonomous_actions
ORDER BY created_at DESC
LIMIT 10;
```

## 🎨 UI Features

### Terminal Theme:
- Dark background (#111827 - gray-900)
- Monospace font
- Color-coded status:
  - Green: Success/action taken
  - Blue: Checking/analyzing
  - Yellow: Warning
  - Red: Error
  - Gray: Info/no action

### Real-time Updates:
- Auto-refresh every 10 seconds
- Live operation status
- Expandable details (JSON view)

## 📊 Stats Tracked

1. **Total Checks** - How many times AI ran
2. **Campaigns Analyzed** - Number of campaigns evaluated
3. **Actions Taken** - Total autonomous actions
4. **Opportunities Found** - Optimization suggestions

## 🔐 Security

- ✅ RLS policies: Admin-only access to `autonomous_logs`
- ✅ No sensitive data exposed in logs
- ✅ Campaign details expandable only

## 🚨 Production Ready

- ✅ Error handling in place
- ✅ Graceful degradation (shows "No logs" if empty)
- ✅ Performance optimized (indexed queries)
- ✅ Type-safe (TypeScript interfaces)

## 📱 Responsive Design

- Desktop: Full terminal width
- Tablet: Stacked stats, scrollable terminal
- Mobile: Compact view, touch-friendly

## 🎯 Success Criteria

After deployment, you should see:
1. ✅ Monitor tab in Admin Dashboard
2. ✅ Terminal-style interface with logs
3. ✅ Real-time updates when AI runs
4. ✅ Detailed action history
5. ✅ Stats cards updating

## 🔧 Configuration

To adjust AI behavior, modify `autonomous_rules`:
```sql
SELECT * FROM autonomous_rules;

-- Disable a rule
UPDATE autonomous_rules SET is_active = false WHERE rule_name = 'Low ROI Pause';

-- Adjust thresholds
UPDATE autonomous_rules 
SET condition = '{"metric": "roi", "operator": "<", "threshold": 0.8}'::JSONB
WHERE rule_name = 'Critical ROI Pause';
```

---

**Status:** ✅ Ready for deployment
**Next Action:** Deploy SQL to Supabase and test in production
