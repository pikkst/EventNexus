// Edge Function: check-online-event-access
// Validates user access to online/hybrid events before showing stream

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AccessRequest {
  eventId: string;
  markTicketUsed?: boolean; // Optional: mark ticket as used when joining stream
}

interface AccessResponse {
  hasAccess: boolean;
  reason?: string;
  canJoin: boolean;
  currentViewers?: number;
  maxViewers?: number;
  ticketInfo?: {
    id: string;
    type: string;
    used: boolean;
  };
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          hasAccess: false,
          canJoin: false,
          reason: 'AUTHENTICATION_REQUIRED',
          message: 'Please sign in to access this event',
        } as AccessResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          hasAccess: false,
          canJoin: false,
          reason: 'INVALID_TOKEN',
          message: 'Authentication failed',
        } as AccessResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { eventId, markTicketUsed = false }: AccessRequest = await req.json();

    if (!eventId) {
      return new Response(
        JSON.stringify({
          hasAccess: false,
          canJoin: false,
          reason: 'INVALID_REQUEST',
          message: 'Event ID is required',
        } as AccessResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Step 1: Check if user has access to the event
    const { data: hasAccessData, error: accessError } = await supabase.rpc(
      'has_online_event_access',
      {
        p_event_id: eventId,
        p_user_id: user.id,
      }
    );

    if (accessError) {
      console.error('Access check error:', accessError);
      return new Response(
        JSON.stringify({
          hasAccess: false,
          canJoin: false,
          reason: 'ACCESS_CHECK_FAILED',
          message: 'Failed to verify access',
        } as AccessResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!hasAccessData) {
      return new Response(
        JSON.stringify({
          hasAccess: false,
          canJoin: false,
          reason: 'NO_TICKET',
          message: 'You need a valid ticket to access this event',
        } as AccessResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Step 2: Check event capacity
    const { data: capacityData, error: capacityError } = await supabase.rpc(
      'check_online_event_capacity',
      {
        p_event_id: eventId,
      }
    );

    if (capacityError) {
      console.error('Capacity check error:', capacityError);
    }

    const capacity = capacityData?.[0];
    if (capacity && !capacity.can_join) {
      return new Response(
        JSON.stringify({
          hasAccess: true,
          canJoin: false,
          reason: 'CAPACITY_REACHED',
          message: `Event is at maximum capacity (${capacity.current_viewers}/${capacity.max_viewers} viewers)`,
          currentViewers: capacity.current_viewers,
          maxViewers: capacity.max_viewers,
        } as AccessResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // Step 3: Mark ticket as used if requested (when user actually joins)
    let ticketInfo = null;
    if (markTicketUsed) {
      const { data: ticketData, error: ticketError } = await supabase.rpc(
        'use_online_event_ticket',
        {
          p_event_id: eventId,
          p_user_id: user.id,
        }
      );

      if (ticketError) {
        console.error('Ticket marking error:', ticketError);
      }

      const ticketResult = ticketData?.[0];
      if (ticketResult && ticketResult.success) {
        ticketInfo = {
          id: ticketResult.ticket_id,
          type: 'online',
          used: true,
        };
      }
    }

    // Step 4: Create viewer session
    const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { error: sessionError } = await supabase.from('live_stream_sessions').insert({
      event_id: eventId,
      user_id: user.id,
      session_token: sessionToken,
      is_active: true,
    });

    if (sessionError) {
      console.error('Session creation error:', sessionError);
    }

    // Success response
    return new Response(
      JSON.stringify({
        hasAccess: true,
        canJoin: true,
        reason: 'ACCESS_GRANTED',
        message: 'Welcome to the stream!',
        currentViewers: capacity?.current_viewers || 0,
        maxViewers: capacity?.max_viewers || null,
        ticketInfo,
      } as AccessResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in check-online-event-access:', error);
    return new Response(
      JSON.stringify({
        hasAccess: false,
        canJoin: false,
        reason: 'SERVER_ERROR',
        message: error.message || 'An unexpected error occurred',
      } as AccessResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
