// AI Agent: Archive Expired Events
// Automatically archives events after their end time has passed

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const now = new Date().toISOString()
    
    console.log(`🗄️ Archiving expired events (after: ${now})`)

    // Find all active events where end time has passed
    // Events have `date` (YYYY-MM-DD) and `time` (HH:MM:SS) fields
    const { data: expiredEvents, error: fetchError } = await supabaseClient
      .from('events')
      .select('id, name, date, time, end_time')
      .eq('status', 'active')
      .lt('date', now.split('T')[0]) // Date before today

    if (fetchError) {
      console.error('Failed to fetch expired events:', fetchError)
      throw fetchError
    }

    if (!expiredEvents || expiredEvents.length === 0) {
      console.log('✅ No expired events found')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No expired events',
          archived: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Filter events that have truly ended (check time too)
    const toArchive = expiredEvents.filter(event => {
      const eventDateTime = new Date(`${event.date}T${event.time || '23:59:59'}`)
      const hasEnded = eventDateTime < new Date()
      
      if (hasEnded) {
        console.log(`  ⏰ Archiving: ${event.name} (ended: ${event.date} ${event.time || ''})`)
      }
      
      return hasEnded
    })

    if (toArchive.length === 0) {
      console.log('✅ No events have fully ended yet')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No events to archive',
          archived: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Archive events by setting status to 'archived'
    const eventIds = toArchive.map(e => e.id)
    
    const { error: updateError } = await supabaseClient
      .from('events')
      .update({ 
        status: 'archived',
        archived_at: now
      })
      .in('id', eventIds)

    if (updateError) {
      console.error('Failed to archive events:', updateError)
      throw updateError
    }

    // Log decision for each archived event
    for (const event of toArchive) {
      await supabaseClient
        .from('ai_decision_log')
        .insert({
          decision_type: 'archive_expired',
          ai_model: 'system_cron',
          confidence_score: 100,
          reasoning: `Event ended on ${event.date} at ${event.time || '23:59'}. Automatically archived.`,
          input_data: { event_id: event.id, event_name: event.name },
          output_data: { status: 'archived', archived_at: now }
        })
    }

    console.log(`✅ Archived ${toArchive.length} expired events`)

    return new Response(
      JSON.stringify({
        success: true,
        archived: toArchive.length,
        events: toArchive.map(e => ({ id: e.id, name: e.name, ended: `${e.date} ${e.time}` }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Archive job failed:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
