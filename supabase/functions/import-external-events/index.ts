// AI Agent: External Event Import Service
// Imports events from external JSON format and publishes them through the pipeline

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
let currentModelIndex = 0 // Track which model we're using

interface ExternalEvent {
  name: string
  startTime: string  // Human-readable: "Saturday, January 17, 2026 | 1:00 PM – 4:00 PM"
  location: string   // Address without coordinates
  content: string    // Description
  sourceUrl: string
}

interface ExternalImportRequest {
  city: string       // "Amsterdam, Netherlands"
  events: ExternalEvent[]
}

interface ParsedDateTime {
  start_time: string  // ISO 8601: "2026-01-17T13:00:00+01:00"
  end_time: string | null
}

// Geocode address using Nominatim
async function geocodeAddress(
  address: string, 
  cityName: string, 
  country: string, 
  countryCode: string
): Promise<{lat: number, lng: number} | null> {
  try {
    // Try Gemini first if API key is available
    if (GEMINI_API_KEY) {
      const geminiCoords = await geocodeAddressWithGemini(address, cityName, country)
      if (geminiCoords) {
        return geminiCoords
      }
    }
    
    // Fallback to Nominatim
    await new Promise(resolve => setTimeout(resolve, 1100)) // Rate limit: 1 req/sec
    
    // Prepare search variations
    const searchVariations: string[] = []
    
    // 1. Full address with city and country
    searchVariations.push(`${address}, ${cityName}, ${country}`)
    
    // 2. Address with city only
    searchVariations.push(`${address}, ${cityName}`)
    
    // 3. Just address with country
    searchVariations.push(`${address}, ${country}`)
    
    // 4. Clean address (remove special chars)
    const cleanAddress = address.replace(/[()[\]]/g, '').replace(/\s+/g, ' ').trim()
    if (cleanAddress !== address) {
      searchVariations.push(`${cleanAddress}, ${cityName}, ${country}`)
    }
    
    // Remove duplicates
    const uniqueVariations = [...new Set(searchVariations)]
    
    console.log(`🔍 Geocoding "${address}" in ${cityName} with ${uniqueVariations.length} Nominatim strategies`)
    
    // Try each variation
    for (const searchAddress of uniqueVariations) {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1&countrycodes=${countryCode}`,
        {
          headers: {
            'User-Agent': 'EventNexus/1.0 (https://www.eventnexus.eu)',
            'Accept-Language': 'en,et'
          }
        }
      )

      if (!response.ok) {
        console.warn(`⚠️ Nominatim error ${response.status} for "${searchAddress}"`)
        continue
      }

      const results = await response.json()
      
      if (results && results.length > 0) {
        const result = results[0]
        console.log(`✅ Geocoded via Nominatim: ${result.display_name} → ${result.lat}, ${result.lon}`)
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        }
      }
    }
    
    console.warn(`❌ No geocoding results for "${address}"`)
    return null
    
  } catch (error) {
    console.error(`Geocoding failed for "${address}":`, error)
    return null
  }
}

// Geocode address using Gemini AI
async function geocodeAddressWithGemini(
  address: string,
  cityName: string,
  country: string
): Promise<{lat: number, lng: number} | null> {
  try {
    if (!GEMINI_API_KEY) return null

    const prompt = `You are a geocoding expert. Extract the precise latitude and longitude for this address:

Address: ${address}
City: ${cityName}
Country: ${country}

Respond with ONLY a JSON object on ONE line, no explanations:
{"lat": 58.1234, "lng": 25.5678}

Be as precise as possible. If you cannot find exact coordinates, respond with null.
Use your knowledge of ${country} geography to provide accurate coordinates.`

    const currentModel = GEMINI_MODELS[currentModelIndex]
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 100,
          }
        })
      }
    )

    if (!response.ok) {
      console.warn(`⚠️ Gemini geocoding API error ${response.status}`)
      return null
    }

    const data = await response.json()
    const text = data.candidates[0]?.content?.parts[0]?.text || ''
    
    if (text.trim() === 'null' || text.trim() === '') {
      return null
    }
    
    let coords: any = null
    try {
      coords = JSON.parse(text.trim())
    } catch {
      const jsonMatch = text.match(/\{.*"lat".*"lng".*\}/s)
      if (jsonMatch) {
        try {
          coords = JSON.parse(jsonMatch[0])
        } catch {
          return null
        }
      }
    }

    if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number' &&
        coords.lat >= -90 && coords.lat <= 90 && coords.lng >= -180 && coords.lng <= 180) {
      console.log(`✅ Geocoded via Gemini: "${address}" → ${coords.lat}, ${coords.lng}`)
      return coords
    }
  } catch (error) {
    console.warn(`⚠️ Gemini geocoding error:`, error)
  }
  return null
}

// Parse human-readable time string to ISO 8601 using Gemini AI
async function parseTimeString(
  timeString: string,
  cityTimezone: string = 'Europe/Amsterdam'
): Promise<ParsedDateTime> {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured')
    }
    
    const prompt = `Extract structured date/time from this event time description:
"${timeString}"

Rules:
- Current date is January 13, 2026
- Timezone: ${cityTimezone}
- If only date/time mentioned, assume current year (2026)
- If "until" or range given, extract end_time
- If duration mentioned (e.g., "2 hours"), calculate end_time
- If no end time, return null for end_time
- Output ISO 8601 format with timezone offset

Examples:
"Saturday, January 17, 2026 | 1:00 PM – 4:00 PM" → 
  start_time: "2026-01-17T13:00:00+01:00", end_time: "2026-01-17T16:00:00+01:00"

"Daily until January 18, 2026 | 5:00 PM – 10:00 PM" →
  start_time: "2026-01-13T17:00:00+01:00", end_time: "2026-01-18T22:00:00+01:00"

"Thursday, January 22, 2026 | 12:30 PM" →
  start_time: "2026-01-22T12:30:00+01:00", end_time: null

Return ONLY valid JSON: {"start_time": "...", "end_time": "..."}
No markdown, no explanations.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 200
          }
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    
    // Extract JSON from response (might have markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const parsedTime = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    
    console.log(`⏰ Parsed time: "${timeString}" → ${parsedTime.start_time}`)
    return parsedTime

  } catch (error) {
    console.error(`Time parsing failed for "${timeString}":`, error)
    // Fallback: return null times (will be rejected by validation later)
    return { start_time: '', end_time: null }
  }
}

// Determine event category from name and description
function determineCategory(name: string, content: string): string {
  const lowerName = name.toLowerCase()
  const lowerContent = content.toLowerCase()
  const combined = lowerName + ' ' + lowerContent
  
  // Category keywords
  const categories: Record<string, string[]> = {
    'Arts & Culture': ['art', 'exhibition', 'museum', 'gallery', 'festival', 'culture', 'light festival', 'photography'],
    'Music': ['concert', 'music', 'band', 'orchestra', 'jazz', 'classical', 'performance'],
    'Sports & Fitness': ['sport', 'fitness', 'run', 'skate', 'bike', 'marathon', 'yoga', 'workout'],
    'Food & Drink': ['food', 'drink', 'restaurant', 'tasting', 'wine', 'beer', 'culinary'],
    'Markets & Fairs': ['market', 'fair', 'bazaar', 'flea', 'craft', 'vendor'],
    'Nightlife': ['nightlife', 'club', 'party', 'dj', 'bar', 'pub'],
    'Family & Kids': ['kids', 'children', 'family', 'playground'],
    'Education': ['workshop', 'class', 'seminar', 'lecture', 'course', 'training'],
    'Community': ['community', 'social', 'meetup', 'gathering', 'celebration'],
    'Nature & Outdoors': ['nature', 'outdoor', 'park', 'garden', 'hike', 'walk']
  }
  
  // Score each category
  const scores: Record<string, number> = {}
  for (const [category, keywords] of Object.entries(categories)) {
    scores[category] = keywords.filter(keyword => combined.includes(keyword)).length
  }
  
  // Get category with highest score
  const bestCategory = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])[0]
  
  return bestCategory && bestCategory[1] > 0 ? bestCategory[0] : 'Other'
}

// Main handler
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Parse request body
    const body: ExternalImportRequest[] = await req.json()
    
    if (!Array.isArray(body) || body.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Expected array of city/events objects' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = {
      total_events: 0,
      imported: 0,
      failed: 0,
      cities_processed: 0,
      errors: [] as string[]
    }

    // Process each city
    for (const cityData of body) {
      const { city, events } = cityData
      
      if (!city || !events || !Array.isArray(events)) {
        results.errors.push(`Invalid data structure for city: ${city || 'unknown'}`)
        continue
      }

      // Parse city name and country
      const cityParts = city.split(',').map(s => s.trim())
      const cityName = cityParts[0] || ''
      const country = cityParts[1] || ''
      
      // Get country code (simplified mapping)
      const countryCodeMap: Record<string, string> = {
        'Netherlands': 'nl',
        'Estonia': 'ee',
        'Germany': 'de',
        'France': 'fr',
        'United Kingdom': 'gb',
        'Belgium': 'be',
        'Spain': 'es',
        'Italy': 'it'
      }
      const countryCode = countryCodeMap[country] || 'nl'
      
      // Find or create city in database
      let { data: cityConfig, error: cityError } = await supabase
        .from('city_configs')
        .select('city_id, city_name, country, timezone')
        .eq('city_name', cityName)
        .eq('country', country)
        .maybeSingle()

      if (cityError) {
        console.error(`Error finding city "${city}":`, cityError)
        results.errors.push(`City lookup failed: ${city}`)
        continue
      }

      if (!cityConfig) {
        results.errors.push(`City not found in database: ${city}. Please add it first via AI Agent Dashboard.`)
        continue
      }

      console.log(`\n🌍 Processing ${events.length} events for ${city}...`)
      results.cities_processed++

      // Process each event
      for (const event of events) {
        results.total_events++
        
        try {
          console.log(`\n📅 Event: ${event.name}`)
          
          // 1. Parse time string to ISO datetime
          const parsedTime = await parseTimeString(
            event.startTime, 
            cityConfig.timezone || 'Europe/Amsterdam'
          )
          
          if (!parsedTime.start_time) {
            throw new Error(`Failed to parse time: "${event.startTime}"`)
          }

          // 2. Geocode location
          const coords = await geocodeAddress(
            event.location,
            cityName,
            country,
            countryCode
          )
          
          if (!coords) {
            throw new Error(`Failed to geocode: "${event.location}"`)
          }

          // 3. Determine category
          const category = determineCategory(event.name, event.content)
          
          // 4. Create structured_json for parsed_events table
          const structuredEvent = {
            name: event.name,
            description: event.content,
            start_time: parsedTime.start_time,
            end_time: parsedTime.end_time,
            location_address: event.location,
            location_lat: coords.lat,
            location_lng: coords.lng,
            category: category,
            is_free: true,  // All imported events are assumed free
            price: 0,
            source_url: event.sourceUrl,
            organizer: null,
            image_url: null,
            original_language: 'en'
          }

          // 5. Insert into parsed_events table
          const { data: insertedEvent, error: insertError } = await supabase
            .from('parsed_events')
            .insert({
              raw_event_id: null,  // External import has no raw_event
              structured_json: structuredEvent,
              parsing_confidence: 0.95,  // High confidence for manual imports
              created_at: new Date().toISOString()
            })
            .select('parsed_event_id')
            .single()

          if (insertError) {
            throw new Error(`Insert failed: ${insertError.message}`)
          }

          console.log(`✅ Imported: ${event.name} (ID: ${insertedEvent.parsed_event_id})`)
          results.imported++

          // 6. Log success
          await log(supabase, 'import-external-events', 'success', 
            `Imported: ${event.name} in ${city}`, 
            { parsed_event_id: insertedEvent.parsed_event_id, city_id: cityConfig.city_id }
          )

        } catch (eventError: any) {
          console.error(`❌ Failed to import "${event.name}":`, eventError.message)
          results.failed++
          results.errors.push(`${event.name}: ${eventError.message}`)
          
          await log(supabase, 'import-external-events', 'error',
            `Import failed: ${event.name}`,
            { error: eventError.message, city: city }
          )
        }
      }
    }

    // After import, trigger validation and publishing
    if (results.imported > 0) {
      console.log(`\n🚀 Triggering validation and publishing for ${results.imported} imported events...`)
      
      // Invoke validate-event
      const { error: validateError } = await supabase.functions.invoke('validate-event', {
        body: {}  // Validates all pending parsed_events
      })
      
      if (validateError) {
        console.warn('⚠️ Validation trigger failed:', validateError)
      }
      
      // Invoke publish-event
      const { error: publishError } = await supabase.functions.invoke('publish-event', {
        body: {}  // Publishes all validated events
      })
      
      if (publishError) {
        console.warn('⚠️ Publishing trigger failed:', publishError)
      }
    }

    // Return results
    return new Response(
      JSON.stringify({
        success: true,
        results: {
          ...results,
          message: `Imported ${results.imported}/${results.total_events} events from ${results.cities_processed} cities`
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('Import failed:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
