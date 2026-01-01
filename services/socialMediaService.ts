/**
 * Social Media Posting Service
 * Handles posting promotional content to various social media platforms
 */

import { supabase } from './supabase';
import { generateAdImage } from './geminiService';

// Publicly hosted fallback image to avoid Graph API 324 errors when an asset is missing
const FALLBACK_AD_IMAGE_URL = 'https://www.eventnexus.eu/EventNexus/logo%20for%20eventnexus.png';

/**
 * Check if image URL is accessible by Instagram
 */
const isValidInstagramImageUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Instagram can't fetch from non-HTTPS URLs
  if (!url.startsWith('https://')) return false;
  
  // Known problematic URLs
  const invalidPatterns = [
    'og-image.png', // Placeholder that doesn't exist
    'localhost',
    '127.0.0.1',
    'file://',
  ];
  
  return !invalidPatterns.some(pattern => url.includes(pattern));
};

const isImageError = (code?: number, message?: string) => {
  if (!code && !message) return false;
  const normalized = (message || '').toLowerCase();
  return code === 324 || code === 100 || code === 2069019 || normalized.includes('image');
};

const resolveImageUrlWithFallback = async (
  imageUrl?: string,
  requireImage = false
): Promise<{ url: string | null; isFallback: boolean }> => {
  if (!imageUrl) {
    return { url: requireImage ? FALLBACK_AD_IMAGE_URL : null, isFallback: requireImage };
  }

  if (imageUrl.startsWith('data:')) {
    const publicUrl = await uploadDataUrlToSupabase(imageUrl);
    if (publicUrl) {
      return { url: publicUrl, isFallback: false };
    }

    return { url: requireImage ? FALLBACK_AD_IMAGE_URL : null, isFallback: requireImage };
  }

  return { url: imageUrl, isFallback: false };
};

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// Upload base64 data URL to Supabase Storage to obtain a public URL (used for Instagram)
const uploadDataUrlToSupabase = async (dataUrl: string): Promise<string | null> => {
  try {
    const [, base64] = dataUrl.split(',');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const file = new Blob([bytes], { type: 'image/png' });
    const filePath = `instagram/${makeId()}.png`;
    const { error: uploadError } = await supabase.storage
      .from('social-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/png'
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage.from('social-media').getPublicUrl(filePath);
    return data?.publicUrl || null;
  } catch (error) {
    console.error('Failed to upload image to Supabase:', error);
    return null;
  }
};

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
  // Validate and fix image URL if needed
  if (imageUrl && !isValidInstagramImageUrl(imageUrl)) {
    console.warn('⚠️ Invalid Facebook image URL detected, using fallback:', imageUrl);
    imageUrl = FALLBACK_AD_IMAGE_URL;
  }

  type FacebookResult = {
    success: boolean;
    postId?: string;
    errorCode?: number;
    errorMessage?: string;
    fbtraceId?: string;
  };

  const postPhoto = async (photoUrl: string): Promise<FacebookResult> => {
    try {
      const photoData: any = {
        url: photoUrl,
        message: content,
        access_token: accessToken
      };

      if (eventUrl) {
        photoData.link = eventUrl;
      }

      console.log('📤 Posting photo URL to Facebook...', { pageId, photoUrl });
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}/photos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(photoData)
        }
      );

      const result = await response.json();

      if (result.error) {
        console.error('❌ Facebook API error:', result.error);
        return {
          success: false,
          errorCode: result.error.code,
          errorMessage: result.error.message,
          fbtraceId: result.error.fbtrace_id
        };
      }

      console.log('✅ Posted photo to Facebook with tracking link:', result.id);
      return { success: true, postId: result.id };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Facebook photo posting failed'
      };
    }
  };

  const postTextOnly = async (): Promise<FacebookResult> => {
    try {
      const postData: any = {
        message: content,
        access_token: accessToken
      };

      if (eventUrl) {
        postData.link = eventUrl;
      }

      console.log('📤 Posting to Facebook /feed endpoint (text only)...');
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}/feed`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData)
        }
      );

      const result = await response.json();

      if (result.error) {
        console.error('❌ Facebook API error details:', result.error);
        return {
          success: false,
          errorCode: result.error.code,
          errorMessage: result.error.message,
          fbtraceId: result.error.fbtrace_id
        };
      }

      console.log('✅ Posted to Facebook:', result.id);
      return { success: true, postId: result.id };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Facebook posting failed'
      };
    }
  };

  try {
    console.log('📘 Facebook posting (NEW API):', { pageId, hasImage: !!imageUrl, hasEventUrl: !!eventUrl });

    if (!pageId) {
      throw new Error('Facebook Page ID is required');
    }

    if (imageUrl) {
      const { url: resolvedImageUrl, isFallback } = await resolveImageUrlWithFallback(imageUrl, false);

      if (resolvedImageUrl) {
        const primaryResult = await postPhoto(resolvedImageUrl);

        if (!primaryResult.success && !isFallback && isImageError(primaryResult.errorCode, primaryResult.errorMessage)) {
          console.warn('⚠️ Facebook image rejected, retrying with fallback logo');
          const fallbackResult = await postPhoto(FALLBACK_AD_IMAGE_URL);
          if (fallbackResult.success) {
            return { success: true, postId: fallbackResult.postId };
          }

          return {
            success: false,
            error: fallbackResult.errorMessage || primaryResult.errorMessage || 'Facebook photo posting failed'
          };
        }

        return primaryResult.success
          ? { success: true, postId: primaryResult.postId }
          : { success: false, error: primaryResult.errorMessage || 'Facebook photo posting failed' };
      }
    }

    const textResult = await postTextOnly();
    return textResult.success
      ? { success: true, postId: textResult.postId }
      : { success: false, error: textResult.errorMessage || 'Facebook posting failed' };
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
  type InstagramResult = {
    success: boolean;
    postId?: string;
    errorCode?: number;
    errorMessage?: string;
  };

  // Validate image URL before attempting to post
  if (!isValidInstagramImageUrl(imageUrl)) {
    console.warn('⚠️ Invalid Instagram image URL:', imageUrl);
    console.log('🔄 Using fallback image:', FALLBACK_AD_IMAGE_URL);
    imageUrl = FALLBACK_AD_IMAGE_URL;
  }

  const publishInstagram = async (photoUrl: string): Promise<InstagramResult> => {
    try {
      console.log('📸 Instagram posting:', { accountId, photoUrl });

      // Step 1: Create media container
      const containerResponse = await fetch(
        `https://graph.facebook.com/v18.0/${accountId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: photoUrl,
            caption: caption,
            access_token: accessToken
          })
        }
      );

      const containerResult = await containerResponse.json();

      if (containerResult.error) {
        console.error('Instagram container creation error:', containerResult.error);
        return {
          success: false,
          errorCode: containerResult.error.code,
          errorMessage: containerResult.error.message
        };
      }

      console.log('✅ Instagram container created:', containerResult.id);

      // Step 2: Wait for container to be ready (Instagram needs time to process image)
      console.log('⏳ Waiting for Instagram to process media container...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 2.5: Check container status
      const statusResponse = await fetch(
        `https://graph.facebook.com/v18.0/${containerResult.id}?fields=status_code&access_token=${accessToken}`
      );
      const statusResult = await statusResponse.json();
      console.log('📊 Container status:', statusResult);

      if (statusResult.error) {
        return {
          success: false,
          errorCode: statusResult.error.code,
          errorMessage: statusResult.error.message
        };
      }

      if (statusResult.status_code !== 'FINISHED' && statusResult.status_code !== 'IN_PROGRESS') {
        return {
          success: false,
          errorMessage: `Container not ready: ${statusResult.status_code || 'unknown status'}`
        };
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
        return {
          success: false,
          errorCode: publishResult.error.code,
          errorMessage: publishResult.error.message
        };
      }

      console.log('✅ Posted to Instagram:', publishResult.id);
      return { success: true, postId: publishResult.id };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Failed to publish Instagram post'
      };
    }
  };

  try {
    if (!accountId) {
      throw new Error('Instagram Business Account ID is required');
    }

    const { url: finalImageUrl, isFallback } = await resolveImageUrlWithFallback(imageUrl, true);

    if (!finalImageUrl) {
      throw new Error('Instagram requires an image');
    }

    const firstAttempt = await publishInstagram(finalImageUrl);

    if (!firstAttempt.success && !isFallback && isImageError(firstAttempt.errorCode, firstAttempt.errorMessage)) {
      console.warn('⚠️ Instagram image rejected, retrying with fallback logo');
      const fallbackAttempt = await publishInstagram(FALLBACK_AD_IMAGE_URL);

      if (fallbackAttempt.success) {
        return { success: true, postId: fallbackAttempt.postId };
      }

      return {
        success: false,
        error: fallbackAttempt.errorMessage || firstAttempt.errorMessage || 'Failed to publish Instagram post'
      };
    }

    return firstAttempt.success
      ? { success: true, postId: firstAttempt.postId }
      : { success: false, error: firstAttempt.errorMessage || 'Failed to publish Instagram post' };
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
