# Enterprise Social Media Manager - Database Setup

## Overview
Enterprise and Premium users now have their own social media management capability with AI campaign generation and posting to Facebook/Instagram.

## Database Structure

### Separate Tables for Admin vs Users:
- **Admin Tables** (platform growth campaigns):
  - `campaigns` - Admin-created platform growth campaigns (NO user_id)
  - `campaign_social_content` - Platform-specific content for admin campaigns

- **User Tables** (Enterprise/Premium event campaigns):
  - `user_campaigns` - User-generated event campaigns (WITH user_id)
  - Social media accounts use existing `social_media_accounts` table

## Setup Instructions

### 1. Create User Campaigns Table
Open Supabase SQL Editor and run: `/workspaces/EventNexus/sql/hotfixes/create_user_campaigns.sql`

This creates:
- ✅ `user_campaigns` table with user_id column
- ✅ RLS policies for user ownership
- ✅ Indexes on user_id, event_id, status, created_at
- ✅ Update trigger for updated_at timestamp
- ✅ Admin access policy to view all campaigns

### 2. Table Schema
```sql
user_campaigns (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  event_id UUID REFERENCES events(id),
  title TEXT NOT NULL,
  copy TEXT NOT NULL,
  cta TEXT,
  image_url TEXT,
  tracking_code TEXT,
  status TEXT DEFAULT 'draft',
  facebook_posted BOOLEAN DEFAULT false,
  instagram_posted BOOLEAN DEFAULT false,
  twitter_posted BOOLEAN DEFAULT false,
  linkedin_posted BOOLEAN DEFAULT false,
  facebook_post_id TEXT,
  instagram_post_id TEXT,
  twitter_post_id TEXT,
  linkedin_post_id TEXT,
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)
```

### 3. Verify Setup
After running the SQL script, verify:

```sql
-- Check table exists
SELECT * FROM user_campaigns LIMIT 1;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'user_campaigns';

-- Check indexes
SELECT * FROM pg_indexes WHERE tablename = 'user_campaigns';
```

## Component Integration

### SocialMediaManager.tsx
- Located: `components/SocialMediaManager.tsx`
- Used by: Enterprise and Premium users in `UserProfile.tsx`
- Features:
  - Manual social media connection (Facebook/Instagram)
  - AI Campaign Generator (Enterprise only)
  - Campaign list with publish/download buttons
  - Real-time campaign loading

### UserProfile.tsx Integration
```tsx
{(user.subscription_tier === 'enterprise' || user.subscription_tier === 'premium') && (
  <SocialMediaManager 
    user={user} 
    showCampaignEngine={user.subscription_tier === 'enterprise'} 
  />
)}
```

## Usage Flow

1. **Enterprise/Premium User** navigates to User Profile
2. **Connect Social Media**:
   - Click "Connect Facebook" or "Connect Instagram"
   - Enter PAGE ACCESS TOKEN (not user token!)
   - Enter Page/Account ID
   - Click Save

3. **Generate Campaign** (Enterprise only):
   - Enter event name and audience type
   - AI generates campaign with Gemini
   - Saves to `user_campaigns` table

4. **Post to Social Media**:
   - Click 📘 Facebook or 📸 Instagram button
   - Posts content to connected platform
   - Updates campaign with post_id and posted status

5. **Download Materials**:
   - Click 💾 Download button
   - Downloads campaign as JSON file

## Differences from Admin

| Feature | Admin | Enterprise/Premium |
|---------|-------|-------------------|
| Table | `campaigns` | `user_campaigns` |
| Access | All platform campaigns | Own campaigns only |
| RLS | No RLS (admin-only) | User ownership RLS |
| Purpose | Platform growth | Event promotion |
| UI | AdminCommandCenter | SocialMediaManager |

## Testing

### Test as Enterprise User:
1. Login as user with `subscription_tier = 'enterprise'`
2. Navigate to User Profile
3. Verify "Social Media Manager" section appears
4. Connect Facebook/Instagram with PAGE ACCESS TOKEN
5. Generate AI campaign
6. Post to both platforms
7. Download campaign materials

### Verify Database:
```sql
-- Check user's campaigns
SELECT * FROM user_campaigns WHERE user_id = 'your-user-id';

-- Check posting status
SELECT title, facebook_posted, instagram_posted FROM user_campaigns;

-- Check RLS (as user)
SELECT * FROM user_campaigns; -- Should only see own campaigns
```

## Troubleshooting

### "relation user_campaigns does not exist"
- Run `sql/hotfixes/create_user_campaigns.sql` in Supabase SQL Editor

### "permission denied for table user_campaigns"
- Check RLS policies are created
- Verify user is authenticated (auth.uid() returns user ID)

### Campaigns not loading
- Check browser console for errors
- Verify user.id matches auth.uid()
- Check `loadUserCampaigns()` function in SocialMediaManager.tsx

### Posting fails
- Verify PAGE ACCESS TOKEN (not user token!)
- Check Facebook Page ID and Instagram Business Account ID
- Ensure `social_media_accounts` table has correct tokens

## Next Steps

Optional enhancements:
- [ ] Schedule campaign publishing
- [ ] Campaign analytics/metrics tracking
- [ ] Multi-platform preview before posting
- [ ] Campaign templates library
- [ ] A/B testing for campaign variations
