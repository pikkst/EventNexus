// AI Agent: Event Publishing Service
// Publishes validated events to the Live Map

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get validated parsed events ready for publishing
    const { data: parsedEvents, error: parsedError } = await supabaseClient
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
      .limit(20)

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
        const confidenceScore = parsedEvent.event_confidence[0].final_score

        // Check for duplicates
        const { data: existingEvents } = await supabaseClient
          .from('events')
          .select('id, name, start_time, location_point')
          .eq('city_id', cityId)
          .eq('name', eventData.name)
          .gte('start_time', eventData.start_time)
          .lte('start_time', eventData.start_time)

        if (existingEvents && existingEvents.length > 0) {
          // Duplicate found - update existing event
          const existing = existingEvents[0]
          
          const { error: updateError } = await supabaseClient
            .from('events')
            .update({
              description: eventData.description,
              image_url: eventData.image_url || null,
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
        const locationPoint = eventData.location_lat && eventData.location_lng
          ? `POINT(${eventData.location_lng} ${eventData.location_lat})`
          : null

        const { data: newEvent, error: insertError } = await supabaseClient
          .from('events')
          .insert({
            name: eventData.name,
            description: eventData.description,
            date: startTime.toISOString().split('T')[0],
            time: startTime.toTimeString().split(' ')[0],
            location: {
              address: eventData.location_address,
              lat: eventData.location_lat || null,
              lng: eventData.location_lng || null
            },
            location_point: locationPoint,
            city_id: cityId,
            category: eventData.category,
            price: eventData.is_free ? 'free' : 'paid',
            status: 'active',
            confidence_score: confidenceScore,
            source_url: eventData.source_url,
            import_source: 'ai_agent',
            original_language: parsedEvent.original_language,
            image_url: eventData.image_url || null,
            last_ai_update: new Date().toISOString(),
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
