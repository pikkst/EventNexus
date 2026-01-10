// AI Agent: Event Publishing Service
// Publishes validated events to the Live Map

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { log } from '../_shared/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// Nominatim geocoding fallback for addresses without coordinates
async function geocodeAddress(address: string, country: string, countryCode: string, cityName?: string): Promise<{lat: number, lng: number} | null> {
  try {
    // Helper function to try geocoding with a specific search query
    async function tryGeocode(searchQuery: string, label: string): Promise<{lat: number, lng: number} | null> {
      console.log(`🌍 Geocoding ${label}: ${searchQuery}`)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&countrycodes=${countryCode}`,
        {
          headers: {
            'User-Agent': 'EventNexus/1.0 (contact: huntersest@gmail.com)',
            'Accept-Language': 'et,en'
          }
        }
      )

      if (!response.ok) {
        console.error(`Nominatim API error: ${response.status}`)
        return null
      }

      const data = await response.json()
      
      if (data && data.length > 0) {
        const result = data[0]
        console.log(`✅ Geocoded via ${label}: ${result.display_name}`)
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        }
      }
      
      return null
    }

    // Strategy 1: Try full address with country
    const lowerAddress = address.toLowerCase()
    const lowerCountry = country.toLowerCase()
    let searchAddress = address
    
    // Add city name to address if provided and not already present
    if (cityName && !lowerAddress.includes(cityName.toLowerCase())) {
      searchAddress = `${address}, ${cityName}`
    }
    
    // Add country if not present
    if (!lowerAddress.includes(lowerCountry)) {
      searchAddress = `${searchAddress}, ${country}`
    }
    
    let result = await tryGeocode(searchAddress, 'full address')
    if (result) return result

    // Strategy 2: Try venue name only with country
    if (address.includes(',')) {
      const venueName = address.split(',')[0].trim()
      const venueSearch = `${venueName}, ${country}`
      result = await tryGeocode(venueSearch, 'venue name')
      if (result) return result
    }

    // Strategy 3: Try venue name with city name
    if (cityName && address.includes(',')) {
      const venueName = address.split(',')[0].trim()
      const citySearch = `${venueName}, ${cityName}, ${country}`
      result = await tryGeocode(citySearch, 'venue + city')
      if (result) return result
    }

    console.warn(`❌ All geocoding strategies failed for: ${address}`)
    return null
  } catch (error) {
    console.error('Geocoding failed:', error)
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
    let query = supabaseClient
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

    // Filter by city_id if provided
    if (cityId) {
      query = query.eq('raw_events.event_sources.city_id', cityId)
      console.log(`🎯 Publishing events for city: ${cityId}`)
    } else {
      query = query.limit(20)
    }

    const { data: parsedEvents, error: parsedError } = await query

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
        
        // CRITICAL: SKIP events without precise coordinates - we cannot show misleading locations on map
        if (!eventData.location_lat || !eventData.location_lng || 
            typeof eventData.location_lat !== 'number' || typeof eventData.location_lng !== 'number' ||
            isNaN(eventData.location_lat) || isNaN(eventData.location_lng)) {
          
          console.log(`❌ Skipping event "${eventData.name}" - no precise location found. Address: ${eventData.location_address || 'N/A'}`)
          await log(supabaseClient, 'publish-event', 'warning', 'Skipped - no precise location', { event: eventData.name, address: eventData.location_address }, { city_id: cityId });
          
          // Mark as flagged for manual review (needs real venue address)
          await supabaseClient
            .from('parsed_events')
            .update({ 
              status: 'flagged',
              validation_notes: 'Missing precise location - AI could not extract venue address or geocoding failed'
            })
            .eq('id', parsedEvent.id)
          
          results.skipped++
          continue // Skip to next event
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
        
        // Add source link in a clean format
        if (eventData.source_url) {
          // Extract domain for cleaner display
          let displayUrl = eventData.source_url;
          try {
            const url = new URL(eventData.source_url);
            displayUrl = url.hostname.replace('www.', '');
          } catch (e) {
            // Keep original if URL parsing fails
          }
          
          finalDescription += `\n\n📍 More details: ${eventData.source_url}`;
        }
        
        // Add location if available
        if (eventData.location_address) {
          finalDescription += `\n📌 Location: ${eventData.location_address}`;
        }

        const { data: newEvent, error: insertError } = await supabaseClient
          .from('events')
          .insert({
            name: eventData.name,
            description: finalDescription,
            category: eventData.category,
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
