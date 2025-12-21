export interface RetryOptions {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 8000, // 8 seconds
  backoffMultiplier: 2,
};

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...defaultRetryOptions, ...options };
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If this was the last attempt, throw the retry error
      if (attempt === config.maxRetries) {
        throw new RetryError(
          `Operation failed after ${attempt + 1} attempts: ${lastError.message}`,
          attempt + 1,
          lastError
        );
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelay
      );
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached, but TypeScript requires it
  throw lastError!;
}

export function isRetryableError(error: Error): boolean {
  // Network errors are typically retryable
  if (error.name === 'NetworkError' || error.name === 'TypeError') {
    return true;
  }
  
  // HTTP errors - some are retryable
  if (error.message.includes('fetch')) {
    return true;
  }
  
  // Timeout errors are retryable
  if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
    return true;
  }
  
  // 5xx server errors are retryable, 4xx client errors are not
  const statusMatch = error.message.match(/status (\d+)/);
  if (statusMatch) {
    const status = parseInt(statusMatch[1]);
    return status >= 500 && status < 600;
  }
  
  return false;
}