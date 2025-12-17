
import { EventNexusEvent } from './types';

export const CATEGORIES = [
  'Concert', 'Festival', 'Workshop', 'Party', 'Conference', 'Meetup', 'Sports'
];

// Real events are now loaded from Supabase database
// Use getEvents() from services/dbService.ts

export const SUBSCRIPTION_TIERS = {
  free: { maxEvents: 3, analytics: false, customBranding: false, support: 'community' },
  pro: { maxEvents: 20, analytics: true, customBranding: true, support: 'email' },
  premium: { maxEvents: 100, analytics: true, customBranding: true, support: 'priority' },
  enterprise: { maxEvents: Infinity, analytics: true, customBranding: true, support: 'dedicated' }
};
