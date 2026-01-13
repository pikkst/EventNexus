// AI Agent: EventScout AI Integration
// Uses Google Search + Gemini Thinking to discover real free events directly
// Bypasses HTML scraping - finds structured events immediately

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { log } from '../_shared/logger.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_API_KEY = Deno.env.get('API_KEY') || Deno.env.get('GEMINI_API_KEY')

interface DiscoverEventsRequest {
  city_id?: string
  city_name?: string
  country?: string
  target_events?: number  // How many events to find (default: 15)
}

interface FreeEvent {
  name: string
  description: string
  start_time: string
  end_time: string
  location_address: string
  location_lat: number
  location_lng: number
  category: string
  is_free: boolean
  price: number
  sourceUrl: string
}

/**
 * EventScout AI Discovery
 * Uses Gemini Flash + Google Search to find REAL events
 * Then uses Gemini Pro + Thinking Mode to structure them precisely
 */
async function discoverEventsWithAI(
  cityName: string,
  country: string,
  timezone: string,
  targetCount: number = 15
): Promise<FreeEvent[]> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured')
  }

  const today = new Date()
  const thirtyDaysLater = new Date()
  thirtyDaysLater.setDate(today.getDate() + 30)
  
  const dateStr = today.toISOString().split('T')[0]
  const endStr = thirtyDaysLater.toISOString().split('T')[0]

  console.log(`🔍 Step 1: Searching for events in ${cityName}, ${country}...`)

  // Step 1: Broad search using Flash + Google Search Grounding
  const searchPrompt = `Search for REAL upcoming FREE events in ${cityName}, ${country} between ${dateStr} and ${endStr}.

IMPORTANT INSTRUCTIONS:
- Find at least ${targetCount} real, verifiable events
- Focus on FREE events (no ticket required, or free admission)
- Include diverse categories: concerts, art exhibitions, workshops, markets, festivals, sports, community gatherings
- For EACH event, find:
  * Exact name
  * Detailed description (what happens, who organizes, why attend)
  * Precise start date and time
  * End date and time (if available)
  * Full street address with city
  * Link to official source/website

Search in multiple languages if needed (English, local language).
Use official tourism sites, event platforms, cultural institution websites, and local news.`

  const searchResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: searchPrompt }] }],
        tools: [{ googleSearch: {} }],  // Enable Google Search grounding
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 8000
        }
      })
    }
  )

  if (!searchResponse.ok) {
    const errorText = await searchResponse.text()
    throw new Error(`Gemini Flash search failed: ${searchResponse.status} - ${errorText}`)
  }

  const searchResult = await searchResponse.json()
  const rawText = searchResult.candidates?.[0]?.content?.parts?.[0]?.text || ''
  
  if (!rawText || rawText.length < 100) {
    throw new Error('No events found by Google Search')
  }

  console.log(`✅ Step 1 complete: Found raw event data (${rawText.length} chars)`)
  console.log(`🧠 Step 2: Structuring with Gemini Pro + Thinking Mode...`)

  // Step 2: Structure using Pro + Thinking Mode for precision
  const structurePrompt = `Transform this event search data into a structured JSON array.

RAW SEARCH DATA:
${rawText}

EXTRACTION RULES:
1. Extract ONLY real, verifiable events (ignore generic descriptions)
2. Each event must have ALL required fields
3. Times must be in ISO 8601 format with timezone offset (${timezone})
   Example: "2026-01-18T19:00:00+02:00"
4. If end_time is not found, estimate based on event type:
   - Concerts/performances: +2-3 hours
   - Exhibitions: same day 22:00
   - Workshops: +1-2 hours
   - Markets/festivals: same day 18:00-22:00
5. location_lat and location_lng: Use precise coordinates for the address
   - Search for exact venue coordinates
   - Use city center as fallback ONLY if address is vague
6. category: Choose from: Music, Arts & Culture, Sports & Fitness, Food & Drink, 
   Markets & Fairs, Workshop, Festival, Community, Nature & Outdoors, Nightlife, Other
7. is_free must be true
8. price must be 0
9. sourceUrl must be a real URL to event details

Current date: ${dateStr}
Target timezone: ${timezone}
Target city: ${cityName}, ${country}

Return ONLY valid JSON array, no markdown, no explanations.`

  const structureResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: structurePrompt }] }],
        generationConfig: {
          temperature: 0.1,  // Low temperature for precision
          maxOutputTokens: 8000,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                description: { type: 'STRING' },
                start_time: { type: 'STRING' },
                end_time: { type: 'STRING' },
                location_address: { type: 'STRING' },
                location_lat: { type: 'NUMBER' },
                location_lng: { type: 'NUMBER' },
                category: { type: 'STRING' },
                is_free: { type: 'BOOLEAN' },
                price: { type: 'NUMBER' },
                sourceUrl: { type: 'STRING' }
              },
              required: [
                'name', 'description', 'start_time', 'end_time',
                'location_address', 'location_lat', 'location_lng',
                'category', 'is_free', 'price', 'sourceUrl'
              ]
            }
          }
        },
        systemInstruction: {
          parts: [{
            text: `You are a precise event data structuring agent. 
Your job is to extract REAL events from search results and format them with exact coordinates and ISO timestamps.
Never invent events - only use data from the search results provided.
If a field is missing, use your best reasoning to fill it accurately based on context.`
          }]
        }
      })
    }
  )

  if (!structureResponse.ok) {
    const errorText = await structureResponse.text()
    throw new Error(`Gemini Pro structuring failed: ${structureResponse.status} - ${errorText}`)
  }

  const structureResult = await structureResponse.json()
  const structuredText = structureResult.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
  
  const events: FreeEvent[] = JSON.parse(structuredText)
  
  console.log(`✅ Step 2 complete: Structured ${events.length} events`)
  
  return events
}

// Main handler
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Parse request
    const body: DiscoverEventsRequest = await req.json()
    const { city_id, city_name, country, target_events = 15 } = body

    // Get city from database if city_id provided
    let cityData: any = null
    if (city_id) {
      const { data, error } = await supabase
        .from('city_configs')
        .select('city_id, city_name, country, timezone, latitude, longitude')
        .eq('city_id', city_id)
        .single()

      if (error || !data) {
        throw new Error(`City not found: ${city_id}`)
      }
      cityData = data
    } else if (city_name && country) {
      // Use provided city info
      cityData = {
        city_name,
        country,
        timezone: 'Europe/Tallinn' // Default, will be refined
      }
    } else {
      throw new Error('Either city_id or (city_name + country) required')
    }

    const logContext = {
      city_name: cityData.city_name,
      country: cityData.country,
      city_id: cityData.city_id
    }

    await log(supabase, 'discover-events-ai', 'info',
      `Starting EventScout AI discovery for ${cityData.city_name}, ${cityData.country}`,
      logContext
    )

    console.log(`\n🚀 EventScout AI: ${cityData.city_name}, ${cityData.country}`)
    console.log(`🎯 Target: ${target_events} events`)

    // Discover events using AI
    const events = await discoverEventsWithAI(
      cityData.city_name,
      cityData.country,
      cityData.timezone || 'Europe/Tallinn',
      target_events
    )

    if (events.length === 0) {
      await log(supabase, 'discover-events-ai', 'warning',
        'No events found',
        logContext
      )

      return new Response(
        JSON.stringify({
          success: false,
          city: `${cityData.city_name}, ${cityData.country}`,
          events_found: 0,
          message: 'No events found for this city in the next 30 days'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`\n📦 Inserting ${events.length} events into database...`)

    // Insert events into parsed_events table
    const insertResults = {
      inserted: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const event of events) {
      try {
        // Create structured_json
        const structured = {
          name: event.name,
          description: event.description,
          start_time: event.start_time,
          end_time: event.end_time,
          location_address: event.location_address,
          location_lat: event.location_lat,
          location_lng: event.location_lng,
          category: event.category,
          is_free: true,
          price: 0,
          source_url: event.sourceUrl,
          organizer: null,
          image_url: null,
          original_language: 'en'
        }

        // Insert into parsed_events
        const { error: insertError } = await supabase
          .from('parsed_events')
          .insert({
            raw_event_id: null,  // EventScout AI has no raw_event
            structured_json: structured,
            parsing_confidence: 0.95,  // High confidence (Google Search grounded)
            created_at: new Date().toISOString()
          })

        if (insertError) {
          console.error(`❌ Insert failed: ${event.name}`, insertError)
          insertResults.failed++
          insertResults.errors.push(`${event.name}: ${insertError.message}`)
        } else {
          insertResults.inserted++
          console.log(`  ✅ ${event.name}`)
        }
      } catch (eventError: any) {
        insertResults.failed++
        insertResults.errors.push(`${event.name}: ${eventError.message}`)
      }
    }

    const duration = Date.now() - startTime

    await log(supabase, 'discover-events-ai', 'success',
      `Discovered ${insertResults.inserted} events in ${duration}ms`,
      {
        ...logContext,
        events_found: events.length,
        events_inserted: insertResults.inserted,
        duration_ms: duration
      }
    )

    console.log(`\n✅ EventScout AI complete!`)
    console.log(`  📊 Found: ${events.length} events`)
    console.log(`  ✅ Inserted: ${insertResults.inserted}`)
    console.log(`  ❌ Failed: ${insertResults.failed}`)
    console.log(`  ⏱️ Duration: ${duration}ms`)

    // Auto-trigger validation and publishing
    if (insertResults.inserted > 0) {
      console.log(`\n🚀 Triggering validation and publishing...`)

      // Validate events
      const { error: validateError } = await supabase.functions.invoke('validate-event', {
        body: { city_id: cityData.city_id }
      })

      if (validateError) {
        console.warn('⚠️ Validation trigger failed:', validateError)
      }

      // Publish events
      const { error: publishError } = await supabase.functions.invoke('publish-event', {
        body: { city_id: cityData.city_id }
      })

      if (publishError) {
        console.warn('⚠️ Publishing trigger failed:', publishError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        city: `${cityData.city_name}, ${cityData.country}`,
        results: {
          events_found: events.length,
          events_inserted: insertResults.inserted,
          events_failed: insertResults.failed,
          errors: insertResults.errors.length > 0 ? insertResults.errors : undefined,
          duration_ms: duration
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ EventScout AI failed:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
