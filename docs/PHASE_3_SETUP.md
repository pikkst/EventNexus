# Phase 3: AI Learning System - Setup Instructions

## Overview
Phase 3 implements AI-powered campaign learning with Gemini gemini-3-pro-preview for pattern recognition, A/B test generation, and optimization insights.

## Prerequisites
- ✅ Phase 1 (Foundation) deployed
- ✅ Phase 2 (Smart Scheduling) deployed
- ✅ GEMINI_API_KEY configured in `.env.local`
- ✅ Supabase project access (anlivujgkjmajkcgbaxw)

## 1. Execute SQL Schema (REQUIRED)

### Open Supabase SQL Editor
1. Navigate to: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/sql
2. Click "New Query"

### Copy SQL Content
3. Open `/workspaces/EventNexus/sql/create_ai_learning.sql`
4. Copy ENTIRE file contents (280+ lines)

### Execute in Supabase
5. Paste into SQL Editor
6. Click "Run" button (or Ctrl/Cmd + Enter)
7. Verify success message: "Success. No rows returned"

### Verify Tables Created
Run this query to confirm:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('campaign_patterns', 'campaign_ab_test_results', 'campaign_learning_insights');
```
Should return 3 rows.

## 2. Verify Gemini API Key

### Check Environment Variable
```bash
grep GEMINI_API_KEY /workspaces/EventNexus/.env.local
```
Should output: `GEMINI_API_KEY=your_api_key_here`

### Test Gemini Connection
In AdminCommandCenter > AI Learning tab:
1. Click "Run Analysis" button
2. Should see "Running analysis on recent campaigns..." toast
3. Wait for Gemini response (5-10 seconds)
4. Check for insights appearing in grid

## 3. Test AI Learning Features

### A. Pattern Discovery
1. Generate 5+ campaigns with varying performance (high/low CTR, ROI)
2. Let campaigns run for 24 hours to accumulate analytics
3. Navigate to AdminCommandCenter > AI Learning tab
4. Click "Discover Patterns" button
5. Gemini analyzes top campaigns and identifies commonalities
6. Check Pattern Library sections (Headlines, Images, CTAs, Audiences)
7. Verify confidence scores (0-100%) displayed

### B. Performance Analysis
1. Click "Run Analysis" button in Quick Actions
2. System loops through recent 10 campaigns
3. For each campaign, Gemini generates:
   - Strengths: What's working well
   - Weaknesses: What needs improvement
   - Recommendations: Specific action items
4. Insights appear in Learning Insights grid with severity badges:
   - 🔴 Critical: Requires immediate attention
   - 🟡 Warning: Important optimization opportunity
   - 💡 Info: General insight
   - ✅ Success: Positive pattern detected

### C. A/B Test Generation
1. Select a campaign with moderate performance (CTR 3-5%, ROI 1.5-2.5)
2. System calls `generateABTestIdeas(campaignId)`
3. Gemini suggests 5 A/B test variants:
   - Headline variations
   - Image alternatives
   - CTA button text changes
   - Audience targeting refinements
4. Each variant includes hypothesis and expected impact

## 4. SQL Functions Reference

### Pattern Analysis
```sql
-- Analyze top-performing campaigns and extract patterns
SELECT * FROM analyze_campaign_patterns();

-- Get patterns with high confidence (>70%)
SELECT * FROM campaign_patterns WHERE confidence_score > 70 ORDER BY avg_roi DESC;
```

### A/B Testing
```sql
-- Generate A/B test variants for campaign
SELECT * FROM generate_ab_test_variants('campaign-uuid', 'headline');

-- View A/B test results
SELECT * FROM campaign_ab_test_results WHERE confidence_level >= 0.95;
```

### Learning Insights
```sql
-- Get high-confidence insights
SELECT * FROM get_learning_insights(70, 20);

-- Mark insight as implemented
UPDATE campaign_learning_insights SET status = 'implemented' WHERE id = 'insight-uuid';
```

### Pattern Confidence
```sql
-- Calculate statistical confidence for pattern
SELECT calculate_pattern_confidence('pattern-uuid');
```

## 5. Troubleshooting

### Error: "GEMINI_API_KEY not configured"
**Solution:** Ensure `.env.local` contains valid API key, restart dev server (`npm run dev`).

### Error: "relation campaign_patterns does not exist"
**Solution:** Execute `sql/create_ai_learning.sql` in Supabase SQL Editor.

### Insights not generating
**Causes:**
- Insufficient campaign data (need 5+ campaigns with analytics)
- Gemini API rate limits (wait 60 seconds between requests)
- API key invalid/expired (regenerate in Google AI Studio)

**Debug:**
1. Open browser DevTools console
2. Navigate to AI Learning tab
3. Click "Run Analysis"
4. Check console for errors (Gemini API responses logged)

### Pattern confidence always 0%
**Cause:** No campaigns meet minimum thresholds (CTR > 5%, ROI > 2.0, clicks > 100).

**Solution:** Generate more campaigns or lower thresholds:
```sql
-- Temporarily lower thresholds for testing
UPDATE campaign_patterns SET confidence_score = 50 WHERE sample_campaigns IS NOT NULL;
```

## 6. Integration Points

### AdminCommandCenter.tsx
- New tab: "AI Learning" with Sparkles icon
- Renders `<CampaignLearning />` component
- Auto-switches to learning tab when insights badge updates

### campaignLearningService.ts
- `analyzeCampaignPerformance(campaignId)`: Single campaign analysis
- `discoverPatterns(minROI, minCTR, minClicks)`: Bulk pattern discovery
- `generateABTestIdeas(campaignId)`: A/B test variant generation
- `generateOptimizationInsights(daysBack)`: Timeframe-based insights

### CampaignLearning.tsx
- Quick Actions: Run Analysis, Discover Patterns buttons
- Learning Insights grid: Severity badges, confidence scores, tags
- Pattern Library: Accordion with Headlines/Images/CTAs/Audiences sections
- Auto-refresh every 30 seconds

## 7. Next Steps: Phase 4 (Autonomous Operations)

After Phase 3 is working:
1. Implement auto-pause for low-ROI campaigns (ROI < 1.0, spend > threshold)
2. Implement auto-scale for high-ROI campaigns (ROI > 3.0, increase budget 1.5x)
3. Proactive campaign generation based on upcoming events
4. Self-optimization loop: Analyze → Adjust → Test → Learn

## Success Criteria
- ✅ SQL tables created in Supabase
- ✅ AI Learning tab visible in AdminCommandCenter
- ✅ "Run Analysis" generates Gemini insights
- ✅ "Discover Patterns" populates Pattern Library
- ✅ Confidence scores display correctly (0-100%)
- ✅ Insights auto-refresh every 30 seconds
- ✅ Severity badges color-coded (critical/warning/info/success)

## Support
For issues, contact: huntersest@gmail.com
Production URL: https://www.eventnexus.eu
Supabase Dashboard: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw
