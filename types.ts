
export type EventVisibility = 'public' | 'private' | 'semi-private';

export interface EventNexusEvent {
  id: string;
  name: string;
  category: string;
  description: string;
  aboutText?: string; // Detailed "About this event" content
  date: string;
  time: string;
  end_date?: string; // For multi-day events
  end_time?: string; // Event end time
  duration_hours?: number; // Calculated duration
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
  // Active event notifications
  notifyActiveEvents: boolean; // Notify about events that are currently happening
  notifyUpcomingEvents: boolean; // Notify about upcoming events in search radius
  upcomingEventWindow: number; // Hours before event starts (default 24)
  minAvailableTickets: number; // Minimum available tickets to trigger notification (default 1)
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
  tutorial_completed?: boolean; // Tracks if user has completed onboarding tutorial
}

export type TicketType = 'general' | 'vip' | 'early_bird' | 'day_pass' | 'multi_day' | 'backstage' | 'student' | 'group';
export type TicketStatus = 'valid' | 'used' | 'cancelled' | 'refunded' | 'expired';

export interface TicketTemplate {
  id: string;
  event_id: string;
  name: string; // e.g., "VIP Pass", "Early Bird", "Day 1 Ticket"
  type: TicketType;
  price: number;
  quantity_total: number;
  quantity_available: number;
  quantity_sold: number;
  description?: string;
  sale_start?: string; // When this ticket goes on sale
  sale_end?: string; // When this ticket stops being sold
  valid_days?: number[]; // For multi-day events, which days is this valid for (e.g., [1,2,3])
  includes?: string[]; // List of benefits (e.g., ["Backstage access", "Meet & greet"])
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Ticket {
  id: string;
  ticket_template_id: string;
  event_id: string;
  user_id: string;
  ticket_type: TicketType;
  ticket_name: string;
  price_paid: number;
  qr_code: string;
  status: TicketStatus;
  purchased_at: string;
  used_at?: string;
  verified_by?: string; // User ID of who verified the ticket
  verification_location?: {
    lat: number;
    lng: number;
  };
  refunded_at?: string;
  refund_reason?: string;
  holder_name: string;
  holder_email: string;
  archived_at?: string; // When the ticket was archived by the user
  archived_by?: string; // User ID who archived the ticket
  metadata?: {
    seat_number?: string;
    table_number?: string;
    group_id?: string;
    special_requirements?: string;
  };
}

export interface TicketVerification {
  id: string;
  ticket_id: string;
  event_id: string;
  verified_by: string;
  verified_at: string;
  location?: {
    lat: number;
    lng: number;
  };
  device_info?: string;
  notes?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'update' | 'follow_alert' | 'proximity_radar' | 'active_event' | 'contact_inquiry';
  eventId?: string;
  senderName: string;
  timestamp: string;
  isRead: boolean;
  metadata?: {
    inquiryId?: string;
    fromEmail?: string;
    inquiryType?: 'contact' | 'partnership';
    availableTickets?: number;
    distance?: number;
    eventStatus?: 'upcoming' | 'active' | 'ending_soon';
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

export interface EventTicketStats {
  event_id: string;
  total_tickets_available: number;
  total_tickets_sold: number;
  total_revenue: number;
  tickets_by_type: {
    type: TicketType;
    name: string;
    sold: number;
    available: number;
    revenue: number;
  }[];
  tickets_checked_in: number;
  check_in_rate: number; // percentage
  peak_sale_time?: string;
  average_ticket_price: number;
}

export interface OrganizerDashboardStats {
  total_events: number;
  upcoming_events: number;
  past_events: number;
  total_tickets_sold: number;
  total_revenue: number;
  total_attendees: number;
  average_ticket_price: number;
  top_selling_event?: {
    id: string;
    name: string;
    tickets_sold: number;
    revenue: number;
  };
  revenue_by_month: {
    month: string;
    revenue: number;
    tickets_sold: number;
  }[];
  recent_sales: {
    ticket_id: string;
    event_name: string;
    buyer_name: string;
    amount: number;
    purchased_at: string;
  }[];
}
