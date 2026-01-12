// AI Agent: Ensure Free Events
// Guarantees minimum number of free events per city

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EnsureRequest {
  city_id: string
  target_free_events?: number // Default: 5
}

interface EnsureResult {
  success: boolean
  city_id: string
  city_name: string
  current_free_count: number
  target: number
  actions_taken: string[]
  message: string
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

    const { city_id, target_free_events = 5 }: EnsureRequest = await req.json()

    if (!city_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'city_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get city info
    const { data: city, error: cityError } = await supabaseClient
      .from('city_configs')
      .select('city_name, country')
      .eq('city_id', city_id)
      .single()

    if (cityError || !city) {
      return new Response(
        JSON.stringify({ success: false, error: 'City not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🎯 Ensuring ${target_free_events} free events for ${city.city_name}, ${city.country}`)

    const actions: string[] = []

    // STEP 1: Count current active free events
    const { count: currentFreeCount, error: countError } = await supabaseClient
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('city_id', city_id)
      .eq('status', 'active')
      .eq('price', 0)

    if (countError) throw countError

    console.log(`  📊 Current free events: ${currentFreeCount}/${target_free_events}`)

    if (currentFreeCount >= target_free_events) {
      return new Response(
        JSON.stringify({
          success: true,
          city_id,
          city_name: city.city_name,
          current_free_count: currentFreeCount,
          target: target_free_events,
          actions_taken: [],
          message: `✅ ${currentFreeCount} free events already active (target: ${target_free_events})`
        } as EnsureResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const needed = target_free_events - currentFreeCount
    console.log(`  ⚠️ Need ${needed} more free events - being AGGRESSIVE`)

    // STEP 2: Check for unpublished validated free events
    const { data: unpublishedFree, error: unpublishedError} = await supabaseClient
      .from('parsed_events')
      .select(`
        id,
        structured_json,
        raw_events!inner(
          event_sources!inner(city_id)
        ),
        event_confidence!inner(final_score, event_id)
      `)
      .eq('raw_events.event_sources.city_id', city_id)
      .eq('validation_status', 'validated')
      .gte('event_confidence.final_score', 60)
      .is('event_confidence.event_id', null)
      .limit(needed * 3) // ⚠️ Fetch 3x more to filter for free events

    if (unpublishedError) throw unpublishedError

    // Filter for free events only (check structured_json.price or is_free)
    const freeUnpublished = (unpublishedFree || []).filter(
      pe => {
        const json = pe.structured_json || {}
        return json.is_free === true || json.price === 0 || json.price === '0' || !json.price
      }
    ).slice(0, needed * 2) // ⚠️ Publish up to 2x needed (buffer)

    if (freeUnpublished.length > 0) {
      console.log(`  📤 Publishing ${freeUnpublished.length} unpublished free events`)
      
      for (const event of freeUnpublished) {
        try {
          const publishResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/publish-event`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ parsed_event_id: event.id }),
            }
          )

          if (publishResponse.ok) {
            actions.push(`Published: ${event.structured_json?.name || 'Untitled event'}`)
          } else {
            console.error(`Failed to publish ${event.id}:`, await publishResponse.text())
          }
        } catch (err) {
          console.error(`Error publishing ${event.id}:`, err)
        }
      }

      // Recount after publishing
      const { count: newCount } = await supabaseClient
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('city_id', city_id)
        .eq('status', 'active')
        .eq('price', 0)

      if (newCount >= target_free_events) {
        return new Response(
          JSON.stringify({
            success: true,
            city_id,
            city_name: city.city_name,
            current_free_count: newCount,
            target: target_free_events,
            actions_taken: actions,
            message: `✅ Published ${freeUnpublished.length} free events. Total: ${newCount}/${target_free_events}`
          } as EnsureResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // STEP 3: Check for pending parsed events that need validation
    const { data: pendingFree, error: pendingError } = await supabaseClient
      .from('parsed_events')
      .select(`
        id,
        structured_json,
        raw_events!inner(event_sources!inner(city_id))
      `)
      .eq('raw_events.event_sources.city_id', city_id)
      .eq('validation_status', 'pending')
      .limit(100) // ⚠️ Increased from 50 to 100

    if (!pendingError && pendingFree) {
      const freePending = pendingFree.filter(pe => {
        const json = pe.structured_json || {}
        return json.is_free === true || json.price === 0 || json.price === '0' || !json.price
      })
      
      if (freePending.length > 0) {
        console.log(`  ⏳ Found ${freePending.length} pending free events, triggering validation`)
        
        try {
          const validateResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/validate-event`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ city_id }),
            }
          )

          if (validateResponse.ok) {
            const validateResult = await validateResponse.json()
            actions.push(`Validated ${validateResult.results?.validated || 0} events`)
            
            // Trigger publish after validation
            await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/publish-event`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ city_id }),
              }
            )
            
            actions.push('Published newly validated events')
          }
        } catch (err) {
          console.error('Validation/publish chain failed:', err)
        }
      }
    }

    // STEP 4: AGGRESSIVE - Re-fetch ALL free-focused sources (not just 5)
    const { data: freeSources, error: sourceError } = await supabaseClient
      .from('event_sources')
      .select('id, name, url, type')
      .eq('city_id', city_id)
      .eq('active', true)
      .or('url.ilike.%free%,url.ilike.%gratis%,url.ilike.%library%,url.ilike.%community%,name.ilike.%free%,name.ilike.%gratis%')
      .limit(15) // ⚠️ Increased from 5 to 15

    if (!sourceError && freeSources && freeSources.length > 0) {
      console.log(`  🔄 AGGRESSIVE: Re-fetching ${freeSources.length} free-focused sources`)
      
      try {
        // ⚠️ Run fetch→parse→validate→publish pipeline TWICE for better yield
        for (let cycle = 1; cycle <= 2; cycle++) {
          console.log(`  🔁 Pipeline cycle ${cycle}/2`)
          
          const fetchResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/fetch-sources`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ city_id }),
            }
          )

          if (fetchResponse.ok) {
            const fetchResult = await fetchResponse.json()
            actions.push(`Cycle ${cycle}: Fetched ${fetchResult.results?.fetched || 0} items`)

            // Parse
            await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/parse-event-ai`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ city_id }),
              }
            )

            // Validate
            await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/validate-event`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ city_id }),
              }
            )

            // Publish
            await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/publish-event`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ city_id }),
              }
            )

            // Check if target reached
            const { count: midCount } = await supabaseClient
              .from('events')
              .select('*', { count: 'exact', head: true })
              .eq('city_id', city_id)
              .eq('status', 'active')
              .eq('price', 0)

            if (midCount >= target_free_events) {
              console.log(`  ✅ Target reached after cycle ${cycle}`)
              break
            }
          }
        }

        actions.push('Ran 2 aggressive fetch cycles')
      } catch (err) {
        console.error('Aggressive pipeline retry failed:', err)
      }
    }

    // STEP 5: If STILL insufficient, discover NEW free-only sources via AI
    const { count: checkCount } = await supabaseClient
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('city_id', city_id)
      .eq('status', 'active')
      .eq('price', 0)

    if (checkCount < target_free_events) {
      console.log(`  🚨 DESPERATE MODE: Only ${checkCount}/${target_free_events} - discovering new sources`)
      
      try {
        // Trigger discover-sources for free-only sources
        const discoverResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/discover-sources`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ city_id }),
          }
        )

        if (discoverResponse.ok) {
          const discoverResult = await discoverResponse.json()
          actions.push(`Discovered ${discoverResult.sources_added || 0} new sources`)
          
          // Run one more pipeline cycle on new sources
          await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/fetch-sources`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ city_id }),
            }
          )

          await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/parse-event-ai`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ city_id }),
            }
          )

          await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/validate-event`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ city_id }),
            }
          )

          await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/publish-event`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ city_id }),
            }
          )

          actions.push('Ran pipeline on newly discovered sources')
        }
      } catch (err) {
        console.error('Source discovery failed:', err)
      }
    }

    // STEP 6: Final count
    const { count: finalCount } = await supabaseClient
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('city_id', city_id)
      .eq('status', 'active')
      .eq('price', 0)

    const success = finalCount >= target_free_events
    const message = success
      ? `✅ ${finalCount} free events active (target: ${target_free_events})`
      : `⚠️ Only ${finalCount}/${target_free_events} free events found. ${actions.length} actions taken.`

    console.log(`  ${success ? '✅' : '⚠️'} Final result: ${message}`)

    return new Response(
      JSON.stringify({
        success,
        city_id,
        city_name: city.city_name,
        current_free_count: finalCount,
        target: target_free_events,
        actions_taken: actions,
        message
      } as EnsureResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('ensure-free-events error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
