// AI Agent: Event Publishing Service
// Publishes validated events to the Live Map

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { log } from '../_shared/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_API_KEY = Deno.env.get('API_KEY') || Deno.env.get('GEMINI_API_KEY')
const GEMINI_MODELS = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-3-flash'
] as const
let currentModelIndex = 0

// 📍 Address-to-coordinates cache (per execution)
// Ensures same venue always gets same coordinates within a single batch publish
const addressCache = new Map<string, {lat: number, lng: number}>()

// 💾 Persistent geocode cache using Supabase
// Checks database first before calling geocoding APIs
async function getGeocodeFromPersistentCache(
  supabaseClient: any,
  address: string,
  country: string
): Promise<{lat: number, lng: number} | null> {
  try {
    const cacheKey = getAddressCacheKey(address, country)
    
    // Check database cache (valid for 30 days)
    const { data, error } = await supabaseClient
      .from('geocode_cache')
      .select('latitude, longitude, cached_at')
      .eq('address_hash', cacheKey)
      .gte('cached_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .single()
    
    if (!error && data) {
      console.log(`💾 DB cache hit: "${address}" → ${data.latitude}, ${data.longitude}`)
      return { lat: data.latitude, lng: data.longitude }
    }
  } catch (e) {
    // Cache miss or error - not critical
  }
  return null
}

// 💾 Save geocode result to persistent cache
async function saveGeocodeToPersistentCache(
  supabaseClient: any,
  address: string,
  country: string,
  lat: number,
  lng: number
): Promise<void> {
  try {
    const cacheKey = getAddressCacheKey(address, country)
    
    await supabaseClient
      .from('geocode_cache')
      .upsert({
        address_hash: cacheKey,
        address: address.substring(0, 500), // Store original for reference
        country,
        latitude: lat,
        longitude: lng,
        cached_at: new Date().toISOString()
      }, {
        onConflict: 'address_hash'
      })
    
    console.log(`💾 Cached: "${address}" → ${lat}, ${lng}`)
  } catch (e) {
    // Cache save failure is not critical
    console.warn(`⚠️ Failed to save geocode cache:`, e)
  }
}

// Generate cache key from address (normalize for consistency)
function getAddressCacheKey(address: string, country: string): string {
  return `${address.toLowerCase().trim()}|${country.toLowerCase().trim()}`
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

// Normalize title for comparison (remove extra spaces, punctuation, etc.)
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\sáéíóúäöõ]/g, '') // Keep Estonian characters
    .replace(/\s+/g, ' ') // Collapse multiple spaces
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

// Upload base64 image to Supabase Storage and return public URL
async function uploadImageToStorage(
  supabaseClient: any,
  base64Data: string,
  eventId: string
): Promise<string | null> {
  try {
    // Remove data:image/png;base64, prefix if present
    const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '')
    
    // Convert base64 to Uint8Array
    const binaryString = atob(base64Clean)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    // Generate filename
    const filename = `events/${eventId}-${Date.now()}.png`
    
    // Upload to Supabase Storage
    const { data, error } = await supabaseClient.storage
      .from('event-images')
      .upload(filename, bytes, {
        contentType: 'image/png',
        upsert: false
      })
    
    if (error) {
      console.error('Storage upload error:', error)
      return null
    }
    
    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('event-images')
      .getPublicUrl(filename)
    
    return urlData.publicUrl
  } catch (error) {
    console.error('Failed to upload image to storage:', error)
    return null
  }
}

// Gemini geocoding for precise coordinates
async function geocodeWithGemini(
  address: string, 
  country: string, 
  cityName?: string,
  cityLat?: number,
  cityLng?: number
): Promise<{lat: number, lng: number} | null> {
  try {
    if (!GEMINI_API_KEY) return null

    const centerInfo = (cityLat && cityLng) ? `The city center is [${cityLat}, ${cityLng}].` : ''
    const prompt = `You are a geocoding expert. Find the EXACT latitude and longitude for this specific venue:

Address: ${address}
City: ${cityName || 'Unknown'}
Country: ${country}
${centerInfo}

CRITICAL: 
1. Use exact venue coordinates, NOT city center or street center. 
2. All coordinates MUST be within 20km of the center ${centerInfo ? `[${cityLat}, ${cityLng}]` : cityName}. 
3. **Põltsamaa/Jõgewamaa RULE:** If the address is in Põltsamaa, the longitude MUST be approx 25.96. If it is 26.38+, it is in Jõgeva city, which is 30km away - DO NOT geocode Põltsamaa events to Jõgeva!
4. Be extremely precise with street-level accuracy.

Respond with ONLY JSON on ONE line:
{"lat": 58.1234, "lng": 25.5678}`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ googleSearch: {} }], // Enable search for geocoding accuracy
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          }
        })
      }
    )

    if (!response.ok) return null

    const data = await response.json()
    
    // Defensive checks for response structure
    if (!data || !data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
      console.warn(`⚠️ Gemini returned empty candidates for: ${address}`)
      return null
    }
    
    const candidate = data.candidates[0]
    if (!candidate || !candidate.content || !candidate.content.parts || !Array.isArray(candidate.content.parts) || candidate.content.parts.length === 0) {
      console.warn(`⚠️ Gemini returned invalid structure for: ${address}`)
      return null
    }
    
    const text = candidate.content.parts[0]?.text || ''
    
    if (text.trim() === 'null' || !text) return null
    
    const coords = JSON.parse(text.trim())
    if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number' &&
        coords.lat >= -90 && coords.lat <= 90 && coords.lng >= -180 && coords.lng <= 180) {
      console.log(`✓ Gemini geocoded: "${address}" → ${coords.lat}, ${coords.lng}`)
      return coords
    }
  } catch (error) {
    console.warn(`Gemini geocoding error:`, error)
  }
  return null
}

// Nominatim geocoding fallback for addresses without coordinates
async function geocodeAddress(
  address: string, 
  country: string, 
  countryCode: string, 
  cityName?: string,
  cityLat?: number,
  cityLng?: number,
  supabaseClient?: any
): Promise<{lat: number, lng: number} | null> {
  try {
    // 📍 CHECK CACHE FIRST (in-memory)
    const cacheKey = getAddressCacheKey(address, country)
    if (addressCache.has(cacheKey)) {
      const cached = addressCache.get(cacheKey)!
      console.log(`💾 Memory cache hit: "${address}" → ${cached.lat.toFixed(6)}, ${cached.lng.toFixed(6)}`)
      return cached
    }
    
    // 💾 CHECK PERSISTENT CACHE (database)
    if (supabaseClient) {
      const dbCached = await getGeocodeFromPersistentCache(supabaseClient, address, country)
      if (dbCached) {
        // Store in memory cache too for this execution
        addressCache.set(cacheKey, dbCached)
        return dbCached
      }
    }
    
    // 🔧 ENHANCED: Prepare MANY search variations (8+ strategies)
    const searchVariations: string[] = []
    
    // Parse address components
    const parts = address.split(',').map(p => p.trim())
    const venueName = parts[0] || ''
    const cityNameFromAddress = cityName || parts[parts.length - 1]?.trim() || parts[1]?.trim() || ''
    
    const lowerAddress = address.toLowerCase()
    const lowerCountry = country.toLowerCase()
    
    // Helper: Add country only if not already present
    const addCountry = (str: string) => {
      return str.toLowerCase().includes(lowerCountry) ? str : `${str}, ${country}`
    }
    
    // 1. Full address with country (if not present)
    searchVariations.push(addCountry(address))
    
    // 2. Venue name + city + country (most specific)
    if (venueName && cityNameFromAddress && venueName !== cityNameFromAddress) {
      searchVariations.push(addCountry(`${venueName}, ${cityNameFromAddress}`))
    }
    
    // 3. Venue name only + country (for institutional names)
    if (venueName && venueName !== address) {
      searchVariations.push(addCountry(venueName))
    }
    
    // 4. Remove building/room numbers (e.g., "Room 123" → venue name only)
    const cleanVenue = venueName.replace(/\b(room|suite|floor|bldg|building|apt|#)\s*\d+\w*/gi, '').trim()
    if (cleanVenue && cleanVenue !== venueName && cleanVenue.length > 3) {
      searchVariations.push(addCountry(cleanVenue))
    }
    
    // 5. City + venue (reversed order - sometimes works better)
    if (cityNameFromAddress && venueName && cityNameFromAddress !== venueName) {
      searchVariations.push(addCountry(`${cityNameFromAddress}, ${venueName}`))
    }
    
    // 6. Just venue name + city (no country - sometimes helps)
    if (venueName && cityNameFromAddress && venueName !== cityNameFromAddress) {
      searchVariations.push(`${venueName}, ${cityNameFromAddress}`)
    }
    
    // 7. Remove special characters that might confuse geocoder
    const cleanAddress = address.replace(/[()[\]]/g, '').replace(/\s+/g, ' ').trim()
    if (cleanAddress !== address) {
      searchVariations.push(addCountry(cleanAddress))
    }
    
    // 8. If address contains street number, try without it
    const addressWithoutNumber = address.replace(/\b\d+\w*\b/g, '').replace(/\s+/g, ' ').trim()
    if (addressWithoutNumber !== address && addressWithoutNumber.length > 5) {
      searchVariations.push(addCountry(addressWithoutNumber))
    }
    
    // 9. Extract street address if venue name + street present (e.g., "Web Bar, Sint Jacobsstraat 6")
    if (parts.length >= 2 && /\d/.test(parts[1])) {
      // parts[1] likely contains street + number
      const streetAddress = parts.slice(1).join(', ').trim()
      if (streetAddress.length > 5 && streetAddress !== address) {
        searchVariations.push(addCountry(streetAddress))
      }
    }
    
    // Remove duplicates while preserving order
    const uniqueVariations = [...new Set(searchVariations)]
    
    console.log(`🔍 Geocoding with ${uniqueVariations.length} strategies: "${address}"`)
    
    // Try each search variation
    for (const searchAddress of uniqueVariations) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1&countrycodes=${countryCode}`,
          {
            headers: {
              'User-Agent': 'EventNexus/1.0 (https://www.eventnexus.eu)',
              'Accept-Language': 'et,en'
            }
          }
        )

        if (!response.ok) {
          console.error(`❌ Nominatim API error ${response.status}`)
          continue // Try next variation
        }

        const data = await response.json()
        
        if (data && data.length > 0) {
          const result = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          }
          
          // VALIDATE RESULT: Must be within 30km of city center if provided
          if (cityLat && cityLng) {
            const R = 6371
            const dLat = (result.lat - cityLat) * Math.PI / 180
            const dLng = (result.lng - cityLng) * Math.PI / 180
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(cityLat * Math.PI / 180) * Math.cos(result.lat * Math.PI / 180) *
                      Math.sin(dLng/2) * Math.sin(dLng/2)
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
            const distance = R * c
            
            if (distance > 30) {
              console.warn(`⚠️ Nominatim result too far (${distance.toFixed(1)}km) for variation: "${searchAddress}"`)
              continue
            }
          }

          console.log(`✓ Geocoded via Nominatim: "${address}" → ${result.lat.toFixed(6)}, ${result.lng.toFixed(6)} (variation: "${searchAddress}")`)
          
          // 📍 CACHE THE RESULT (memory + database)
          addressCache.set(cacheKey, result)
          if (supabaseClient) {
            await saveGeocodeToPersistentCache(supabaseClient, address, country, result.lat, result.lng)
          }
          
          return result
        }
        
        // Wait before trying next variation (respect rate limit)
        if (uniqueVariations.indexOf(searchAddress) < uniqueVariations.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1100))
        }
      } catch (fetchError) {
        console.warn(`⚠️ Network error for "${searchAddress}": ${fetchError.message}`)
        // Continue to next variation on network error
        continue
      }
    }
    
    console.warn(`❌ All ${uniqueVariations.length} Nominatim strategies failed, falling back to Gemini...`)
    
    // Try Gemini as fallback if Nominatim fails
    const geminiCoords = await geocodeWithGemini(address, country, cityName, cityLat, cityLng)
    if (geminiCoords) {
      console.log(`✓ Geocoded via Gemini fallback: "${address}" → ${geminiCoords.lat.toFixed(6)}, ${geminiCoords.lng.toFixed(6)}`)
      // 📍 CACHE THE RESULT (memory + database)
      addressCache.set(cacheKey, geminiCoords)
      if (supabaseClient) {
        await saveGeocodeToPersistentCache(supabaseClient, address, country, geminiCoords.lat, geminiCoords.lng)
      }
      return geminiCoords
    }
    
    return null
  } catch (error) {
    console.error(`Geocoding error for "${address}":`, error)
    return null
  }
}

// Fallback: Get city center coordinates
async function getCityCenterCoordinates(supabaseClient: any, cityId: string): Promise<{ lat: number, lng: number } | null> {
  try {
    const { data: cityData } = await supabaseClient
      .from('supported_cities')
      .select('location_point')
      .eq('city_id', cityId)
      .single()
    
    if (cityData?.location_point) {
      const match = cityData.location_point.match(/POINT\(([^ ]+) ([^ ]+)\)/)
      if (match) {
        return { lat: parseFloat(match[2]), lng: parseFloat(match[1]) }
      }
    }
    return null
  } catch (error) {
    console.error('Failed to get city center:', error)
    return null
  }
}

// Gemini API image generation (matches geminiService.ts logic)
// NOTE: Currently PAUSED in AI pipeline to reduce costs (see line ~756)
// Function remains available for manual frontend usage via geminiService.ts
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

    // Get city_id from request body if provided
    let cityId: string | null = null
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        cityId = body.city_id || null
      } catch {
        // No body or invalid JSON - will fetch all validated events
      }
    }

    // Build query for validated parsed events ready for publishing
    // EventScout AI auto-validates with 93% confidence
    console.log('Fetching validated parsed events for publishing...')
    
    // Build query with optional city_id filter
    let query = supabaseClient
      .from('parsed_events')
      .select('*')
    
    // Filter by city_id if provided
    if (cityId) {
      console.log(`🎯 Filtering parsed_events for city: ${cityId}`)
      query = query.eq('city_id', cityId)
    }
    
    const { data: parsedEventsRaw, error: parsedError } = await query.limit(100)

    if (parsedError) {
      console.error('Query error:', parsedError)
      throw parsedError
    }

    console.log(`Found ${parsedEventsRaw?.length || 0} parsed events${cityId ? ` for city ${cityId}` : ''}`)
    
    // Get list of already-published parsed_events to avoid re-publishing
    const { data: publishedConfidence } = await supabaseClient
      .from('event_confidence')
      .select('parsed_event_id')
      .not('event_id', 'is', null)
      .limit(5000) // Get all published references
    
    const publishedIds = new Set(publishedConfidence?.map(c => c.parsed_event_id) || [])
    console.log(`Already published: ${publishedIds.size} events`)
    
    // Filter events that are ready for publishing (have not been published yet)
    let filteredEvents = (parsedEventsRaw || [])
      .filter(event => {
        // Only include events with structured data
        if (!event.structured_json) return false
        // Skip if already published
        if (publishedIds.has(event.id)) return false
        return true
      })
      .slice(0, 20) // Limit to 20 per batch
    
    console.log(`Filtered to ${filteredEvents.length} events ready for publishing (${parsedEventsRaw?.length || 0} total, ${publishedIds.size} already published)`)
    
    console.log(`📊 Found ${filteredEvents.length} validated events ready for publishing`)

    const results = {
      published: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    }

    // Track coordinates to only jitter when multiple events would stack
    const seenCoordinates = new Set<string>()

    // Process events ONE AT A TIME to ensure reliability
    // Each event: AI image generation (3-8s) + geocoding (1-2s) + DB insert (1s)
    // Total per event: ~5-10s. Edge Function timeout: 60s. 
    // Therefore: process sequentially to avoid timeouts and server overload
    const BATCH_SIZE = 1;  // ONE event at a time for maximum reliability
    const BATCH_DELAY_MS = 1000; // Reduced to 1 second to prevent Edge Function timeouts
    
    console.log(`📦 Processing ${filteredEvents.length} events in batches of ${BATCH_SIZE}`);
    
    for (let batchStart = 0; batchStart < filteredEvents.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, filteredEvents.length);
      const batch = filteredEvents.slice(batchStart, batchEnd);
      const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(filteredEvents.length / BATCH_SIZE);
      
      console.log(`\n📦 Batch ${batchNum}/${totalBatches}: Processing events ${batchStart + 1}-${batchEnd}`);
      
      // Process events in this batch sequentially (not parallel)
      for (const parsedEvent of batch) {
      try {
        const eventData = parsedEvent.structured_json
        
        // Get city_id: either from request parameter or from event data
        // EventScout AI doesn't store city_id in raw_events, we use the request parameter
        let eventCityId = cityId || eventData.city_id || null
        
        // If city_id not provided, extract from event location and lookup in city_configs
        if (!eventCityId && eventData.location_address) {
          console.log(`🔍 Determining city_id from location: ${eventData.location_address}`)
          
          // Extract city name from address (last part before country)
          // Format typically: "Address, City, Country" or "Venue, City, State, Country"
          const addressParts = eventData.location_address.split(',').map(p => p.trim())
          const countryPart = addressParts[addressParts.length - 1] // Last part is usually country
          let cityNameToSearch = addressParts.length > 1 ? addressParts[addressParts.length - 2] : addressParts[0]
          
          // Try to find matching city in city_configs (case-insensitive)
          const { data: matchedCities, error: lookupError } = await supabaseClient
            .from('city_configs')
            .select('city_id, city_name, country')
            .ilike('city_name', `%${cityNameToSearch}%`)
            .limit(5)
          
          if (!lookupError && matchedCities && matchedCities.length > 0) {
            // If multiple matches, try to match country too
            let selectedCity = matchedCities[0]
            if (matchedCities.length > 1 && eventData.country) {
              const countryMatch = matchedCities.find(c => 
                c.country.toLowerCase().includes(eventData.country.toLowerCase()) ||
                eventData.country.toLowerCase().includes(c.country.toLowerCase())
              )
              if (countryMatch) selectedCity = countryMatch
            }
            eventCityId = selectedCity.city_id
            console.log(`✓ Matched event to city: ${selectedCity.city_name} (${selectedCity.country})`)
          } else {
            console.warn(`⚠️ Could not determine city from location: ${eventData.location_address}`)
          }
        }
        
        if (!eventCityId) {
          console.error(`❌ No city_id available for event: ${eventData.name}`)
          results.failed++
          continue
        }
        
        // Get confidence score from event_confidence table
        let confidenceScore = 0
        const { data: confidenceData } = await supabaseClient
          .from('event_confidence')
          .select('final_score')
          .eq('parsed_event_id', parsedEvent.id)
          .single()
        
        if (confidenceData) {
          confidenceScore = confidenceData.final_score || 0
        }
        console.log(`📊 Event confidence: ${confidenceScore}%`)

        // Fetch city config for geocoding
        let cityConfig;
        const { data: cityConfigData, error: cityError } = await supabaseClient
          .from('city_configs')
          .select('city_name, country, country_code, latitude, longitude')
          .eq('city_id', eventCityId)
          .single()

        if (cityError || !cityConfigData) {
          console.error(`❌ Failed to load city config for ${cityId}:`, cityError)
          // Fallback to default values
          cityConfig = {
            city_name: 'Unknown',
            country: 'Estonia',
            country_code: 'ee'
          }
        } else {
          cityConfig = cityConfigData
        }

        console.log(`Publishing event for ${cityConfig.city_name}, ${cityConfig.country}`)

        // Get address for validation
        const address = eventData.location_address || ''

        // SKIP PLACEHOLDER ADDRESSES - Gemini sometimes generates fake addresses
        const PLACEHOLDER_PATTERNS = /\b(Venue Name|Street Address|City Name|TBD|To Be Determined|Various [Ll]ocations)\b/i
        if (PLACEHOLDER_PATTERNS.test(address)) {
          console.log(`⊘ Skipping event with placeholder address: ${eventData.name} (${address})`)
          await log(supabaseClient, 'publish-event', 'info', 'Skipped placeholder address', { event: eventData.name, address }, { city_id: eventCityId })
          results.skipped++
          continue
        }
        
        // CRITICAL: Only publish FREE events (we don't sell tickets)
        // If is_free is explicitly false AND there's a price, skip it
        // If price is unknown/null, assume free (benefit of doubt)
        const hasKnownPrice = eventData.price !== null && eventData.price !== undefined && eventData.price > 0
        const isDefinitelyPaid = eventData.is_free === false && hasKnownPrice
        
        if (isDefinitelyPaid) {
          console.log(`⊘ Skipping paid event: ${eventData.name} (price: €${eventData.price})`);
          await log(supabaseClient, 'publish-event', 'info', 'Skipped paid event', { event: eventData.name, price: eventData.price }, { city_id: eventCityId });
          results.skipped++;
          continue;
        }
        
        // If price is unknown but is_free=false, log warning but publish anyway (assume free)
        if (eventData.is_free === false && !hasKnownPrice) {
          console.log(`⚠️ Publishing event with unknown price (assuming free): ${eventData.name}`);
        }

        // Check for duplicates - CRITICAL: must check active status to avoid re-publishing
        const eventStartTime = new Date(eventData.start_time)
        const eventDateStr = eventStartTime.toISOString().split('T')[0]
        
        const { data: existingEvents } = await supabaseClient
          .from('events')
          .select('id, name, date, location_point, status, location')
          .eq('city_id', eventCityId)
          .eq('date', eventDateStr)
          .eq('status', 'active') // Only check active events

        if (existingEvents && existingEvents.length > 0) {
          // CRITICAL: Check for duplicates with fuzzy matching on title + location
          // This catches events with minor title variations (e.g., "Event" vs "Event " or AI-generated variations)
          
          let isDuplicate = false
          let duplicateId = null
          
          for (const existing of existingEvents) {
            // 1. Title similarity check (handle AI-generated minor variations)
            const titleSimilarity = calculateSimilarity(eventData.name, existing.name)
            const titleThreshold = 0.85 // 85% similarity = duplicate
            
            // 2. Address match (normalize before comparing)
            const existingAddr = normalizeAddress(existing.location?.address || '')
            const newAddr = normalizeAddress(eventData.location_address || '')
            
            // Use the first 100 chars after normalization for more robust matching
            const addressMatch = (
              existingAddr.substring(0, 100) === newAddr.substring(0, 100) ||
              (existingAddr.length > 0 && existingAddr === newAddr)
            )
            
            // 3. Time match (same date is enough for duplicate detection)
            // Events on same date + similar title + same location = duplicate
            if (titleSimilarity >= titleThreshold && addressMatch) {
              isDuplicate = true
              duplicateId = existing.id
              console.log(`⊘ Duplicate detected: "${eventData.name}" matches "${existing.name}" (similarity: ${(titleSimilarity * 100).toFixed(1)}%)`)
              break
            }
          }
          
          if (isDuplicate) {
            // Mark as duplicate and skip
            console.log(`⊘ Duplicate: "${eventData.name}" on ${eventDateStr}`)
            await log(supabaseClient, 'publish-event', 'info', 'Duplicate event skipped', { 
              event: eventData.name, 
              date: eventDateStr, 
              location: eventData.location_address,
              duplicateId: duplicateId
            }, { city_id: eventCityId, event_id: duplicateId });
            results.skipped++
            
            // 🔧 Mark raw_events as skipped_duplicate to avoid reprocessing
            // Get the raw_events that led to this parsed_event and mark them
            if (parsedEvent.id) {
              const { data: sourceEvents } = await supabaseClient
                .from('raw_events')
                .select('id')
                .eq('parsed_event_id', parsedEvent.id)
              
              if (sourceEvents && sourceEvents.length > 0) {
                await supabaseClient
                  .from('raw_events')
                  .update({ processing_status: 'skipped_duplicate' })
                  .in('id', sourceEvents.map(e => e.id))
              }
            }
            
            // Mark parsed_event as already published
            await supabaseClient
              .from('event_confidence')
              .update({ event_id: duplicateId })
              .eq('parsed_event_id', parsedEvent.id)
            
            continue // Skip this event completely
          }
        }

        // Create new event
        const startTime = new Date(eventData.start_time)
        
        // Extract date and time separately (both required by schema)
        const isoString = startTime.toISOString() // "2026-03-20T18:00:00.000Z"
        const [dateStr, timeStr] = isoString.split('T')
        const timeOnly = timeStr.split('.')[0] // "18:00:00"
        
        // ALWAYS GEOCODE: Refine coordinates even if they exist
        // discover-events-ai provides initial coords from Gemini, but they may be inaccurate
        if (eventData.location_address) {
          console.log(`🌍 Geocoding address: "${eventData.location_address}"`)
          
          const geocoded = await geocodeAddress(
            eventData.location_address,
            cityConfig.country,
            cityConfig.country_code || 'ee',
            cityConfig.city_name, // Pass city name for better geocoding
            cityConfig.latitude,
            cityConfig.longitude,
            supabaseClient  // Pass supabase client for persistent cache
          )
          
          if (geocoded) {
            const oldLat = eventData.location_lat
            const oldLng = eventData.location_lng
            eventData.location_lat = geocoded.lat
            eventData.location_lng = geocoded.lng
            
            // Log coordinate changes
            if (oldLat && oldLng && (Math.abs(oldLat - geocoded.lat) > 0.001 || Math.abs(oldLng - geocoded.lng) > 0.001)) {
              const dist = Math.sqrt(Math.pow(geocoded.lat - oldLat, 2) + Math.pow(geocoded.lng - oldLng, 2)) * 111.2
              console.log(`✓ Coordinates updated: (${oldLat?.toFixed(6)}, ${oldLng?.toFixed(6)}) → (${geocoded.lat.toFixed(6)}, ${geocoded.lng.toFixed(6)}) [Δ${dist.toFixed(1)}km]`)
            } else {
              console.log(`✓ Geocoded successfully: ${geocoded.lat.toFixed(6)}, ${geocoded.lng.toFixed(6)}`)
            }
            await log(supabaseClient, 'publish-event', 'success', 'Geocoded address', { address: eventData.location_address, lat: geocoded.lat, lng: geocoded.lng }, { city_id: eventCityId });
          } else {
            console.log(`⚠️ Geocoding failed, using existing coordinates: ${eventData.location_lat}, ${eventData.location_lng}`)
            await log(supabaseClient, 'publish-event', 'warning', 'Geocoding failed, using existing', { address: eventData.location_address }, { city_id: eventCityId });
          }
          
          // Rate limit: 1 request per second for Nominatim
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        // VALIDATE: Check if event is within city radius (50km)
        // This filters out wrong "Amsterdam" events (e.g., Montana USA vs Netherlands)
        if (eventData.location_lat && eventData.location_lng) {
          const { data: cityData, error: cityDataError } = await supabaseClient
            .from('supported_cities')
            .select('name, country, location_point')
            .eq('city_id', eventCityId)
            .single()
          
          if (!cityDataError && cityData?.location_point) {
            // Extract city coordinates from PostGIS POINT(lng lat)
            const cityMatch = cityData.location_point.match(/POINT\(([^ ]+) ([^ ]+)\)/)
            if (cityMatch) {
              const cityLng = parseFloat(cityMatch[1])
              const cityLat = parseFloat(cityMatch[2])
              
              // Haversine distance calculation
              const R = 6371 // Earth radius in km
              const dLat = (eventData.location_lat - cityLat) * Math.PI / 180
              const dLng = (eventData.location_lng - cityLng) * Math.PI / 180
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(cityLat * Math.PI / 180) * Math.cos(eventData.location_lat * Math.PI / 180) *
                        Math.sin(dLng/2) * Math.sin(dLng/2)
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
              const distance = R * c
              
              const MAX_DISTANCE_KM = 30 // 30km radius
              
              if (distance > MAX_DISTANCE_KM) {
                console.log(`⊘ Event too far from city: "${eventData.name}" is ${distance.toFixed(1)}km from ${cityData.name} (max ${MAX_DISTANCE_KM}km)`)
                console.log(`   Event: ${eventData.location_lat.toFixed(4)}, ${eventData.location_lng.toFixed(4)} | City: ${cityLat.toFixed(4)}, ${cityLng.toFixed(4)}`)
                await log(supabaseClient, 'publish-event', 'info', 'Event outside city radius', { 
                  event: eventData.name, 
                  distance_km: distance.toFixed(1), 
                  max_km: MAX_DISTANCE_KM,
                  event_coords: `${eventData.location_lat},${eventData.location_lng}`,
                  city_coords: `${cityLat},${cityLng}`
                }, { city_id: eventCityId })
                results.skipped++
                continue
              }
            }
          }
        }
        
        // CRITICAL: Try to geocode if missing coordinates
        // Fallback to city center for vague locations (parks, "various locations", etc.)
        if (!eventData.location_lat || !eventData.location_lng || 
            typeof eventData.location_lat !== 'number' || typeof eventData.location_lng !== 'number' ||
            isNaN(eventData.location_lat) || isNaN(eventData.location_lng)) {
          
          // Check if address is too vague for precise geocoding
          const VAGUE_PATTERNS = /\b(various locations?|multiple venues?|city center|downtown|nature park|festival grounds?)\b/i
          const isVagueLocation = VAGUE_PATTERNS.test(eventData.location_address || '')
          
          if (isVagueLocation) {
            // Use city center as fallback for vague locations
            console.log(`📍 Vague location detected, using city center: ${eventData.name}`)
            const cityCenter = await getCityCenterCoordinates(supabaseClient, cityId)
            if (cityCenter) {
              eventData.location_lat = cityCenter.lat
              eventData.location_lng = cityCenter.lng
              console.log(`✓ Using city center coordinates: ${cityCenter.lat}, ${cityCenter.lng}`)
            } else {
              console.log(`❌ Skipping event "${eventData.name}" - no city center fallback available`)
              await log(supabaseClient, 'publish-event', 'warning', 'Skipped - no precise location', { event: eventData.name, address: eventData.location_address }, { city_id: eventCityId })
              results.skipped++
              continue
            }
          } else {
            // Not vague but still no coordinates - skip
            console.log(`❌ Skipping event "${eventData.name}" - no precise location found. Address: ${eventData.location_address || 'N/A'}`)
            await log(supabaseClient, 'publish-event', 'warning', 'Skipped - no precise location', { event: eventData.name, address: eventData.location_address }, { city_id: eventCityId })
            results.skipped++
            continue
          }
        }
        
        // 📍 APPLY JITTER ONLY IF COORDINATES WOULD STACK
        // Keep precision for dense cities; add ~2-6m offset only on duplicates
        if (eventData.location_lat && eventData.location_lng) {
          const coordKey = `${eventData.location_lat.toFixed(6)},${eventData.location_lng.toFixed(6)}`
          if (seenCoordinates.has(coordKey)) {
            const jitterLat = (Math.random() - 0.5) * 0.00006 // ~±6m
            const jitterLng = (Math.random() - 0.5) * 0.00006 // ~±6m
            eventData.location_lat += jitterLat
            eventData.location_lng += jitterLng
            console.log(`📍 Applied jitter to ${eventData.name}: Δ${(jitterLat * 111000).toFixed(1)}m, ${(jitterLng * 111000).toFixed(1)}m (duplicate coords)`)          
          }
          seenCoordinates.add(coordKey)
        }
        
        const locationPoint = `POINT(${eventData.location_lng} ${eventData.location_lat})`

        // PAUSED: AI image generation disabled to reduce costs in AI pipeline
        // Manual user posts can still use AI image generation in the frontend
        let eventImage = eventData.image_url || null
        /* COST OPTIMIZATION: Image generation paused
        if (!eventImage) {
          console.log(`Generating AI image for event: ${eventData.name}`)
          const base64Image = await generateEventImage(
            eventData.name,
            eventData.category || 'event',
            eventData.description || ''
          )
          
          if (base64Image) {
            // Upload to Supabase Storage and get public URL
            const storageUrl = await uploadImageToStorage(
              supabaseClient,
              base64Image,
              parsedEvent.id // Use parsed_event ID for filename
            )
            
            if (storageUrl) {
              eventImage = storageUrl
              console.log(`✓ AI image uploaded to storage: ${storageUrl}`)
            } else {
              console.log(`✗ Failed to upload AI image to storage for: ${eventData.name}`)
            }
          } else {
            console.log(`✗ Failed to generate AI image for: ${eventData.name}`)
          }
        }
        */

        // Build description with better formatting
        let finalDescription = eventData.description || 'Event details to be announced.';
        
        // Ensure description ends with period
        if (finalDescription && !finalDescription.match(/[.!?]$/)) {
          finalDescription += '.';
        }
        
        // Add structured information with clear separation
        const infoParts: string[] = [];
        
        // Add location as separate section
        if (eventData.location_address) {
          infoParts.push(`📌 Location:\n${eventData.location_address}`);
        }
        
        // Add source link in clean format with visual separation
        if (eventData.source_url) {
          // Extract domain for cleaner display
          let displayUrl = eventData.source_url;
          try {
            const url = new URL(eventData.source_url);
            displayUrl = url.hostname.replace('www.', '');
          } catch (e) {
            // Keep original if URL parsing fails
          }
          
          // Format: [domain](url) for markdown-like rendering hint
          infoParts.push(`📍 More information:\n${eventData.source_url}`);
        }
        
        // Combine with clear visual separation
        if (infoParts.length > 0) {
          finalDescription += '\n\n' + infoParts.join('\n\n');
        }

        // Build location object with geocoded coordinates
        const locationObject = {
          address: eventData.location_address,
          lat: eventData.location_lat,
          lng: eventData.location_lng
        }
        
        console.log(`📍 Saving location JSON: ${JSON.stringify(locationObject)}`)
        console.log(`📍 Saving location_point: ${locationPoint}`)

        const { data: newEvent, error: insertError} = await supabaseClient
          .from('events')
          .insert({
            name: eventData.name,
            description: finalDescription,
            category: eventData.category,
            start_time: startTime.toISOString(), // CRITICAL: Store full timestamp for filtering
            date: dateStr,
            time: timeOnly,
            location: locationObject,
            location_point: locationPoint,
            city_id: eventCityId, // CRITICAL: Link to city
            price: 0, // Always free - we don't sell tickets for aggregated events
            organizer_id: 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807', // Admin user
            image: eventImage,
            status: 'active',
            tags: eventData.category ? [eventData.category] : []
          })
          .select()
          .single()

        if (insertError) throw insertError

        // Log successful publish with full details
        console.log(`✅ Event published successfully: "${eventData.name}"`)
        console.log(`   ID: ${newEvent.id}`)
        console.log(`   Date: ${dateStr} at ${timeOnly}`)
        console.log(`   Location: ${eventData.location_lat?.toFixed(6)}, ${eventData.location_lng?.toFixed(6)}`)
        console.log(`   Address: ${eventData.location_address}`)
        console.log(`   Category: ${eventData.category}`)
        
        await log(supabaseClient, 'publish-event', 'success', 'Published event to map', { 
          event_id: newEvent.id, 
          event: eventData.name, 
          date: dateStr,
          location: eventData.location_address,
          coordinates: `${eventData.location_lat},${eventData.location_lng}`
        }, { city_id: eventCityId, event_id: newEvent.id });

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
    } // End of batch events loop
      
      // Add delay between batches to avoid API rate limiting
      if (batchEnd < filteredEvents.length) {
        console.log(`⏳ Waiting ${BATCH_DELAY_MS}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    } // End of outer batch loop

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
    // Return 500 with detailed error
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        details: error.stack?.substring(0, 500)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
