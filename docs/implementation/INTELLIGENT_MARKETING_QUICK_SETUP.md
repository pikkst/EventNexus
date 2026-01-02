# Quick Setup: Intelligent Autonomous Marketing

## Prerequisites
- ✅ Supabase project set up
- ✅ Gemini AI API key configured
- ✅ Autonomous Operations SQL deployed
- ✅ Admin user account

## Step-by-Step Setup (10 minutes)

### 1. Deploy SQL Functions (2 minutes)

**IMPORTANT:** First, make sure you've run the base autonomous operations SQL:
```bash
File: /workspaces/EventNexus/sql/create_autonomous_operations.sql
```

Then, open Supabase SQL Editor and run:
```bash
File: /workspaces/EventNexus/sql/intelligent_autonomous_marketing.sql
```

**Expected output:**
```
✓ Table marketing_intelligence_log created
✓ Function capture_platform_intelligence created
✓ Function get_strategic_recommendation created
✓ Function auto_create_strategic_campaign created
✓ Function run_intelligent_autonomous_operations created
✓ RLS policies enabled
```

### 2. Test SQL Functions (1 minute)

Run in SQL Editor:

```sql
-- Test 1: Gather intelligence
SELECT capture_platform_intelligence();

-- Test 2: Get recommendation
SELECT * FROM get_strategic_recommendation();

-- Test 3: View intelligence log
SELECT * FROM marketing_intelligence_log ORDER BY captured_at DESC LIMIT 5;
```

**Expected:** JSON output with platform metrics and strategy recommendation

### 3. Deploy Edge Function (3 minutes)

```bash
cd /workspaces/EventNexus

# Deploy the function
supabase functions deploy intelligent-autonomous-marketing

# Test it
supabase functions invoke intelligent-autonomous-marketing
```

**Expected:**
```json
{
  "success": true,
  "strategy": {
    "type": "acquisition",
    "target": "platform-growth",
    "confidence": 85
  },
  "actions": {
    "campaign_created": true
  }
}
```

### 4. Set Up Cron Job (Optional - 2 minutes)

**Supabase Dashboard:**
1. Go to **Edge Functions** → **Cron Jobs**
2. Click **"Add Cron Job"**
3. Fill in:
   - **Name:** Intelligent Marketing
   - **Schedule:** `0 9 * * *` (daily at 9 AM)
   - **Function:** `intelligent-autonomous-marketing`
4. Save

### 5. Test from Admin Dashboard (2 minutes)

**Browser:**
1. Go to Admin Dashboard
2. Navigate to **Nexus Core** → **Autonomous Ops**
3. Click **"Run Cycle"** button
4. Check console for logs
5. Go to **Campaign Engine** tab
6. See new auto-generated campaign

## Verification Checklist

- [ ] SQL functions execute without errors
- [ ] `marketing_intelligence_log` table has entries
- [ ] Edge function deploys successfully
- [ ] Test invoke returns success
- [ ] Cron job is scheduled (if using automation)
- [ ] Admin dashboard shows new campaigns
- [ ] Campaigns have `ai_metadata` field populated

## Expected Behavior

### First Run:
- Gathers platform data (events, users, tickets)
- Determines strategy (likely "acquisition" for new platforms)
- Creates campaign with AI-generated content
- Schedules social media posts
- Logs action to `autonomous_actions`

### Subsequent Runs:
- Monitors existing campaigns
- Pauses underperformers (CTR < 0.5%, views > 500)
- Detects high performers (CTR > 5%)
- Creates new campaigns only if:
  - No campaigns in last 24 hours
  - Confidence score > 70%
  - Platform has > 5 events

## Troubleshooting

### "Function not found" error
```sql
-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%intelligent%';
```
**Fix:** Re-run `intelligent_autonomous_marketing.sql`

### "No campaigns created"
**Check:**
1. Platform has > 5 events?
2. No recent auto-generated campaigns?
3. Confidence score > 70%?

**View logs:**
```sql
SELECT * FROM marketing_intelligence_log ORDER BY captured_at DESC LIMIT 1;
```

### Edge Function errors
**View logs:**
```bash
supabase functions logs intelligent-autonomous-marketing
```

## Manual Testing Commands

### Test Intelligence Gathering:
```sql
SELECT jsonb_pretty(capture_platform_intelligence());
```

### Test Strategy Logic:
```sql
SELECT 
  strategy_type,
  target_audience,
  rationale,
  confidence_score
FROM get_strategic_recommendation();
```

### Test Campaign Creation:
```sql
SELECT auto_create_strategic_campaign(
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
);
```

### View Recent Actions:
```sql
SELECT 
  action_type,
  reason,
  confidence_score,
  created_at
FROM autonomous_actions
WHERE action_type = 'creative_refreshed'
ORDER BY created_at DESC
LIMIT 10;
```

## Success Metrics

After 24 hours of running:

- [ ] 1+ intelligence logs captured
- [ ] 1+ campaigns auto-generated
- [ ] Campaign has realistic copy (no fake stats)
- [ ] Campaign targets correct audience
- [ ] Social posts scheduled
- [ ] Autonomous actions logged

## Next Steps

1. **Monitor Performance:**
   - Check `marketing_intelligence_log` daily
   - Review campaign metrics weekly

2. **Adjust Thresholds:**
   - Modify strategy logic in SQL if needed
   - Adjust confidence requirements

3. **Expand Targeting:**
   - Add more category-specific themes
   - Create seasonal campaigns

4. **Integrate Analytics:**
   - Connect to GA4 for attribution
   - Track signup source

## Support

**Issues?** Check:
1. Supabase Function Logs
2. Browser Console (Admin Dashboard)
3. `marketing_intelligence_log` table
4. `autonomous_actions` table

**Need Help?** Contact: huntersest@gmail.com

---

**Estimated Setup Time:** 10 minutes
**First Campaign Generated:** Within 5 minutes of first run
**Fully Automated:** Set cron and forget! 🚀
