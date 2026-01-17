/**
 * Rate Limiting Service
 * Client-side rate limiting for expensive operations
 * Prevents abuse and improves UX by giving user feedback
 */

export interface RateLimitConfig {
  maxRequests: number; // Max requests per window
  windowMs: number; // Time window in milliseconds
  keyPrefix?: string; // Storage key prefix
}

export interface RateLimitStatus {
  remaining: number; // Requests remaining
  reset: number; // Timestamp when limit resets
  limited: boolean; // Is the user currently rate limited?
  retryAfterMs: number; // How long to wait before next request
}

/**
 * Rate limiter using sliding window algorithm
 * Stores timestamps of recent requests in sessionStorage
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private storageKey: string;

  constructor(
    private operationName: string,
    config: RateLimitConfig
  ) {
    this.config = {
      keyPrefix: 'ratelimit_',
      ...config
    };
    this.storageKey = `${this.config.keyPrefix}${operationName}`;
  }

  /**
   * Check if operation is allowed
   * Returns status and whether request should be allowed
   */
  checkLimit(): RateLimitStatus {
    try {
      const stored = sessionStorage.getItem(this.storageKey);
      const timestamps = stored ? JSON.parse(stored) : [];
      const now = Date.now();

      // Remove timestamps outside the window
      const validTimestamps = timestamps.filter(
        (ts: number) => now - ts < this.config.windowMs
      );

      const remaining = Math.max(
        0,
        this.config.maxRequests - validTimestamps.length
      );

      const oldestTimestamp = validTimestamps[0] || now;
      const resetTime = oldestTimestamp + this.config.windowMs;
      const retryAfterMs = Math.max(0, resetTime - now);

      return {
        remaining,
        reset: resetTime,
        limited: remaining === 0,
        retryAfterMs
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      // Fail open: if storage error, allow request
      return {
        remaining: this.config.maxRequests,
        reset: Date.now() + this.config.windowMs,
        limited: false,
        retryAfterMs: 0
      };
    }
  }

  /**
   * Record a request attempt
   * Returns true if request should proceed, false if rate limited
   */
  recordRequest(): boolean {
    const status = this.checkLimit();

    if (status.limited) {
      console.warn(
        `⏱️ Rate limit exceeded for ${this.operationName}. Retry after ${status.retryAfterMs}ms`
      );
      return false;
    }

    try {
      const stored = sessionStorage.getItem(this.storageKey);
      const timestamps = stored ? JSON.parse(stored) : [];
      const now = Date.now();

      // Add new timestamp and remove old ones
      timestamps.push(now);
      const validTimestamps = timestamps.filter(
        (ts: number) => now - ts < this.config.windowMs
      );

      sessionStorage.setItem(this.storageKey, JSON.stringify(validTimestamps));
    } catch (error) {
      console.error('Error recording rate limit:', error);
    }

    return true;
  }

  /**
   * Execute function with rate limiting
   * Throws error if rate limited
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const status = this.checkLimit();

    if (status.limited) {
      const error = new Error(
        `Rate limit exceeded. Retry after ${(status.retryAfterMs / 1000).toFixed(1)}s`
      );
      (error as any).retryAfterMs = status.retryAfterMs;
      throw error;
    }

    const success = this.recordRequest();
    if (!success) {
      const error = new Error('Rate limit exceeded');
      (error as any).retryAfterMs = status.retryAfterMs;
      throw error;
    }

    return fn();
  }

  /**
   * Get current status without recording
   */
  getStatus(): RateLimitStatus {
    return this.checkLimit();
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    try {
      sessionStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Error resetting rate limit:', error);
    }
  }

  /**
   * Get human-readable string for UI
   */
  getStatusString(): string {
    const status = this.checkLimit();
    if (status.limited) {
      return `Please wait ${(status.retryAfterMs / 1000).toFixed(0)}s (${status.remaining}/${this.config.maxRequests})`;
    }
    return `${status.remaining}/${this.config.maxRequests} available`;
  }
}

/**
 * Pre-configured rate limiters for common operations
 */
export const rateLimiters = {
  // AI image generation: 1 per 30 seconds
  aiImage: new RateLimiter('ai_image', {
    maxRequests: 1,
    windowMs: 30 * 1000
  }),

  // Geocoding: 3 per 10 seconds
  geocoding: new RateLimiter('geocoding', {
    maxRequests: 3,
    windowMs: 10 * 1000
  }),

  // Event creation: 2 per minute
  eventCreate: new RateLimiter('event_create', {
    maxRequests: 2,
    windowMs: 60 * 1000
  }),

  // Search: 10 per 5 seconds (generous for user search)
  search: new RateLimiter('search', {
    maxRequests: 10,
    windowMs: 5 * 1000
  }),

  // API calls: 20 per 10 seconds
  api: new RateLimiter('api_call', {
    maxRequests: 20,
    windowMs: 10 * 1000
  })
};

/**
 * Hook to show rate limit status in UI
 */
export function useRateLimit(
  operationName: keyof typeof rateLimiters
): {
  status: RateLimitStatus;
  canProceed: boolean;
  statusString: string;
} {
  const limiter = rateLimiters[operationName];

  return {
    status: limiter.getStatus(),
    canProceed: !limiter.getStatus().limited,
    statusString: limiter.getStatusString()
  };
}

/**
 * Decorator for rate-limited async functions
 */
export function rateLimit(
  operationName: keyof typeof rateLimiters
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const limiter = rateLimiters[operationName];
      return limiter.execute(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}
