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
async function geocodeWithGemini(address: string, country: string, cityName?: string): Promise<{lat: number, lng: number} | null> {
  try {
    if (!GEMINI_API_KEY) return null

    const prompt = `You are a geocoding expert. Extract precise latitude and longitude for this address:

Address: ${address}
City: ${cityName || 'Unknown'}
Country: ${country}

Respond with ONLY JSON on ONE line:
{"lat": 58.1234, "lng": 25.5678}`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS[currentModelIndex]}:generateContent?key=${GEMINI_API_KEY}`,
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
async function geocodeAddress(address: string, country: string, countryCode: string, cityName?: string): Promise<{lat: number, lng: number} | null> {
  try {
    // Try Gemini first if API key is available
    const geminiCoords = await geocodeWithGemini(address, country, cityName)
    if (geminiCoords) {
      return geminiCoords
    }
    
    // Fallback to Nominatim
    await new Promise(resolve => setTimeout(resolve, 1100)) // Rate limit: 1 req/sec
    
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
          console.log(`✓ Geocoded: "${address}" → ${data[0].lat}, ${data[0].lon} (via: "${searchAddress}")`)
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          }
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
    
    console.warn(`❌ All ${uniqueVariations.length} geocoding strategies failed for: ${address}`)
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
    let query = supabaseClient
      .from('parsed_events')
      .select(`
        *,
        event_confidence!inner(final_score),
        raw_events!inner(
          event_sources!inner(city_id)
        )
      `)
      .gte('event_confidence.final_score', 0.60) // 60% threshold (stored as 0-1 in DB)
      .is('event_confidence.event_id', null) // Not yet published

    // Filter by city_id if provided
    if (cityId) {
      query = query.eq('raw_events.event_sources.city_id', cityId)
      console.log(`🎯 Publishing events for city: ${cityId}`)
    } else {
      query = query.limit(20)
    }

    const { data: parsedEvents, error: parsedError } = await query

    if (parsedError) throw parsedError
    
    console.log(`📊 Found ${parsedEvents?.length || 0} validated events ready for publishing`)

    const results = {
      published: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    }

    // Process events ONE AT A TIME to ensure reliability
    // Each event: AI image generation (3-8s) + geocoding (1-2s) + DB insert (1s)
    // Total per event: ~5-10s. Edge Function timeout: 60s. 
    // Therefore: process sequentially to avoid timeouts and server overload
    const BATCH_SIZE = 1;  // ONE event at a time for maximum reliability
    const BATCH_DELAY_MS = 5000; // 5 seconds between events for reliability and map rendering
    
    console.log(`📦 Processing ${parsedEvents.length} events in batches of ${BATCH_SIZE}`);
    
    for (let batchStart = 0; batchStart < parsedEvents.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, parsedEvents.length);
      const batch = parsedEvents.slice(batchStart, batchEnd);
      const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(parsedEvents.length / BATCH_SIZE);
      
      console.log(`\n📦 Batch ${batchNum}/${totalBatches}: Processing events ${batchStart + 1}-${batchEnd}`);
      
      // Process events in this batch sequentially (not parallel)
      for (const parsedEvent of batch) {
      try {
        const eventData = parsedEvent.structured_json
        const cityId = parsedEvent.raw_events.event_sources.city_id
        const confidenceScore = parsedEvent.event_confidence[0]?.final_score || 0

        // Fetch city config for geocoding
        let cityConfig;
        const { data: cityConfigData, error: cityError } = await supabaseClient
          .from('city_configs')
          .select('city_name, country, country_code')
          .eq('city_id', cityId)
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

        // FILTER OUT USA ADDRESSES - only if city is NOT in USA (prevents wrong "Amsterdam" mixing)
        const address = eventData.location_address || ''
        const US_STATE_CODES = /\b(AL|AK|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/
        const US_ZIP_CODES = /\b\d{5}(-\d{4})?\b/
        
        // Only block USA addresses if the city itself is NOT in USA
        const cityIsInUSA = cityConfig.country === 'United States' || cityConfig.country === 'USA' || cityConfig.country_code === 'us'
        
        // CRITICAL: Don't confuse country codes with US states!
        // AZ = Arizona vs Azerbaijan (country code)
        // AR = Arkansas vs Argentina/Andorra (country code)
        // Check for USA context: zip codes, "USA" keyword, or city/state combinations
        const hasUSAContext = address.match(/\bUSA\b/i) || address.match(/United States/i) || 
                              (US_STATE_CODES.test(address) && US_ZIP_CODES.test(address))
        
        if (!cityIsInUSA && hasUSAContext) {
          console.log(`⊘ Skipping USA event: ${eventData.name} (address: ${address})`)
          await log(supabaseClient, 'publish-event', 'info', 'Skipped USA event', { event: eventData.name, address }, { city_id: cityId })
          results.skipped++
          continue
        }

        // SKIP PLACEHOLDER ADDRESSES - Gemini sometimes generates fake addresses
        const PLACEHOLDER_PATTERNS = /\b(Venue Name|Street Address|City Name|TBD|To Be Determined|Various [Ll]ocations)\b/i
        if (PLACEHOLDER_PATTERNS.test(address)) {
          console.log(`⊘ Skipping event with placeholder address: ${eventData.name} (${address})`)
          await log(supabaseClient, 'publish-event', 'info', 'Skipped placeholder address', { event: eventData.name, address }, { city_id: cityId })
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
          await log(supabaseClient, 'publish-event', 'info', 'Skipped paid event', { event: eventData.name, price: eventData.price }, { city_id: cityId });
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
          .eq('city_id', cityId)
          .eq('name', eventData.name)
          .eq('date', eventDateStr)
          .eq('status', 'active') // Only check active events

        if (existingEvents && existingEvents.length > 0) {
          // Check if location also matches (same venue)
          const existing = existingEvents[0]
          const existingAddr = existing.location?.address || ''
          const newAddr = eventData.location_address || ''
          
          // Simple address similarity check (first 50 chars)
          const isSameLocation = existingAddr.substring(0, 50).toLowerCase() === 
                                 newAddr.substring(0, 50).toLowerCase()
          
          if (isSameLocation) {
            // 🔧 Reduce log spam - only log once
            console.log(`⊘ Duplicate: "${eventData.name}" on ${eventDateStr}`)
            await log(supabaseClient, 'publish-event', 'info', 'Duplicate event skipped', { event: eventData.name, date: eventDateStr, location: newAddr }, { city_id: cityId, event_id: existing.id });
            results.skipped++
            
            // 🔧 Mark raw_event as skipped_duplicate to avoid reprocessing
            await supabaseClient
              .from('raw_events')
              .update({ processing_status: 'skipped_duplicate' })
              .eq('id', parsedEvent.raw_event_id)
            
            // Mark parsed_event as already published
            await supabaseClient
              .from('event_confidence')
              .update({ event_id: existing.id })
              .eq('parsed_event_id', parsedEvent.id)
            
            continue // Skip this event completely
          }
        }

        // If we reach here, it's either: no duplicate, or different location (allowed)
        if (existingEvents && existingEvents.length > 0) {
          console.log(`✓ Same name/date but different location - creating separate event`)
        }

        // Create new event
        const startTime = new Date(eventData.start_time)
        
        // Extract date and time separately (both required by schema)
        const isoString = startTime.toISOString() // "2026-03-20T18:00:00.000Z"
        const [dateStr, timeStr] = isoString.split('T')
        const timeOnly = timeStr.split('.')[0] // "18:00:00"
        
        // GEOCODING FALLBACK: If AI didn't extract coordinates, try Nominatim
        if ((!eventData.location_lat || !eventData.location_lng) && eventData.location_address) {
          console.log(`🌍 Geocoding address: ${eventData.location_address}`)
          
          const geocoded = await geocodeAddress(
            eventData.location_address,
            cityConfig.country,
            cityConfig.country_code || 'ee',
            cityConfig.name // Pass city name for better geocoding
          )
          
          if (geocoded) {
            eventData.location_lat = geocoded.lat
            eventData.location_lng = geocoded.lng
            console.log(`✓ Geocoded successfully: ${geocoded.lat.toFixed(6)}, ${geocoded.lng.toFixed(6)}`)
            await log(supabaseClient, 'publish-event', 'success', 'Geocoded address', { address: eventData.location_address, lat: geocoded.lat, lng: geocoded.lng }, { city_id: cityId });
          } else {
            console.log(`⚠️ Geocoding failed for: ${eventData.location_address}`)
            await log(supabaseClient, 'publish-event', 'warning', 'Geocoding failed', { address: eventData.location_address }, { city_id: cityId });
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
            .eq('city_id', cityId)
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
              
              const MAX_DISTANCE_KM = 50 // 50km radius
              
              if (distance > MAX_DISTANCE_KM) {
                console.log(`⊘ Event too far from city: "${eventData.name}" is ${distance.toFixed(1)}km from ${cityData.name} (max ${MAX_DISTANCE_KM}km)`)
                console.log(`   Event: ${eventData.location_lat.toFixed(4)}, ${eventData.location_lng.toFixed(4)} | City: ${cityLat.toFixed(4)}, ${cityLng.toFixed(4)}`)
                await log(supabaseClient, 'publish-event', 'info', 'Event outside city radius', { 
                  event: eventData.name, 
                  distance_km: distance.toFixed(1), 
                  max_km: MAX_DISTANCE_KM,
                  event_coords: `${eventData.location_lat},${eventData.location_lng}`,
                  city_coords: `${cityLat},${cityLng}`
                }, { city_id: cityId })
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
              await log(supabaseClient, 'publish-event', 'warning', 'Skipped - no precise location', { event: eventData.name, address: eventData.location_address }, { city_id: cityId })
              results.skipped++
              continue
            }
          } else {
            // Not vague but still no coordinates - skip
            console.log(`❌ Skipping event "${eventData.name}" - no precise location found. Address: ${eventData.location_address || 'N/A'}`)
            await log(supabaseClient, 'publish-event', 'warning', 'Skipped - no precise location', { event: eventData.name, address: eventData.location_address }, { city_id: cityId })
            results.skipped++
            continue
          }
        }
        
        const locationPoint = `POINT(${eventData.location_lng} ${eventData.location_lat})`

        // Generate AI image if no image URL provided
        let eventImage = eventData.image_url || null
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

        const { data: newEvent, error: insertError } = await supabaseClient
          .from('events')
          .insert({
            name: eventData.name,
            description: finalDescription,
            category: eventData.category,
            start_time: startTime.toISOString(), // CRITICAL: Store full timestamp for filtering
            date: dateStr,
            time: timeOnly,
            location: {
              address: eventData.location_address,
              lat: eventData.location_lat,
              lng: eventData.location_lng
            },
            location_point: locationPoint,
            city_id: cityId, // CRITICAL: Link to city
            price: 0, // Always free - we don't sell tickets for aggregated events
            organizer_id: 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807', // Admin user
            image: eventImage,
            status: 'active',
            tags: eventData.category ? [eventData.category] : []
          })
          .select()
          .single()

        if (insertError) throw insertError

        // Log successful publish
        await log(supabaseClient, 'publish-event', 'success', 'Published event to map', { 
          event_id: newEvent.id, 
          event: eventData.name, 
          date: dateStr,
          location: eventData.location_address
        }, { city_id: cityId, event_id: newEvent.id });

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
    } // End of batch loop
    
    // Add delay between batches to avoid API rate limiting
    if (batchEnd < parsedEvents.length) {
      console.log(`⏳ Waiting ${BATCH_DELAY_MS}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  } // End of batch iteration

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
