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

interface VerifyConnectRequest {
  userId: string;
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
    const { userId }: VerifyConnectRequest = await req.json();

    console.log('🔄 verify-connect-onboarding called for user:', userId);

    if (!userId) {
      console.error('❌ Missing userId in request');
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Get user's Connect account ID from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stripe_connect_account_id, stripe_connect_onboarding_complete')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ Database error fetching user:', userError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch user from database',
          details: userError.message
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    if (!user?.stripe_connect_account_id) {
      console.warn('⚠️ User does not have a Connect account ID');
      return new Response(
        JSON.stringify({ 
          error: 'User does not have a Connect account',
          hasAccount: false
        }),
        { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    console.log('📋 Fetching Stripe account:', user.stripe_connect_account_id);

    // Fetch account status from Stripe
    const account = await stripe.accounts.retrieve(user.stripe_connect_account_id);

    console.log('✅ Stripe account retrieved:', {
      accountId: account.id,
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      requirements_currently_due: account.requirements?.currently_due || [],
      requirements_past_due: account.requirements?.past_due || [],
    });

    // Update database with current status from Stripe
    const { error: updateError } = await supabase
      .from('users')
      .update({
        stripe_connect_onboarding_complete: account.details_submitted || false,
        stripe_connect_details_submitted: account.details_submitted || false,
        stripe_connect_charges_enabled: account.charges_enabled || false,
        stripe_connect_payouts_enabled: account.payouts_enabled || false,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Failed to update user Connect status:', updateError);
    } else {
      console.log('✅ Database updated with Connect status');
    }

    // If onboarding just completed, send notification
    if (account.details_submitted && !user.stripe_connect_onboarding_complete) {
      console.log('🎉 Onboarding just completed! Sending notification...');
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: userId,
        type: 'payout',
        title: 'Bank Account Connected!',
        message: '✓ Your Stripe Connect setup is complete! You can now receive payouts from ticket sales automatically.',
        sender_name: 'EventNexus Payments',
        isRead: false,
      });
      
      if (notifError) {
        console.error('❌ Failed to send notification:', notifError);
      } else {
        console.log('✅ Notification sent');
      }
    }

    console.log('✅ Verification complete, returning response');

    return new Response(
      JSON.stringify({
        success: true,
        accountId: account.id,
        hasAccount: true,
        onboardingComplete: account.details_submitted || false,
        chargesEnabled: account.charges_enabled || false,
        payoutsEnabled: account.payouts_enabled || false,
        requirements: {
          currently_due: account.requirements?.currently_due || [],
          eventually_due: account.requirements?.eventually_due || [],
          past_due: account.requirements?.past_due || [],
        }
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    console.error('❌ verify-connect-onboarding error:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
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
