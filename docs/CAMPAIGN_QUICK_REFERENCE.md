# Campaign System - Quick Reference Card

## 🎯 Create Campaign (AdminCommandCenter)

### AI Generator Method
```
1. AdminCommandCenter → Campaign Engine → New Campaign
2. Theme: "summer festival launch"
3. Target: Attendees
4. Click Generate
5. Configure Incentive:
   - Type: Credits
   - Value: 30
   - Limit: 100
   - Redeemed: 0
6. Status: Active
7. Placement: landing_page
8. Save
```

### SQL Method
```sql
INSERT INTO campaigns (
  title, copy, status, placement, target, cta,
  image_url, tracking_code, incentive, metrics, tracking
) VALUES (
  'Limited Offer',
  'First 100 registrations get 30 free credits!',
  'Active', 'landing_page', 'attendees',
  'Claim My Credits',
  'https://images.unsplash.com/photo-1514525253361-bee243870d24?w=1200',
  'PROMO24',
  '{"type":"credits","value":30,"limit":100,"redeemed":0}'::jsonb,
  '{"views":0,"clicks":0,"guestSignups":0,"proConversions":0,"revenueValue":0}'::jsonb,
  '{"sources":{"facebook":0,"x":0,"instagram":0,"direct":0}}'::jsonb
);
```

---

## 📊 Check Campaigns

### View Active Campaigns
```sql
SELECT 
  title, status, placement,
  (incentive->>'limit')::int - (incentive->>'redeemed')::int AS spots_left,
  (metrics->>'views')::int AS views,
  (metrics->>'clicks')::int AS clicks
FROM campaigns
WHERE status = 'Active'
  AND placement IN ('landing_page', 'both')
ORDER BY created_at DESC;
```

### Count Campaigns by Status
```sql
SELECT 
  status,
  COUNT(*) AS count
FROM campaigns
GROUP BY status;
```

---

## 🔍 Verify System

### Quick Health Check
```sql
-- Tables exist?
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('campaigns', 'system_config');

-- Functions exist?
SELECT proname FROM pg_proc 
WHERE proname IN ('increment_campaign_metric', 'increment_campaign_source');

-- Admin users?
SELECT email, role FROM users WHERE role = 'admin';
```

### Full Verification
```bash
# Run in Supabase SQL Editor:
sql/verify-campaign-system.sql
```

---

## 📈 Track Metrics

### Increment View
```sql
SELECT increment_campaign_metric(campaign_id, 'views', 1);
```

### Increment Click
```sql
SELECT increment_campaign_metric(campaign_id, 'clicks', 1);
```

### Increment Traffic Source
```sql
SELECT increment_campaign_source(campaign_id, 'facebook', 1);
```

---

## 💰 Incentive Calculations

### Credits
```
1 credit = €0.50
30 credits = €15.00
100 credits = €50.00
```

### Spots Remaining
```
spots_left = limit - redeemed
Example: 100 - 42 = 58 spots left
```

---

## 🎨 Placement Types

| Type | Shows | Audience |
|------|-------|----------|
| `landing_page` | Landing page banner | Not logged in |
| `dashboard` | Dashboard card | Logged in |
| `both` | Both locations | Everyone |

---

## 🐛 Quick Fixes

### Campaign Not Showing?
```sql
-- Check status and placement
UPDATE campaigns 
SET status = 'Active', placement = 'landing_page'
WHERE tracking_code = 'YOUR_CODE';
```

### Reset Metrics?
```sql
-- Reset to zero
UPDATE campaigns
SET metrics = '{"views":0,"clicks":0,"guestSignups":0,"proConversions":0,"revenueValue":0}'::jsonb
WHERE id = 'campaign_id';
```

### Change Spots?
```sql
-- Update incentive
UPDATE campaigns
SET incentive = jsonb_set(
  incentive,
  '{redeemed}',
  '42'::jsonb
)
WHERE tracking_code = 'YOUR_CODE';
```

---

## 📁 File Locations

```
sql/
  ├── verify-campaign-system.sql     # Verification script
  └── seed-sample-campaign.sql       # Sample campaigns

docs/
  ├── CAMPAIGN_SYSTEM_ADMIN_GUIDE.md # Full guide (EN)
  ├── KAMPAANIASUSTEEM_KIIRJUHEND_ET.md # Quick guide (ET)
  └── CAMPAIGN_IMPLEMENTATION_SUMMARY.md # Summary

supabase/migrations/
  └── 20250119000002_admin_features.sql # Campaigns table

components/
  ├── LandingPage.tsx                # Shows campaigns
  └── AdminCommandCenter.tsx         # Create/edit campaigns

services/
  ├── dbService.ts                   # getCampaigns()
  └── geminiService.ts               # AI generation
```

---

## 🎯 Common Scenarios

### Scenario 1: Welcome Bonus
```
Title: "Welcome to EventNexus"
Incentive: 30 credits (€15)
Limit: 100
Placement: landing_page
Target: attendees
```

### Scenario 2: Pro Upgrade
```
Title: "Upgrade to Pro"
Incentive: 40% discount for 3 months
Limit: 50
Placement: dashboard
Target: organizers
```

### Scenario 3: Seasonal
```
Title: "Summer Events"
Incentive: 50 credits (€25)
Limit: 200
Placement: both
Target: all
```

---

## ⚡ Quick Commands

```bash
# Create sample campaigns
psql> \i sql/seed-sample-campaign.sql

# Verify system
psql> \i sql/verify-campaign-system.sql

# Check active campaigns
psql> SELECT title, status FROM campaigns WHERE status = 'Active';

# Count all campaigns
psql> SELECT COUNT(*) FROM campaigns;
```

---

## 🔑 Key Rules

1. ✅ Status must be 'Active' to show
2. ✅ Placement must include target location
3. ✅ Tracking code must be unique
4. ✅ Image URL recommended (16:9 ratio)
5. ✅ Incentive type matches value
6. ✅ Redeemed ≤ Limit
7. ✅ Admin role required to create/edit

---

**Last Updated**: December 20, 2025  
**Contact**: huntersest@gmail.com
