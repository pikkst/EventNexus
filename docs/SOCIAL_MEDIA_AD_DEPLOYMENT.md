# Social Media Ad Deployment Feature

## Overview
Users can now deploy AI-generated ads directly to their connected social media accounts (Facebook, Instagram, LinkedIn, Twitter) with a single click from the Marketing Studio.

## Key Features

### 1. **AI Ad Generation**
- Generate platform-specific ads using the Marketing Studio
- Each ad includes:
  - Platform-optimized headline
  - Compelling body copy
  - Call-to-action button
  - AI-generated visual (sized for platform)
  - Event tracking URL

### 2. **Social Media Account Connection**
- Users connect accounts via **Profile > Social Media Manager**
- Supports:
  - **Facebook** (Pages with admin access)
  - **Instagram** (Business accounts connected to Facebook Pages)
  - **LinkedIn** (Personal and Company Pages)
  - **Twitter/X** (Personal accounts)

### 3. **One-Click Deployment**
- Click **"Deploy Ad"** button on any generated ad
- Select target platform from deployment modal
- Ad is posted immediately with:
  - Formatted text (headline + body + CTA)
  - AI-generated image
  - Event tracking link (for Facebook)

### 4. **Deployment Status Tracking**
- **Before deployment**: Shows "Deploy Ad" button
- **During deployment**: Shows loading spinner
- **After deployment**: Shows "✓ Published" + platform name
- Cannot re-deploy already published ads

## User Workflow

### Step 1: Connect Social Media Accounts
```
1. Go to Profile page
2. Find "Social Media Manager" section
3. Click "Auto-Setup" or manually enter tokens
4. Accounts appear as "Connected" with checkmarks
```

### Step 2: Generate Ads
```
1. Go to Dashboard > Marketing Studio tab
2. Select event to promote
3. Describe campaign theme (e.g., "VIP experience", "limited tickets")
4. Select target audience
5. Click "Generate Ads"
6. AI creates 3 platform-optimized ads with visuals
```

### Step 3: Deploy Ads
```
1. Review generated ads
2. Click "Deploy Ad" button on desired ad
3. Modal shows connected accounts
4. Click platform button (Facebook, Instagram, etc.)
5. Ad posts immediately
6. Status updates to "✓ Published to [Platform]"
```

## Technical Implementation

### Files Modified
- **`components/Dashboard.tsx`**
  - Added deployment modal UI
  - Connected accounts loading
  - Real social media posting integration
  - Deployment status tracking

### Integration Points

#### Dashboard State
```typescript
const [deployModalOpen, setDeployModalOpen] = useState(false);
const [selectedAdForDeploy, setSelectedAdForDeploy] = useState<any>(null);
const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
```

#### Social Media Posting
```typescript
// Import posting functions
import { 
  postToFacebook, 
  postToInstagram, 
  postToLinkedIn, 
  postToTwitter 
} from '../services/socialMediaService';

// Deploy to selected platform
const result = await postToFacebook(
  account.access_token,
  account.account_id,
  `${ad.headline}\n\n${ad.bodyCopy}\n\n${ad.cta}`,
  ad.imageUrl,
  ad.eventUrl
);
```

### Database Schema
Uses existing `social_media_accounts` table:
```sql
- user_id: UUID
- platform: text (facebook, instagram, linkedin, twitter)
- account_id: text
- account_name: text
- access_token: text (encrypted)
- is_connected: boolean
- expires_at: timestamptz
```

## Platform-Specific Behavior

### Facebook
- Posts to Facebook Page feed
- Includes image + text + tracking link
- Uses Graph API `/photos` or `/feed` endpoint
- Requires: `pages_manage_posts` permission

### Instagram
- Posts to Instagram Business Account
- **Requires image** (Instagram doesn't support text-only posts)
- Uses two-step process:
  1. Create media container
  2. Publish container after processing
- Requires: `instagram_content_publish` permission

### LinkedIn
- Posts to user profile or company page
- Includes text + optional image
- Uses LinkedIn Share API
- Requires: `w_member_social` permission

### Twitter/X
- Posts tweet with text + optional image
- Character limit: 280 characters
- Uses Twitter API v2
- Requires: OAuth 2.0 with tweet write permissions

## Error Handling

### Common Errors
1. **No Connected Accounts**
   - Shows banner: "Connect Your Social Media Accounts"
   - Links to Profile page

2. **Token Expired**
   - Shows error: "Access token has expired. Please reconnect your account."
   - User must reconnect in Social Media Manager

3. **Instagram Without Image**
   - Error: "Instagram requires an image"
   - Only happens if ad generation fails to create image

4. **API Rate Limits**
   - Shows specific platform error message
   - User should wait and retry

## UI Components

### Deployment Modal
- **Header**: "Deploy Ad" title + close button
- **Preview**: Shows ad visual, headline, and body copy
- **Connected Accounts**: Grid of platform buttons
  - Green gradient for connected accounts
  - Gray/disabled for unconnected accounts
  - Shows account name (e.g., "EventNexus Page")
- **Actions**: Cancel button

### Ad Card Status Badge
```tsx
{ad.deployed && ad.deployedTo && (
  <div className="flex items-center gap-2 text-emerald-400">
    <CheckCircle size={14} />
    <span>Published to {ad.deployedTo}</span>
  </div>
)}
```

### Connected Accounts Banner
- Shows when no accounts connected
- Displays connected accounts with checkmarks
- Link to manage accounts in Profile

## Testing Checklist

- [ ] Generate ads in Marketing Studio
- [ ] Deploy to Facebook (with connected account)
- [ ] Deploy to Instagram (with connected account + image)
- [ ] Try deploying without connected accounts (shows error)
- [ ] Verify published status persists
- [ ] Check ads appear on actual social media platforms
- [ ] Test with expired tokens (shows reconnect prompt)
- [ ] Verify tracking URLs work correctly

## Future Enhancements

1. **Scheduled Posting**
   - Allow users to schedule ads for future dates
   - Store scheduled posts in database
   - Use Supabase Edge Functions for timed execution

2. **Multi-Platform Deploy**
   - Deploy same ad to multiple platforms at once
   - Checkbox selection instead of single platform

3. **Analytics Integration**
   - Track clicks on posted ads
   - Show engagement metrics (likes, shares, comments)
   - Compare performance across platforms

4. **A/B Testing**
   - Generate multiple variants of same ad
   - Deploy different variants to different platforms
   - Compare conversion rates

5. **Video Ad Support**
   - Generate video ads using AI
   - Upload to YouTube, TikTok, Instagram Reels
   - Support short-form video formats

## Security Notes

- Access tokens stored encrypted in database
- RLS policies ensure users only see their own accounts
- Never expose tokens in client-side code
- Use environment variables for API keys
- Validate all user inputs before posting

## Support Links

- [Facebook Graph API Documentation](https://developers.facebook.com/docs/graph-api)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [LinkedIn Share API](https://docs.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/share-api)
- [Twitter API v2](https://developer.twitter.com/en/docs/twitter-api)

---

**Implementation Date**: December 23, 2025  
**Feature Status**: ✅ Live in Production  
**Tier Availability**: Pro, Premium, Enterprise
