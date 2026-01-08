// AI Agent: Event Extraction Service
// Uses Gemini AI to extract structured event data from raw content

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_API_KEY = Deno.env.get('API_KEY') || Deno.env.get('GEMINI_API_KEY')
const GEMINI_MODEL = 'gemini-2.0-flash'

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
  original_language: string
  source_url?: string
  organizer?: string
  image_url?: string
}

async function parseEventWithGemini(rawContent: string, sourceType: string, retries = 3): Promise<ParsedEvent[]> {
  const prompt = `You are an expert event data extractor. Extract structured public event information from the following ${sourceType} content.

Extract ALL events found in the content. For each event, provide:
- name: event name
- description: full description
- start_time: ISO 8601 format (YYYY-MM-DDTHH:MM:SS)
- end_time: ISO 8601 format (YYYY-MM-DDTHH:MM:SS)
- location_address: full address
- location_lat: latitude as number (if available)
- location_lng: longitude as number (if available)
- category: one of (music, sports, arts, food, tech, education, business, community, other)
- is_free: true if free entry, false if paid
- original_language: detected language code (en, de, et, etc)
- source_url: original event URL if available
- organizer: organizer name if mentioned
- image_url: event image URL if available

Return ONLY valid JSON array of events. No markdown, no explanations.

Content to parse:
${rawContent.slice(0, 8000)}` // Limit content length

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
              maxOutputTokens: 4096,
            }
          })
        }
      )

      if (response.status === 429 && attempt < retries) {
        // Rate limit - wait with exponential backoff
        const waitTime = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
        console.log(`Rate limited, retrying in ${waitTime}ms (attempt ${attempt + 1}/${retries})`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data = await response.json()
      const text = data.candidates[0]?.content?.parts[0]?.text || '[]'

      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/```\n?([\s\S]*?)\n?```/)
      const jsonText = jsonMatch ? jsonMatch[1] : text

      try {
        const events = JSON.parse(jsonText)
        return Array.isArray(events) ? events : [events]
      } catch (error) {
        console.error('Failed to parse Gemini response:', text)
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

    // Get pending raw events
    const { data: rawEvents, error: rawError } = await supabaseClient
      .from('raw_events')
      .select('*, event_sources(type)')
      .eq('processing_status', 'pending')
      .limit(10) // Process in batches

    if (rawError) throw rawError

    console.log(`Found ${rawEvents?.length || 0} raw events to process`)

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
        
        // Rate limit protection: wait 2s between events
        if (rawEvents.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
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
