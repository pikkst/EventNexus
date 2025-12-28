import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate unique QR code
function generateQRCode(): string {
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 15)
  return `EVNT-${timestamp}-${randomStr}`.toUpperCase()
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

    const { 
      ticket_template_id,
      user_id,
      holder_name,
      holder_email,
      quantity = 1,
      metadata = {}
    } = await req.json()

    if (!ticket_template_id || !user_id || !holder_name || !holder_email) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Missing required parameters: ticket_template_id, user_id, holder_name, holder_email' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Fetch ticket template
    const { data: template, error: templateError } = await supabaseClient
      .from('ticket_templates')
      .select('*')
      .eq('id', ticket_template_id)
      .single()

    if (templateError || !template) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Ticket template not found' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Check if template is active
    if (!template.is_active) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'This ticket type is no longer available' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check sale period
    const now = new Date()
    if (template.sale_start && new Date(template.sale_start) > now) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: `Ticket sales start on ${new Date(template.sale_start).toLocaleString()}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (template.sale_end && new Date(template.sale_end) < now) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Ticket sales have ended' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check availability
    if (template.quantity_available < quantity) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: `Only ${template.quantity_available} tickets available` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create tickets
    const tickets = []
    const ticketIds = []

    for (let i = 0; i < quantity; i++) {
      const qrCode = generateQRCode()
      const ticket = {
        ticket_template_id: template.id,
        event_id: template.event_id,
        user_id: user_id,
        ticket_type: template.type,
        ticket_name: template.name,
        price_paid: template.price,
        qr_code: qrCode,
        status: 'valid',
        purchased_at: new Date().toISOString(),
        holder_name: holder_name,
        holder_email: holder_email,
        metadata: metadata
      }

      const { data: createdTicket, error: ticketError } = await supabaseClient
        .from('tickets')
        .insert(ticket)
        .select()
        .single()

      if (ticketError) {
        console.error('Ticket creation error:', ticketError)
        // Rollback previous tickets if any fail
        if (ticketIds.length > 0) {
          await supabaseClient
            .from('tickets')
            .delete()
            .in('id', ticketIds)
        }
        throw ticketError
      }

      tickets.push(createdTicket)
      ticketIds.push(createdTicket.id)
    }

    // Update template quantities
    const { error: updateError } = await supabaseClient
      .from('ticket_templates')
      .update({
        quantity_available: template.quantity_available - quantity,
        quantity_sold: (template.quantity_sold || 0) + quantity
      })
      .eq('id', template.id)

    if (updateError) {
      console.error('Template update error:', updateError)
      // Rollback tickets
      await supabaseClient
        .from('tickets')
        .delete()
        .in('id', ticketIds)
      throw updateError
    }

    // Update event attendees count
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('attendeesCount')
      .eq('id', template.event_id)
      .single()

    if (!eventError && event) {
      await supabaseClient
        .from('events')
        .update({ attendeesCount: (event.attendeesCount || 0) + quantity })
        .eq('id', template.event_id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully purchased ${quantity} ticket${quantity > 1 ? 's' : ''}`,
        tickets: tickets,
        total_amount: template.price * quantity
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        message: error.message || 'Failed to purchase ticket'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
