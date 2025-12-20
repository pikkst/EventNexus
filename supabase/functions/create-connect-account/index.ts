import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const PLATFORM_URL = Deno.env.get('PLATFORM_URL') || 'http://localhost:3000';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface CreateConnectAccountRequest {
  userId: string;
  email: string;
  businessType?: 'individual' | 'company';
  country?: string;
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
    const { userId, email, businessType = 'individual', country = 'EE' }: CreateConnectAccountRequest = await req.json();

    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or email' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has a Connect account
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('stripe_connect_account_id, stripe_connect_onboarding_complete, name')
      .eq('id', userId)
      .single();

    if (userError) {
      throw new Error(`Failed to fetch user: ${userError.message}`);
    }

    let accountId: string;
    let isNewAccount = false;

    if (existingUser?.stripe_connect_account_id) {
      // Use existing account
      accountId = existingUser.stripe_connect_account_id;
      console.log(`Using existing Stripe Connect account: ${accountId}`);
    } else {
      // Create new Stripe Express account
      console.log(`Creating new Stripe Connect account for user ${userId}`);
      
      const account = await stripe.accounts.create({
        type: 'express', // Express accounts are simpler - no separate dashboard login required
        country: country,
        email: email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: businessType,
        metadata: {
          supabase_user_id: userId,
          platform: 'EventNexus',
          created_at: new Date().toISOString(),
        },
      });

      accountId = account.id;
      isNewAccount = true;

      // Store the account ID in the database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          stripe_connect_account_id: accountId,
          stripe_connect_onboarding_complete: false,
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Failed to update user with Connect account ID:', updateError);
        // Don't throw - account is created, just log the error
      }

      console.log(`Created Stripe Connect account ${accountId} for user ${userId}`);
    }

    // Create account link for onboarding (or re-onboarding)
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${PLATFORM_URL}/#/dashboard?connect=refresh`,
      return_url: `${PLATFORM_URL}/#/dashboard?connect=success`,
      type: 'account_onboarding',
    });

    // If it's a new account, send notification
    if (isNewAccount) {
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'system',
        message: 'Complete your Stripe Connect setup to receive payouts',
        read: false,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        accountId: accountId,
        url: accountLink.url,
        expiresAt: accountLink.expires_at,
        isNewAccount: isNewAccount,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    console.error('Create Connect account error:', error);
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
