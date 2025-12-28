import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
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

    const { qr_code, event_id, verifier_id } = await req.json()

    if (!qr_code || !event_id || !verifier_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Missing required parameters: qr_code, event_id, verifier_id' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Find ticket by QR code
    const { data: ticket, error: ticketError } = await supabaseClient
      .from('tickets')
      .select('*')
      .eq('qr_code', qr_code)
      .eq('event_id', event_id)
      .single()

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid ticket or QR code not found for this event' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Check ticket status
    if (ticket.status === 'used') {
      return new Response(
        JSON.stringify({ 
          success: false,
          warning: true,
          message: `Ticket already used at ${new Date(ticket.used_at).toLocaleString()}`,
          ticket: ticket
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (ticket.status === 'cancelled') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'This ticket has been cancelled' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (ticket.status === 'refunded') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'This ticket has been refunded' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (ticket.status === 'expired') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'This ticket has expired' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Verify event organizer
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('organizerId')
      .eq('id', event_id)
      .single()

    if (eventError || !event || event.organizerId !== verifier_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Unauthorized: You are not the organizer of this event' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Mark ticket as used
    const now = new Date().toISOString()
    const { error: updateError } = await supabaseClient
      .from('tickets')
      .update({ 
        status: 'used',
        used_at: now,
        verified_by: verifier_id
      })
      .eq('id', ticket.id)

    if (updateError) {
      console.error('Update error:', updateError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Failed to update ticket status' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Log verification
    const { data: verification, error: verificationError } = await supabaseClient
      .from('ticket_verifications')
      .insert({
        ticket_id: ticket.id,
        event_id: event_id,
        verified_by: verifier_id,
        verified_at: now
      })
      .select()
      .single()

    if (verificationError) {
      console.error('Verification log error:', verificationError)
    }

    // Update ticket object with new status
    ticket.status = 'used'
    ticket.used_at = now
    ticket.verified_by = verifier_id

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Ticket verified successfully',
        ticket: ticket,
        verification_id: verification?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || 'Internal server error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
