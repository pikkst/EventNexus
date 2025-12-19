
export type EventVisibility = 'public' | 'private' | 'semi-private';

export interface EventNexusEvent {
  id: string;
  name: string;
  category: string;
  description: string;
  date: string;
  time: string;
  location: {
    lat: number;
    lng: number;
    address: string;
    city: string;
  };
  price: number;
  visibility: EventVisibility;
  organizerId: string;
  imageUrl: string;
  attendeesCount: number;
  maxAttendees: number;
}

export interface PlatformCampaign {
  id: string;
  title: string;
  copy: string;
  status: 'Active' | 'Draft' | 'Archived' | 'Scheduled';
  placement: 'landing_page' | 'social_flyer' | 'both';
  target: 'attendees' | 'organizers';
  incentive: {
    type: 'credits' | 'pro_discount' | 'none';
    value: number; // e.g., 30 credits or 30 percent
    limit: number; // e.g., first 100 users
    redeemed: number;
    durationMonths?: number; // for pro discounts
  };
  metrics: {
    views: number;
    clicks: number;
    guestSignups: number;
    proConversions: number;
    revenueValue: number;
  };
  tracking: {
    sources: {
      facebook: number;
      x: number;
      instagram: number;
      direct: number;
    };
  };
  imageUrl: string;
  cta: string;
  trackingCode: string;
}

export interface SocialLinks {
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  website?: string;
}

export interface AgencyService {
  id: string;
  icon: string; // Lucide icon name or emoji
  name: string;
  desc: string;
}

export interface UserBranding {
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
  customDomain?: string;
  bannerUrl?: string;
  tagline?: string;
  socialLinks?: SocialLinks;
  services?: AgencyService[];
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  proximityAlerts: boolean;
  alertRadius: number; // in km
  interestedCategories: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  bio?: string;
  location?: string;
  role: 'attendee' | 'organizer' | 'agency' | 'admin';
  subscription_tier: 'free' | 'pro' | 'premium' | 'enterprise';
  // Keep old name for backwards compatibility
  subscription?: 'free' | 'pro' | 'premium' | 'enterprise';
  avatar: string;
  credits: number; 
  agencySlug?: string;
  followedOrganizers: string[];
  branding?: UserBranding;
  notification_prefs: NotificationPreferences;
  status?: 'active' | 'suspended' | 'banned';
  suspended_at?: string;
  suspension_reason?: string;
  banned_at?: string;
  ban_reason?: string;
}

export interface Ticket {
  id: string;
  eventId: string;
  userId: string;
  qrCode: string;
  status: 'valid' | 'used' | 'cancelled';
  purchasedAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'update' | 'follow_alert' | 'proximity_radar';
  eventId?: string;
  senderName: string;
  timestamp: string;
  isRead: boolean;
}
