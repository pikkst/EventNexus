import { supabase } from './supabase';

// ============================================
// Types
// ============================================

export interface OptimalTime {
  hour_of_day: number;
  avg_ctr: number;
  avg_engagement_rate: number;
  total_impressions: number;
  total_clicks: number;
  campaign_count: number;
}

export interface OptimalDay {
  day_of_week: number;
  day_name: string;
  avg_ctr: number;
  avg_engagement_rate: number;
  total_impressions: number;
  total_clicks: number;
  campaign_count: number;
}

export interface PlatformOptimalTime {
  platform: string;
  optimal_hour: number | null;
  optimal_day: number | null;
  confidence_score: number;
}

export interface ScheduledPost {
  id: string;
  campaign_id: string;
  scheduled_for: string;
  timezone: string;
  platforms: string[];
  content_variations: Record<string, any> | null;
  status: 'scheduled' | 'posting' | 'posted' | 'failed' | 'cancelled';
  posted_at: string | null;
  error_message: string | null;
  post_ids: Record<string, string> | null;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// Optimal Time Analysis
// ============================================

/**
 * Get best performing hours for posting on a specific platform
 */
export async function getOptimalPostingHours(
  platform?: string,
  daysBack: number = 30
): Promise<OptimalTime[]> {
  try {
    const { data, error } = await supabase.rpc('get_optimal_posting_hours', {
      p_platform: platform || null,
      p_days_back: daysBack
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting optimal posting hours:', error);
    return [];
  }
}

/**
 * Get best performing days of the week
 */
export async function getOptimalPostingDays(
  platform?: string,
  daysBack: number = 90
): Promise<OptimalDay[]> {
  try {
    const { data, error } = await supabase.rpc('get_optimal_posting_days', {
      p_platform: platform || null,
      p_days_back: daysBack
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting optimal posting days:', error);
    return [];
  }
}

/**
 * Get optimal posting times for all platforms with confidence scores
 */
export async function getPlatformOptimalTimes(): Promise<PlatformOptimalTime[]> {
  try {
    const { data, error } = await supabase.rpc('get_platform_optimal_times');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting platform optimal times:', error);
    return [];
  }
}

// ============================================
// Campaign Scheduling
// ============================================

/**
 * Schedule a campaign for optimal posting time on multiple platforms
 */
export async function scheduleCampaignAuto(
  campaignId: string,
  platforms: string[],
  timezone: string = 'Europe/Tallinn',
  contentVariations?: Record<string, any>
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('schedule_campaign_auto', {
      p_campaign_id: campaignId,
      p_platforms: platforms,
      p_timezone: timezone,
      p_content_variations: contentVariations || null
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error auto-scheduling campaign:', error);
    return null;
  }
}

/**
 * Schedule a campaign for a specific date/time
 */
export async function scheduleCampaignManual(
  campaignId: string,
  scheduledFor: Date,
  platforms: string[],
  timezone: string = 'Europe/Tallinn',
  contentVariations?: Record<string, any>
): Promise<ScheduledPost | null> {
  try {
    const { data, error } = await supabase
      .from('campaign_schedule')
      .insert({
        campaign_id: campaignId,
        scheduled_for: scheduledFor.toISOString(),
        timezone,
        platforms: platforms,
        content_variations: contentVariations || null,
        status: 'scheduled'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error manually scheduling campaign:', error);
    return null;
  }
}

/**
 * Get all scheduled posts with optional filters
 */
export async function getScheduledPosts(
  filters?: {
    campaignId?: string;
    status?: string;
    platform?: string;
  }
): Promise<ScheduledPost[]> {
  try {
    let query = supabase
      .from('campaign_schedule')
      .select('*')
      .order('scheduled_for', { ascending: true });

    if (filters?.campaignId) {
      query = query.eq('campaign_id', filters.campaignId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.platform) {
      query = query.contains('platforms', [filters.platform]);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting scheduled posts:', error);
    return [];
  }
}

/**
 * Get upcoming scheduled posts (next 7 days)
 */
export async function getUpcomingPosts(): Promise<ScheduledPost[]> {
  try {
    const now = new Date().toISOString();
    const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('campaign_schedule')
      .select('*')
      .eq('status', 'scheduled')
      .gte('scheduled_for', now)
      .lte('scheduled_for', weekLater)
      .order('scheduled_for', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting upcoming posts:', error);
    return [];
  }
}

/**
 * Cancel a scheduled post
 */
export async function cancelScheduledPost(scheduleId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('campaign_schedule')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', scheduleId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error cancelling scheduled post:', error);
    return false;
  }
}

/**
 * Reschedule a post to a new time
 */
export async function reschedulePost(
  scheduleId: string,
  newScheduledFor: Date
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('campaign_schedule')
      .update({
        scheduled_for: newScheduledFor.toISOString(),
        status: 'scheduled',
        retry_count: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', scheduleId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error rescheduling post:', error);
    return false;
  }
}

// ============================================
// Scheduling Insights
// ============================================

/**
 * Get schedule performance analytics
 */
export async function getSchedulePerformance() {
  try {
    const { data, error } = await supabase
      .from('v_schedule_performance')
      .select('*')
      .order('posted_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting schedule performance:', error);
    return [];
  }
}

/**
 * Calculate next optimal posting time for a platform
 */
export async function calculateNextOptimalTime(
  platform: string,
  timezone: string = 'Europe/Tallinn'
): Promise<Date | null> {
  try {
    const { data, error } = await supabase.rpc('calculate_next_optimal_time', {
      p_platform: platform,
      p_timezone: timezone,
      p_days_ahead: 7
    });

    if (error) throw error;
    return data ? new Date(data) : null;
  } catch (error) {
    console.error('Error calculating next optimal time:', error);
    return null;
  }
}

/**
 * Get scheduling recommendations for a campaign
 */
export async function getSchedulingRecommendations(
  platforms: string[],
  timezone: string = 'Europe/Tallinn'
): Promise<Record<string, { time: Date; confidence: number }>> {
  try {
    const optimalTimes = await getPlatformOptimalTimes();
    const recommendations: Record<string, { time: Date; confidence: number }> = {};

    for (const platform of platforms) {
      const platformData = optimalTimes.find(t => t.platform === platform);
      
      if (platformData) {
        const nextTime = await calculateNextOptimalTime(platform, timezone);
        if (nextTime) {
          recommendations[platform] = {
            time: nextTime,
            confidence: platformData.confidence_score
          };
        }
      }
    }

    return recommendations;
  } catch (error) {
    console.error('Error getting scheduling recommendations:', error);
    return {};
  }
}

/**
 * Get day name from day of week number
 */
export function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] || 'Unknown';
}

/**
 * Format hour to 12-hour format
 */
export function formatHour(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return '12:00 PM';
  return `${hour - 12}:00 PM`;
}

/**
 * Get platform icon/emoji
 */
export function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    facebook: '📘',
    instagram: '📸',
    twitter: '🐦',
    linkedin: '💼',
    tiktok: '🎵'
  };
  return icons[platform.toLowerCase()] || '📱';
}
