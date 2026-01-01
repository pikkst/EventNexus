import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
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
  pro: Deno.env.get('STRIPE_PRICE_PRO') || '',
  premium: Deno.env.get('STRIPE_PRICE_PREMIUM') || '',
  enterprise: Deno.env.get('STRIPE_PRICE_ENTERPRISE') || '',
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
    // Validate Stripe secret key
    if (!STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Payment system not configured. Please contact support.' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const { userId, tier, priceId, customerEmail, eventId, ticketCount, pricePerTicket, eventName, ticketTemplateId, ticketType, ticketName, successUrl, cancelUrl } = await req.json();

    // Validate required parameters
    if (!userId) {
      throw new Error('Missing required parameter: userId');
    }
    if (!successUrl || !cancelUrl) {
      throw new Error('Missing required parameters: successUrl or cancelUrl');
    }

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
      console.log(`Creating subscription checkout for user ${userId}, tier: ${tier}`);
      
      const stripePriceId = PRICE_IDS[tier as keyof typeof PRICE_IDS] || priceId;
      
      if (!stripePriceId) {
        throw new Error(`Subscription price not configured for tier: ${tier}. Please contact support or see STRIPE_PRODUCTS_SETUP.md`);
      }
      
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: stripePriceId,
            quantity: 1,
          },
        ],
        success_url: successUrl + (successUrl.includes('?') ? '&' : '?') + 'session_id={CHECKOUT_SESSION_ID}',
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

      // In test mode, allow charges even if charges_enabled is false (pending requirements don't block test payments)
      // In live mode, strictly check charges_enabled
      const isTestMode = event.organizer.stripe_connect_account_id.startsWith('acct_') && 
                         Deno.env.get('STRIPE_SECRET_KEY')?.includes('_test_');
      
      if (!event.organizer.stripe_connect_charges_enabled && !isTestMode) {
        throw new Error('Event organizer payment account is not fully activated yet.');
      }
      
      if (!event.organizer.stripe_connect_charges_enabled && isTestMode) {
        console.log('⚠️ Test mode: Allowing checkout despite pending account requirements');
      }

      // Calculate amounts for Stripe Connect transfer
      const totalAmount = Math.round(ticketCount * pricePerTicket * 100); // in cents
      const platformFeeRate = COMMISSION_RATES[event.organizer.subscription_tier] || COMMISSION_RATES.free;
      const platformFeeCents = Math.round(totalAmount * platformFeeRate);
      const netAmountCents = totalAmount - platformFeeCents;

      console.log(`Ticket checkout: Total €${(totalAmount / 100).toFixed(2)}, Fee €${(platformFeeCents / 100).toFixed(2)}, Net €${(netAmountCents / 100).toFixed(2)}`);

      // Create checkout session for ticket purchase
      // Money held on platform, transferred 2 days after event via automated payout system
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
        success_url: successUrl + (successUrl.includes('?') ? '&' : '?') + 'session_id={CHECKOUT_SESSION_ID}',
        cancel_url: cancelUrl,
        metadata: {
          user_id: userId,
          event_id: eventId,
          ticket_count: ticketCount.toString(),
          ticket_template_id: ticketTemplateId || '',
          ticket_type: ticketType || 'general',
          ticket_name: ticketName || 'Standard',
          organizer_id: event.organizer_id,
          organizer_connect_account: event.organizer.stripe_connect_account_id,
          organizer_tier: event.organizer.subscription_tier,
          platform_fee_cents: platformFeeCents.toString(),
          gross_amount_cents: totalAmount.toString(),
          net_amount_cents: netAmountCents.toString(),
          type: 'ticket',
        },
      });

      // Create pending ticket records with template ID, type, and price_paid
      const now = new Date().toISOString();
      const tickets = Array.from({ length: ticketCount }, () => ({
        user_id: userId,
        event_id: eventId,
        ticket_template_id: ticketTemplateId || null,
        ticket_type: ticketType || 'general',
        ticket_name: ticketName || 'Standard Ticket',
        price_paid: pricePerTicket,
        holder_name: user?.name || 'Guest',
        holder_email: user?.email || customerEmail || 'guest@eventnexus.eu',
        qr_code: crypto.randomUUID(), // Temporary QR code, will be updated on payment success
        status: 'valid',
        purchased_at: now,
        payment_status: 'pending', // Set to pending until webhook confirms payment
        stripe_session_id: session.id, // Link to Stripe session for tracking
        purchase_date: now,
      }));

      const { error: ticketInsertError } = await supabase.from('tickets').insert(tickets);
      if (ticketInsertError) {
        console.error('Error creating tickets:', ticketInsertError);
        throw new Error('Failed to create ticket records');
      }
      
      console.log(`✓ Created ${ticketCount} pending tickets for session ${session.id}`);
    } else {
      console.error('Invalid checkout parameters:', { tier, priceId, eventId, ticketCount, pricePerTicket });
      throw new Error('Invalid checkout request: must provide either (tier + priceId) for subscription or (eventId + ticketCount + pricePerTicket) for tickets');
    }

    console.log(`Checkout session created successfully: ${session.id}`);

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
    
    // Provide more specific error messages
    let errorMessage = error.message || 'Unknown error occurred';
    let statusCode = 400;
    
    // Check for specific error types
    if (error.message?.includes('Stripe')) {
      errorMessage = 'Payment system error. Please try again or contact support.';
      statusCode = 500;
    } else if (error.message?.includes('not found')) {
      statusCode = 404;
    } else if (error.message?.includes('Missing required parameter')) {
      errorMessage = error.message;
      statusCode = 400;
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      }),
      {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
