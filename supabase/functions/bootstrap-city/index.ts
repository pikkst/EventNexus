// AI Agent: City Bootstrap Service
// Automatically discovers event sources and seeds initial events for new cities

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_API_KEY = Deno.env.get('API_KEY') || Deno.env.get('GEMINI_API_KEY')
const GEMINI_MODEL = 'gemini-2.5-pro'

interface CityBootstrapRequest {
  city_id?: string;
  city_name: string;
  country: string;
  languages?: string[];
  timezone?: string;
  auto_discover?: boolean;
  seed_events?: boolean;
}

interface EventSource {
  name: string;
  url: string;
  type: 'api' | 'rss' | 'html' | 'ical';
  source_score: number;
  description?: string;
}

async function discoverCitySources(cityName: string, country: string): Promise<EventSource[]> {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not configured')
    return []
  }

  const prompt = `You are an expert at finding official public event data sources for cities.

Find official event sources for ${cityName}, ${country}.

Return ONLY valid JSON array of sources with this structure:
[
  {
    "name": "Official City Events Portal",
    "url": "https://...",
    "type": "html" or "rss" or "api" or "ical",
    "source_score": 0.8,
    "description": "Official city government events"
  }
]

Prioritize:
1. Official city/municipality websites
2. Tourism boards
3. Cultural institutions (museums, theaters)
4. Open data portals
5. iCal/RSS feeds from venues

Return 3-10 sources. Be conservative - only return sources you're confident exist.
NO markdown, NO explanations, ONLY the JSON array.`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Gemini API error ${response.status}:`, errorText)
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.candidates[0]?.content?.parts[0]?.text || '[]'

    // Extract JSON from markdown if present
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/```\n?([\s\S]*?)\n?```/)
    const jsonText = jsonMatch ? jsonMatch[1] : text

    try {
      const sources = JSON.parse(jsonText)
      return Array.isArray(sources) ? sources : []
    } catch (error) {
      console.error('Failed to parse source discovery response:', text)
      return []
    }
  } catch (error) {
    console.error('Source discovery failed:', error)
    return []
  }
}

async function validateSource(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EventNexus-Bot/1.0; +https://www.eventnexus.eu)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      redirect: 'follow'
    })
    // Accept 200-399 status codes (including redirects)
    const isValid = response.status >= 200 && response.status < 400
    console.log(`Source ${url} validation: ${response.status} - ${isValid ? 'VALID' : 'INVALID'}`)
    return isValid
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.log(`Source validation error for ${url}: ${errorMsg} - accepting anyway`)
    // Still add source even if validation fails - let fetch-sources handle it
    return true
  }
}

async function bootstrapCity(
  supabase: any,
  request: CityBootstrapRequest
): Promise<{ success: boolean; city_id: string; sources_added: number; events_seeded: number; error?: string }> {
  
  const { city_name, country, languages = ['en'], timezone = 'UTC', auto_discover = true, seed_events = true } = request
  
  let cityId = request.city_id  // Define at function scope

  try {
    // 1. Create or get city config
    if (!cityId) {
      const { data: existingCity, error: checkError } = await supabase
        .from('city_configs')
        .select('city_id')
        .eq('city_name', city_name)
        .eq('country', country)
        .maybeSingle()

      if (existingCity) {
        cityId = existingCity.city_id
      } else {
        const { data: newCity, error: cityError } = await supabase
          .from('city_configs')
          .insert({
            city_name,
            country,
            languages,
            timezone,
            active: true,
            bootstrap_status: 'discovering_sources'
          })
          .select('city_id')
          .single()

        if (cityError) throw cityError
        cityId = newCity.city_id
      }
    }

    if (!cityId) {
      throw new Error('Failed to create or retrieve city config')
    }

    // Update bootstrap status
    await supabase
      .from('city_configs')
      .update({ bootstrap_status: 'discovering_sources' })
      .eq('city_id', cityId)

    // 2. Discover sources with AI
    let sourcesAdded = 0

    if (auto_discover) {
      console.log(`Discovering sources for ${city_name}, ${country}...`)
      const discoveredSources = await discoverCitySources(city_name, country)

      for (const source of discoveredSources) {
        // Validate source availability
        const isValid = await validateSource(source.url)

        if (isValid) {
          const { error: sourceError } = await supabase
            .from('event_sources')
            .insert({
              city_id: cityId,
              name: source.name,
              type: source.type,
              url: source.url,
              source_score: source.source_score,
              active: true,
            })
            .select()

          if (!sourceError) {
            sourcesAdded++
          }
        } else {
          console.log(`Skipping invalid source: ${source.url}`)
        }
      }
    }

    // 3. Update bootstrap status
    await supabase
      .from('city_configs')
      .update({ bootstrap_status: 'seeding_events' })
      .eq('city_id', cityId)

    // 4. Seed initial events
    let eventsSeeded = 0

    if (seed_events && sourcesAdded > 0) {
      console.log(`Seeding initial events for ${city_name}...`)
      
      // Trigger fetch-sources for this city
      const { data: fetchResult, error: fetchError } = await supabase.functions.invoke('fetch-sources', {
        body: { city_id: cityId }
      })

      if (!fetchError && fetchResult?.results?.fetched > 0) {
        // Trigger parse pipeline
        await supabase.functions.invoke('parse-event-ai')
        await supabase.functions.invoke('validate-event')
        await supabase.functions.invoke('publish-event')

        // Count seeded events
        const { count } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('city_id', cityId)

        eventsSeeded = count || 0
      }
    }

    // 5. Activate city if sufficient events
    const finalStatus = eventsSeeded >= 5 ? 'active' : 'failed'
    const errorMessage = eventsSeeded < 5 ? `Only ${eventsSeeded} events discovered. Minimum 5 required.` : null

    await supabase
      .from('city_configs')
      .update({
        bootstrap_status: finalStatus,
        bootstrap_error: errorMessage
      })
      .eq('city_id', cityId)

    // Log completion
    await supabase
      .from('ai_decision_log')
      .insert({
        decision_type: 'city_bootstrap_completed',
        decision_result: finalStatus,
        reasoning: {
          city_id: cityId,
          city_name,
          country,
          sources_added: sourcesAdded,
          events_seeded: eventsSeeded
        },
        ai_model: GEMINI_MODEL,
      })

    return {
      success: finalStatus === 'active',
      city_id: cityId,
      sources_added: sourcesAdded,
      events_seeded: eventsSeeded,
      error: errorMessage || undefined
    }

  } catch (error) {
    // Update city status to failed
    if (cityId) {
      await supabase
        .from('city_configs')
        .update({
          bootstrap_status: 'failed',
          bootstrap_error: error.message
        })
        .eq('city_id', cityId)
    }

    throw error
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

    const request: CityBootstrapRequest = await req.json()

    if (!request.city_name || !request.country) {
      return new Response(
        JSON.stringify({ error: 'city_name and country are required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    const result = await bootstrapCity(supabaseClient, request)

    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.success
          ? `✅ City ${request.city_name} bootstrapped successfully!`
          : `⚠️ City bootstrap completed with warnings`,
        ...result,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 206,
      }
    )
  } catch (error) {
    console.error('Error in bootstrap-city:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
