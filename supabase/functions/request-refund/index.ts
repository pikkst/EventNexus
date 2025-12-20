import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface RefundRequest {
  ticketId: string;
  userId: string;
  reason?: string;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { ticketId, userId, reason }: RefundRequest = await req.json();

    if (!ticketId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing ticketId or userId' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    console.log(`Processing refund request for ticket ${ticketId} by user ${userId}`);

    // Get ticket details with event information
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        id,
        user_id,
        event_id,
        price,
        status,
        payment_status,
        stripe_payment_id,
        refund_requested,
        refund_processed,
        event:events(
          id,
          name,
          date,
          organizer_id,
          payout_processed
        )
      `)
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({ error: 'Ticket not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Verify the ticket belongs to the requesting user
    if (ticket.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Ticket does not belong to you' }),
        { status: 403, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Check if ticket is paid
    if (ticket.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({ error: 'Ticket is not paid' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Check if already refunded
    if (ticket.status === 'refunded' || ticket.refund_processed) {
      return new Response(
        JSON.stringify({ error: 'Ticket already refunded' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Check if refund already requested
    if (ticket.refund_requested) {
      return new Response(
        JSON.stringify({ error: 'Refund already requested and pending' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Calculate refund eligibility based on event date
    const eventDate = new Date(ticket.event.date);
    const now = new Date();
    const daysUntilEvent = Math.floor((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let refundPercent = 0;
    let eligibilityReason = '';

    if (daysUntilEvent >= 7) {
      refundPercent = 100;
      eligibilityReason = 'Full refund (7+ days before event)';
    } else if (daysUntilEvent >= 3) {
      refundPercent = 50;
      eligibilityReason = 'Partial refund (3-7 days before event)';
    } else if (daysUntilEvent >= 0) {
      refundPercent = 0;
      eligibilityReason = 'No refund available within 3 days of event';
    } else {
      refundPercent = 0;
      eligibilityReason = 'Event already occurred';
    }

    console.log(`Refund eligibility: ${refundPercent}% (${daysUntilEvent} days until event)`);

    if (refundPercent === 0) {
      return new Response(
        JSON.stringify({
          error: 'Refund not available',
          reason: eligibilityReason,
          daysUntilEvent: daysUntilEvent,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Calculate refund amounts
    const originalAmountCents = Math.round(ticket.price * 100);
    const refundAmountCents = Math.round(originalAmountCents * (refundPercent / 100));
    const platformFeeRefunded = Math.round(refundAmountCents * 0.025); // 2.5% platform fee
    const organizerAmountReversed = refundAmountCents - platformFeeRefunded;

    console.log(`Refund amount: €${(refundAmountCents / 100).toFixed(2)} (${refundPercent}%)`);

    // Check if event payout already processed
    if (ticket.event.payout_processed) {
      console.log('⚠️ Event already paid out - requires manual review');
      
      // Create pending refund record for admin review
      const { error: refundError } = await supabase.from('refunds').insert({
        ticket_id: ticketId,
        user_id: userId,
        event_id: ticket.event_id,
        original_amount: originalAmountCents,
        refund_amount: refundAmountCents,
        refund_percent: refundPercent,
        platform_fee_refunded: platformFeeRefunded,
        organizer_amount_reversed: organizerAmountReversed,
        status: 'pending',
        reason: reason || eligibilityReason,
      });

      if (refundError) {
        console.error('Failed to create refund record:', refundError);
      }

      // Mark ticket as refund requested
      await supabase
        .from('tickets')
        .update({ refund_requested: true })
        .eq('id', ticketId);

      return new Response(
        JSON.stringify({
          success: false,
          requiresManualReview: true,
          message: 'Event payout already processed. Refund request submitted for admin review.',
          refundAmount: (refundAmountCents / 100).toFixed(2),
          refundPercent: refundPercent,
        }),
        { status: 202, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Process refund via Stripe
    if (!ticket.stripe_payment_id) {
      throw new Error('No Stripe payment ID found for ticket');
    }

    console.log(`Creating Stripe refund for payment ${ticket.stripe_payment_id}`);

    const refund = await stripe.refunds.create({
      payment_intent: ticket.stripe_payment_id,
      amount: refundAmountCents,
      reason: 'requested_by_customer',
      metadata: {
        ticket_id: ticketId,
        user_id: userId,
        event_id: ticket.event_id,
        refund_percent: refundPercent.toString(),
        original_amount: originalAmountCents.toString(),
      },
    });

    console.log(`✓ Stripe refund created: ${refund.id}`);

    // Record refund in database
    const { error: refundError } = await supabase.from('refunds').insert({
      ticket_id: ticketId,
      user_id: userId,
      event_id: ticket.event_id,
      original_amount: originalAmountCents,
      refund_amount: refundAmountCents,
      refund_percent: refundPercent,
      platform_fee_refunded: platformFeeRefunded,
      organizer_amount_reversed: organizerAmountReversed,
      status: 'processed',
      reason: reason || eligibilityReason,
      stripe_refund_id: refund.id,
      processed_at: new Date().toISOString(),
    });

    if (refundError) {
      console.error('Failed to record refund:', refundError);
      // Don't throw - refund is processed in Stripe
    }

    // Update ticket status
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        status: 'refunded',
        refund_requested: true,
        refund_processed: true,
        refunded_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    if (updateError) {
      console.error('Failed to update ticket:', updateError);
    }

    // Send notification to user
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'refund',
      message: `✓ Refund of €${(refundAmountCents / 100).toFixed(2)} processed for "${ticket.event.name}"`,
      read: false,
    });

    // Notify organizer
    await supabase.from('notifications').insert({
      user_id: ticket.event.organizer_id,
      type: 'refund',
      message: `Refund issued for "${ticket.event.name}" (€${(refundAmountCents / 100).toFixed(2)})`,
      read: false,
    });

    console.log(`✓ Refund completed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        refundId: refund.id,
        refundAmount: (refundAmountCents / 100).toFixed(2),
        refundPercent: refundPercent,
        originalAmount: (originalAmountCents / 100).toFixed(2),
        estimatedArrival: '5-10 business days',
        message: `Refund of €${(refundAmountCents / 100).toFixed(2)} (${refundPercent}%) processed successfully`,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    console.error('Refund processing error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
