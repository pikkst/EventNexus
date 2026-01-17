// AI Agent: Free Events Enforcer (Simplified for EventScout AI)
// Ensures each city has minimum free events
// Simply calls EventScout AI - no complex pipeline logic needed

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EnsureRequest {
  city_id: string
  target_free_events?: number
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
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Parse request
    const body: EnsureRequest = await req.json()
    const { city_id, target_free_events = 5 } = body

    if (!city_id) {
      return new Response(
        JSON.stringify({ error: 'city_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`\n🎯 ensure-free-events: ${city_id} (target: ${target_free_events})`)

    // Get city info
    const { data: city, error: cityError } = await supabaseClient
      .from('city_configs')
      .select('city_id, city_name, country')
      .eq('city_id', city_id)
      .single()

    if (cityError || !city) {
      throw new Error(`City not found: ${city_id}`)
    }

    // Check current free events count
    const { count: initialCount } = await supabaseClient
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('city_id', city_id)
      .eq('status', 'active')
      .eq('price', 0)

    console.log(`  ℹ️ City has ${initialCount} free events (target: ${target_free_events})`)

    const actions: string[] = []

    // STEP 1: Check if already above target
    if (initialCount >= target_free_events) {
      console.log(`  ✅ Already above target`)
      return new Response(
        JSON.stringify({
          success: true,
          city_id,
          city_name: city.city_name,
          current_free_count: initialCount,
          target: target_free_events,
          actions_taken: [],
          message: `Already ${initialCount}/${target_free_events} free events`
        } as EnsureResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`  ⚠️ Below target: ${initialCount}/${target_free_events}`)

    // STEP 2: Use EventScout AI to discover events
    // EventScout AI uses Google Search + Gemini to find REAL free events
    console.log(`  🤖 Calling EventScout AI to discover ${target_free_events * 2} events...`)
    
    try {
      const discoverResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/discover-events-ai`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            city_id,
            target_events: target_free_events * 2  // Request 2x to ensure coverage
          }),
        }
      )

      if (discoverResponse.ok) {
        const discoverResult = await discoverResponse.json()
        const eventsFound = discoverResult.results?.events_inserted || 0
        actions.push(`EventScout AI discovered ${eventsFound} events`)
        
        console.log(`  ✅ EventScout AI added ${eventsFound} events`)
      } else {
        const errorText = await discoverResponse.text()
        console.error(`  ❌ EventScout AI failed: ${errorText}`)
        actions.push(`EventScout AI failed: ${errorText}`)
      }
    } catch (err) {
      console.error('EventScout AI discovery failed:', err)
      actions.push(`EventScout AI error: ${String(err)}`)
    }

    // STEP 3: Final count
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
