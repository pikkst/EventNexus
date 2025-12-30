# Autonomous Operations Testing Guide

## Deployment Steps

### Step 1: Deploy Main SQL ✅
You've already done this by running `create_autonomous_operations.sql` in Supabase SQL Editor.

### Step 2: Run Test Script
Now run this in Supabase SQL Editor to verify deployment:

```sql
-- Copy and paste: test_autonomous_deployment.sql
```

## Expected Test Results

### ✅ Successful Deployment Will Show:

1. **TEST 1**: ✅ PASS - All 3 tables exist
2. **TEST 2**: ✅ PASS - All 4 default rules exist
3. **TEST 3**: List of 4 rules (Critical ROI Pause, Low ROI Pause, High ROI Scale, Exceptional ROI Scale)
4. **TEST 4**: 9 functions listed as EXISTS
5. **TEST 5**: ✅ PASS - All functions deployed
6. **TEST 6**: Campaign columns (budget, daily_budget, status, metrics) exist
7. **TEST 7**: RLS policies enabled for all 3 tables
8. **TEST 8-10**: Function dry runs (may show 0 results if no campaigns - this is normal)
9. **TEST 11**: Full autonomous run completes successfully
10. **TEST 12-13**: Action and opportunity tracking works

### Final Message Should Be:
```
🎉 SUCCESS! Autonomous Operations is fully deployed and functional!
```

## Testing With Real Campaigns

### Option 1: Create Test Campaign
If you want to see autonomous operations in action, create a test campaign:

```sql
-- Insert test campaign with poor performance
INSERT INTO campaigns (
  id,
  user_id,
  title,
  copy,
  status,
  budget,
  created_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
  'Test Underperformer',
  'This campaign has low ROI for testing',
  'Active',
  200.00,
  NOW() - INTERVAL '48 hours'
);

-- Insert performance data showing poor ROI
INSERT INTO campaign_performance (
  campaign_id,
  total_spend,
  roi,
  ctr,
  total_clicks,
  total_conversions,
  conversion_rate
) VALUES (
  (SELECT id FROM campaigns WHERE title = 'Test Underperformer'),
  150.00,
  0.4,  -- Low ROI (below 1.0)
  0.8,
  100,
  2,
  0.5
);
```

### Option 2: Test Individual Functions

```sql
-- Test underperforming detection
SELECT * FROM identify_underperforming_campaigns(50.0, 1.0, 24);

-- Test scaling candidates
SELECT * FROM identify_scaling_candidates(3.0, 10, 3.0);

-- Test opportunity detection
SELECT * FROM detect_optimization_opportunities();
```

### Option 3: Run Full Autonomous Cycle

```sql
-- This will:
-- - Pause underperformers
-- - Scale high performers  
-- - Detect opportunities
-- - Schedule social media posts
SELECT run_autonomous_operations_with_posting();
```

## Viewing Results

### Check Actions Taken
```sql
SELECT 
  action_type,
  reason,
  confidence_score,
  status,
  created_at
FROM autonomous_actions
ORDER BY created_at DESC
LIMIT 20;
```

### Check Active Rules
```sql
SELECT 
  rule_name,
  rule_type,
  priority,
  is_active,
  condition,
  action
FROM autonomous_rules
WHERE is_active = true
ORDER BY priority DESC;
```

### Check Open Opportunities
```sql
SELECT 
  opportunity_type,
  severity,
  description,
  suggested_action,
  confidence_score,
  status
FROM optimization_opportunities
WHERE status = 'open'
ORDER BY severity DESC, confidence_score DESC;
```

## Admin Panel Testing

After SQL deployment is verified:

1. Go to EventNexus Admin Dashboard
2. Navigate to: **Nexus Core** → **Platform Management** → **Autonomous Ops**
3. Click **"Run Cycle"** button
4. Should see:
   - Stats update (paused, scaled, posted counts)
   - Alert with summary
   - Recent actions appear in "Actions" tab
   - Opportunities appear in "Opportunities" tab

## Troubleshooting

### No Actions Being Taken?
This is **normal** if:
- No campaigns exist in database
- All campaigns are performing well (ROI > 1.0)
- All campaigns are already paused
- Campaigns haven't run for 24+ hours yet

### Functions Not Found?
- Re-run `create_autonomous_operations.sql` in SQL Editor
- Check for SQL errors in the output panel
- Verify you're connected to correct Supabase project

### RLS Policy Errors?
- Make sure you're logged in as admin user
- Check: `SELECT role FROM users WHERE id = auth.uid();`
- Should return `'admin'`

## Success Criteria

✅ All tests pass in `test_autonomous_deployment.sql`
✅ Admin panel shows Autonomous Ops component
✅ "Run Cycle" button executes without errors
✅ Stats display correctly (even if showing 0s)
✅ No console errors in browser

## Next Steps

After successful deployment:

1. **Monitor Performance**: Check autonomous_actions table daily
2. **Adjust Rules**: Modify thresholds in autonomous_rules table if needed
3. **Review Opportunities**: Act on detected optimization opportunities
4. **Enable Automation**: Set up Edge Function cron job for automatic execution

---

**Need Help?** Check the Supabase Function Logs for detailed error messages.
