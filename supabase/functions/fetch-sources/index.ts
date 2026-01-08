// AI Agent: Source Watcher Service
// Fetches raw content from configured public event sources

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper: Generate SHA-256 hash using Web Crypto API
async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Helper: Fetch content from source
async function fetchSourceContent(source: any): Promise<string> {
  const response = await fetch(source.url, {
    headers: source.headers as Record<string, string> || {},
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return await response.text()
}

interface EventSource {
  id: string
  city_id: string
  name: string
  type: 'api' | 'rss' | 'html' | 'ical'
  url: string
  source_score: number
  headers?: Record<string, string>
  auth_config?: Record<string, string>
}

async function fetchSourceContent(source: EventSource): Promise<string> {
  const headers: HeadersInit = {
    'User-Agent': 'EventNexus-Bot/1.0 (https://www.eventnexus.eu)',
    ...source.headers,
  }

  const response = await fetch(source.url, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(30000), // 30s timeout
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return await response.text()
}

function generateContentHash(content: string): string {
  const hash = createHash('sha256')
  hash.update(content)
  return hash.toString()
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

    const { city_id } = await req.json()

    // Get active sources for city (or all if no city specified)
    let query = supabaseClient
      .from('event_sources')
      .select('*')
      .eq('active', true)

    if (city_id) {
      query = query.eq('city_id', city_id)
    }

    const { data: sources, error: sourcesError } = await query

    if (sourcesError) throw sourcesError

    const results = {
      fetched: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const source of sources) {
      try {
        console.log(`Fetching source: ${source.name} (${source.url})`)

        const content = await fetchSourceContent(source)
        const contentHash = generateContentHash(content)

        // Check if content already exists (unchanged)
        const { data: existing } = await supabaseClient
          .from('raw_events')
          .select('id')
          .eq('source_id', source.id)
          .eq('content_hash', contentHash)
          .single()

        if (existing) {
          console.log(`Skipping ${source.name}: content unchanged`)
          results.skipped++
          continue
        }

        // Store raw content
        const { error: insertError } = await supabaseClient
          .from('raw_events')
          .insert({
            source_id: source.id,
            raw_content: content,
            content_hash: contentHash,
            processing_status: 'pending',
          })

        if (insertError) throw insertError

        // Update source last_fetched_at
        await supabaseClient
          .from('event_sources')
          .update({
            last_fetched_at: new Date().toISOString(),
            last_success_at: new Date().toISOString(),
            failure_count: 0,
          })
          .eq('id', source.id)

        results.fetched++
      } catch (error) {
        console.error(`Failed to fetch ${source.name}:`, error)
        results.failed++
        results.errors.push(`${source.name}: ${error.message}`)

        // Update failure count
        await supabaseClient
          .from('event_sources')
          .update({
            last_fetched_at: new Date().toISOString(),
            failure_count: source.failure_count + 1,
          })
          .eq('id', source.id)
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
    console.error('Error in fetch-sources:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
