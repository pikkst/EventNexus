/**
 * Autonomous Operations Error Handling Service
 * 
 * Handles errors, fallbacks, and admin notifications for autonomous operations
 * Ensures system stops gracefully and notifies admin when issues occur
 */

import { supabase } from './supabase';

// ============================================================
// Type Definitions
// ============================================================

export interface AutonomousError {
  id: string;
  created_at: string;
  operation_type: 'campaign_creation' | 'social_posting' | 'campaign_optimization' | 'intelligence_gathering';
  error_type: 'token_expired' | 'api_error' | 'network_error' | 'validation_error' | 'ai_generation_failed' | 'rate_limit' | 'permission_denied';
  error_message: string;
  error_details?: Record<string, any>;
  campaign_id?: string;
  user_id?: string;
  resolved: boolean;
  resolved_at?: string;
  notification_sent: boolean;
}

export interface SocialMediaPost {
  id: string;
  campaign_id?: string;
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin';
  post_id?: string;
  post_url?: string;
  post_content: string;
  post_image_url?: string;
  status: 'pending' | 'posted' | 'failed' | 'scheduled';
  posted_at?: string;
  error_type?: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
}

export interface CampaignMetrics {
  views: number;
  clicks: number;
  ctr: number;
  new_signups: number;
  new_organizers: number;
  new_events_created: number;
  tickets_sold: number;
  gross_revenue: number;
  net_revenue: number;
  ad_spend: number;
  ai_generation_cost: number;
  total_cost: number;
  roi: number;
  roas: number;
  cost_per_signup: number;
  cost_per_organizer: number;
  social_shares: number;
  social_comments: number;
  social_likes: number;
  source?: string;
  utm_campaign?: string;
  utm_source?: string;
  utm_medium?: string;
}

// ============================================================
// Error Logging & Notification
// ============================================================

/**
 * Log an autonomous operation error and notify admin
 */
export async function logAutonomousError(
  operationType: AutonomousError['operation_type'],
  errorType: AutonomousError['error_type'],
  errorMessage: string,
  errorDetails?: Record<string, any>,
  campaignId?: string,
  notifyAdmin: boolean = true
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('log_autonomous_error', {
      p_operation_type: operationType,
      p_error_type: errorType,
      p_error_message: errorMessage,
      p_error_details: errorDetails || null,
      p_campaign_id: campaignId || null,
      p_notify_admin: notifyAdmin
    });

    if (error) {
      console.error('Failed to log autonomous error:', error);
      return null;
    }

    console.log(`✅ Error logged. Admin notified: ${notifyAdmin}`);
    return data as string;
  } catch (error) {
    console.error('Exception logging autonomous error:', error);
    return null;
  }
}

/**
 * Get unresolved errors for admin dashboard
 */
export async function getUnresolvedErrors(): Promise<AutonomousError[]> {
  try {
    const { data, error } = await supabase
      .from('autonomous_operation_errors')
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching unresolved errors:', error);
    return [];
  }
}

/**
 * Resolve an error (admin marks as fixed)
 */
export async function resolveError(
  errorId: string,
  resolutionNotes: string,
  adminUserId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('autonomous_operation_errors')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: adminUserId,
        resolution_notes: resolutionNotes
      })
      .eq('id', errorId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error resolving error:', error);
    return false;
  }
}

// ============================================================
// Social Media Post Tracking
// ============================================================

/**
 * Create social media post tracking record
 */
export async function trackSocialMediaPost(
  campaignId: string,
  platform: SocialMediaPost['platform'],
  postContent: string,
  postImageUrl?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('track_social_media_post', {
      p_campaign_id: campaignId,
      p_platform: platform,
      p_post_content: postContent,
      p_post_image_url: postImageUrl || null,
      p_status: 'pending'
    });

    if (error) throw error;
    return data as string;
  } catch (error) {
    console.error('Error tracking social media post:', error);
    return null;
  }
}

/**
 * Update social media post status (success or failure)
 */
export async function updatePostStatus(
  postId: string,
  status: SocialMediaPost['status'],
  platformPostId?: string,
  postUrl?: string,
  errorType?: string,
  errorMessage?: string,
  errorDetails?: Record<string, any>
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('update_post_status', {
      p_post_id: postId,
      p_status: status,
      p_platform_post_id: platformPostId || null,
      p_post_url: postUrl || null,
      p_error_type: errorType || null,
      p_error_message: errorMessage || null,
      p_error_details: errorDetails || null
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating post status:', error);
    return false;
  }
}

/**
 * Get social media posts for a campaign
 */
export async function getCampaignPosts(campaignId: string): Promise<SocialMediaPost[]> {
  try {
    const { data, error } = await supabase
      .from('social_media_post_tracking')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching campaign posts:', error);
    return [];
  }
}

/**
 * Retry failed social media post
 */
export async function retryFailedPost(postId: string): Promise<boolean> {
  try {
    const { data: post, error: fetchError } = await supabase
      .from('social_media_post_tracking')
      .select('*')
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      throw new Error('Post not found');
    }

    if (post.retry_count >= post.max_retries) {
      console.warn(`Post ${postId} has exceeded max retries`);
      return false;
    }

    // Reset status to pending for retry
    const { error: updateError } = await supabase
      .from('social_media_post_tracking')
      .update({ 
        status: 'pending',
        last_retry_at: new Date().toISOString()
      })
      .eq('id', postId);

    if (updateError) throw updateError;
    return true;
  } catch (error) {
    console.error('Error retrying failed post:', error);
    return false;
  }
}

// ============================================================
// Campaign Performance Tracking
// ============================================================

/**
 * Record campaign performance metrics
 */
export async function recordCampaignPerformance(
  campaignId: string,
  metrics: Partial<CampaignMetrics>
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('record_campaign_performance', {
      p_campaign_id: campaignId,
      p_metrics: metrics
    });

    if (error) throw error;
    console.log(`✅ Campaign performance recorded for ${campaignId}`);
    return data as string;
  } catch (error) {
    console.error('Error recording campaign performance:', error);
    return null;
  }
}

/**
 * Get comprehensive campaign analytics
 */
export async function getCampaignAnalytics(campaignId: string): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('get_campaign_analytics', {
      p_campaign_id: campaignId
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching campaign analytics:', error);
    return null;
  }
}

/**
 * Get top performing campaigns
 */
export async function getTopPerformingCampaigns(
  metric: 'roi' | 'signups' | 'revenue' | 'performance_score' = 'roi',
  limit: number = 10
): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc('get_top_performing_campaigns', {
      p_metric: metric,
      p_limit: limit
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching top performing campaigns:', error);
    return [];
  }
}

/**
 * Get campaign ROI summary
 */
export async function getCampaignROISummary(campaignId: string): Promise<{
  totalInvestment: number;
  totalReturn: number;
  roi: number;
  signups: number;
  organizers: number;
  events: number;
  revenue: number;
} | null> {
  try {
    const { data, error } = await supabase
      .from('campaign_performance_metrics')
      .select('*')
      .eq('campaign_id', campaignId);

    if (error) throw error;

    if (!data || data.length === 0) return null;

    const totalCost = data.reduce((sum, m) => sum + (m.total_cost || 0), 0);
    const totalRevenue = data.reduce((sum, m) => sum + (m.net_revenue || 0), 0);
    const totalSignups = data.reduce((sum, m) => sum + (m.new_signups || 0), 0);
    const totalOrganizers = data.reduce((sum, m) => sum + (m.new_organizers || 0), 0);
    const totalEvents = data.reduce((sum, m) => sum + (m.new_events_created || 0), 0);

    const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

    return {
      totalInvestment: totalCost,
      totalReturn: totalRevenue,
      roi: roi,
      signups: totalSignups,
      organizers: totalOrganizers,
      events: totalEvents,
      revenue: totalRevenue
    };
  } catch (error) {
    console.error('Error calculating campaign ROI:', error);
    return null;
  }
}

// ============================================================
// Error Handling Helpers
// ============================================================

/**
 * Check if social media token is expired
 */
export function isTokenExpiredError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code || '';
  
  return (
    errorMessage.includes('token') && errorMessage.includes('expired') ||
    errorMessage.includes('invalid token') ||
    errorMessage.includes('token has expired') ||
    errorCode === 'EAUTH' ||
    errorCode === '190' // Facebook token expired code
  );
}

/**
 * Check if error is rate limit
 */
export function isRateLimitError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code || '';
  
  return (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many requests') ||
    errorCode === '429' ||
    errorCode === '17' // Facebook rate limit code
  );
}

/**
 * Categorize error type
 */
export function categorizeError(error: any): AutonomousError['error_type'] {
  if (isTokenExpiredError(error)) return 'token_expired';
  if (isRateLimitError(error)) return 'rate_limit';
  
  const errorMessage = error.message?.toLowerCase() || '';
  
  if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    return 'network_error';
  }
  if (errorMessage.includes('permission') || errorMessage.includes('access denied')) {
    return 'permission_denied';
  }
  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return 'validation_error';
  }
  
  return 'api_error';
}

/**
 * Handle autonomous operation with fallback
 * Wraps any autonomous operation with error handling and admin notification
 */
export async function withErrorHandling<T>(
  operationType: AutonomousError['operation_type'],
  operation: () => Promise<T>,
  campaignId?: string,
  fallback?: T
): Promise<T | null> {
  try {
    console.log(`▶️ Executing ${operationType}...`);
    const result = await operation();
    console.log(`✅ ${operationType} completed successfully`);
    return result;
  } catch (error: any) {
    console.error(`❌ ${operationType} failed:`, error);
    
    const errorType = categorizeError(error);
    const errorMessage = error.message || 'Unknown error occurred';
    const errorDetails = {
      stack: error.stack,
      code: error.code,
      response: error.response?.data
    };
    
    // Log error and notify admin
    await logAutonomousError(
      operationType,
      errorType,
      errorMessage,
      errorDetails,
      campaignId,
      true // Always notify admin on autonomous operation errors
    );
    
    // Return fallback if provided, otherwise null
    return fallback !== undefined ? fallback : null;
  }
}

export default {
  logAutonomousError,
  getUnresolvedErrors,
  resolveError,
  trackSocialMediaPost,
  updatePostStatus,
  getCampaignPosts,
  retryFailedPost,
  recordCampaignPerformance,
  getCampaignAnalytics,
  getTopPerformingCampaigns,
  getCampaignROISummary,
  withErrorHandling,
  isTokenExpiredError,
  isRateLimitError,
  categorizeError
};
