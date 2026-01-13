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
const GEMINI_MODELS = [
  'gemini-2.5-pro',    // Primary: 150 RPM, 2M tokens
  'gemini-2.5-flash',  // Fallback 1: 1000 RPM, 1M tokens
  'gemini-3-flash'     // Fallback 2: 1000 RPM, 1M tokens (preview)
] as const
let currentModelIndex = 0 // Track which model we're using

interface ParsedEvent {
  name: string
  description: string
  start_time: string
  end_time: string
  location_address: string
  location_lat?: number
  location_lng?: number
  location_venue_name?: string
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

// Debug tracking structure
interface DebugMetrics {
  performance: {
    startTime: number
    fetchTime: number
    parseTime: number
    geocodeTime: number
    totalTime: number
  }
  aiStats: {
    requests: number
    timeouts: number
    rateLimits: number
    modelUsed: string
    avgResponseTime: number
    responseTimes: number[]
  }
  geocodingStats: {
    attempts: number
    successes: number
    failures: number
    failureReasons: Record<string, number>
  }
  validationFailures: Array<{
    eventName: string
    reason: string
    data?: any
  }>
  detailedErrors: Array<{
    timestamp: string
    step: string
    error: string
    context?: any
  }>
}

function createDebugMetrics(): DebugMetrics {
  return {
    performance: {
      startTime: Date.now(),
      fetchTime: 0,
      parseTime: 0,
      geocodeTime: 0,
      totalTime: 0
    },
    aiStats: {
      requests: 0,
      timeouts: 0,
      rateLimits: 0,
      modelUsed: GEMINI_MODELS[currentModelIndex],
      avgResponseTime: 0,
      responseTimes: []
    },
    geocodingStats: {
      attempts: 0,
      successes: 0,
      failures: 0,
      failureReasons: {}
    },
    validationFailures: [],
    detailedErrors: []
  }
}

async function parseEventWithGemini(
  rawContent: string, 
  sourceType: string, 
  cityTimezone: string, 
  cityName: string, 
  supabaseClient: any,
  debugMetrics: DebugMetrics, 
  retries = 3
): Promise<ParseResult> {
  // 🧹 CLEAN HTML - Remove tags, keep text (like user copy-paste)
  let cleanedContent = rawContent
  if (sourceType === 'html') {
    cleanedContent = rawContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
      .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
    console.log(`📄 Cleaned HTML → ${cleanedContent.length} chars (was ${rawContent.length})`)
  }

  // Get current time in city timezone
  const now = new Date()
  const cityTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: cityTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(now)
  
  const prompt = `You are an expert event data extractor. Current date and time in ${cityName} is: ${cityTime} (DD/MM/YYYY HH:MM:SS).

CRITICAL - EVENT TIME WINDOW:
Today is ${cityTime.split(' ')[0]}. Extract ONLY events within the next 30 DAYS.
SKIP: past events AND events starting more than 30 days from today.
INCLUDE: events from today until 30 days from now (within 30-day window)

CRITICAL - ONGOING EXHIBITIONS/SEASONAL EVENTS:
For exhibitions, festivals, seasonal attractions that say "runs until [date]" or "open until [date]":
- These are ONGOING events that started in the past
- Use TODAY'S DATE as start_time (not the original opening date)
- Use the closing/end date mentioned in the text as end_time
- Example: "Exhibition runs until Jan 30, 2026" → start_time: TODAY, end_time: 2026-01-30T17:00:00

CRITICAL - WHAT IS AN EVENT (vs VENUE/SERVICE):
✅ EXTRACT: Specific events with EXACT dates and times
  - "Concert on Jan 15, 2026 at 19:00"
  - "Workshop: Marketing Basics, Jan 20, 2026"
  - "Festival opening ceremony, Feb 1, 2026"
  - "Exhibition runs until March 15" (ongoing - use today as start)
  - "Ice rink open until January 30" (seasonal - use today as start)
  
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
- ALWAYS extract the REAL, COMPLETE venue name and address from the event source
- NEVER use placeholders like "Venue Name", "Street Address", "City", "TBD"
- Examples of VALID addresses:
  ✅ "Humboldt Forum, Schloßplatz 1, Berlin"
  ✅ "Pirita Vaba Aja Keskus, Tallinn"
  ✅ "Vanemuine Theatre, Tartu"
  ✅ "OBA Olympisch Kwartier, Laan der Hesperiden 18, 1076 DE Amsterdam"
- Examples of INVALID (NEVER USE):
  ❌ "Venue Name, Street Address, City"
  ❌ "TBD, Location TBA"
  ❌ "Various locations"
  ❌ "Downtown" (too vague)
- If the source HTML contains ONLY vague locations like "Various locations", "City center", "Downtown":
  → Still include them (we have fallback to city center)
  → Format: "Various locations, [City Name]"
- SKIP events if NO real venue name can be extracted at all (blank/missing location fields in HTML)
- Include street name, building number, and city when available
- If only venue name is available (e.g., "Kadrioru kunstimuuseum"), include it - we will geocode it
- Look for address patterns in HTML: venue name + street + city

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

CRITICAL - PAID vs FREE (AGGRESSIVE FREE BIAS):
**PRIORITY: We are building a FREE events platform. Default EVERYTHING to FREE unless payment is EXPLICIT and UNAVOIDABLE.**

is_free=true (DEFAULT) when:
- NO price/ticket mention anywhere
- "Free admission", "Free entry", "Open to public", "No charge"
- "Suggested donation", "Pay what you want", "Voluntary contribution"
- Libraries, community centers, public parks, embassies
- Universities (public lectures, seminars, open days)
- Public museums (general admission unless "special exhibition €X")
- Street events, outdoor festivals, public spaces
- Community gatherings, workshops at cultural centers
- **IF IN DOUBT → FREE**

is_free=false (ONLY) when CLEAR PAID INDICATORS:
- "Tickets €X", "Admission €X", "Entry fee €X"
- "Buy tickets at...", "Ticket required", "Ticketed event"
- Concert/theater with ticket sales platforms linked
- "Members only" or "Subscription required"
- Restaurant/bar events with minimum consumption

**AGGRESSIVE HEURISTICS:**
1. No price mentioned anywhere → is_free=true, price=0
2. Public institution (library, park, community center) → is_free=true, price=0
3. "Free" appears ANYWHERE in description → is_free=true, price=0
4. Only donation/contribution mentioned → is_free=true, price=0
5. University/academic events → is_free=true unless ticket site linked

**BIAS TOWARDS FREE** - we want to maximize free event discovery for users.
When ambiguous, choose FREE. Our users prefer free events.

**ESTONIAN/EUROPEAN TABLE FORMATS:**
Look for these keywords in tables:
- ÜRITUS / EVENT / EVENEMENT → event name
- KUUPÄEV / DATUM / DATE → date
- AEG / ZEIT / TIME → time
- KOHT / ORT / LOCATION → venue
- HIND / PREIS / PRICE → price (tasuta/free/gratis = free)

**ESTONIAN DATE FORMATS:**
Estonian uses abbreviated day names and DD.MM format:
- E = Esmaspäev (Monday)
- T = Teisipäev (Tuesday)
- K = Kolmapäev (Wednesday)
- N = Neljapäev (Thursday)
- R = Reede (Friday)
- L = Laupäev (Saturday)
- P = Pühapäev (Sunday)

Examples:
- "K, 14.01" = Wednesday, 14th January
- "L, 17.01 12:00" = Saturday, 17th January at 12:00
- "T, 20.01 11:00" = Tuesday, 20th January at 11:00

**ESTONIAN MONTH NAMES:**
- jaanuar = January, veebruar = February, märts = March
- aprill = April, mai = May, juuni = June
- juuli = July, august = August, september = September
- oktoober = October, november = November, detsember = December

Return ONLY valid JSON array of FUTURE events (prioritize free events). No markdown, no explanations.

Content to parse (cleaned text):
${cleanedContent.slice(0, 100000)}` // 100KB limit for large calendars

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Get current model (with fallback if rate limited)
      const currentModel = GEMINI_MODELS[currentModelIndex]
      debugMetrics.aiStats.modelUsed = currentModel
      debugMetrics.aiStats.requests++
      
      // Add timeout to prevent 504 Gateway Timeout (Edge Functions support up to 180s)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 180s timeout for large calendars
      
      const aiCallStart = Date.now()
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
              maxOutputTokens: 16384, // Increased from 8192 to handle longer event lists
            }
          }),
          signal: controller.signal
        }
      )
      const aiCallTime = (Date.now() - aiCallStart) / 1000
      debugMetrics.aiStats.responseTimes.push(aiCallTime)
      debugMetrics.aiStats.avgResponseTime = debugMetrics.aiStats.responseTimes.reduce((a, b) => a + b, 0) / debugMetrics.aiStats.responseTimes.length
      
      clearTimeout(timeoutId);

      if (response.status === 429) {
        debugMetrics.aiStats.rateLimits++
        // Try fallback model if available
        if (currentModelIndex < GEMINI_MODELS.length - 1) {
          currentModelIndex++
          const fallbackModel = GEMINI_MODELS[currentModelIndex]
          console.log(`⚠️ Rate limit on ${currentModel}, switching to ${fallbackModel}`)
          await log(supabaseClient, 'parse-event-ai', 'warning', `Model fallback: ${currentModel} → ${fallbackModel}`, { 
            from: currentModel,
            to: fallbackModel,
            city: cityName 
          })
          continue // Retry immediately with new model
        }
        
        // All models rate limited - wait with backoff
        if (attempt < retries) {
          const baseWait = Math.pow(2, attempt) * 12000 // 12s, 24s, 48s (longer waits for large content)
        const jitter = Math.random() * 3000 // 0-3s random jitter to avoid thundering herd
        const waitTime = baseWait + jitter
        console.log(`⏳ Rate limited (429), retrying in ${Math.round(waitTime/1000)}s (attempt ${attempt + 1}/${retries})`)
        await log(supabaseClient, 'parse-event-ai', 'warning', 'Rate limit hit - waiting', { 
          attempt: attempt + 1, 
          wait_ms: Math.round(waitTime),
          city: cityName 
        })
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
        }
      }

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data = await response.json()
      const text = data.candidates[0]?.content?.parts[0]?.text || '[]'

      // Log successful response with model used
      console.log(`✅ ${currentModel} response (first 500 chars): ${text.substring(0, 500)}`)

      // Extract JSON from markdown code blocks if present (handle incomplete/truncated responses)
      let jsonText = text.trim()
      
      // Remove markdown code fences (```json ... ``` or ``` ... ```)
      if (jsonText.startsWith('```')) {
        // Find the first newline after opening fence
        const firstNewline = jsonText.indexOf('\n')
        if (firstNewline > 0) {
          jsonText = jsonText.substring(firstNewline + 1)
        }
        
        // Remove closing fence if present (handle incomplete responses where closing fence is missing)
        const closingFence = jsonText.lastIndexOf('```')
        if (closingFence > 0) {
          jsonText = jsonText.substring(0, closingFence)
        }
        
        jsonText = jsonText.trim()
      }
      
      // Handle incomplete JSON arrays - try to close them if they end abruptly
      if (jsonText.startsWith('[') && !jsonText.endsWith(']')) {
        // Count opening and closing braces to determine if we're mid-object
        const openBraces = (jsonText.match(/\{/g) || []).length
        const closeBraces = (jsonText.match(/\}/g) || []).length
        
        if (openBraces > closeBraces) {
          // Incomplete object - truncate to last complete object
          let lastCompleteEnd = -1
          let depth = 0
          
          for (let i = 0; i < jsonText.length; i++) {
            if (jsonText[i] === '{') depth++
            if (jsonText[i] === '}') {
              depth--
              if (depth === 0) lastCompleteEnd = i + 1
            }
          }
          
          if (lastCompleteEnd > 0) {
            jsonText = jsonText.substring(0, lastCompleteEnd) + ']'
            console.log(`⚠️ Truncated incomplete JSON response to last complete object`)
          }
        } else {
          // Just missing closing bracket
          jsonText += ']'
        }
      }

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
            debugMetrics.validationFailures.push({
              eventName: event.name,
              reason: 'Missing start_time',
              data: { event }
            })
            return false
          }
          
          // Use central date validator
          const validation = validateEventDate(event.start_time, cityTimezone)
          
          if (!validation.valid) {
            console.log(`Filtered out event: "${event.name}" - ${validation.reason}: ${validation.details}`)
            rejectedEvents.push(event)
            debugMetrics.validationFailures.push({
              eventName: event.name,
              reason: `${validation.reason}: ${validation.details}`,
              data: { event, validation }
            })
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
        debugMetrics.aiStats.timeouts++
        console.error('Gemini API timeout after 90s')
        await log(supabaseClient, 'parse-event-ai', 'error', 'Gemini API timeout (90s)', { 
          attempt: attempt + 1,
          content_length: rawContent.length,
          source_type: sourceType,
          city: cityName
        })
        
        debugMetrics.detailedErrors.push({
          timestamp: new Date().toISOString(),
          step: 'AI Parse',
          error: 'Timeout after 90s',
          context: { contentLength: rawContent.length, sourceType, city: cityName }
        })
        
        if (attempt < retries) {
          console.log(`Retrying... (attempt ${attempt + 2}/${retries + 1})`)
          continue
        }
        throw new Error('Gemini API timeout (90s) - content may be too large or complex')
      }
      
      // Log detailed error for debugging
      debugMetrics.detailedErrors.push({
        timestamp: new Date().toISOString(),
        step: 'AI Parse',
        error: error.message || String(error),
        context: { attempt: attempt + 1, city: cityName }
      })
      console.error(`Parse attempt ${attempt + 1}/${retries + 1} failed:`, error)
      await log(supabaseClient, 'parse-event-ai', 'error', 'Parse attempt failed', {
        attempt: attempt + 1,
        error: String(error),
        source_type: sourceType,
        content_length: rawContent.length,
        city: cityName
      })
      
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

async function geocodeWithGemini(
  address: string,
  cityName: string,
  country: string,
  countryCode: string,
  supabaseClient: any,
  debugMetrics: DebugMetrics
): Promise<{ lat: number; lng: number } | null> {
  // Use Gemini to extract precise coordinates from address
  // This is MORE ACCURATE than Nominatim for specific venue names
  
  // Check API key is available
  if (!GEMINI_API_KEY) {
    console.warn(`⚠️ Gemini API key not available, skipping Gemini geocoding`)
    return null
  }
  
  debugMetrics.geocodingStats.attempts++
  
  try {
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
            maxOutputTokens: 100, // Just need coordinates
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
    
    // Handle "null" response from Gemini
    if (text.trim() === 'null' || text.trim() === '') {
      console.warn(`⚠️ Gemini returned null for: ${address}`)
      return null
    }
    
    // Extract JSON from response (handle various formats)
    let coords: any = null
    try {
      // Try direct parse first
      coords = JSON.parse(text.trim())
    } catch {
      // Try extracting from markdown code blocks
      const jsonMatch = text.match(/\{.*"lat".*"lng".*\}/s)
      if (jsonMatch) {
        try {
          coords = JSON.parse(jsonMatch[0])
        } catch {
          // JSON parsing failed
          console.warn(`⚠️ Failed to parse Gemini response: ${text.substring(0, 100)}`)
          return null
        }
      }
    }

    if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number' &&
        coords.lat >= -90 && coords.lat <= 90 && coords.lng >= -180 && coords.lng <= 180) {
      
      debugMetrics.geocodingStats.successes++
      console.log(`✓ Gemini geocoded: "${address}" → ${coords.lat}, ${coords.lng}`)
      await log(supabaseClient, 'parse-event-ai', 'success', 'Gemini geocoded address', { 
        address,
        lat: coords.lat,
        lng: coords.lng
      })
      return coords
    }
  } catch (error) {
    console.warn(`⚠️ Gemini geocoding error:`, error)
  }

  debugMetrics.geocodingStats.failures++
  return null
}

async function geocodeAddress(
  address: string, 
  country: string, 
  countryCode: string, 
  supabaseClient: any,
  debugMetrics: DebugMetrics,
  cityName?: string
): Promise<{ lat: number; lng: number } | null> {
  // Use OpenStreetMap Nominatim for geocoding (free, no API key needed)
  // Rate limit: max 1 request per second
  debugMetrics.geocodingStats.attempts++
  const geocodeStart = Date.now()
  
  try {
    // Add delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 🔧 ENHANCED: Try Gemini FIRST for precise venue-specific coordinates
    // Gemini understands context better and can handle Estonian addresses well
    console.log(`🔍 Attempting Gemini geocoding for: "${address}"`)
    const geminiCoords = await geocodeWithGemini(address, cityName, country, countryCode, supabaseClient, debugMetrics)
    if (geminiCoords) {
      debugMetrics.performance.geocodeTime += (Date.now() - geocodeStart) / 1000
      return geminiCoords
    }
    
    // FALLBACK: Use Nominatim if Gemini didn't work
    console.log(`🔍 Falling back to Nominatim for: "${address}"`)
    
    // Prepare search variations for Nominatim
    const searchVariations: string[] = []
    
    // Parse address components
    const parts = address.split(',').map(p => p.trim())
    const venueName = parts[0] || ''
    const cityName2 = parts[parts.length - 1]?.trim() || parts[1]?.trim() || ''
    
    const lowerAddress = address.toLowerCase()
    const lowerCountry = country.toLowerCase()
    
    // 1. Full address with country (if not present)
    if (!lowerAddress.includes(lowerCountry)) {
      searchVariations.push(`${address}, ${country}`)
    } else {
      searchVariations.push(address)
    }
    
    // 2. Venue name + city + country (most specific)
    if (venueName && cityName2 && venueName !== cityName2) {
      searchVariations.push(`${venueName}, ${cityName2}, ${country}`)
    }
    
    // 3. Venue name only + country (for institutional names)
    if (venueName && venueName !== address) {
      searchVariations.push(`${venueName}, ${country}`)
    }
    
    // 4. Remove building/room numbers (e.g., "Room 123" → venue name only)
    const cleanVenue = venueName.replace(/\b(room|suite|floor|bldg|building|apt|#)\s*\d+\w*/gi, '').trim()
    if (cleanVenue && cleanVenue !== venueName && cleanVenue.length > 3) {
      searchVariations.push(`${cleanVenue}, ${country}`)
    }
    
    // 5. City + venue (reversed order - sometimes works better)
    if (cityName2 && venueName && cityName2 !== venueName) {
      searchVariations.push(`${cityName2}, ${venueName}, ${country}`)
    }
    
    // 6. Just venue name + city (no country - sometimes helps)
    if (venueName && cityName2 && venueName !== cityName2) {
      searchVariations.push(`${venueName}, ${cityName2}`)
    }
    
    // 7. Remove special characters that might confuse geocoder
    const cleanAddress = address.replace(/[()[\]]/g, '').replace(/\s+/g, ' ').trim()
    if (cleanAddress !== address) {
      searchVariations.push(`${cleanAddress}, ${country}`)
    }
    
    // 8. If address contains street number, try without it
    const addressWithoutNumber = address.replace(/\b\d+\w*\b/g, '').replace(/\s+/g, ' ').trim()
    if (addressWithoutNumber !== address && addressWithoutNumber.length > 5) {
      searchVariations.push(`${addressWithoutNumber}, ${country}`)
    }
    
    // Remove duplicates while preserving order
    const uniqueVariations = [...new Set(searchVariations)]
    
    console.log(`🔍 Geocoding with ${uniqueVariations.length} Nominatim strategies: "${address}"`)
    
    // Add delay for Nominatim rate limit
    await new Promise(resolve => setTimeout(resolve, 600))
    
    // Try each search variation
    for (const searchAddress of uniqueVariations) {
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
        await log(supabaseClient, 'parse-event-ai', 'error', 'Nominatim API error', { status: response.status, address, searchAddress })
        continue // Try next variation
      }

      const data = await response.json()
      
      if (data && data.length > 0) {
        debugMetrics.geocodingStats.successes++
        debugMetrics.performance.geocodeTime += (Date.now() - geocodeStart) / 1000
        
        console.log(`✓ Geocoded: "${address}" → ${data[0].lat}, ${data[0].lon} (via: "${searchAddress}")`)
        await log(supabaseClient, 'parse-event-ai', 'success', 'Geocoded address', { 
          original: address, 
          search_query: searchAddress,
          lat: data[0].lat, 
          lng: data[0].lon 
        })
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        }
      }
      
      // Wait before trying next variation (respect rate limit)
      if (uniqueVariations.indexOf(searchAddress) < uniqueVariations.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1100))
      }
    }
    
    debugMetrics.geocodingStats.failures++
    const reason = 'No results found'
    debugMetrics.geocodingStats.failureReasons[reason] = (debugMetrics.geocodingStats.failureReasons[reason] || 0) + 1
    
    console.log(`⚠️ Nominatim found no results for any of ${uniqueVariations.length} variations: ${address}`)
    await log(supabaseClient, 'parse-event-ai', 'warning', 'Geocoding failed - no results', { address, tried: uniqueVariations })
  } catch (error) {
    debugMetrics.geocodingStats.failures++
    const reason = error.message || 'Unknown error'
    debugMetrics.geocodingStats.failureReasons[reason] = (debugMetrics.geocodingStats.failureReasons[reason] || 0) + 1
    
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
      .limit(2) // Reduced from 3 to 2 to prevent connection timeouts (2 events * ~40s = ~80s, safer for unstable connections)

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

    // Initialize debug metrics
    const debugMetrics = createDebugMetrics()

    const results = {
      processed: 0,
      failed: 0,
      events_extracted: 0,
      parsed: 0, // Add this key for dashboard compatibility
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

        // Fetch city config for this event source
        const { data: cityConfig, error: cityError } = await supabaseClient
          .from('city_configs')
          .select('city_name, country, timezone, country_code')
          .eq('city_id', rawEvent.event_sources.city_id)
          .single()

        if (cityError || !cityConfig) {
          console.error(`❌ Failed to load city config for ${rawEvent.event_sources.city_id}:`, cityError)
          // Fallback to default values
          cityConfig = {
            city_name: 'Unknown',
            country: 'Estonia',
            timezone: 'Europe/Tallinn',
            country_code: 'ee'
          }
        }

        console.log(`City config: ${cityConfig.city_name}, ${cityConfig.country} (${cityConfig.timezone})`)

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
        const parseStepStart = Date.now()
        const parseResult = await parseEventWithGemini(
          rawEvent.raw_content,
          rawEvent.event_sources.type,
          cityConfig.timezone,
          cityConfig.city_name,
          supabaseClient,
          debugMetrics
        )
        debugMetrics.performance.parseTime += (Date.now() - parseStepStart) / 1000

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
            // 🧹 Clean address - remove duplicate city names (AI sometimes adds full city name multiple times)
            let cleanedAddress = event.location_address
            const lowerCity = cityConfig.city_name.toLowerCase()
            
            // Remove "City of X" variants if already present
            const cityOfPattern = new RegExp(`(,\\s*city of ${lowerCity.replace(/city of /i, '')}|,\\s*${lowerCity})`, 'gi')
            const parts = cleanedAddress.split(cityOfPattern)
            if (parts.length > 2) {
              // Duplicate city found - keep only first occurrence
              cleanedAddress = parts[0] + (parts[1] || '')
            }
            
            // Enhance address with city name if not present
            let enhancedAddress = cleanedAddress
            const lowerAddress = cleanedAddress.toLowerCase()
            
            // Add city name ONCE if not in address (helps geocoding)
            if (!lowerAddress.includes(lowerCity)) {
              // Extract just the core city name (e.g., "Fredericton" from "City of Fredericton")
              const coreCity = cityConfig.city_name.replace(/^city of\s+/i, '').trim()
              enhancedAddress = `${cleanedAddress}, ${coreCity}`
            }
            
            const coords = await geocodeAddress(
              enhancedAddress,
              cityConfig.country,
              cityConfig.country_code || 'ee',
              supabaseClient,
              debugMetrics,
              cityConfig.city_name
            )
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
              ai_model: GEMINI_MODELS[currentModelIndex],
              validation_status: 'pending',
            })

          if (!insertError) {
            results.events_extracted++
            results.parsed++ // Sync both counters
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
            ai_model: GEMINI_MODELS[currentModelIndex],
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

    // Calculate total processing time
    debugMetrics.performance.totalTime = (Date.now() - debugMetrics.performance.startTime) / 1000

    return new Response(
      JSON.stringify({
        success: true,
        results,
        debugMetrics: {
          performance: {
            parseTime: debugMetrics.performance.parseTime.toFixed(2),
            geocodeTime: debugMetrics.performance.geocodeTime.toFixed(2),
            totalTime: debugMetrics.performance.totalTime.toFixed(2)
          },
          aiStats: {
            requests: debugMetrics.aiStats.requests,
            timeouts: debugMetrics.aiStats.timeouts,
            rateLimits: debugMetrics.aiStats.rateLimits,
            modelUsed: debugMetrics.aiStats.modelUsed,
            avgResponseTime: debugMetrics.aiStats.avgResponseTime.toFixed(2)
          },
          geocodingStats: {
            attempts: debugMetrics.geocodingStats.attempts,
            successes: debugMetrics.geocodingStats.successes,
            failures: debugMetrics.geocodingStats.failures,
            successRate: debugMetrics.geocodingStats.attempts > 0 
              ? ((debugMetrics.geocodingStats.successes / debugMetrics.geocodingStats.attempts) * 100).toFixed(1)
              : '0',
            failureReasons: debugMetrics.geocodingStats.failureReasons
          },
          validationFailures: debugMetrics.validationFailures.slice(0, 10), // Top 10
          detailedErrors: debugMetrics.detailedErrors.slice(0, 10) // Top 10
        },
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
