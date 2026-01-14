/**
 * Intelligent Autonomous Marketing Service
 * 
 * Strategic AI-powered platform marketing that:
 * - Analyzes real platform data
 * - Generates targeted campaigns based on insights
 * - Monitors performance and adjusts strategies
 * - Creates and publishes social media content
 * - Makes data-driven decisions without simulation
 */

import { supabase } from './supabase';
import { generatePlatformGrowthCampaign, generateAdImage, generateSocialMediaPosts } from './geminiService';

// ============================================================
// Platform Knowledge Base - Real EventNexus Features
// ============================================================

export const PLATFORM_FEATURES = {
  // Core Features
  mapFirst: {
    name: 'Map-First Event Discovery',
    description: 'Interactive map showing events by location in real-time',
    benefit_attendees: 'Find events near you instantly on an interactive map',
    benefit_organizers: 'Get discovered by people searching in your area',
    usps: ['Geospatial search', 'PostGIS powered', 'Real-time location filtering']
  },
  
  // For Attendees
  attendee_features: {
    discovery: {
      name: 'Smart Event Discovery',
      features: ['Map-based search', 'Category filtering', 'Date range selection', 'Proximity radar'],
      benefits: ['Find events near you', 'Discover hidden gems', 'Never miss local happenings']
    },
    booking: {
      name: 'Easy Ticket Booking',
      features: ['Secure payments', 'Instant confirmation', 'Digital tickets', 'QR codes'],
      benefits: ['Book in seconds', 'No printer needed', 'Safe & secure']
    },
    social: {
      name: 'Social Features',
      features: ['Follow organizers', 'Like events', 'Share to social media', 'Event recommendations'],
      benefits: ['Stay updated', 'Build your event profile', 'Connect with community']
    },
    multilingual: {
      name: 'Multi-Language Support',
      features: ['AI-powered translation', 'Multiple languages', 'Automatic detection'],
      benefits: ['Events in your language', 'No language barriers', 'Inclusive platform']
    }
  },
  
  // For Event Organizers
  organizer_features: {
    creation: {
      name: 'Professional Event Creation',
      features: ['AI-powered descriptions', 'Image generation', 'Smart taglines', 'SEO optimization'],
      benefits: ['Create stunning events in minutes', 'AI helps with content', 'Professional results']
    },
    ticketing: {
      name: 'Complete Ticketing System',
      features: ['Multiple ticket types', 'Pricing tiers', 'Capacity management', 'QR scanning'],
      benefits: ['Sell tickets easily', 'Track attendees', 'Manage capacity']
    },
    payments: {
      name: 'Stripe Connect Payouts',
      features: ['Direct payouts', 'No upfront costs', 'Transparent fees', 'Fast transfers'],
      benefits: ['Get paid directly', 'Zero setup fees', 'Keep most of your revenue']
    },
    marketing: {
      name: 'AI Marketing Tools',
      features: ['Campaign generation', 'Social media posts', 'Ad image creation', 'Multi-platform sharing'],
      benefits: ['Professional marketing', 'AI creates content', 'Reach more people']
    },
    analytics: {
      name: 'Real-Time Analytics',
      features: ['Ticket sales tracking', 'Audience insights', 'Revenue reports', 'Performance metrics'],
      benefits: ['Track your success', 'Understand your audience', 'Data-driven decisions']
    },
    storage: {
      name: 'Media Management',
      features: ['Unlimited event images', 'Gallery uploads', 'High-quality hosting', 'Fast CDN'],
      benefits: ['Showcase your events', 'Professional presentation', 'Fast loading']
    }
  },
  
  // For Agencies/White Label
  agency_features: {
    whiteLabel: {
      name: 'White Label Platform',
      features: ['Custom branding', 'Your domain', 'Custom colors', 'Logo placement'],
      benefits: ['Your own event platform', 'Brand consistency', 'Professional image']
    },
    clientManagement: {
      name: 'Multi-Client Management',
      features: ['Manage multiple organizers', 'Centralized dashboard', 'Bulk operations'],
      benefits: ['Serve multiple clients', 'Efficient workflow', 'Scale your agency']
    }
  },
  
  // Platform Technology
  technology: {
    name: 'Modern Tech Stack',
    stack: ['React 19', 'TypeScript', 'Supabase', 'PostGIS', 'Gemini AI', 'Stripe'],
    benefits: ['Fast & reliable', 'Secure', 'Scalable', 'Future-proof']
  },
  
  // Pricing (Real tiers from constants.tsx)
  pricing: {
    free: {
      name: 'Free Tier',
      features: ['Create events', 'List on platform', 'Basic ticketing', 'AI credits'],
      limitations: ['Credit-based AI usage', 'Standard support'],
      bestFor: 'Testing and small events'
    },
    pro: {
      name: 'Pro Tier',
      price: '€19/month',
      features: ['Unlimited AI tools', 'Advanced analytics', 'Priority support', 'Custom branding'],
      bestFor: 'Professional organizers'
    },
    premium: {
      name: 'Premium Tier',
      price: '€49/month',
      features: ['All Pro features', 'White label', 'API access', 'Dedicated support'],
      bestFor: 'Agencies and enterprises'
    }
  },
  
  // Unique Selling Points
  usps: [
    'Map-first discovery - find events by location',
    'Zero upfront costs for organizers',
    'AI-powered marketing tools included',
    'Direct Stripe payouts - no waiting',
    'Multi-language support built-in',
    'Professional ticketing system',
    'Real-time updates and notifications',
    'Mobile-optimized web platform',
    'Secure and GDPR compliant'
  ]
};

// ============================================================
// Types
// ============================================================

export interface PlatformIntelligence {
  // Real-time platform metrics
  totalEvents: number;
  activeEvents: number;
  totalUsers: number;
  totalOrganizers: number;
  totalTicketsSold: number;
  totalRevenue: number;
  
  // Category insights
  topCategories: Array<{ category: string; count: number; growth: number }>;
  
  // Geographic insights
  topCities: Array<{ city: string; eventCount: number }>;
  
  // Temporal insights
  upcomingEventsCount: number;
  eventsThisWeek: number;
  eventsThisMonth: number;
  
  // User behavior insights
  averageTicketsPerUser: number;
  conversionRate: number;
  
  // Platform health
  activeListings30d: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  
  // Competitive advantages (actual features)
  hasGeospatialSearch: boolean;
  hasAITools: boolean;
  hasMultiLanguage: boolean;
  hasStripeIntegration: boolean;
  hasRealTimeUpdates: boolean;
}

export interface MarketingStrategy {
  strategyType: 'acquisition' | 'retention' | 'activation' | 'engagement' | 'monetization';
  targetAudience: 'attendees' | 'creators' | 'platform-growth' | 'new-features' | 'community' | 'seasonal' | 'retention' | 'referral';
  rationale: string;
  confidenceScore: number;
  estimatedImpact: {
    expectedSignups: number;
    expectedEngagement: number;
    expectedRevenue: number;
  };
  campaignTheme: string;
  keyMessages: string[];
  targetingCriteria: {
    demographics: string[];
    interests: string[];
    behaviors: string[];
  };
}

export interface AutoCampaignResult {
  success: boolean;
  campaign_id?: string;
  strategy: MarketingStrategy;
  generated_content: {
    title: string;
    copy: string;
    image_url?: string;
    social_posts?: any;
  };
  actions_taken: {
    campaign_created: boolean;
    image_generated: boolean;
    social_scheduled: boolean;
  };
}

// ============================================================
// Platform Intelligence Gathering
// ============================================================

/**
 * Gather comprehensive real platform data for strategic decisions
 * This uses ACTUAL database queries - NO simulation or fake data
 */
export async function gatherPlatformIntelligence(): Promise<PlatformIntelligence> {
  try {
    // Get real event counts
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, category, location, start_time, status');
    
    if (eventsError) throw eventsError;

    // Get real user counts
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, role, created_at');
    
    if (usersError) throw usersError;

    // Get real ticket data
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('id, price, user_id, created_at');
    
    if (ticketsError) throw ticketsError;

    // Calculate category insights
    const categoryMap = new Map<string, number>();
    events?.forEach(event => {
      const cat = event.category || 'Other';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });

    const topCategories = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count, growth: 0 })) // Growth calculated separately
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate city insights
    const cityMap = new Map<string, number>();
    events?.forEach(event => {
      const city = event.location?.split(',')[0]?.trim() || 'Unknown';
      cityMap.set(city, (cityMap.get(city) || 0) + 1);
    });

    const topCities = Array.from(cityMap.entries())
      .map(([city, eventCount]) => ({ city, eventCount }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 5);

    // Calculate temporal metrics
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const upcomingEventsCount = events?.filter(e => 
      e.start_time && new Date(e.start_time) > now
    ).length || 0;

    const eventsThisWeek = events?.filter(e => 
      e.start_time && new Date(e.start_time) >= now && new Date(e.start_time) <= oneWeekFromNow
    ).length || 0;

    const eventsThisMonth = events?.filter(e => 
      e.start_time && new Date(e.start_time) >= now && new Date(e.start_time) <= oneMonthFromNow
    ).length || 0;

    // Calculate user metrics
    const totalOrganizers = users?.filter(u => u.role === 'organizer' || u.role === 'admin').length || 0;
    const totalRevenue = tickets?.reduce((sum, t) => sum + (parseFloat(t.price) || 0), 0) || 0;

    // Recent user activity
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const newUsersToday = users?.filter(u => 
      u.created_at && new Date(u.created_at) >= oneDayAgo
    ).length || 0;

    const newUsersThisWeek = users?.filter(u => 
      u.created_at && new Date(u.created_at) >= oneWeekAgo
    ).length || 0;

    const activeListings30d = events?.filter(e => 
      e.created_at && new Date(e.created_at) >= thirtyDaysAgo
    ).length || 0;

    // Calculate conversion metrics
    const usersWithTickets = new Set(tickets?.map(t => t.user_id)).size;
    const conversionRate = users && users.length > 0 ? (usersWithTickets / users.length) * 100 : 0;
    const averageTicketsPerUser = users && users.length > 0 ? (tickets?.length || 0) / users.length : 0;

    return {
      totalEvents: events?.length || 0,
      activeEvents: events?.filter(e => e.status === 'published').length || 0,
      totalUsers: users?.length || 0,
      totalOrganizers,
      totalTicketsSold: tickets?.length || 0,
      totalRevenue,
      topCategories,
      topCities,
      upcomingEventsCount,
      eventsThisWeek,
      eventsThisMonth,
      averageTicketsPerUser,
      conversionRate,
      activeListings30d,
      newUsersToday,
      newUsersThisWeek,
      // Platform features (hardcoded - these are real features)
      hasGeospatialSearch: true,
      hasAITools: true,
      hasMultiLanguage: true,
      hasStripeIntegration: true,
      hasRealTimeUpdates: true
    };
  } catch (error) {
    console.error('Error gathering platform intelligence:', error);
    throw error;
  }
}

// ============================================================
// Strategic Decision Making
// ============================================================

/**
 * Generate detailed campaign messaging based on target audience
 */
function generateAudienceMessaging(
  targetAudience: string,
  intelligence: PlatformIntelligence
): { theme: string; messages: string[]; features: string[] } {
  
  switch (targetAudience) {
    case 'attendees':
    case 'platform-growth':
      return {
        theme: intelligence.topCategories.length > 0 
          ? `Discover ${intelligence.topCategories[0].category} Events Near You`
          : 'Find Amazing Events in Your City',
        messages: [
          `Interactive map shows ${intelligence.activeEvents}+ events by location`,
          'Book tickets in seconds with secure payment',
          'Get instant QR code tickets on your phone',
          'Follow organizers and never miss events',
          'Multi-language support - events in your language'
        ],
        features: PLATFORM_FEATURES.attendee_features.discovery.features
      };
      
    case 'creators':
      return {
        theme: 'Launch Your Events Successfully',
        messages: [
          'Zero upfront costs - list events for free',
          'AI creates professional descriptions and images',
          'Direct Stripe payouts - keep most of your revenue',
          'Built-in ticketing with QR codes',
          'Real-time analytics track your success',
          'AI marketing tools generate social media content'
        ],
        features: [
          ...PLATFORM_FEATURES.organizer_features.creation.features,
          ...PLATFORM_FEATURES.organizer_features.payments.features
        ]
      };
      
    case 'retention':
      return {
        theme: 'Welcome Back to EventNexus',
        messages: [
          `${intelligence.activeEvents} events waiting for you`,
          'New AI-powered features added',
          'Improved map search and filtering',
          'Your favorite events platform, now better'
        ],
        features: ['Enhanced discovery', 'Better performance', 'New features']
      };
      
    case 'seasonal':
      const season = new Date().getMonth() >= 5 && new Date().getMonth() <= 7 ? 'Summer' : 
                     new Date().getMonth() >= 11 || new Date().getMonth() <= 1 ? 'Winter' : 
                     new Date().getMonth() >= 2 && new Date().getMonth() <= 4 ? 'Spring' : 'Autumn';
      return {
        theme: `${season} Events Are Here`,
        messages: [
          `${intelligence.eventsThisMonth} ${season.toLowerCase()} events this month`,
          'Perfect weather for amazing experiences',
          'Limited-time seasonal events',
          'Book now before they sell out'
        ],
        features: ['Seasonal filtering', 'Date range search', 'Location-based']
      };
      
    default:
      return {
        theme: 'Discover Events on EventNexus',
        messages: [
          'Map-first event discovery',
          'Secure ticketing system',
          'Multi-language support'
        ],
        features: ['Map search', 'Ticketing', 'Multilingual']
      };
  }
}

/**
 * Analyze platform data and determine optimal marketing strategy
 * Uses real data to make intelligent decisions with deep platform knowledge
 * 
 * EARLY STAGE PRIORITY: Creator acquisition comes FIRST
 * Without events, we can't attract attendees!
 */
export async function determineOptimalStrategy(intelligence: PlatformIntelligence): Promise<MarketingStrategy> {
  // Strategic decision logic based on real metrics
  
  // ===================================================================
  // PRIORITY 1: CREATOR ACQUISITION (Supply-side is critical!)
  // ===================================================================
  // In early stage (<100 events OR <20 organizers), focus on CREATORS
  // Logic: Can't attract attendees without events. Supply creates demand.
  if (intelligence.totalEvents < 100 || intelligence.totalOrganizers < 20) {
    const messaging = generateAudienceMessaging('creators', intelligence);
    
    // Calculate how critical this is
    const eventGap = Math.max(0, 100 - intelligence.totalEvents);
    const organizerGap = Math.max(0, 20 - intelligence.totalOrganizers);
    const urgencyScore = Math.min(95, 75 + (eventGap / 10) + (organizerGap * 2));
    
    return {
      strategyType: 'acquisition',
      targetAudience: 'creators',
      rationale: `🚨 EARLY STAGE PRIORITY: Only ${intelligence.totalOrganizers} organizers created ${intelligence.totalEvents} events. Platform needs SUPPLY before DEMAND. Without events, attendees have nothing to book. Focus on creator acquisition: ${PLATFORM_FEATURES.organizer_features.payments.benefits.join(', ')}. Target: 100 events from 20+ active organizers.`,
      confidenceScore: urgencyScore,
      estimatedImpact: {
        expectedSignups: 30,  // 30 new organizers
        expectedEngagement: 150,  // Each organizer creates ~5 events
        expectedRevenue: 3000  // Revenue from ticket sales once events live
      },
      campaignTheme: messaging.theme,
      keyMessages: messaging.messages,
      targetingCriteria: {
        demographics: [
          'Event organizers & promoters',
          'Venue owners & managers', 
          'Artists & performers',
          'Community leaders',
          'Corporate event planners',
          'Wedding planners',
          'Festival organizers',
          'Sports club managers',
          'Restaurant/bar owners hosting events'
        ],
        interests: [
          'Event management',
          'Business & entrepreneurship',
          'Marketing & promotion',
          'Hospitality industry',
          'Entertainment business',
          'Community organizing',
          'Arts & culture',
          'Sports management'
        ],
        behaviors: [
          'Organizing events on Facebook/Eventbrite',
          'Managing venue social media',
          'Promoting activities online',
          'Selling tickets on other platforms',
          'Looking for event management tools',
          'Dissatisfied with high platform fees'
        ]
      }
    };
  }

  // ===================================================================
  // PRIORITY 2: ACTIVATION (Convert browsers to buyers)
  // ===================================================================
  // Once we have events (100+), optimize conversion
  if (intelligence.conversionRate < 5 && intelligence.totalUsers > 50) {
    const messaging = generateAudienceMessaging('attendees', intelligence);
    
    return {
      strategyType: 'activation',
      targetAudience: 'attendees',
      rationale: `Conversion rate is ${intelligence.conversionRate.toFixed(1)}%. Users are browsing but not buying. Highlight easy booking process: ${PLATFORM_FEATURES.attendee_features.booking.benefits.join(', ')}.`,
      confidenceScore: 90,
      estimatedImpact: {
        expectedSignups: 0,
        expectedEngagement: 300,
        expectedRevenue: 1000
      },
      campaignTheme: `${intelligence.upcomingEventsCount > 0 ? intelligence.upcomingEventsCount + '+ Events' : 'Amazing Events'} Waiting for You`,
      keyMessages: [
        'Book in seconds with secure Stripe payments',
        'Instant QR code tickets on your phone',
        'No hidden fees - transparent pricing',
        `${intelligence.eventsThisWeek} events happening this week`,
        'Easy refunds if plans change'
      ],
      targetingCriteria: {
        demographics: ['Active users', 'Registered but no purchases', 'Browsing history'],
        interests: intelligence.topCategories.length > 0 
          ? intelligence.topCategories.map(c => c.category)
          : ['Events', 'Entertainment'],
        behaviors: ['Browsing events', 'Not yet purchased', 'App returning visitors']
      }
    };
  }
  
  // ===================================================================
  // PRIORITY 3: USER ACQUISITION (Demand-side growth)
  // ===================================================================
  // When events exist but need more attendees
  if (intelligence.newUsersThisWeek < 10 && intelligence.totalEvents >= 20) {
    const messaging = generateAudienceMessaging('platform-growth', intelligence);
    
    return {
      strategyType: 'acquisition',
      targetAudience: 'platform-growth',
      rationale: `New user acquisition is low (${intelligence.newUsersThisWeek} this week), but we have ${intelligence.totalEvents} events ready. Now we can attract attendees. Focus on highlighting ${intelligence.topCategories[0]?.category || 'events'} discovery: ${PLATFORM_FEATURES.usps.slice(0, 3).join(', ')}.`,
      confidenceScore: 85,
      estimatedImpact: {
        expectedSignups: 50,
        expectedEngagement: 200,
        expectedRevenue: 500
      },
      campaignTheme: messaging.theme,
      keyMessages: messaging.messages,
      targetingCriteria: {
        demographics: ['18-45 years old', 'Urban residents', 'Event enthusiasts'],
        interests: intelligence.topCategories.length > 0 
          ? intelligence.topCategories.map(c => c.category)
          : ['Events', 'Entertainment', 'Social activities', 'Culture'],
        behaviors: ['Event seekers', 'Social media users', 'Active lifestyle']
      }
    };
  }

  // ENGAGEMENT: Good metrics, promote popular categories
  if (intelligence.topCategories.length > 0 && intelligence.eventsThisWeek > 5) {
    const topCategory = intelligence.topCategories[0];
    const topCity = intelligence.topCities[0]?.city || 'your city';
    const messaging = generateAudienceMessaging('attendees', intelligence);
    
    return {
      strategyType: 'engagement',
      targetAudience: 'attendees',
      rationale: `${topCategory.category} is trending with ${topCategory.count} total events and ${intelligence.eventsThisWeek} happening this week in ${topCity}. Capitalize on momentum.`,
      confidenceScore: 92,
      estimatedImpact: {
        expectedSignups: 30,
        expectedEngagement: 400,
        expectedRevenue: 800
      },
      campaignTheme: `${topCategory.category} Events in ${topCity}`,
      keyMessages: [
        `${intelligence.eventsThisWeek} ${topCategory.category} events this week`,
        `Popular in ${topCity} - join ${intelligence.totalUsers} event-goers`,
        'Find on interactive map - see what\'s nearby',
        'Book now, instant confirmation',
        'Rated events and verified organizers'
      ],
      targetingCriteria: {
        demographics: ['Event enthusiasts', `${topCity} residents`, '18-45 years old'],
        interests: [topCategory.category, ...intelligence.topCategories.slice(1, 4).map(c => c.category)],
        behaviors: [`Interested in ${topCategory.category}`, 'Active social life', 'Weekend plans']
      }
    };
  }

  // DEFAULT: RETENTION - Keep existing users engaged
  const messaging = generateAudienceMessaging('retention', intelligence);
  
  return {
    strategyType: 'retention',
    targetAudience: 'retention',
    rationale: `Platform has ${intelligence.totalUsers} users and ${intelligence.activeEvents} active events. Focus on re-engagement with new features: ${PLATFORM_FEATURES.attendee_features.social.features.slice(0, 2).join(', ')}.`,
    confidenceScore: 80,
    estimatedImpact: {
      expectedSignups: 15,
      expectedEngagement: 250,
      expectedRevenue: 600
    },
    campaignTheme: messaging.theme,
    keyMessages: messaging.messages,
    targetingCriteria: {
      demographics: ['Existing users', 'Past attendees', 'Inactive last 30 days'],
      interests: intelligence.topCategories.length > 0 
        ? intelligence.topCategories.map(c => c.category)
        : ['Events', 'Entertainment'],
      behaviors: ['Previously active', 'Past ticket buyers', 'Lapsed users']
    }
  };
}

// ============================================================
// Autonomous Campaign Creation
// ============================================================

/**
 * Create and launch a complete marketing campaign autonomously
 * - Gathers real platform data
 * - Determines optimal strategy
 * - Generates campaign content with AI
 * - Creates visual assets
 * - Schedules social media posts
 * - Logs all actions
 */
export async function createAutonomousCampaign(adminUserId: string): Promise<AutoCampaignResult> {
  console.log('🤖 Starting autonomous campaign creation...');

  try {
    // Step 1: Gather platform intelligence
    console.log('📊 Gathering platform intelligence...');
    const intelligence = await gatherPlatformIntelligence();
    
    console.log('Platform Intelligence:', {
      totalEvents: intelligence.totalEvents,
      activeEvents: intelligence.activeEvents,
      totalUsers: intelligence.totalUsers,
      topCategory: intelligence.topCategories[0]?.category,
      conversionRate: intelligence.conversionRate.toFixed(2) + '%'
    });

    // Step 2: Determine optimal strategy
    console.log('🎯 Determining optimal marketing strategy...');
    const strategy = await determineOptimalStrategy(intelligence);
    
    console.log('Strategy Selected:', {
      type: strategy.strategyType,
      target: strategy.targetAudience,
      theme: strategy.campaignTheme,
      confidence: strategy.confidenceScore + '%'
    });

    // Step 3: Generate campaign content with AI
    console.log('✨ Generating campaign content with AI...');
    
    // Prepare platform context for AI
    const platformContext = {
      totalEvents: intelligence.totalEvents,
      activeEvents: intelligence.activeEvents,
      topCategories: intelligence.topCategories.map(c => c.category),
      topCities: intelligence.topCities.map(c => c.city),
      totalUsers: intelligence.totalUsers,
      keyFeatures: strategy.keyMessages // Use strategy's key messages as features to highlight
    };
    
    const campaignData = await generatePlatformGrowthCampaign(
      strategy.campaignTheme,
      strategy.targetAudience,
      platformContext // Pass real platform data to AI
    );

    if (!campaignData) {
      throw new Error('AI campaign generation failed');
    }

    // Step 4: Generate campaign image
    console.log('🎨 Generating campaign image...');
    const imageUrl = await generateAdImage(
      campaignData.visualPrompt,
      '16:9',
      false // Don't save to storage to avoid errors
    );

    // Step 5: Generate social media posts
    console.log('📱 Generating social media content...');
    const socialPosts = await generateSocialMediaPosts(
      campaignData.title,
      campaignData.copy,
      strategy.targetAudience === 'creators' ? 'creators' : 'attendees'
    );

    // Step 6: Create campaign in database
    console.log('💾 Creating campaign in database...');
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        user_id: adminUserId,
        title: campaignData.title,
        copy: campaignData.copy,
        image_url: imageUrl,
        cta: campaignData.cta,
        status: 'Active',
        target_audience: strategy.targetAudience,
        incentive: campaignData.recommendedIncentiveType !== 'none' ? {
          type: campaignData.recommendedIncentiveType,
          value: campaignData.recommendedIncentiveValue,
          redeemed: 0,
          limit: 1000
        } : null,
        metrics: {
          views: 0,
          clicks: 0,
          guestSignups: 0,
          revenueValue: 0
        },
        ai_metadata: {
          strategy_type: strategy.strategyType,
          rationale: strategy.rationale,
          confidence_score: strategy.confidenceScore,
          platform_intelligence: {
            total_events: intelligence.totalEvents,
            active_events: intelligence.activeEvents,
            total_users: intelligence.totalUsers,
            conversion_rate: intelligence.conversionRate
          }
        }
      })
      .select()
      .single();

    if (campaignError) throw campaignError;

    // Step 7: Schedule social media posts
    console.log('📅 Scheduling social media posts...');
    let socialScheduled = false;
    
    if (socialPosts && campaign) {
      const { error: scheduleError } = await supabase
        .from('campaign_schedules')
        .insert({
          campaign_id: campaign.id,
          scheduled_for: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
          timezone: 'UTC',
          platforms: ['instagram', 'facebook'],
          status: 'pending',
          content_override: socialPosts
        });
      
      socialScheduled = !scheduleError;
    }

    // Step 8: Log autonomous action
    await supabase
      .from('autonomous_actions')
      .insert({
        campaign_id: campaign?.id,
        action_type: 'creative_refreshed',
        reason: `Autonomous campaign creation: ${strategy.rationale}`,
        previous_state: { campaigns_count: intelligence.activeListings30d },
        new_state: { 
          campaign_id: campaign?.id,
          strategy: strategy.strategyType,
          target: strategy.targetAudience
        },
        confidence_score: strategy.confidenceScore,
        expected_impact: JSON.stringify(strategy.estimatedImpact),
        status: 'executed'
      });

    console.log('✅ Autonomous campaign created successfully!');

    return {
      success: true,
      campaign_id: campaign?.id,
      strategy,
      generated_content: {
        title: campaignData.title,
        copy: campaignData.copy,
        image_url: imageUrl || undefined,
        social_posts: socialPosts
      },
      actions_taken: {
        campaign_created: !!campaign,
        image_generated: !!imageUrl,
        social_scheduled: socialScheduled
      }
    };

  } catch (error) {
    console.error('❌ Autonomous campaign creation failed:', error);
    return {
      success: false,
      strategy: {
        strategyType: 'acquisition',
        targetAudience: 'platform-growth',
        rationale: 'Error occurred during autonomous campaign creation',
        confidenceScore: 0,
        estimatedImpact: { expectedSignups: 0, expectedEngagement: 0, expectedRevenue: 0 },
        campaignTheme: 'Error',
        keyMessages: [],
        targetingCriteria: { demographics: [], interests: [], behaviors: [] }
      },
      generated_content: {
        title: '',
        copy: ''
      },
      actions_taken: {
        campaign_created: false,
        image_generated: false,
        social_scheduled: false
      }
    };
  }
}

// ============================================================
// Campaign Performance Monitoring
// ============================================================

/**
 * Monitor active campaigns and adjust strategies based on performance
 */
export async function monitorAndOptimizeCampaigns(): Promise<{
  paused: number;
  scaled: number;
  insights: string[];
}> {
  console.log('📊 Monitoring campaign performance...');

  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'Active');

  if (error || !campaigns) {
    console.error('Error fetching campaigns:', error);
    return { paused: 0, scaled: 0, insights: [] };
  }

  let paused = 0;
  let scaled = 0;
  const insights: string[] = [];

  for (const campaign of campaigns) {
    const metrics = campaign.metrics || {};
    const views = metrics.views || 0;
    const clicks = metrics.clicks || 0;
    const signups = metrics.guestSignups || 0;

    // Calculate performance metrics
    const ctr = views > 0 ? (clicks / views) * 100 : 0;
    const conversionRate = clicks > 0 ? (signups / clicks) * 100 : 0;

    // Pause underperforming campaigns
    if (views > 500 && ctr < 0.5) {
      await supabase
        .from('campaigns')
        .update({ status: 'Paused' })
        .eq('id', campaign.id);
      
      paused++;
      insights.push(`Paused "${campaign.title}" - Low CTR: ${ctr.toFixed(2)}%`);
    }

    // Scale high-performing campaigns
    if (ctr > 5 && signups > 10) {
      // Could increase budget or expand targeting here
      scaled++;
      insights.push(`High performer "${campaign.title}" - CTR: ${ctr.toFixed(2)}%, Signups: ${signups}`);
    }

    // Provide insights
    if (views > 100 && ctr > 2 && conversionRate < 1) {
      insights.push(`"${campaign.title}" has good CTR (${ctr.toFixed(2)}%) but low conversion (${conversionRate.toFixed(2)}%) - check landing page`);
    }
  }

  return { paused, scaled, insights };
}

// ============================================================
// Export all functions
// ============================================================

export default {
  gatherPlatformIntelligence,
  determineOptimalStrategy,
  createAutonomousCampaign,
  monitorAndOptimizeCampaigns
};
