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
    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing sessionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying checkout session:', sessionId);

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log('Session status:', session.payment_status);
    console.log('Session metadata:', session.metadata);

    // Check if payment was successful
    if (session.payment_status === 'paid') {
      const metadata = session.metadata || {};
      
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
            const { error: updateError } = await supabase
              .from('tickets')
              .update({
                payment_status: 'paid',
                stripe_payment_id: session.payment_intent,
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

          const paidTicketCount = allPaidTickets?.length || 0;

          await supabase
            .from('events')
            .update({ attendees_count: paidTicketCount })
            .eq('id', metadata.event_id);

          console.log(`✓ Updated event attendees count to ${paidTicketCount}`);

          // Send notification to user
          await supabase.from('notifications').insert({
            user_id: metadata.user_id,
            type: 'event_update',
            title: 'Tickets Ready!',
            message: `✓ Payment confirmed! Your ${pendingTickets.length} tickets are ready with QR codes. View them in your profile.`,
            sender_name: 'EventNexus',
            isRead: false,
          });

          console.log(`✓ Sent confirmation notification to user ${metadata.user_id}`);
        } else {
          console.warn(`No pending tickets found for session ${sessionId}`);
        }
      }

      return new Response(
        JSON.stringify({
          verified: true,
          paid: true,
          status: session.payment_status,
          message: 'Payment verified and tickets confirmed'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (session.payment_status === 'unpaid') {
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
      console.log('Unknown payment status:', session.payment_status);
      return new Response(
        JSON.stringify({
          verified: false,
          paid: false,
          status: session.payment_status
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Verification error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Verification failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
