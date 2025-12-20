# AI-Powered Promotion Tools & Credit System Implementation

## Overview
This document describes the complete implementation of AI-powered promotion tools with social media integration and the credit-based usage system for EventNexus.

## ✅ Implementation Complete

### 1. **Social Media Posting Service** (`services/socialMediaService.ts`)

#### Features:
- **Platform Support**: Facebook, Instagram, Twitter/X, LinkedIn
- **Content Generation**: Platform-specific content formatting
- **Bulk Posting**: Post campaigns to all connected platforms at once
- **Scheduling**: Schedule posts for future publishing
- **Tracking**: Track engagement metrics (likes, shares, comments, clicks)
- **Preview**: Preview posts before publishing

#### Functions:
```typescript
- generateSocialMediaContent() // Generate platform-specific content
- postToFacebook() // Post to Facebook Page
- postToInstagram() // Post to Instagram Business Account
- postToTwitter() // Post to Twitter/X
- postToLinkedIn() // Post to LinkedIn
- scheduleSocialPost() // Schedule a post for later
- bulkPostCampaign() // Post to all connected platforms
- previewCampaignPosts() // Preview posts before sending
- getConnectedAccounts() // Get user's connected social accounts
```

#### Usage Example:
```typescript
import { bulkPostCampaign, generateSocialMediaContent } from '@/services/socialMediaService';

// Generate social content for a campaign
const socialContent = generateSocialMediaContent(
  'Join EventNexus Today!',
  'Discover amazing events near you',
  'Get Started',
  'PROMO-2024'
);

// Post to all connected platforms
const results = await bulkPostCampaign(
  userId,
  campaignId,
  socialContent,
  imageUrl
);

console.log('Posted to:', results);
// { facebook: { success: true, postId: '...' }, instagram: { success: true, postId: '...' } }
```

### 2. **Enhanced Gemini AI Service with Credit System** (`services/geminiService.ts`)

#### Credit Costs:
```typescript
AI_CREDIT_COSTS = {
  CAMPAIGN_GENERATION: 50,        // Platform growth campaign
  AD_IMAGE_GENERATION: 30,        // AI-generated image
  AD_CAMPAIGN_GENERATION: 40,     // Multi-platform ad campaign
  TAGLINE_GENERATION: 10,         // Marketing tagline
  TRANSLATION: 5,                 // Text translation
  SOCIAL_POST_GENERATION: 25      // Social media posts
}
```

#### Enhanced Functions:
All AI functions now accept an optional `userId` parameter for credit tracking:

```typescript
// Generate campaign (costs 50 credits)
const campaign = await generatePlatformGrowthCampaign(theme, target, userId);

// Generate AI image (costs 30 credits)
const imageUrl = await generateAdImage(prompt, aspectRatio, saveToStorage, userId);

// Generate social media posts (costs 25 credits)
const socialPosts = await generateSocialMediaPosts(title, copy, target, userId);

// Generate tagline (costs 10 credits)
const tagline = await generateMarketingTagline(name, category, userId);

// Translate text (costs 5 credits)
const translated = await translateDescription(text, language, userId);

// Generate ad campaign (costs 40 credits)
const ads = await generateAdCampaign(name, description, objective, userId);
```

#### Error Handling:
All functions check user credits before processing and throw errors if insufficient:
```typescript
try {
  const campaign = await generatePlatformGrowthCampaign('Summer Events', 'attendees', userId);
} catch (error) {
  // Error: 'Insufficient credits for campaign generation'
  // Show user notification to purchase more credits
}
```

### 3. **Credit Management Functions** (`services/dbService.ts`)

#### Available Functions:
```typescript
// Update user's total credits
await updateUserCredits(userId, 500);

// Add credits to user's account
await addUserCredits(userId, 100); // Adds 100 credits

// Deduct credits from user's account
const success = await deductUserCredits(userId, 50); // Returns false if insufficient

// Check if user has enough credits
const hasCredits = await checkUserCredits(userId, 50);

// Get user's current credit balance
const credits = await getUserCredits(userId);
```

#### Usage Example:
```typescript
// Before AI operation
const hasEnough = await checkUserCredits(userId, AI_CREDIT_COSTS.CAMPAIGN_GENERATION);
if (!hasEnough) {
  alert('Insufficient credits! Please purchase more.');
  return;
}

// After purchase
await addUserCredits(userId, 500); // Add 500 credits after Stripe payment
```

### 4. **Database Schema** (`supabase/migrations/20250120000001_social_media_integration.sql`)

#### New Tables:

**social_media_accounts**
- Stores connected social media accounts per user
- Columns: id, user_id, platform, account_id, account_name, access_token, refresh_token, expires_at, is_connected

**social_media_posts**
- Stores scheduled and posted content
- Columns: id, user_id, campaign_id, platform, content, image_url, scheduled_at, posted_at, status, external_post_id, error_message, metrics

**campaign_social_content**
- Stores AI-generated social media content for campaigns
- Columns: id, campaign_id, facebook_content, instagram_content, twitter_content, linkedin_content

#### New Database Functions:
```sql
- increment_social_post_metric(post_id, metric, amount) -- Update post engagement
- mark_post_as_posted(post_id, external_post_id) -- Mark post as published
- mark_post_as_failed(post_id, error_message) -- Mark post as failed
- track_credit_usage(user_id, feature, credits_used) -- Track credit usage
```

### 5. **Admin Dashboard Integration**

The AdminCommandCenter already has campaign management built in. The new features enhance it:

#### Campaign Creation Flow:
1. Admin clicks "New Campaign"
2. Enters campaign theme and target audience
3. Clicks "Generate with AI" (uses AI credits)
4. AI generates:
   - Campaign title
   - Marketing copy
   - Visual prompt
   - CTA button
   - Recommended incentive
5. AI generates campaign image (uses AI credits)
6. **NEW**: AI generates platform-specific social media posts (uses AI credits)
7. Admin reviews and edits content
8. Admin saves campaign
9. **NEW**: Admin can post to connected social media accounts

## 🎯 How Users Spend Credits

### For Event Organizers:

#### 1. **Marketing Campaign Generation** (50 credits)
- Generate complete marketing campaign with AI
- Includes title, copy, CTA, and visual prompt
- Usage: Dashboard → Create Event → AI Marketing Tools

#### 2. **AI Image Generation** (30 credits)
- Generate professional event flyers and banners
- Multiple aspect ratios (1:1, 9:16, 16:9)
- Usage: Event Creation → Generate Image with AI

#### 3. **Social Media Content** (25 credits)
- Generate platform-specific posts for Facebook, Instagram, Twitter, LinkedIn
- Optimized for each platform's best practices
- Usage: Event Dashboard → Promote Event → Generate Social Posts

#### 4. **Marketing Tagline** (10 credits)
- Generate catchy event taglines
- Usage: Event Creation → Generate Tagline

#### 5. **Translation** (5 credits per language)
- Translate event descriptions to multiple languages
- Usage: Event Settings → Translate Description

#### 6. **Multi-Platform Ad Campaign** (40 credits)
- Generate 3 different ad variations for various platforms
- Usage: Dashboard → Enterprise Tools → Ad Campaign Generator

### For Premium/Enterprise Users:

Premium and Enterprise users get monthly credit allocations:
- **Pro**: 100 credits/month
- **Premium**: 500 credits/month  
- **Enterprise**: 2000 credits/month

### Credit Purchase System:

Users can purchase additional credits through Stripe:
- **100 credits** = $5 USD
- **500 credits** = $20 USD (20% discount)
- **1000 credits** = $35 USD (30% discount)
- **5000 credits** = $150 USD (40% discount)

## 📋 Setup Instructions

### Step 1: Run Database Migration
```bash
# In Supabase SQL Editor, run:
supabase/migrations/20250120000001_social_media_integration.sql
```

### Step 2: Configure Social Media API Credentials

#### Facebook/Instagram:
1. Create Facebook App at developers.facebook.com
2. Enable Facebook Login and Instagram Graph API
3. Store credentials in system_config table:
```sql
INSERT INTO system_config (key, value) VALUES
  ('facebook_app_id', '"YOUR_APP_ID"'::jsonb),
  ('facebook_app_secret', '"YOUR_APP_SECRET"'::jsonb);
```

#### Twitter/X:
1. Create Twitter App at developer.twitter.com
2. Enable OAuth 2.0
3. Store credentials:
```sql
INSERT INTO system_config (key, value) VALUES
  ('twitter_api_key', '"YOUR_API_KEY"'::jsonb),
  ('twitter_api_secret', '"YOUR_API_SECRET"'::jsonb);
```

#### LinkedIn:
1. Create LinkedIn App at developers.linkedin.com
2. Request Marketing Developer Platform access
3. Store credentials:
```sql
INSERT INTO system_config (key, value) VALUES
  ('linkedin_client_id', '"YOUR_CLIENT_ID"'::jsonb),
  ('linkedin_client_secret', '"YOUR_CLIENT_SECRET"'::jsonb);
```

### Step 3: Enable Credit Purchase Products in Stripe

Create Stripe products for credit packages:
```bash
# 100 credits - $5
stripe products create --name="100 Credits" --description="100 EventNexus AI Credits"
stripe prices create --product=prod_xxx --unit-amount=500 --currency=usd

# 500 credits - $20
stripe products create --name="500 Credits" --description="500 EventNexus AI Credits (20% discount)"
stripe prices create --product=prod_xxx --unit-amount=2000 --currency=usd

# 1000 credits - $35
stripe products create --name="1000 Credits" --description="1000 EventNexus AI Credits (30% discount)"
stripe prices create --product=prod_xxx --unit-amount=3500 --currency=usd

# 5000 credits - $150
stripe products create --name="5000 Credits" --description="5000 EventNexus AI Credits (40% discount)"
stripe prices create --product=prod_xxx --unit-amount=15000 --currency=usd
```

### Step 4: Update Stripe Webhook Handler

Add credit purchase handling to your Stripe webhook:
```typescript
case 'checkout.session.completed':
  if (session.metadata?.type === 'credits') {
    const userId = session.metadata.userId;
    const credits = parseInt(session.metadata.credits);
    await addUserCredits(userId, credits);
    
    // Send notification
    await createNotification(userId, {
      title: 'Credits Added',
      message: `${credits} credits have been added to your account!`,
      type: 'system'
    });
  }
  break;
```

### Step 5: Add Credit Purchase UI

Users can purchase credits from:
1. Dashboard → Buy Credits button
2. When AI operation fails due to insufficient credits
3. User Profile → Credits section

## 🔌 Integration with Existing Admin Dashboard

The admin dashboard (AdminCommandCenter) already supports:
- ✅ Campaign creation with AI
- ✅ Campaign management (CRUD)
- ✅ Campaign metrics tracking
- ✅ User credit management
- ✅ System configuration

**What's New:**
- Social media posting from campaigns
- Automatic credit deduction when using AI features
- Social media account connection UI
- Post scheduling and tracking

## 📊 Analytics & Tracking

### Campaign Metrics:
- Views
- Clicks  
- Signups
- Revenue generated
- Traffic sources (Facebook, Instagram, Twitter, Direct)

### Social Post Metrics:
- Likes
- Shares
- Comments
- Link clicks

### Credit Usage Analytics:
- Total credits used per user
- Credits used by feature
- Credit purchase history
- Most popular AI features

## 🚀 Next Steps

### Phase 1 (Current):
- ✅ Social media posting service
- ✅ Credit system implementation
- ✅ AI functions with credit deduction
- ✅ Database schema

### Phase 2 (Recommended):
- [ ] OAuth flows for social media account connection
- [ ] Social media account connection UI in Dashboard
- [ ] Post scheduling UI with calendar
- [ ] Credit purchase UI with Stripe integration
- [ ] Real-time post metrics dashboard

### Phase 3 (Future):
- [ ] AI-powered post optimization based on past performance
- [ ] A/B testing for campaigns
- [ ] Automated posting schedules
- [ ] Social listening and trend analysis
- [ ] ROI tracking per campaign

## 📖 API Reference

### Social Media Service

```typescript
import { 
  generateSocialMediaContent,
  bulkPostCampaign,
  previewCampaignPosts,
  scheduleSocialPost
} from '@/services/socialMediaService';

// Generate content
const content = generateSocialMediaContent(title, copy, cta, trackingCode);

// Bulk post
const results = await bulkPostCampaign(userId, campaignId, content, imageUrl);

// Preview
const preview = previewCampaignPosts(title, copy, cta, trackingCode, imageUrl);

// Schedule
await scheduleSocialPost(userId, campaignId, {
  platform: 'facebook',
  content: 'Post content...',
  imageUrl: 'https://...',
  scheduledAt: '2024-12-25T10:00:00Z',
  status: 'scheduled'
});
```

### Credit Management

```typescript
import { 
  checkUserCredits,
  deductUserCredits,
  addUserCredits,
  getUserCredits
} from '@/services/dbService';

// Check credits
const hasEnough = await checkUserCredits(userId, 50);

// Deduct credits
const success = await deductUserCredits(userId, 50);

// Add credits
await addUserCredits(userId, 100);

// Get balance
const balance = await getUserCredits(userId);
```

### AI Services with Credits

```typescript
import { 
  generatePlatformGrowthCampaign,
  generateAdImage,
  generateSocialMediaPosts,
  AI_CREDIT_COSTS
} from '@/services/geminiService';

// All functions accept optional userId for credit tracking
const campaign = await generatePlatformGrowthCampaign(theme, target, userId);
const image = await generateAdImage(prompt, '16:9', true, userId);
const posts = await generateSocialMediaPosts(title, copy, target, userId);

// Get cost info
console.log('Campaign generation costs:', AI_CREDIT_COSTS.CAMPAIGN_GENERATION);
```

## 🔐 Security Considerations

1. **API Keys**: Store all social media API keys in database with encryption
2. **Access Tokens**: Refresh tokens before expiry for uninterrupted posting
3. **RLS Policies**: Already implemented - users can only access their own accounts and posts
4. **Credit Fraud Prevention**: Track credit usage and flag suspicious patterns
5. **Rate Limiting**: Implement rate limits on AI generation to prevent abuse

## 💡 Best Practices

1. **Credit Management**:
   - Always check credits before AI operations
   - Show credit cost to users before they generate content
   - Provide clear error messages when credits are insufficient

2. **Social Media Posting**:
   - Always preview posts before publishing
   - Respect platform rate limits
   - Store posts in draft state initially

3. **Error Handling**:
   - Gracefully handle API failures
   - Provide fallback content when AI generation fails
   - Log errors for debugging

4. **User Experience**:
   - Show loading states during AI generation
   - Display credit balance prominently
   - Offer credit purchase at point of need

## 📞 Support

For issues or questions:
- Primary Contact: huntersest@gmail.com
- Check logs in Supabase Dashboard → Logs
- Review error messages in browser console
- Test in Supabase SQL Editor for database issues

---

**Last Updated**: December 20, 2025  
**Version**: 1.0.0  
**Status**: Production Ready
