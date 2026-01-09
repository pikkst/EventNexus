// AI Agent: Event Publishing Service
// Publishes validated events to the Live Map

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Gemini API image generation (matches geminiService.ts logic)
async function generateEventImage(
  eventName: string, 
  category: string, 
  description: string
): Promise<string | null> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
  if (!GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not set, skipping image generation')
    return null
  }

  try {
    // Use same prompt format as EventCreationFlow: "name: description. Category: category"
    const prompt = `${eventName}: ${description}. Category: ${category}`
    
    // Match geminiService.ts prompt template
    const fullPrompt = `Professional marketing flier for EventNexus with clear promotional text overlay: ${prompt}. Include eye-catching headlines and call-to-action text directly on the image. Premium tech aesthetics, cinematic lighting, ultra-modern UI elements, bold typography, 8k. Aspect ratio: 16:9`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: fullPrompt
            }]
          }]
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', errorText)
      return null
    }

    const data = await response.json()
    
    // Extract image from response (same logic as geminiService.ts)
    for (const part of data.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64Data = part.inlineData.data
        return `data:image/png;base64,${base64Data}`
      }
    }

    return null
  } catch (error) {
    console.error('Failed to generate event image:', error)
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get parsed_event_id from request body if provided
    let parsedEventId: string | null = null
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        parsedEventId = body.parsed_event_id || null
      } catch {
        // No body or invalid JSON - will fetch all validated events
      }
    }

    // Build query for validated parsed events ready for publishing
    let query = supabaseClient
      .from('parsed_events')
      .select(`
        *,
        event_confidence!inner(final_score),
        raw_events!inner(
          event_sources!inner(city_id)
        )
      `)
      .eq('validation_status', 'validated')
      .gte('event_confidence.final_score', 60)
      .is('event_confidence.event_id', null) // Not yet published

    // If specific parsed_event_id provided, filter for it
    if (parsedEventId) {
      query = query.eq('id', parsedEventId)
    } else {
      query = query.limit(20)
    }

    const { data: parsedEvents, error: parsedError } = await query

    if (parsedError) throw parsedError

    const results = {
      published: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    }

    for (const parsedEvent of parsedEvents) {
      try {
        const eventData = parsedEvent.structured_json
        const cityId = parsedEvent.raw_events.event_sources.city_id
        const confidenceScore = parsedEvent.event_confidence[0]?.final_score || 0

        // Check for duplicates
        const eventStartTime = new Date(eventData.start_time)
        const eventDateStr = eventStartTime.toISOString().split('T')[0]
        
        const { data: existingEvents } = await supabaseClient
          .from('events')
          .select('id, name, date, location_point')
          .eq('city_id', cityId)
          .eq('name', eventData.name)
          .eq('date', eventDateStr)

        if (existingEvents && existingEvents.length > 0) {
          // Duplicate found - update existing event
          const existing = existingEvents[0]
          
          const { error: updateError } = await supabaseClient
            .from('events')
            .update({
              description: eventData.description,
              image: eventData.image_url || null,
              last_ai_update: new Date().toISOString(),
            })
            .eq('id', existing.id)

          if (!updateError) {
            // Create version record
            await supabaseClient
              .from('event_versions')
              .insert({
                event_id: existing.id,
                version_number: 1,
                changes_json: {
                  type: 'ai_update',
                  changes: { description: 'updated' },
                },
                change_type: 'ai_update',
              })

            // Update confidence record
            await supabaseClient
              .from('event_confidence')
              .update({ event_id: existing.id })
              .eq('parsed_event_id', parsedEvent.id)

            results.updated++
            continue
          }
        }

        // Create new event
        const startTime = new Date(eventData.start_time)
        
        // Extract date and time separately (both required by schema)
        const isoString = startTime.toISOString() // "2026-03-20T18:00:00.000Z"
        const [dateStr, timeStr] = isoString.split('T')
        const timeOnly = timeStr.split('.')[0] // "18:00:00"
        
        const locationPoint = eventData.location_lat && eventData.location_lng
          ? `POINT(${eventData.location_lng} ${eventData.location_lat})`
          : null

        // Generate AI image if no image URL provided
        let eventImage = eventData.image_url || null
        if (!eventImage) {
          console.log(`Generating AI image for event: ${eventData.name}`)
          eventImage = await generateEventImage(
            eventData.name,
            eventData.category || 'event',
            eventData.description || ''
          )
          if (eventImage) {
            console.log(`✓ AI image generated for: ${eventData.name}`)
          } else {
            console.log(`✗ Failed to generate AI image for: ${eventData.name}`)
          }
        }

        const { data: newEvent, error: insertError } = await supabaseClient
          .from('events')
          .insert({
            name: eventData.name,
            description: eventData.description,
            category: eventData.category,
            date: dateStr,
            time: timeOnly,
            location: {
              address: eventData.location_address,
              lat: eventData.location_lat || null,
              lng: eventData.location_lng || null
            },
            location_point: locationPoint,
            price: 0,
            organizer_id: 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807', // Admin user
            image: eventImage,
            status: 'active',
            tags: eventData.category ? [eventData.category] : []
          })
          .select()
          .single()

        if (insertError) throw insertError

        // Link confidence record to published event
        await supabaseClient
          .from('event_confidence')
          .update({ event_id: newEvent.id })
          .eq('parsed_event_id', parsedEvent.id)

        // Create initial version
        await supabaseClient
          .from('event_versions')
          .insert({
            event_id: newEvent.id,
            version_number: 1,
            changes_json: { type: 'initial_creation', source: 'ai_agent' },
            change_type: 'ai_update',
          })

        // Log decision
        await supabaseClient
          .from('ai_decision_log')
          .insert({
            event_id: newEvent.id,
            parsed_event_id: parsedEvent.id,
            decision_type: 'publish',
            decision_result: 'published_unclaimed',
            reasoning: {
              confidence_score: confidenceScore,
              status: 'unclaimed',
            },
            confidence_score: confidenceScore,
            ai_model: 'publish_service',
          })

        results.published++
      } catch (error) {
        console.error(`Failed to publish event ${parsedEvent.id}:`, error)
        results.failed++
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in publish-event:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
