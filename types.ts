
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
  isFeatured?: boolean; // Premium tier feature
  customBranding?: {
    primaryColor?: string;
    logo?: string;
  };
  translations?: {
    [languageCode: string]: string; // e.g., { "en": "English", "es": "Español", "fr": "Français" }
  };
}

export interface PlatformCampaign {
  id: string;
  title: string;
  copy: string;
  status: 'Active' | 'Draft' | 'Paused' | 'Completed';
  placement: 'landing_page' | 'dashboard' | 'both';
  target: 'attendees' | 'organizers' | 'all';
  incentive: {
    type: 'credits' | 'pro_discount' | 'none';
    value: number; // e.g., 30 credits or 30 percent
    limit: number; // e.g., first 100 users
    redeemed: number;
    durationMonths?: number; // for pro discounts
    description?: string;
  };
  metrics: {
    views: number;
    clicks: number;
    guestSignups: number;
    proConversions: number;
    revenueValue: number;
    conversions?: number; // for backwards compatibility
    revenueGenerated?: number; // for backwards compatibility
  };
  tracking?: {
    sources: {
      facebook: number;
      x: number;
      instagram: number;
      direct: number;
    };
  };
  imageUrl?: string;
  image_url?: string; // database column name
  cta: string;
  trackingCode?: string;
  tracking_code?: string; // database column name
  created_at?: string;
  updated_at?: string;
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

export interface Testimonial {
  id: string;
  author: string;
  role?: string;
  content: string;
  rating: number;
  eventName?: string;
  avatar?: string;
  date: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio?: string;
  avatar?: string;
  socialLinks?: SocialLinks;
}

export interface Partner {
  id: string;
  name: string;
  logo: string;
  website?: string;
  description?: string;
}

export interface MediaCoverage {
  id: string;
  outlet: string;
  title: string;
  url: string;
  date: string;
  logo?: string;
}

export interface CustomSection {
  id: string;
  type: 'text' | 'gallery' | 'video' | 'stats' | 'faq';
  title: string;
  content: any; // JSON content based on type
  order: number;
  isVisible: boolean;
}

export interface EventHighlight {
  id: string;
  eventId: string;
  title: string;
  description: string;
  imageUrl: string;
  videoUrl?: string;
  stats?: {
    attendance: number;
    rating: number;
    revenue?: number;
  };
  date: string;
}

export interface EnterprisePageConfig {
  heroType: 'image' | 'video' | 'slideshow';
  heroMedia: string | string[]; // URL or array of URLs
  showStats: boolean;
  showTestimonials: boolean;
  showTeam: boolean;
  showPartners: boolean;
  showMediaCoverage: boolean;
  showEventHighlights: boolean;
  enableContactForm: boolean;
  enableNewsletter: boolean;
  enableSocialSharing: boolean;
  enableVIPAccess: boolean;
  customSections: CustomSection[];
  layout: 'modern' | 'classic' | 'minimal' | 'bold';
  theme: 'dark' | 'light' | 'auto';
}

export interface OrganizerStats {
  totalEvents: number;
  totalAttendees: number;
  totalRevenue: number;
  averageRating: number;
  followerCount: number;
  upcomingEvents: number;
  activeYears: number;
  repeatAttendeeRate?: number;
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
  // Enterprise tier features
  testimonials?: Testimonial[];
  team?: TeamMember[];
  partners?: Partner[];
  mediaCoverage?: MediaCoverage[];
  eventHighlights?: EventHighlight[];
  stats?: OrganizerStats;
  pageConfig?: EnterprisePageConfig;
  about?: string; // Extended about section
  videoReel?: string; // Video URL for agency reel
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
  credits_balance?: number; // User's credit balance (same as credits, for clarity)
  is_beta_tester?: boolean; // True if user signed up via beta invite code
  agencySlug?: string; // camelCase for frontend
  agency_slug?: string; // snake_case from database - both supported
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
  type: 'announcement' | 'update' | 'follow_alert' | 'proximity_radar' | 'contact_inquiry';
  eventId?: string;
  senderName: string;
  timestamp: string;
  isRead: boolean;
  metadata?: {
    inquiryId?: string;
    fromEmail?: string;
    inquiryType?: 'contact' | 'partnership';
  };
}

export interface BrandMonitoringAlert {
  id: string;
  type: 'code' | 'domain' | 'brand' | 'search' | 'social' | 'competitor';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  url?: string;
  timestamp: Date;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  actionTaken: string | null;
  detectedBy?: string;
  metadata?: Record<string, any>;
}

export interface MonitoringStats {
  codeScans: number;
  domainChecks: number;
  brandMentions: number;
  searchResults: number;
  socialMentions: number;
  competitorAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  infoAlerts: number;
  lastScanTime: Date;
}

export interface SuccessStory {
  id: string;
  title: string;
  description: string;
  organizer_name: string;
  organizer_role?: string;
  event_type?: string;
  avatar_url?: string;
  metrics?: {
    tickets_sold?: number;
    revenue?: string;
    attendee_growth?: string;
    [key: string]: any;
  };
  quote: string;
  is_featured: boolean;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PressMention {
  id: string;
  publication_name: string;
  publication_logo_url?: string;
  article_title: string;
  article_url: string;
  excerpt?: string;
  published_date: string;
  author_name?: string;
  category?: string;
  is_featured: boolean;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PlatformMedia {
  id: string;
  media_type: string; // 'walkthrough_video', 'demo_video', 'tutorial', etc.
  title: string;
  description?: string;
  video_url?: string;
  thumbnail_url?: string;
  duration?: string;
  is_active: boolean;
  display_location: string;
  display_order: number;
  metadata?: {
    [key: string]: any;
  };
  created_at?: string;
  updated_at?: string;
}
