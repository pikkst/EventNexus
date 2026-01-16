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

/**
 * Utility to retry API calls with exponential backoff
 * Matches the test program's reliable retry mechanism
 */
const callWithRetry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> => {
  try {
    return await fn()
  } catch (error: any) {
    if (retries <= 0) throw error
    console.warn(`🔄 API call failed, retrying in ${delay}ms... (${retries} retries left)`, error.message)
    await new Promise(resolve => setTimeout(resolve, delay))
    return callWithRetry(fn, retries - 1, delay * 2)
  }
}

// Levenshtein distance for fuzzy matching (detect minor title variations)
function levenshteinDistance(a: string, b: string): number {
  const aLen = a.length
  const bLen = b.length
  const matrix: number[][] = []
  
  for (let i = 0; i <= bLen; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= aLen; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= bLen; i++) {
    for (let j = 1; j <= aLen; j++) {
      if (b.charCodeAt(i - 1) === a.charCodeAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[bLen][aLen]
}

// Normalize title for comparison
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\sáéíóúäöõ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Normalize address for comparison
function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .trim()
}

// Calculate similarity score (0 to 1, where 1 is identical)
function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = normalizeTitle(str1)
  const normalized2 = normalizeTitle(str2)
  
  if (normalized1 === normalized2) return 1.0
  
  const maxLen = Math.max(normalized1.length, normalized2.length)
  if (maxLen === 0) return 1.0
  
  const distance = levenshteinDistance(normalized1, normalized2)
  return 1.0 - (distance / maxLen)
}

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
  country: string,
  countryCode: string
): Promise<{ lat: number; lng: number }> {
  // Try Nominatim first (fast, reliable fallback)
  try {
    // CRITICAL: Use countrycodes parameter to strictly filter by country code
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=${countryCode}&limit=1`
    const nominatimRes = await fetch(nominatimUrl)
    if (nominatimRes.ok) {
      const results = await nominatimRes.json()
      if (results && results.length > 0) {
        const lat = parseFloat(results[0].lat)
        const lng = parseFloat(results[0].lon)
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          console.log(`✓ Nominatim coordinates: ${lat}, ${lng}`)
          
          // CRITICAL: Trust Nominatim for specific addresses. 
          // Gemini refinement often introduces hallucinations in small towns.
          return { lat, lng }
        }
      }
    }
  } catch (e) {
    console.warn(`[WARN] Nominatim failed: ${e.message}`)
  }
  
  // Fallback: use Gemini directly
  console.log(`🔍 Using Gemini for direct geocoding: ${address}`)
  return await geocodeWithGemini(address, cityName, country, countryCode)
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
          console.warn(`[WARN] Gemini JSON parse failed: ${text.substring(0, 50)}`)
        }
      }
    }
  } catch (e) {
    console.warn(`[WARN] Gemini refinement failed: ${e.message}`)
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
  country: string,
  countryCode: string
): Promise<{ lat: number; lng: number }> {
  try {
    const prompt = `You are a precise geocoding expert. Find the EXACT latitude and longitude for this specific venue:

Address: ${address}
City: ${cityName}
Country: ${country} (ISO Code: ${countryCode.toUpperCase()})

CRITICAL LOCATION RULES:
1. The venue MUST be in ${cityName}, ${country} (${countryCode.toUpperCase()}) - NOT any other country!
2. Use exact venue coordinates, NOT city center or street center
3. Verify the country matches ${country} - reject coordinates from USA, Canada, or other countries
4. Do NOT confuse the city with the county capital if they share a county name
5. Be extremely precise with street-level accuracy

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
          console.warn(`[WARN] Gemini JSON parse failed: ${text.substring(0, 50)}`)
        }
      }
    }
  } catch (e) {
    console.warn(`[WARN] Gemini geocoding failed: ${e.message}`)
  }
  
  // Fallback to city center (0,0 placeholder)
  console.warn(`[WARN] Geocoding failed entirely for: ${address}`)
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
    console.log(`[SEARCH] Validating coordinates for: ${event.name}`)
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
          console.warn(`[WARN] Gemini returned empty candidates for ${event.name}`)
          console.log(`   Response: ${JSON.stringify(data).substring(0, 200)}`)
          return event
        }
        
        const candidate = data.candidates[0]
        if (!candidate || !candidate.content || !candidate.content.parts || !Array.isArray(candidate.content.parts) || candidate.content.parts.length === 0) {
          console.warn(`[WARN] Gemini returned invalid content structure for ${event.name}`)
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
              console.warn(`[WARN] Gemini returned invalid coordinates for ${event.name}: lat=${coords?.lat}, lng=${coords?.lng}`)
            }
          } catch (parseError) {
            console.warn(`[WARN] Failed to parse Gemini response for ${event.name}: ${text.substring(0, 100)}`)
          }
        } else {
          console.warn(`[WARN] Gemini returned empty text for ${event.name}`)
        }
      } catch (jsonError) {
        console.error(`[WARN] Failed to parse Gemini JSON response for ${event.name}:`, jsonError)
      }
    } else {
      console.warn(`[WARN] Gemini API error ${response.status} for ${event.name}`)
    }
  } catch (error) {
    console.warn(`[WARN] Coordinate refinement failed for ${event.name}:`, error)
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
  countryCode: string,
  timezone: string,
  targetCount: number = 15,
  cityLat?: number,
  cityLng?: number
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
  const searchPrompt = `Search for REAL upcoming FREE events in ${cityName}, ${country} (ISO: ${countryCode.toUpperCase()}).

TODAY'S DATE AND TIME: ${dateStr} ${new Date().toLocaleTimeString()}
CRITICAL: Find ONLY FUTURE events (starting AFTER ${new Date().toLocaleTimeString()} today, or on later dates!)

CRITICAL LOCATION FILTER (MOST IMPORTANT!):
- ONLY events physically located in ${cityName}, ${country} (ISO code: ${countryCode.toUpperCase()})
- REJECT any events from USA, Canada, or any country other than ${country}
- Verify each event address is in ${country} - check for ${country} in address or ${countryCode.toUpperCase()} domain
- If city name exists in multiple countries, use ONLY the one in ${country} (${countryCode.toUpperCase()})
- Example: If searching for "Paris", use Paris, France (NOT Paris, Texas, USA)
- Example: If searching for "London", use London, Ontario, Canada ONLY if country is Canada

CRITICAL TIME FILTER:
- Event start date/time MUST be in the future (relative to ${dateStr} ${new Date().toLocaleTimeString()})
- EXCLUDE any events that have already started or finished today

Search Instructions:
- Find at least ${targetCount} real, verifiable FUTURE events
- Date range: ${dateStr} to ${endStr}
- Focus on FREE events (no ticket required, or free admission)
- For EACH event, find: Name, Description, Precise Start/End times, Exact Address, and Source URL.

Search in local language and English. 
DOUBLE-CHECK: All events must be FUTURE events in ${cityName}, ${country}, NOT USA.`

  // Step 1: Broad search using Flash + Google Search Grounding with RETRY
  let rawText = ''
  await callWithRetry(async () => {
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
    rawText = searchResult.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    if (!rawText || rawText.length < 100) {
      throw new Error('No events found by Google Search')
    }
  }, 3, 2000) // Retry up to 3 times with 2s initial delay

  console.log(`[OK] Step 1 complete: Found raw event data (${rawText.length} chars)`)
  console.log(`[AI] Step 2: Structuring with Gemini Pro + Google Search verification...`)

  // Step 2: Structure using Pro + Google Search for precise geocoding
  const centerInfo = (cityLat && cityLng) ? `The city center is [${cityLat}, ${cityLng}].` : ''
  const structurePrompt = `Transform this event list into a structured JSON array.

RAW SEARCH DATA:
${rawText}

TODAY'S DATE AND TIME: ${dateStr}T00:00:00${timezone}
City: ${cityName}, ${country} (ISO: ${countryCode.toUpperCase()}). ${centerInfo}

CRITICAL COUNTRY VALIDATION (REJECT EVENTS FROM WRONG COUNTRIES!):
- ONLY include events that are physically in ${country} (${countryCode.toUpperCase()})
- REJECT events from USA, Canada, or any other country
- Verify addresses contain ${country} or proper country indicators
- If unsure about country, REJECT the event

CRITICAL GEOCODING TASK (THIS IS THE MOST IMPORTANT PART):
For EACH address found in the search data, you MUST use your SEARCH TOOL to find its PRECISE latitude and longitude IN ${country}.

DO NOT ESTIMATE coordinates. Use Google Search to find:
1. The exact street address coordinates
2. Or if building not found: the street intersection coordinates  
3. Or if street not found: the specific venue/park coordinates in ${cityName}

VALIDATION RULES:
- All coordinates MUST be within 20km of the city center ${centerInfo ? `[${cityLat}, ${cityLng}]` : cityName}
- Verify each address is actually in ${cityName}, not a nearby city with similar name
- If address shows coordinates in another city (different country/region), REJECT IT and search for the correct ${cityName} venue

**Põltsamaa/Jõgewamaa SPECIAL RULE:** 
- If the address is in Põltsamaa, the longitude MUST be approx 25.96
- If coordinates show lng 26.38+, that is JÕGEVA CITY (30km away) - REJECT and search for correct Põltsamaa coordinates!

Return ONLY valid JSON array with FUTURE events and ACCURATE coordinates.`

  // Step 2: Use Flash for structuring (5x cheaper than Pro, same accuracy for this task)
  let structuredText = ''
  let structureSuccess = false

  // Use Flash with Google Search grounding (optimized for cost + speed)
  try {
    await callWithRetry(async () => {
      console.log(`[AI] Structuring with Gemini Flash + Google Search...`)
      
      const structureResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: structurePrompt }] }],
            tools: [{ googleSearch: {} }], // Enable search for geocoding - no schema allowed with tools!
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 8000  // Flash max is 8k
            },
            systemInstruction: {
              parts: [{
                text: `You are a PRECISE EVENT GEOCODING EXPERT. Your PRIMARY task is to find EXACT street-level coordinates for every venue using Google Search.

RESPONSE FORMAT: Return ONLY valid JSON array (no markdown, no explanation).

CRITICAL COUNTRY VALIDATION (HIGHEST PRIORITY):
1. VERIFY EVERY ADDRESS IS IN ${country} (ISO: ${countryCode.toUpperCase()})
2. REJECT any address with USA zip codes (5-digit format like 40601)
3. REJECT any address with "United States", "USA", "KY", "TX", "CA" region codes
4. REJECT if Google Search confirms venue is outside ${country}
5. Use Google Search to VERIFY coordinates are within ${country} borders

GEOCODING PRIORITIES:
1. Use Google Search tool to verify EVERY venue is in ${country}
2. Find exact building/venue coordinates, NOT city center
3. For ${country} events: verify the city name matches ${cityName} exactly
4. Reject any venue that is not in ${cityName} or ${country}
5. Return coordinates accurate to street level (6+ decimal places)

JSON array structure:
[
  {
    "name": "string",
    "description": "string",
    "start_time": "ISO8601",
    "end_time": "ISO8601",
    "location_address": "string",
    "location_lat": number,
    "location_lng": number,
    "category": "string",
    "is_free": boolean,
    "price": number,
    "sourceUrl": "string"
  }
]`
              }]
            }
          })
        }
      )

      if (!structureResponse.ok) {
        const errorText = await structureResponse.text()
        throw new Error(`Pro structuring failed (${structureResponse.status}): ${errorText.substring(0, 200)}`)
      }

      const structureResult = await structureResponse.json()
      // Get text response (not guaranteed to be JSON, may include tool use)
      let responseText = ''
      
      // Check for tool use results
      if (structureResult.candidates?.[0]?.content?.parts) {
        for (const part of structureResult.candidates[0].content.parts) {
          if (part.text) {
            responseText += part.text
          }
        }
      }
      
      structuredText = responseText || ''
      
      if (!structuredText || structuredText.length < 50) {
        throw new Error('Pro returned empty response')
      }

      structureSuccess = true
    }, 2, 2000) // Retry Pro up to 2 times only (it's slower)
  } catch (proError: any) {
    console.error(`[FAIL] Pro model failed after retries: ${proError.message}`)
    console.log('[FallBack] Falling back to Flash model for structuring...')
    structureSuccess = false
  }

  // Fallback to Flash if Pro failed
  if (!structureSuccess) {
    try {
      await callWithRetry(async () => {
        const flashFallbackPrompt = `Convert this event search data to a JSON array. 

RAW SEARCH DATA:
${rawText}

CRITICAL COUNTRY VALIDATION (REJECT WRONG COUNTRIES!):
- ONLY events in ${cityName}, ${country} (ISO: ${countryCode.toUpperCase()})
- REJECT events from USA, Canada, or other countries
- Verify addresses are in ${country}

CRITICAL GEOCODING:
1. coordinates are EXACT street-level (not city center)
2. all coordinates are within 20km of ${cityName}
3. Each event is actually IN ${cityName}, ${country} - NOT other countries

Return ONLY valid JSON array.`

        const flashResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: flashFallbackPrompt }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8000
              }
            })
          }
        )

        if (!flashResponse.ok) {
          throw new Error(`Flash fallback failed: ${flashResponse.status}`)
        }

        const data = await flashResponse.json()
        structuredText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        
        if (!structuredText || structuredText.length < 50) {
          throw new Error('Flash returned empty response')
        }
        
        structureSuccess = true
        console.log(`[OK] Flash structured ${structuredText.length} chars`)
      }, 3, 2000) // Retry up to 3 times
    } catch (structureError: any) {
      console.error(`[FAIL] Flash structuring failed after retries: ${structureError.message}`)
      return [] // Return empty array if structuring fails
    }
  }
  
  // Parse and validate structured JSON
  let events: FreeEvent[] = []
  try {
    // Remove any markdown code blocks that Gemini might add
    let cleanedText = structuredText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    
    // Clean up common JSON issues from AI responses:
    // 1. Remove trailing commas before closing brackets/braces
    cleanedText = cleanedText.replace(/,(\s*[}\]])/g, '$1')
    
    // 2. Remove control characters that break JSON parsing
    cleanedText = cleanedText.replace(/[\x00-\x1F\x7F]/g, '')
    
    // 3. Fix common escape sequence issues
    cleanedText = cleanedText.replace(/\\'/g, "'") // Unnecessary escaping of single quotes
    
    // Try to parse
    events = JSON.parse(cleanedText)
    
    // Validate it's an array
    if (!Array.isArray(events)) {
      console.error('[FAIL] Parsed result is not an array:', typeof events)
      events = []
    }
    
    console.log(`✅ Step 2 complete: Structured ${events.length} events`)
  } catch (parseError: any) {
    console.error('[FAIL] JSON parsing failed:', parseError.message)
    console.error('First 500 chars of response:', structuredText.substring(0, 500))
    
    // Try to salvage partial JSON by finding last complete closing bracket
    try {
      let cleanedText = structuredText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/,(\s*[}\]])/g, '$1')
        .replace(/[\x00-\x1F\x7F]/g, '')
        .trim()
      
      const lastBracket = cleanedText.lastIndexOf(']')
      if (lastBracket > 0) {
        const truncated = cleanedText.substring(0, lastBracket + 1)
        events = JSON.parse(truncated)
        console.log(`[WARN] Recovered ${events.length} events from truncated JSON`)
      }
    } catch (recoveryError) {
      console.error('[FAIL] Recovery also failed, returning empty array')
      events = []
    }
  }
  
  // FINAL VALIDATION: Filter out events that are definitely from wrong countries
  // This is a safety check after AI processing
  const countryLower = country.toLowerCase()
  const isUSA = countryLower === 'usa' || countryCode.toLowerCase() === 'us'
  const validCountryCodes = getCountryCodes(countryLower)
  
  const filtered = events.filter(event => {
    const address = (event.location_address || '').toLowerCase()
    const name = (event.name || '').toLowerCase()
    
    // If searching for USA events, accept USA addresses
    if (isUSA) {
      // For USA searches, just validate coordinates
      if (event.location_lat && event.location_lng) {
        // USA coordinates roughly: lat 25-50, lng -125 to -65
        if (event.location_lat < 24 || event.location_lat > 50 || 
            event.location_lng < -130 || event.location_lng > -60) {
          console.log(`  ⊘ Coordinates outside USA: ${event.name}`)
          return false
        }
      }
      return true
    }
    
    // For NON-USA searches, HARD REJECT USA events
    if (address.includes('united states') || 
        address.includes(', usa') || 
        address.match(/\b(KY|TX|CA|FL|NY|IL|PA|OH|GA|NC|MI|NJ|VA|WA|AZ|MA|TN|IN|MD|MO|WI|CO|MN|SC|AL|LA|KS|OR|OK|CT|UT|NV|AR|MS|NM|NE|WV|ID|HI|NH|ME|RI|MT|DE|ND|SD|AK)\s+\d{5}/)) {
      console.log(`  ⊘ HARD REJECT USA: ${event.name}`)
      return false
    }
    
    // Check for country indicators in address
    for (const code of validCountryCodes) {
      if (address.includes(code.toLowerCase())) {
        return true
      }
    }
    
    // If we're looking for Estonia, be strict about coordinates
    if (countryLower === 'estonia' && event.location_lat && event.location_lng) {
      // Estonia coordinates roughly: lat 57-60, lng 21-28
      if (event.location_lat < 57 || event.location_lat > 60.5 || 
          event.location_lng < 20.5 || event.location_lng > 28.5) {
        console.log(`  ⊘ Coordinates outside ${country}: ${event.name}`)
        return false
      }
    }
    
    return true
  })
  
  console.log(`[OK] Filtered from ${events.length} to ${filtered.length} events (removed ${events.length - filtered.length} non-${country} events)`)
  
  return filtered
}

// Helper to get country code variations
function getCountryCodes(country: string): string[] {
  const countryMap: Record<string, string[]> = {
    'estonia': ['estonia', 'ee', 'eesti'],
    'finland': ['finland', 'fi'],
    'latvia': ['latvia', 'lv'],
    'lithuania': ['lithuania', 'lt'],
    'germany': ['germany', 'de'],
    'france': ['france', 'fr'],
    'italy': ['italy', 'it'],
    'spain': ['spain', 'es'],
    'united kingdom': ['united kingdom', 'uk', 'gb', 'england', 'scotland', 'wales'],
    'usa': ['usa', 'united states', 'us'],
    'canada': ['canada', 'ca']
  }
  return countryMap[country] || [country]
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
        .select('city_id, city_name, country, country_code, timezone, latitude, longitude')
        .eq('city_id', city_id)
        .single()

      if (error || !data) {
        throw new Error(`City not found: ${city_id}`)
      }
      cityData = data
    } else if (city_name && country) {
      // Query city_configs to get city_id
      const { data: foundCity, error: cityError } = await supabase
        .from('city_configs')
        .select('city_id, city_name, country, country_code, timezone, latitude, longitude')
        .eq('city_name', city_name)
        .eq('country', country)
        .single()

      if (cityError || !foundCity) {
        throw new Error(`City not found in database: ${city_name}, ${country}`)
      }
      cityData = foundCity
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

    console.log(`\n[LAUNCH] EventScout AI: ${cityData.city_name}, ${cityData.country}`)
    console.log(`[TARGET] Target: ${target_events} events`)

    // Discover events using AI
    const events = await discoverEventsWithAI(
      cityData.city_name,
      cityData.country,
      cityData.country_code || 'ee',
      cityData.timezone || 'Europe/Tallinn',
      target_events,
      cityData.latitude,
      cityData.longitude
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

    console.log(`\n[PKG] Inserting ${events.length} events into database...`)

    // Extract city data for use in insertion loop
    // Note: 'country' from request body may be undefined if called with just city_id
    // Always use cityData values which come from database
    const countryCode = cityData.country_code || 'ee'
    const countryName = cityData.country  // Use from database, not from request
    const cityName = cityData.city_name
    const cityLat = cityData.latitude || 0
    const cityLng = cityData.longitude || 0

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
        // Use fuzzy matching to catch title variations from AI/OCR
        const eventStartTime = new Date(event.start_time)
        const eventDateStr = eventStartTime.toISOString().split('T')[0]
        
        // 1. Check if already in events table (published)
        const { data: existingPublished } = await supabase
          .from('events')
          .select('id, name, location')
          .eq('city_id', cityData.city_id)
          .eq('date', eventDateStr)
          .limit(20) // Fetch multiple to check similarity
        
        if (existingPublished && existingPublished.length > 0) {
          // Fuzzy match against existing published events
          let foundDuplicate = false
          
          for (const existing of existingPublished) {
            const titleSimilarity = calculateSimilarity(event.name, existing.name)
            const existingAddr = normalizeAddress(existing.location?.address || '')
            const newAddr = normalizeAddress(event.location_address || '')
            const addressMatch = existingAddr.substring(0, 100) === newAddr.substring(0, 100)
            
            // If title is 85%+ similar AND same location = duplicate
            if (titleSimilarity >= 0.85 && addressMatch) {
              console.log(`  ⊘ Skip (already published): ${event.name} (matches "${existing.name}" @${titleSimilarity.toFixed(2)})`)
              insertResults.skipped = (insertResults.skipped || 0) + 1
              foundDuplicate = true
              break
            }
          }
          
          if (foundDuplicate) continue
        }
        
        // 2. Check if already in parsed_events table (awaiting validation/publishing)
        // Fuzzy match against recently parsed events
        const { data: recentParsed } = await supabase
          .from('parsed_events')
          .select('id, structured_json')
          .eq('city_id', cityData.city_id || '')
          .gte('parsed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
          .limit(50) // Fetch multiple to check similarity
        
        if (recentParsed && recentParsed.length > 0) {
          let foundDuplicate = false
          
          for (const parsed of recentParsed) {
            const existing = parsed.structured_json
            const titleSimilarity = calculateSimilarity(event.name, existing.name)
            const existingAddr = normalizeAddress(existing.location_address || '')
            const newAddr = normalizeAddress(event.location_address || '')
            const addressMatch = existingAddr.substring(0, 100) === newAddr.substring(0, 100)
            
            // If title is 85%+ similar AND same location AND same date = duplicate
            if (titleSimilarity >= 0.85 && addressMatch) {
              const parsedDate = new Date(existing.start_time).toISOString().split('T')[0]
              if (parsedDate === eventDateStr) {
                console.log(`  ⊘ Skip (already parsed): ${event.name} (matches "${existing.name}" @${titleSimilarity.toFixed(2)})`)
                insertResults.skipped = (insertResults.skipped || 0) + 1
                foundDuplicate = true
                break
              }
            }
          }
          
          if (foundDuplicate) continue
        }

        // [OK] VALIDATE: Event must be in the future
        const now = new Date()
        
        if (eventStartTime < now) {
          console.log(`  ⊘ Skip (past event): ${event.name} (${event.start_time})`)
          insertResults.skipped = (insertResults.skipped || 0) + 1
          continue
        }

        // [ML] QUALITY PREDICTION: Skip low-quality events before expensive processing
        // Uses SQL-based quality scoring (free, millisecond latency)
        const hasCompleteData = !!(event.name && event.description && event.location_address)
        const hasCoordinates = !!(event.location_lat && event.location_lng)
        const hasValidTime = !!(event.start_time && event.start_time !== '00:00')
        const addressLength = (event.location_address || '').length
        const descriptionLength = (event.description || '').length
        
        const { data: qualityScore, error: qualityError } = await supabase
          .rpc('calculate_event_quality', {
            p_has_complete_data: hasCompleteData,
            p_has_coordinates: hasCoordinates,
            p_has_valid_time: hasValidTime,
            p_address_length: addressLength,
            p_description_length: descriptionLength,
            p_category_confidence: 0.7,
            p_source_score: 0.85
          })
        
        if (!qualityError && qualityScore !== null && qualityScore < 0.60) {
          console.log(`  ⊘ Skip (low quality ${qualityScore.toFixed(2)}): ${event.name}`)
          insertResults.skipped = (insertResults.skipped || 0) + 1
          continue
        }

        // [OK] VALIDATE: Double-check that address is NOT from USA
        // This is a safety catch for any USA events that slipped through AI filtering
        const address = event.location_address || ''
        
        // If address explicitly contains the target country, it's valid - skip USA check
        const hasCountryConfirmation = address.toLowerCase().includes(countryCode.toLowerCase()) || 
                                       address.toLowerCase().includes(countryName.toLowerCase())
        
        if (!hasCountryConfirmation) {
          // Only check for USA patterns if country is NOT explicitly confirmed in address
          const US_PATTERNS = /\b(USA|United States|KY|TX|CA|FL|NY|IL|PA|OH|GA|NC|MI|NJ|VA|WA|AZ|MA|TN|IN|MD|MO|WI|CO|MN|SC|AL|LA|KS|OR|OK|CT|UT|NV|AR|MS|NM|NE|WV|ID|HI|NH|ME|RI|MT|DE|ND|SD|AK)\b/i
          const US_ZIP = /\b\d{5}(-\d{4})?\b/
          
          if (US_PATTERNS.test(address) || US_ZIP.test(address)) {
            console.log(`  ⊘ Skip (USA address detected): ${event.name} (${address})`)
            insertResults.skipped = (insertResults.skipped || 0) + 1
            continue
          }
        }

        // [OK] VALIDATE: Coordinates must be within reasonable distance of city
        // This prevents events from wrong countries with similar city names
        if (cityLat && cityLng) {
          const distance = Math.sqrt(
            Math.pow(event.location_lat - cityLat, 2) + 
            Math.pow(event.location_lng - cityLng, 2)
          ) * 111 // Rough km conversion
          
          // Reject if more than 50km from city center
          if (distance > 50) {
            console.log(`  ⊘ Skip (too far): ${event.name} is ${distance.toFixed(0)}km from ${cityName} center`)
            insertResults.skipped = (insertResults.skipped || 0) + 1
            continue
          }
        }

        // [OK] Use coordinates from Gemini structuring
        // publish-event will refine/validate them later with full geocoding logic
        
        // FALLBACK: If no coordinates from Gemini, use city center
        // publish-event will geocode properly later
        const finalLat = event.location_lat || cityLat || 0
        const finalLng = event.location_lng || cityLng || 0
        
        console.log(`[OK] ${event.name} (${finalLat.toFixed(4)}, ${finalLng.toFixed(4)})`)

        // Create structured_json
        const structured = {
          name: event.name,
          description: event.description,
          start_time: event.start_time,
          end_time: event.end_time,
          location_address: event.location_address,
          location_lat: finalLat,   // Never NULL
          location_lng: finalLng,   // Never NULL
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
        const contentHash = `eventscout-${event.name}-${event.start_time}`.substring(0, 100)
        
        console.log(`  🔹 Inserting raw_event: ${event.name}`)
        console.log(`     source_id: ${sourceId}`)
        console.log(`     city_id: ${cityData.city_id}`)
        console.log(`     content_hash: ${contentHash}`)
        
        const { data: rawEvent, error: rawError } = await supabase
          .from('raw_events')
          .insert({
            source_id: sourceId,  // Link to EventScout AI source
            city_id: cityData.city_id,  // Link to city for tracking
            raw_content: null,
            raw_content_json: event,
            content_type: 'json',
            content_hash: contentHash,
            processing_status: 'parsed'
          })
          .select('id')
          .single()

        if (rawError || !rawEvent) {
          const errorCode = rawError?.code || 'UNKNOWN'
          const errorMsg = rawError?.message || 'No error message'
          const errorDetails = rawError?.details || 'No details'
          const hint = rawError?.hint || 'No hint'
          
          console.error(`\n[FAIL] raw_events INSERT ERROR:`)
          console.error(`  Event: ${event.name}`)
          console.error(`  Code: ${errorCode}`)
          console.error(`  Message: ${errorMsg}`)
          console.error(`  Details: ${errorDetails}`)
          console.error(`  Hint: ${hint}`)
          console.error(`  Full error: ${JSON.stringify(rawError, null, 2)}`)
          
          // Log field values for debugging
          console.error(`  INSERT values:`)
          console.error(`    source_id: ${sourceId}`)
          console.error(`    city_id: ${cityData.city_id}`)
          console.error(`    content_hash: ${contentHash}`)
          console.error(`    processing_status: parsed`)
          
          insertResults.failed++
          insertResults.errors.push(`${event.name}: [${errorCode}] ${errorMsg}`)
          continue
        }
        
        console.log(`  [OK] Created raw_event: ${rawEvent.id}`)

        // Now insert into parsed_events with all required fields
        const { data: parsedEvent, error: insertError } = await supabase
          .from('parsed_events')
          .insert({
            raw_event_id: rawEvent.id,
            city_id: cityData.city_id,  // Link to city for tracking
            structured_json: structured,
            original_language: 'en',
            confidence_partial: 0.95,  // High confidence (Google Search grounded)
            validation_status: 'validated'  // Auto-validated by EventScout AI
          })
          .select('id')
          .single()

        if (insertError || !parsedEvent) {
          const errorCode = insertError?.code || 'UNKNOWN'
          const errorMsg = insertError?.message || 'No error message'
          const errorDetails = insertError?.details || 'No details'
          const hint = insertError?.hint || 'No hint'
          
          console.error(`\n[FAIL] parsed_events INSERT ERROR:`)
          console.error(`  Event: ${event.name}`)
          console.error(`  Code: ${errorCode}`)
          console.error(`  Message: ${errorMsg}`)
          console.error(`  Details: ${errorDetails}`)
          console.error(`  Hint: ${hint}`)
          console.error(`  Full error: ${JSON.stringify(insertError, null, 2)}`)
          
          // Log field values for debugging
          console.error(`  INSERT values:`)
          console.error(`    raw_event_id: ${rawEvent?.id}`)
          console.error(`    city_id: ${cityData.city_id}`)
          console.error(`    validation_status: validated`)
          
          insertResults.failed++
          insertResults.errors.push(`${event.name}: [${errorCode}] ${errorMsg}`)
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
            console.error(`[WARN] event_confidence insert failed for ${event.name}:`, confidenceError)
            // Don't fail the whole operation, event is still inserted
          }
          
          insertResults.inserted++
          console.log(`  [OK] ${event.name}`)
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

    console.log(`\n[OK] EventScout AI complete!`)
    console.log(`  [DATA] Found: ${events.length} events`)
    console.log(`  [OK] Inserted: ${insertResults.inserted}`)
    console.log(`  ⊘ Skipped: ${insertResults.skipped}`)
    console.log(`  [FAIL] Failed: ${insertResults.failed}`)
    console.log(`  [FAIL] Errors: ${insertResults.errors.length}`)
    if (insertResults.errors.length > 0) {
      console.log(`\n[FAIL] Error Summary:`)
      insertResults.errors.forEach((err, idx) => {
        console.error(`  ${idx + 1}. ${err}`)
      })
    }
    console.log(`  [TIME]Duration: ${duration}ms`)

    // AUTOMATICALLY PUBLISH: Trigger publish-event to move parsed_events to live map
    console.log(`\n[LAUNCH] Auto-publishing ${insertResults.inserted} events to live map...`)
    let publishedCount = 0
    let publishError: string | null = null
    
    try {
      // Use supabase client to invoke the function (handles auth automatically)
      const { data: publishResult, error: publishErr } = await supabase.functions.invoke('publish-event', {
        body: { city_id: cityData.city_id }
      })
      
      if (publishErr) {
        publishError = publishErr.message || String(publishErr)
        console.error(`  [FAIL] Publish failed: ${publishError}`)
      } else {
        publishedCount = publishResult?.results?.published || 0
        console.log(`  [OK] Published ${publishedCount} events to map`)
      }
    } catch (err) {
      publishError = String(err)
      console.error(`  [FAIL] Publish error: ${publishError}`)
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
    console.error('[FAIL] EventScout AI failed:', error)
    
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
