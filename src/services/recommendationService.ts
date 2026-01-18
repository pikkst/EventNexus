/**
 * AI Event Recommendations Engine
 * Provides personalized event recommendations based on:
 * - User preferences and interests
 * - Browsing history
 * - Past event attendance
 * - Similar user preferences (collaborative filtering)
 * - Trending events
 * - Geographic proximity
 */

import { EventNexusEvent, User } from '../types';
import { supabase } from './supabase';

export interface RecommendationScore {
  eventId: string;
  event: EventNexusEvent;
  score: number; // 0-100
  reasons: string[]; // Why this event was recommended
}

export interface UserEventPreferences {
  preferredCategories: string[];
  preferredDistance: number; // km
  priceRange: { min: number; max: number };
  timePreference: 'morning' | 'afternoon' | 'evening' | 'night' | 'any';
}

/**
 * Extract user preferences from their browsing and past behavior
 */
export async function getUserEventPreferences(userId: string): Promise<UserEventPreferences> {
  try {
    // Get user's viewed events (from audit logs or event_views table)
    const { data: viewedEvents } = await supabase
      .from('events')
      .select('category')
      .limit(100);

    // Get user's watched events
    const { data: userProfile } = await supabase
      .from('users')
      .select('preferences, home_location')
      .eq('id', userId)
      .single();

    // Calculate category preferences
    const categoryCount: Record<string, number> = {};
    if (viewedEvents) {
      viewedEvents.forEach(evt => {
        categoryCount[evt.category] = (categoryCount[evt.category] || 0) + 1;
      });
    }

    const preferredCategories = Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat]) => cat);

    // Parse user preferences from profile
    const savedPrefs = userProfile?.preferences as any;

    return {
      preferredCategories: preferredCategories.length > 0 ? preferredCategories : ['all'],
      preferredDistance: savedPrefs?.preferredDistance || 50,
      priceRange: savedPrefs?.priceRange || { min: 0, max: 1000 },
      timePreference: savedPrefs?.timePreference || 'any'
    };
  } catch (error) {
    console.error('Error extracting user preferences:', error);
    // Return default preferences on error
    return {
      preferredCategories: ['all'],
      preferredDistance: 50,
      priceRange: { min: 0, max: 1000 },
      timePreference: 'any'
    };
  }
}

/**
 * Calculate distance between two coordinates (haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Score events based on user preferences
 */
function scoreEvent(
  event: EventNexusEvent,
  preferences: UserEventPreferences,
  userLat: number,
  userLon: number,
  viewedEventIds: Set<string>,
  userAttendedEventIds: Set<string>
): RecommendationScore {
  const reasons: string[] = [];
  let score = 50; // Base score

  // Category match (0-30 points)
  if (preferences.preferredCategories.includes(event.category)) {
    score += 25;
    reasons.push(`${event.category} events`);
  }

  // Distance bonus (0-25 points) - prioritize nearby events
  if (event.latitude && event.longitude) {
    const distance = calculateDistance(userLat, userLon, event.latitude, event.longitude);
    
    // Stronger proximity scoring
    if (distance <= 5) {
      score += 25;
      reasons.push(`📍 ${distance.toFixed(1)}km away`);
    } else if (distance <= 20) {
      score += 20;
      reasons.push(`📍 ${distance.toFixed(0)}km away`);
    } else if (distance < preferences.preferredDistance) {
      const distanceScore = Math.max(0, 15 * (1 - distance / preferences.preferredDistance));
      score += distanceScore;
    }
  }

  // Price match (0-15 points)
  const eventPrice = event.price || 0;
  if (eventPrice === 0) {
    score += 15;
    reasons.push('💸 Free event');
  } else if (eventPrice >= preferences.priceRange.min && eventPrice <= preferences.priceRange.max) {
    score += 12;
  }

  // Trending bonus (0-15 points) - popular events
  if (event.attendeesCount && event.attendeesCount > 50) {
    const trendScore = Math.min(15, event.attendeesCount / 10);
    score += trendScore;
    reasons.push(`🔥 ${event.attendeesCount}+ going`);
  } else if (event.attendeesCount && event.attendeesCount > 10) {
    score += 8;
  }

  // Time preference bonus (0-10 points)
  if (preferences.timePreference !== 'any' && event.time) {
    const hour = parseInt(event.time.split(':')[0]);
    const timeMatch =
      (preferences.timePreference === 'morning' && hour >= 6 && hour < 12) ||
      (preferences.timePreference === 'afternoon' && hour >= 12 && hour < 17) ||
      (preferences.timePreference === 'evening' && hour >= 17 && hour < 22) ||
      (preferences.timePreference === 'night' && (hour >= 22 || hour < 6));

    if (timeMatch) {
      score += 10;
      reasons.push(`⏰ ${preferences.timePreference}`);
    }
  }

  // Avoid already viewed/attended events
  if (viewedEventIds.has(event.id) || userAttendedEventIds.has(event.id)) {
    score *= 0.3; // Heavily penalize seen events
  }

  // Recency bonus (0-10 points) - happening soon is better
  const eventDate = new Date(event.date);
  const daysUntil = Math.floor((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  if (daysUntil >= 0 && daysUntil <= 7) {
    score += 10;
    reasons.push(`📅 This week`);
  } else if (daysUntil > 7 && daysUntil <= 30) {
    score += 5;
    reasons.push(`📅 ${daysUntil}d away`);
  }

  // Featured event boost (0-5 points)
  if ((event as any).is_featured) {
    score += 5;
    reasons.push('⭐ Featured');
  }

  // Cap score at 100
  score = Math.min(100, Math.max(0, score));

  return { eventId: event.id, event, score, reasons };
}

/**
 * Get personalized event recommendations for a user
 */
export async function getEventRecommendations(
  userId: string,
  userLocation: { lat: number; lng: number },
  limit: number = 10
): Promise<RecommendationScore[]> {
  try {
    // Get all active events
    const { data: allEvents } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'active')
      .gt('date', new Date().toISOString())
      .limit(500);

    if (!allEvents || allEvents.length === 0) {
      return [];
    }

    // Transform to EventNexusEvent
    const allEventsTransformed: EventNexusEvent[] = allEvents.map((e: any) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      category: e.category,
      date: e.date,
      time: e.time,
      location: e.location,
      latitude: e.latitude,
      longitude: e.longitude,
      price: e.price,
      imageUrl: e.image,
      attendeesCount: e.attendees_count,
      maxAttendees: e.max_capacity,
      organizerId: e.organizer_id,
      organizerName: e.organizer_name,
      visibility: e.visibility,
      aboutText: e.about_text,
      status: e.status
    }));

    // CRITICAL: Pre-filter by distance to avoid showing events on another continent
    // Maximum radius: 150km for local recommendations
    const MAX_DISTANCE_KM = 150;
    
    const eventsWithDistance = allEventsTransformed
      .filter(e => e.latitude && e.longitude)
      .map(e => ({
        event: e,
        distance: calculateDistance(userLocation.lat, userLocation.lng, e.latitude!, e.longitude!)
      }))
      .filter(item => item.distance <= MAX_DISTANCE_KM)
      .sort((a, b) => a.distance - b.distance);

    console.log(`📍 Location filter: ${eventsWithDistance.length} events within ${MAX_DISTANCE_KM}km of [${userLocation.lat.toFixed(2)}, ${userLocation.lng.toFixed(2)}]`);

    // If no nearby events found, try wider radius (500km for rural areas)
    let events: EventNexusEvent[];
    if (eventsWithDistance.length === 0) {
      const widerEvents = allEventsTransformed
        .filter(e => e.latitude && e.longitude)
        .map(e => ({
          event: e,
          distance: calculateDistance(userLocation.lat, userLocation.lng, e.latitude!, e.longitude!)
        }))
        .filter(item => item.distance <= 500)
        .sort((a, b) => a.distance - b.distance);
      
      console.log(`📍 Wider search: ${widerEvents.length} events within 500km`);
      events = widerEvents.slice(0, 50).map(item => item.event);
    } else {
      // Use nearby events (already sorted by distance)
      events = eventsWithDistance.slice(0, 100).map(item => item.event);
    }

    if (events.length === 0) {
      console.warn('⚠️ No events found within reasonable distance');
      return [];
    }

    // Get user preferences
    const preferences = await getUserEventPreferences(userId);

    // Get user's viewed and attended events to avoid recommending them again
    const { data: viewedEvents } = await supabase
      .from('event_views')
      .select('event_id')
      .eq('user_id', userId)
      .limit(100);

    const { data: attendedEvents } = await supabase
      .from('tickets')
      .select('event_id')
      .eq('user_id', userId)
      .limit(100);

    const viewedSet = new Set(viewedEvents?.map(e => e.event_id) || []);
    const attendedSet = new Set(attendedEvents?.map(e => e.event_id) || []);

    // Get user's friends/buddies and their attended events for social recommendations
    const { data: buddies } = await supabase
      .from('user_buddies')
      .select('user_id_1, user_id_2')
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
      .eq('status', 'accepted')
      .limit(50);

    // Extract buddy IDs
    const buddyIds = new Set<string>();
    buddies?.forEach(b => {
      if (b.user_id_1 === userId) buddyIds.add(b.user_id_2);
      if (b.user_id_2 === userId) buddyIds.add(b.user_id_1);
    });

    // Get events buddies are attending
    const buddyEventIds = new Set<string>();
    if (buddyIds.size > 0) {
      const { data: buddyTickets } = await supabase
        .from('tickets')
        .select('event_id')
        .in('user_id', Array.from(buddyIds))
        .limit(100);
      
      buddyTickets?.forEach(t => buddyEventIds.add(t.event_id));
    }

    // Score all events (pass buddy events for boosting)
    const scores = events
      .map(event => {
        const baseScore = scoreEvent(event, preferences, userLocation.lat, userLocation.lng, viewedSet, attendedSet);
        
        // SOCIAL BOOST: If friends are attending, add 20 points + show who
        if (buddyEventIds.has(event.id) && buddyIds.size > 0) {
          baseScore.score += 20;
          baseScore.reasons.unshift('🎉 Friends attending');
        }
        
        return baseScore;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scores;
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return [];
  }
}

/**
 * Find similar events (for "similar to this" recommendations)
 */
export async function getSimilarEvents(
  eventId: string,
  limit: number = 5
): Promise<EventNexusEvent[]> {
  try {
    // Get the reference event
    const { data: refEvent } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (!refEvent) return [];

    // Find events with same category, similar price range, nearby location
    const { data: similarEvents } = await supabase
      .from('events')
      .select('*')
      .eq('category', refEvent.category)
      .eq('status', 'active')
      .gt('price', Math.max(0, (refEvent.price || 0) - 50))
      .lt('price', (refEvent.price || 0) + 50)
      .neq('id', eventId)
      .limit(limit);

    return (
      similarEvents?.map((e: any) => ({
        id: e.id,
        name: e.name,
        description: e.description,
        category: e.category,
        date: e.date,
        time: e.time,
        location: e.location,
        latitude: e.latitude,
        longitude: e.longitude,
        price: e.price,
        imageUrl: e.image,
        attendeesCount: e.attendees_count,
        maxAttendees: e.max_capacity,
        organizerId: e.organizer_id,
        organizerName: e.organizer_name,
        visibility: e.visibility,
        aboutText: e.about_text,
        status: e.status
      })) || []
    );
  } catch (error) {
    console.error('Error finding similar events:', error);
    return [];
  }
}

/**
 * Get trending events (most viewed/attended in last 7 days)
 */
export async function getTrendingEvents(limit: number = 10): Promise<EventNexusEvent[]> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'active')
      .gt('date', new Date().toISOString())
      .gt('attendees_count', 10)
      .order('attendees_count', { ascending: false })
      .limit(limit);

    return (
      events?.map((e: any) => ({
        id: e.id,
        name: e.name,
        description: e.description,
        category: e.category,
        date: e.date,
        time: e.time,
        location: e.location,
        latitude: e.latitude,
        longitude: e.longitude,
        price: e.price,
        imageUrl: e.image,
        attendeesCount: e.attendees_count,
        maxAttendees: e.max_capacity,
        organizerId: e.organizer_id,
        organizerName: e.organizer_name,
        visibility: e.visibility,
        aboutText: e.about_text,
        status: e.status
      })) || []
    );
  } catch (error) {
    console.error('Error fetching trending events:', error);
    return [];
  }
}
