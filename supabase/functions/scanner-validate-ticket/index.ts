// Edge Function: scanner-validate-ticket
// Validates tickets using a scanner code (no user auth required)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  qrCode?: string;
  scannerCode?: string;
  deviceInfo?: Record<string, unknown>;
}

const parseQrPayload = (raw?: string) => {
  if (!raw) return { cleaned: '', ticketId: null, hash: null };
  const cleaned = raw.trim();
  if (!cleaned.startsWith('ENX-')) return { cleaned, ticketId: null, hash: null };

  const payload = cleaned.substring(4);
  const lastDash = payload.lastIndexOf('-');
  if (lastDash <= 0) return { cleaned, ticketId: null, hash: null };

  const ticketId = payload.substring(0, lastDash);
  const hash = payload.substring(lastDash + 1);
  return { cleaned, ticketId, hash };
};

const hashTicket = async (ticketId: string, eventId: string, userId: string) => {
  const secret = Deno.env.get('TICKET_HASH_SECRET') || 'eventnexus-secret';
  const data = `${ticketId}-${eventId}-${userId}-${secret}`;
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 12);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Missing configuration' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { qrCode, scannerCode, deviceInfo }: ValidationRequest = await req.json();

    if (!scannerCode) {
      return new Response(
        JSON.stringify({ valid: false, error: 'SCANNER_CODE_REQUIRED', message: 'Scanner code is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { cleaned, ticketId, hash } = parseQrPayload(qrCode);
    if (!ticketId || !hash) {
      return new Response(
        JSON.stringify({ valid: false, error: 'INVALID_QR_FORMAT', message: 'Invalid QR code format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate scanner code (case-insensitive)
    const normalizedCode = scannerCode.toUpperCase();
    
    const { data: scannerRow, error: scannerError } = await supabase
      .from('scanner_codes')
      .select('*')
      .eq('code', normalizedCode)
      .eq('is_active', true)
      .maybeSingle();

    if (scannerError || !scannerRow) {
      console.error('Scanner code validation failed:', {
        normalizedCode,
        scannerError: scannerError?.message,
        found: !!scannerRow
      });
      return new Response(
        JSON.stringify({ valid: false, error: 'INVALID_SCANNER_CODE', message: 'Scanner code invalid or inactive' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Check expiration (with null check)
    if (scannerRow.expires_at) {
      const expiresAt = new Date(scannerRow.expires_at);
      const now = new Date();
      
      console.log('Expiration check:', {
        expiresAt: expiresAt.toISOString(),
        now: now.toISOString(),
        isExpired: now > expiresAt
      });
      
      if (now > expiresAt) {
        return new Response(
          JSON.stringify({ valid: false, error: 'SCANNER_CODE_EXPIRED', message: 'Scanner code has expired' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }
    }

    // Load ticket via service role
    const baseSelect = `
      *,
      event:events!tickets_event_id_fkey(id, name, organizer_id, date),
      user:users!tickets_user_id_fkey(id, name, email)
    `;

    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(baseSelect)
      .eq('id', ticketId)
      .maybeSingle();

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({ valid: false, error: 'TICKET_NOT_FOUND', message: 'Ticket not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (ticket.event_id !== scannerRow.event_id) {
      return new Response(
        JSON.stringify({ valid: false, error: 'EVENT_MISMATCH', message: 'Ticket not for this entrance' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const expectedHash = await hashTicket(ticket.id, ticket.event_id, ticket.user_id);
    if (expectedHash !== hash) {
      return new Response(
        JSON.stringify({ valid: false, error: 'HASH_MISMATCH', message: 'QR verification failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (ticket.status === 'cancelled') {
      return new Response(
        JSON.stringify({ valid: false, error: 'TICKET_CANCELLED', message: 'Ticket has been cancelled', ticket }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (ticket.status === 'used') {
      return new Response(
        JSON.stringify({ valid: false, error: 'TICKET_USED', message: 'Ticket already used', ticket }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const eventDate = ticket.event?.date ? new Date(ticket.event.date) : null;
    if (eventDate) {
      const oneDayAfter = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000);
      if (Date.now() > oneDayAfter.getTime()) {
        return new Response(
          JSON.stringify({ valid: false, error: 'TICKET_EXPIRED', message: 'Ticket expired for this event', ticket }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    const nowIso = new Date().toISOString();

    // Update ticket status
    await supabase
      .from('tickets')
      .update({ status: 'used', scanned_at: nowIso, scanned_by: scannerRow.id })
      .eq('id', ticket.id);

    // Record scan
    await supabase.from('ticket_scans').insert({
      ticket_id: ticket.id,
      event_id: ticket.event_id,
      scanned_by: scannerRow.id,
      scanner_code_id: scannerRow.id,
      scanned_at: nowIso,
      scan_result: 'valid',
      device_info: deviceInfo ?? null,
    });

    // Update scanner usage counters
    await supabase
      .from('scanner_codes')
      .update({ scan_count: (scannerRow.scan_count ?? 0) + 1, last_used_at: nowIso })
      .eq('id', scannerRow.id);

    return new Response(
      JSON.stringify({
        valid: true,
        message: 'Access granted',
        scanner_code_id: scannerRow.id,
        event_id: ticket.event_id,
        ticket: {
          id: ticket.id,
          event_name: ticket.event?.name,
          user_name: ticket.user?.name,
          user_email: ticket.user?.email,
          ticket_type: ticket.ticket_type || 'general',
          status: 'used',
          scanned_at: nowIso,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('scanner-validate-ticket error:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'SYSTEM_ERROR', message: 'Validation failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
