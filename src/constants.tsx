import { EventNexusEvent } from './types';

// Event categories available in the platform
export const CATEGORIES = [
  'Concert', 'Festival', 'Workshop', 'Party', 'Conference', 'Meetup', 'Sports'
];

// Subscription tiers and their limits
export const SUBSCRIPTION_TIERS = {
  free: { 
    maxEvents: 0,  // Free tier is attendance-only (use credits to unlock event creation)
    analytics: false, 
    customBranding: false, 
    support: 'community',
    price: 0,
    commissionRate: 0.05, // 5% platform fee
    description: 'Perfect for exploring and attending events',
    welcomeCredits: 100 // 100 welcome credits (€50 value)
  },
  pro: { 
    maxEvents: 20, 
    analytics: true, 
    customBranding: false, 
    support: 'email',
    price: 19.99,
    commissionRate: 0.03, // 3% platform fee
    description: 'The standard for creators and promoters'
  },
  premium: { 
    maxEvents: 100, 
    analytics: true, 
    customBranding: true, 
    support: 'priority',
    price: 49.99,
    commissionRate: 0.025, // 2.5% platform fee
    description: 'Ultimate power for professional agencies',
    featuredPlacement: true, // Featured on map
    affiliateTools: true, // Affiliate marketing
    advancedAnalytics: true // Advanced metrics
  },
  enterprise: { 
    maxEvents: Infinity, 
    analytics: true, 
    customBranding: true, 
    support: 'dedicated',
    price: 149.99,
    commissionRate: 0.015, // 1.5% platform fee
    description: 'White-labeling & Global Infrastructure',
    featuredPlacement: true,
    affiliateTools: true,
    advancedAnalytics: true,
    whiteLabelDashboard: true, // White-labeled interface
    customLandingPage: true, // Personalized public web platform
    apiAccess: true, // Full API access
    dedicatedManager: true // Personal success manager
  }
};

// Platform configuration
export const PLATFORM_CONFIG = {
  defaultAlertRadius: 10, // km
  maxAlertRadius: 50, // km
  minEventPrice: 0,
  maxEventCapacity: 100000,
  ticketQRCodePrefix: 'EVNX-',
  platformFeePercentage: 2.5,
  supportEmail: 'support@mail.eventnexus.eu',
  // Refund policy (days before event)
  refundPolicy: {
    fullRefund: 7,    // 100% refund if 7+ days before event
    partialRefund: 3, // 50% refund if 3-7 days before event
    noRefund: 0,      // No refund within 3 days of event
  },
  // Payout timing (days after event)
  payoutDelay: 2, // Payout 2 days after event completion
};

// Platform email addresses (all use mail.eventnexus.eu subdomain)
export const PLATFORM_EMAILS = {
  support: 'support@mail.eventnexus.eu',      // User support and help
  info: 'info@mail.eventnexus.eu',            // General inquiries
  noreply: 'noreply@mail.eventnexus.eu',      // Automated notifications
  admin: 'admin@mail.eventnexus.eu',          // Admin notifications
  alerts: 'alerts@mail.eventnexus.eu',        // Brand monitoring alerts
};
