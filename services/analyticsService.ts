/**
 * Analytics Tracking Service
 * Tracks user actions and platform metrics for optimization
 */

import { supabase } from './supabase';

export interface AnalyticsEvent {
  event_type: string;
  user_id?: string;
  event_id?: string;
  category?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

/**
 * Track page views
 */
export const trackPageView = async (
  userId: string | null,
  page: string,
  referrer?: string
) => {
  try {
    await supabase
      .from('analytics_events')
      .insert({
        event_type: 'page_view',
        user_id: userId,
        metadata: { page, referrer },
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error tracking page view:', error);
  }
};

/**
 * Track user actions (clicks, conversions, etc.)
 */
export const trackAction = async (
  action: string,
  userId: string | null,
  metadata?: Record<string, any>
) => {
  try {
    await supabase
      .from('analytics_events')
      .insert({
        event_type: action,
        user_id: userId,
        metadata: metadata || {},
        timestamp: new Date().toISOString()
      });

    // Also send to Google Analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', action, metadata);
    }
  } catch (error) {
    console.error('Error tracking action:', error);
  }
};

/**
 * Track conversion funnel steps
 */
export const trackFunnelStep = async (
  funnel: 'signup' | 'subscription' | 'ticket_purchase' | 'event_creation',
  step: string,
  userId: string | null,
  success: boolean,
  metadata?: Record<string, any>
) => {
  try {
    await supabase
      .from('funnel_tracking')
      .insert({
        funnel,
        step,
        user_id: userId,
        success,
        metadata: metadata || {},
        timestamp: new Date().toISOString()
      });
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
