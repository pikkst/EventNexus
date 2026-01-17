/**
 * Conversion Tracking for Landing Page
 * Measures visitor journey from landing → map → signup → purchase
 */

interface ConversionEvent {
  action: string; // 'page_view', 'cta_click', 'scroll', 'signup', 'event_click'
  target?: string; // 'explore_map', 'host_event', 'featured_event', 'organizer_profile'
  value?: number; // e.g., scroll depth %, price, event id
  metadata?: Record<string, any>;
  timestamp: string;
  device: 'mobile' | 'tablet' | 'desktop';
  userAgent?: string;
}

/**
 * Core conversion tracking function
 * Sends events to analytics service (Mixpanel, Segment, etc.)
 */
export const trackConversionEvent = async (event: Omit<ConversionEvent, 'timestamp' | 'device'>) => {
  try {
    const device = getDeviceType();
    const conversionEvent: ConversionEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      device,
      userAgent: navigator.userAgent,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Conversion Event:', conversionEvent);
    }

    // Send to analytics service
    // TODO: Integrate with Mixpanel, Segment, or custom analytics
    // await fetch('/api/analytics/track', { method: 'POST', body: JSON.stringify(conversionEvent) });

    // Store in localStorage for batch processing
    storeConversionEvent(conversionEvent);

    return true;
  } catch (error) {
    console.error('Failed to track conversion event:', error);
    return false;
  }
};

/**
 * Determine device type from viewport
 */
export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  if (typeof window === 'undefined') return 'desktop';

  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

/**
 * Store conversion events in localStorage for batch processing
 */
const storeConversionEvent = (event: ConversionEvent) => {
  try {
    const stored = localStorage.getItem('conversionEvents');
    const events: ConversionEvent[] = stored ? JSON.parse(stored) : [];
    events.push(event);
    
    // Keep only last 50 events
    if (events.length > 50) {
      events.shift();
    }
    
    localStorage.setItem('conversionEvents', JSON.stringify(events));
  } catch (error) {
    console.error('Failed to store conversion event:', error);
  }
};

/**
 * Get stored conversion events
 */
export const getStoredConversionEvents = (): ConversionEvent[] => {
  try {
    const stored = localStorage.getItem('conversionEvents');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to retrieve conversion events:', error);
    return [];
  }
};

/**
 * Clear stored conversion events
 */
export const clearConversionEvents = () => {
  try {
    localStorage.removeItem('conversionEvents');
  } catch (error) {
    console.error('Failed to clear conversion events:', error);
  }
};

/**
 * Track page view (called on landing page mount)
 */
export const trackLandingPageView = () => {
  trackConversionEvent({
    action: 'page_view',
    target: 'landing_page',
    metadata: {
      referrer: document.referrer,
      utm_source: getUrlParam('utm_source'),
      utm_medium: getUrlParam('utm_medium'),
      utm_campaign: getUrlParam('utm_campaign'),
    }
  });
};

/**
 * Track CTA button clicks
 */
export const trackCTAClick = (buttonName: 'explore_map' | 'host_event' | 'start_exploring' | 'featured_event') => {
  trackConversionEvent({
    action: 'cta_click',
    target: buttonName,
    metadata: {
      buttonText: getButtonText(buttonName),
      section: getButtonSection(buttonName),
    }
  });
};

/**
 * Track scroll depth
 */
export const trackScrollDepth = (percentage: number) => {
  if (percentage % 25 === 0 || percentage === 100) { // Track at 25%, 50%, 75%, 100%
    trackConversionEvent({
      action: 'scroll',
      value: percentage,
      metadata: {
        milestone: `${percentage}%`,
      }
    });
  }
};

/**
 * Track time on page
 */
export const trackTimeOnPage = (seconds: number) => {
  if (seconds > 0 && (seconds === 10 || seconds === 30 || seconds === 60 || seconds % 60 === 0)) {
    trackConversionEvent({
      action: 'time_on_page',
      value: seconds,
      metadata: {
        duration_formatted: formatSeconds(seconds),
      }
    });
  }
};

/**
 * Track featured event clicks
 */
export const trackFeaturedEventClick = (eventId: string, eventName: string) => {
  trackConversionEvent({
    action: 'featured_event_click',
    target: 'featured_event',
    value: eventId as any,
    metadata: {
      eventId,
      eventName,
    }
  });
};

/**
 * Track organizer profile clicks
 */
export const trackOrganizerClick = (organizerId: string, organizerName: string) => {
  trackConversionEvent({
    action: 'organizer_click',
    target: 'organizer_profile',
    value: organizerId as any,
    metadata: {
      organizerId,
      organizerName,
    }
  });
};

/**
 * Track newsletter signup attempt
 */
export const trackNewsletterSignup = (success: boolean) => {
  trackConversionEvent({
    action: 'newsletter_signup',
    target: 'newsletter',
    metadata: {
      success,
    }
  });
};

/**
 * Track auth modal open
 */
export const trackAuthModalOpen = (source: string) => {
  trackConversionEvent({
    action: 'auth_modal_open',
    target: 'auth',
    metadata: {
      source,
    }
  });
};

/**
 * Track signup completion
 */
export const trackSignupComplete = (userType: 'attendee' | 'organizer', method: 'email' | 'google' | 'apple') => {
  trackConversionEvent({
    action: 'signup_complete',
    target: 'signup',
    metadata: {
      userType,
      method,
    }
  });
};

/**
 * Track map page arrival (from landing page)
 */
export const trackMapPageArrival = (source: 'explore_cta' | 'featured_event' | 'direct_url') => {
  trackConversionEvent({
    action: 'page_view',
    target: 'map_page',
    metadata: {
      source,
    }
  });
};

/**
 * Helper functions
 */
const getUrlParam = (name: string): string | null => {
  if (typeof window === 'undefined') return null;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
};

const getButtonText = (buttonName: string): string => {
  const map: Record<string, string> = {
    explore_map: 'Explore Events Now',
    host_event: 'Host an Event',
    start_exploring: 'Start Exploring Now',
    featured_event: 'View Event',
  };
  return map[buttonName] || buttonName;
};

const getButtonSection = (buttonName: string): string => {
  const map: Record<string, string> = {
    explore_map: 'hero',
    host_event: 'hero',
    start_exploring: 'urgency',
    featured_event: 'featured_events',
  };
  return map[buttonName] || 'unknown';
};

const formatSeconds = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
};

/**
 * Get conversion funnel metrics
 */
export const getConversionFunnelMetrics = () => {
  const events = getStoredConversionEvents();
  
  return {
    totalPageViews: events.filter(e => e.action === 'page_view').length,
    totalCTAClicks: events.filter(e => e.action === 'cta_click').length,
    mapCTARate: calculateRate(
      events.filter(e => e.action === 'cta_click' && e.target === 'explore_map').length,
      events.filter(e => e.action === 'page_view').length
    ),
    hostCTARate: calculateRate(
      events.filter(e => e.action === 'cta_click' && e.target === 'host_event').length,
      events.filter(e => e.action === 'page_view').length
    ),
    avgScrollDepth: getAverageScrollDepth(events),
    avgTimeOnPage: getAverageTimeOnPage(events),
    bounceRate: calculateBounceRate(events),
    signupCompletions: events.filter(e => e.action === 'signup_complete').length,
  };
};

const calculateRate = (clicks: number, views: number): number => {
  return views > 0 ? (clicks / views) * 100 : 0;
};

const getAverageScrollDepth = (events: ConversionEvent[]): number => {
  const scrollEvents = events.filter(e => e.action === 'scroll');
  if (scrollEvents.length === 0) return 0;
  const total = scrollEvents.reduce((sum, e) => sum + (e.value || 0), 0);
  return total / scrollEvents.length;
};

const getAverageTimeOnPage = (events: ConversionEvent[]): number => {
  const timeEvents = events.filter(e => e.action === 'time_on_page');
  if (timeEvents.length === 0) return 0;
  const total = timeEvents.reduce((sum, e) => sum + (e.value || 0), 0);
  return total / timeEvents.length;
};

const calculateBounceRate = (events: ConversionEvent[]): number => {
  const pageViews = events.filter(e => e.action === 'page_view').length;
  const bounces = events.filter(e => 
    e.action === 'page_view' && 
    !events.some(other => 
      other.action === 'cta_click' && 
      other.timestamp > e.timestamp
    )
  ).length;
  return pageViews > 0 ? (bounces / pageViews) * 100 : 0;
};
