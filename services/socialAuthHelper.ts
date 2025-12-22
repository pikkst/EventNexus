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
    let clientId = config[`${platform}_client_id`];
    let clientSecret = config[`${platform}_client_secret`];
    
    // Parse JSONB strings if needed
    if (typeof clientId === 'string' && clientId.startsWith('"')) {
      try { clientId = JSON.parse(clientId); } catch { /* already a plain string */ }
    }
    if (typeof clientSecret === 'string' && clientSecret.startsWith('"')) {
      try { clientSecret = JSON.parse(clientSecret); } catch { /* already a plain string */ }
    }
    
    if (!clientId || !clientSecret) {
      console.error(`OAuth config missing for ${platform}:`, { clientId: !!clientId, clientSecret: !!clientSecret });
      return null;
    }

    // Use static HTML callback page (not HashRouter route) for OAuth
    const redirectUri = `${window.location.origin}/oauth-callback.html`;

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
 * Exchange authorization code for access token
 */
const exchangeCodeForToken = async (
  platform: string,
  code: string,
  config: OAuthConfig
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  accountId?: string;
  accountName?: string;
} | null> => {
  try {
    // Facebook/Instagram use the same token exchange
    if (platform === 'facebook' || platform === 'instagram') {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `client_id=${config.clientId}&` +
        `redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
        `client_secret=${config.clientSecret}&` +
        `code=${code}`
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Token exchange error:', error);
        return null;
      }

      const data = await response.json();
      
      // For Instagram, we need the Instagram Business Account ID, not the Facebook User ID
      if (platform === 'instagram') {
        try {
          // Get Facebook Pages managed by the user
          const pagesResponse = await fetch(
            `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,instagram_business_account&access_token=${data.access_token}`
          );
          
          const pagesData = await pagesResponse.json();
          
          console.log('📄 Facebook Pages:', pagesData);
          
          if (pagesData.error) {
            console.error('Facebook API error:', pagesData.error);
            throw new Error(`Facebook API error: ${pagesData.error.message}`);
          }
          
          if (!pagesData.data || pagesData.data.length === 0) {
            console.error('❌ No Facebook Pages found');
            throw new Error('No Facebook Pages found. Create a Facebook Page first, then connect your Instagram Business Account to it.');
          }
          
          // Find the first page with an Instagram Business Account
          const pageWithInstagram = pagesData.data?.find((page: any) => page.instagram_business_account);
          
          if (pageWithInstagram?.instagram_business_account) {
            const igAccountId = pageWithInstagram.instagram_business_account.id;
            
            console.log('✅ Found Instagram Business Account:', igAccountId);
            
            // Get Instagram account details using the page's access token
            const igResponse = await fetch(
              `https://graph.facebook.com/v18.0/${igAccountId}?fields=id,username,name&access_token=${data.access_token}`
            );
            
            const igData = await igResponse.json();
            
            if (igData.error) {
              console.error('Instagram API error:', igData.error);
              throw new Error(`Instagram API error: ${igData.error.message}`);
            }
            
            console.log('📸 Instagram account:', igData);
            
            return {
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              expiresAt: data.expires_in,
              accountId: igAccountId,
              accountName: igData.username || igData.name || 'Instagram Business Account'
            };
          } else {
            console.error('❌ No Instagram Business Account found on any page');
            console.log('Available pages:', pagesData.data.map((p: any) => ({ id: p.id, name: p.name, hasIG: !!p.instagram_business_account })));
            throw new Error(
              'No Instagram Business Account found. ' +
              'Make sure your Instagram is a Business Account connected to a Facebook Page. ' +
              'Guide: https://help.instagram.com/502981923235522'
            );
          }
        } catch (error) {
          console.error('Failed to fetch Instagram Business Account:', error);
          throw error;
        }
      }
      
      // For Facebook, get user/page info
      const userResponse = await fetch(
        `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${data.access_token}`
      );
      
      const userData = userResponse.ok ? await userResponse.json() : {};

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_in,
        accountId: userData.id || 'unknown',
        accountName: userData.name || platform
      };
    }

    // Add other platforms here if needed
    return null;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return null;
  }
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
    const messageHandler = async (event: MessageEvent) => {
      if (event.data.type === 'oauth-success' && event.data.platform === platform) {
        clearInterval(interval);
        window.removeEventListener('message', messageHandler);
        popup?.close();
        
        // Exchange authorization code for access token
        try {
          const config = await getOAuthConfig(platform);
          if (!config || !event.data.code) {
            reject(new Error('Missing OAuth config or authorization code'));
            return;
          }

          // Exchange code for token
          const tokenResponse = await exchangeCodeForToken(platform, event.data.code, config);
          if (!tokenResponse) {
            reject(new Error('Failed to exchange code for access token'));
            return;
          }

          // Save account to database
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            reject(new Error('User not authenticated'));
            return;
          }

          const { error } = await supabase
            .from('social_media_accounts')
            .upsert({
              user_id: user.id,
              platform: platform,
              account_id: tokenResponse.accountId || 'unknown',
              account_name: tokenResponse.accountName || platform,
              access_token: tokenResponse.accessToken,
              refresh_token: tokenResponse.refreshToken,
              expires_at: tokenResponse.expiresAt ? new Date(Date.now() + tokenResponse.expiresAt * 1000).toISOString() : null,
              is_connected: true,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,platform,account_id'
            });

          if (error) {
            console.error('Error saving social account:', error);
            reject(new Error('Failed to save account to database'));
            return;
          }

          resolve();
        } catch (error) {
          console.error('OAuth exchange error:', error);
          reject(error);
        }
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
      .maybeSingle();

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
    
    // Map snake_case database columns to camelCase TypeScript properties
    return (data || []).map(account => ({
      platform: account.platform as any,
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
