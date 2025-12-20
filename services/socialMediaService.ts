/**
 * Social Media Posting Service
 * Handles posting promotional content to various social media platforms
 */

import { supabase } from './supabase';

export interface SocialMediaPost {
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin';
  content: string;
  imageUrl?: string;
  scheduledAt?: string;
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
}

export interface SocialMediaAccount {
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin';
  accountId: string;
  accountName: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  isConnected: boolean;
}

export interface CampaignSocialPosts {
  facebook?: {
    content: string;
    hashtags: string[];
    imageUrl?: string;
  };
  instagram?: {
    caption: string;
    hashtags: string[];
    imageUrl?: string;
  };
  twitter?: {
    tweet: string;
    hashtags: string[];
    imageUrl?: string;
  };
  linkedin?: {
    content: string;
    imageUrl?: string;
  };
}

/**
 * Generate platform-specific social media content from campaign data
 */
export const generateSocialMediaContent = (
  campaignTitle: string,
  campaignCopy: string,
  campaignCta: string,
  trackingCode: string
): CampaignSocialPosts => {
  const baseUrl = 'https://pikkst.github.io/EventNexus';
  const trackingUrl = `${baseUrl}?utm_source=social&utm_campaign=${trackingCode}`;

  return {
    facebook: {
      content: `🎉 ${campaignTitle}\n\n${campaignCopy}\n\n${campaignCta} 👉 ${trackingUrl}`,
      hashtags: ['EventNexus', 'Events', 'Community'],
      imageUrl: undefined
    },
    instagram: {
      caption: `${campaignTitle}\n\n${campaignCopy}\n\n${campaignCta} - Link in bio!\n\n`,
      hashtags: ['EventNexus', 'Events', 'Community', 'EventPlanning', 'LocalEvents'],
      imageUrl: undefined
    },
    twitter: {
      tweet: `${campaignTitle}\n\n${campaignCopy}\n\n${campaignCta} 👇\n${trackingUrl}`,
      hashtags: ['EventNexus', 'Events'],
      imageUrl: undefined
    },
    linkedin: {
      content: `${campaignTitle}\n\n${campaignCopy}\n\n${campaignCta}\n\n${trackingUrl}`,
      imageUrl: undefined
    }
  };
};

/**
 * Post to Facebook (placeholder - requires Facebook Graph API setup)
 */
export const postToFacebook = async (
  accessToken: string,
  pageId: string,
  content: string,
  imageUrl?: string
): Promise<{ success: boolean; postId?: string; error?: string }> => {
  try {
    // This would call Facebook Graph API
    // POST https://graph.facebook.com/v18.0/{page-id}/feed
    console.log('Facebook posting would happen here:', { pageId, content, imageUrl });
    
    // Placeholder response
    return {
      success: true,
      postId: `fb_${Date.now()}`,
      error: undefined
    };
  } catch (error) {
    console.error('Facebook posting error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Post to Instagram (placeholder - requires Instagram Graph API setup)
 */
export const postToInstagram = async (
  accessToken: string,
  accountId: string,
  caption: string,
  imageUrl: string
): Promise<{ success: boolean; postId?: string; error?: string }> => {
  try {
    // This would call Instagram Graph API
    // Requires media upload first, then container creation
    console.log('Instagram posting would happen here:', { accountId, caption, imageUrl });
    
    return {
      success: true,
      postId: `ig_${Date.now()}`,
      error: undefined
    };
  } catch (error) {
    console.error('Instagram posting error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Post to Twitter/X (placeholder - requires Twitter API v2 setup)
 */
export const postToTwitter = async (
  accessToken: string,
  tweet: string,
  imageUrl?: string
): Promise<{ success: boolean; postId?: string; error?: string }> => {
  try {
    // This would call Twitter API v2
    // POST https://api.twitter.com/2/tweets
    console.log('Twitter posting would happen here:', { tweet, imageUrl });
    
    return {
      success: true,
      postId: `tw_${Date.now()}`,
      error: undefined
    };
  } catch (error) {
    console.error('Twitter posting error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Post to LinkedIn (placeholder - requires LinkedIn API setup)
 */
export const postToLinkedIn = async (
  accessToken: string,
  personUrn: string,
  content: string,
  imageUrl?: string
): Promise<{ success: boolean; postId?: string; error?: string }> => {
  try {
    // This would call LinkedIn API
    // POST https://api.linkedin.com/v2/ugcPosts
    console.log('LinkedIn posting would happen here:', { personUrn, content, imageUrl });
    
    return {
      success: true,
      postId: `li_${Date.now()}`,
      error: undefined
    };
  } catch (error) {
    console.error('LinkedIn posting error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Schedule a social media post
 */
export const scheduleSocialPost = async (
  userId: string,
  campaignId: string,
  post: SocialMediaPost
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('social_media_posts')
      .insert({
        user_id: userId,
        campaign_id: campaignId,
        platform: post.platform,
        content: post.content,
        image_url: post.imageUrl,
        scheduled_at: post.scheduledAt,
        status: post.status
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error scheduling social post:', error);
    return false;
  }
};

/**
 * Get connected social media accounts for a user
 */
export const getConnectedAccounts = async (userId: string): Promise<SocialMediaAccount[]> => {
  try {
    const { data, error } = await supabase
      .from('social_media_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_connected', true);

    if (error) throw error;
    
    return (data || []).map(account => ({
      platform: account.platform,
      accountId: account.account_id,
      accountName: account.account_name,
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
      expiresAt: account.expires_at,
      isConnected: account.is_connected
    }));
  } catch (error) {
    console.error('Error fetching connected accounts:', error);
    return [];
  }
};

/**
 * Bulk post campaign to all connected platforms
 */
export const bulkPostCampaign = async (
  userId: string,
  campaignId: string,
  socialContent: CampaignSocialPosts,
  imageUrl?: string
): Promise<{
  facebook?: { success: boolean; postId?: string };
  instagram?: { success: boolean; postId?: string };
  twitter?: { success: boolean; postId?: string };
  linkedin?: { success: boolean; postId?: string };
}> => {
  const accounts = await getConnectedAccounts(userId);
  const results: any = {};

  for (const account of accounts) {
    let result;
    
    switch (account.platform) {
      case 'facebook':
        if (socialContent.facebook) {
          result = await postToFacebook(
            account.accessToken,
            account.accountId,
            socialContent.facebook.content,
            imageUrl || socialContent.facebook.imageUrl
          );
          results.facebook = result;
        }
        break;
        
      case 'instagram':
        if (socialContent.instagram && imageUrl) {
          result = await postToInstagram(
            account.accessToken,
            account.accountId,
            socialContent.instagram.caption,
            imageUrl
          );
          results.instagram = result;
        }
        break;
        
      case 'twitter':
        if (socialContent.twitter) {
          result = await postToTwitter(
            account.accessToken,
            socialContent.twitter.tweet,
            imageUrl || socialContent.twitter.imageUrl
          );
          results.twitter = result;
        }
        break;
        
      case 'linkedin':
        if (socialContent.linkedin) {
          result = await postToLinkedIn(
            account.accessToken,
            account.accountId,
            socialContent.linkedin.content,
            imageUrl || socialContent.linkedin.imageUrl
          );
          results.linkedin = result;
        }
        break;
    }
  }

  return results;
};

/**
 * Preview social media posts for a campaign
 */
export const previewCampaignPosts = (
  campaignTitle: string,
  campaignCopy: string,
  campaignCta: string,
  trackingCode: string,
  imageUrl?: string
): CampaignSocialPosts => {
  const posts = generateSocialMediaContent(campaignTitle, campaignCopy, campaignCta, trackingCode);
  
  // Add image URL to all platforms
  if (imageUrl) {
    if (posts.facebook) posts.facebook.imageUrl = imageUrl;
    if (posts.instagram) posts.instagram.imageUrl = imageUrl;
    if (posts.twitter) posts.twitter.imageUrl = imageUrl;
    if (posts.linkedin) posts.linkedin.imageUrl = imageUrl;
  }
  
  return posts;
};
