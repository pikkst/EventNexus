/**
 * White-Label Demo Configuration Generator
 * 
 * This script generates a comprehensive white-labeling configuration
 * that showcases all available Enterprise features for EventNexus agencies.
 * 
 * Usage:
 * 1. Copy the generated config
 * 2. Update user branding in Supabase SQL Editor:
 *    UPDATE users SET branding = '<paste-json-here>'::jsonb WHERE email = 'your-email@example.com';
 * 3. Visit https://eventnexus.eu/#/agency/your-slug to see your white-label page
 */

import type { UserBranding, EnterprisePageConfig } from '../types';

/**
 * Complete white-label configuration with all Enterprise features enabled
 */
export const demoWhiteLabelConfig: UserBranding = {
  // ==================== VISUAL IDENTITY ====================
  
  /**
   * Primary brand color (hex) - used for buttons, accents, CTAs
   * Example: #6366f1 (indigo), #3b82f6 (blue), #8b5cf6 (purple)
   */
  primaryColor: '#6366f1',
  
  /**
   * Secondary/accent color (hex) - used for highlights, hover states
   * Example: #818cf8 (light indigo), #60a5fa (light blue)
   */
  accentColor: '#818cf8',
  
  /**
   * Agency logo URL - displayed in page header
   * Recommended: 200x60px transparent PNG
   */
  logoUrl: 'https://placehold.co/200x60/6366f1/ffffff/png?text=Your+Logo',
  
  /**
   * Custom domain - shows banner at top of page
   * Example: events.youragency.com, yourbrand.events
   */
  customDomain: 'events.youragency.com',
  
  /**
   * Hero banner image URL - fallback if no pageConfig.heroMedia
   * Recommended: 1920x1080px high-quality image
   */
  bannerUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920&h=1080&fit=crop',
  
  /**
   * Tagline - appears below agency name on hero
   * Keep it short and impactful (5-10 words)
   */
  tagline: 'Elevating Events Through Innovation & Excellence',
  
  /**
   * Extended about section - detailed agency description
   * Supports line breaks (\n) for formatting
   * Separate from organizer.bio (which is short description)
   */
  about: `Founded in 2020, we've revolutionized the event industry by combining cutting-edge technology with deeply personalized experiences. 

Our mission is simple: create moments that matter. 

From intimate gatherings to large-scale festivals, we bring expertise, creativity, and flawless execution to every project. Our team of seasoned professionals has delivered over 100 successful events across 20 countries, touching the lives of thousands of attendees.`,
  
  /**
   * Video reel URL - opens in full-screen modal
   * Recommended: 1-3 minute highlight reel, MP4 format
   */
  videoReel: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  
  // ==================== SOCIAL LINKS ====================
  
  socialLinks: {
    /**
     * Agency website URL (with https://)
     */
    website: 'https://youragency.com',
    
    /**
     * Twitter/X profile URL
     */
    twitter: 'https://twitter.com/youragency',
    
    /**
     * Instagram profile URL
     */
    instagram: 'https://instagram.com/youragency',
    
    // Future: linkedin, facebook, tiktok, youtube
  },
  
  // ==================== SERVICES ====================
  
  /**
   * Services offered by your agency
   * Each service has: icon (Lucide icon name), name, desc
   * 
   * Available icons: Sparkles, Users, Zap, TrendingUp, Calendar, MapPin, 
   * Heart, Star, Trophy, Target, Rocket, Award, Crown, Shield, etc.
   * 
   * See full list: https://lucide.dev/icons/
   */
  services: [
    {
      icon: 'Sparkles',
      name: 'Event Planning',
      desc: 'End-to-end event conceptualization, design, and execution with meticulous attention to detail.'
    },
    {
      icon: 'Users',
      name: 'Community Building',
      desc: 'Foster engaged, loyal communities around your events through strategic engagement tactics.'
    },
    {
      icon: 'Zap',
      name: 'Tech Integration',
      desc: 'Seamless ticketing platforms, check-in systems, and event management tools.'
    },
    {
      icon: 'TrendingUp',
      name: 'Growth Marketing',
      desc: 'Data-driven marketing strategies to maximize attendance and event ROI.'
    },
    {
      icon: 'Calendar',
      name: 'Venue Sourcing',
      desc: 'Access to premium venues worldwide with negotiated rates and availability guarantees.'
    },
    {
      icon: 'Shield',
      name: 'Risk Management',
      desc: 'Comprehensive insurance, security planning, and contingency strategies.'
    }
  ],
  
  // ==================== STATISTICS ====================
  
  /**
   * Agency statistics - displayed on hero as stat cards
   * All fields are optional; show what makes you look good!
   */
  stats: {
    /**
     * Total events organized (lifetime)
     */
    totalEvents: 127,
    
    /**
     * Total attendees across all events
     */
    totalAttendees: 45000,
    
    /**
     * Total revenue generated (not displayed publicly)
     */
    totalRevenue: 2500000,
    
    /**
     * Average rating (0-5 stars)
     */
    averageRating: 4.9,
    
    /**
     * Follower count on platform
     */
    followerCount: 3200,
    
    /**
     * Number of upcoming events
     */
    upcomingEvents: 8,
    
    /**
     * Years in operation
     */
    activeYears: 4,
    
    /**
     * Percentage of repeat attendees (optional)
     */
    repeatAttendeeRate: 68,
  },
  
  // ==================== TEAM MEMBERS ====================
  
  /**
   * Team showcase - introduce your key people
   * Auto-generates avatars if avatar URL not provided
   */
  team: [
    {
      id: '1',
      name: 'Hunter Set',
      role: 'Founder & CEO',
      avatar: 'https://ui-avatars.com/api/?name=Hunter+Set&size=128&background=6366f1&color=fff&bold=true',
      bio: '15 years in event management. Former VP at EventCorp. Passionate about creating unforgettable experiences.'
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      role: 'Head of Operations',
      avatar: 'https://ui-avatars.com/api/?name=Sarah+Johnson&size=128&background=8b5cf6&color=fff&bold=true',
      bio: 'Operations wizard with expertise in logistics, vendor management, and on-site coordination.'
    },
    {
      id: '3',
      name: 'Mike Chen',
      role: 'Creative Director',
      avatar: 'https://ui-avatars.com/api/?name=Mike+Chen&size=128&background=3b82f6&color=fff&bold=true',
      bio: 'Award-winning designer specializing in event branding, stage design, and immersive experiences.'
    },
    {
      id: '4',
      name: 'Emma Rodriguez',
      role: 'Head of Marketing',
      avatar: 'https://ui-avatars.com/api/?name=Emma+Rodriguez&size=128&background=ec4899&color=fff&bold=true',
      bio: 'Growth hacker with 10+ years in digital marketing. Data-driven strategies that fill seats.'
    }
  ],
  
  // ==================== TESTIMONIALS ====================
  
  /**
   * Client testimonials - rotates in carousel
   * Include diverse voices (attendees, clients, partners)
   */
  testimonials: [
    {
      id: '1',
      author: 'John Smith',
      role: 'Event Attendee',
      content: 'Best event experience of my life! Every detail was meticulously planned, from the stunning venue to the engaging activities. I left feeling inspired and connected.',
      rating: 5,
      avatar: 'https://ui-avatars.com/api/?name=John+Smith&size=64&background=10b981&color=fff',
      eventName: 'Tech Summit 2024'
    },
    {
      id: '2',
      author: 'Lisa Anderson',
      role: 'Corporate Client',
      content: 'We hired them for our annual conference and they exceeded all expectations. Professional, creative, and incredibly responsive. Our attendees are still raving about it.',
      rating: 5,
      avatar: 'https://ui-avatars.com/api/?name=Lisa+Anderson&size=64&background=f59e0b&color=fff',
      eventName: 'Innovation Conference 2024'
    },
    {
      id: '3',
      author: 'David Kim',
      role: 'Community Organizer',
      content: 'They transformed our small local event into a city-wide phenomenon. Their expertise in community building and marketing is unmatched.',
      rating: 5,
      avatar: 'https://ui-avatars.com/api/?name=David+Kim&size=64&background=ef4444&color=fff',
      eventName: 'Community Festival 2023'
    }
  ],
  
  // ==================== PARTNERS ====================
  
  /**
   * Partner logos - shows collaboration with brands
   * Displays as grid with grayscale-to-color hover effect
   */
  partners: [
    {
      id: '1',
      name: 'TechCorp',
      logo: 'https://placehold.co/200x80/e2e8f0/64748b/png?text=TechCorp',
      website: 'https://techcorp.example.com',
      description: 'Leading technology provider'
    },
    {
      id: '2',
      name: 'EventSpace',
      logo: 'https://placehold.co/200x80/e2e8f0/64748b/png?text=EventSpace',
      website: 'https://eventspace.example.com',
      description: 'Premium venue network'
    },
    {
      id: '3',
      name: 'MediaPro',
      logo: 'https://placehold.co/200x80/e2e8f0/64748b/png?text=MediaPro',
      website: 'https://mediapro.example.com',
      description: 'Event photography & videography'
    },
    {
      id: '4',
      name: 'Catering Plus',
      logo: 'https://placehold.co/200x80/e2e8f0/64748b/png?text=CateringPlus',
      website: 'https://cateringplus.example.com',
      description: 'Gourmet catering services'
    },
    {
      id: '5',
      name: 'Sound Systems Inc',
      logo: 'https://placehold.co/200x80/e2e8f0/64748b/png?text=SoundSystems',
      website: 'https://soundsystems.example.com',
      description: 'Professional AV equipment'
    },
    {
      id: '6',
      name: 'Security Pro',
      logo: 'https://placehold.co/200x80/e2e8f0/64748b/png?text=SecurityPro',
      website: 'https://securitypro.example.com',
      description: 'Event security services'
    }
  ],
  
  // ==================== MEDIA COVERAGE ====================
  
  /**
   * Press mentions - builds credibility
   * Links to actual articles (or use # as placeholder)
   */
  mediaCoverage: [
    {
      id: '1',
      outlet: 'Forbes',
      title: 'How This Agency is Revolutionizing Live Event Experiences',
      url: 'https://forbes.com/article/example',
      date: '2024-01-15',
      logo: 'https://placehold.co/200x50/1e293b/fff/png?text=FORBES'
    },
    {
      id: '2',
      outlet: 'TechCrunch',
      title: 'Event Tech Startup Raises $5M to Scale Operations',
      url: 'https://techcrunch.com/article/example',
      date: '2023-11-20',
      logo: 'https://placehold.co/200x50/0f766e/fff/png?text=TechCrunch'
    },
    {
      id: '3',
      outlet: 'Event Manager Blog',
      title: 'Top 10 Event Agencies to Watch in 2024',
      url: 'https://eventmanagerblog.com/article/example',
      date: '2023-12-10',
      logo: 'https://placehold.co/200x50/7c3aed/fff/png?text=EMB'
    }
  ],
  
  // ==================== EVENT HIGHLIGHTS ====================
  
  /**
   * Showcase your best past events
   * Use high-quality images or videos
   */
  eventHighlights: [
    {
      id: '1',
      title: 'Tech Summit 2024',
      description: 'Our flagship annual conference bringing together 2,500+ tech leaders, innovators, and entrepreneurs for 3 days of networking, workshops, and inspiration.',
      imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop',
      videoUrl: undefined, // or provide video URL
      stats: {
        attendance: 2500,
        rating: 4.9,
        revenue: 450000
      },
      date: '2024-06-15'
    },
    {
      id: '2',
      title: 'Music Festival Nights',
      description: 'A three-day music extravaganza featuring 50+ artists across 4 stages. Our most attended event to date with incredible energy and production.',
      imageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=600&fit=crop',
      stats: {
        attendance: 15000,
        rating: 4.8
      },
      date: '2023-08-20'
    },
    {
      id: '3',
      title: 'Corporate Innovation Day',
      description: 'Intimate executive summit for Fortune 500 leaders focused on digital transformation and future-of-work strategies.',
      imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=600&fit=crop',
      stats: {
        attendance: 200,
        rating: 5.0
      },
      date: '2024-03-10'
    }
  ],
  
  // ==================== PAGE CONFIGURATION ====================
  
  /**
   * Control which sections appear and how page behaves
   */
  pageConfig: {
    // ----------------- HERO SECTION -----------------
    
    /**
     * Hero type: 'image' | 'video' | 'slideshow'
     * - image: Single static background with Ken Burns effect
     * - video: Autoplay looping video background
     * - slideshow: Multiple images cycling with transitions
     */
    heroType: 'video',
    
    /**
     * Hero media source(s)
     * - If heroType='image' or 'video': string URL
     * - If heroType='slideshow': array of image URLs
     * 
     * Examples:
     * - Image: 'https://images.unsplash.com/photo-xyz?w=1920&h=1080'
     * - Video: 'https://storage.com/agency-reel.mp4'
     * - Slideshow: ['image1.jpg', 'image2.jpg', 'image3.jpg']
     */
    heroMedia: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    
    // Or for slideshow:
    // heroMedia: [
    //   'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920',
    //   'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920',
    //   'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1920'
    // ],
    
    // ----------------- SECTION TOGGLES -----------------
    
    /**
     * Show statistics on hero (total events, attendees, rating, years)
     * Requires: branding.stats object populated
     */
    showStats: true,
    
    /**
     * Show testimonials carousel
     * Requires: branding.testimonials array populated
     */
    showTestimonials: true,
    
    /**
     * Show team member showcase
     * Requires: branding.team array populated
     */
    showTeam: true,
    
    /**
     * Show partner logo grid
     * Requires: branding.partners array populated
     */
    showPartners: true,
    
    /**
     * Show media coverage cards
     * Requires: branding.mediaCoverage array populated
     */
    showMediaCoverage: true,
    
    /**
     * Show event highlights section
     * Requires: branding.eventHighlights array populated
     */
    showEventHighlights: true,
    
    // ----------------- FEATURE TOGGLES -----------------
    
    /**
     * Enable "Get In Touch" contact form modal
     * Sends email via Resend API and creates notification
     */
    enableContactForm: true,
    
    /**
     * Show newsletter signup section ("Inner Circle")
     */
    enableNewsletter: true,
    
    /**
     * Show social sharing buttons (Twitter, Facebook, LinkedIn, Copy)
     */
    enableSocialSharing: true,
    
    /**
     * Enable VIP/members-only section (future feature)
     */
    enableVIPAccess: false,
    
    // ----------------- LAYOUT & THEME -----------------
    
    /**
     * Page layout style (currently only 'modern' implemented)
     * Future: 'classic', 'minimal', 'bold'
     */
    layout: 'modern',
    
    /**
     * Color theme (currently only 'dark' implemented)
     * Future: 'light', 'auto' (system preference)
     */
    theme: 'dark',
    
    /**
     * Custom sections (future feature)
     * Add your own sections with custom content
     */
    customSections: []
  }
};

/**
 * Minimal configuration - only essential features
 */
export const minimalWhiteLabelConfig: Partial<UserBranding> = {
  primaryColor: '#6366f1',
  accentColor: '#818cf8',
  tagline: 'Creating Memorable Experiences',
  
  services: [
    {
      icon: 'Calendar',
      name: 'Event Planning',
      desc: 'Full-service event planning and coordination'
    },
    {
      icon: 'Users',
      name: 'Community Events',
      desc: 'Building connections through gatherings'
    }
  ],
  
  pageConfig: {
    heroType: 'image',
    heroMedia: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920&h=1080&fit=crop',
    showStats: false,
    showTestimonials: false,
    showTeam: false,
    showPartners: false,
    showMediaCoverage: false,
    showEventHighlights: false,
    enableContactForm: true,
    enableNewsletter: false,
    enableSocialSharing: true,
    enableVIPAccess: false,
    customSections: [],
    layout: 'modern',
    theme: 'dark'
  }
};

/**
 * SQL Update Query Generator
 * 
 * Usage:
 * 1. Run this function with your config
 * 2. Copy the generated SQL
 * 3. Run in Supabase SQL Editor
 */
export function generateUpdateSQL(
  email: string,
  config: UserBranding
): string {
  const jsonConfig = JSON.stringify(config, null, 2);
  
  return `-- Update white-label branding configuration
UPDATE users 
SET branding = '${jsonConfig}'::jsonb
WHERE email = '${email}';

-- Verify the update
SELECT 
  id,
  name,
  email,
  agency_slug,
  branding->>'primaryColor' as primary_color,
  branding->>'customDomain' as custom_domain,
  branding->'pageConfig'->>'heroType' as hero_type
FROM users 
WHERE email = '${email}';`;
}

// Example usage:
// console.log(generateUpdateSQL('huntersest@gmail.com', demoWhiteLabelConfig));

export default {
  demoWhiteLabelConfig,
  minimalWhiteLabelConfig,
  generateUpdateSQL
};
