# Social Media Posting Fix (English)

This file replaces the previous Estonian-only guide. Follow these steps to ensure social posts log correctly.

## Problem
- Social posts appeared successful in the UI but were not persisted to Supabase.
- `user_campaigns` lacked tracking columns, so updates silently failed.

## Fix (database changes)
Run this in Supabase SQL Editor:

```sql
ALTER TABLE user_campaigns 
  ADD COLUMN IF NOT EXISTS facebook_posted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS facebook_post_id TEXT,
  ADD COLUMN IF NOT EXISTS instagram_posted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS instagram_post_id TEXT,
  ADD COLUMN IF NOT EXISTS twitter_posted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS twitter_post_id TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_posted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS linkedin_post_id TEXT,
  ADD COLUMN IF NOT EXISTS last_posted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_campaigns_facebook_posted ON user_campaigns(facebook_posted) WHERE facebook_posted = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_campaigns_instagram_posted ON user_campaigns(instagram_posted) WHERE instagram_posted = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_campaigns_status ON user_campaigns(status);

CREATE OR REPLACE FUNCTION log_user_campaign_post(
  p_campaign_id UUID,
  p_platform TEXT,
  p_post_id TEXT,
  p_user_id UUID
) RETURNS VOID AS $$
BEGIN
  CASE p_platform
    WHEN 'facebook' THEN
      UPDATE user_campaigns 
      SET 
        facebook_posted = TRUE,
        facebook_post_id = p_post_id,
        status = 'published',
        last_posted_at = NOW(),
        updated_at = NOW()
      WHERE id = p_campaign_id AND user_id = p_user_id;
    WHEN 'instagram' THEN
      UPDATE user_campaigns 
      SET 
        instagram_posted = TRUE,
        instagram_post_id = p_post_id,
        status = 'published',
        last_posted_at = NOW(),
        updated_at = NOW()
      WHERE id = p_campaign_id AND user_id = p_user_id;
  END CASE;

  INSERT INTO social_media_posts (
    user_id,
    platform,
    content,
    status,
    posted_at,
    external_post_id
  ) VALUES (
    p_user_id,
    p_platform,
    (SELECT title || E'\n\n' || copy FROM user_campaigns WHERE id = p_campaign_id),
    'posted',
    NOW(),
    p_post_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION log_user_campaign_post TO authenticated;
```

## Verify
1. From the admin page, generate a campaign and post to Facebook or Instagram.
2. Check browser console for success logs and DB updates.
3. Verify DB state:

```sql
SELECT id, title, facebook_posted, facebook_post_id, instagram_posted, instagram_post_id, status, last_posted_at
FROM user_campaigns
ORDER BY created_at DESC
LIMIT 5;
```

## Troubleshooting
- "function log_user_campaign_post does not exist": rerun the SQL above.
- Missing columns: rerun the SQL above.
- Instagram errors about images: include an `image_url` on the campaign before posting.

## References
- Full guide: [SOCIAL_MEDIA_POST_FIX.md](SOCIAL_MEDIA_POST_FIX.md)
- Summary: [SOCIAL_MEDIA_POST_FIX_SUMMARY.md](SOCIAL_MEDIA_POST_FIX_SUMMARY.md)
- Diagnostic script: run `npx tsx scripts/test-social-post.ts`
- Support: huntersest@gmail.com
