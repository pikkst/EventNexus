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

// Price IDs mapping - configure these in your Stripe Dashboard
const PRICE_IDS = {
  pro: Deno.env.get('STRIPE_PRICE_PRO') || 'price_pro_monthly',
  premium: Deno.env.get('STRIPE_PRICE_PREMIUM') || 'price_premium_monthly',
  enterprise: Deno.env.get('STRIPE_PRICE_ENTERPRISE') || 'price_enterprise_monthly',
};

// Commission rates by subscription tier (for Stripe Connect payouts)
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
    const { userId, tier, priceId, customerEmail, eventId, ticketCount, pricePerTicket, eventName, successUrl, cancelUrl } = await req.json();

    // Get or create Stripe customer
    let customerId: string;
    
    // Check if user already has a Stripe customer ID
    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id, email, name')
      .eq('id', userId)
      .single();

    if (user?.stripe_customer_id) {
      customerId = user.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: customerEmail || user?.email,
        name: user?.name,
        metadata: {
          supabase_user_id: userId,
        },
      });
      
      customerId = customer.id;

      // Store customer ID in database
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    let session;

    // Check if this is a subscription or ticket purchase
    if (tier && priceId) {
      // Subscription checkout
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: PRICE_IDS[tier as keyof typeof PRICE_IDS] || priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          user_id: userId,
          tier: tier,
          type: 'subscription',
        },
        subscription_data: {
          metadata: {
            user_id: userId,
            tier: tier,
          },
        },
      });
    } else if (eventId && ticketCount && pricePerTicket) {
      // Ticket purchase checkout - need to get organizer's Connect account
      
      // Get event with organizer details
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select(`
          id,
          name,
          organizer_id,
          organizer:users!events_organizer_id_fkey(
            id,
            subscription_tier,
            stripe_connect_account_id,
            stripe_connect_charges_enabled
          )
        `)
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        throw new Error('Event not found');
      }

      // Check if organizer has completed Stripe Connect onboarding
      if (!event.organizer.stripe_connect_account_id) {
        throw new Error('Event organizer has not set up payment receiving. Please contact the organizer.');
      }

      if (!event.organizer.stripe_connect_charges_enabled) {
        throw new Error('Event organizer payment account is not fully activated yet.');
      }

      // Calculate amounts for Stripe Connect transfer
      const totalAmount = Math.round(ticketCount * pricePerTicket * 100); // in cents
      const platformFeeRate = COMMISSION_RATES[event.organizer.subscription_tier] || COMMISSION_RATES.free;
      const platformFeeCents = Math.round(totalAmount * platformFeeRate);
      const netAmountCents = totalAmount - platformFeeCents;

      console.log(`Ticket checkout: Total €${(totalAmount / 100).toFixed(2)}, Fee €${(platformFeeCents / 100).toFixed(2)}, Net €${(netAmountCents / 100).toFixed(2)}`);

      // Create checkout session for ticket purchase
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `${eventName} - Tickets`,
                description: `${ticketCount} ticket(s) @ €${pricePerTicket.toFixed(2)} each`,
              },
              unit_amount: Math.round(pricePerTicket * 100),
            },
            quantity: ticketCount,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          user_id: userId,
          event_id: eventId,
          ticket_count: ticketCount.toString(),
          organizer_id: event.organizer_id,
          organizer_connect_account: event.organizer.stripe_connect_account_id,
          organizer_tier: event.organizer.subscription_tier,
          platform_fee_cents: platformFeeCents.toString(),
          gross_amount_cents: totalAmount.toString(),
          net_amount_cents: netAmountCents.toString(),
          type: 'ticket',
        },
      });

      // Create pending ticket records
      const tickets = Array.from({ length: ticketCount }, () => ({
        user_id: userId,
        event_id: eventId,
        purchase_date: new Date().toISOString(),
        qr_code: crypto.randomUUID(), // Temporary QR code, will be updated on payment success
        payment_status: 'pending',
        stripe_session_id: session.id,
      }));

      await supabase.from('tickets').insert(tickets);
    } else {
      throw new Error('Invalid checkout request: missing required parameters');
    }

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Checkout creation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
