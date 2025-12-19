// Proximity Radar Edge Function
// This function checks for nearby events based on user location
// and sends notifications for events matching user preferences

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
    
    // Check if proximity alerts are enabled
    if (!prefs?.proximityAlerts) {
      return new Response(
        JSON.stringify({ message: 'Proximity alerts disabled', nearbyEvents: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const alertRadius = prefs?.alertRadius || 10
    const interestedCategories = prefs?.interestedCategories || []

    // Get nearby events using PostGIS function
    const { data: nearbyEvents, error: eventsError } = await supabaseClient
      .rpc('get_nearby_events', {
        user_lat: latitude,
        user_lon: longitude,
        radius_km: alertRadius
      })

    if (eventsError) {
      throw eventsError
    }

    // Filter by interested categories if specified
    const filteredEvents = interestedCategories.length > 0
      ? nearbyEvents.filter((event: any) => 
          interestedCategories.includes(event.event_data.category)
        )
      : nearbyEvents

    // Check which events haven't been notified yet
    const { data: existingNotifications } = await supabaseClient
      .from('notifications')
      .select('event_id')
      .eq('user_id', userId)
      .eq('type', 'proximity_radar')
      .in('event_id', filteredEvents.map((e: any) => e.event_id))

    const notifiedEventIds = new Set(
      existingNotifications?.map((n: any) => n.event_id) || []
    )

    // Create notifications for new nearby events
    const newNotifications = []
    for (const event of filteredEvents) {
      if (!notifiedEventIds.has(event.event_id)) {
        const notification = {
          user_id: userId,
          title: 'Nexus Radar: Event nearby!',
          message: `"${event.event_name}" is only ${event.distance_km.toFixed(1)}km away! It matches your interests. Check it out now!`,
          type: 'proximity_radar',
          event_id: event.event_id,
          sender_name: 'Nexus AI Radar',
          isRead: false,
          timestamp: new Date().toISOString()
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

    return new Response(
      JSON.stringify({
        success: true,
        nearbyEvents: filteredEvents,
        newNotifications,
        totalNearby: filteredEvents.length,
        notificationsSent: newNotifications.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in proximity-radar:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
