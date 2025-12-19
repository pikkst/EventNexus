import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    // TODO: Verify webhook signature with Stripe
    // For now, parse the event (signature verification disabled for testing)
    const event = JSON.parse(body);

    console.log('Received Stripe event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout session completed:', session.id);
        
        const metadata = session.metadata || {};
        
        // Handle ticket purchase
        if (metadata.type === 'ticket' && metadata.event_id) {
          // Update ticket status from pending to paid
          await supabase
            .from('tickets')
            .update({ 
              payment_status: 'paid',
              stripe_payment_id: session.payment_intent,
              qr_code: crypto.randomUUID() // Generate final QR code
            })
            .eq('stripe_session_id', session.id)
            .eq('payment_status', 'pending');
          
          console.log('Tickets updated for session:', session.id);
          
          // NOTE: DO NOT transfer money immediately to organizer
          // Money is held until 2 days after event date for refund protection
          // Automated payout happens via process-scheduled-payouts Edge Function
          console.log('Payment held for post-event payout (organizer:', metadata.organizer_id, ')');
          
          // Send notification to customer
          await supabase.from('notifications').insert({
            user_id: metadata.user_id,
            type: 'ticket',
            message: `✓ Payment confirmed! Your tickets for the event are ready.`,
            read: false,
          });
        }
        
        // Handle subscription
        if (metadata.type === 'subscription' && metadata.user_id && metadata.tier) {
          // Get subscription amount from session
          const amount = session.amount_total / 100; // Convert from cents to euros
          
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
          
          console.log(`Subscription activated: ${metadata.tier} for user ${metadata.user_id}, amount: €${amount}`);
          
          // Send notification to user
          await supabase.from('notifications').insert({
            user_id: metadata.user_id,
            type: 'subscription',
            message: `✓ Welcome to ${metadata.tier.toUpperCase()} tier! Your subscription is now active.`,
            read: false,
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
            const amount = invoice.amount_paid / 100; // Convert cents to euros
            console.log(`Subscription payment received: €${amount} from user ${user.id} (${user.subscription_tier})`);
            
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
