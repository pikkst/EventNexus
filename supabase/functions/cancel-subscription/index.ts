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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      throw new Error('Missing userId');
    }

    console.log(`Cancelling subscription for user: ${userId}`);

    // Get user's stripe subscription ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stripe_subscription_id, subscription_tier, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new Error('User not found');
    }

    if (!user.stripe_subscription_id) {
      throw new Error('No active subscription found');
    }

    // Cancel subscription at period end (not immediately)
    const subscription = await stripe.subscriptions.update(
      user.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    );

    console.log(`Subscription ${subscription.id} will cancel at period end:`, new Date(subscription.current_period_end * 1000));

    // Update user record
    await supabase
      .from('users')
      .update({
        subscription_status: 'cancelled',
      })
      .eq('id', userId);

    // Send notification
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'subscription',
      message: `Your ${user.subscription_tier} subscription will end on ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}. You can reactivate anytime before then.`,
      read: false,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription cancelled',
        cancellation_date: new Date(subscription.current_period_end * 1000).toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
