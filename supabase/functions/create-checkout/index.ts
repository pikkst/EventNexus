import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@12.17.0?dts';

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

// Build a safe, short statement descriptor suffix
function buildDescriptorSuffix(source: string, fallback: string = 'EVENT'): string {
  try {
    const normalized = source.normalize('NFKD');
    const lettersDigits = normalized.replace(/[^A-Za-z0-9 ]+/g, '');
    const compact = lettersDigits.replace(/\s+/g, '');
    const upper = compact.toUpperCase();
    const trimmed = upper.substring(0, 10); // keep short; combined prefix+suffix must fit
    return trimmed.length >= 5 ? trimmed : fallback;
  } catch (_) {
    return fallback;
  }
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

    const { userId, tier, priceId, customerEmail, eventId, ticketCount, lineItems, pricePerTicket, eventName, ticketTemplateId, ticketType, ticketName, successUrl, cancelUrl, promoCode } = await req.json();

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

    // Helper to recreate customer and persist, then return new id
    const recreateCustomer = async () => {
      const newCustomer = await stripe.customers.create({
        email: customerEmail || user?.email,
        name: user?.name,
        metadata: { supabase_user_id: userId },
      });
      await supabase.from('users').update({ stripe_customer_id: newCustomer.id }).eq('id', userId);
      customerId = newCustomer.id;
      return newCustomer.id;
    };

    // Check if this is a subscription or ticket purchase
    // Subscription checkout: tier provided, priceId optional (prefer env STRIPE_PRICE_*)
    if (tier) {
      // Subscription checkout
      console.log(`Creating subscription checkout for user ${userId}, tier: ${tier}`);
      
      const stripePriceId = PRICE_IDS[tier as keyof typeof PRICE_IDS] || priceId;
      
      if (!stripePriceId) {
        throw new Error(`Subscription price not configured for tier: ${tier}. Please contact support or see STRIPE_PRODUCTS_SETUP.md`);
      }
      
      const normalizedPromoCode = typeof promoCode === 'string' ? promoCode.trim().toUpperCase() : '';
      let promoCodeRecord: any = null;

      if (normalizedPromoCode) {
        const { data: codeRecord, error: codeError } = await supabase
          .from('subscription_discount_codes')
          .select('*')
          .eq('code', normalizedPromoCode)
          .single();

        if (codeError || !codeRecord) {
          throw new Error('Invalid discount code');
        }

        const now = new Date();
        const validFrom = new Date(codeRecord.valid_from);
        const validUntil = codeRecord.valid_until ? new Date(codeRecord.valid_until) : null;

        if (!codeRecord.is_active) {
          throw new Error('Discount code is inactive');
        }

        if (validFrom > now || (validUntil && validUntil < now)) {
          throw new Error('Discount code is expired');
        }

        if (codeRecord.max_uses !== null && codeRecord.current_uses >= codeRecord.max_uses) {
          throw new Error('Discount code usage limit reached');
        }

        if (codeRecord.tier !== 'any' && codeRecord.tier !== tier) {
          throw new Error('Discount code is not valid for this tier');
        }

        const stripePromo = await stripe.promotionCodes.retrieve(codeRecord.stripe_promotion_code_id);
        if (!stripePromo?.active) {
          throw new Error('Discount code is inactive in Stripe');
        }

        promoCodeRecord = codeRecord;
      }

      const buildSession = async (custId: string) => {
        const metadata: Record<string, string> = {
          user_id: userId,
          tier: tier,
          type: 'subscription',
        };

        if (promoCodeRecord) {
          metadata.promo_code = promoCodeRecord.code;
          metadata.promo_code_id = promoCodeRecord.id;
        }

        return stripe.checkout.sessions.create({
          customer: custId,
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
          metadata,
          subscription_data: {
            metadata: {
              user_id: userId,
              tier: tier,
              ...(promoCodeRecord ? { promo_code: promoCodeRecord.code, promo_code_id: promoCodeRecord.id } : {})
            },
          },
          discounts: promoCodeRecord ? [{ promotion_code: promoCodeRecord.stripe_promotion_code_id }] : undefined,
        });
      };

      try {
        session = await buildSession(customerId);
      } catch (err: any) {
        if (err?.message?.includes('No such customer')) {
          console.warn('Stripe customer missing, recreating and retrying...');
          const newCust = await recreateCustomer();
          session = await buildSession(newCust);
        } else {
          throw err;
        }
      }
    } else if (eventId && (lineItems || (ticketCount && pricePerTicket))) {
      // Ticket purchase checkout - need to get organizer's Connect account

      // Get event with organizer_id only (avoid relying on FK alias names)
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, name, organizer_id')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        throw new Error('Event not found');
      }

      // Fetch organizer details directly
      const { data: organizer, error: orgError } = await supabase
        .from('users')
        .select('id, subscription_tier, stripe_connect_account_id, stripe_connect_charges_enabled')
        .eq('id', event.organizer_id)
        .single();

      if (orgError || !organizer) {
        throw new Error('Event organizer not found');
      }

      // Proceed with checkout even if organizer hasn't completed payout setup.
      // Funds are captured on the platform; payouts will only run after the event
      // when `process-scheduled-payouts` finds a valid destination account.
      const isTestMode = Deno.env.get('STRIPE_SECRET_KEY')?.includes('_test_') || false;
      if (!organizer.stripe_connect_account_id) {
        console.log('⚠️ Organizer has no Stripe Connect account yet. Proceeding with payment; payout will be deferred.');
      } else if (!organizer.stripe_connect_charges_enabled && !isTestMode) {
        console.log('⚠️ Organizer charges are not enabled yet. Proceeding with payment; payout will be deferred.');
      } else if (!organizer.stripe_connect_charges_enabled && isTestMode) {
        console.log('⚠️ Test mode: Allowing checkout despite pending account requirements');
      }

      // Calculate amounts for Stripe Connect transfer
      // If lineItems provided, calculate from line items; otherwise use old ticketCount * pricePerTicket
      let totalAmount: number;
      let actualTicketCount: number;
      
      if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
        // New API: sum up line items
        totalAmount = lineItems.reduce((sum: number, item: any) => sum + Math.round(item.price * 100), 0);
        actualTicketCount = lineItems.length;
      } else {
        // Old API: use ticketCount and pricePerTicket
        totalAmount = Math.round(ticketCount * pricePerTicket * 100);
        actualTicketCount = ticketCount;
      }
      
      const platformFeeRate = COMMISSION_RATES[organizer.subscription_tier || 'free'] || COMMISSION_RATES.free;
      const platformFeeCents = Math.round(totalAmount * platformFeeRate);
      const netAmountCents = totalAmount - platformFeeCents;

      console.log(`Ticket checkout: Total €${(totalAmount / 100).toFixed(2)}, Fee €${(platformFeeCents / 100).toFixed(2)}, Net €${(netAmountCents / 100).toFixed(2)}`);

      // Create checkout session for ticket purchase
      // Money held on platform, transferred 2 days after event via automated payout system
      
      // Build line items from detailed array (each seat/zone spot separate)
      const stripeLineItems = lineItems && Array.isArray(lineItems) && lineItems.length > 0
        ? lineItems.map((item: any) => ({
            price_data: {
              currency: 'eur',
              product_data: {
                name: item.name || 'Ticket',
                description: item.description || '',
              },
              unit_amount: Math.round(item.price * 100),
            },
            quantity: 1, // Each line item is for 1 seat/spot
          }))
        : [
            // Fallback for old API calls without lineItems
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
          ];
      
      const buildTicketSession = async (custId: string) => stripe.checkout.sessions.create({
        customer: custId,
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: stripeLineItems,
        success_url: successUrl + (successUrl.includes('?') ? '&' : '?') + 'session_id={CHECKOUT_SESSION_ID}',
        cancel_url: cancelUrl,
        payment_intent_data: {
          statement_descriptor_suffix: buildDescriptorSuffix(eventName || 'Event', 'EVENT'),
          // Add metadata so payment_intent.succeeded webhook can reconcile if checkout.session.completed is missed
          metadata: {
            type: 'ticket',
            user_id: userId,
            event_id: eventId,
            ticket_count: actualTicketCount.toString(),
            ticket_template_id: ticketTemplateId || '',
            ticket_type: ticketType || 'general',
            ticket_name: ticketName || 'Standard',
            organizer_id: event.organizer_id,
          },
        },
        metadata: {
          user_id: userId,
          event_id: eventId,
          ticket_count: actualTicketCount.toString(),
          ticket_template_id: ticketTemplateId || '',
          ticket_type: ticketType || 'general',
          ticket_name: ticketName || 'Standard',
          organizer_id: event.organizer_id,
          organizer_connect_account: organizer.stripe_connect_account_id || '',
          organizer_tier: organizer.subscription_tier || 'free',
          platform_fee_cents: platformFeeCents.toString(),
          gross_amount_cents: totalAmount.toString(),
          net_amount_cents: netAmountCents.toString(),
          type: 'ticket',
        },
      });

      try {
        session = await buildTicketSession(customerId);
      } catch (err: any) {
        if (err?.message?.includes('No such customer')) {
          console.warn('Stripe customer missing, recreating and retrying (tickets)...');
          const newCust = await recreateCustomer();
          session = await buildTicketSession(newCust);
        } else {
          throw err;
        }
      }

      // Create pending ticket records with template ID, type, and price_paid
      const now = new Date().toISOString();
      
      // Build tickets array with individual prices from lineItems if available
      let tickets: any[];
      if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
        // New API: create ticket for each line item with its specific price and seatId
        tickets = lineItems.map((item: any, index: number) => ({
          user_id: userId,
          event_id: eventId,
          ticket_template_id: ticketTemplateId || null,
          ticket_type: ticketType || 'general',
          ticket_name: item.name || ticketName || 'Standard Ticket',
          price_paid: item.price,
          holder_name: user?.name || 'Guest',
          holder_email: user?.email || customerEmail || 'guest@eventnexus.eu',
          qr_code: crypto.randomUUID(),
          status: 'valid',
          purchased_at: now,
          payment_status: 'pending',
          stripe_session_id: session.id,
          purchase_date: now,
          seat_id: item.seatId || null, // Store seat/zone ID if provided
        }));
      } else {
        // Old API: create identical tickets using pricePerTicket
        tickets = Array.from({ length: actualTicketCount }, () => ({
          user_id: userId,
          event_id: eventId,
          ticket_template_id: ticketTemplateId || null,
          ticket_type: ticketType || 'general',
          ticket_name: ticketName || 'Standard Ticket',
          price_paid: pricePerTicket,
          holder_name: user?.name || 'Guest',
          holder_email: user?.email || customerEmail || 'guest@eventnexus.eu',
          qr_code: crypto.randomUUID(),
          status: 'valid',
          purchased_at: now,
          payment_status: 'pending',
          stripe_session_id: session.id,
          purchase_date: now,
        }));
      }

      const { error: ticketInsertError } = await supabase.from('tickets').insert(tickets);
      if (ticketInsertError) {
        console.error('Error creating tickets:', ticketInsertError);
        throw new Error('Failed to create ticket records');
      }
      
      console.log(`✓ Created ${actualTicketCount} pending tickets for session ${session.id}`);
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
