// Ticket Validation Edge Function
// Validates ticket QR codes and updates ticket status

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValidationRequest {
  ticketId?: string
  qrCode?: string
}

const parseQrPayload = (raw?: string) => {
  if (!raw) return { cleaned: '', ticketId: null }
  const cleaned = raw.trim()
  if (cleaned.startsWith('ENX-')) {
    const parts = cleaned.split('-')
    if (parts.length >= 3 && parts[1]) {
      return { cleaned, ticketId: parts[1] }
    }
  }
  return { cleaned, ticketId: null }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'Missing authorization header',
          message: 'Please sign in to scan tickets'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    console.log('Edge function config:', {
      url: supabaseUrl,
      hasKey: !!supabaseKey,
      hasAuth: !!authHeader
    });

    // Create client with user's JWT for RLS
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify JWT and extract user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    console.log('Auth result:', { 
      hasUser: !!user, 
      userId: user?.id,
      error: authError?.message
    });
    
    if (authError || !user) {
      console.error('Authentication failed:', authError)
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'Authentication failed',
          message: authError?.message || 'Invalid or expired token',
          details: authError
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const { ticketId, qrCode }: ValidationRequest = await req.json()
    const { cleaned, ticketId: parsedFromQr } = parseQrPayload(qrCode)
    const resolvedTicketId = ticketId || parsedFromQr

    if (!resolvedTicketId && !cleaned) {
      throw new Error('Either ticketId or qrCode must be provided')
    }

    // Find ticket by ID or QR code
    let query = supabaseClient
      .from('tickets')
      .select(`
        *,
        event:events(*),
        user:users(id, name, email)
      `)

    if (resolvedTicketId) {
      query = query.eq('id', resolvedTicketId)
    } else if (cleaned) {
      query = query.eq('qr_code', cleaned)
    }

    const { data: ticket, error: ticketError } = await query.single()

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Ticket not found',
          message: 'Invalid ticket ID or QR code'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Ensure organizer relation is loaded even if policies trimmed nested data
    if (!ticket.event?.organizer_id) {
      const { data: eventRow } = await supabaseClient
        .from('events')
        .select('id, organizer_id')
        .eq('id', ticket.event_id)
        .maybeSingle()
      if (eventRow) {
        ticket.event = { ...ticket.event, ...eventRow }
      }
    }

    // Check if ticket is valid
    if (ticket.status === 'used') {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Ticket already used',
          message: `This ticket was already scanned on ${new Date(ticket.used_at).toLocaleString()}`,
          ticket
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (ticket.status === 'cancelled') {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Ticket cancelled',
          message: 'This ticket has been cancelled',
          ticket
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (ticket.status === 'expired') {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Ticket expired',
          message: 'This ticket has expired',
          ticket
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Verify user has permission to scan (event organizer or admin)
    const { data: userProfile } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isOrganizer = ticket.event?.organizer_id === user.id
    const isAdmin = userProfile?.role === 'admin'
    const isTicketOwner = ticket.user_id === user.id

    if (!isOrganizer && !isAdmin && !isTicketOwner) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Unauthorized',
          message: 'You do not have permission to scan this ticket'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const isSelfScan = isTicketOwner && !isOrganizer && !isAdmin

    // Mark ticket as used
    const { data: updatedTicket, error: updateError } = await supabaseClient
      .from('tickets')
      .update({ 
        status: 'used',
        used_at: new Date().toISOString(),
        metadata: {
          ...(ticket.metadata || {}),
          scanned_by: user.id,
          scanned_at: new Date().toISOString(),
          self_scanned: isSelfScan
        }
      })
      .eq('id', ticket.id)
      .select(`
        *,
        event:events(*),
        user:users(id, name, email)
      `)
      .single()

    if (updateError) {
      throw updateError
    }

    // Create notification for ticket owner
    await supabaseClient
      .from('notifications')
      .insert([{
        user_id: ticket.user_id,
        title: 'Ticket Scanned',
        message: isSelfScan
          ? `You scanned your own ticket for "${ticket.event.name}".`
          : `Your ticket for "${ticket.event.name}" has been successfully scanned. Enjoy the event!`,
        type: 'ticket_purchase',
        event_id: ticket.event_id,
        sender_name: 'EventNexus',
        isRead: false
      }])

    return new Response(
      JSON.stringify({ 
        valid: true,
        message: isSelfScan ? 'Self-scan recorded' : 'Ticket validated successfully',
        selfScan: isSelfScan,
        ticket: updatedTicket
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in validate-ticket:', error)
    return new Response(
      JSON.stringify({ 
        valid: false,
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
