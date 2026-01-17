# 🚀 Campaign Performance Sync - Quick Deploy

## Problem Solved
Autonomous operations were finding 0 campaigns because `campaign_performance` table was empty. Now campaign metrics automatically sync from `campaigns.metrics` (JSONB) to `campaign_performance` table.

## 📦 What's New

### 1. **SQL Sync System** (`sql/sync_campaign_performance.sql`)
- Creates `campaign_performance` table
- `sync_campaign_to_performance(campaign_id)` - Sync single campaign
- `sync_all_campaigns_to_performance()` - Sync all active campaigns
- **Auto-trigger** - Syncs whenever `campaigns.metrics` updates

### 2. **Updated Edge Function** (`intelligent-autonomous-marketing`)
- Automatically syncs campaigns before running autonomous ops
- Syncs new campaigns immediately after creation
- Syncs after pausing campaigns

### 3. **Updated Monitor Component**
- Uses Supabase client directly (no API routes needed)
- Auto-syncs before running operations

## 🚀 Deployment Steps

### Step 1: Deploy SQL to Supabase
```bash
# Go to Supabase SQL Editor
# Copy entire content of: sql/sync_campaign_performance.sql
# Run the script
```

**This will:**
- ✅ Create `campaign_performance` table
- ✅ Create sync functions
- ✅ Add auto-sync trigger
- ✅ Sync all existing campaigns immediately

### Step 2: Deploy Edge Function
```bash
cd /workspaces/EventNexus

# Deploy updated intelligent-autonomous-marketing
supabase functions deploy intelligent-autonomous-marketing

# Or deploy all functions
supabase functions deploy
```

### Step 3: Test It Works
```sql
-- Check synced performance data
SELECT 
  c.title,
  c.status,
  cp.total_impressions,
  cp.total_clicks,
  cp.ctr,
  cp.roi
FROM campaign_performance cp
JOIN campaigns c ON c.id = cp.campaign_id
WHERE c.status = 'Active'
ORDER BY cp.roi DESC;

-- Manually sync all campaigns
SELECT * FROM sync_all_campaigns_to_performance();

-- Test autonomous operations
SELECT * FROM run_autonomous_operations_with_posting();

-- Check logs
SELECT * FROM autonomous_logs ORDER BY timestamp DESC LIMIT 20;
```

## 📊 How It Works

### Data Flow:
```
Campaign Created
    ↓
campaign.metrics JSONB = {views: 100, clicks: 5}
    ↓ (auto-trigger)
sync_campaign_to_performance()
    ↓
campaign_performance table
    - total_impressions: 100
    - total_clicks: 5
    - ctr: 5.0%
    - roi: calculated
    ↓
Autonomous Operations Can Decide:
    - Auto-Pause if ROI < 1.0x
    - Auto-Scale if ROI ≥ 3.0x
    - Auto-Post if CTR > 2%
```

### Metrics Mapping:
```javascript
campaigns.metrics (JSONB) → campaign_performance (TABLE)
{
  "views": 1000        → total_impressions: 1000
  "clicks": 50         → total_clicks: 50
  "guestSignups": 10   → total_conversions: 10+proConversions
  "revenueValue": 500  → revenue: 500.00
}

Calculated:
- total_spend: campaign.budget OR estimated (views * €0.10)
- roi: revenue / spend
- ctr: (clicks / views) * 100
- conversion_rate: (conversions / clicks) * 100
```

## 🎯 Testing with Real Data

### Create Test Campaign:
```sql
-- Insert test campaign with metrics
INSERT INTO campaigns (
  id,
  title,
  copy,
  status,
  metrics,
  budget,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Test High-Performing Campaign',
  'Amazing event promotion',
  'Active',
  '{"views": 1000, "clicks": 60, "guestSignups": 15, "revenueValue": 450}'::JSONB,
  100.00,
  NOW() - INTERVAL '3 days',
  NOW()
);

-- Check it synced
SELECT c.title, cp.* 
FROM campaign_performance cp
JOIN campaigns c ON c.id = cp.campaign_id
WHERE c.title LIKE '%Test%';

-- Expected result:
-- roi: 4.5 (450/100) ✅ Will trigger AUTO-SCALE (≥ 3.0x)
-- ctr: 6.0% (60/1000) ✅ Will trigger AUTO-POST (> 2%)
```

### Create Poor Performer:
```sql
INSERT INTO campaigns (
  id,
  title,
  copy,
  status,
  metrics,
  budget,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Test Poor Campaign',
  'Low engagement test',
  'Active',
  '{"views": 1000, "clicks": 5, "guestSignups": 0, "revenueValue": 10}'::JSONB,
  150.00,
  NOW() - INTERVAL '2 days',
  NOW()
);

-- Check synced data
SELECT c.title, cp.roi, cp.ctr, cp.total_spend
FROM campaign_performance cp
JOIN campaigns c ON c.id = cp.campaign_id
WHERE c.title LIKE '%Poor%';

-- Expected result:
-- roi: 0.067 (10/150) ✅ Will trigger AUTO-PAUSE (< 1.0x)
-- ctr: 0.5% (5/1000) ✅ Low engagement
```

### Run Autonomous Operations:
```sql
-- This will now find campaigns and take actions!
SELECT * FROM run_autonomous_operations_with_posting();

-- Check what happened
SELECT 
  aa.action_type,
  c.title,
  aa.reason,
  aa.confidence_score,
  aa.expected_impact
FROM autonomous_actions aa
JOIN campaigns c ON c.id = aa.campaign_id
ORDER BY aa.created_at DESC
LIMIT 10;
```

## 📱 Frontend Testing

### Admin Dashboard → Autonomous Operations → Monitor Tab:

1. **Click "Run Now"** button
   - Will sync campaigns first
   - Then run autonomous operations
   - Terminal shows real-time logs

2. **Expected Terminal Output:**
```
19:55:30 🤖 Starting autonomous operations cycle
19:55:30 🔄 Syncing campaign performance...
19:55:31 ✅ Synced 2 campaigns
19:55:31 🔍 Analyzing campaigns...
19:55:31 ⚡ AUTO-SCALE: Test High-Performing Campaign (ROI: 4.5x)
19:55:32 ⏸️ AUTO-PAUSE: Test Poor Campaign (ROI: 0.07x)
19:55:32 📱 AUTO-POST: Test High-Performing Campaign (CTR: 6.0%)
19:55:33 ✅ Operations complete - 3 actions taken
```

## 🔧 Troubleshooting

### No campaigns synced?
```sql
-- Check active campaigns
SELECT id, title, status, metrics FROM campaigns WHERE status = 'Active';

-- Manually trigger sync
SELECT * FROM sync_all_campaigns_to_performance();
```

### Performance table empty?
```sql
-- Check trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'sync_campaign_performance_trigger';

-- Test trigger manually
UPDATE campaigns 
SET metrics = '{"views": 100, "clicks": 10}'::JSONB
WHERE id = '<your-campaign-id>';

-- Verify sync
SELECT * FROM campaign_performance WHERE campaign_id = '<your-campaign-id>';
```

### Autonomous ops still finding 0?
```sql
-- Check performance thresholds
SELECT 
  c.title,
  cp.roi,
  cp.total_spend,
  CASE 
    WHEN cp.roi < 1.0 AND cp.total_spend > 50 THEN '✅ Will PAUSE'
    WHEN cp.roi >= 3.0 AND cp.total_conversions >= 10 THEN '✅ Will SCALE'
    ELSE '⏭️ No action'
  END as autonomous_action
FROM campaign_performance cp
JOIN campaigns c ON c.id = cp.campaign_id
WHERE c.status = 'Active';
```

## 📊 Monitoring

### Check Sync Status:
```sql
-- Last sync times
SELECT 
  c.title,
  cp.last_updated,
  AGE(NOW(), cp.last_updated) as time_since_sync
FROM campaign_performance cp
JOIN campaigns c ON c.id = cp.campaign_id
ORDER BY cp.last_updated DESC;
```

### Check Autonomous Activity:
```sql
-- Recent autonomous actions
SELECT 
  action_type,
  COUNT(*) as count,
  AVG(confidence_score) as avg_confidence
FROM autonomous_actions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY action_type;
```

### Check AI Logs:
```sql
-- What is AI checking?
SELECT 
  timestamp,
  action_type,
  message,
  status
FROM autonomous_logs
ORDER BY timestamp DESC
LIMIT 50;
```

## ✅ Success Criteria

After deployment, you should see:

1. ✅ `campaign_performance` table populated
2. ✅ ROI, CTR, conversion_rate calculated
3. ✅ Autonomous operations finding campaigns
4. ✅ Monitor terminal showing activity
5. ✅ Actions logged in `autonomous_logs`

## 🎯 Performance Targets

AI will take actions when:

### Auto-Pause:
- ROI < 1.0x **AND** spend > €50
- **OR** ROI < 0.5x (critical)

### Auto-Scale:
- ROI ≥ 3.0x **AND** 10+ conversions
- **OR** ROI ≥ 4.0x **AND** 20+ conversions (aggressive)

### Auto-Post:
- CTR > 2% **AND** views > 0
- **AND** not posted in last 24h

## 🚨 Production Ready

- ✅ Auto-sync trigger for real-time updates
- ✅ Upsert logic (no duplicates)
- ✅ Null-safe calculations
- ✅ RLS policies (admin + organizer access)
- ✅ Performance indexes
- ✅ Error handling in Edge Function

---

**Status:** ✅ Ready for deployment
**Impact:** Autonomous operations will now work with actual campaign data!
