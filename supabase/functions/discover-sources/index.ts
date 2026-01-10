// discover-sources Edge Function
// Discovers new public event sources for a city using AI + heuristics
// Called when city is degraded or has no active sources

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const GEMINI_API_KEY = Deno.env.get('API_KEY') || Deno.env.get('GEMINI_API_KEY')

interface DiscoveredSource {
  name: string
  url: string
  type: string
  confidence: number
  description?: string
}

serve(async (req) => {
  try {
    const { city_id } = await req.json()

    if (!city_id) {
      return new Response(JSON.stringify({ error: 'city_id missing' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`🔍 Discovering sources for city: ${city_id}`)

    // 1️⃣ Fetch city info
    const { data: city, error: cityError } = await supabase
      .from('city_configs')
      .select('city_id, city_name, country, languages')
      .eq('city_id', city_id)
      .single()

    if (cityError || !city) {
      return new Response(JSON.stringify({ error: 'City not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const languages = (city.languages && city.languages.length > 0) 
      ? city.languages.join(', ') 
      : 'English'

    // 2️⃣ Ask Gemini to suggest public event sources
    const prompt = `You are an expert at discovering public event listing websites and resources.

City: ${city.city_name}, ${city.country}
Languages: ${languages}

Task: Find legitimate, publicly accessible event listing websites and resources for this city.

Rules:
- Only public websites (no login required)
- Prefer official city/cultural institution websites
- Include Eventbrite, Meetup, Facebook Events search results
- Include local tourism boards and cultural calendars
- Include Wikipedia events, local radio/TV event listings
- Exclude paywalls, subscription-only, or private social media
- Output MUST be valid JSON array

Return a JSON array with exactly this structure (no other text):
[
  {
    "name": "Official Website Name",
    "url": "https://example.com/events",
    "type": "html",
    "confidence": 0.85,
    "description": "Brief description of what this source provides"
  }
]

Be thorough. Return 5-15 sources maximum, ranked by quality and reliability.`

    console.log(`📡 Querying Gemini for ${city.city_name}...`)

    const aiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' +
        GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2000 }
        })
      }
    )

    if (!aiResponse.ok) {
      const errorData = await aiResponse.text()
      console.error('Gemini API error:', errorData)
      throw new Error(`Gemini API error: ${aiResponse.status}`)
    }

    const result = await aiResponse.json()

    // 3️⃣ Parse AI response (defensive parsing)
    let sources: DiscoveredSource[] = []

    try {
      const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || ''

      // Extract JSON array from response (may contain markdown)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        sources = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON array found in response')
      }

      console.log(`✅ Gemini found ${sources.length} potential sources`)
    } catch (parseError) {
      console.warn('Failed to parse Gemini response:', parseError)
      // Fall back to manual known sources
      sources = []
    }

    // 4️⃣ Filter and validate sources
    const validSources = sources.filter((src) => {
      return (
        src.name &&
        src.url &&
        src.type &&
        typeof src.confidence === 'number' &&
        src.confidence >= 0.6 &&
        src.url.startsWith('http')
      )
    })

    if (validSources.length === 0) {
      console.warn(`⚠️ No valid sources discovered for ${city.city_name}`)
      return new Response(
        JSON.stringify({
          city: city.city_name,
          discovered_sources: 0,
          message: 'No valid sources found'
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 5️⃣ Insert validated sources (idempotent)
    let inserted = 0
    const insertedSources = []

    for (const src of validSources) {
      // Check if source already exists
      const { data: exists } = await supabase
        .from('event_sources')
        .select('id')
        .eq('city_id', city.city_id)
        .eq('url', src.url)
        .maybeSingle()

      if (!exists) {
        const { error: insertError } = await supabase
          .from('event_sources')
          .insert({
            city_id: city.city_id,
            name: src.name,
            url: src.url,
            type: src.type || 'html',
            source_score: src.confidence,
            active: true,
            discovered_by: 'ai',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (!insertError) {
          inserted++
          insertedSources.push({
            name: src.name,
            url: src.url,
            confidence: src.confidence
          })
          console.log(`✅ Inserted source: ${src.name}`)
        } else {
          console.warn(`⚠️ Failed to insert ${src.name}:`, insertError)
        }
      } else {
        console.log(`ℹ️ Source already exists: ${src.name}`)
      }
    }

    // 6️⃣ Update city state if sources were found
    if (inserted > 0) {
      await supabase
        .from('city_configs')
        .update({
          state: 'ACTIVE',
          updated_at: new Date().toISOString()
        })
        .eq('city_id', city.city_id)

      console.log(`🟢 City ${city.city_name} transitioned to ACTIVE`)
    }

    return new Response(
      JSON.stringify({
        status: 'ok',
        city: city.city_name,
        discovered_sources: inserted,
        sources: insertedSources
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('discover-sources error:', err)
    return new Response(
      JSON.stringify({ error: 'Discovery failed', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
