// AI Agent: Source Watcher Service
// Fetches raw content from configured public event sources (with JavaScript rendering support)

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import puppeteer from 'https://deno.land/x/puppeteer@16.2.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper: Sanitize content - remove NULL bytes and invalid Unicode
function sanitizeContent(content: string): string {
  // Remove NULL bytes (\u0000) that PostgreSQL can't handle
  // Also remove other problematic control characters
  return content
    .replace(/\u0000/g, '') // Remove NULL bytes
    .replace(/[\u0001-\u0008\u000B-\u000C\u000E-\u001F]/g, '') // Remove other control chars (except \n, \r, \t)
    .trim()
}

// Helper: Generate SHA-256 hash using Web Crypto API
async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
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

// Helper: Fetch content from source (with optional JavaScript rendering)
async function fetchSourceContent(source: EventSource, useJavaScript = false): Promise<string> {
  // Try JavaScript rendering for HTML sources if requested
  if (useJavaScript && source.type === 'html') {
    try {
      console.log(`🎭 Rendering ${source.url} with JavaScript...`)
      
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      })
      
      const page = await browser.newPage()
      
      // Set user agent
      await page.setUserAgent('EventNexus-Bot/1.0 (https://www.eventnexus.eu)')
      
      // Navigate and wait for network to be idle (events loaded)
      await page.goto(source.url, {
        waitUntil: 'networkidle2',
        timeout: 45000, // 45s timeout for JS-heavy pages
      })
      
      // Wait extra 2 seconds for any lazy-loaded content
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Get fully rendered HTML
      const content = await page.content()
      
      await browser.close()
      
      console.log(`✅ JS-rendered content: ${content.length} chars`)
      return content
      
    } catch (jsError) {
      console.warn(`⚠️ JavaScript rendering failed for ${source.url}:`, jsError.message)
      console.log(`📄 Falling back to static fetch...`)
      // Fall back to static fetch below
    }
  }
  
  // Standard static fetch (no JavaScript)
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { city_id, batch_size = 5, batch_offset = 0 } = await req.json()

    // Get active sources for city (or all if no city specified)
    // Process in batches to avoid timeout (default: 5 sources at a time)
    let query = supabaseClient
      .from('event_sources')
      .select('*')
      .eq('active', true)
      .range(batch_offset, batch_offset + batch_size - 1)

    if (city_id) {
      query = query.eq('city_id', city_id)
    }

    const { data: sources, error: sourcesError } = await query

    if (sourcesError) throw sourcesError

    console.log(`📦 Processing batch: offset ${batch_offset}, size ${batch_size}, found ${sources?.length || 0} sources`)

    const results = {
      fetched: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
      batch_info: {
        offset: batch_offset,
        size: batch_size,
        processed: sources?.length || 0,
        has_more: (sources?.length || 0) === batch_size
      }
    }

    for (const source of sources) {
      try {
        console.log(`Fetching source: ${source.name} (${source.url})`)

        // Step 1: Try static fetch first
        let rawContent = await fetchSourceContent(source, false)
        let content = sanitizeContent(rawContent)
        
        // Step 2: Detect if page needs JavaScript (very small content or no event keywords)
        const needsJavaScript = source.type === 'html' && (
          content.length < 2000 || // Suspiciously small HTML (likely empty shell)
          (!content.includes('event') && 
           !content.includes('Event') &&
           !content.includes('üritused') &&
           !content.includes('Sündmused') &&
           !content.includes('calendar') &&
           !content.includes('kalender'))
        )
        
        if (needsJavaScript) {
          console.log(`🔍 Small/empty content detected (${content.length} chars), trying JavaScript rendering...`)
          const jsContent = await fetchSourceContent(source, true)
          const jsContentCleaned = sanitizeContent(jsContent)
          
          // Use JS-rendered content if it's significantly larger (has actual events)
          if (jsContentCleaned.length > content.length * 1.5) {
            console.log(`✅ JavaScript rendering successful: ${content.length} → ${jsContentCleaned.length} chars`)
            content = jsContentCleaned
          } else {
            console.log(`⚠️ JavaScript rendering didn't improve content, keeping static version`)
          }
        }
        
        const contentHash = await generateContentHash(content)

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
