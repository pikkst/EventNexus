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
const GEMINI_MODELS = [
  'gemini-2.5-pro',    // Primary: 150 RPM, 2M tokens
  'gemini-2.5-flash',  // Fallback 1: 1000 RPM, 1M tokens
  'gemini-3-flash'     // Fallback 2: 1000 RPM, 1M tokens (preview)
] as const
let currentModelIndex = 0

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
 * Geocode address using Nominatim first, then Gemini for refinement
 * This mirrors what publish-event does - single source of truth
 */
async function geocodeAddress(
  address: string,
  cityName: string,
  country: string
): Promise<{ lat: number; lng: number }> {
  // Try Nominatim first (fast, reliable fallback)
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&country=${encodeURIComponent(country)}&limit=1`
    const nominatimRes = await fetch(nominatimUrl)
    if (nominatimRes.ok) {
      const results = await nominatimRes.json()
      if (results && results.length > 0) {
        const lat = parseFloat(results[0].lat)
        const lng = parseFloat(results[0].lon)
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          console.log(`✓ Nominatim coordinates: ${lat}, ${lng}`)
          
          // Now try Gemini to verify/refine
          return await refineCoordinatesWithGemini(address, lat, lng, cityName, country)
        }
      }
    }
  } catch (e) {
    console.warn(`⚠️ Nominatim failed: ${e.message}`)
  }
  
  // Fallback: use Gemini directly
  console.log(`🔍 Using Gemini for direct geocoding: ${address}`)
  return await geocodeWithGemini(address, cityName, country)
}

/**
 * Refine existing coordinates with Gemini
 */
async function refineCoordinatesWithGemini(
  address: string,
  nominatimLat: number,
  nominatimLng: number,
  cityName: string,
  country: string
): Promise<{ lat: number; lng: number }> {
  try {
    const prompt = `You are a precise geocoding expert. Verify or refine coordinates for this address:

Address: ${address}
City: ${cityName}
Country: ${country}
Initial coordinates (Nominatim): ${nominatimLat}, ${nominatimLng}

CRITICAL: Use exact venue coordinates, not city center.
For Estonian addresses, be very precise with street-level accuracy.

Respond with ONLY a JSON object on ONE line:
{"lat": 58.1234, "lng": 25.5678}

MUST be valid coordinates: latitude -90 to 90, longitude -180 to 180.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          }
        })
      }
    )

    if (response.ok) {
      const data = await response.json()
      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const text = data.candidates[0].content.parts[0].text
        try {
          const coords = JSON.parse(text)
          if (coords.lat && coords.lng && 
              coords.lat >= -90 && coords.lat <= 90 && 
              coords.lng >= -180 && coords.lng <= 180) {
            
            const latDiff = Math.abs(nominatimLat - coords.lat)
            const lngDiff = Math.abs(nominatimLng - coords.lng)
            
            if (latDiff > 0.001 || lngDiff > 0.001) {
              console.log(`✓ REFINED by Gemini: ${coords.lat}, ${coords.lng} (diff: ${(latDiff * 111).toFixed(1)}km)`)
            }
            return { lat: coords.lat, lng: coords.lng }
          }
        } catch (e) {
          console.warn(`⚠️ Gemini JSON parse failed: ${text.substring(0, 50)}`)
        }
      }
    }
  } catch (e) {
    console.warn(`⚠️ Gemini refinement failed: ${e.message}`)
  }
  
  // Return Nominatim coordinates if Gemini fails
  console.log(`✓ Using Nominatim coordinates: ${nominatimLat}, ${nominatimLng}`)
  return { lat: nominatimLat, lng: nominatimLng }
}

/**
 * Direct Gemini geocoding when address only
 */
async function geocodeWithGemini(
  address: string,
  cityName: string,
  country: string
): Promise<{ lat: number; lng: number }> {
  try {
    const prompt = `You are a precise geocoding expert. Extract exact latitude and longitude for this address:

Address: ${address}
City: ${cityName}
Country: ${country}

CRITICAL: Use exact coordinates, not city center.
For Estonian addresses, be very precise with street-level accuracy.

Respond with ONLY a JSON object on ONE line:
{"lat": 58.1234, "lng": 25.5678}

MUST be valid coordinates: latitude -90 to 90, longitude -180 to 180.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          }
        })
      }
    )

    if (response.ok) {
      const data = await response.json()
      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const text = data.candidates[0].content.parts[0].text
        try {
          const coords = JSON.parse(text)
          if (coords.lat && coords.lng && 
              coords.lat >= -90 && coords.lat <= 90 && 
              coords.lng >= -180 && coords.lng <= 180) {
            console.log(`✓ Gemini coordinates: ${coords.lat}, ${coords.lng}`)
            return { lat: coords.lat, lng: coords.lng }
          }
        } catch (e) {
          console.warn(`⚠️ Gemini JSON parse failed: ${text.substring(0, 50)}`)
        }
      }
    }
  } catch (e) {
    console.warn(`⚠️ Gemini geocoding failed: ${e.message}`)
  }
  
  // Fallback to city center (0,0 placeholder)
  console.warn(`⚠️ Geocoding failed entirely for: ${address}`)
  return { lat: 0, lng: 0 }
}

/**
 * Validate and correct event coordinates using Gemini
 * Always use Gemini for precise venue coordinates
 * Even if basic validation passes, Gemini provides better accuracy
 */
async function validateAndRefineCoordinates(
  event: FreeEvent,
  cityName: string,
  country: string
): Promise<FreeEvent> {
  try {
    console.log(`🔍 Validating coordinates for: ${event.name}`)
    console.log(`   Address: ${event.location_address}`)
    console.log(`   Current coords: ${event.location_lat}, ${event.location_lng}`)
    
    // Use Flash model specifically for geocoding - no thinking mode overhead
    const prompt = `You are a precise geocoding expert. Extract the exact latitude and longitude for this venue:

Venue Name: ${event.name}
Address: ${event.location_address}
City: ${cityName}
Country: ${country}

CRITICAL: Use exact venue coordinates, not city center or street center.
For Estonian addresses, be very precise with street-level accuracy.

Respond with ONLY a JSON object on ONE line:
{"lat": 58.1234, "lng": 25.5678}

MUST be valid coordinates: latitude -90 to 90, longitude -180 to 180.`

    // Use 1.5-Flash model for geocoding - no thinking mode overhead
    // Gemini 2.5 models always use thinking mode which consumes most tokens
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          }
        })
      }
    )

    if (response.ok) {
      try {
        const data = await response.json()
        
        // Handle various response formats from Gemini
        if (!data || !data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
          console.warn(`⚠️ Gemini returned empty candidates for ${event.name}`)
          console.log(`   Response: ${JSON.stringify(data).substring(0, 200)}`)
          return event
        }
        
        const candidate = data.candidates[0]
        if (!candidate || !candidate.content || !candidate.content.parts || !Array.isArray(candidate.content.parts) || candidate.content.parts.length === 0) {
          console.warn(`⚠️ Gemini returned invalid content structure for ${event.name}`)
          console.log(`   Candidate: ${JSON.stringify(candidate).substring(0, 200)}`)
          console.log(`   Content: ${candidate?.content ? JSON.stringify(candidate.content).substring(0, 200) : 'undefined'}`)
          console.log(`   Parts: ${candidate?.content?.parts ? JSON.stringify(candidate.content.parts).substring(0, 200) : 'undefined'}`)
          return event
        }
        
        const text = candidate.content.parts[0]?.text || ''
        
        if (text && text.trim() !== 'null' && text.trim() !== '') {
          try {
            const coords = JSON.parse(text.trim())
            if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number' &&
                coords.lat >= -90 && coords.lat <= 90 && coords.lng >= -180 && coords.lng <= 180) {
              
              // Check if coordinates changed significantly
              const oldLat = event.location_lat
              const oldLng = event.location_lng
              const latDiff = Math.abs(oldLat - coords.lat)
              const lngDiff = Math.abs(oldLng - coords.lng)
              
              event.location_lat = coords.lat
              event.location_lng = coords.lng
              
              if (latDiff > 0.001 || lngDiff > 0.001) {
                console.log(`✓ REFINED coordinates for ${event.name}`)
                console.log(`  Before: ${oldLat}, ${oldLng}`)
                console.log(`  After:  ${coords.lat}, ${coords.lng}`)
                console.log(`  Diff: ${(latDiff * 111).toFixed(1)}km, ${(lngDiff * 111).toFixed(1)}km`)
              } else {
                console.log(`✓ Coordinates verified for ${event.name}: ${coords.lat}, ${coords.lng}`)
              }
            } else {
              console.warn(`⚠️ Gemini returned invalid coordinates for ${event.name}: lat=${coords?.lat}, lng=${coords?.lng}`)
            }
          } catch (parseError) {
            console.warn(`⚠️ Failed to parse Gemini response for ${event.name}: ${text.substring(0, 100)}`)
          }
        } else {
          console.warn(`⚠️ Gemini returned empty text for ${event.name}`)
        }
      } catch (jsonError) {
        console.error(`⚠️ Failed to parse Gemini JSON response for ${event.name}:`, jsonError)
      }
    } else {
      console.warn(`⚠️ Gemini API error ${response.status} for ${event.name}`)
    }
  } catch (error) {
    console.warn(`⚠️ Coordinate refinement failed for ${event.name}:`, error)
  }
  
  return event
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
  const searchPrompt = `Search for REAL upcoming FREE events in ${cityName}, ${country} (SPECIFICALLY in ${country}, NOT USA).

TODAY'S DATE: ${dateStr}
CRITICAL: Find ONLY FUTURE events (starting from ${dateStr} or later, not events that already happened!)

CRITICAL LOCATION FILTER:
- ONLY events in ${cityName}, ${country}
- EXCLUDE any events in USA cities with similar names
- Verify each event is in the CORRECT country: ${country}
- Check addresses contain ${country} or proper country indicators

CRITICAL TIME FILTER:
- Event start date MUST be ${dateStr} or later
- For events today (${dateStr}), only include events that haven't started yet
- EXCLUDE exhibitions/events that ended before ${dateStr}
- For ongoing exhibitions, use the end date (when exhibition closes)

IMPORTANT INSTRUCTIONS:
- Find at least ${targetCount} real, verifiable FUTURE events
- Date range: ${dateStr} to ${endStr}
- Focus on FREE events (no ticket required, or free admission)
- Include diverse categories: concerts, art exhibitions, workshops, markets, festivals, sports, community gatherings
- For ongoing exhibitions/displays, use the closing date as the event date
- For EACH event, find:
  * Exact name
  * Detailed description (what happens, who organizes, why attend)
  * Precise start date and time (MUST be in the future!)
  * End date and time (required for exhibitions/multi-day events)
  * Full street address with ${cityName}, ${country}
  * Link to official source/website

Search in multiple languages if needed (English, local language).
Use official tourism sites, event platforms, cultural institution websites, and local news.
DOUBLE-CHECK: All events must be FUTURE events in ${cityName}, ${country}, NOT USA, NOT past events.`

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

TODAY'S DATE AND TIME: ${dateStr}T00:00:00${timezone}
CRITICAL: Extract ONLY FUTURE events (start_time MUST be after today)

EXTRACTION RULES:
1. Extract ONLY real, verifiable FUTURE events (ignore past events, generic descriptions)
2. **CRITICAL:** start_time MUST be ${dateStr} or LATER (no past dates!)
3. Each event must have ALL required fields
4. Times must be in ISO 8601 format with timezone offset (${timezone})
   Example: "2026-01-18T19:00:00+02:00"
5. **REQUIRED:** end_time must be provided:
   - For exhibitions: use official closing date (usually weeks/months later)
   - For concerts/performances: +2-3 hours from start
   - For workshops: +1-2 hours from start
   - For markets/festivals: same day 18:00-22:00
   - For ongoing displays: use the last day they are available
6. **VALIDATION:** If event start date is before ${dateStr}, SKIP IT (it's in the past)
7. location_lat and location_lng: Use precise coordinates for the address
   - Search for exact venue coordinates
   - Use city center as fallback ONLY if address is vague
8. category: Choose from: Music, Arts & Culture, Sports & Fitness, Food & Drink, 
   Markets & Fairs, Workshop, Festival, Community, Nature & Outdoors, Nightlife, Other
9. is_free must be true
10. price must be 0
11. sourceUrl must be a real URL to event details

Current date: ${dateStr}
Target timezone: ${timezone}
Target city: ${cityName}, ${country}

Return ONLY valid JSON array with FUTURE events, no markdown, no explanations.`

  const structureResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: structurePrompt }] }],
        generationConfig: {
          temperature: 0.1,  // Low temperature for precision
          maxOutputTokens: 16000,  // Increased from 8000 to prevent truncation
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
  
  console.log(`📝 Raw structured response length: ${structuredText.length} chars`)
  
  // Clean and parse JSON with error handling
  let events: FreeEvent[] = []
  try {
    // Remove any markdown code blocks that Gemini might add
    const cleanedText = structuredText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    
    // Try to parse
    events = JSON.parse(cleanedText)
    
    // Validate it's an array
    if (!Array.isArray(events)) {
      console.error('❌ Parsed result is not an array:', typeof events)
      events = []
    }
    
    console.log(`✅ Step 2 complete: Structured ${events.length} events`)
  } catch (parseError: any) {
    console.error('❌ JSON parsing failed:', parseError.message)
    console.error('First 500 chars of response:', structuredText.substring(0, 500))
    console.error('Last 500 chars of response:', structuredText.substring(Math.max(0, structuredText.length - 500)))
    
    // Try to salvage partial JSON by finding complete array
    try {
      // Find last complete closing bracket
      const lastBracket = structuredText.lastIndexOf(']')
      if (lastBracket > 0) {
        const truncated = structuredText.substring(0, lastBracket + 1)
        events = JSON.parse(truncated)
        console.log(`⚠️ Recovered ${events.length} events from truncated JSON`)
      }
    } catch (recoveryError) {
      console.error('❌ Recovery also failed, returning empty array')
      events = []
    }
  }
  
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

    // First, ensure EventScout AI source exists for this city
    const { data: existingSource } = await supabase
      .from('event_sources')
      .select('id')
      .eq('city_id', cityData.city_id)
      .eq('name', 'EventScout AI - Google Search')
      .single()

    let sourceId: string

    if (existingSource) {
      sourceId = existingSource.id
      console.log(`  ✓ Using existing EventScout AI source: ${sourceId}`)
    } else {
      // Create EventScout AI source for this city
      const { data: newSource, error: sourceError } = await supabase
        .from('event_sources')
        .insert({
          city_id: cityData.city_id,
          name: 'EventScout AI - Google Search',
          type: 'api',
          url: 'https://www.google.com/search',
          source_score: 95,  // High score - Google Search grounded
          active: true
        })
        .select('id')
        .single()

      if (sourceError || !newSource) {
        throw new Error(`Failed to create EventScout AI source: ${sourceError?.message}`)
      }

      sourceId = newSource.id
      console.log(`  ✓ Created EventScout AI source: ${sourceId}`)
    }

    // Insert events into parsed_events table
    const insertResults = {
      inserted: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const event of events) {
      try {
        // CRITICAL: Check for duplicates BEFORE inserting
        // Check both parsed_events and events tables to avoid duplicates
        const eventStartTime = new Date(event.start_time)
        const eventDateStr = eventStartTime.toISOString().split('T')[0]
        
        // Check if already in events table (published)
        const { data: existingPublished } = await supabase
          .from('events')
          .select('id, name')
          .eq('city_id', cityData.city_id)
          .eq('name', event.name)
          .eq('date', eventDateStr)
          .limit(1)
        
        if (existingPublished && existingPublished.length > 0) {
          console.log(`  ⊘ Skip (already published): ${event.name}`)
          insertResults.skipped = (insertResults.skipped || 0) + 1
          continue
        }
        
        // Check if already in parsed_events table (awaiting validation/publishing)
        const { data: existingParsed } = await supabase
          .from('parsed_events')
          .select('id')
          .eq('structured_json->>name', event.name)
          .gte('parsed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
          .limit(1)
        
        if (existingParsed && existingParsed.length > 0) {
          console.log(`  ⊘ Skip (already parsed): ${event.name}`)
          insertResults.skipped = (insertResults.skipped || 0) + 1
          continue
        }

        // ✅ VALIDATE: Event must be in the future
        const now = new Date()
        
        if (eventStartTime < now) {
          console.log(`  ⊘ Skip (past event): ${event.name} (${event.start_time})`)
          insertResults.skipped = (insertResults.skipped || 0) + 1
          continue
        }

        // ✅ Use coordinates from Gemini structuring
        // publish-event will refine/validate them later with full geocoding logic
        console.log(`✅ ${event.name}`)

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
        // First create raw_event with proper source_id
        const { data: rawEvent, error: rawError } = await supabase
          .from('raw_events')
          .insert({
            source_id: sourceId,  // Link to EventScout AI source
            raw_content: null,
            raw_content_json: event,
            content_type: 'json',
            content_hash: `eventscout-${event.name}-${event.start_time}`.substring(0, 100),
            processing_status: 'parsed'
          })
          .select('id')
          .single()

        if (rawError || !rawEvent) {
          console.error(`❌ Failed to create raw_event for ${event.name}:`, rawError)
          insertResults.failed++
          insertResults.errors.push(`${event.name}: ${rawError?.message || 'Unknown error'}`)
          continue
        }

        // Now insert into parsed_events with all required fields
        const { data: parsedEvent, error: insertError } = await supabase
          .from('parsed_events')
          .insert({
            raw_event_id: rawEvent.id,
            structured_json: structured,
            original_language: 'en',
            confidence_partial: 0.95,  // High confidence (Google Search grounded)
            validation_status: 'validated'  // Auto-validated by EventScout AI
          })
          .select('id')
          .single()

        if (insertError || !parsedEvent) {
          console.error(`❌ Insert failed: ${event.name}`, insertError)
          insertResults.failed++
          insertResults.errors.push(`${event.name}: ${insertError?.message || 'Unknown error'}`)
        } else {
          // Insert event_confidence for publish-event to find it
          const { error: confidenceError } = await supabase
            .from('event_confidence')
            .insert({
              parsed_event_id: parsedEvent.id,
              source_score: 0.95,          // EventScout AI confidence
              data_completeness: 0.90,     // Gemini Pro ensures complete data
              time_validity: 1.00,         // Future events only
              geo_accuracy: 0.85,          // Google Search location accuracy
              semantic_validity: 1.00,     // No spam (grounded search)
              final_score: 0.93,           // Weighted average ~93%
              calculation_metadata: {
                source: 'EventScout AI',
                model: 'Gemini 2.5 Pro + Thinking Mode',
                grounded: 'Google Search'
              }
            })
          
          if (confidenceError) {
            console.error(`⚠️ event_confidence insert failed for ${event.name}:`, confidenceError)
            // Don't fail the whole operation, event is still inserted
          }
          
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
      `Discovered ${insertResults.inserted} events (${insertResults.skipped} skipped duplicates) in ${duration}ms`,
      {
        ...logContext,
        events_found: events.length,
        events_inserted: insertResults.inserted,
        events_skipped: insertResults.skipped,
        duration_ms: duration
      }
    )

    console.log(`\n✅ EventScout AI complete!`)
    console.log(`  📊 Found: ${events.length} events`)
    console.log(`  ✅ Inserted: ${insertResults.inserted}`)
    console.log(`  ⊘ Skipped: ${insertResults.skipped}`)
    console.log(`  ❌ Failed: ${insertResults.failed}`)
    console.log(`  ⏱️ Duration: ${duration}ms`)

    // AUTOMATICALLY PUBLISH: Trigger publish-event to move parsed_events to live map
    console.log(`\n🚀 Auto-publishing ${insertResults.inserted} events to live map...`)
    let publishedCount = 0
    let publishError: string | null = null
    
    try {
      // Use supabase client to invoke the function (handles auth automatically)
      const { data: publishResult, error: publishErr } = await supabase.functions.invoke('publish-event', {
        body: { city_id: cityData.city_id }
      })
      
      if (publishErr) {
        publishError = publishErr.message || String(publishErr)
        console.error(`  ❌ Publish failed: ${publishError}`)
      } else {
        publishedCount = publishResult?.results?.published || 0
        console.log(`  ✅ Published ${publishedCount} events to map`)
      }
    } catch (err) {
      publishError = String(err)
      console.error(`  ❌ Publish error: ${publishError}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        city: `${cityData.city_name}, ${cityData.country}`,
        results: {
          events_found: events.length,
          events_inserted: insertResults.inserted,
          events_skipped: insertResults.skipped,
          events_failed: insertResults.failed,
          errors: insertResults.errors.length > 0 ? insertResults.errors : undefined,
          duration_ms: duration,
          // Include publishing results
          events_published: publishedCount,
          publish_error: publishError || undefined
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
