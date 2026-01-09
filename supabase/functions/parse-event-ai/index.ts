// AI Agent: Event Extraction Service
// Uses Gemini AI to extract structured event data from raw content

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { log } from '../_shared/logger.ts'
import { validateEventDate } from '../_shared/dateValidator.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_API_KEY = Deno.env.get('API_KEY') || Deno.env.get('GEMINI_API_KEY')
const GEMINI_MODEL = 'gemini-2.0-flash-exp' // Faster model for HTML parsing

interface ParsedEvent {
  name: string
  description: string
  start_time: string
  end_time: string
  location_address: string
  location_lat?: number
  location_lng?: number
  category: string
  is_free: boolean
  price?: number
  max_capacity?: number
  original_language: string
  source_url?: string
  organizer?: string
  image_url?: string
}

// ✅ SOOVITUS 1: Return state object instead of raw array
interface ParseResult {
  events: ParsedEvent[]
  rejected: ParsedEvent[]
  meta: {
    total_extracted: number
    total_valid: number
    total_rejected: number
  }
}

async function parseEventWithGemini(rawContent: string, sourceType: string, supabaseClient: any, retries = 3): Promise<ParseResult> {
  // Get current time in Europe/Tallinn timezone
  const now = new Date()
  const estoniaTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Tallinn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(now)
  
  const prompt = `You are an expert event data extractor. Current date and time in Estonia is: ${estoniaTime} (DD/MM/YYYY HH:MM:SS).

CRITICAL - EVENT TIME WINDOW:
Today is 09/01/2026. Extract ONLY events within the next 30 DAYS.
SKIP: past events AND events starting after 08/02/2026 (beyond 30 days)
INCLUDE: events from 09/01/2026 to 08/02/2026 (within 30-day window)

CRITICAL - WHAT IS AN EVENT (vs VENUE/SERVICE):
✅ EXTRACT: Specific events with EXACT dates and times
  - "Concert on Jan 15, 2026 at 19:00"
  - "Workshop: Marketing Basics, Jan 20, 2026"
  - "Festival opening ceremony, Feb 1, 2026"
  
❌ SKIP: Venue descriptions, rental services, generic information
  - "Event space available for rent"
  - "Our venue can host up to 200 people"
  - "Book our conference hall for your event"
  - "Rental fee: €X per hour"
  - Pages about venue/space without specific events listed
  
If the page ONLY describes a venue/service without listing specific dated events, return EMPTY ARRAY [].

HTML PARSING TIPS:
- Look for event cards/listings with date, title, location
- Common HTML patterns: <article>, <div class="event">, <li class="event-item">
- Dates may be in various formats: "09/01/2026", "Jan 9", "Thursday 9 January"
- Extract venue names from location fields
- Look for time indicators: "14:00", "2:00 pm", "10:30 am – 18:30 pm"
- If end time spans multiple hours (e.g., "10:30 am – 18:30 pm"), it's likely an all-day event - set end_time to the closing time
- Multiple dates like "09/01/2026 + 182 additional dates" means recurring/ongoing - extract the start date

CRITICAL - LOCATION/ADDRESS EXTRACTION:
- ALWAYS extract the full venue name and address
- Examples: "Humboldt Forum, Schloßplatz 1, Berlin", "Pirita Vaba Aja Keskus, Tallinn", "Vanemuine Theatre, Tartu"
- Include street name, building number, and city
- If only venue name is available (e.g., "Kadrioru kunstimuuseum"), include it - we will geocode it
- Look for address patterns in HTML: venue name + street + city
- SKIP events without identifiable venue/location - we cannot show events on map without precise location

For each valid event, provide:
- name: event name (from title/heading)
- description: DETAILED description (minimum 100 characters). Extract from event text or create engaging description from: event name, category, venue, what attendees can expect. Include program/schedule if mentioned.
- start_time: ISO 8601 format (YYYY-MM-DDTHH:MM:SS) - parse from date/time fields. If only date given, use 09:00 as default time. MUST be in the future.
- end_time: ISO 8601 format (YYYY-MM-DDTHH:MM:SS) - if not specified, add 2-3 hours to start_time. MUST be in the future.
- location_address: FULL ADDRESS - venue name, street, building number, city. Format: "Venue Name, Street Address, City". REQUIRED - skip event if no venue/address found.
- location_lat: latitude as number (if available in data, otherwise leave empty - we will geocode)
- location_lng: longitude as number (if available in data, otherwise leave empty - we will geocode)
- category: one of (music, sports, arts, food, tech, education, business, community, other) - map from: "Concerts"→music, "Theatre"→arts, "Sports"→sports, "Exhibitions"→arts, "Festivals"→community, "Films"→arts, "Shows"→arts, "Opera & Dance"→arts, "Lectures"→education
- is_free: true if free entry/admission, false if paid or tickets required
- original_language: detected language code (en, de, et, etc)
- source_url: original event URL if available in HTML links
- organizer: organizer name/company (extract from any mentions in text or venue name)
- image_url: event image URL if available (look for <img src="...">)
- price: numeric price in EUR (0 if free, extract from ticket info if available)
- max_capacity: maximum attendees if mentioned (usually not in HTML calendars)

IMPORTANT - DESCRIPTION QUALITY:
- Minimum 100 characters, preferably 200-300
- Extract full event description text from HTML
- If source has minimal info, create engaging description: "Experience [event name] at [venue]. [Category] event featuring [details]."
- Include EVENT PROGRAM/SCHEDULE if mentioned (e.g., "14:00 Opening, 15:00 Main event")
- Add context about the venue if it's well-known (e.g., "at the historic Humboldt Forum")

CRITICAL - PAID vs FREE (Default to FREE):
- Set is_free=true (default) unless you see clear evidence of paid admission
- Set is_free=false ONLY if: "Buy tickets", "Admission €X", "Tickets from €X", "Paid entry" mentioned
- If unclear or no price info → DEFAULT to is_free=true
- Free indicators: "Free admission", "Free entry", "Free of charge", no ticket/price mentions
- We prefer publishing free events, so when in doubt, assume FREE

Return ONLY valid JSON array of FUTURE events (preferably free). No markdown, no explanations.

Content to parse (HTML/RSS/iCal):
${rawContent.slice(0, 20000)}` // Limit to 20KB to avoid timeout

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Add timeout to prevent 504 Gateway Timeout (Edge Functions have 30s limit)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout (before Edge Function 30s limit)
      
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
              temperature: 0.1,
              maxOutputTokens: 16384, // Increased from 8192 to handle longer event lists
            }
          }),
          signal: controller.signal
        }
      )
      
      clearTimeout(timeoutId);

      if (response.status === 429 && attempt < retries) {
        // Rate limit - wait with exponential backoff
        const waitTime = Math.pow(2, attempt) * 5000 // 5s, 10s, 20s
        console.log(`Rate limited, retrying in ${waitTime}ms (attempt ${attempt + 1}/${retries})`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data = await response.json()
      const text = data.candidates[0]?.content?.parts[0]?.text || '[]'

      // Log AI response for debugging
      console.log(`AI response (first 500 chars): ${text.substring(0, 500)}`)

      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/```\n?([\s\S]*?)\n?```/)
      const jsonText = jsonMatch ? jsonMatch[1] : text

      try {
        const events = JSON.parse(jsonText)
        const eventArray = Array.isArray(events) ? events : [events]
        
        console.log(`AI extracted ${eventArray.length} events before filtering`)
        await log(supabaseClient, 'parse-event-ai', 'info', 'AI extracted events', { events_before_filter: eventArray.length })
        
        // 🔧 Server-side filter: use central date validator
        const rejectedEvents: ParsedEvent[] = []
        const validEvents = eventArray.filter((event: ParsedEvent) => {
          if (!event.start_time) {
            console.log(`Filtered out event without start_time: "${event.name}"`)
            rejectedEvents.push(event)
            return false
          }
          
          // Use central date validator
          const validation = validateEventDate(event.start_time, 'Europe/Tallinn')
          
          if (!validation.valid) {
            console.log(`Filtered out event: "${event.name}" - ${validation.reason}: ${validation.details}`)
            rejectedEvents.push(event)
            return false
          }
          
          return true
        })
        
        console.log(`Filtered ${eventArray.length} events -> ${validEvents.length} valid events (future + within 30 days)`)
        await log(supabaseClient, 'parse-event-ai', 'success', 'Filtered events', { before: eventArray.length, after: validEvents.length })
        
        return {
          events: validEvents,
          rejected: rejectedEvents,
          meta: {
            total_extracted: eventArray.length,
            total_valid: validEvents.length,
            total_rejected: rejectedEvents.length
          }
        }
      } catch (error) {
        console.error('Failed to parse Gemini response:', text.substring(0, 1000))
        await log(supabaseClient, 'parse-event-ai', 'error', 'JSON parse failed - response may be incomplete', { 
          text_preview: text.substring(0, 500),
          text_length: text.length,
          error: String(error)
        })
        throw new Error(`Invalid JSON response from AI: ${error.message}`)
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Gemini API timeout after 25s')
        await log(supabaseClient, 'parse-event-ai', 'error', 'Gemini API timeout (25s)', { attempt: attempt + 1 })
        if (attempt < retries) {
          console.log(`Retrying... (attempt ${attempt + 2}/${retries + 1})`)
          continue
        }
        throw new Error('Gemini API timeout - content may be too large')
      }
      if (attempt === retries) throw error
    }
  }
  
  // Should never reach here
  return {
    events: [],
    rejected: [],
    meta: { total_extracted: 0, total_valid: 0, total_rejected: 0 }
  }
}

async function geocodeAddress(address: string, supabaseClient: any): Promise<{ lat: number; lng: number } | null> {
  // Use OpenStreetMap Nominatim for geocoding (free, no API key needed)
  // Rate limit: max 1 request per second
  try {
    // Add 1.1 second delay to respect Nominatim rate limit
    await new Promise(resolve => setTimeout(resolve, 1100))
    
    // Add Estonia to address if not already present for better results
    let searchAddress = address
    if (!address.toLowerCase().includes('estonia') && !address.toLowerCase().includes('eesti')) {
      searchAddress = `${address}, Estonia`
    }
    
    // Try full address first with country code filter
    let response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1&countrycodes=ee`,
      {
        headers: {
          'User-Agent': 'EventNexus/1.0 (https://www.eventnexus.eu)',
          'Accept-Language': 'et,en'
        }
      }
    )

    if (!response.ok) {
      console.error(`❌ Nominatim API error ${response.status}`)
      await log(supabaseClient, 'parse-event-ai', 'error', 'Nominatim API error', { status: response.status, address })
      return null
    }

    let data = await response.json()
    
    // If no results, try simplified query (venue name only, without street)
    if (!data || data.length === 0) {
      const venueName = address.split(',')[0].trim() // Extract venue name before first comma
      if (venueName && venueName !== address) {
        console.log(`🔄 Retrying with venue name only: ${venueName}`)
        await new Promise(resolve => setTimeout(resolve, 1100))
        
        const venueSearch = `${venueName}, Estonia`
        response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(venueSearch)}&limit=1&countrycodes=ee`,
          {
            headers: {
              'User-Agent': 'EventNexus/1.0 (https://www.eventnexus.eu)',
              'Accept-Language': 'et,en'
            }
          }
        )
        
        if (response.ok) {
          data = await response.json()
        }
      }
    }
    
    if (data && data.length > 0) {
      console.log(`✓ Geocoded: ${address} → ${data[0].lat}, ${data[0].lon}`)
      await log(supabaseClient, 'parse-event-ai', 'success', 'Geocoded address', { address, lat: data[0].lat, lng: data[0].lon })
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      }
    }
    
    console.log(`⚠️ Nominatim found no results for: ${address}`)
    await log(supabaseClient, 'parse-event-ai', 'warning', 'Geocoding failed - no results', { address })
  } catch (error) {
    console.error('❌ Geocoding failed:', error)
    await log(supabaseClient, 'parse-event-ai', 'error', 'Geocoding exception', { address, error: String(error) })
  }
  return null
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

    // 🔧 Get request parameters
    const body = await req.json().catch(() => ({}))
    const cityId = body.city_id || null
    const rawEventIds = body.raw_event_ids || null // Two-phase pipeline support

    // Build query for pending raw events
    let query = supabaseClient
      .from('raw_events')
      .select('*, event_sources!inner(type, city_id)')
      .eq('processing_status', 'pending')
      .limit(10) // Process in batches

    // 🔧 If specific raw_event_ids provided (two-phase pipeline), use those
    if (rawEventIds && Array.isArray(rawEventIds) && rawEventIds.length > 0) {
      query = query.in('id', rawEventIds)
      console.log(`Processing specific raw events: ${rawEventIds.length} IDs`)
    } else {
      // Legacy mode: filter by city if specified
      if (cityId) {
        query = query.eq('event_sources.city_id', cityId)
      }
    }

    const { data: rawEvents, error: rawError } = await query

    if (rawError) throw rawError

    console.log(`Found ${rawEvents?.length || 0} raw events to process${cityId ? ` for city ${cityId}` : ''}`)
    await log(supabaseClient, 'parse-event-ai', 'info', 'Starting event extraction', { raw_events: rawEvents?.length || 0 }, { city_id: cityId })

    const results = {
      processed: 0,
      failed: 0,
      events_extracted: 0,
    }

    for (const rawEvent of rawEvents || []) {
      try {
        // Update status to processing
        await supabaseClient
          .from('raw_events')
          .update({ processing_status: 'processing' })
          .eq('id', rawEvent.id)

        const startTime = Date.now()

        console.log(`Processing raw event ${rawEvent.id} from ${rawEvent.event_sources?.type}`)

        // Check if content is substantial enough to contain events
        const contentLength = rawEvent.raw_content?.length || 0
        if (contentLength < 500) {
          console.log(`⊘ Skipping raw event ${rawEvent.id} - content too short (${contentLength} chars)`)
          await supabaseClient
            .from('raw_events')
            .update({ 
              processing_status: 'completed',
              metadata: { note: 'Content too short - likely no events' }
            })
            .eq('id', rawEvent.id)
          results.failed++
          continue
        }

        // Parse with AI
        const parseResult = await parseEventWithGemini(
          rawEvent.raw_content,
          rawEvent.event_sources.type,
          supabaseClient
        )

        // ✅ SOOVITUS 2: Type guard before loop
        if (!Array.isArray(parseResult.events)) {
          throw new Error('parsedEvents is not iterable - parseResult.events must be an array')
        }

        // ✅ SOOVITUS 3: Pipeline state logging
        console.log(`Parse pipeline state for source ${rawEvent.id}:`, {
          extracted: parseResult.meta.total_extracted,
          valid: parseResult.meta.total_valid,
          rejected: parseResult.meta.total_rejected
        })
        await log(supabaseClient, 'parse-event-ai', 'info', 'Parse pipeline state', {
          source_id: rawEvent.id,
          extracted: parseResult.meta.total_extracted,
          valid: parseResult.meta.total_valid,
          rejected: parseResult.meta.total_rejected
        }, { source_id: rawEvent.id })

        await log(supabaseClient, 'parse-event-ai', parseResult.events.length > 0 ? 'success' : 'warning', `Extracted events from source`, { source_id: rawEvent.id, events_found: parseResult.events.length }, { source_id: rawEvent.id })

        // Geocode addresses
        for (const event of parseResult.events) {
          if (event.location_address && !event.location_lat) {
            const coords = await geocodeAddress(event.location_address, supabaseClient)
            if (coords) {
              event.location_lat = coords.lat
              event.location_lng = coords.lng
            }
          }
        }

        // Store parsed events
        for (const event of parseResult.events) {
          const { error: insertError } = await supabaseClient
            .from('parsed_events')
            .insert({
              raw_event_id: rawEvent.id,
              structured_json: event,
              original_language: event.original_language,
              ai_model: GEMINI_MODEL,
              validation_status: 'pending',
            })

          if (!insertError) {
            results.events_extracted++
          }
        }

        // Log AI decision
        await supabaseClient
          .from('ai_decision_log')
          .insert({
            parsed_event_id: null,
            decision_type: 'extraction',
            decision_result: 'success',
            reasoning: {
              events_found: parseResult.events.length,
              events_rejected: parseResult.meta.total_rejected,
              source_type: rawEvent.event_sources.type,
            },
            ai_model: GEMINI_MODEL,
            processing_time_ms: Date.now() - startTime,
          })

        // Update status
        await supabaseClient
          .from('raw_events')
          .update({ processing_status: 'parsed' })
          .eq('id', rawEvent.id)

        results.processed++
        
        // 🔧 TRACK: Source health automation
        // If 0 events extracted, increment failed_parse_count
        // DEACTIVATE: If 3+ consecutive failed parses, mark source as inactive (outdated/moved site)
        if (parseResult.events.length === 0) {
          const { data: sourceData } = await supabaseClient
            .from('event_sources')
            .select('failed_parse_count, source_score')
            .eq('id', rawEvent.source_id)
            .single()
          
          const newFailedCount = (sourceData?.failed_parse_count || 0) + 1
          const currentScore = sourceData?.source_score || 1.0
          const newScore = Math.max(0.0, currentScore - 0.1) // Decrease score by 0.1
          
          await supabaseClient
            .from('event_sources')
            .update({ 
              failed_parse_count: newFailedCount,
              source_score: newScore,
              active: newFailedCount < 3 // Deactivate after 3+ failed parses
            })
            .eq('id', rawEvent.source_id)
          
          if (newFailedCount >= 3) {
            console.log(`❌ Source ${rawEvent.source_id} auto-deactivated after ${newFailedCount} failed parses (0 events)`)
            await log(supabaseClient, 'parse-event-ai', 'warning', 'Source auto-deactivated (low yield)', { 
              source_id: rawEvent.source_id, 
              failed_count: newFailedCount,
              final_score: newScore
            })
            
            // Log AI decision
            await supabaseClient
              .from('ai_decision_log')
              .insert({
                parsed_event_id: null,
                decision_type: 'disable_source',
                decision_result: 'low_yield',
                reasoning: {
                  failed_parse_count: newFailedCount,
                  events_extracted: 0,
                  reason: 'Source consistently returns 0 events - likely outdated or moved'
                },
                ai_model: 'rules_engine',
                processing_time_ms: 0,
              })
          } else {
            console.log(`⚠️ Source ${rawEvent.source_id} failed parse ${newFailedCount}/3 (score: ${newScore})`)
          }
        } else {
          // SUCCESS: Reset failed_parse_count when events are found
          await supabaseClient
            .from('event_sources')
            .update({ failed_parse_count: 0 })
            .eq('id', rawEvent.source_id)
        }
        
        // Rate limit protection: 150 RPM = 2.5 req/sec, use 1s delay to be safe
        if (rawEvents.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } catch (error) {
        console.error(`Failed to parse event ${rawEvent.id}:`, error)
        
        await supabaseClient
          .from('raw_events')
          .update({
            processing_status: 'failed',
            error_message: error.message,
          })
          .eq('id', rawEvent.id)

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
    console.error('Error in parse-event-ai:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
