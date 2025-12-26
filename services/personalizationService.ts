import { supabase } from './supabase';
import { User, EventNexusEvent } from '../types';

/**
 * AI Personalization Engine
 * Uses user behavior and preferences to recommend events
 */

interface UserBehavior {
  viewedEvents: string[];
  attendedCategories: string[];
  likedEvents: string[];
  followedOrganizers: string[];
  searchHistory: string[];
  locationPreference: { lat: number; lng: number } | null;
}

interface EventScore {
  eventId: string;
  score: number;
  reasons: string[];
}

/**
 * Track user behavior for personalization
 */
export const trackUserBehavior = async (
  userId: string,
  action: 'view' | 'like' | 'attend' | 'search',
  data: {
    eventId?: string;
    category?: string;
    organizerId?: string;
    searchQuery?: string;
    location?: { lat: number; lng: number };
  }
) => {
  try {
    await supabase
      .from('user_behavior')
      .insert({
        user_id: userId,
        action,
        event_id: data.eventId,
        category: data.category,
        organizer_id: data.organizerId,
        search_query: data.searchQuery,
        location: data.location,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error tracking user behavior:', error);
  }
};

/**
 * Get user behavior profile
 */
export const getUserBehavior = async (userId: string): Promise<UserBehavior> => {
  try {
    const { data, error } = await supabase
      .from('user_behavior')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) throw error;

    const viewedEvents = data
      ?.filter(b => b.action === 'view' && b.event_id)
      .map(b => b.event_id) || [];

    const attendedCategories = data
      ?.filter(b => b.action === 'attend' && b.category)
      .map(b => b.category) || [];

    const likedEvents = data
      ?.filter(b => b.action === 'like' && b.event_id)
      .map(b => b.event_id) || [];

    const searchHistory = data
      ?.filter(b => b.action === 'search' && b.search_query)
      .map(b => b.search_query) || [];

    // Get user's followed organizers
    const { data: user } = await supabase
      .from('users')
      .select('followed_organizers')
      .eq('id', userId)
      .single();

    return {
      viewedEvents,
      attendedCategories,
      likedEvents,
      followedOrganizers: user?.followed_organizers || [],
      searchHistory,
      locationPreference: null // Will be set from user's location
    };
  } catch (error) {
    console.error('Error getting user behavior:', error);
    return {
      viewedEvents: [],
      attendedCategories: [],
      likedEvents: [],
      followedOrganizers: [],
      searchHistory: [],
      locationPreference: null
    };
  }
};

/**
 * Calculate event recommendation score
 */
const calculateEventScore = (
  event: EventNexusEvent,
  behavior: UserBehavior,
  userLocation: { lat: number; lng: number } | null
): EventScore => {
  let score = 0;
  const reasons: string[] = [];

  // Category match (30 points)
  const categoryFrequency = behavior.attendedCategories.filter(c => c === event.category).length;
  if (categoryFrequency > 0) {
    score += Math.min(30, categoryFrequency * 10);
    reasons.push(`You enjoy ${event.category} events`);
  }

  // Followed organizer (40 points)
  if (behavior.followedOrganizers.includes(event.organizerId)) {
    score += 40;
    reasons.push('From an organizer you follow');
  }

  // Location proximity (20 points)
  if (userLocation) {
    const distance = getDistance(
      userLocation.lat,
      userLocation.lng,
      event.location.lat,
      event.location.lng
    );
    if (distance <= 5) {
      score += 20;
      reasons.push('Very close to you');
    } else if (distance <= 15) {
      score += 10;
      reasons.push('Nearby');
    }
  }

  // Price preference (10 points)
  if (event.price === 0) {
    score += 5;
    reasons.push('Free event');
  } else if (event.price < 20) {
    score += 3;
  }

  // Featured event bonus (5 points)
  if (event.isFeatured) {
    score += 5;
  }

  // Popularity (5 points)
  const attendanceRate = event.attendeesCount / event.maxAttendees;
  if (attendanceRate > 0.5) {
    score += 5;
    reasons.push('Popular event');
  }

  return {
    eventId: event.id,
    score,
    reasons
  };
};

/**
 * Get personalized event recommendations
 */
export const getPersonalizedRecommendations = async (
  userId: string,
  events: EventNexusEvent[],
  userLocation: { lat: number; lng: number } | null,
  limit: number = 10
): Promise<{ event: EventNexusEvent; score: number; reasons: string[] }[]> => {
  try {
    // Get user behavior profile
    const behavior = await getUserBehavior(userId);

    // Calculate scores for all events
    const scoredEvents = events.map(event => {
      const { score, reasons } = calculateEventScore(event, behavior, userLocation);
      return { event, score, reasons };
    });

    // Sort by score and return top N
    return scoredEvents
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting personalized recommendations:', error);
    return [];
  }
};

/**
 * Get events you might love (similar to liked/attended)
 */
export const getSimilarEvents = async (
  userId: string,
  events: EventNexusEvent[],
  limit: number = 6
): Promise<EventNexusEvent[]> => {
  try {
    const behavior = await getUserBehavior(userId);

    // Get categories user likes
    const preferredCategories = [...new Set(behavior.attendedCategories)];

    // Filter events by preferred categories
    const similar = events.filter(e => 
      preferredCategories.includes(e.category) && 
      !behavior.viewedEvents.includes(e.id)
    );

    return similar.slice(0, limit);
  } catch (error) {
    console.error('Error getting similar events:', error);
    return [];
  }
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Generate weekly event digest for email
 */
export const generateWeeklyDigest = async (
  userId: string,
  events: EventNexusEvent[]
): Promise<{
  personalizedEvents: EventNexusEvent[];
  trendingEvents: EventNexusEvent[];
  nearbyEvents: EventNexusEvent[];
}> => {
  try {
    const behavior = await getUserBehavior(userId);
    
    // Get personalized recommendations
    const personalizedScored = await getPersonalizedRecommendations(userId, events, null, 5);
    const personalizedEvents = personalizedScored.map(s => s.event);

    // Get trending events (high attendance rate)
    const trendingEvents = events
      .filter(e => {
        const rate = e.attendeesCount / e.maxAttendees;
        return rate > 0.3;
      })
      .sort((a, b) => {
        const rateA = a.attendeesCount / a.maxAttendees;
        const rateB = b.attendeesCount / b.maxAttendees;
        return rateB - rateA;
      })
      .slice(0, 5);

    // Nearby events will be calculated on client with user location
    const nearbyEvents: EventNexusEvent[] = [];

    return {
      personalizedEvents,
      trendingEvents,
      nearbyEvents
    };
  } catch (error) {
    console.error('Error generating weekly digest:', error);
    return {
      personalizedEvents: [],
      trendingEvents: [],
      nearbyEvents: []
    };
  }
};

/**
 * Track conversion events for better recommendations
 */
export const trackConversion = async (
  userId: string,
  eventId: string,
  conversionType: 'ticket_purchase' | 'event_creation' | 'subscription_upgrade'
) => {
  try {
    await supabase
      .from('user_conversions')
      .insert({
        user_id: userId,
        event_id: eventId,
        conversion_type: conversionType,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error tracking conversion:', error);
  }
};
