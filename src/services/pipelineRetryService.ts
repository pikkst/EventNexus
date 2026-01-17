/**
 * Pipeline Retry and Error Handling Utility
 * Provides exponential backoff, timeout handling, and fallback strategies
 * for unreliable operations like AI generation and geocoding
 */

export interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  timeoutMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
  onSuccess?: (attempt: number) => void;
}

export interface PipelineResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attempt: number;
  totalTime: number; // ms
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  timeoutMs: 60000
};

/**
 * Execute a function with exponential backoff retry
 * Useful for flaky operations (AI generation, API calls, etc.)
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<PipelineResult<T>> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= (mergedConfig.maxRetries ?? 3); attempt++) {
    try {
      // Create a promise that resolves with the function result or rejects on timeout
      const timeoutPromise = new Promise<T>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Operation timeout after ${mergedConfig.timeoutMs}ms`)),
          mergedConfig.timeoutMs
        );
      });
      
      const result = await Promise.race([fn(), timeoutPromise]);
      
      mergedConfig.onSuccess?.(attempt);
      return {
        success: true,
        data: result,
        attempt,
        totalTime: Date.now() - startTime
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry if this is the last attempt
      if (attempt < (mergedConfig.maxRetries ?? 3)) {
        mergedConfig.onRetry?.(attempt, lastError);
        
        // Calculate exponential backoff delay
        const delay = Math.min(
          (mergedConfig.initialDelayMs ?? 500) * Math.pow(
            mergedConfig.backoffMultiplier ?? 2,
            attempt - 1
          ),
          mergedConfig.maxDelayMs ?? 30000
        );
        
        console.warn(
          `⚠️ Attempt ${attempt} failed (${lastError.message}). ` +
          `Retrying in ${delay}ms...`
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  return {
    success: false,
    error: lastError?.message || 'Unknown error',
    attempt: mergedConfig.maxRetries ?? 3,
    totalTime: Date.now() - startTime
  };
}

/**
 * Race multiple strategies with fallback
 * Try strategy A, if it fails try strategy B, etc.
 * Useful for using multiple AI models or APIs
 */
export async function strategyWithFallback<T>(
  strategies: Array<() => Promise<T>>,
  config: RetryConfig = {}
): Promise<PipelineResult<T>> {
  const startTime = Date.now();
  let lastError: Error | null = null;
  
  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`📊 Trying strategy ${i + 1}/${strategies.length}...`);
      
      const result = await retryWithBackoff(strategies[i], {
        ...config,
        maxRetries: 2 // Fewer retries per strategy
      });
      
      if (result.success) {
        return {
          success: true,
          data: result.data,
          attempt: i + 1,
          totalTime: Date.now() - startTime
        };
      } else {
        lastError = new Error(result.error);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`❌ Strategy ${i + 1} failed:`, lastError.message);
    }
  }
  
  return {
    success: false,
    error: lastError?.message || 'All strategies failed',
    attempt: strategies.length,
    totalTime: Date.now() - startTime
  };
}

/**
 * Batch operation with partial success tolerance
 * Useful for bulk AI operations or batch geocoding
 * Returns results for successful items, skips failed ones
 */
export async function batchWithFallback<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  config: RetryConfig & { fallback?: (item: T) => R } = {}
): Promise<{ successful: R[]; failed: T[]; totalTime: number }> {
  const startTime = Date.now();
  const successful: R[] = [];
  const failed: T[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    try {
      const result = await retryWithBackoff(() => processor(item), {
        maxRetries: 2,
        initialDelayMs: 300,
        ...config
      });
      
      if (result.success) {
        successful.push(result.data!);
      } else {
        // Use fallback if provided
        if (config.fallback) {
          successful.push(config.fallback(item));
        } else {
          failed.push(item);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to process item ${i}:`, error);
      
      if (config.fallback) {
        successful.push(config.fallback(item));
      } else {
        failed.push(item);
      }
    }
    
    // Progress logging
    const progress = ((i + 1) / items.length * 100).toFixed(0);
    console.log(`⏳ Batch progress: ${progress}% (${successful.length + failed.length}/${items.length})`);
  }
  
  return {
    successful,
    failed,
    totalTime: Date.now() - startTime
  };
}

/**
 * Circuit breaker pattern
 * Stop retrying if failure rate is too high
 * Useful for preventing cascading failures
 */
export class CircuitBreaker {
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private failureThreshold = 5,
    private successThreshold = 2,
    private resetTimeoutMs = 30000 // 30 seconds
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // If open and timeout hasn't passed, reject immediately
    if (this.state === 'open') {
      if (this.lastFailureTime && Date.now() - this.lastFailureTime < this.resetTimeoutMs) {
        throw new Error('Circuit breaker is OPEN - service temporarily unavailable');
      }
      this.state = 'half-open';
    }
    
    try {
      const result = await fn();
      
      if (this.state === 'half-open') {
        this.successCount++;
        if (this.successCount >= this.successThreshold) {
          this.close();
        }
      } else {
        this.successCount = 1;
      }
      
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= this.failureThreshold) {
        this.state = 'open';
        console.error(`🔴 Circuit breaker OPEN after ${this.failureCount} failures`);
      }
      
      throw error;
    }
  }
  
  private close() {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    console.log('✅ Circuit breaker CLOSED - service recovered');
  }
  
  getState() {
    return { state: this.state, failureCount: this.failureCount, successCount: this.successCount };
  }
  
  reset() {
    this.close();
    this.lastFailureTime = null;
  }
}

/**
 * Timeout wrapper for any promise
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    )
  ]);
}
