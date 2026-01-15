/**
 * Analytics Tracking Service
 * Tracks user actions and platform metrics for optimization
 * Excludes admin users from tracking
 */

import { supabase } from './supabase';
import { EventNexusEvent, User } from '../types';

export interface AnalyticsEvent {
  event_type: string;
  user_id?: string;
  event_id?: string;
  category?: string;
  metadata?: Record<string, any>;
  timestamp: string;
  user_country?: string;
  user_city?: string;
  referrer?: string;
  search_engine?: string;
  device_type?: string;
  browser?: string;
  os?: string;
}

/**
 * Check if user is admin (skip tracking)
 */
const isAdminUser = (user: User | null): boolean => {
  return user?.role === 'admin';
};

/**
 * Get device and browser information
 */
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  let device_type = 'desktop';
  let browser = 'unknown';
  let os = 'unknown';

  // Device type detection
  if (/mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(ua)) {
    device_type = /ipad/i.test(ua) ? 'tablet' : 'mobile';
  }

  // Browser detection
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

  // OS detection
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return { device_type, browser, os };
};

/**
 * Detect search engine from referrer
 */
const detectSearchEngine = (referrer: string): string | undefined => {
  if (!referrer) return undefined;
  
  const refLower = referrer.toLowerCase();
  if (refLower.includes('google.')) return 'Google';
  if (refLower.includes('bing.')) return 'Bing';
  if (refLower.includes('duckduckgo.')) return 'DuckDuckGo';
  if (refLower.includes('yahoo.')) return 'Yahoo';
  if (refLower.includes('baidu.')) return 'Baidu';
  if (refLower.includes('yandex.')) return 'Yandex';
  
  return undefined;
};

/**
 * Track page views with geographic and referrer data
 */
export const trackPageView = async (
  user: User | null,
  page: string,
  referrer?: string
) => {
  // Skip tracking for admin users
  if (isAdminUser(user)) {
    console.log('⛔ Analytics: Skipping page view tracking for admin user');
    return;
  }

  try {
    const { device_type, browser, os } = getDeviceInfo();
    const search_engine = detectSearchEngine(referrer || document.referrer);

    await supabase
      .from('analytics_events')
      .insert({
        event_type: 'page_view',
        user_id: user?.id || null,
        user_country: user?.country || null,
        user_city: user?.city || null,
        device_type,
        browser,
        os,
        referrer: referrer || document.referrer || null,
        search_engine,
        metadata: { page },
        timestamp: new Date().toISOString()
      });
    
    console.log(`✅ Page view tracked: ${page}`, { search_engine, device_type, browser });
  } catch (error) {
    console.error('Error tracking page view:', error);
  }
};

/**
 * Track user actions (clicks, conversions, etc.)
 */
export const trackAction = async (
  action: string,
  user: User | null,
  metadata?: Record<string, any>
) => {
  // Skip tracking for admin users
  if (isAdminUser(user)) {
    console.log(`⛔ Analytics: Skipping action tracking for admin user: ${action}`);
    return;
  }

  try {
    const { device_type, browser, os } = getDeviceInfo();

    await supabase
      .from('analytics_events')
      .insert({
        event_type: action,
        user_id: user?.id || null,
        user_country: user?.country || null,
        user_city: user?.city || null,
        device_type,
        browser,
        os,
        metadata: metadata || {},
        timestamp: new Date().toISOString()
      });

    // Also send to Google Analytics if available (not for admin)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', action, {
        ...metadata,
        user_type: user ? 'logged_in' : 'guest'
      });
    }
    
    console.log(`✅ Action tracked: ${action}`, metadata);
  } catch (error) {
    console.error('Error tracking action:', error);
  }
};

// Lightweight wrapper for Meta Pixel custom events (excludes admin)
export const trackMetaPixel = (
  eventName: string,
  user: User | null,
  payload: Record<string, any> = {}
) => {
  // Skip tracking for admin users
  if (isAdminUser(user)) {
    console.log(`⛔ Meta Pixel: Skipping tracking for admin user: ${eventName}`);
    return;
  }

  if (typeof window === 'undefined') return;
  const fbq = (window as any).fbq;
  if (typeof fbq === 'function') {
    try {
      fbq('trackCustom', eventName, {
        ...payload,
        user_type: user ? 'logged_in' : 'guest',
        user_country: user?.country || 'unknown'
      });
      console.log(`✅ Meta Pixel tracked: ${eventName}`, payload);
    } catch (error) {
      console.warn('Meta Pixel tracking failed:', error);
    }
  } else {
    console.warn('Meta Pixel not ready');
  }
};

/**
 * Track conversion funnel steps (excludes admin)
 */
export const trackFunnelStep = async (
  funnel: 'signup' | 'subscription' | 'ticket_purchase' | 'event_creation',
  step: string,
  user: User | null,
  success: boolean,
  metadata?: Record<string, any>
) => {
  // Skip tracking for admin users
  if (isAdminUser(user)) {
    console.log(`⛔ Analytics: Skipping funnel tracking for admin user: ${funnel}/${step}`);
    return;
  }

  try {
    const { device_type, browser, os } = getDeviceInfo();

    await supabase
      .from('funnel_tracking')
      .insert({
        funnel,
        step,
        user_id: user?.id || null,
        user_country: user?.country || null,
        device_type,
        browser,
        os,
        success,
        metadata: metadata || {},
        timestamp: new Date().toISOString()
      });
    
    console.log(`✅ Funnel step tracked: ${funnel}/${step} - ${success ? 'Success' : 'Failed'}`);
  } catch (error) {
    console.error('Error tracking funnel step:', error);
  }
};

/**
 * Track A/B test variants
 */
export const trackABTestVariant = async (
  testName: string,
  variant: string,
  userId: string | null,
  converted: boolean = false
) => {
  try {
    await supabase
      .from('ab_tests')
      .insert({
        test_name: testName,
        variant,
        user_id: userId,
        converted,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error tracking A/B test:', error);
  }
};

/**
 * Get conversion metrics
 */
export const getConversionMetrics = async (
  startDate: string,
  endDate: string
): Promise<{
  signups: number;
  subscriptions: number;
  ticketPurchases: number;
  eventsCreated: number;
}> => {
  try {
    const { data, error } = await supabase
      .rpc('get_conversion_metrics', {
        start_date: startDate,
        end_date: endDate
      });

    if (error) throw error;

    return data || {
      signups: 0,
      subscriptions: 0,
      ticketPurchases: 0,
      eventsCreated: 0
    };
  } catch (error) {
    console.error('Error getting conversion metrics:', error);
    return {
      signups: 0,
      subscriptions: 0,
      ticketPurchases: 0,
      eventsCreated: 0
    };
  }
};

/**
 * Track feature usage
 */
export const trackFeatureUsage = async (
  featureName: string,
  userId: string,
  metadata?: Record<string, any>
) => {
  try {
    await supabase
      .from('feature_usage')
      .insert({
        feature_name: featureName,
        user_id: userId,
        metadata: metadata || {},
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error tracking feature usage:', error);
  }
};

/**
 * Track errors and issues
 */
export const trackError = async (
  errorType: string,
  errorMessage: string,
  userId: string | null,
  context?: Record<string, any>
) => {
  try {
    await supabase
      .from('error_logs')
      .insert({
        error_type: errorType,
        error_message: errorMessage,
        user_id: userId,
        context: context || {},
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error tracking error:', error);
  }
};

/**
 * Track user retention
 */
export const trackRetention = async (
  userId: string,
  daysSinceSignup: number,
  isActive: boolean
) => {
  try {
    await supabase
      .from('retention_tracking')
      .insert({
        user_id: userId,
        days_since_signup: daysSinceSignup,
        is_active: isActive,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error tracking retention:', error);
  }
};

// Capture a complete event-creation conversion across Supabase, GA, and Meta
export const trackEventCreation = async (
  event: EventNexusEvent,
  userId?: string | null
) => {
  const metadata = {
    event_id: event.id,
    name: event.name,
    category: event.category,
    price: event.price,
    city: event.location?.city,
    visibility: event.visibility,
    is_featured: !!event.isFeatured,
    start: event.date,
    end: event.end_date,
    translations: event.translations ? Object.keys(event.translations).length : 0
  };

  await Promise.allSettled([
    trackAction('event_created', userId || null, metadata),
    trackFunnelStep('event_creation', 'completed', userId || null, true, metadata)
  ]);

  trackMetaPixel('EventCreated', {
    content_name: event.name,
    content_category: event.category,
    value: event.price,
    currency: 'EUR',
    city: event.location?.city,
    event_id: event.id,
    visibility: event.visibility
  });
};
