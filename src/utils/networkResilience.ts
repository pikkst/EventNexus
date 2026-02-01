/**
 * Network Resilience Utilities
 * Handles authentication edge cases and network failures with proper recovery
 */

import logger from './logger';
import { supabase } from '../services/supabase';

// Network error detection
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() || '';
  const isNetworkMessage = 
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('offline') ||
    message.includes('timeout') ||
    message.includes('connection');
  
  const errorCode = error.code || error.status;
  const isNetworkCode = 
    errorCode === 0 || // Network error
    errorCode === 'NETWORK_ERROR' ||
    errorCode === 'ECONNREFUSED' ||
    errorCode === 'ENOTFOUND' ||
    errorCode === 'ETIMEDOUT';
  
  return isNetworkMessage || isNetworkCode;
}

// Auth token expiration detection
export function isAuthTokenExpired(error: any): boolean {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() || '';
  const status = error.status || error.code;
  
  return (
    status === 401 ||
    status === 403 ||
    message.includes('invalid token') ||
    message.includes('expired') ||
    message.includes('unauthorized') ||
    message.includes('jwt') ||
    message.includes('invalid jwt')
  );
}

// Detect if user session has expired
export async function isSessionExpired(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      logger.warn('Error checking session:', { code: error.code });
      return true;
    }
    
    if (!session) {
      return true;
    }
    
    // Check token expiration time
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - now;
      
      // Consider expired if less than 1 minute remaining
      return timeUntilExpiry < 60;
    }
    
    return false;
  } catch (error) {
    logger.error('Error checking session expiration:', { error });
    return true;
  }
}

// Attempt to refresh session
export async function refreshSessionSafely(): Promise<boolean> {
  try {
    logger.log('Attempting session refresh...');
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      logger.warn('Session refresh failed:', { code: error.code, message: error.message });
      return false;
    }
    
    if (data.session) {
      logger.log('Session refreshed successfully');
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('Error refreshing session:', { error });
    return false;
  }
}

// Handle auth error by attempting recovery
export async function handleAuthError(error: any, attemptRecovery: boolean = true): Promise<boolean> {
  if (!isAuthTokenExpired(error)) {
    return false;
  }
  
  logger.warn('Auth token expired or invalid', { code: error.code });
  
  if (!attemptRecovery) {
    return false;
  }
  
  // Try to refresh
  const refreshed = await refreshSessionSafely();
  
  if (!refreshed) {
    // Force logout if refresh fails
    try {
      await supabase.auth.signOut();
      logger.log('User signed out due to auth failure');
    } catch (e) {
      logger.error('Error during logout:', { error: e });
    }
  }
  
  return refreshed;
}

// Detect online/offline status
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') {
    return true;
  }
  return navigator.onLine;
}

// Wait for network to come back online
export function waitForNetwork(timeoutMs: number = 30000): Promise<boolean> {
  return new Promise((resolve) => {
    if (isOnline()) {
      resolve(true);
      return;
    }
    
    const timeout = setTimeout(() => {
      window.removeEventListener('online', handleOnline);
      resolve(false);
    }, timeoutMs);
    
    const handleOnline = () => {
      clearTimeout(timeout);
      window.removeEventListener('online', handleOnline);
      resolve(true);
    };
    
    window.addEventListener('online', handleOnline);
  });
}

// Retry logic with exponential backoff
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 10000
): Promise<{ success: boolean; data?: T; error?: Error }> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const data = await operation();
      if (attempt > 1) {
        logger.log('Operation succeeded after retry', { attempt });
      }
      return { success: true, data };
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on auth errors (handle separately)
      if (isAuthTokenExpired(error)) {
        logger.warn('Auth error detected, not retrying', { code: error.code });
        return { success: false, error };
      }
      
      // Don't retry on non-network errors
      if (!isNetworkError(error)) {
        logger.warn('Non-network error, not retrying', { code: error.code });
        return { success: false, error };
      }
      
      if (attempt < maxAttempts) {
        // Exponential backoff: 1s, 2s, 4s...
        const delayMs = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        logger.log('Retrying operation', { attempt, delayMs });
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  return { success: false, error: lastError || new Error('Max retries exceeded') };
}

// Resilient fetch wrapper
export async function resilientFetch(
  url: string,
  options?: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  const result = await retryWithBackoff(
    () => fetch(url, options),
    maxRetries
  );
  
  if (!result.success) {
    throw result.error;
  }
  
  return result.data!;
}

// Network error user-friendly messages
export function getNetworkErrorMessage(error: any): string {
  if (!error) {
    return 'An error occurred. Please try again.';
  }
  
  const message = error.message?.toLowerCase() || '';
  
  if (isNetworkError(error)) {
    if (!isOnline()) {
      return 'You appear to be offline. Please check your internet connection.';
    }
    if (message.includes('timeout')) {
      return 'The request took too long. Please try again.';
    }
    return 'Network error. Please check your connection and try again.';
  }
  
  if (isAuthTokenExpired(error)) {
    return 'Your session has expired. Please log in again.';
  }
  
  if (error.status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  
  if (error.status === 500) {
    return 'Server error. Please try again in a moment.';
  }
  
  return 'Something went wrong. Please try again.';
}

// Monitor network status
export function startNetworkMonitoring(
  onOnline?: () => void,
  onOffline?: () => void
): () => void {
  const handleOnline = () => {
    logger.log('Network connection restored');
    onOnline?.();
  };
  
  const handleOffline = () => {
    logger.warn('Network connection lost');
    onOffline?.();
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// Session inactivity timeout handler
export function setupSessionTimeout(
  inactivityMs: number = 30 * 60 * 1000, // 30 minutes
  onTimeout?: () => void
): () => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  const resetTimeout = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(async () => {
      logger.warn('Session inactivity timeout triggered');
      
      // Check if session actually expired
      const expired = await isSessionExpired();
      if (expired) {
        logger.log('Session confirmed expired');
        try {
          await supabase.auth.signOut();
        } catch (e) {
          logger.error('Error signing out on timeout:', { error: e });
        }
        onTimeout?.();
      }
    }, inactivityMs);
  };
  
  // Track user activity
  const resetOnActivity = () => {
    resetTimeout();
  };
  
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  events.forEach(event => {
    window.addEventListener(event, resetOnActivity);
  });
  
  // Initial timeout
  resetTimeout();
  
  // Return cleanup function
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    events.forEach(event => {
      window.removeEventListener(event, resetOnActivity);
    });
  };
}

// Auth recovery middleware
export async function withAuthRecovery<T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    if (isAuthTokenExpired(error)) {
      // Try to recover
      const recovered = await handleAuthError(error, true);
      if (recovered) {
        // Retry operation
        try {
          return await operation();
        } catch (retryError) {
          logger.error('Operation failed after auth recovery', { error: retryError });
        }
      }
    }
    
    if (fallback !== undefined) {
      return fallback;
    }
    
    throw error;
  }
}

// Detect and handle common auth scenarios
export const AuthEdgeCases = {
  /**
   * Token refresh on 401 response
   */
  async handleUnauthorized() {
    const refreshed = await refreshSessionSafely();
    if (!refreshed) {
      await supabase.auth.signOut();
      return false;
    }
    return true;
  },
  
  /**
   * Handle network timeout gracefully
   */
  async handleTimeout(retryable: boolean = true) {
    if (!isOnline()) {
      const online = await waitForNetwork();
      return online && retryable;
    }
    return retryable;
  },
  
  /**
   * Validate session before critical operations
   */
  async validateSession() {
    const expired = await isSessionExpired();
    if (expired) {
      const refreshed = await refreshSessionSafely();
      return refreshed;
    }
    return true;
  },
  
  /**
   * Safe logout with error handling
   */
  async logout() {
    try {
      await supabase.auth.signOut();
      logger.log('User logged out successfully');
      return true;
    } catch (error) {
      logger.error('Error during logout:', { error });
      // Clear local data as fallback
      localStorage.removeItem('eventnexus-auth-token');
      return false;
    }
  }
};

export default {
  isNetworkError,
  isAuthTokenExpired,
  isSessionExpired,
  refreshSessionSafely,
  handleAuthError,
  isOnline,
  waitForNetwork,
  retryWithBackoff,
  resilientFetch,
  getNetworkErrorMessage,
  startNetworkMonitoring,
  setupSessionTimeout,
  withAuthRecovery,
  AuthEdgeCases
};
