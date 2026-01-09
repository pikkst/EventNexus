// AI Agent: Event Extraction Service
// Uses Gemini AI to extract structured event data from raw content

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

async function parseEventWithGemini(rawContent: string, sourceType: string, retries = 3): Promise<ParsedEvent[]> {
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

For each valid event, provide:
- name: event name
- description: DETAILED description (minimum 100 characters). If source lacks details, write an engaging description based on: event name, category, location, organizer. Include what attendees can expect.
- start_time: ISO 8601 format (YYYY-MM-DDTHH:MM:SS) in local timezone - MUST be in the future
- end_time: ISO 8601 format (YYYY-MM-DDTHH:MM:SS) in local timezone - MUST be in the future
- location_address: full address (street, building, city, postal code if available)
- location_lat: latitude as number (if available)
- location_lng: longitude as number (if available)
- category: one of (music, sports, arts, food, tech, education, business, community, other)
- is_free: true if free entry, false if paid
- original_language: detected language code (en, de, et, etc)
- source_url: original event URL if available
- organizer: organizer name/company (extract from any mentions in text)
- image_url: event image URL if available
- price: numeric price in EUR (0 if free, extract from ticket info)
- max_capacity: maximum attendees if mentioned

IMPORTANT - DESCRIPTION QUALITY:
- Minimum 100 characters, preferably 200-300
- Include: what is happening, who is performing/speaking, what attendees will experience
- Include EVENT PROGRAM/SCHEDULE if mentioned (e.g., "18:00 Doors, 19:00 Opening, 20:00 Main event")
- Add context about the venue/location if mentioned
- If source has minimal info, create engaging description from available data
- Example: "An evening concert featuring local jazz musicians at the historic Town Hall. Join us for an unforgettable performance of classic and contemporary jazz pieces."

CRITICAL - PAID vs FREE:
- Set is_free=false ONLY if event requires ticket purchase or has admission fee
- Set is_free=true for: free entry, donation-based, registration only (no payment required)
- We ONLY publish FREE events - paid events will be filtered out

Return ONLY valid JSON array of FUTURE FREE events. No markdown, no explanations. Skip all past and paid events.

Content to parse:
${rawContent.slice(0, 20000)}` // Limit to 20KB to avoid timeout

  for (let attempt = 0; attempt <= retries; attempt++) {
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
              temperature: 0.1,
              maxOutputTokens: 8192,
            }
          })
        }
      )

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
        
        // Server-side filter: only events within next 30 days
        const now = new Date()
        const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // +30 days
        
        const validEvents = eventArray.filter((event: ParsedEvent) => {
          if (!event.start_time) {
            console.log(`Filtered out event without start_time: "${event.name}"`)
            return false
          }
          
          const eventStart = new Date(event.start_time)
          const isFuture = eventStart > now
          const withinMonth = eventStart <= oneMonthLater
          
          if (!isFuture) {
            console.log(`Filtered out past event: "${event.name}" (${event.start_time})`)
          } else if (!withinMonth) {
            console.log(`Filtered out event beyond 1 month: "${event.name}" (${event.start_time})`)
          }
          
          return isFuture && withinMonth
        })
        
        console.log(`Filtered ${eventArray.length} events -> ${validEvents.length} valid events (future + within 30 days)`)
        return validEvents
      } catch (error) {
        console.error('Failed to parse Gemini response:', text.substring(0, 1000))
        throw new Error('Invalid JSON response from AI')
      }
    } catch (error) {
      if (attempt === retries) throw error
    }
  }
  
  return []
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  // Use OpenStreetMap Nominatim for geocoding (free, no API key needed)
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'User-Agent': 'EventNexus/1.0 (https://www.eventnexus.eu)',
        }
      }
    )

    const data = await response.json()
    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      }
    }
  } catch (error) {
    console.error('Geocoding failed:', error)
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

    // Get city_id from request body if provided
    const body = await req.json().catch(() => ({}))
    const cityId = body.city_id || null

    // Build query for pending raw events
    let query = supabaseClient
      .from('raw_events')
      .select('*, event_sources!inner(type, city_id)')
      .eq('processing_status', 'pending')
      .limit(10) // Process in batches

    // Filter by city if specified
    if (cityId) {
      query = query.eq('event_sources.city_id', cityId)
    }

    const { data: rawEvents, error: rawError } = await query

    if (rawError) throw rawError

    console.log(`Found ${rawEvents?.length || 0} raw events to process${cityId ? ` for city ${cityId}` : ''}`)

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

        // Parse with AI
        const parsedEvents = await parseEventWithGemini(
          rawEvent.raw_content,
          rawEvent.event_sources.type
        )

        console.log(`Extracted ${parsedEvents.length} events from raw event ${rawEvent.id}`)

        // Geocode addresses
        for (const event of parsedEvents) {
          if (event.location_address && !event.location_lat) {
            const coords = await geocodeAddress(event.location_address)
            if (coords) {
              event.location_lat = coords.lat
              event.location_lng = coords.lng
            }
          }
        }

        // Store parsed events
        for (const event of parsedEvents) {
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
              events_found: parsedEvents.length,
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
