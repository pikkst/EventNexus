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

// Commission rates by subscription tier
const COMMISSION_RATES: Record<string, number> = {
  free: 0.05,      // 5%
  pro: 0.03,       // 3%
  premium: 0.025,  // 2.5%
  enterprise: 0.015, // 1.5%
};

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
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    console.log(`[${now.toISOString()}] Starting scheduled payout processing`);
    console.log(`Looking for events before: ${twoDaysAgo.toISOString()}`);

    // Find events that happened 2+ days ago and haven't been paid out
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select(`
        id,
        name,
        date,
        organizer_id,
        payout_processed,
        organizer:users!events_organizer_id_fkey(
          id,
          email,
          name,
          subscription_tier,
          stripe_connect_account_id,
          stripe_connect_charges_enabled,
          stripe_connect_payouts_enabled
        )
      `)
      .lt('date', twoDaysAgo.toISOString())
      .eq('payout_processed', false);

    if (eventsError) {
      throw new Error(`Failed to fetch events: ${eventsError.message}`);
    }

    console.log(`Found ${events?.length || 0} events eligible for payout`);

    const results = [];
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const event of events || []) {
      console.log(`\nProcessing event: ${event.name} (${event.id})`);

      // Check if organizer has Connect account and it's enabled
      if (!event.organizer.stripe_connect_account_id) {
        console.log(`⊘ Skipping - organizer has no Connect account`);
        skipCount++;
        results.push({
          event_id: event.id,
          event_name: event.name,
          status: 'skipped',
          reason: 'No Connect account',
        });
        continue;
      }

      if (!event.organizer.stripe_connect_charges_enabled) {
        console.log(`⊘ Skipping - organizer Connect account not enabled for charges`);
        skipCount++;
        results.push({
          event_id: event.id,
          event_name: event.name,
          status: 'skipped',
          reason: 'Connect account not enabled',
        });
        continue;
      }

      // Calculate total ticket sales for this event
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('id, price, status, payment_status')
        .eq('event_id', event.id)
        .eq('payment_status', 'paid')
        .neq('status', 'cancelled')
        .neq('status', 'refunded');

      if (ticketsError) {
        console.error(`Error fetching tickets: ${ticketsError.message}`);
        errorCount++;
        continue;
      }

      if (!tickets || tickets.length === 0) {
        console.log(`⊘ No paid tickets to process`);
        
        // Mark event as processed even if no tickets
        await supabase
          .from('events')
          .update({ payout_processed: true })
          .eq('id', event.id);
        
        skipCount++;
        results.push({
          event_id: event.id,
          event_name: event.name,
          status: 'skipped',
          reason: 'No paid tickets',
        });
        continue;
      }

      // Calculate revenue
      const totalRevenue = tickets.reduce((sum, t) => sum + (t.price || 0), 0);
      const grossAmountCents = Math.round(totalRevenue * 100);

      console.log(`Ticket sales: ${tickets.length} tickets, €${totalRevenue.toFixed(2)}`);

      // Calculate platform fee based on subscription tier
      const platformFeeRate = COMMISSION_RATES[event.organizer.subscription_tier] || COMMISSION_RATES.free;
      const platformFeeCents = Math.round(grossAmountCents * platformFeeRate);
      const netAmountCents = grossAmountCents - platformFeeCents;

      console.log(`Platform fee (${(platformFeeRate * 100).toFixed(1)}%): €${(platformFeeCents / 100).toFixed(2)}`);
      console.log(`Net to organizer: €${(netAmountCents / 100).toFixed(2)}`);

      // Skip if nothing to transfer
      if (netAmountCents <= 0) {
        console.log(`⊘ Net amount is zero or negative`);
        await supabase
          .from('events')
          .update({ payout_processed: true })
          .eq('id', event.id);
        
        skipCount++;
        continue;
      }

      try {
        // Create Stripe transfer to organizer's Connect account
        console.log(`Creating Stripe transfer to ${event.organizer.stripe_connect_account_id}`);
        
        const transfer = await stripe.transfers.create({
          amount: netAmountCents,
          currency: 'eur',
          destination: event.organizer.stripe_connect_account_id,
          description: `Payout for "${event.name}" (${tickets.length} tickets sold)`,
          metadata: {
            event_id: event.id,
            event_name: event.name,
            ticket_count: tickets.length.toString(),
            event_date: event.date,
            organizer_id: event.organizer.id,
            platform_fee_cents: platformFeeCents.toString(),
          },
        });

        console.log(`✓ Transfer created: ${transfer.id}`);

        // Record payout in database
        const { error: payoutError } = await supabase.from('payouts').insert({
          user_id: event.organizer.id,
          event_id: event.id,
          stripe_transfer_id: transfer.id,
          gross_amount: grossAmountCents,
          platform_fee: platformFeeCents,
          net_amount: netAmountCents,
          ticket_count: tickets.length,
          status: 'paid',
          event_date: event.date,
          payout_eligible_date: twoDaysAgo.toISOString(),
          processed_at: now.toISOString(),
        });

        if (payoutError) {
          console.error(`Failed to record payout: ${payoutError.message}`);
        }

        // Mark event as paid out
        const { error: updateError } = await supabase
          .from('events')
          .update({
            payout_processed: true,
            payout_scheduled_date: now.toISOString(),
          })
          .eq('id', event.id);

        if (updateError) {
          console.error(`Failed to update event: ${updateError.message}`);
        }

        // Send notification to organizer
        await supabase.from('notifications').insert({
          user_id: event.organizer.id,
          type: 'payout',
          message: `💰 Payout of €${(netAmountCents / 100).toFixed(2)} processed for "${event.name}"`,
          read: false,
        });

        console.log(`✓ Payout completed successfully`);
        successCount++;
        
        results.push({
          event_id: event.id,
          event_name: event.name,
          organizer_name: event.organizer.name,
          status: 'success',
          amount_eur: (netAmountCents / 100).toFixed(2),
          platform_fee_eur: (platformFeeCents / 100).toFixed(2),
          ticket_count: tickets.length,
          transfer_id: transfer.id,
        });

      } catch (transferError) {
        console.error(`✗ Transfer failed: ${transferError instanceof Error ? transferError.message : 'Unknown error'}`);
        errorCount++;

        // Record failed payout
        await supabase.from('payouts').insert({
          user_id: event.organizer.id,
          event_id: event.id,
          gross_amount: grossAmountCents,
          platform_fee: platformFeeCents,
          net_amount: netAmountCents,
          ticket_count: tickets.length,
          status: 'failed',
          error_message: transferError instanceof Error ? transferError.message : 'Unknown error',
          event_date: event.date,
          payout_eligible_date: twoDaysAgo.toISOString(),
        });

        // Send notification about failed payout
        await supabase.from('notifications').insert({
          user_id: event.organizer.id,
          type: 'system',
          message: `⚠️ Payout failed for "${event.name}". Please check your bank account details.`,
          read: false,
        });

        results.push({
          event_id: event.id,
          event_name: event.name,
          status: 'failed',
          error: transferError instanceof Error ? transferError.message : 'Unknown error',
        });
      }
    }

    const summary = {
      timestamp: now.toISOString(),
      total_processed: results.length,
      successful: successCount,
      skipped: skipCount,
      failed: errorCount,
      results: results,
    };

    console.log(`\n=== Payout Processing Summary ===`);
    console.log(`Total: ${results.length} | Success: ${successCount} | Skipped: ${skipCount} | Failed: ${errorCount}`);

    return new Response(
      JSON.stringify(summary, null, 2),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    console.error('Scheduled payout processing error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
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
