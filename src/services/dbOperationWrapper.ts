/**
 * Database Operation Wrapper with Network Resilience
 * Adds retry logic and auth recovery to database operations
 */

import logger from '../utils/logger';
import { 
  isNetworkError, 
  isAuthTokenExpired, 
  handleAuthError,
  retryWithBackoff,
  getNetworkErrorMessage,
  withAuthRecovery
} from '../utils/networkResilience';

export interface DBOperationResult<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    isNetworkError: boolean;
    isAuthError: boolean;
    userFriendlyMessage: string;
  };
}

/**
 * Wrapper for database operations with automatic retry and auth recovery
 */
export async function withDBOperation<T>(
  operation: () => Promise<T>,
  operationName: string = 'Database Operation',
  options: {
    maxRetries?: number;
    retryOnAuth?: boolean;
    retryOnNetwork?: boolean;
  } = {}
): Promise<DBOperationResult<T>> {
  const {
    maxRetries = 3,
    retryOnAuth = true,
    retryOnNetwork = true,
  } = options;
  
  try {
    // Use auth recovery middleware
    const data = await withAuthRecovery(
      async () => {
        if (retryOnNetwork) {
          const result = await retryWithBackoff(operation, maxRetries);
          if (!result.success) {
            throw result.error;
          }
          return result.data!;
        }
        return await operation();
      },
      undefined
    );
    
    return { success: true, data };
  } catch (error: any) {
    const isNetError = isNetworkError(error);
    const isAuthErr = isAuthTokenExpired(error);
    
    logger.error(`${operationName} failed`, {
      isNetworkError: isNetError,
      isAuthError: isAuthErr,
      code: error.code || error.status,
      message: error.message
    });
    
    // If auth error and retry enabled, attempt recovery
    if (isAuthErr && retryOnAuth) {
      const recovered = await handleAuthError(error, true);
      if (recovered) {
        // Retry operation one more time
        try {
          const retryData = await withAuthRecovery(operation, undefined);
          return { success: true, data: retryData };
        } catch (retryError: any) {
          logger.error(`${operationName} failed after auth recovery`, { error: retryError });
        }
      }
    }
    
    return {
      success: false,
      error: {
        message: error.message || 'Unknown error',
        code: error.code || error.status?.toString(),
        isNetworkError: isNetError,
        isAuthError: isAuthErr,
        userFriendlyMessage: getNetworkErrorMessage(error)
      }
    };
  }
}

/**
 * Helper to check if operation should be retried
 */
export function shouldRetryOperation(error: any): boolean {
  // Retry on network errors
  if (isNetworkError(error)) {
    return true;
  }
  
  // Retry on server errors (5xx)
  if (error.status >= 500 && error.status < 600) {
    return true;
  }
  
  // Retry on rate limit (429)
  if (error.status === 429) {
    return true;
  }
  
  // Don't retry on client errors (4xx) except 429
  if (error.status >= 400 && error.status < 500) {
    return false;
  }
  
  // Retry on auth errors (special handling)
  if (isAuthTokenExpired(error)) {
    return true; // But handle separately with token refresh
  }
  
  return false;
}

/**
 * Get retry delay based on error type and attempt
 */
export function getRetryDelay(error: any, attemptNumber: number): number {
  // For rate limiting, use Retry-After header if available
  if (error.status === 429) {
    const retryAfter = error.headers?.get?.('Retry-After');
    if (retryAfter) {
      return parseInt(retryAfter) * 1000;
    }
    // Default 60 second wait for rate limit
    return 60000;
  }
  
  // Exponential backoff for network errors: 1s, 2s, 4s, 8s...
  if (isNetworkError(error)) {
    return Math.min(1000 * Math.pow(2, attemptNumber - 1), 30000);
  }
  
  // Linear backoff for server errors
  return attemptNumber * 1000;
}

export default {
  withDBOperation,
  shouldRetryOperation,
  getRetryDelay
};
