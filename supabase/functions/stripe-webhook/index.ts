import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@12.17.0?dts';

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const TICKET_HASH_SECRET = Deno.env.get('TICKET_HASH_SECRET') || 'eventnexus-production-secret-2025';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient()
    })
  : null;

/**
 * Generate secure QR code data for ticket
 * Format: ENX-{ticketId}-{hash}
 */
async function generateSecureQRCode(
  ticketId: string,
  eventId: string,
  userId: string
): Promise<string> {
  const data = `${ticketId}-${eventId}-${userId}-${TICKET_HASH_SECRET}`;
  
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  const hash = hashHex.substring(0, 12);
  return `ENX-${ticketId}-${hash}`;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the signature from headers
    const signature = req.headers.get('stripe-signature');
    
    // Get the raw body
    const body = await req.text();

    // Log for debugging
    console.log('Received Stripe webhook:', {
      hasSignature: !!signature,
      bodyLength: body.length,
      method: req.method
    });

    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      console.error('Stripe webhook not configured: missing secret key or signing secret');
      return new Response('Stripe webhook not configured', { status: 500, headers: corsHeaders });
    }

    if (!signature) {
      console.error('Missing Stripe signature');
      return new Response('Signature required', { status: 400, headers: corsHeaders });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Stripe webhook verification failed:', err instanceof Error ? err.message : err);
      return new Response('Invalid signature', { status: 400, headers: corsHeaders });
    }

    console.log('Received Stripe event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout session completed:', session.id);
        
        const metadata = session.metadata || {};
        
        // Handle ticket purchase
        if (metadata.type === 'ticket' && metadata.event_id) {
          console.log('Processing ticket purchase - Session ID:', session.id, 'Event ID:', metadata.event_id, 'User ID:', metadata.user_id);
          
          // Wait a brief moment to ensure tickets were created in create-checkout
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Get pending tickets for this session
          const { data: pendingTickets, error: ticketError } = await supabase
            .from('tickets')
            .select('id, stripe_session_id, payment_status')
            .eq('stripe_session_id', session.id)
            .eq('payment_status', 'pending');

          if (ticketError) {
            console.error('Error fetching pending tickets:', ticketError);
          }

          console.log(`Found ${pendingTickets?.length || 0} pending tickets for session ${session.id}`);
          if (pendingTickets && pendingTickets.length > 0) {
            console.log('Pending tickets:', pendingTickets);
          }
          
          if (pendingTickets && pendingTickets.length > 0) {
            console.log(`Updating ${pendingTickets.length} tickets to paid status...`);
            
            // Generate secure QR codes for each ticket using Edge Function
            for (const ticket of pendingTickets) {
              // Generate secure hash-based QR code data
              const qrData = await generateSecureQRCode(
                ticket.id,
                metadata.event_id,
                metadata.user_id
              );

              // Update ticket with proper QR code and payment status
              const now = new Date().toISOString();
              const { error: updateError } = await supabase
                .from('tickets')
                .update({ 
                  payment_status: 'paid',
                  stripe_payment_id: session.payment_intent,
                  qr_code: qrData,
                  status: 'valid',
                  purchased_at: now,
                  purchase_date: now
                })
                .eq('id', ticket.id);
              
              if (updateError) {
                console.error(`Error updating ticket ${ticket.id}:`, updateError);
              }
            }
            
            console.log(`✓ Generated secure QR codes for ${pendingTickets.length} tickets (session: ${session.id})`);
          } else {
            console.warn(`⚠️ No pending tickets found for session ${session.id}. This might indicate webhook arrived before tickets were created.`);
            
            // Fallback: Try to find tickets by user_id and event_id if session_id didn't match
            const { data: fallbackTickets } = await supabase
              .from('tickets')
              .select('id')
              .eq('user_id', metadata.user_id)
              .eq('event_id', metadata.event_id)
              .eq('payment_status', 'pending');
            
            if (fallbackTickets && fallbackTickets.length > 0) {
              console.log(`Found ${fallbackTickets.length} tickets via fallback (user+event), updating them...`);
              for (const ticket of fallbackTickets) {
                const qrData = await generateSecureQRCode(
                  ticket.id,
                  metadata.event_id,
                  metadata.user_id
                );
                
                const now = new Date().toISOString();
                await supabase
                  .from('tickets')
                  .update({ 
                    payment_status: 'paid',
                    stripe_payment_id: session.payment_intent,
                    stripe_session_id: session.id,
                    qr_code: qrData,
                    status: 'valid',
                    purchased_at: now,
                    purchase_date: now
                  })
                  .eq('id', ticket.id);
              }
              console.log(`✓ Updated ${fallbackTickets.length} tickets via fallback`);
            }
          }
          
          // Update event's attendees_count to reflect paid tickets
          const { data: allPaidTickets } = await supabase
            .from('tickets')
            .select('id', { count: 'exact' })
            .eq('event_id', metadata.event_id)
            .eq('payment_status', 'paid');
          
          const paidTicketCount = allPaidTickets?.length || 0;
          
          // Update event with new attendee count
          const { error: eventUpdateError } = await supabase
            .from('events')
            .update({ attendees_count: paidTicketCount })
            .eq('id', metadata.event_id);
          
          if (eventUpdateError) {
            console.error('Error updating event attendee count:', eventUpdateError);
          } else {
            console.log(`✓ Updated event ${metadata.event_id} attendees count to ${paidTicketCount}`);
          }
          
          // NOTE: DO NOT transfer money immediately to organizer
          // Money is held until 2 days after event date for refund protection
          // Automated payout happens via process-scheduled-payouts Edge Function
          console.log('Payment held for post-event payout (organizer:', metadata.organizer_id, ')');
          
          // Send notification to customer
          await supabase.from('notifications').insert({
            user_id: metadata.user_id,
            type: 'event_update',
            title: 'Tickets Ready!',
            message: `✓ Payment confirmed! Your tickets are ready with QR codes. View them in your profile.`,
            sender_name: 'EventNexus',
            isRead: false,
          });
        }
        
        // Handle subscription
        if (metadata.type === 'subscription' && metadata.user_id && metadata.tier) {
          // Get subscription amount from session
          const amount_cents = session.amount_total; // Already in cents
          const amount = amount_cents / 100; // Convert to euros for logging
          
          // Update user subscription status
          await supabase
            .from('users')
            .update({
              subscription_tier: metadata.tier,
              subscription_status: 'active',
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription
            })
            .eq('id', metadata.user_id);
          
          // Record subscription payment in financial ledger
          await supabase.from('subscription_payments').insert({
            user_id: metadata.user_id,
            subscription_tier: metadata.tier,
            amount_cents: amount_cents,
            currency: session.currency,
            stripe_invoice_id: session.invoice || null,
            stripe_payment_intent_id: session.payment_intent || null,
            status: 'succeeded',
            billing_reason: 'subscription_create',
            period_start: new Date(session.created * 1000).toISOString(),
            period_end: session.subscription ? new Date((session.created + 2592000) * 1000).toISOString() : null, // +30 days estimate
            metadata: { session_id: session.id }
          });
          
          console.log(`Subscription activated: ${metadata.tier} for user ${metadata.user_id}, amount: €${amount}`);
          
          // Send notification to user
          await supabase.from('notifications').insert({
            user_id: metadata.user_id,
            type: 'system',
            title: `Welcome to ${metadata.tier.charAt(0).toUpperCase() + metadata.tier.slice(1)}!`,
            message: `Your subscription is now active. Enjoy unlimited event creation${metadata.tier === 'premium' || metadata.tier === 'enterprise' ? ', advanced analytics, and premium features' : ' and advanced tools'}!`,
            sender_name: 'EventNexus',
            isRead: false,
          });
        }
        break;
      }

      case 'account.updated': {
        // Handle Stripe Connect account updates (onboarding completion)
        const account = event.data.object;
        console.log('Connect account updated:', account.id);
        
        // Find user with this Connect account
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_connect_account_id', account.id)
          .single();

        if (user) {
          // Update Connect account status
          await supabase
            .from('users')
            .update({
              stripe_connect_onboarding_complete: account.details_submitted || false,
              stripe_connect_details_submitted: account.details_submitted || false,
              stripe_connect_charges_enabled: account.charges_enabled || false,
              stripe_connect_payouts_enabled: account.payouts_enabled || false,
            })
            .eq('id', user.id);
          
          console.log('Updated Connect status for user:', user.id);
          
          // If onboarding complete, send notification
          if (account.details_submitted && account.charges_enabled) {
            await supabase.from('notifications').insert({
              user_id: user.id,
              type: 'payout',
              message: '✓ Payment setup complete! You can now receive payouts from ticket sales.',
              read: false,
            });
          }
        }
        break;
      }

      case 'transfer.created': {
        const transfer = event.data.object;
        console.log('Transfer created:', transfer.id, '→', transfer.destination);
        break;
      }

      case 'transfer.paid': {
        const transfer = event.data.object;
        console.log('Transfer paid:', transfer.id);
        
        // Update payout record if exists
        await supabase
          .from('payouts')
          .update({ status: 'paid' })
          .eq('stripe_transfer_id', transfer.id);
        
        break;
      }

      case 'transfer.failed': {
        const transfer = event.data.object;
        console.error('Transfer failed:', transfer.id, transfer.failure_message);
        
        // Update payout record
        await supabase
          .from('payouts')
          .update({
            status: 'failed',
            error_message: transfer.failure_message || 'Transfer failed',
          })
          .eq('stripe_transfer_id', transfer.id);
        
        // Get payout details to notify organizer
        const { data: payout } = await supabase
          .from('payouts')
          .select('user_id, event:events(name)')
          .eq('stripe_transfer_id', transfer.id)
          .single();

        if (payout) {
          await supabase.from('notifications').insert({
            user_id: payout.user_id,
            type: 'system',
            message: `⚠️ Payout failed for "${payout.event?.name}". Please update your bank account details.`,
            read: false,
          });
        }
        
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('Invoice payment succeeded:', invoice.id);
        
        // Handle subscription invoice payments
        if (invoice.subscription) {
          const { data: user } = await supabase
            .from('users')
            .select('id, subscription_tier')
            .eq('stripe_subscription_id', invoice.subscription)
            .single();

          if (user) {
            const amount_cents = invoice.amount_paid; // Already in cents
            const amount = amount_cents / 100; // Convert cents to euros
            console.log(`Subscription payment received: €${amount} from user ${user.id} (${user.subscription_tier})`);
            
            // Record recurring payment in financial ledger
            await supabase.from('subscription_payments').insert({
              user_id: user.id,
              subscription_tier: user.subscription_tier,
              amount_cents: amount_cents,
              currency: invoice.currency,
              stripe_invoice_id: invoice.id,
              stripe_payment_intent_id: invoice.payment_intent || null,
              status: 'succeeded',
              billing_reason: invoice.billing_reason || 'subscription_cycle',
              period_start: new Date(invoice.period_start * 1000).toISOString(),
              period_end: new Date(invoice.period_end * 1000).toISOString(),
              metadata: { invoice_number: invoice.number }
            });
            
            // Send notification for recurring payments (not first payment)
            if (invoice.billing_reason === 'subscription_cycle') {
              await supabase.from('notifications').insert({
                user_id: user.id,
                type: 'subscription',
                message: `✓ Subscription renewed successfully. Thank you for being a ${user.subscription_tier.toUpperCase()} member!`,
                read: false,
              });
            }
          }
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Log full subscription object for debugging
        console.log(`[DEBUG] Subscription ${event.type}:`, JSON.stringify({
          id: subscription.id,
          status: subscription.status,
          metadata: subscription.metadata,
          items: subscription.items?.data?.map((item: any) => ({
            price_id: item.price?.id,
            price_metadata: item.price?.metadata
          }))
        }));
        
        // Get current user to check if tier is already set
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, email, subscription_tier, stripe_subscription_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (userError) {
          console.error(`[ERROR] Failed to find user with customer_id ${customerId}:`, userError);
          break;
        }

        if (!user) {
          console.error(`[ERROR] No user found for customer_id: ${customerId}`);
          break;
        }
        
        // Extract tier from subscription metadata or price metadata
        let tier = null;
        if (subscription.metadata?.tier) {
          tier = subscription.metadata.tier;
          console.log(`[DEBUG] Found tier in subscription.metadata: ${tier}`);
        } else if (subscription.items?.data?.[0]?.price?.metadata?.tier) {
          tier = subscription.items.data[0].price.metadata.tier;
          console.log(`[DEBUG] Found tier in price.metadata: ${tier}`);
        }
        
        // IMPORTANT: If this is a NEW subscription (created event) and tier is not in metadata,
        // check if checkout.session.completed already set the tier.
        // Don't overwrite with 'free'!
        if (!tier && event.type === 'customer.subscription.created' && user.subscription_tier !== 'free') {
          console.log(`[INFO] Subscription created but tier already set to ${user.subscription_tier} by checkout. Keeping existing tier.`);
          tier = user.subscription_tier;
        } else if (!tier) {
          console.warn(`[WARN] No tier found in subscription metadata for ${subscription.id}`);
          tier = 'free';
        }
        
        console.log(`[INFO] Updating user ${user.id} (${user.email}): tier=${tier}, status=${subscription.status}`);
        
        // Update user subscription status
        const updateData: any = {
          subscription_status: subscription.status,
          subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
          stripe_subscription_id: subscription.id
        };
        
        // Only update tier if we have a valid one
        if (tier && tier !== 'free') {
          updateData.subscription_tier = tier;
        }
        
        const { error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', user.id);
        
        if (updateError) {
          console.error(`[ERROR] Failed to update user ${user.id}:`, updateError);
        } else {
          console.log(`[SUCCESS] Updated user ${user.id}: tier=${tier}, status=${subscription.status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Downgrade to free tier
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (user) {
          await supabase
            .from('users')
            .update({
              subscription_tier: 'free',
              subscription_status: 'cancelled',
              subscription_end_date: null
            })
            .eq('id', user.id);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log('Payment succeeded:', paymentIntent.id);
        
        // Update payment records
        const metadata = paymentIntent.metadata || {};
        if (metadata.ticket_id) {
          await supabase
            .from('tickets')
            .update({ 
              payment_status: 'paid',
              stripe_payment_id: paymentIntent.id
            })
            .eq('id', metadata.ticket_id);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        console.log('Payment failed:', paymentIntent.id);
        
        const metadata = paymentIntent.metadata || {};
        if (metadata.ticket_id) {
          await supabase
            .from('tickets')
            .update({ 
              payment_status: 'failed'
            })
            .eq('id', metadata.ticket_id);
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
