// Smart Proximity Radar Edge Function
// Enhanced event discovery with intelligent notifications for:
// 1. Nearby events matching user interests (existing)
// 2. Active events (currently happening) with available tickets (NEW)
// 3. Upcoming events within user-defined time window (NEW)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProximityRequest {
  userId: string
  latitude: number
  longitude: number
}

interface EventWithTickets {
  event_id: string
  event_name: string
  distance_km: number
  event_data: any
  available_tickets: number
  starts_at: string
  ends_at: string | null
  status: 'upcoming' | 'active' | 'ending_soon'
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { userId, latitude, longitude }: ProximityRequest = await req.json()

    // Get user preferences
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('notification_prefs')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      throw new Error('User not found')
    }

    const prefs = user.notification_prefs as any
    
    // Check if any proximity alerts are enabled
    if (!prefs?.proximityAlerts && !prefs?.notifyActiveEvents && !prefs?.notifyUpcomingEvents) {
      return new Response(
        JSON.stringify({ 
          message: 'All proximity alerts disabled', 
          nearbyEvents: [],
          activeEvents: [],
          upcomingEvents: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const alertRadius = prefs?.alertRadius || 10
    const interestedCategories = prefs?.interestedCategories || []
    const minAvailableTickets = prefs?.minAvailableTickets || 1
    const upcomingEventWindow = prefs?.upcomingEventWindow || 24 // hours

    // Get nearby events with ticket availability using enhanced RPC
    const { data: nearbyEvents, error: eventsError } = await supabaseClient
      .rpc('get_nearby_events_with_tickets', {
        user_lat: latitude,
        user_lon: longitude,
        radius_km: alertRadius,
        min_tickets: minAvailableTickets,
        upcoming_window_hours: upcomingEventWindow
      })

    if (eventsError) {
      console.error('Error fetching nearby events:', eventsError)
      throw eventsError
    }

    // Filter by interested categories if specified
    const filteredEvents = interestedCategories.length > 0
      ? nearbyEvents.filter((event: EventWithTickets) => 
          interestedCategories.includes(event.event_data.category)
        )
      : nearbyEvents

    // Categorize events by status
    const activeEvents = filteredEvents.filter((e: EventWithTickets) => e.status === 'active')
    const upcomingEvents = filteredEvents.filter((e: EventWithTickets) => e.status === 'upcoming')
    const endingSoonEvents = filteredEvents.filter((e: EventWithTickets) => e.status === 'ending_soon')

    // Get existing notifications to avoid duplicates
    const { data: existingNotifications } = await supabaseClient
      .from('notifications')
      .select('event_id, type, created_at')
      .eq('user_id', userId)
      .in('type', ['proximity_radar', 'active_event'])
      .in('event_id', filteredEvents.map((e: EventWithTickets) => e.event_id))
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24h

    const recentlyNotifiedEvents = new Map(
      existingNotifications?.map((n: any) => [n.event_id, n.type]) || []
    )

    // Create notifications for new events
    const newNotifications = []

    // 1. Active event notifications (priority: events happening NOW)
    if (prefs?.notifyActiveEvents) {
      for (const event of [...activeEvents, ...endingSoonEvents]) {
        const notificationKey = `${event.event_id}_active`
        if (!recentlyNotifiedEvents.has(event.event_id)) {
          const isEndingSoon = event.status === 'ending_soon'
          const notification = {
            user_id: userId,
            title: isEndingSoon ? '🔥 Event Ending Soon!' : '🎉 Event Happening NOW!',
            message: `"${event.event_name}" is ${isEndingSoon ? 'ending soon' : 'currently happening'} just ${event.distance_km.toFixed(1)}km away! ${event.available_tickets} ticket${event.available_tickets > 1 ? 's' : ''} still available. Don't miss out!`,
            type: 'active_event',
            event_id: event.event_id,
            sender_name: 'Nexus Smart Radar',
            is_read: false,
            created_at: new Date().toISOString(),
            metadata: {
              availableTickets: event.available_tickets,
              distance: event.distance_km,
              eventStatus: event.status
            }
          }

          const { data, error } = await supabaseClient
            .from('notifications')
            .insert([notification])
            .select()
            .single()

          if (!error && data) {
            newNotifications.push(data)
          }
        }
      }
    }

    // 2. Upcoming event notifications (lower priority)
    if (prefs?.notifyUpcomingEvents) {
      for (const event of upcomingEvents) {
        if (!recentlyNotifiedEvents.has(event.event_id)) {
          const hoursUntilStart = Math.round(
            (new Date(event.starts_at).getTime() - Date.now()) / (1000 * 60 * 60)
          )
          
          const notification = {
            user_id: userId,
            title: '📍 Event Starting Soon!',
            message: `"${event.event_name}" starts in ${hoursUntilStart}h, only ${event.distance_km.toFixed(1)}km away! ${event.available_tickets} ticket${event.available_tickets > 1 ? 's' : ''} available.`,
            type: 'proximity_radar',
            event_id: event.event_id,
            sender_name: 'Nexus Smart Radar',
            is_read: false,
            created_at: new Date().toISOString(),
            metadata: {
              availableTickets: event.available_tickets,
              distance: event.distance_km,
              eventStatus: event.status
            }
          }

          const { data, error } = await supabaseClient
            .from('notifications')
            .insert([notification])
            .select()
            .single()

          if (!error && data) {
            newNotifications.push(data)
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          totalNearby: filteredEvents.length,
          activeEvents: activeEvents.length,
          upcomingEvents: upcomingEvents.length,
          endingSoonEvents: endingSoonEvents.length,
          notificationsSent: newNotifications.length
        },
        nearbyEvents: filteredEvents,
        activeEvents,
        upcomingEvents,
        newNotifications
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in smart-proximity-radar:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
