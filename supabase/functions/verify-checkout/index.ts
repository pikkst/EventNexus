import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Import Stripe library
import Stripe from 'https://esm.sh/stripe@14.29.0?target=deno';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const sessionId: string | null = body.sessionId || body.session_id || null;
    const reqEventId: string | null = body.eventId || body.event_id || null;
    const reqUserId: string | null = body.userId || body.user_id || null;

    if (!sessionId && (!reqEventId || !reqUserId)) {
      return new Response(
        JSON.stringify({ error: 'Missing sessionId and no fallback (eventId,userId) provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying checkout session/payment:', sessionId ?? '(none provided)');

    let session: Stripe.Checkout.Session | null = null;
    let paymentStatus: string = 'unknown';
    let metadata: Record<string, string> = {};
    
    try {
      // Try to retrieve as checkout session first
      session = await stripe.checkout.sessions.retrieve(sessionId);
      paymentStatus = session.payment_status;
      metadata = session.metadata || {};
      console.log('✓ Found checkout session, payment_status:', session.payment_status);
      console.log('Session metadata:', metadata);
    } catch (sessionError) {
      console.warn('Could not retrieve as checkout session:', (sessionError as Error).message);
      // Fallback: sessionId might actually be a payment_intent ID
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(sessionId);
        paymentStatus = paymentIntent.status === 'succeeded' ? 'paid' : paymentIntent.status;
        metadata = paymentIntent.metadata || {};
        console.log('✓ Retrieved as payment_intent, status:', paymentIntent.status);
      } catch (piError) {
        console.error('Failed to retrieve as payment_intent:', (piError as Error).message);
        return new Response(
          JSON.stringify({ 
            error: 'Payment not found. Please contact support.',
            sessionId: sessionId
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
      
    // Check if payment was successful
    if (paymentStatus === 'paid' || paymentStatus === 'succeeded') {
      // Fallback fill metadata from request if missing
      if (!metadata.user_id && reqUserId) metadata.user_id = reqUserId;
      if (!metadata.event_id && reqEventId) metadata.event_id = reqEventId;
      console.log('✓ Payment confirmed - processing tickets for user:', metadata.user_id);

      // Handle ticket purchase
      if (metadata.type === 'ticket' && metadata.event_id && metadata.user_id) {
        // Get pending tickets for this session
        const { data: pendingTickets, error: ticketError } = await supabase
          .from('tickets')
          .select('id')
          .eq('stripe_session_id', sessionId)
          .eq('payment_status', 'pending');

        if (ticketError) {
          console.error('Error fetching pending tickets:', ticketError);
        }

        console.log(`Found ${pendingTickets?.length || 0} pending tickets for session ${sessionId}`);

        if (pendingTickets && pendingTickets.length > 0) {
          // Generate QR codes for tickets
          for (const ticket of pendingTickets) {
            // Generate secure QR code
            const TICKET_HASH_SECRET = Deno.env.get('TICKET_HASH_SECRET') || 'eventnexus-production-secret-2025';
            const data = `${ticket.id}-${metadata.event_id}-${metadata.user_id}-${TICKET_HASH_SECRET}`;
            
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);
            const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            const hash = hashHex.substring(0, 12);
            const qrData = `ENX-${ticket.id}-${hash}`;

            // Update ticket status
            const paymentId = (session && session.payment_intent) ? session.payment_intent as string : (sessionId ?? '');
            const { error: updateError } = await supabase
              .from('tickets')
              .update({
                payment_status: 'paid',
                stripe_payment_id: paymentId,
                qr_code: qrData,
                status: 'valid'
              })
              .eq('id', ticket.id);

            if (updateError) {
              console.error(`Error updating ticket ${ticket.id}:`, updateError);
            }
          }

          console.log(`✓ Updated ${pendingTickets.length} tickets to paid status`);

          // Update event attendees count
          const { data: allPaidTickets } = await supabase
            .from('tickets')
            .select('id', { count: 'exact' })
            .eq('event_id', metadata.event_id)
            .eq('payment_status', 'paid');

          const paidTicketCount = (allPaidTickets && Array.isArray(allPaidTickets)) ? allPaidTickets.length : 0;

          await supabase
            .from('events')
            .update({ attendees_count: paidTicketCount })
            .eq('id', metadata.event_id);

          console.log(`✓ Updated event attendees count to ${paidTicketCount}`);

          // Send notification to user
          await supabase.from('notifications').insert({
            user_id: metadata.user_id,
            type: 'update',
            title: 'Tickets Ready!',
            message: `✓ Payment confirmed! Your ${pendingTickets.length} tickets are ready with QR codes. View them in your profile.`,
            sender_name: 'EventNexus',
            isRead: false,
          });

          console.log(`✓ Sent confirmation notification to user ${metadata.user_id}`);
        } else {
          console.warn(`No pending tickets found for session ${sessionId}`);
          
          // Fallback: Try to find tickets by user+event if session lookup failed
          if (metadata.user_id && metadata.event_id) {
            console.log('Trying fallback lookup by user_id + event_id...');
            const { data: fallbackTickets } = await supabase
              .from('tickets')
              .select('id')
              .eq('user_id', metadata.user_id)
              .eq('event_id', metadata.event_id)
              .eq('payment_status', 'pending');
            
            if (fallbackTickets && fallbackTickets.length > 0) {
              console.log(`Found ${fallbackTickets.length} tickets via fallback`);
              
              // Process these tickets
              for (const ticket of fallbackTickets) {
                const TICKET_HASH_SECRET = Deno.env.get('TICKET_HASH_SECRET') || 'eventnexus-production-secret-2025';
                const data = `${ticket.id}-${metadata.event_id}-${metadata.user_id}-${TICKET_HASH_SECRET}`;
                
                const encoder = new TextEncoder();
                const dataBuffer = encoder.encode(data);
                const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                const hash = hashHex.substring(0, 12);
                const qrData = `ENX-${ticket.id}-${hash}`;

                const paymentId = (session && session.payment_intent) ? session.payment_intent as string : (sessionId ?? '');
                const { error: updateError } = await supabase
                  .from('tickets')
                  .update({
                    payment_status: 'paid',
                    stripe_payment_id: paymentId,
                    stripe_session_id: sessionId ?? null,
                    qr_code: qrData,
                    status: 'valid'
                  })
                  .eq('id', ticket.id);

                if (updateError) {
                  console.error(`Error updating ticket ${ticket.id}:`, updateError);
                }
              }
              
              // Update event attendees count
              const { data: allPaidTickets } = await supabase
                .from('tickets')
                .select('id', { count: 'exact' })
                .eq('event_id', metadata.event_id)
                .eq('payment_status', 'paid');

              const paidTicketCount = (allPaidTickets && Array.isArray(allPaidTickets)) ? allPaidTickets.length : 0;

              await supabase
                .from('events')
                .update({ attendees_count: paidTicketCount })
                .eq('id', metadata.event_id);

              console.log(`✓ Updated event attendees count to ${paidTicketCount}`);

              // Send notification
              await supabase.from('notifications').insert({
                user_id: metadata.user_id,
                type: 'update',
                title: 'Tickets Ready!',
                message: `✓ Payment confirmed! Your ${fallbackTickets.length} tickets are ready with QR codes. View them in your profile.`,
                sender_name: 'EventNexus',
                isRead: false,
              });

              console.log(`✓ Fallback: Updated ${fallbackTickets.length} tickets to paid status`);
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          verified: true,
          paid: true,
          status: paymentStatus,
          message: 'Payment verified and tickets confirmed'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (paymentStatus === 'unpaid') {
      console.log('Payment not yet completed for session:', sessionId);
      return new Response(
        JSON.stringify({
          verified: false,
          paid: false,
          status: 'unpaid',
          message: 'Payment not yet completed'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log('Unknown payment status:', paymentStatus);
      return new Response(
        JSON.stringify({
          verified: false,
          paid: false,
          status: paymentStatus
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Verification error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Verification failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
