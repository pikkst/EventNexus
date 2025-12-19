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
    description: 'Perfect for trying out EventNexus'
  },
  pro: { 
    maxEvents: 20, 
    analytics: true, 
    customBranding: true, 
    support: 'email',
    price: 29,
    description: 'For professional event organizers'
  },
  premium: { 
    maxEvents: 100, 
    analytics: true, 
    customBranding: true, 
    support: 'priority',
    price: 99,
    description: 'For agencies and large organizers'
  },
  enterprise: { 
    maxEvents: Infinity, 
    analytics: true, 
    customBranding: true, 
    support: 'dedicated',
    price: 299,
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
  supportEmail: 'huntersest@gmail.com'
};
