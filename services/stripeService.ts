/**
 * Stripe Payment Service
 * Handles all Stripe payment operations for EventNexus platform
 */

import { supabase } from './supabase';

// Get Stripe keys from environment or Supabase config
const getStripePublicKey = async (): Promise<string> => {
  // Try to get from system_config table
  const { data } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'stripe_public_key')
    .single();
  
  if (data?.value) {
    return typeof data.value === 'string' ? data.value : data.value as string;
  }
  
  // Fallback to environment variable
  return import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';
};

/**
 * Create a Stripe checkout session for subscription upgrade
 */
export const createSubscriptionCheckout = async (
  userId: string,
  tier: 'pro' | 'premium' | 'enterprise',
  userEmail: string
): Promise<string | null> => {
  try {
    const publicKey = await getStripePublicKey();
    if (!publicKey) {
      console.error('Stripe public key not configured');
      return null;
    }

    // Price mapping (these should match your Stripe product price IDs)
    const priceIds: Record<string, string> = {
      pro: 'price_pro_monthly',
      premium: 'price_premium_monthly',
      enterprise: 'price_enterprise_monthly'
    };

    // Get the base URL including the /EventNexus/ path for GitHub Pages
    const baseUrl = window.location.origin + window.location.pathname.split('#')[0];
    
    // Call Supabase Edge Function to create checkout session
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: {
        userId,
        tier,
        priceId: priceIds[tier],
        customerEmail: userEmail,
        successUrl: `${baseUrl}#/dashboard?checkout=success`,
        cancelUrl: `${baseUrl}#/pricing?checkout=cancelled`
      }
    });

    if (error) {
      console.error('Error creating checkout session:', error);
      throw new Error(error.message || 'Failed to create checkout session');
    }

    if (!data?.url) {
      console.error('No checkout URL returned:', data);
      throw new Error(data?.error || 'No checkout URL received from payment system');
    }

    return data.url;
  } catch (error) {
    console.error('Stripe checkout error:', error);
    throw error;
  }
};

/**
 * Create a Stripe checkout session for ticket purchase
 */
export const createTicketCheckout = async (
  userId: string,
  eventId: string,
  ticketCount: number,
  pricePerTicket: number,
  eventName: string
): Promise<string | null> => {
  try {
    const publicKey = await getStripePublicKey();
    if (!publicKey) {
      console.error('Stripe public key not configured');
      return null;
    }

    // Get the base URL including the /EventNexus/ path for GitHub Pages
    const baseUrl = window.location.origin + window.location.pathname.split('#')[0];

    // Call Supabase Edge Function to create checkout session
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: {
        userId,
        eventId,
        ticketCount,
        pricePerTicket,
        eventName,
        successUrl: `${baseUrl}#/events/${eventId}?purchase=success`,
        cancelUrl: `${baseUrl}#/events/${eventId}?purchase=cancelled`
      }
    });

    if (error) {
      console.error('Error creating ticket checkout session:', error);
      return null;
    }

    return data?.url || null;
  } catch (error) {
    console.error('Stripe ticket checkout error:', error);
    return null;
  }
};

/**
 * Get user's current subscription status from Stripe
 */
export const getUserSubscriptionStatus = async (userId: string) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('subscription_tier, subscription_status, subscription_end_date, stripe_customer_id')
      .eq('id', userId)
      .single();

    return user;
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return null;
  }
};

/**
 * Cancel user subscription
 */
export const cancelSubscription = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.functions.invoke('cancel-subscription', {
      body: { userId }
    });

    if (error) {
      console.error('Error cancelling subscription:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    return false;
  }
};

/**
 * Check if checkout was successful (from URL params)
 */
export const checkCheckoutSuccess = (): boolean => {
  const params = new URLSearchParams(window.location.hash.split('?')[1]);
  return params.get('checkout') === 'success' || params.get('purchase') === 'success';
};

/**
 * Clear checkout status from URL
 */
export const clearCheckoutStatus = () => {
  const hash = window.location.hash.split('?')[0];
  window.history.replaceState(null, '', hash);
};
