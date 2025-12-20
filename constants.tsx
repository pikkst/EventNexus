import { EventNexusEvent } from './types';

// Event categories available in the platform
export const CATEGORIES = [
  'Concert', 'Festival', 'Workshop', 'Party', 'Conference', 'Meetup', 'Sports'
];

// Subscription tiers and their limits
export const SUBSCRIPTION_TIERS = {
  free: { 
    maxEvents: 3, 
    analytics: false, 
    customBranding: false, 
    support: 'community',
    price: 0,
    commissionRate: 0.05, // 5% platform fee
    description: 'Perfect for trying out EventNexus'
  },
  pro: { 
    maxEvents: 20, 
    analytics: true, 
    customBranding: true, 
    support: 'email',
    price: 19.99,
    commissionRate: 0.03, // 3% platform fee
    description: 'For professional event organizers'
  },
  premium: { 
    maxEvents: 100, 
    analytics: true, 
    customBranding: true, 
    support: 'priority',
    price: 49.99,
    commissionRate: 0.025, // 2.5% platform fee
    description: 'For agencies and large organizers'
  },
  enterprise: { 
    maxEvents: Infinity, 
    analytics: true, 
    customBranding: true, 
    support: 'dedicated',
    price: 149.99,
    commissionRate: 0.015, // 1.5% platform fee
    description: 'Custom solutions for enterprises'
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
  supportEmail: 'huntersest@gmail.com',
  // Refund policy (days before event)
  refundPolicy: {
    fullRefund: 7,    // 100% refund if 7+ days before event
    partialRefund: 3, // 50% refund if 3-7 days before event
    noRefund: 0,      // No refund within 3 days of event
  },
  // Payout timing (days after event)
  payoutDelay: 2, // Payout 2 days after event completion
};
