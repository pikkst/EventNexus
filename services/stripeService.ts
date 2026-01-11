/**
 * Stripe Payment Service
 * Handles all Stripe payment operations for EventNexus platform
 */

import { supabase } from './supabase';
import logger from '../utils/logger';

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
      logger.error('Stripe public key not configured');
      return null;
    }

    // Get the base URL (use origin for clean URLs with BrowserRouter)
    const baseUrl = window.location.origin;
    
    // Call Supabase Edge Function to create checkout session
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: {
        userId,
        tier,
        customerEmail: userEmail,
        successUrl: `${baseUrl}/dashboard?checkout=success`,
        cancelUrl: `${baseUrl}/pricing?checkout=cancelled`
      }
    });

    if (error) {
      logger.error('Error creating checkout session:', error);
      throw new Error(error.message || 'Failed to create checkout session');
    }

    if (!data?.url) {
      logger.error('No checkout URL returned:', data);
      throw new Error(data?.error || 'No checkout URL received from payment system');
    }

    return data.url;
  } catch (error) {
    logger.error('Stripe checkout error:', error);
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
  eventName: string,
  ticketTemplateId?: string,
  ticketType?: string,
  ticketName?: string
): Promise<string | null> => {
  try {
    const publicKey = await getStripePublicKey();
    if (!publicKey) {
      logger.error('Stripe public key not configured');
      return null;
    }

    // Get the base URL (use origin for clean URLs with BrowserRouter)
    const baseUrl = window.location.origin;

    // Call Supabase Edge Function to create checkout session
    // Note: Include session_id placeholder in URL to ensure proper placement
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: {
        userId,
        eventId,
        ticketCount,
        pricePerTicket,
        eventName,
        ticketTemplateId,
        ticketType,
        ticketName,
        successUrl: `${baseUrl}/event/${eventId}?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/event/${eventId}?purchase=cancelled`
      }
    });

    if (error) {
      logger.error('Error creating ticket checkout session:', error);
      return null;
    }

    return data?.url || null;
  } catch (error) {
    logger.error('Stripe ticket checkout error:', error);
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
    logger.error('Error getting subscription status:', error);
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
      logger.error('Error cancelling subscription:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Subscription cancellation error:', error);
    return false;
  }
};

/**
 * Check if checkout was successful (from URL params)
 */
export const checkCheckoutSuccess = (): boolean => {
  // Query params are in URL: ?purchase=success (BrowserRouter will handle routing)
  const params = new URLSearchParams(window.location.search);
  return params.get('checkout') === 'success' || params.get('purchase') === 'success';
};

/**
 * Verify checkout payment by checking session status with Stripe
 * This is called AFTER user returns from Stripe checkout
 */
export const verifyCheckoutPayment = async (sessionId: string): Promise<boolean> => {
  try {
    if (!sessionId) {
      logger.warn('No session ID provided to verify');
      return false;
    }

    // Call Edge Function to verify session with Stripe
    const { data, error } = await supabase.functions.invoke('verify-checkout', {
      body: { sessionId }
    });

    if (error) {
      logger.error('Error verifying checkout:', error);
      return false;
    }

    // If verification returned success, payment was confirmed
    return data?.paid === true || data?.verified === true;
  } catch (error) {
    logger.error('Verify checkout error:', error);
    return false;
  }
};

/**
 * Clear checkout status from URL
 */
export const clearCheckoutStatus = () => {
  // Remove query params but keep hash
  const hash = window.location.hash;
  window.history.replaceState(null, '', window.location.pathname + hash);
};
