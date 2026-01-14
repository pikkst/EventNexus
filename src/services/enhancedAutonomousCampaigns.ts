/**
 * Enhanced Autonomous Campaign Service with Error Handling & Analytics
 * 
 * Integrates comprehensive error handling, fallback mechanisms,
 * social media tracking, and real-time analytics
 */

import { supabase } from './supabase';
import {
  logAutonomousError,
  trackSocialMediaPost,
  updatePostStatus,
  recordCampaignPerformance,
  getCampaignAnalytics,
  withErrorHandling,
  categorizeError,
  isTokenExpiredError,
  type CampaignMetrics
} from './autonomousErrorHandling';

// ============================================================
// Enhanced Social Media Posting with Error Handling
// ============================================================

/**
 * Post campaign to social media with comprehensive error handling
 * Returns success status and error details if failed
 */
export async function postCampaignToSocialMedia(
  campaignId: string,
  platform: 'facebook' | 'instagram',
  postContent: string,
  imageUrl?: string
): Promise<{ success: boolean; postId?: string; error?: any }> {
  
  // Create tracking record
  const trackingId = await trackSocialMediaPost(
    campaignId,
    platform,
    postContent,
    imageUrl
  );

  if (!trackingId) {
    return {
      success: false,
      error: { message: 'Failed to create tracking record' }
    };
  }

  try {
    // Call social media API (Facebook/Instagram)
    // This is where actual posting happens
    const result = await withErrorHandling(
      'social_posting',
      async () => {
        // TODO: Implement actual Facebook/Instagram API call
        // For now, simulate the call
        
        // Get social media credentials
        const { data: creds, error: credsError } = await supabase
          .from('social_media_accounts')
          .select('*')
          .eq('platform', platform)
          .eq('is_active', true)
          .single();

        if (credsError || !creds) {
          throw new Error(`No active ${platform} account configured`);
        }

        if (!creds.access_token) {
          throw new Error(`${platform} access token missing`);
        }

        // Check if token is expired (based on expires_at)
        if (creds.expires_at && new Date(creds.expires_at) < new Date()) {
          const error = new Error('Token has expired');
          (error as any).code = '190'; // Facebook token expired code
          throw error;
        }

        // Simulate API call
        // In production, use actual Facebook/Instagram Graph API
        console.log(`📱 Posting to ${platform}:`, postContent.substring(0, 50) + '...');
        
        // Return mock success for now
        return {
          post_id: 'mock_post_' + Date.now(),
          post_url: `https://${platform}.com/posts/mock_post_${Date.now()}`
        };
      },
      campaignId
    );

    if (result) {
      // Success - update tracking
      await updatePostStatus(
        trackingId,
        'posted',
        result.post_id,
        result.post_url
      );

      console.log(`✅ Successfully posted to ${platform}`);
      return {
        success: true,
        postId: result.post_id
      };
    } else {
      // Operation returned null (error handled internally)
      await updatePostStatus(
        trackingId,
        'failed',
        undefined,
        undefined,
        'unknown_error',
        'Operation failed without specific error'
      );

      return {
        success: false,
        error: { message: 'Posting failed' }
      };
    }
  } catch (error: any) {
    console.error(`❌ Error posting to ${platform}:`, error);

    // Categorize error
    const errorType = categorizeError(error);
    const errorMessage = error.message || 'Unknown error';

    // Update tracking with error details
    await updatePostStatus(
      trackingId,
      'failed',
      undefined,
      undefined,
      errorType,
      errorMessage,
      {
        stack: error.stack,
        code: error.code,
        response: error.response?.data
      }
    );

    // If token expired, notify admin immediately
    if (isTokenExpiredError(error)) {
      await logAutonomousError(
        'social_posting',
        'token_expired',
        `${platform} token expired. Please reconnect ${platform} account in settings.`,
        {
          platform,
          tracking_id: trackingId,
          error: error.message
        },
        campaignId,
        true // Notify admin
      );
    }

    return {
      success: false,
      error: {
        type: errorType,
        message: errorMessage,
        details: error
      }
    };
  }
}

// ============================================================
// Enhanced Campaign Creation with Error Handling
// ============================================================

/**
 * Create autonomous campaign with comprehensive error handling
 */
export async function createAutonomousCampaignWithTracking(
  theme: string,
  targetAudience: string,
  adminUserId: string
): Promise<{ success: boolean; campaignId?: string; error?: any }> {
  
  return await withErrorHandling(
    'campaign_creation',
    async () => {
      // Import campaign creation logic
      const { createAutonomousCampaign } = await import('./intelligentMarketingService');
      
      // Create campaign
      const campaign = await createAutonomousCampaign(
        theme,
        targetAudience,
        adminUserId
      );

      if (!campaign) {
        throw new Error('Campaign creation returned null');
      }

      // Initialize performance metrics
      await recordCampaignPerformance(campaign.id, {
        views: 0,
        clicks: 0,
        ctr: 0,
        new_signups: 0,
        new_organizers: 0,
        new_events_created: 0,
        tickets_sold: 0,
        gross_revenue: 0,
        net_revenue: 0,
        ad_spend: 0,
        ai_generation_cost: 0.05, // Estimate $0.05 per AI generation
        total_cost: 0.05,
        roi: 0,
        roas: 0,
        cost_per_signup: 0,
        cost_per_organizer: 0,
        social_shares: 0,
        social_comments: 0,
        social_likes: 0,
        source: 'autonomous_system'
      });

      console.log(`✅ Campaign created with tracking: ${campaign.id}`);
      
      return {
        success: true,
        campaignId: campaign.id
      };
    },
    undefined, // No campaign ID yet
    { success: false, error: { message: 'Campaign creation failed' } }
  );
}

// ============================================================
// Campaign Performance Update
// ============================================================

/**
 * Update campaign performance from external sources (analytics, social media APIs)
 */
export async function updateCampaignPerformanceFromSource(
  campaignId: string,
  source: 'facebook' | 'instagram' | 'google_analytics' | 'manual',
  metrics: Partial<CampaignMetrics>
): Promise<boolean> {
  try {
    await recordCampaignPerformance(campaignId, {
      ...metrics,
      source
    });

    console.log(`✅ Performance updated for campaign ${campaignId} from ${source}`);
    return true;
  } catch (error) {
    console.error('Error updating campaign performance:', error);
    await logAutonomousError(
      'campaign_optimization',
      'api_error',
      `Failed to update performance from ${source}`,
      { error: (error as Error).message },
      campaignId,
      false // Don't notify for individual metric update failures
    );
    return false;
  }
}

// ============================================================
// Automated Campaign Monitoring
// ============================================================

/**
 * Monitor all active campaigns and update their performance
 * This should run periodically (e.g., every hour)
 */
export async function monitorActiveCampaigns(): Promise<void> {
  console.log('🔍 Monitoring active campaigns...');

  try {
    // Get all active campaigns
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('id, title, created_at, target_audience')
      .eq('status', 'Active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!campaigns || campaigns.length === 0) {
      console.log('ℹ️ No active campaigns to monitor');
      return;
    }

    console.log(`📊 Monitoring ${campaigns.length} active campaigns...`);

    // Monitor each campaign
    for (const campaign of campaigns) {
      try {
        // Get social media posts for this campaign
        const { data: posts } = await supabase
          .from('social_media_post_tracking')
          .select('*')
          .eq('campaign_id', campaign.id)
          .eq('status', 'posted');

        // Simulate fetching metrics from social media APIs
        // In production, call actual Facebook/Instagram APIs
        let totalImpressions = 0;
        let totalEngagement = 0;
        let totalClicks = 0;

        if (posts && posts.length > 0) {
          // TODO: Fetch real metrics from Facebook/Instagram Graph API
          // For now, simulate some metrics
          for (const post of posts) {
            totalImpressions += post.impressions || 0;
            totalEngagement += post.engagement || 0;
            totalClicks += post.clicks || 0;
          }
        }

        // Calculate CTR
        const ctr = totalImpressions > 0 
          ? (totalClicks / totalImpressions) * 100 
          : 0;

        // Update performance if we have data
        if (totalImpressions > 0) {
          await updateCampaignPerformanceFromSource(
            campaign.id,
            'facebook',
            {
              views: totalImpressions,
              clicks: totalClicks,
              ctr: ctr,
              social_likes: posts?.reduce((sum, p) => sum + (p.likes || 0), 0) || 0,
              social_shares: posts?.reduce((sum, p) => sum + (p.shares || 0), 0) || 0,
              social_comments: posts?.reduce((sum, p) => sum + (p.comments || 0), 0) || 0
            }
          );
        }

        console.log(`  ✓ ${campaign.title}: ${totalImpressions} views, ${totalClicks} clicks`);
      } catch (error) {
        console.error(`Error monitoring campaign ${campaign.id}:`, error);
        // Continue with other campaigns even if one fails
      }
    }

    console.log('✅ Campaign monitoring completed');
  } catch (error) {
    console.error('Error in campaign monitoring:', error);
    await logAutonomousError(
      'campaign_optimization',
      'api_error',
      'Campaign monitoring failed',
      { error: (error as Error).message },
      undefined,
      true // Notify admin if monitoring completely fails
    );
  }
}

// ============================================================
// Campaign ROI Analysis
// ============================================================

/**
 * Analyze campaign ROI and identify top/bottom performers
 */
export async function analyzeCampaignROI(): Promise<{
  topPerformers: any[];
  underperformers: any[];
  recommendations: string[];
}> {
  try {
    const { data: metrics, error } = await supabase
      .from('campaign_performance_metrics')
      .select(`
        campaign_id,
        roi,
        new_signups,
        new_organizers,
        net_revenue,
        total_cost,
        performance_score
      `)
      .order('roi', { ascending: false });

    if (error) throw error;

    if (!metrics || metrics.length === 0) {
      return {
        topPerformers: [],
        underperformers: [],
        recommendations: ['Create campaigns to start tracking performance']
      };
    }

    // Group by campaign
    const campaignStats = new Map<string, any>();
    
    for (const metric of metrics) {
      if (!campaignStats.has(metric.campaign_id)) {
        campaignStats.set(metric.campaign_id, {
          campaign_id: metric.campaign_id,
          total_roi: 0,
          total_signups: 0,
          total_organizers: 0,
          total_revenue: 0,
          total_cost: 0,
          avg_performance_score: 0,
          data_points: 0
        });
      }

      const stats = campaignStats.get(metric.campaign_id);
      stats.total_roi += metric.roi || 0;
      stats.total_signups += metric.new_signups || 0;
      stats.total_organizers += metric.new_organizers || 0;
      stats.total_revenue += metric.net_revenue || 0;
      stats.total_cost += metric.total_cost || 0;
      stats.avg_performance_score += metric.performance_score || 0;
      stats.data_points++;
    }

    // Calculate averages
    const campaigns = Array.from(campaignStats.values()).map(stats => ({
      ...stats,
      avg_roi: stats.data_points > 0 ? stats.total_roi / stats.data_points : 0,
      avg_performance_score: stats.data_points > 0 ? stats.avg_performance_score / stats.data_points : 0
    }));

    // Sort by ROI
    campaigns.sort((a, b) => b.avg_roi - a.avg_roi);

    const topPerformers = campaigns.slice(0, 5);
    const underperformers = campaigns.slice(-5).reverse();

    // Generate recommendations
    const recommendations: string[] = [];

    if (topPerformers.length > 0 && topPerformers[0].avg_roi > 200) {
      recommendations.push(`🚀 Scale up top performer (ROI: ${topPerformers[0].avg_roi.toFixed(0)}%)`);
    }

    if (underperformers.length > 0 && underperformers[0].avg_roi < 0) {
      recommendations.push(`⚠️ Pause underperformer (ROI: ${underperformers[0].avg_roi.toFixed(0)}%)`);
    }

    const avgROI = campaigns.reduce((sum, c) => sum + c.avg_roi, 0) / campaigns.length;
    recommendations.push(`📊 Portfolio average ROI: ${avgROI.toFixed(0)}%`);

    return {
      topPerformers,
      underperformers,
      recommendations
    };
  } catch (error) {
    console.error('Error analyzing campaign ROI:', error);
    return {
      topPerformers: [],
      underperformers: [],
      recommendations: ['Error analyzing ROI - check system logs']
    };
  }
}

export default {
  postCampaignToSocialMedia,
  createAutonomousCampaignWithTracking,
  updateCampaignPerformanceFromSource,
  monitorActiveCampaigns,
  analyzeCampaignROI
};
