import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    )

    const { user_id } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Fetch user tickets
    const { data: tickets, error: ticketsError } = await supabaseClient
      .from('tickets')
      .select('*')
      .eq('user_id', user_id)
      .order('purchased_at', { ascending: false })

    if (ticketsError) {
      throw ticketsError
    }

    // Get unique event IDs
    const eventIds = [...new Set(tickets.map(t => t.event_id))]

    // Fetch events
    const { data: events, error: eventsError } = await supabaseClient
      .from('events')
      .select('*')
      .in('id', eventIds)

    if (eventsError) {
      throw eventsError
    }

    return new Response(
      JSON.stringify({
        tickets: tickets || [],
        events: events || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
