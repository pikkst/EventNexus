/**
 * Social Media OAuth Integration Helper
 * Simplifies connecting social media accounts to EventNexus
 */

import { supabase } from './supabase';
import { getSystemConfig } from './dbService';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
}

export interface ConnectedAccount {
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin';
  accountId: string;
  accountName: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  isConnected: boolean;
}

/**
 * Get OAuth configuration from system config
 */
const getOAuthConfig = async (platform: string): Promise<OAuthConfig | null> => {
  try {
    const config = await getSystemConfig();
    const clientId = config[`${platform}_client_id`];
    const clientSecret = config[`${platform}_client_secret`];
    
    if (!clientId || !clientSecret) {
      console.error(`OAuth config missing for ${platform}`);
      return null;
    }

    const redirectUri = `${window.location.origin}/admin/social-callback`;

    // Platform-specific scopes
    const scopes: Record<string, string> = {
      facebook: 'pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish',
      instagram: 'instagram_basic,instagram_content_publish',
      twitter: 'tweet.read,tweet.write,users.read,offline.access',
      linkedin: 'w_member_social,r_liteprofile'
    };

    return {
      clientId: String(clientId),
      clientSecret: String(clientSecret),
      redirectUri,
      scope: scopes[platform] || ''
    };
  } catch (error) {
    console.error('Error getting OAuth config:', error);
    return null;
  }
};

/**
 * Generate OAuth authorization URL for a platform
 */
export const getAuthorizationUrl = async (
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin'
): Promise<string | null> => {
  const config = await getOAuthConfig(platform);
  if (!config) return null;

  const authUrls: Record<string, string> = {
    facebook: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&scope=${config.scope}&state=${platform}`,
    instagram: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&scope=${config.scope}&state=${platform}`,
    twitter: `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&scope=${encodeURIComponent(config.scope)}&state=${platform}&code_challenge=challenge&code_challenge_method=plain`,
    linkedin: `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&scope=${config.scope}&state=${platform}`
  };

  return authUrls[platform] || null;
};

/**
 * Connect a social media account (opens OAuth flow)
 */
export const connectSocialAccount = async (
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin'
): Promise<void> => {
  const authUrl = await getAuthorizationUrl(platform);
  if (!authUrl) {
    throw new Error(`Failed to generate authorization URL for ${platform}`);
  }

  // Open OAuth flow in popup
  const width = 600;
  const height = 700;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;

  const popup = window.open(
    authUrl,
    `Connect ${platform}`,
    `width=${width},height=${height},left=${left},top=${top}`
  );

  // Poll for popup close or message
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (popup?.closed) {
        clearInterval(interval);
        // Check if connection was successful
        checkConnectionStatus(platform).then(connected => {
          if (connected) {
            resolve();
          } else {
            reject(new Error('Connection cancelled or failed'));
          }
        });
      }
    }, 500);

    // Listen for OAuth callback message
    const messageHandler = (event: MessageEvent) => {
      if (event.data.type === 'oauth-success' && event.data.platform === platform) {
        clearInterval(interval);
        window.removeEventListener('message', messageHandler);
        popup?.close();
        resolve();
      } else if (event.data.type === 'oauth-error') {
        clearInterval(interval);
        window.removeEventListener('message', messageHandler);
        popup?.close();
        reject(new Error(event.data.error || 'OAuth failed'));
      }
    };

    window.addEventListener('message', messageHandler);

    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(interval);
      window.removeEventListener('message', messageHandler);
      if (popup && !popup.closed) {
        popup.close();
      }
      reject(new Error('OAuth timeout'));
    }, 300000);
  });
};

/**
 * Check if a platform is connected
 */
export const checkConnectionStatus = async (
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin'
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('social_media_accounts')
      .select('is_connected')
      .eq('platform', platform)
      .eq('is_connected', true)
      .single();

    return !error && data?.is_connected === true;
  } catch {
    return false;
  }
};

/**
 * Get connected accounts
 */
export const getConnectedAccounts = async (): Promise<ConnectedAccount[]> => {
  try {
    const { data, error } = await supabase
      .from('social_media_accounts')
      .select('*')
      .eq('is_connected', true);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching connected accounts:', error);
    return [];
  }
};

/**
 * Disconnect a social media account
 */
export const disconnectSocialAccount = async (
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin'
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('social_media_accounts')
      .update({ is_connected: false, access_token: null, refresh_token: null })
      .eq('platform', platform);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error disconnecting account:', error);
    return false;
  }
};

/**
 * Simplified publish to all connected platforms
 */
export const publishToConnectedPlatforms = async (content: {
  facebook?: { content: string; imageUrl?: string };
  instagram?: { caption: string; imageUrl: string };
  twitter?: { tweet: string; imageUrl?: string };
  linkedin?: { content: string; imageUrl?: string };
}): Promise<{
  facebook?: { success: boolean; postId?: string; error?: string };
  instagram?: { success: boolean; postId?: string; error?: string };
  twitter?: { success: boolean; postId?: string; error?: string };
  linkedin?: { success: boolean; postId?: string; error?: string };
}> => {
  const results: any = {};
  const connectedAccounts = await getConnectedAccounts();

  for (const account of connectedAccounts) {
    const platformContent = content[account.platform];
    if (!platformContent) continue;

    try {
      // Import platform-specific posting function
      const { postToFacebook, postToInstagram, postToTwitter, postToLinkedIn } = await import('./socialMediaService');

      switch (account.platform) {
        case 'facebook':
          if ('content' in platformContent) {
            results.facebook = await postToFacebook(
              account.accessToken,
              account.accountId,
              platformContent.content,
              platformContent.imageUrl
            );
          }
          break;
        case 'instagram':
          if ('caption' in platformContent && platformContent.imageUrl) {
            results.instagram = await postToInstagram(
              account.accessToken,
              account.accountId,
              platformContent.caption,
              platformContent.imageUrl
            );
          }
          break;
        case 'twitter':
          if ('tweet' in platformContent) {
            results.twitter = await postToTwitter(
              account.accessToken,
              platformContent.tweet,
              platformContent.imageUrl
            );
          }
          break;
        case 'linkedin':
          if ('content' in platformContent) {
            results.linkedin = await postToLinkedIn(
              account.accessToken,
              account.accountId,
              platformContent.content,
              platformContent.imageUrl
            );
          }
          break;
      }
    } catch (error) {
      results[account.platform] = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  return results;
};

/**
 * Quick connect - one-click setup for all platforms
 */
export const quickConnectAll = async (): Promise<void> => {
  const platforms: Array<'facebook' | 'instagram' | 'twitter' | 'linkedin'> = [
    'facebook',
    'instagram',
    'twitter',
    'linkedin'
  ];

  for (const platform of platforms) {
    const isConnected = await checkConnectionStatus(platform);
    if (!isConnected) {
      try {
        console.log(`Connecting ${platform}...`);
        await connectSocialAccount(platform);
        console.log(`✅ ${platform} connected`);
      } catch (error) {
        console.error(`❌ Failed to connect ${platform}:`, error);
      }
    } else {
      console.log(`✓ ${platform} already connected`);
    }
  }
};
