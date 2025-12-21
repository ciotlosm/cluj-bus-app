import type { StandardError } from './types';
import { ErrorHandler } from './ErrorHandler';
import { ErrorType } from './types';

/**
 * Retry utilities with exponential backoff
 */

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  errorContext: Record<string, any> = {},
  maxRetries?: number
): Promise<T> {
  let lastError: StandardError | null = null;
  let retryCount = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      const standardError = error instanceof Error 
        ? ErrorHandler.fromError(error, errorContext)
        : ErrorHandler.createError(ErrorType.DATA_FETCH, 'Unknown error', errorContext);

      lastError = standardError;

      // Use custom maxRetries if provided, otherwise use the error's retry strategy
      const shouldRetryError = maxRetries !== undefined 
        ? retryCount < maxRetries && standardError.retryable
        : ErrorHandler.shouldRetry(standardError, retryCount);
      
      if (!shouldRetryError) {
        throw standardError;
      }

      const delay = ErrorHandler.getRetryDelay(standardError, retryCount);
      
      if (delay > 0) {
        await sleep(delay);
      }

      retryCount++;
    }
  }
}

/**
 * Create a retry wrapper for a function
 */
export function createRetryWrapper<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  defaultContext: Record<string, any> = {}
) {
  return async (...args: T): Promise<R> => {
    return withRetry(() => fn(...args), defaultContext);
  };
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry state manager for hooks
 */
export class RetryManager {
  private retryCount = 0;
  private lastError: StandardError | null = null;

  reset(): void {
    this.retryCount = 0;
    this.lastError = null;
  }

  canRetry(error: StandardError): boolean {
    this.lastError = error;
    return ErrorHandler.shouldRetry(error, this.retryCount);
  }

  async executeRetry<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.lastError) {
      throw new Error('No error to retry');
    }

    const delay = ErrorHandler.getRetryDelay(this.lastError, this.retryCount);
    
    if (delay > 0) {
      await sleep(delay);
    }

    this.retryCount++;
    return fn();
  }

  getRetryCount(): number {
    return this.retryCount;
  }

  getLastError(): StandardError | null {
    return this.lastError;
  }
}