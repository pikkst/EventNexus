# Phase 4: Autonomous Campaign Operations - Setup Guide

## Overview
Phase 4 implements fully autonomous campaign management with AI-powered decision-making, automatic optimization, and self-healing capabilities.

## What's Included

### 🤖 Autonomous Actions
- **Auto-Pause**: Campaigns with ROI < 1.0 or critical underperformance (< 0.5x ROI)
- **Auto-Scale**: High performers (ROI > 3.0) get budget increases (1.5x-2.0x)
- **Budget Optimization**: Automatic budget adjustments based on performance
- **Rollback**: Every action can be reversed to restore previous state

### 📊 Intelligence Systems
- **Underperformance Detection**: Identifies campaigns wasting budget (low ROI, CTR)
- **Scaling Candidates**: Finds high-ROI campaigns ready for budget expansion
- **Optimization Opportunities**: Detects specific issues (creative fatigue, audience mismatch, etc.)
- **Confidence Scoring**: Every decision has 0-100% confidence score

### 🎯 Optimization Types
- `high_traffic_low_conversion`: High clicks but low conversion rate
- `declining_performance`: CTR dropped > 30% over 7 days (creative fatigue)
- `budget_inefficiency`: High spend with ROI < 1.0 (pause recommended)
- `audience_mismatch`: Wrong targeting parameters
- `creative_fatigue`: Ads need refresh
- `timing_optimization`: Wrong posting times

## Prerequisites
- ✅ Phase 1 (Foundation) deployed
- ✅ Phase 2 (Smart Scheduling) deployed
- ✅ Phase 3 (AI Learning) deployed
- ✅ Supabase project access (anlivujgkjmajkcgbaxw)
- ✅ GitHub Actions enabled with SUPABASE_ANON_KEY secret

## 1. Execute SQL Schema (REQUIRED)

### Open Supabase SQL Editor
1. Navigate to: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/sql
2. Click "New Query"

### Copy SQL Content
3. Open `/workspaces/EventNexus/sql/create_autonomous_operations.sql`
4. Copy ENTIRE file contents (600+ lines)

### Execute in Supabase
5. Paste into SQL Editor
6. Click "Run" button (or Ctrl/Cmd + Enter)
7. Verify success: "Success. No rows returned"

### Verify Tables & Functions Created
Run verification query:
```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('autonomous_actions', 'autonomous_rules', 'optimization_opportunities');

-- Check functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'identify_underperforming_campaigns',
  'identify_scaling_candidates', 
  'detect_optimization_opportunities',
  'auto_pause_campaign',
  'auto_scale_campaign',
  'run_autonomous_operations'
);
```
Should return 3 tables and 6 functions.

### Verify Default Rules Inserted
```sql
SELECT rule_name, rule_type, is_active, priority 
FROM autonomous_rules 
ORDER BY priority DESC;
```
Should return 4 rules:
- Critical ROI Pause (priority 100)
- Exceptional ROI Aggressive Scale (priority 85)
- High ROI Scale (priority 80)
- Low ROI Pause (priority 90)

## 2. Verify Edge Function Deployment

### Check Deployment Status
Edge Function deployed: ✅ `autonomous-operations` (126.4kB)

Dashboard: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/functions

### Test Manual Invocation
```bash
curl -X POST \
  https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/autonomous-operations \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "result": {
    "success": true,
    "timestamp": "2025-12-22T...",
    "actions_taken": {
      "campaigns_paused": 0,
      "campaigns_scaled": 0,
      "opportunities_detected": 0
    }
  },
  "message": "Autonomous operations completed successfully"
}
```

## 3. Verify GitHub Actions Automation

### Check Workflow File
File: `.github/workflows/autonomous-operations.yml`
- Schedule: `0 * * * *` (every hour at minute 0)
- Manual trigger: `workflow_dispatch` enabled

### Verify Cron is Active
1. Go to: https://github.com/pikkst/EventNexus/actions
2. Check for "Autonomous Campaign Operations" workflow
3. Should show scheduled runs every hour

### Manual Trigger Test
1. Navigate to Actions tab
2. Select "Autonomous Campaign Operations"
3. Click "Run workflow" → "Run workflow" button
4. Wait ~30 seconds
5. Check run logs for success message

## 4. Test Autonomous Features

### A. Create Test Scenario: Underperforming Campaign
1. Create campaign with high budget ($200)
2. Set very poor targeting (e.g., wrong demographics)
3. Let run for 24+ hours with low ROI (< 0.8x)
4. System should auto-pause with reason logged

**Verify:**
```sql
-- Check if campaign was auto-paused
SELECT 
  c.title, c.status, 
  cp.roi, cp.total_spend,
  aa.action_type, aa.reason, aa.confidence_score
FROM campaigns c
JOIN campaign_performance cp ON c.id = cp.campaign_id
LEFT JOIN autonomous_actions aa ON c.id = aa.campaign_id
WHERE aa.action_type = 'auto_pause'
ORDER BY aa.created_at DESC
LIMIT 5;
```

### B. Create Test Scenario: High Performer
1. Create campaign with moderate budget ($100)
2. Set excellent targeting (proven audience)
3. Let accumulate 15+ conversions with ROI > 3.5x
4. System should auto-scale budget to $150-200

**Verify:**
```sql
-- Check if campaign was auto-scaled
SELECT 
  c.title, c.budget,
  cp.roi, cp.conversions,
  aa.action_type, aa.previous_state->>'budget' as old_budget,
  aa.new_state->>'budget' as new_budget,
  aa.confidence_score
FROM campaigns c
JOIN campaign_performance cp ON c.id = cp.campaign_id
LEFT JOIN autonomous_actions aa ON c.id = aa.campaign_id
WHERE aa.action_type = 'auto_scale_up'
ORDER BY aa.created_at DESC
LIMIT 5;
```

### C. View Optimization Opportunities
1. Navigate to AdminCommandCenter → Autonomous Ops tab
2. Click "Opportunities" sub-tab
3. Should see detected issues with:
   - Severity badges (Critical/High/Medium/Low)
   - Description of problem
   - Suggested action (blue box)
   - Confidence score percentage

**Example opportunity:**
```
🟡 HIGH TRAFFIC LOW CONVERSION
Campaign "Summer Festival Promo" has 234 clicks but only 1.5% conversion rate

💡 Review targeting parameters and landing page experience. 
   Consider A/B testing different audiences or CTAs.

Confidence: 85%
```

### D. Test Rollback Capability
1. Go to "Actions" sub-tab
2. Find an executed action (green "executed" badge)
3. Click "Rollback" button
4. Confirm restoration
5. Check campaign status reverted to previous state

## 5. Dashboard Navigation

### Autonomous Ops Tab Structure

**Overview Tab:**
- Stats cards: Total Actions, Paused, Scaled, Opportunities, Avg Confidence
- Underperforming campaigns list (red cards with recommendations)
- Scaling candidates list (green cards with suggested budgets)

**Actions Tab:**
- Recent autonomous actions chronological list
- Action type icons (pause/scale/optimize)
- Status badges (pending/executed/rolled_back/failed)
- Confidence scores
- Rollback buttons

**Opportunities Tab:**
- Optimization opportunities grid
- Severity badges color-coded
- Suggested actions in blue boxes
- Action buttons: Start, Resolve, Dismiss

**Rules Tab:**
- Autonomous rules configuration
- Toggle active/inactive status
- Priority sorting
- Rule conditions and actions display

## 6. Configuration & Tuning

### Adjust Auto-Pause Thresholds
```sql
-- Make auto-pause more aggressive (pause at ROI < 1.5)
UPDATE autonomous_rules 
SET condition = '{"metric": "roi", "operator": "<", "threshold": 1.5, "min_spend": 100}'::JSONB
WHERE rule_name = 'Low ROI Pause';

-- Make auto-pause more conservative (only critical cases)
UPDATE autonomous_rules 
SET is_active = false
WHERE rule_name = 'Low ROI Pause';
```

### Adjust Auto-Scale Thresholds
```sql
-- Lower scaling threshold (scale at ROI 2.5+)
UPDATE autonomous_rules 
SET condition = '{"metric": "roi", "operator": ">=", "threshold": 2.5, "min_conversions": 5}'::JSONB
WHERE rule_name = 'High ROI Scale';

-- Increase max budget cap
UPDATE autonomous_rules 
SET action = '{"type": "auto_scale_up", "multiplier": 1.5, "max_budget": 20000}'::JSONB
WHERE rule_name = 'High ROI Scale';
```

### Disable Autonomous Mode Temporarily
```sql
-- Disable all autonomous actions (monitoring only)
UPDATE autonomous_rules SET is_active = false;

-- Re-enable later
UPDATE autonomous_rules SET is_active = true;
```

## 7. Troubleshooting

### No Actions Being Taken
**Causes:**
- No campaigns meet thresholds (all performing normally)
- Rules are disabled (`is_active = false`)
- Campaigns haven't run long enough (need 24+ hours for pause logic)

**Debug:**
```sql
-- Check campaign performance
SELECT c.title, cp.roi, cp.ctr, cp.total_spend, 
       EXTRACT(EPOCH FROM (NOW() - c.created_at))/3600 as hours_running
FROM campaigns c
JOIN campaign_performance cp ON c.id = cp.campaign_id
WHERE c.status = 'active';

-- Check active rules
SELECT * FROM autonomous_rules WHERE is_active = true;

-- Manually trigger analysis
SELECT * FROM identify_underperforming_campaigns(50.0, 1.0, 24);
SELECT * FROM identify_scaling_candidates(3.0, 10, 3.0);
```

### Actions Failed
```sql
-- Check failed actions
SELECT * FROM autonomous_actions WHERE status = 'failed' ORDER BY created_at DESC;

-- Review error details
SELECT 
  campaign_id, action_type, reason,
  previous_state, new_state,
  created_at
FROM autonomous_actions 
WHERE status = 'failed';
```

### Edge Function Not Running
1. Check GitHub Actions logs: https://github.com/pikkst/EventNexus/actions
2. Verify secret exists: Settings → Secrets → SUPABASE_ANON_KEY
3. Test manual invocation with curl command above
4. Check Supabase function logs: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/functions/autonomous-operations/logs

### Rollback Not Working
```sql
-- Check action status
SELECT * FROM autonomous_actions WHERE id = 'action-uuid';

-- Manual rollback (restore campaign status)
UPDATE campaigns 
SET status = 'active', budget = 150.00 
WHERE id = 'campaign-uuid';

-- Mark action as rolled back
UPDATE autonomous_actions 
SET status = 'rolled_back' 
WHERE id = 'action-uuid';
```

## 8. Best Practices

### Monitoring
- Check Autonomous Ops dashboard daily
- Review actions log weekly for patterns
- Monitor avg_confidence score (target > 80%)
- Address open opportunities within 48 hours

### Tuning
- Start conservative (high thresholds, low confidence)
- Gradually adjust based on outcomes
- Track actual_impact vs expected_impact
- Disable underperforming rules

### Safety
- Always keep rollback capability enabled
- Set reasonable max_budget caps per rule
- Test new rules with `is_active = false` first
- Monitor first 7 days of any rule change closely

### Scaling
- For high-volume accounts (50+ campaigns), consider:
  - Running Edge Function every 30 minutes (`*/30 * * * *`)
  - Increasing confidence thresholds (85%+)
  - Setting per-campaign autonomous_enabled flag

## 9. Integration with Other Phases

### With Phase 3 (AI Learning)
- Autonomous actions → Learning insights
- Patterns inform rule adjustments
- A/B test results → confidence scoring

### With Phase 2 (Smart Scheduling)
- Timing optimization opportunities → Schedule adjustments
- Pause during low-engagement hours
- Scale during peak performance windows

### With Phase 1 (Foundation)
- All decisions based on analytics data
- Performance metrics drive thresholds
- ROI/CTR/conversion tracking essential

## 10. What's Next: Phase 5 (Advanced Analytics)

Phase 5 will add:
- Multi-touch attribution (first/last/linear models)
- Conversion funnel visualization (impression → purchase)
- Predictive ROI forecasting (ML-based)
- Cohort analysis (user lifetime value)
- Advanced reporting dashboards

## Success Criteria
- ✅ SQL schema executed (3 tables, 6 functions)
- ✅ Edge Function deployed and tested
- ✅ GitHub Actions cron active (hourly runs)
- ✅ Autonomous Ops tab visible in AdminCommandCenter
- ✅ Auto-pause working for underperformers
- ✅ Auto-scale working for high performers
- ✅ Opportunities detected correctly
- ✅ Rollback functionality tested
- ✅ Confidence scores display (0-100%)

## Support
For issues, contact: huntersest@gmail.com
Production URL: https://www.eventnexus.eu
Supabase Dashboard: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw
GitHub Actions: https://github.com/pikkst/EventNexus/actions
