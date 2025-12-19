import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  try {
    // Get the signature from headers
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response(JSON.stringify({ error: 'No signature provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the raw body
    const body = await req.text();

    // TODO: Verify webhook signature with Stripe
    // For now, parse the event
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
        }
        
        // Handle subscription
        if (metadata.type === 'subscription' && metadata.user_id && metadata.tier) {
          await supabase
            .from('users')
            .update({
              subscription_tier: metadata.tier,
              subscription_status: 'active'
            })
            .eq('id', metadata.user_id);
          
          console.log('Subscription activated for user:', metadata.user_id);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Update user subscription status
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (user) {
          await supabase
            .from('users')
            .update({
              subscription_tier: subscription.items.data[0]?.price?.metadata?.tier || 'free',
              subscription_status: subscription.status,
              subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString()
            })
            .eq('id', user.id);
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
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
