# Campaign System - Admin Guide

## 🎯 Overview

The EventNexus campaign system allows administrators to create, manage, and track promotional campaigns that appear on the platform. Campaigns can offer incentives (credits, discounts) to drive user signups and engagement.

## 📋 Table of Contents

1. [Campaign Structure](#campaign-structure)
2. [Creating Campaigns](#creating-campaigns)
3. [Campaign Types](#campaign-types)
4. [Placement Options](#placement-options)
5. [Incentive System](#incentive-system)
6. [Tracking & Analytics](#tracking--analytics)
7. [Database Verification](#database-verification)
8. [Example Campaigns](#example-campaigns)

---

## 🏗️ Campaign Structure

Every campaign has the following properties:

```typescript
interface Campaign {
  id: string;                    // Auto-generated UUID
  title: string;                 // Campaign headline
  copy: string;                  // Campaign description
  status: 'Active' | 'Draft' | 'Paused' | 'Completed';
  placement: 'landing_page' | 'dashboard' | 'both';
  target: 'attendees' | 'organizers' | 'all';
  cta: string;                   // Call-to-action button text
  image_url?: string;            // Banner image URL
  tracking_code: string;         // Unique tracking identifier
  incentive: {
    type: 'credits' | 'pro_discount' | 'none';
    value: number;               // Amount of credits or discount %
    limit: number;               // Total available spots
    redeemed: number;            // Already claimed spots
    durationMonths?: number;     // For pro discounts
  };
  metrics: {
    views: number;               // Impressions
    clicks: number;              // CTA clicks
    guestSignups: number;        // New signups from campaign
    proConversions: number;      // Pro upgrades from campaign
    revenueValue: number;        // Total revenue generated
  };
  tracking: {
    sources: {
      facebook: number;          // Traffic from Facebook
      x: number;                 // Traffic from X/Twitter
      instagram: number;         // Traffic from Instagram
      direct: number;            // Direct traffic
    };
  };
}
```

---

## ✨ Creating Campaigns

### Option 1: AI-Generated Campaign (Recommended)

1. Open **AdminCommandCenter**
2. Go to **Campaign Engine** tab
3. Click **New Campaign**
4. In the AI Generator section:
   - Enter campaign theme (e.g., "Summer Festival Launch")
   - Select target audience (Attendees/Creators)
   - Click **Generate**
5. AI will create:
   - Compelling title and copy
   - Recommended incentive type and value
   - Campaign visual prompt
   - Auto-generated banner image (via Gemini AI)
6. Review and customize the generated campaign
7. Set status to **Active** and save

### Option 2: Manual Campaign Creation

1. Open **AdminCommandCenter**
2. Go to **Campaign Engine** tab
3. Click **New Campaign**
4. Fill in all fields:
   - **Title**: Short, attention-grabbing headline
   - **Copy**: Descriptive campaign message
   - **Tracking Code**: Unique identifier (e.g., LAUNCH24)
   - **Status**: Draft/Active/Paused/Completed
   - **Placement**: Where campaign appears
   - **Target**: Audience type
   - **CTA**: Button text
   - **Image URL**: Banner image (16:9 ratio recommended)
5. Configure **Incentive**:
   - **Type**: Credits/Pro Discount/None
   - **Value**: Amount (credits or %)
   - **Limit**: Total spots available
   - **Redeemed**: Already claimed (usually 0 for new campaigns)
6. Click **Create Campaign**

---

## 🎨 Campaign Types

### 1. Credit Campaigns

**Best for**: User acquisition, engagement boosts

**Example**:
```
Title: "Join the Revolution"
Copy: "First 100 signups get 30 free credits (€15 value)"
Incentive: 
  - Type: credits
  - Value: 30
  - Limit: 100
  - Redeemed: 0
```

**Credit Value**: 1 credit = €0.50

### 2. Pro Discount Campaigns

**Best for**: Premium tier conversion, special promotions

**Example**:
```
Title: "Black Friday Special"
Copy: "Get 40% off Pro Plan for 3 months"
Incentive:
  - Type: pro_discount
  - Value: 40 (percentage)
  - Limit: 50
  - DurationMonths: 3
  - Redeemed: 0
```

### 3. Awareness Campaigns

**Best for**: Announcements, brand awareness

**Example**:
```
Title: "Platform Launch"
Copy: "Discover events near you with our map-first approach"
Incentive:
  - Type: none
```

---

## 📍 Placement Options

### Landing Page
- Appears at top of landing page for unauthenticated users
- Large banner format (hero section)
- Best for: User acquisition campaigns
- **Required**: Status = Active, Placement = landing_page or both

### Dashboard
- Appears in user dashboard after login
- Card format in feed
- Best for: Engagement, upsell campaigns
- **Required**: Status = Active, Placement = dashboard or both

### Both
- Appears on both landing page and dashboard
- Maximum visibility
- Best for: Platform-wide announcements

---

## 🎁 Incentive System

### Credits (type: 'credits')

Credits unlock premium features for free tier users.

**Configuration**:
- **Value**: Number of credits to award (e.g., 30)
- **Limit**: Total available spots (e.g., 100)
- **Redeemed**: Number already claimed (e.g., 42)
- **Display**: Shows "58 Spots Left" and "€15.00" value

**Calculation**:
```typescript
spots_remaining = limit - redeemed
euro_value = value * 0.50
```

**Example**:
```json
{
  "incentive": {
    "type": "credits",
    "value": 30,
    "limit": 100,
    "redeemed": 42
  }
}
```
Display: **58 Spots Left** | **€15.00 value**

### Pro Discount (type: 'pro_discount')

Percentage discount on Pro subscription.

**Configuration**:
- **Value**: Discount percentage (e.g., 40)
- **Limit**: Total available spots
- **DurationMonths**: How long discount lasts (e.g., 3)

**Example**:
```json
{
  "incentive": {
    "type": "pro_discount",
    "value": 40,
    "limit": 50,
    "redeemed": 12,
    "durationMonths": 3
  }
}
```
Display: **40% off for 3 months**

### None (type: 'none')

No incentive - pure awareness campaign.

---

## 📊 Tracking & Analytics

### Automatic Tracking

The system automatically tracks:

1. **Views**: Campaign impressions (tracked on page load)
2. **Clicks**: CTA button clicks
3. **Sources**: Traffic origins (facebook/x/instagram/direct)

### Database Functions

```sql
-- Increment metric (views, clicks, guestSignups, proConversions, revenueValue)
SELECT increment_campaign_metric(campaign_id, 'views', 1);

-- Increment traffic source
SELECT increment_campaign_source(campaign_id, 'facebook', 1);
```

### Frontend Tracking

**Track View** (automatic on LandingPage):
```typescript
await supabase.rpc('increment_campaign_metric', {
  p_campaign_id: campaignId,
  p_metric: 'views',
  p_amount: 1
});
```

**Track Click**:
```typescript
await supabase.rpc('increment_campaign_metric', {
  p_campaign_id: campaignId,
  p_metric: 'clicks',
  p_amount: 1
});
```

### Viewing Analytics

In **AdminCommandCenter** > **Campaign Engine**:
- Each campaign card shows real-time metrics
- Views, Clicks, Signups, Pro Conversions
- Click "View Analytics" for detailed breakdown

---

## 🔍 Database Verification

### Step 1: Run Verification Script

```bash
# In Supabase SQL Editor
# Run: sql/verify-campaign-system.sql
```

This checks:
- ✅ Tables exist (campaigns, system_config, etc.)
- ✅ Correct schema and columns
- ✅ Constraints (status, placement, target)
- ✅ Indexes for performance
- ✅ RLS policies enabled
- ✅ Database functions created
- ✅ Active campaigns for landing page
- ✅ Admin users exist

### Step 2: Check Active Campaigns

```sql
SELECT 
    id,
    title,
    status,
    placement,
    (incentive->>'limit')::int - (incentive->>'redeemed')::int AS spots_left,
    (metrics->>'views')::int AS views,
    (metrics->>'clicks')::int AS clicks
FROM public.campaigns
WHERE status = 'Active'
  AND placement IN ('landing_page', 'both')
ORDER BY created_at DESC;
```

### Step 3: Test Campaign Functions

```sql
-- Test metric increment
SELECT increment_campaign_metric(
  'your-campaign-id'::uuid,
  'views',
  1
);

-- Verify it worked
SELECT 
    title,
    (metrics->>'views')::int AS views
FROM campaigns
WHERE id = 'your-campaign-id';
```

---

## 📝 Example Campaigns

### Example 1: Welcome Campaign (Landing Page)

**SQL**:
```sql
INSERT INTO public.campaigns (
    title, copy, status, placement, target,
    cta, image_url, tracking_code,
    incentive, metrics, tracking
) VALUES (
    'Experience The Future of Nightlife',
    'Join the map-first revolution. First 100 registrations get 30 credits instantly.',
    'Active',
    'landing_page',
    'attendees',
    'Claim My Credits',
    'https://images.unsplash.com/photo-1514525253361-bee243870d24?w=1200',
    'LAUNCH24',
    jsonb_build_object(
        'type', 'credits',
        'value', 30,
        'limit', 100,
        'redeemed', 0
    ),
    jsonb_build_object(
        'views', 0,
        'clicks', 0,
        'guestSignups', 0,
        'proConversions', 0,
        'revenueValue', 0
    ),
    jsonb_build_object('sources', jsonb_build_object(
        'facebook', 0, 'x', 0, 'instagram', 0, 'direct', 0
    ))
);
```

**Via AdminCommandCenter**:
1. New Campaign
2. AI Generate with theme: "nightlife launch welcome bonus"
3. Set placement: landing_page
4. Set status: Active
5. Configure incentive: 30 credits, 100 limit
6. Save

### Example 2: Pro Upgrade Campaign (Dashboard)

**SQL**:
```sql
INSERT INTO public.campaigns (
    title, copy, status, placement, target,
    cta, tracking_code, incentive, metrics, tracking
) VALUES (
    'Unlock Pro Features',
    'Upgrade now and get 50% off your first 2 months. Advanced analytics, custom branding, and more.',
    'Active',
    'dashboard',
    'organizers',
    'Upgrade to Pro',
    'PRO50',
    jsonb_build_object(
        'type', 'pro_discount',
        'value', 50,
        'limit', 30,
        'redeemed', 0,
        'durationMonths', 2
    ),
    jsonb_build_object(
        'views', 0,
        'clicks', 0,
        'guestSignups', 0,
        'proConversions', 0,
        'revenueValue', 0
    ),
    jsonb_build_object('sources', jsonb_build_object(
        'facebook', 0, 'x', 0, 'instagram', 0, 'direct', 0
    ))
);
```

### Example 3: Seasonal Campaign (Both Placements)

**Via AdminCommandCenter**:
1. New Campaign
2. AI Generate: "summer festival season kickoff"
3. Customize:
   - Title: "Summer Events Are Here"
   - Copy: "Create your festival, concert, or party. First 50 organizers get 100 bonus credits."
   - Placement: both
   - Target: organizers
   - CTA: "Start Creating"
   - Incentive: 100 credits, limit 50
4. Upload/set summer-themed banner image
5. Status: Active
6. Save

---

## 🚀 Quick Start Checklist

- [ ] Run database migrations (verify-campaign-system.sql)
- [ ] Confirm admin user exists with proper permissions
- [ ] Create first campaign (use AI generator)
- [ ] Set status to "Active"
- [ ] Set placement to "landing_page"
- [ ] Configure incentive (credits recommended for first campaign)
- [ ] Add banner image (16:9 ratio, high quality)
- [ ] Test on landing page (logout and view)
- [ ] Monitor metrics in AdminCommandCenter
- [ ] Adjust redeemed count as users claim incentives

---

## 🔧 Troubleshooting

### Campaign Not Showing on Landing Page

**Check**:
1. Status = 'Active'?
2. Placement = 'landing_page' or 'both'?
3. RLS policies enabled?
4. User is logged out? (campaigns only show to unauthenticated users)

**SQL Debug**:
```sql
SELECT id, title, status, placement
FROM campaigns
WHERE status = 'Active' 
  AND placement IN ('landing_page', 'both');
```

### Metrics Not Incrementing

**Check**:
1. Database functions exist?
2. RPC call succeeds? (check browser console)
3. Supabase connection working?

**Test Function**:
```sql
-- Should increment without error
SELECT increment_campaign_metric(
  (SELECT id FROM campaigns LIMIT 1),
  'views',
  1
);
```

### Admin Can't Create Campaigns

**Check**:
1. User role = 'admin'?
2. RLS policy exists for admin?
3. Browser console for errors?

**SQL Check**:
```sql
SELECT 
    u.email,
    u.role,
    CASE 
        WHEN u.role = 'admin' THEN '✅ Can create campaigns'
        ELSE '❌ Cannot create campaigns'
    END AS permission
FROM users u
WHERE u.id = auth.uid();
```

---

## 📚 Additional Resources

- [Database Schema](../supabase/migrations/20250119000002_admin_features.sql)
- [Social Media Integration](../supabase/migrations/20250120000001_social_media_integration.sql)
- [Feature Unlock System](../supabase/migrations/20250120000002_feature_unlock_system.sql)
- [Verification Script](../sql/verify-campaign-system.sql)
- [Sample Campaign Seed](../sql/seed-sample-campaign.sql)

---

**Last Updated**: December 20, 2025  
**Version**: 1.0.0  
**Maintainer**: huntersest@gmail.com
