import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduledPost {
  id: string;
  campaign_id: string;
  scheduled_for: string;
  timezone: string;
  platforms: string[];
  content_variations: Record<string, any> | null;
  retry_count: number;
}

interface Campaign {
  id: string;
  title: string;
  copy: string;
  cta: string;
  imageUrl?: string;
  image_url?: string;
}

interface SocialAccount {
  platform: string;
  account_id: string;
  account_name: string;
  access_token: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🤖 Campaign Auto-Poster: Checking for scheduled posts...');

    // Get ready scheduled posts
    const { data: scheduledPosts, error: fetchError } = await supabase
      .rpc('get_ready_scheduled_posts');

    if (fetchError) {
      throw new Error(`Failed to fetch scheduled posts: ${fetchError.message}`);
    }

    if (!scheduledPosts || scheduledPosts.length === 0) {
      console.log('✅ No posts ready for publishing');
      return new Response(
        JSON.stringify({ message: 'No posts ready', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`📋 Found ${scheduledPosts.length} posts ready to publish`);

    const results = [];

    for (const post of scheduledPosts as ScheduledPost[]) {
      try {
        console.log(`🚀 Processing schedule ${post.id} for campaign ${post.campaign_id}`);

        // Mark as posting
        await supabase.rpc('mark_schedule_posting', { p_schedule_id: post.id });

        // Get campaign details
        const { data: campaign, error: campaignError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', post.campaign_id)
          .single();

        if (campaignError || !campaign) {
          throw new Error(`Campaign not found: ${post.campaign_id}`);
        }

        // Get social media accounts for posting
        const { data: accounts, error: accountsError } = await supabase
          .from('social_media_accounts')
          .select('*')
          .eq('is_connected', true)
          .in('platform', post.platforms);

        if (accountsError || !accounts || accounts.length === 0) {
          throw new Error('No connected social media accounts found');
        }

        const postIds: Record<string, string> = {};

        // Post to each platform
        for (const account of accounts as SocialAccount[]) {
          try {
            console.log(`📤 Posting to ${account.platform} (${account.account_name})`);

            const postId = await postToPlatform(
              account,
              campaign as Campaign,
              post.content_variations?.[account.platform]
            );

            if (postId) {
              postIds[account.platform] = postId;
              console.log(`✅ Posted to ${account.platform}: ${postId}`);
            }
          } catch (platformError) {
            console.error(`❌ Failed to post to ${account.platform}:`, platformError);
            // Continue with other platforms
          }
        }

        // Mark as posted if at least one platform succeeded
        if (Object.keys(postIds).length > 0) {
          await supabase.rpc('mark_schedule_posted', {
            p_schedule_id: post.id,
            p_post_ids: postIds
          });

          // Track impression
          await supabase.from('campaign_analytics').insert({
            campaign_id: post.campaign_id,
            impressions: 1,
            source: Object.keys(postIds)[0],
            medium: 'social',
            recorded_at: new Date().toISOString()
          });

          results.push({
            schedule_id: post.id,
            campaign_id: post.campaign_id,
            status: 'posted',
            platforms: Object.keys(postIds),
            post_ids: postIds
          });
        } else {
          throw new Error('Failed to post to any platform');
        }

      } catch (postError: any) {
        console.error(`❌ Error processing schedule ${post.id}:`, postError);

        // Mark as failed (will retry if under max_retries)
        await supabase.rpc('mark_schedule_failed', {
          p_schedule_id: post.id,
          p_error_message: postError.message || 'Unknown error'
        });

        results.push({
          schedule_id: post.id,
          campaign_id: post.campaign_id,
          status: 'failed',
          error: postError.message
        });
      }
    }

    console.log(`✨ Completed: ${results.filter(r => r.status === 'posted').length} posted, ${results.filter(r => r.status === 'failed').length} failed`);

    return new Response(
      JSON.stringify({
        message: 'Processing complete',
        processed: scheduledPosts.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('💥 Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

/**
 * Post to a specific social media platform
 */
async function postToPlatform(
  account: SocialAccount,
  campaign: Campaign,
  customContent?: any
): Promise<string | null> {
  const platform = account.platform.toLowerCase();

  switch (platform) {
    case 'facebook':
      return await postToFacebook(account, campaign, customContent);
    case 'instagram':
      return await postToInstagram(account, campaign, customContent);
    case 'twitter':
      return await postToTwitter(account, campaign, customContent);
    case 'linkedin':
      return await postToLinkedIn(account, campaign, customContent);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Post to Facebook
 */
async function postToFacebook(
  account: SocialAccount,
  campaign: Campaign,
  customContent?: any
): Promise<string | null> {
  const content = customContent?.content || `${campaign.title}\n\n${campaign.copy}\n\n👉 ${campaign.cta}`;
  const imageUrl = customContent?.imageUrl || campaign.imageUrl || campaign.image_url;

  try {
    let endpoint = '';
    let body: any = {};

    if (imageUrl) {
      // Post with photo
      endpoint = `https://graph.facebook.com/v18.0/${account.account_id}/photos`;
      body = {
        url: imageUrl,
        caption: content,
        link: 'https://www.eventnexus.eu',
        access_token: account.access_token
      };
    } else {
      // Text-only post
      endpoint = `https://graph.facebook.com/v18.0/${account.account_id}/feed`;
      body = {
        message: content,
        link: 'https://www.eventnexus.eu',
        access_token: account.access_token
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Facebook API error: ${error}`);
    }

    const data = await response.json();
    return data.id || data.post_id || null;
  } catch (error: any) {
    console.error('Facebook posting error:', error);
    throw error;
  }
}

/**
 * Post to Instagram
 */
async function postToInstagram(
  account: SocialAccount,
  campaign: Campaign,
  customContent?: any
): Promise<string | null> {
  const caption = customContent?.caption || `${campaign.title}\n\n${campaign.copy}\n\n🔗 www.eventnexus.eu\n\n#EventNexus #Events`;
  const imageUrl = customContent?.imageUrl || campaign.imageUrl || campaign.image_url;

  if (!imageUrl) {
    throw new Error('Instagram requires an image');
  }

  try {
    // Step 1: Create container
    const containerResponse = await fetch(
      `https://graph.facebook.com/v18.0/${account.account_id}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: caption,
          access_token: account.access_token
        })
      }
    );

    if (!containerResponse.ok) {
      const error = await containerResponse.text();
      throw new Error(`Instagram container error: ${error}`);
    }

    const containerData = await containerResponse.json();
    const containerId = containerData.id;

    // Step 2: Publish container
    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${account.account_id}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: account.access_token
        })
      }
    );

    if (!publishResponse.ok) {
      const error = await publishResponse.text();
      throw new Error(`Instagram publish error: ${error}`);
    }

    const publishData = await publishResponse.json();
    return publishData.id || null;
  } catch (error: any) {
    console.error('Instagram posting error:', error);
    throw error;
  }
}

/**
 * Post to Twitter (X)
 */
async function postToTwitter(
  account: SocialAccount,
  campaign: Campaign,
  customContent?: any
): Promise<string | null> {
  // Twitter API v2 requires OAuth 1.0a - more complex
  // For now, return placeholder
  console.warn('Twitter posting not yet implemented');
  return null;
}

/**
 * Post to LinkedIn
 */
async function postToLinkedIn(
  account: SocialAccount,
  campaign: Campaign,
  customContent?: any
): Promise<string | null> {
  // LinkedIn API requires specific authentication
  // For now, return placeholder
  console.warn('LinkedIn posting not yet implemented');
  return null;
}
