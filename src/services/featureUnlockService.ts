/**
 * Feature Unlock System for EventNexus
 * 
 * Credits allow FREE tier users to unlock features that paid tiers have by default
 * 1 credit = 0.5 EUR value
 * 
 * New users get 100 credits welcome bonus from admin
 */

import { supabase } from './supabase';
import { deductUserCredits, checkUserCredits, addUserCredits } from './dbService';

// Feature unlock costs (in credits)
export const FEATURE_UNLOCK_COSTS = {
  // Event Management Features
  CREATE_SINGLE_EVENT: 15,          // Create 1 event (Free tier users)
  FEATURED_EVENT_7_DAYS: 20,        // Make event featured for 7 days (Pro feature)
  FEATURED_EVENT_30_DAYS: 60,       // Make event featured for 30 days
  CUSTOM_BRANDING: 30,              // Enable custom branding on event page (Premium feature)
  ADVANCED_ANALYTICS: 40,           // Unlock advanced analytics dashboard (Premium feature)
  PRIORITY_SUPPORT: 50,             // Get priority customer support for 30 days (Premium feature)
  
  // Ticket Management Features
  TICKET_SCANNING_30_DAYS: 50,      // Enable QR ticket scanner for 30 days
  TICKET_SCANNING_365_DAYS: 150,    // Enable QR ticket scanner for 1 year
  ADVANCED_TICKET_TYPES: 25,        // Create VIP, early bird, group tickets (Pro feature)
  TICKET_TRANSFER: 15,              // Allow ticket transfers between users (Pro feature)
  
  // AI Features (per use)
  AI_EVENT_IMAGE: 20,               // Generate AI event image (Pro feature)
  AI_TAGLINE: 10,                   // Generate AI tagline (Pro feature)
  AI_DESCRIPTION: 15,               // AI-enhanced description (Pro feature)
  AI_TRANSLATION: 5,                // Per language translation (Pro feature)
  AI_AD_CAMPAIGN: 30,               // Multi-platform ad campaign (Premium feature)
  
  // Marketing Features
  EMAIL_CAMPAIGN: 35,               // Send email to followers (Premium feature)
  PUSH_NOTIFICATIONS: 25,           // Send push notifications (Premium feature)
  SOCIAL_MEDIA_BOOST: 40,           // Boost on social media (Premium feature)
  
  // Advanced Features
  MULTI_VENUE_SUPPORT: 45,          // Support multiple venues (Enterprise feature)
  WHITE_LABEL: 100,                 // White label event page (Enterprise feature)
  API_ACCESS_30_DAYS: 80,           // API access for integrations (Enterprise feature)
  CUSTOM_DOMAIN: 60,                // Custom domain for events (Enterprise feature)
};

// Feature categories for display
export const FEATURE_CATEGORIES = {
  EVENT_MANAGEMENT: 'Event Management',
  TICKET_MANAGEMENT: 'Ticket Management',
  AI_FEATURES: 'AI-Powered Tools',
  MARKETING: 'Marketing & Promotion',
  ADVANCED: 'Advanced Features'
};

// Check if user's tier includes a feature by default
export const checkTierIncludes = (userTier: string, featureName: string): boolean => {
  const tierFeatures: Record<string, string[]> = {
    free: [],
    pro: [
      'FEATURED_EVENT_7_DAYS',
      'ADVANCED_TICKET_TYPES',
      'TICKET_TRANSFER',
      'AI_EVENT_IMAGE',
      'AI_TAGLINE',
      'AI_DESCRIPTION',
      'AI_TRANSLATION'
    ],
    premium: [
      'FEATURED_EVENT_7_DAYS',
      'FEATURED_EVENT_30_DAYS',
      'CUSTOM_BRANDING',
      'ADVANCED_ANALYTICS',
      'PRIORITY_SUPPORT',
      'TICKET_SCANNING_30_DAYS',
      'ADVANCED_TICKET_TYPES',
      'TICKET_TRANSFER',
      'AI_EVENT_IMAGE',
      'AI_TAGLINE',
      'AI_DESCRIPTION',
      'AI_TRANSLATION',
      'AI_AD_CAMPAIGN',
      'EMAIL_CAMPAIGN',
      'PUSH_NOTIFICATIONS',
      'SOCIAL_MEDIA_BOOST'
    ],
    enterprise: [
      // All features included
      ...Object.keys(FEATURE_UNLOCK_COSTS)
    ]
  };

  return tierFeatures[userTier]?.includes(featureName) || false;
};

// Unlock a feature for a user (purchase with credits)
export const unlockFeature = async (
  userId: string,
  userTier: string,
  featureName: keyof typeof FEATURE_UNLOCK_COSTS,
  eventId?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Check if user already has this feature in their tier
    if (checkTierIncludes(userTier, featureName)) {
      return {
        success: true,
        message: 'Feature already included in your subscription tier'
      };
    }

    const cost = FEATURE_UNLOCK_COSTS[featureName];
    
    // Check if user has enough credits
    const hasCredits = await checkUserCredits(userId, cost);
    if (!hasCredits) {
      return {
        success: false,
        message: `Insufficient credits. Need ${cost} credits (€${(cost * 0.5).toFixed(2)} value)`
      };
    }

    // Deduct credits
    const deducted = await deductUserCredits(userId, cost);
    if (!deducted) {
      return {
        success: false,
        message: 'Failed to deduct credits'
      };
    }

    // Record feature unlock
    const expiresAt = calculateExpiry(featureName);
    
    const { error } = await supabase
      .from('feature_unlocks')
      .insert({
        user_id: userId,
        feature_name: featureName,
        credits_spent: cost,
        event_id: eventId,
        expires_at: expiresAt,
        unlocked_at: new Date().toISOString()
      });

    if (error) throw error;

    return {
      success: true,
      message: `Feature unlocked! ${cost} credits used (€${(cost * 0.5).toFixed(2)} value)`
    };
  } catch (error) {
    console.error('Error unlocking feature:', error);
    return {
      success: false,
      message: 'Failed to unlock feature. Please try again.'
    };
  }
};

// Calculate feature expiry based on feature type
const calculateExpiry = (featureName: string): string | null => {
  const now = new Date();
  
  if (featureName.includes('7_DAYS')) {
    return new Date(now.setDate(now.getDate() + 7)).toISOString();
  } else if (featureName.includes('30_DAYS')) {
    return new Date(now.setDate(now.getDate() + 30)).toISOString();
  } else if (featureName.includes('365_DAYS')) {
    return new Date(now.setDate(now.getDate() + 365)).toISOString();
  }
  
  // One-time use features (AI features) don't expire
  return null;
};

// Check if user has access to a feature (either through tier or unlock)
export const hasFeatureAccess = async (
  userId: string,
  userTier: string,
  featureName: keyof typeof FEATURE_UNLOCK_COSTS,
  eventId?: string
): Promise<boolean> => {
  // Check if included in user's tier
  if (checkTierIncludes(userTier, featureName)) {
    return true;
  }

  // Check if user has unlocked this feature
  try {
    let query = supabase
      .from('feature_unlocks')
      .select('*')
      .eq('user_id', userId)
      .eq('feature_name', featureName)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data, error } = await query.single();

    if (error) return false;
    return !!data;
  } catch (error) {
    return false;
  }
};

// Get user's unlocked features
export const getUserUnlockedFeatures = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('feature_unlocks')
      .select('*')
      .eq('user_id', userId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('unlocked_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching unlocked features:', error);
    return [];
  }
};

// Award welcome credits to new user
export const awardWelcomeCredits = async (userId: string): Promise<boolean> => {
  try {
    // Check if user already received welcome credits
    const { data: existing } = await supabase
      .from('credit_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('transaction_type', 'welcome_bonus')
      .single();

    if (existing) {
      console.log('User already received welcome credits');
      return false;
    }

    // Add 100 welcome credits
    const success = await addUserCredits(userId, 100);
    
    if (success) {
      // Record transaction
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: userId,
          amount: 100,
          transaction_type: 'welcome_bonus',
          description: 'Welcome bonus - 100 free credits!',
          balance_after: 100
        });
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error awarding welcome credits:', error);
    return false;
  }
};

// Get credit value in EUR
export const getCreditValueInEur = (credits: number): string => {
  return (credits * 0.5).toFixed(2);
};

// Get available features for user's tier
export const getAvailableFeaturesToUnlock = (userTier: string) => {
  const allFeatures = Object.keys(FEATURE_UNLOCK_COSTS) as Array<keyof typeof FEATURE_UNLOCK_COSTS>;
  
  return allFeatures.filter(feature => !checkTierIncludes(userTier, feature));
};

// Purchase credits with real money (Stripe integration)
export const purchaseCredits = async (
  userId: string,
  packageType: 'small' | 'medium' | 'large' | 'mega'
): Promise<{ credits: number; price: number; discount: number }> => {
  const packages = {
    small: { credits: 100, price: 5, discount: 0 },      // €0.05 per credit
    medium: { credits: 500, price: 20, discount: 20 },   // €0.04 per credit (20% off)
    large: { credits: 1000, price: 35, discount: 30 },   // €0.035 per credit (30% off)
    mega: { credits: 5000, price: 150, discount: 40 }    // €0.03 per credit (40% off)
  };

  return packages[packageType];
};
