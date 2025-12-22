/**
 * Social Media Posting Service
 * Handles posting promotional content to various social media platforms
 */

import { supabase } from './supabase';
import { generateAdImage } from './geminiService';

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
    hashtags?: string[];
    imageUrl?: string;
    eventUrl?: string;
    trackingUrl?: string;
    trackingCode?: string;
  };
  instagram?: {
    caption: string;
    hashtags: string[];
    imageUrl?: string;
    trackingUrl?: string;
    trackingCode?: string;
  };
  twitter?: {
    tweet: string;
    hashtags: string[];
    imageUrl?: string;
    trackingUrl?: string;
    trackingCode?: string;
  };
  linkedin?: {
    content: string;
    imageUrl?: string;
    trackingUrl?: string;
    trackingCode?: string;
  };
}

/**
 * Generate platform-specific social media content with AI images and unique tracking codes
 * Each platform gets optimized image size and unique tracking code to measure conversions
 */
export const generateSocialMediaContentWithImages = async (
  campaignTitle: string,
  campaignCopy: string,
  campaignCta: string,
  baseTrackingCode: string,
  visualPrompt: string
): Promise<CampaignSocialPosts> => {
  const baseUrl = 'https://eventnexus.eu';
  
  // Generate platform-specific tracking codes
  const facebookTrackingCode = `${baseTrackingCode}-FB`;
  const instagramTrackingCode = `${baseTrackingCode}-IG`;
  const twitterTrackingCode = `${baseTrackingCode}-TW`;
  const linkedinTrackingCode = `${baseTrackingCode}-LI`;
  
  // Generate platform-specific tracking URLs
  const facebookUrl = `${baseUrl}?utm_source=facebook&utm_campaign=${facebookTrackingCode}`;
  const instagramUrl = `${baseUrl}?utm_source=instagram&utm_campaign=${instagramTrackingCode}`;
  const twitterUrl = `${baseUrl}?utm_source=twitter&utm_campaign=${twitterTrackingCode}`;
  const linkedinUrl = `${baseUrl}?utm_source=linkedin&utm_campaign=${linkedinTrackingCode}`;
  
  // Generate images for each platform in optimal size
  console.log('🎨 Generating platform-specific images...');
  const [facebookImage, instagramImage, twitterImage, linkedinImage] = await Promise.all([
    generateAdImage(visualPrompt, '16:9', true), // Facebook - landscape
    generateAdImage(visualPrompt, '1:1', true),  // Instagram - square
    generateAdImage(visualPrompt, '16:9', true), // Twitter - landscape
    generateAdImage(visualPrompt, '16:9', true)  // LinkedIn - landscape
  ]);

  return {
    facebook: {
      content: `🎉 ${campaignTitle}\n\n${campaignCopy}\n\n${campaignCta} 👉`,
      hashtags: ['EventNexus', 'Events', 'Community'],
      imageUrl: facebookImage || undefined,
      trackingUrl: facebookUrl,
      trackingCode: facebookTrackingCode
    },
    instagram: {
      caption: `${campaignTitle}\n\n${campaignCopy}\n\n${campaignCta} - Link in bio! 💫`,
      hashtags: ['EventNexus', 'Events', 'Community', 'EventPlanning', 'LocalEvents'],
      imageUrl: instagramImage || undefined,
      trackingUrl: instagramUrl,
      trackingCode: instagramTrackingCode
    },
    twitter: {
      tweet: `${campaignTitle}\n\n${campaignCopy}\n\n${campaignCta} 👇`,
      hashtags: ['EventNexus', 'Events'],
      imageUrl: twitterImage || undefined,
      trackingUrl: twitterUrl,
      trackingCode: twitterTrackingCode
    },
    linkedin: {
      content: `${campaignTitle}\n\n${campaignCopy}\n\n${campaignCta}\n\nDiscover events that matter.`,
      imageUrl: linkedinImage || undefined,
      trackingUrl: linkedinUrl,
      trackingCode: linkedinTrackingCode
    }
  };
};

/**
 * Generate platform-specific social media content from campaign data (legacy - without images)
 */
export const generateSocialMediaContent = (
  campaignTitle: string,
  campaignCopy: string,
  campaignCta: string,
  trackingCode: string
): CampaignSocialPosts => {
  const baseUrl = 'https://eventnexus.eu';
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
  imageUrl?: string,
  eventUrl?: string
): Promise<{ success: boolean; postId?: string; error?: string }> => {
  try {
    console.log('📘 Facebook posting (NEW API):', { pageId, hasImage: !!imageUrl, hasEventUrl: !!eventUrl });
    
    if (!pageId) {
      throw new Error('Facebook Page ID is required');
    }

    // Use /feed endpoint for all posts (with or without image)
    const postData: any = {
      message: content,
      access_token: accessToken
    };

    // Add image URL (Facebook will fetch and display it)
    if (imageUrl) {
      postData.link = imageUrl;
      console.log('📷 Adding image:', imageUrl);
    } else if (eventUrl) {
      // If no image, add event URL as link
      postData.link = eventUrl;
    }

    console.log('📤 Posting to Facebook /feed endpoint...');
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/feed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      }
    );

    const result = await response.json();
    
    console.log('📊 Facebook API response:', {
      status: response.status,
      ok: response.ok,
      hasError: !!result.error,
      hasId: !!result.id,
      result: result
    });
    
    if (result.error) {
      console.error('❌ Facebook API error details:', {
        code: result.error.code,
        type: result.error.type,
        message: result.error.message,
        fbtrace_id: result.error.fbtrace_id
      });
      
      // Check if token expired
      if (result.error.code === 190) {
        throw new Error('Facebook access token has expired. Please reconnect your Facebook account.');
      }
      
      throw new Error(result.error.message || 'Facebook posting failed');
    }

    console.log('✅ Posted to Facebook:', result.id);
    return {
      success: true,
      postId: result.id,
      error: undefined
    };
  } catch (error) {
    console.error('❌ Facebook posting error (caught):', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Post to Instagram using Instagram Graph API
 */
export const postToInstagram = async (
  accessToken: string,
  accountId: string,
  caption: string,
  imageUrl: string
): Promise<{ success: boolean; postId?: string; error?: string }> => {
  try {
    console.log('📸 Instagram posting:', { accountId, hasImage: !!imageUrl });
    
    if (!accountId) {
      throw new Error('Instagram Business Account ID is required');
    }

    // Step 1: Create media container
    const containerResponse = await fetch(
      `https://graph.facebook.com/v18.0/${accountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: caption,
          access_token: accessToken
        })
      }
    );

    const containerResult = await containerResponse.json();
    
    if (containerResult.error) {
      console.error('Instagram container creation error:', containerResult.error);
      throw new Error(containerResult.error.message || 'Failed to create Instagram media container');
    }

    console.log('✅ Instagram container created:', containerResult.id);

    // Step 2: Wait for container to be ready (Instagram needs time to process image)
    console.log('⏳ Waiting for Instagram to process media container...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds

    // Step 2.5: Check container status
    const statusResponse = await fetch(
      `https://graph.facebook.com/v18.0/${containerResult.id}?fields=status_code&access_token=${accessToken}`
    );
    const statusResult = await statusResponse.json();
    console.log('📊 Container status:', statusResult);

    if (statusResult.status_code !== 'FINISHED' && statusResult.status_code !== 'IN_PROGRESS') {
      throw new Error(`Container not ready: ${statusResult.status_code || 'unknown status'}`);
    }

    // Step 3: Publish the media container
    console.log('📤 Publishing Instagram post...');
    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${accountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerResult.id,
          access_token: accessToken
        })
      }
    );

    const publishResult = await publishResponse.json();
    
    if (publishResult.error) {
      console.error('❌ Instagram publish error:', publishResult.error);
      throw new Error(publishResult.error.message || 'Failed to publish Instagram post');
    }

    console.log('✅ Posted to Instagram:', publishResult.id);
    return {
      success: true,
      postId: publishResult.id,
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
