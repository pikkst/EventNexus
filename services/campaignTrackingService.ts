/**
 * UTM Tracking Service
 * Tracks campaign performance via UTM parameters
 */

import { supabase } from './supabase';

interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

interface SessionInfo {
  sessionId: string;
  userId?: string;
  utmParams: UTMParams;
  landingPage: string;
  referrer: string;
  deviceType: string;
  browser: string;
  os: string;
}

/**
 * Extract UTM parameters from URL
 */
export const getUTMParams = (): UTMParams => {
  const params = new URLSearchParams(window.location.search);
  
  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
    utm_content: params.get('utm_content') || undefined,
    utm_term: params.get('utm_term') || undefined
  };
};

/**
 * Get or create session ID
 */
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('eventnexus_session_id');
  
  if (!sessionId) {
    // Use crypto.randomUUID() for secure random ID generation
    sessionId = `session_${Date.now()}_${crypto.randomUUID()}`;
    sessionStorage.setItem('eventnexus_session_id', sessionId);
  }
  
  return sessionId;
};

/**
 * Store UTM params in session for attribution
 */
export const storeUTMParams = (params: UTMParams): void => {
  if (Object.values(params).some(v => v !== undefined)) {
    sessionStorage.setItem('eventnexus_utm', JSON.stringify(params));
  }
};

/**
 * Get stored UTM params from session
 */
export const getStoredUTMParams = (): UTMParams | null => {
  const stored = sessionStorage.getItem('eventnexus_utm');
  return stored ? JSON.parse(stored) : null;
};

/**
 * Detect device information
 */
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  
  let deviceType = 'desktop';
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    deviceType = 'mobile';
  } else if (/Tablet|iPad/.test(ua)) {
    deviceType = 'tablet';
  }
  
  let browser = 'unknown';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edge')) browser = 'Edge';
  
  let os = 'unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS')) os = 'iOS';
  
  return { deviceType, browser, os };
};

/**
 * Initialize tracking session
 */
export const initializeTracking = async (userId?: string): Promise<void> => {
  try {
    const utmParams = getUTMParams();
    
    // Only track if we have UTM params (came from campaign)
    if (!utmParams.utm_campaign) {
      return;
    }
    
    storeUTMParams(utmParams);
    
    const sessionId = getSessionId();
    const deviceInfo = getDeviceInfo();
    
    // Check if session already exists
    const { data: existingSession } = await supabase
      .from('utm_sessions')
      .select('id')
      .eq('session_id', sessionId)
      .single();
    
    if (existingSession) {
      // Update last activity
      await supabase
        .from('utm_sessions')
        .update({ 
          last_activity_at: new Date().toISOString(),
          user_id: userId 
        })
        .eq('session_id', sessionId);
      return;
    }
    
    // Create new session
    await supabase.from('utm_sessions').insert({
      session_id: sessionId,
      user_id: userId,
      utm_source: utmParams.utm_source,
      utm_medium: utmParams.utm_medium,
      utm_campaign: utmParams.utm_campaign,
      utm_content: utmParams.utm_content,
      utm_term: utmParams.utm_term,
      landing_page: window.location.href,
      referrer: document.referrer || null,
      device_type: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      first_visit_at: new Date().toISOString()
    });
    
    // Track impression in campaign_analytics
    if (utmParams.utm_campaign) {
      await trackCampaignImpression(utmParams.utm_campaign, utmParams.utm_source);
    }
    
    console.log('✅ Tracking initialized:', { sessionId, utmParams });
  } catch (error) {
    console.error('❌ Tracking initialization failed:', error);
  }
};

/**
 * Track page view
 */
export const trackPageView = async (): Promise<void> => {
  try {
    const sessionId = getSessionId();
    
    await supabase
      .from('utm_sessions')
      .update({
        pages_viewed: supabase.sql`pages_viewed + 1`,
        last_activity_at: new Date().toISOString()
      })
      .eq('session_id', sessionId);
  } catch (error) {
    console.error('❌ Page view tracking failed:', error);
  }
};

/**
 * Track campaign impression
 */
export const trackCampaignImpression = async (
  campaignCode: string,
  source?: string
): Promise<void> => {
  try {
    // Get campaign ID from tracking code
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('trackingCode', campaignCode)
      .single();
    
    if (!campaign) return;
    
    await supabase.from('campaign_analytics').insert({
      campaign_id: campaign.id,
      impressions: 1,
      source: source || 'direct',
      medium: 'social',
      recorded_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Impression tracking failed:', error);
  }
};

/**
 * Track campaign click
 */
export const trackCampaignClick = async (
  campaignCode: string,
  source?: string
): Promise<void> => {
  try {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('trackingCode', campaignCode)
      .single();
    
    if (!campaign) return;
    
    await supabase.from('campaign_analytics').insert({
      campaign_id: campaign.id,
      clicks: 1,
      source: source || 'direct',
      medium: 'social',
      recorded_at: new Date().toISOString()
    });
    
    console.log('✅ Click tracked:', campaignCode);
  } catch (error) {
    console.error('❌ Click tracking failed:', error);
  }
};

/**
 * Track conversion
 */
export const trackConversion = async (
  conversionType: 'signup' | 'event_view' | 'ticket_purchase',
  value?: number,
  userId?: string
): Promise<void> => {
  try {
    const sessionId = getSessionId();
    const utmParams = getStoredUTMParams();
    
    if (!utmParams?.utm_campaign) return;
    
    // Update session with conversion
    await supabase
      .from('utm_sessions')
      .update({
        converted: true,
        conversion_type: conversionType,
        conversion_value: value || 0,
        converted_at: new Date().toISOString(),
        user_id: userId
      })
      .eq('session_id', sessionId);
    
    // Track in campaign analytics
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('trackingCode', utmParams.utm_campaign)
      .single();
    
    if (!campaign) return;
    
    const analyticsData: any = {
      campaign_id: campaign.id,
      source: utmParams.utm_source || 'direct',
      medium: utmParams.utm_medium || 'social',
      recorded_at: new Date().toISOString()
    };
    
    // Add conversion-specific metrics
    if (conversionType === 'signup') {
      analyticsData.sign_ups = 1;
    } else if (conversionType === 'event_view') {
      analyticsData.event_views = 1;
    } else if (conversionType === 'ticket_purchase') {
      analyticsData.ticket_purchases = 1;
      analyticsData.revenue_generated = value || 0;
    }
    
    await supabase.from('campaign_analytics').insert(analyticsData);
    
    console.log('✅ Conversion tracked:', { conversionType, value, campaign: utmParams.utm_campaign });
  } catch (error) {
    console.error('❌ Conversion tracking failed:', error);
  }
};

/**
 * Track social media engagement
 */
export const trackSocialEngagement = async (
  campaignCode: string,
  engagementType: 'like' | 'share' | 'comment',
  platform: string
): Promise<void> => {
  try {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('trackingCode', campaignCode)
      .single();
    
    if (!campaign) return;
    
    const analyticsData: any = {
      campaign_id: campaign.id,
      source: platform,
      medium: 'social',
      recorded_at: new Date().toISOString()
    };
    
    if (engagementType === 'like') analyticsData.likes = 1;
    else if (engagementType === 'share') analyticsData.shares = 1;
    else if (engagementType === 'comment') analyticsData.comments = 1;
    
    await supabase.from('campaign_analytics').insert(analyticsData);
  } catch (error) {
    console.error('❌ Engagement tracking failed:', error);
  }
};

/**
 * Get campaign performance metrics
 */
export const getCampaignPerformance = async (campaignId: string) => {
  try {
    const { data, error } = await supabase
      .from('campaign_performance')
      .select('*')
      .eq('campaign_id', campaignId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Failed to get campaign performance:', error);
    return null;
  }
};

/**
 * Get top performing campaigns
 */
export const getTopCampaigns = async (limit: number = 10) => {
  try {
    const { data, error } = await supabase
      .from('campaign_performance')
      .select(`
        *,
        campaigns (
          id,
          title,
          copy,
          status,
          created_at
        )
      `)
      .eq('is_active', true)
      .order('roi', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Failed to get top campaigns:', error);
    return [];
  }
};
