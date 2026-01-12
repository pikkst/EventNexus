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
  
  // Build language-specific queries based on country - PRIORITIZE FREE EVENTS
  const getLocalizedQueries = (city: string, country: string) => {
    const countryLower = country.toLowerCase();
    
    // ⭐ PRIORITY: Free-specific queries FIRST (reduced to 5 to avoid 150s Edge Function timeout)
    const freeQueries = [
      `${city} free events`,
      `${city} free activities`,
      `${city} public library events`,
      `${city} community center calendar`,
      `${city} free admission events`,
    ];
    
    // Secondary: General event sources (reduced to 3 to avoid timeout)
    const secondaryQueries = [
      `${city} ${country} events calendar`,
      `${city} ${country} what's on`,
      `${city} ${country} events RSS feed`,
    ];
    
    // Language-specific FREE event queries
    if (countryLower.includes('netherland') || countryLower.includes('dutch') || countryLower.includes('belgium')) {
      return [...freeQueries,
        `${city} gratis evenementen`, // Dutch: free events
        `${city} gratis activiteiten`, // Dutch: free activities
        `${city} kosteloze evenementen`, // Dutch: free events (alt)
        ...secondaryQueries,
        `${city} evenementenkalender`, // Dutch: events calendar
      ];
    } else if (countryLower.includes('german') || countryLower.includes('austria') || countryLower.includes('switzerland')) {
      return [...freeQueries,
        `${city} kostenlose Veranstaltungen`, // German: free events
        `${city} gratis Events`, // German: free events (alt)
        ...secondaryQueries,
        `${city} Veranstaltungskalender`, // German: events calendar
      ];
    } else if (countryLower.includes('eston')) {
      return [...freeQueries,
        `${city} tasuta üritused`, // Estonian: free events
        `${city} üritused`, // Estonian: events
        `${city} sündmused`, // Estonian: events (alt)
        `${city} kultuurikalender`, // Estonian: culture calendar
        `site:${city.toLowerCase()}.ee üritused`,
        ...secondaryQueries,
      ];
    } else if (countryLower.includes('finn')) {
      return [...freeQueries,
        `${city} ilmaiset tapahtumat`, // Finnish: free events
        ...secondaryQueries,
        `${city} tapahtumakalenteri`, // Finnish: events calendar
      ];
    } else if (countryLower.includes('fran') || countryLower.includes('belg')) {
      return [...freeQueries,
        `${city} événements gratuits`, // French: free events
        `${city} activités gratuites`, // French: free activities
        ...secondaryQueries,
        `${city} calendrier événements`, // French: events calendar
      ];
    } else {
      return [...freeQueries, ...secondaryQueries]; // English free + general
    }
  };
  
  const queries = getLocalizedQueries(cityName, country)

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
                                   'guidelines', 'handbook', 'manual', 'documentation', 'wikipedia.org',
                                   'reddit.com', 'twitter.com', 'linkedin.com', 'instagram.com',
                                   'pbs.org', 'hrw.org', 'theguardian.com', 'hurriyetdailynews.com']; // Add news sites
        const irrelevantKeywords = ['documentation', 'tutorial', 'how to', 'guide', 'reference', 
                                    'weather', 'forecast', 'temperature', 'tracking software', 'guidelines',
                                    'api reference', 'stats api', 'booking system', 'event space rental',
                                    'venue rental', 'rent our space', 'book our venue', 'parking', 'policy',
                                    'benefits booklet', 'job posting', 'career', 'employment', 'tender',
                                    'media release', 'press release', 'news archive', 'reports', 'publications',
                                    'ban on', 'court ruling', 'human rights', 'course registration', 
                                    'student activities course', 'etk301', 'regarding the']; // News/academic content
        const irrelevantPaths = ['/guidelines/', '/docs/', '/api-docs/', '/handbook/', '/manual/', '/event-space/', '/venue-rental/',
                                 '/news/', '/article/', '/world/', '/newshour/']; // News paths
        
        // STRICT: Single event pages (not calendars)
        const isSingleEvent = /\/(event|events?)\/\d+\/|\/\d{4}\/\d{2}\/\d{2}\/|junior-grand-prix-\w+-\d{4}|\/season\d+/i.test(itemUrl)
        
        const isIrrelevantDomain = irrelevantDomains.some(domain => displayLink.includes(domain) || itemUrl.includes(domain));
        const isIrrelevantContent = irrelevantKeywords.some(kw => itemTitle.includes(kw) || itemSnippet.includes(kw));
        const isIrrelevantPath = irrelevantPaths.some(path => itemUrl.includes(path));
        
        // STRICT: Filter out if wrong country/city (e.g., Tartu College in Canada, not Estonia)
        // Block .ca, .us, .au domains for Estonian cities
        const wrongCountry = (country === 'Estonia' && (itemUrl.includes('.ca') || itemUrl.includes('.us') || itemUrl.includes('.au') || displayLink.includes('.ca')));
        
        if (isIrrelevantDomain || isIrrelevantContent || isIrrelevantPath || wrongCountry || isSingleEvent) {
          const reason = wrongCountry ? 'wrong country' : isSingleEvent ? 'single event' : 'irrelevant'
          console.log(`   Filtered out ${reason}: ${item.title}`)
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

  const prompt = `You are an EXPERT at finding EXCLUSIVELY FREE event sources. Your goal: find 15-20 sources that list ONLY or PRIMARILY free events.

CRITICAL: ${cityName}, ${country} must have at least 5 FREE events published. Find sources with HIGH FREE event density.

Return ONLY valid JSON array:
[
  {
    "name": "Source Name - emphasize FREE",
    "url": "https://exact-event-calendar-url.com",
    "type": "html" or "rss" or "api" or "ical",
    "source_score": 0.95,
    "description": "Why this has free events"
  }
]

**MANDATORY TARGETS (find ALL that exist):**
1. **"Free Events [City]" aggregator sites** - HIGHEST PRIORITY
   Examples: "Free Events Springfield", "${cityName} Free Things To Do"
2. **Public Library websites** - "${cityName} public library events" (usually 100% free)
3. **Community Center calendars** - "${cityName} community center calendar"
4. **City Parks & Recreation** - "${cityName} parks events" (concerts, sports)
5. **University event calendars** - "${cityName} university public events" (lectures, seminars)
6. **Public museums** - "${cityName} museum free days", "free admission"
7. **Cultural centers/foundations** - Free art events, performances
8. **City/municipal "Free Events" pages** - Official tourism/culture free calendars
9. **Church/community hall events** - Usually free community gatherings
10. **Local Facebook Events pages** - ONLY if RSS/API with free filter exists

**LOCALIZED SEARCH (use native language):**
${country.toLowerCase().includes('netherland') || country.toLowerCase().includes('belgium') ? `
- "${cityName} gratis evenementen"
- "${cityName} gratis activiteiten"
- "${cityName} kosteloze evenementen"
` : ''}
${country.toLowerCase().includes('german') || country.toLowerCase().includes('austria') || country.toLowerCase().includes('switzerland') ? `
- "${cityName} kostenlose Veranstaltungen"
- "${cityName} gratis Events"
` : ''}
${country.toLowerCase().includes('eston') ? `
- "${cityName} tasuta üritused"
- "${cityName} kultuurikalender"
- "site:${cityName.toLowerCase()}.ee üritused"
` : ''}
${country.toLowerCase().includes('finn') ? `
- "${cityName} ilmaiset tapahtumat"
- "${cityName} tapahtumakalenteri"
` : ''}
${country.toLowerCase().includes('fran') || country.toLowerCase().includes('belg') ? `
- "${cityName} événements gratuits"
- "${cityName} activités gratuites"
` : ''}
- "${cityName} free events"
- "${cityName} free activities"

**RULES:**
- URLs must go to ACTUAL event calendar pages (not homepages!)
- Prefer RSS/iCal feeds when available
- Score 0.9+ for "free-only" sites, 0.7+ for "mostly free"
- AVOID: Ticketmaster, Eventbrite, Meetup (unless free filter URL)
- Include ALL relevant sources found (aim for 15-20)

Return 15-20 sources, sorted by free event concentration (highest first).
NO explanations, NO markdown, ONLY JSON array.`

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

async function validateSource(url: string, cityName: string): Promise<{ valid: boolean; hasEvents: boolean; score: number }> {
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
    
    if (response.status < 200 || response.status >= 400) {
      console.log(`Source ${url} validation: ${response.status} - INVALID`)
      return { valid: false, hasEvents: false, score: 0 }
    }
    
    // 🧠 SMART CHECK: Analyze page content to see if it ACTUALLY has events
    const html = await response.text()
    const contentPreview = html.slice(0, 5000) // First 5KB
    
    // Quick heuristics for event calendars
    const hasCalendarStructure = /class=["']?event|class=["']?calendar|<article|<event/i.test(contentPreview)
    const hasDatePatterns = /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|jaanuar|veebruar|märts|aprill|mai|juuni|juuli|august|september|oktoober|november|detsember)\b/i.test(contentPreview)
    const hasEventKeywords = /(event|üritused|sündmused|kalender|calendar|what's on|happening|concert|kontsert|festival|näitus|exhibition)/i.test(contentPreview)
    const hasEventListStructure = /(event-list|events-grid|calendar-grid|ürituste-kalender)/i.test(contentPreview)
    
    // RED FLAGS: Single event pages, venue rentals, policy documents
    const isSingleEvent = /single[-_]event|event[-_]id=\d+|\/events?\/\d+\/[a-z0-9-]+$/i.test(url) // Allow /events/ but not /events/123/slug
    const isVenueRental = /(book our venue|rent our space|venue rental|facility rental|room booking)/i.test(contentPreview)
    const isPolicyDoc = /(policy|guidelines|handbook|manual|bylaw|regulation).*?(pdf|document)/i.test(contentPreview + url)
    const isNewArchive = /(news|media release|press release|archive|articles)/i.test(contentPreview)
    const isParkingPage = /(parking rates|parking fees|parking information)/i.test(contentPreview)
    
    // Calculate smart score (balanced approach)
    let score = 0.4 // Lower baseline to allow genuine calendars
    if (hasCalendarStructure) score += 0.25
    if (hasEventListStructure) score += 0.2
    if (hasDatePatterns && hasEventKeywords) score += 0.3
    if (hasEventKeywords) score += 0.15
    if (url.includes('/events') || url.includes('/uritused') || url.includes('/kalender')) score += 0.1
    
    // Penalties
    if (isSingleEvent) score -= 0.5 // Major penalty for single events
    if (isVenueRental) score -= 0.6 // Not an event calendar
    if (isPolicyDoc) score -= 0.7 // Definitely not events
    if (isNewArchive) score -= 0.4 // News, not events
    if (isParkingPage) score -= 0.7 // Parking info
    
    const hasEvents = score > 0.2 // Lower threshold - 0.3 was too strict
    console.log(`Source ${url} validation: 200 - ${hasEvents ? 'HAS EVENTS' : 'NO EVENTS'} (score: ${score.toFixed(2)})`)
    
    return { 
      valid: true, 
      hasEvents, 
      score: Math.max(0, Math.min(1, score)) 
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.log(`Source validation error for ${url}: ${errorMsg}`)
    // If fetch fails, still try - might be temporarily unavailable
    return { valid: true, hasEvents: true, score: 0.5 }
  }
}

async function bootstrapCity(
  supabase: any,
  request: CityBootstrapRequest
): Promise<{ success: boolean; city_id: string; sources_added: number; events_seeded: number; error?: string }> {
  
  const { city_name, country, languages = ['en'], auto_discover = true, seed_events = true } = request
  let timezone = request.timezone || 'UTC' // Default to UTC if not provided
  
  let cityId = request.city_id  // Define at function scope

  try {
    // 0. Auto-detect timezone from coordinates if not provided
    if (!request.timezone) {
      console.log(`🌍 Auto-detecting timezone for ${city_name}, ${country}...`)
      
      // Geocode city to get coordinates
      try {
        const geocodeResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city_name + ', ' + country)}&limit=1`,
          {
            headers: {
              'User-Agent': 'EventNexus/1.0 (https://www.eventnexus.eu)',
              'Accept-Language': 'en'
            }
          }
        )
        
        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json()
          if (geocodeData && geocodeData.length > 0) {
            const lat = parseFloat(geocodeData[0].lat)
            const lng = parseFloat(geocodeData[0].lon)
            
            console.log(`   Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
            
            // Get timezone from coordinates using timeapi.io (free)
            await new Promise(resolve => setTimeout(resolve, 1100)) // Rate limit
            
            const timezoneResponse = await fetch(
              `https://timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lng}`,
              {
                headers: { 'Accept': 'application/json' }
              }
            )
            
            if (timezoneResponse.ok) {
              const timezoneData = await timezoneResponse.json()
              if (timezoneData && timezoneData.timeZone) {
                timezone = timezoneData.timeZone
                console.log(`   ✅ Auto-detected timezone: ${timezone}`)
              }
            }
          }
        }
      } catch (tzError) {
        console.error('Timezone auto-detection failed, using UTC:', tzError)
        timezone = 'UTC'
      }
    }
    
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
        // 🧠 Validate source with smart content analysis
        const validation = await validateSource(source.url, city_name)

        if (validation.valid && validation.hasEvents) {
          // Convert source_score from 0-1 to 0-100 scale, then apply validation boost
          const baseScore = (source.source_score || 0.5) * 100 // Convert 0.0-1.0 → 0-100
          const validationBoost = validation.score * 20 // Max +20 points for perfect validation
          const adjustedScore = Math.round(Math.min(100, baseScore + validationBoost))
          
          // Use upsert with onConflict to handle duplicates gracefully
          const { data: upsertedSource, error: sourceError } = await supabase
            .from('event_sources')
            .upsert({
              city_id: cityId,
              name: source.name,
              type: source.type,
              url: source.url,
              source_score: Math.round(adjustedScore),
              active: true,
            }, {
              onConflict: 'city_id,url', // Handle duplicate (city_id, url) pairs
              ignoreDuplicates: false // Update if exists
            })
            .select()

          if (sourceError) {
            // Only log if not a duplicate error (should not happen with upsert)
            if (!sourceError.message?.includes('duplicate')) {
              console.error(`  ❌ Failed to upsert source ${source.name}:`, sourceError)
            }
          } else if (upsertedSource && upsertedSource.length > 0) {
            console.log(`  ✅ Added/Updated source: ${source.name} (score: ${Math.round(adjustedScore)})`)
            sourcesAdded++
          }
        } else if (!validation.hasEvents) {
          console.log(`  ⏭️ Skipping non-event page: ${source.url} (score: ${validation.score.toFixed(2)})`)
        } else {
          console.log(`  ⏭️ Skipping invalid source: ${source.url}`)
        }
      }
      
      console.log(`📋 Total sources added: ${sourcesAdded}`)
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
        bootstrap_error: errorMessage,
        last_bootstrap_at: new Date().toISOString()
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

    const request: CityBootstrapRequest = await req.json().catch(() => ({}))

    // 🔧 AUTO-BOOTSTRAP MODE: Process queue if no specific city provided
    if (!request.city_name && !request.city_id) {
      console.log('🤖 Auto-bootstrap mode: checking queue...')
      
      const { data: nextJob, error: queueError } = await supabaseClient
        .rpc('get_next_bootstrap_job')
        .single()
      
      if (queueError || !nextJob) {
        console.log('📭 No cities in bootstrap queue')
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'No cities pending bootstrap',
            queued: 0 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }
      
      console.log(`🚀 Processing queued bootstrap for: ${nextJob.city_name} (${nextJob.city_id})`)
      
      // 🔧 Use city data from queue (no race condition)
      // Queue already has city_name and country stored
      
      // Bootstrap this city
      try {
        const result = await bootstrapCity(supabaseClient, {
          city_id: nextJob.city_id,
          city_name: nextJob.city_name,
          country: nextJob.country,
          auto_discover: true,
          seed_events: true
        })
        
        // Mark as complete
        await supabaseClient.rpc('mark_bootstrap_complete', {
          p_city_id: nextJob.city_id,
          p_sources_found: result.sources_inserted
        })
        
        console.log(`✅ Auto-bootstrap completed for ${nextJob.city_name}: ${result.sources_inserted} sources`)
        
        return new Response(
          JSON.stringify({
            success: true,
            message: `City ${nextJob.city_name} bootstrapped successfully`,
            ...result
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      } catch (bootstrapError) {
        console.error(`❌ Bootstrap failed for ${nextJob.city_name}:`, bootstrapError)
        await supabaseClient.rpc('mark_bootstrap_failed', {
          p_city_id: nextJob.city_id,
          p_error: bootstrapError.message
        })
        throw bootstrapError
      }
    }

    // MANUAL MODE: Bootstrap specific city
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
