# Growth Features Implementation Guide

## 🚀 New Features Implemented

This document describes all growth optimization features added to EventNexus platform.

---

## 1. Onboarding Tutorial

**Location:** `components/OnboardingTutorial.tsx`

**Purpose:** Interactive 60-second tour for new users showing key platform features.

**Features:**
- 5-step guided tour with visual highlights
- Progress tracking with step indicators
- Skippable at any time
- Mobile-responsive modal design
- Animated transitions

**Steps:**
1. Welcome message
2. Map discovery explanation
3. Vibe Radar introduction
4. Follow organizers feature
5. First action bonus (20 credits)

**Integration:**
```tsx
import OnboardingTutorial from './components/OnboardingTutorial';

// In App.tsx or LandingPage
{showOnboarding && (
  <OnboardingTutorial
    user={user}
    onComplete={() => {
      localStorage.setItem('onboarding_completed', 'true');
      setShowOnboarding(false);
    }}
    onSkip={() => setShowOnboarding(false)}
  />
)}
```

**Trigger Logic:**
- Show to new users after first login
- Check `localStorage` for `onboarding_completed`
- Auto-trigger 2 seconds after page load

---

## 2. Referral System

**Location:** `components/ReferralSystem.tsx`

**Purpose:** Viral loop to acquire new users through existing user base.

**Rewards:**
- Referrer: 50 bonus credits (€25 value)
- Referred user: 50 bonus credits (€25 value)
- Both parties benefit

**Features:**
- Unique referral code per user
- Copy-to-clipboard functionality
- Social sharing (Twitter, Facebook, WhatsApp, Email)
- Real-time stats dashboard
- Pending referrals tracker

**Database Schema:**
```sql
-- users table additions
ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN referred_by UUID REFERENCES users(id);
```

**Usage:**
```tsx
import ReferralSystem from './components/ReferralSystem';

// In UserProfile or Dashboard
<ReferralSystem user={user} />
```

---

## 3. Feature Teaser Modals

**Location:** `components/FeatureTeaserModal.tsx`

**Purpose:** Conversion optimization by showing value of premium features.

**Available Teasers:**
- `analytics` - Advanced Analytics (Pro+)
- `custom-branding` - Custom Branding (Pro+)
- `featured-placement` - Featured Map Placement (Premium+)
- `api-access` - Full API Access (Enterprise)

**Features:**
- Detailed benefit lists
- ROI impact messaging
- Direct upgrade CTA
- Visual preview placeholders
- Tier-specific gating

**Integration:**
```tsx
import FeatureTeaserModal from './components/FeatureTeaserModal';

// Trigger when user clicks locked feature
const [teaserFeature, setTeaserFeature] = useState(null);

{teaserFeature && (
  <FeatureTeaserModal
    feature={teaserFeature}
    user={user}
    onClose={() => setTeaserFeature(null)}
  />
)}

// Trigger examples:
onClick={() => setTeaserFeature('analytics')}
```

---

## 4. AI Personalization Engine

**Location:** `services/personalizationService.ts`

**Purpose:** Machine learning-based event recommendations.

**Features:**
- User behavior tracking
- Category preference learning
- Location-based scoring
- Followed organizer boosting
- Popularity signals

**Functions:**

### Track User Behavior
```typescript
import { trackUserBehavior } from './services/personalizationService';

// Track event view
await trackUserBehavior(userId, 'view', { eventId, category });

// Track event like
await trackUserBehavior(userId, 'like', { eventId, organizerId });

// Track attendance
await trackUserBehavior(userId, 'attend', { eventId, category });

// Track search
await trackUserBehavior(userId, 'search', { searchQuery });
```

### Get Personalized Recommendations
```typescript
import { getPersonalizedRecommendations } from './services/personalizationService';

const recommendations = await getPersonalizedRecommendations(
  userId,
  allEvents,
  userLocation,
  10 // limit
);

// Returns: { event, score, reasons }[]
```

### Similar Events
```typescript
import { getSimilarEvents } from './services/personalizationService';

const similar = await getSimilarEvents(userId, allEvents, 6);
```

---

## 5. Analytics Service

**Location:** `services/analyticsService.ts`

**Purpose:** Track user actions and conversion funnels.

**Key Functions:**

### Page Views
```typescript
import { trackPageView } from './services/analyticsService';

trackPageView(userId, '/map', document.referrer);
```

### User Actions
```typescript
import { trackAction } from './services/analyticsService';

trackAction('ticket_purchase', userId, { eventId, amount: 25 });
trackAction('upgrade_clicked', userId, { from: 'free', to: 'pro' });
```

### Funnel Tracking
```typescript
import { trackFunnelStep } from './services/analyticsService';

// Track conversion funnel
trackFunnelStep('subscription', 'pricing_viewed', userId, true);
trackFunnelStep('subscription', 'tier_selected', userId, true, { tier: 'pro' });
trackFunnelStep('subscription', 'payment_completed', userId, true);
```

### A/B Testing
```typescript
import { trackABTestVariant } from './services/analyticsService';

trackABTestVariant('pricing_page_v2', 'variant_b', userId, false);
// Later when converted:
trackABTestVariant('pricing_page_v2', 'variant_b', userId, true);
```

---

## 6. Edge Functions

### Send First Action Bonus Email
**Location:** `supabase/functions/send-first-action-bonus/index.ts`

**Purpose:** Automatically email users 24h after signup to claim bonus.

**Trigger:** Supabase cron job (daily)

**Email Content:**
- 20 bonus credits offer
- Clear action steps
- Beautiful HTML template
- Unsubscribe link

**Setup:**
```bash
supabase functions deploy send-first-action-bonus
```

**Cron Schedule:**
```sql
-- Run daily at 10:00 AM
SELECT cron.schedule(
    'send-first-action-bonus',
    '0 10 * * *',
    $$SELECT net.http_post(
        url:='https://[project-ref].supabase.co/functions/v1/send-first-action-bonus',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer [service-key]"}'::jsonb
    )$$
);
```

### Send Weekly Digest
**Location:** `supabase/functions/send-weekly-digest/index.ts`

**Purpose:** Weekly personalized event digest email.

**Trigger:** Supabase cron job (weekly, Sundays)

**Content:**
- Personalized event recommendations
- Trending events
- Nearby events (location-based)
- Beautiful HTML email template

**Setup:**
```bash
supabase functions deploy send-weekly-digest
```

**Cron Schedule:**
```sql
-- Run every Sunday at 9:00 AM
SELECT cron.schedule(
    'send-weekly-digest',
    '0 9 * * 0',
    $$SELECT net.http_post(
        url:='https://[project-ref].supabase.co/functions/v1/send-weekly-digest',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer [service-key]"}'::jsonb
    )$$
);
```

### Award First Action Bonus
**Location:** `supabase/functions/award-first-action-bonus/index.ts`

**Purpose:** Automatically award 20 credits on first user action.

**Called by:** Client-side when user completes qualifying action

**Actions that Qualify:**
- Register for event
- Follow organizer
- Enable Vibe Radar
- Share with friend

**Usage:**
```typescript
import { awardFirstActionBonus } from './services/dbService';

// After user follows organizer
const awarded = await awardFirstActionBonus(userId, 'follow_organizer');
if (awarded) {
  alert('🎉 You earned 20 bonus credits!');
}
```

---

## 7. Database Schema

**SQL File:** `sql/referral_and_analytics_tables.sql`

**Tables Created:**
- `user_behavior` - User interaction tracking
- `analytics_events` - General analytics
- `funnel_tracking` - Conversion funnels
- `ab_tests` - A/B test variants
- `user_conversions` - Conversion events
- `feature_usage` - Feature usage tracking
- `error_logs` - Error tracking
- `retention_tracking` - User retention metrics
- `credit_transactions` - Credit system log

**User Table Updates:**
- `referral_code` - Unique referral code
- `referred_by` - UUID of referrer
- `first_action_at` - Timestamp of first action

**Run Schema:**
```bash
# In Supabase SQL Editor
# Copy contents of sql/referral_and_analytics_tables.sql
# Execute
```

---

## 8. Integration Checklist

### App.tsx Updates

```typescript
// Add imports
import OnboardingTutorial from './components/OnboardingTutorial';
import { trackPageView, trackAction } from './services/analyticsService';
import { trackUserBehavior } from './services/personalizationService';

// Add state
const [showOnboarding, setShowOnboarding] = useState(false);

// Check onboarding status
useEffect(() => {
  if (user && !localStorage.getItem('onboarding_completed')) {
    setTimeout(() => setShowOnboarding(true), 2000);
  }
}, [user]);

// Track page views
const location = useLocation();
useEffect(() => {
  trackPageView(user?.id || null, location.pathname);
}, [location, user]);

// Add onboarding component
{showOnboarding && (
  <OnboardingTutorial
    user={user!}
    onComplete={() => {
      localStorage.setItem('onboarding_completed', 'true');
      setShowOnboarding(false);
    }}
    onSkip={() => setShowOnboarding(false)}
  />
)}
```

### UserProfile.tsx Updates

```typescript
// Add referral system tab
import ReferralSystem from './ReferralSystem';

// In tabs
<TabButton
  active={activeTab === 'referrals'}
  onClick={() => setActiveTab('referrals')}
  icon={<Users className="w-4 h-4" />}
  label="Invite Friends"
/>

// In content
{activeTab === 'referrals' && (
  <ReferralSystem user={user} />
)}
```

### EventDetail.tsx Updates

```typescript
// Track event views
useEffect(() => {
  if (event && user) {
    trackUserBehavior(user.id, 'view', {
      eventId: event.id,
      category: event.category,
      organizerId: event.organizerId
    });
  }
}, [event, user]);

// Track conversions
const handlePurchaseSuccess = () => {
  trackConversion(user.id, event.id, 'ticket_purchase');
  trackAction('ticket_purchased', user.id, {
    eventId: event.id,
    price: event.price * ticketCount
  });
};
```

### Dashboard.tsx Updates

```typescript
// Show feature teaser for free users
import FeatureTeaserModal from './FeatureTeaserModal';

const [teaserFeature, setTeaserFeature] = useState(null);

// When free user clicks analytics
{user.subscription_tier === 'free' ? (
  <button onClick={() => setTeaserFeature('analytics')}>
    <Lock className="w-4 h-4" />
    Unlock Analytics
  </button>
) : (
  // Show actual analytics
)}

{teaserFeature && (
  <FeatureTeaserModal
    feature={teaserFeature}
    user={user}
    onClose={() => setTeaserFeature(null)}
  />
)}
```

---

## 9. Environment Variables

Add to `.env.local`:

```env
# Resend (Email Service)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Supabase (already exists)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhb...

# Supabase Service Role Key (for Edge Functions)
SUPABASE_SERVICE_ROLE_KEY=eyJhb...
```

Add to Supabase Edge Function secrets:
```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
supabase secrets set SUPABASE_URL=https://xxxxx.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhb...
```

---

## 10. Monitoring & Analytics

### Key Metrics to Track

**Conversion Metrics:**
- Free → Pro conversion rate (Target: 5%)
- Credit unlock rate (Target: 25%)
- Event creation completion (Target: 80%)
- Ticket purchase conversion (Target: 15%)

**Engagement Metrics:**
- 30-day retention (Target: 60%)
- Weekly active users
- Average events viewed per session
- Referral participation rate (Target: 10%)

**Funnel Analysis:**
```sql
-- Signup funnel
SELECT step, 
       COUNT(*) as total,
       SUM(CASE WHEN success THEN 1 ELSE 0 END) as conversions,
       ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as conversion_rate
FROM funnel_tracking
WHERE funnel = 'signup'
AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY step
ORDER BY step;
```

### Dashboard Queries

```sql
-- Referral performance
SELECT COUNT(DISTINCT referred_by) as active_referrers,
       COUNT(*) as total_referrals,
       AVG(credits_earned) as avg_credits_per_referrer
FROM (
  SELECT referred_by,
         COUNT(*) as referrals,
         SUM(50) as credits_earned
  FROM users
  WHERE referred_by IS NOT NULL
  GROUP BY referred_by
) subquery;

-- Feature usage
SELECT feature_name,
       COUNT(*) as usage_count,
       COUNT(DISTINCT user_id) as unique_users
FROM feature_usage
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY feature_name
ORDER BY usage_count DESC;
```

---

## 11. Next Steps

### Immediate (Done):
✅ Onboarding tutorial component
✅ Referral system
✅ Feature teaser modals
✅ AI personalization engine
✅ Analytics service
✅ Edge functions for email automation
✅ Database schema

### Week 1:
- [ ] Integrate onboarding into App.tsx
- [ ] Add referral tab to UserProfile
- [ ] Implement feature teasers in Dashboard
- [ ] Set up Resend account and configure
- [ ] Deploy Edge Functions to Supabase
- [ ] Run SQL schema migrations

### Week 2:
- [ ] Track all user actions
- [ ] Implement A/B testing framework
- [ ] Create admin analytics dashboard
- [ ] Set up cron jobs for emails
- [ ] Monitor conversion metrics

### Month 1:
- [ ] Optimize based on data
- [ ] Add more teaser variations
- [ ] Expand personalization algorithm
- [ ] Launch referral program marketing

---

## 12. Support & Documentation

**For Issues:**
- Check Supabase Edge Function logs
- Review analytics_events table
- Monitor error_logs table

**Testing:**
```typescript
// Test onboarding
localStorage.removeItem('onboarding_completed');
// Reload page

// Test referrals
const stats = await getUserReferralStats(userId);
console.log(stats);

// Test personalization
const recs = await getPersonalizedRecommendations(userId, events, null, 5);
console.log(recs);
```

---

**Last Updated:** December 26, 2025  
**Version:** 1.0.0  
**Status:** Ready for Integration
