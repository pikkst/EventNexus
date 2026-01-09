// AI Agent: City Bootstrap Service
// Automatically discovers event sources and seeds initial events for new cities

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { log } from '../_shared/logger.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_API_KEY = Deno.env.get('API_KEY') || Deno.env.get('GEMINI_API_KEY')
const GEMINI_MODEL = 'gemini-2.5-pro'
const GOOGLE_SEARCH_API_KEY = Deno.env.get('GOOGLE_SEARCH_API_KEY')
const GOOGLE_SEARCH_ENGINE_ID = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID')

interface CityBootstrapRequest {
  city_id?: string;
  city_name: string;
  country: string;
  languages?: string[];
  timezone?: string;
  auto_discover?: boolean;
  seed_events?: boolean;
}

interface EventSource {
  name: string;
  url: string;
  type: 'api' | 'rss' | 'html' | 'ical';
  source_score: number;
  description?: string;
}

// Known high-quality event platforms for major cities
const KNOWN_EVENT_PLATFORMS: Record<string, EventSource[]> = {
  'Tallinn': [
    { name: 'Huvi.Tallinn.ee - Official Events Platform', url: 'https://huvi.tallinn.ee', type: 'html', source_score: 0.95 },
    { name: 'Piletilevi - Tallinn Events', url: 'https://www.piletilevi.ee/est/piletid/tallinn/', type: 'html', source_score: 0.85 },
    { name: 'Visit Tallinn - Events', url: 'https://www.visittallinn.ee/eng/things-to-do/events', type: 'html', source_score: 0.80 },
  ],
  'Tartu': [
    { name: 'Tartu Kultuuriaken', url: 'https://kultuuriaken.tartu.ee/en/events', type: 'html', source_score: 0.95 },
    { name: 'Piletilevi - Tartu Events', url: 'https://www.piletilevi.ee/est/piletid/tartu/', type: 'html', source_score: 0.85 },
  ],
  'Pärnu': [
    { name: 'Piletilevi - Pärnu Events', url: 'https://www.piletilevi.ee/est/piletid/parnu/', type: 'html', source_score: 0.85 },
    { name: 'Visit Pärnu', url: 'https://visitparnu.com/en/events', type: 'html', source_score: 0.80 },
  ],
  'Berlin': [
    { name: 'Visit Berlin - Official Event Calendar', url: 'https://www.visitberlin.de/en/event-calendar-berlin', type: 'html', source_score: 0.95 },
    { name: 'Berlin.de Event Calendar', url: 'https://www.berlin.de/en/events/', type: 'html', source_score: 0.90 },
  ],
  'London': [
    { name: 'Visit London - What\'s On', url: 'https://www.visitlondon.com/things-to-do/whats-on', type: 'html', source_score: 0.95 },
    { name: 'Time Out London', url: 'https://www.timeout.com/london/things-to-do/whats-on-in-london-today', type: 'html', source_score: 0.90 },
  ],
  'Paris': [
    { name: 'Paris Tourist Office - Events', url: 'https://en.parisinfo.com/discovering-paris/major-events', type: 'html', source_score: 0.95 },
  ],
  'Amsterdam': [
    { name: 'I Amsterdam - Events', url: 'https://www.iamsterdam.com/en/see-and-do/whats-on', type: 'html', source_score: 0.95 },
  ]
}

async function discoverCitySources(cityName: string, country: string): Promise<EventSource[]> {
  // Start with known high-quality platforms
  let sources: EventSource[] = [...(KNOWN_EVENT_PLATFORMS[cityName] || [])]
  console.log(`📋 Starting with ${sources.length} known platforms for ${cityName}`)
  
  // Then discover additional sources
  let discoveredSources: EventSource[] = []
  
  // Prefer Google Search API if configured
  if (GOOGLE_SEARCH_API_KEY && GOOGLE_SEARCH_ENGINE_ID) {
    discoveredSources = await discoverSourcesViaGoogleSearch(cityName, country)
  } else if (GEMINI_API_KEY) {
    discoveredSources = await discoverSourcesViaGemini(cityName, country)
  } else {
    console.error('Neither Google Search API nor Gemini API configured')
  }
  
  // Merge discovered sources (avoiding duplicates)
  for (const discovered of discoveredSources) {
    if (!sources.some(s => s.url === discovered.url)) {
      sources.push(discovered)
    }
  }
  
  console.log(`✓ Total sources: ${sources.length} (${KNOWN_EVENT_PLATFORMS[cityName]?.length || 0} known + ${discoveredSources.length} discovered)`)
  return sources
}

async function discoverSourcesViaGoogleSearch(cityName: string, country: string): Promise<EventSource[]> {
  const sources: EventSource[] = []
  
  // Search queries: first find major event platforms, then structured data feeds
  const queries = [
    // Major event platforms and aggregators (broad search)
    `${cityName} üritused`,
    `${cityName} sündmused`,
    `${cityName} events calendar`,
    `${cityName} kultuurikalender`,
    `${cityName} what's on`,
    // Structured data feeds (narrow search for APIs/RSS)
    `${cityName} events RSS feed`,
    `${cityName} calendar API`,
    `${cityName} events iCal`,
    `${cityName} üritused RSS`,
    `site:${cityName.toLowerCase()}.ee üritused`,
  ]

  for (const query of queries) {
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=10`
      
      console.log(`🔍 Searching: "${query}"`)
      console.log(`   API Key set: ${!!GOOGLE_SEARCH_API_KEY}, Engine ID: ${GOOGLE_SEARCH_ENGINE_ID}`)
      
      const response = await fetch(url)
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Google Search API error ${response.status}:`, errorText)
        continue
      }

      const data = await response.json()
      console.log(`   Found ${data.items?.length || 0} results`)
      
      for (const item of data.items || []) {
        const itemUrl = item.link
        const itemTitle = item.title?.toLowerCase() || ''
        const itemSnippet = item.snippet?.toLowerCase() || ''
        const displayLink = item.displayLink?.toLowerCase() || ''
        
        // FILTER OUT: Irrelevant domains and content
        const irrelevantDomains = ['microsoft.com', 'developer.', 'docs.', 'api-docs', 'github.com', 
                                   'stackoverflow.com', 'medium.com', 'wunderground.com', 'weather.com',
                                   'plausible.io', 'analytics', 'toggl.com', 'freshdesk.com', 'salesforce',
                                   'guidelines', 'handbook', 'manual', 'documentation'];
        const irrelevantKeywords = ['documentation', 'tutorial', 'how to', 'guide', 'reference', 
                                    'weather', 'forecast', 'temperature', 'tracking software', 'guidelines',
                                    'api reference', 'stats api', 'booking system'];
        const irrelevantPaths = ['/guidelines/', '/docs/', '/api-docs/', '/handbook/', '/manual/'];
        
        const isIrrelevantDomain = irrelevantDomains.some(domain => displayLink.includes(domain) || itemUrl.includes(domain));
        const isIrrelevantContent = irrelevantKeywords.some(kw => itemTitle.includes(kw) || itemSnippet.includes(kw));
        const isIrrelevantPath = irrelevantPaths.some(path => itemUrl.includes(path));
        
        // STRICT: Filter out if wrong country/city (e.g., Tartu College in Canada, not Estonia)
        const wrongCountry = (country === 'Estonia' && (itemUrl.includes('.ca') || itemUrl.includes('.us') || itemUrl.includes('.au')));
        
        if (isIrrelevantDomain || isIrrelevantContent || isIrrelevantPath || wrongCountry) {
          console.log(`   Filtered out irrelevant: ${item.title}`)
          continue
        }
        
        // Detect source type from URL and content
        let type: 'api' | 'rss' | 'html' | 'ical' = 'html'
        if (itemUrl.includes('/feed') || itemUrl.includes('rss') || itemUrl.includes('.xml') || itemUrl.includes('/rss')) {
          type = 'rss'
        } else if (itemUrl.includes('.ics') || itemUrl.includes('ical') || itemUrl.includes('webcal') || itemUrl.includes('/ical')) {
          type = 'ical'
        } else if (itemUrl.includes('events.json') || itemUrl.includes('calendar.json') || (itemUrl.includes('.json') && itemUrl.includes('event'))) {
          type = 'api'
        }
        // DO NOT classify as API just because URL contains '/api/' - that's often documentation

        // Enhanced confidence scoring - prioritize structured formats and dedicated platforms
        const domainMatch = displayLink.includes(cityName.toLowerCase())
        const titleMatch = itemTitle.includes('event') || itemTitle.includes('kalender') || itemTitle.includes('calendar')
        const hasEventKeywords = itemTitle.includes('events') || itemTitle.includes('üritused') || itemTitle.includes('sündmused')
        const isOfficialTourism = displayLink.includes('visit') || displayLink.includes('tourism') || displayLink.includes('kultuur')
        const isDedicatedPlatform = displayLink.includes('huvi.') || displayLink.includes('piletilevi') || 
                                   displayLink.includes('eventim') || displayLink.includes('ticketer') ||
                                   itemUrl.includes('/events') || itemUrl.includes('/üritused')
        
        let sourceScore = 0.3 // Baseline for HTML
        if (type === 'rss') sourceScore = 0.7 // High score for RSS
        if (type === 'ical') sourceScore = 0.8 // Higher for iCal  
        if (type === 'api') sourceScore = 0.9 // Highest for real API
        
        if (domainMatch) sourceScore += 0.2
        if (titleMatch) sourceScore += 0.15
        if (hasEventKeywords) sourceScore += 0.15
        if (isOfficialTourism) sourceScore += 0.2
        if (isDedicatedPlatform) sourceScore += 0.3 // Boost dedicated event platforms

        // Skip duplicates
        if (sources.some(s => s.url === itemUrl)) continue

        // STRICT relevance filter - must be event-related AND city-related
        const isCityRelated = 
          itemUrl.includes(cityName.toLowerCase()) || 
          itemTitle.includes(cityName.toLowerCase()) ||
          displayLink.includes(cityName.toLowerCase())
        
        // Expanded event-related keywords (Estonian + English)
        const eventKeywords = ['event', 'kalender', 'calendar', 'üritused', 'sündmused', 'kultuur', 
                               'what\'s on', 'happening', 'toimub', 'huvi', 'tegevused', 'things to do']
        
        const isEventRelated = 
          type !== 'html' || // Always include RSS/iCal/API
          eventKeywords.some(kw => itemTitle.includes(kw)) ||
          eventKeywords.some(kw => itemSnippet.includes(kw)) ||
          eventKeywords.some(kw => itemUrl.includes(kw))
        
        if (!isCityRelated || !isEventRelated) {
          console.log(`   Skipped: not city/event related - ${itemUrl}`)
          continue
        }

        sources.push({
          name: item.title,
          url: itemUrl,
          type: type,
          source_score: Math.min(sourceScore, 1.0), // Cap at 1.0
          description: item.snippet
        })
      }
    } catch (error) {
      console.error(`Failed to search for "${query}":`, error)
    }
  }

  // Sort by score and deduplicate
  sources.sort((a, b) => b.source_score - a.source_score)
  
  console.log(`✓ Found ${sources.length} potential sources via Google Search`)
  
  return sources.slice(0, 10) // Top 10
}

async function discoverSourcesViaGemini(cityName: string, country: string): Promise<EventSource[]> {
  console.log(`🤖 Using Gemini AI to discover sources for ${cityName}, ${country}`)
  console.log(`   Gemini API Key set: ${!!GEMINI_API_KEY}`)

  const prompt = `You are an expert at finding official public event data sources for cities.

Find official event sources for ${cityName}, ${country}.

Return ONLY valid JSON array of sources with this structure:
[
  {
    "name": "Official City Events Portal",
    "url": "https://...",
    "type": "html" or "rss" or "api" or "ical",
    "source_score": 0.8,
    "description": "Official city government events"
  }
]

Prioritize:
1. Official city/municipality websites
2. Tourism boards
3. Cultural institutions (museums, theaters)
4. Open data portals
5. iCal/RSS feeds from venues

Return 3-10 sources. Be conservative - only return sources you're confident exist.
NO markdown, NO explanations, ONLY the JSON array.`

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
            temperature: 0.2,
            maxOutputTokens: 2048,
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Gemini API error ${response.status}:`, errorText)
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.candidates[0]?.content?.parts[0]?.text || '[]'
    console.log(`   Gemini response (first 300 chars): ${text.substring(0, 300)}`)

    // Extract JSON from markdown if present
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/```\n?([\s\S]*?)\n?```/)
    const jsonText = jsonMatch ? jsonMatch[1] : text

    try {
      const sources = JSON.parse(jsonText)
      console.log(`   Parsed ${Array.isArray(sources) ? sources.length : 0} sources from Gemini`)
      return Array.isArray(sources) ? sources : []
    } catch (error) {
      console.error('Failed to parse source discovery response:', text)
      return []
    }
  } catch (error) {
    console.error('Source discovery failed:', error)
    return []
  }
}

async function validateSource(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EventNexus-Bot/1.0; +https://www.eventnexus.eu)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      redirect: 'follow'
    })
    // Accept 200-399 status codes (including redirects)
    const isValid = response.status >= 200 && response.status < 400
    console.log(`Source ${url} validation: ${response.status} - ${isValid ? 'VALID' : 'INVALID'}`)
    return isValid
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.log(`Source validation error for ${url}: ${errorMsg} - accepting anyway`)
    // Still add source even if validation fails - let fetch-sources handle it
    return true
  }
}

async function bootstrapCity(
  supabase: any,
  request: CityBootstrapRequest
): Promise<{ success: boolean; city_id: string; sources_added: number; events_seeded: number; error?: string }> {
  
  const { city_name, country, languages = ['en'], timezone = 'UTC', auto_discover = true, seed_events = true } = request
  
  let cityId = request.city_id  // Define at function scope

  try {
    // 1. Create or get city config
    if (!cityId) {
      const { data: existingCity, error: checkError } = await supabase
        .from('city_configs')
        .select('city_id')
        .eq('city_name', city_name)
        .eq('country', country)
        .maybeSingle()

      if (existingCity) {
        cityId = existingCity.city_id
      } else {
        const { data: newCity, error: cityError } = await supabase
          .from('city_configs')
          .insert({
            city_name,
            country,
            languages,
            timezone,
            active: true,
            bootstrap_status: 'discovering_sources'
          })
          .select('city_id')
          .single()

        if (cityError) throw cityError
        cityId = newCity.city_id
      }
    }

    if (!cityId) {
      throw new Error('Failed to create or retrieve city config')
    }

    // Update bootstrap status
    await supabase
      .from('city_configs')
      .update({ bootstrap_status: 'discovering_sources' })
      .eq('city_id', cityId)

    // 2. Discover sources with AI
    let sourcesAdded = 0

    if (auto_discover) {
      console.log(`Discovering sources for ${city_name}, ${country}...`)
      const discoveredSources = await discoverCitySources(city_name, country)

      for (const source of discoveredSources) {
        // Validate source availability
        const isValid = await validateSource(source.url)

        if (isValid) {
          const { error: sourceError } = await supabase
            .from('event_sources')
            .insert({
              city_id: cityId,
              name: source.name,
              type: source.type,
              url: source.url,
              source_score: source.source_score,
              active: true,
            })
            .select()

          if (!sourceError) {
            sourcesAdded++
          }
        } else {
          console.log(`Skipping invalid source: ${source.url}`)
        }
      }
    }

    // 3. Update bootstrap status
    await supabase
      .from('city_configs')
      .update({ bootstrap_status: 'seeding_events' })
      .eq('city_id', cityId)

    // 4. Seed initial events
    let eventsSeeded = 0

    if (seed_events && sourcesAdded > 0) {
      console.log(`Seeding initial events for ${city_name}...`)
      await log(supabase, 'bootstrap-city', 'info', 'Seeding initial events', { city: city_name, sources: sourcesAdded }, { city_id: cityId });
      
      // Trigger fetch-sources for this city
      const { data: fetchResult, error: fetchError } = await supabase.functions.invoke('fetch-sources', {
        body: { city_id: cityId }
      })

      if (!fetchError && fetchResult?.results?.fetched > 0) {
        // Trigger parse pipeline
        await supabase.functions.invoke('parse-event-ai')
        await supabase.functions.invoke('validate-event')
        await supabase.functions.invoke('publish-event')

        // Count seeded events
        const { count } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('city_id', cityId)

        eventsSeeded = count || 0
      }
    }

    // 5. Activate city if sufficient events
    const finalStatus = eventsSeeded >= 5 ? 'active' : 'failed'
    const errorMessage = eventsSeeded < 5 ? `Only ${eventsSeeded} events discovered. Minimum 5 required.` : null

    await supabase
      .from('city_configs')
      .update({
        bootstrap_status: finalStatus,
        bootstrap_error: errorMessage
      })
      .eq('city_id', cityId)

    // Log completion
    await log(supabase, 'bootstrap-city', finalStatus === 'active' ? 'success' : 'warning', 'City bootstrap completed', { 
      city: city_name, 
      status: finalStatus, 
      sources: sourcesAdded, 
      events: eventsSeeded 
    }, { city_id: cityId });
    
    await supabase
      .from('ai_decision_log')
      .insert({
        decision_type: 'city_bootstrap_completed',
        decision_result: finalStatus,
        reasoning: {
          city_id: cityId,
          city_name,
          country,
          sources_added: sourcesAdded,
          events_seeded: eventsSeeded
        },
        ai_model: GEMINI_MODEL,
      })

    return {
      success: finalStatus === 'active',
      city_id: cityId,
      sources_added: sourcesAdded,
      events_seeded: eventsSeeded,
      error: errorMessage || undefined
    }

  } catch (error) {
    // Update city status to failed
    if (cityId) {
      await supabase
        .from('city_configs')
        .update({
          bootstrap_status: 'failed',
          bootstrap_error: error.message
        })
        .eq('city_id', cityId)
    }

    throw error
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

    const request: CityBootstrapRequest = await req.json()

    if (!request.city_name || !request.country) {
      return new Response(
        JSON.stringify({ error: 'city_name and country are required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    const result = await bootstrapCity(supabaseClient, request)

    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.success
          ? `✅ City ${request.city_name} bootstrapped successfully!`
          : `⚠️ City bootstrap completed with warnings`,
        ...result,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 206,
      }
    )
  } catch (error) {
    console.error('Error in bootstrap-city:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
