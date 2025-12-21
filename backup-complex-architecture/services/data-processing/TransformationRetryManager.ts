/**
 * Transformation Retry Manager
 * 
 * Provides intelligent retry logic for vehicle transformation operations.
 * Implements exponential backoff, circuit breaker patterns, and graceful
 * degradation for transient failures.
 * 
 * Requirements: 5.2, 5.5
 * 
 * @module TransformationRetryManager
 */

import { TransformationError } from '../../types/transformationPipeline';
import { RetryManager } from '../../hooks/shared/errors/retryUtils';
import { logger } from '../../utils/shared/logger';

// ============================================================================
// RETRY CONFIGURATION TYPES
// ============================================================================

/**
 * Retry configuration for different operation types
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay between retries (ms) */
  initialDelay: number;
  /** Maximum delay between retries (ms) */
  maxDelay: number;
  /** Backoff multiplier for exponential backoff */
  backoffMultiplier: number;
  /** Jitter factor to prevent thundering herd (0-1) */
  jitterFactor: number;
  /** Whether to use exponential backoff */
  useExponentialBackoff: boolean;
  /** Timeout for individual retry attempts (ms) */
  attemptTimeout: number;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Failure threshold to open circuit */
  failureThreshold: number;
  /** Success threshold to close circuit */
  successThreshold: number;
  /** Timeout before attempting to close circuit (ms) */
  timeout: number;
  /** Window size for failure rate calculation */
  windowSize: number;
}

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing fast
  HALF_OPEN = 'half_open' // Testing if service recovered
}

/**
 * Retry operation result
 */
export interface RetryResult<T> {
  /** Whether the operation succeeded */
  success: boolean;
  /** Result data if successful */
  data?: T;
  /** Error if failed */
  error?: Error;
  /** Number of attempts made */
  attempts: number;
  /** Total time spent on retries */
  totalTime: number;
  /** Whether circuit breaker was triggered */
  circuitBreakerTriggered: boolean;
}

/**
 * Retry statistics for monitoring
 */
export interface RetryStats {
  /** Total retry operations */
  totalOperations: number;
  /** Successful operations */
  successfulOperations: number;
  /** Failed operations */
  failedOperations: number;
  /** Total retry attempts */
  totalAttempts: number;
  /** Average attempts per operation */
  averageAttempts: number;
  /** Success rate after retries */
  successRate: number;
  /** Circuit breaker activations */
  circuitBreakerActivations: number;
  /** Average retry time */
  averageRetryTime: number;
  /** Retry patterns by error type */
  retryPatterns: Map<string, {
    count: number;
    successRate: number;
    averageAttempts: number;
  }>;
}

// ============================================================================
// CIRCUIT BREAKER IMPLEMENTATION
// ============================================================================

/**
 * Circuit breaker for preventing cascade failures
 */
class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures: number[] = []; // Timestamps of recent failures
  private successes: number[] = []; // Timestamps of recent successes
  private lastFailureTime = 0;
  private consecutiveFailures = 0;
  private consecutiveSuccesses = 0;

  constructor(private config: CircuitBreakerConfig) {}

  /**
   * Check if operation should be allowed
   */
  canExecute(): boolean {
    this.cleanupOldEntries();

    switch (this.state) {
      case CircuitBreakerState.CLOSED:
        return true;

      case CircuitBreakerState.OPEN:
        // Check if timeout has passed
        if (Date.now() - this.lastFailureTime > this.config.timeout) {
          this.state = CircuitBreakerState.HALF_OPEN;
          this.consecutiveSuccesses = 0;
          return true;
        }
        return false;

      case CircuitBreakerState.HALF_OPEN:
        return true;

      default:
        return false;
    }
  }

  /**
   * Record successful operation
   */
  recordSuccess(): void {
    this.successes.push(Date.now());
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses++;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        this.state = CircuitBreakerState.CLOSED;
        logger.info('Circuit breaker closed - service recovered', {
          consecutiveSuccesses: this.consecutiveSuccesses
        }, 'RETRY_MANAGER');
      }
    }
  }

  /**
   * Record failed operation
   */
  recordFailure(): void {
    const now = Date.now();
    this.failures.push(now);
    this.lastFailureTime = now;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;

    if (this.state === CircuitBreakerState.CLOSED) {
      const recentFailures = this.failures.filter(
        time => now - time < this.config.windowSize
      );

      if (recentFailures.length >= this.config.failureThreshold) {
        this.state = CircuitBreakerState.OPEN;
        logger.warn('Circuit breaker opened - too many failures', {
          recentFailures: recentFailures.length,
          threshold: this.config.failureThreshold
        }, 'RETRY_MANAGER');
      }
    } else if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
      logger.warn('Circuit breaker reopened - failure during half-open state', {}, 'RETRY_MANAGER');
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats() {
    this.cleanupOldEntries();
    
    return {
      state: this.state,
      recentFailures: this.failures.length,
      recentSuccesses: this.successes.length,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastFailureTime: this.lastFailureTime
    };
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failures = [];
    this.successes = [];
    this.lastFailureTime = 0;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
  }

  private cleanupOldEntries(): void {
    const now = Date.now();
    const cutoff = now - this.config.windowSize;
    
    this.failures = this.failures.filter(time => time > cutoff);
    this.successes = this.successes.filter(time => time > cutoff);
  }
}

// ============================================================================
// TRANSFORMATION RETRY MANAGER
// ============================================================================

/**
 * Comprehensive retry manager for transformation operations
 */
export class TransformationRetryManager {
  private retryConfigs: Map<string, RetryConfig> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private retryStats: RetryStats;

  constructor() {
    this.retryStats = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      totalAttempts: 0,
      averageAttempts: 0,
      successRate: 0,
      circuitBreakerActivations: 0,
      averageRetryTime: 0,
      retryPatterns: new Map()
    };

    this.setupDefaultConfigurations();
  }

  // ============================================================================
  // RETRY EXECUTION METHODS
  // ============================================================================

  /**
   * Execute operation with retry logic and circuit breaker
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationType: string,
    context: Record<string, any> = {}
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    const config = this.getRetryConfig(operationType);
    const circuitBreaker = this.getCircuitBreaker(operationType);
    
    let attempts = 0;
    let lastError: Error | null = null;
    let circuitBreakerTriggered = false;

    this.retryStats.totalOperations++;

    // Check circuit breaker
    if (!circuitBreaker.canExecute()) {
      circuitBreakerTriggered = true;
      this.retryStats.circuitBreakerActivations++;
      
      const error = new TransformationError(
        'Circuit breaker is open - operation not allowed',
        operationType,
        {
          recoverable: true,
          context: { ...context, circuitBreakerState: circuitBreaker.getState() }
        }
      );

      logger.error('Transformation retry failed', {
        error: error.message,
        context,
        attempt: attempts
      });
      
      return {
        success: false,
        error,
        attempts: 0,
        totalTime: Date.now() - startTime,
        circuitBreakerTriggered: true
      };
    }

    // Execute with retries
    while (attempts <= config.maxRetries) {
      attempts++;
      this.retryStats.totalAttempts++;

      try {
        // Set timeout for individual attempt
        const result = await this.executeWithTimeout(operation, config.attemptTimeout);
        
        // Success - record and return
        circuitBreaker.recordSuccess();
        this.retryStats.successfulOperations++;
        
        const totalTime = Date.now() - startTime;
        this.updateRetryStats(operationType, true, attempts, totalTime);
        
        logger.debug('Operation succeeded', {
          operationType,
          attempts,
          totalTime
        }, 'RETRY_MANAGER');

        return {
          success: true,
          data: result,
          attempts,
          totalTime,
          circuitBreakerTriggered
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if error is retryable
        const isRetryable = this.isRetryableError(lastError, operationType);
        
        if (!isRetryable || attempts > config.maxRetries) {
          // Final failure
          circuitBreaker.recordFailure();
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempts - 1, config);
        
        logger.debug('Operation failed, retrying', {
          operationType,
          attempt: attempts,
          maxRetries: config.maxRetries,
          delay,
          error: lastError.message
        }, 'RETRY_MANAGER');

        // Wait before retry
        if (delay > 0) {
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    circuitBreaker.recordFailure();
    this.retryStats.failedOperations++;
    
    const totalTime = Date.now() - startTime;
    this.updateRetryStats(operationType, false, attempts, totalTime);

    // Report the final error
    if (lastError) {
      logger.error('Transformation error in retry manager', {
        error: lastError.message,
        context,
        operationType,
        attempts,
        totalTime
      });
    }

    logger.error('Operation failed after all retries', {
      operationType,
      attempts,
      totalTime,
      error: lastError?.message
    }, 'RETRY_MANAGER');

    return {
      success: false,
      error: lastError || new Error('Unknown error'),
      attempts,
      totalTime,
      circuitBreakerTriggered
    };
  }

  /**
   * Execute transformation step with retry logic
   */
  async executeTransformationStep<TInput, TOutput>(
    stepName: string,
    stepFunction: (input: TInput) => Promise<TOutput>,
    input: TInput,
    context: Record<string, any> = {}
  ): Promise<TOutput> {
    const result = await this.executeWithRetry(
      () => stepFunction(input),
      `transformation-step-${stepName}`,
      { ...context, stepName, inputType: typeof input }
    );

    if (!result.success) {
      throw result.error || new TransformationError(
        `Transformation step '${stepName}' failed after retries`,
        stepName,
        { recoverable: false, context }
      );
    }

    return result.data!;
  }

  /**
   * Execute with graceful degradation
   */
  async executeWithGracefulDegradation<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    operationType: string,
    context: Record<string, any> = {}
  ): Promise<T> {
    // Try primary operation first
    const primaryResult = await this.executeWithRetry(
      primaryOperation,
      `${operationType}-primary`,
      context
    );

    if (primaryResult.success) {
      return primaryResult.data!;
    }

    logger.warn('Primary operation failed, attempting fallback', {
      operationType,
      primaryError: primaryResult.error?.message,
      attempts: primaryResult.attempts
    }, 'RETRY_MANAGER');

    // Try fallback operation
    const fallbackResult = await this.executeWithRetry(
      fallbackOperation,
      `${operationType}-fallback`,
      { ...context, isFallback: true }
    );

    if (fallbackResult.success) {
      logger.info('Fallback operation succeeded', {
        operationType,
        fallbackAttempts: fallbackResult.attempts
      }, 'RETRY_MANAGER');
      
      return fallbackResult.data!;
    }

    // Both operations failed
    const combinedError = new TransformationError(
      `Both primary and fallback operations failed for ${operationType}`,
      operationType,
      {
        recoverable: false,
        context: {
          ...context,
          primaryError: primaryResult.error?.message,
          fallbackError: fallbackResult.error?.message,
          primaryAttempts: primaryResult.attempts,
          fallbackAttempts: fallbackResult.attempts
        }
      }
    );

    logger.error('Combined transformation error', {
      error: combinedError.message,
      primaryError: primaryResult.error?.message,
      fallbackError: fallbackResult.error?.message
    });
    throw combinedError;
  }

  // ============================================================================
  // CONFIGURATION METHODS
  // ============================================================================

  /**
   * Set retry configuration for operation type
   */
  setRetryConfig(operationType: string, config: Partial<RetryConfig>): void {
    const defaultConfig = this.getDefaultRetryConfig();
    const mergedConfig = { ...defaultConfig, ...config };
    
    this.retryConfigs.set(operationType, mergedConfig);
    
    logger.debug('Retry configuration updated', {
      operationType,
      config: mergedConfig
    }, 'RETRY_MANAGER');
  }

  /**
   * Set circuit breaker configuration for operation type
   */
  setCircuitBreakerConfig(operationType: string, config: Partial<CircuitBreakerConfig>): void {
    const defaultConfig = this.getDefaultCircuitBreakerConfig();
    const mergedConfig = { ...defaultConfig, ...config };
    
    // Create new circuit breaker with updated config
    this.circuitBreakers.set(operationType, new CircuitBreaker(mergedConfig));
    
    logger.debug('Circuit breaker configuration updated', {
      operationType,
      config: mergedConfig
    }, 'RETRY_MANAGER');
  }

  // ============================================================================
  // MONITORING AND STATISTICS
  // ============================================================================

  /**
   * Get retry statistics
   */
  getRetryStats(): RetryStats {
    // Update calculated fields
    this.retryStats.averageAttempts = this.retryStats.totalOperations > 0
      ? this.retryStats.totalAttempts / this.retryStats.totalOperations
      : 0;

    this.retryStats.successRate = this.retryStats.totalOperations > 0
      ? this.retryStats.successfulOperations / this.retryStats.totalOperations
      : 0;

    return { ...this.retryStats };
  }

  /**
   * Get circuit breaker statistics for all operation types
   */
  getCircuitBreakerStats(): Map<string, any> {
    const stats = new Map();
    
    for (const [operationType, circuitBreaker] of this.circuitBreakers.entries()) {
      stats.set(operationType, circuitBreaker.getStats());
    }
    
    return stats;
  }

  /**
   * Reset all statistics
   */
  resetStats(): void {
    this.retryStats = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      totalAttempts: 0,
      averageAttempts: 0,
      successRate: 0,
      circuitBreakerActivations: 0,
      averageRetryTime: 0,
      retryPatterns: new Map()
    };

    // Reset all circuit breakers
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.reset();
    }

    logger.info('Retry manager statistics reset', {}, 'RETRY_MANAGER');
  }

  /**
   * Reset circuit breaker for specific operation type
   */
  resetCircuitBreaker(operationType: string): void {
    const circuitBreaker = this.circuitBreakers.get(operationType);
    if (circuitBreaker) {
      circuitBreaker.reset();
      logger.info('Circuit breaker reset', { operationType }, 'RETRY_MANAGER');
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private setupDefaultConfigurations(): void {
    // API data normalization
    this.setRetryConfig('normalize-api-data', {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 8000,
      backoffMultiplier: 2,
      jitterFactor: 0.1,
      useExponentialBackoff: true,
      attemptTimeout: 10000
    });

    // Schedule enrichment
    this.setRetryConfig('enrich-with-schedule', {
      maxRetries: 2,
      initialDelay: 500,
      maxDelay: 4000,
      backoffMultiplier: 2,
      jitterFactor: 0.1,
      useExponentialBackoff: true,
      attemptTimeout: 5000
    });

    // Direction analysis
    this.setRetryConfig('analyze-directions', {
      maxRetries: 2,
      initialDelay: 500,
      maxDelay: 2000,
      backoffMultiplier: 1.5,
      jitterFactor: 0.1,
      useExponentialBackoff: true,
      attemptTimeout: 3000
    });

    // Display data generation
    this.setRetryConfig('generate-display-data', {
      maxRetries: 1,
      initialDelay: 250,
      maxDelay: 1000,
      backoffMultiplier: 2,
      jitterFactor: 0.1,
      useExponentialBackoff: false,
      attemptTimeout: 2000
    });

    // Set up circuit breakers
    const defaultCircuitBreakerConfig = this.getDefaultCircuitBreakerConfig();
    
    ['normalize-api-data', 'enrich-with-schedule', 'analyze-directions', 'generate-display-data'].forEach(
      operationType => {
        this.circuitBreakers.set(operationType, new CircuitBreaker(defaultCircuitBreakerConfig));
      }
    );
  }

  private getRetryConfig(operationType: string): RetryConfig {
    return this.retryConfigs.get(operationType) || this.getDefaultRetryConfig();
  }

  private getCircuitBreaker(operationType: string): CircuitBreaker {
    let circuitBreaker = this.circuitBreakers.get(operationType);
    
    if (!circuitBreaker) {
      circuitBreaker = new CircuitBreaker(this.getDefaultCircuitBreakerConfig());
      this.circuitBreakers.set(operationType, circuitBreaker);
    }
    
    return circuitBreaker;
  }

  private getDefaultRetryConfig(): RetryConfig {
    return {
      maxRetries: 2,
      initialDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2,
      jitterFactor: 0.1,
      useExponentialBackoff: true,
      attemptTimeout: 5000
    };
  }

  private getDefaultCircuitBreakerConfig(): CircuitBreakerConfig {
    return {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000, // 1 minute
      windowSize: 300000 // 5 minutes
    };
  }

  private isRetryableError(error: Error, operationType: string): boolean {
    // Check if it's a transformation error with retry info
    if (error instanceof TransformationError) {
      return error.recoverable;
    }

    // Use existing retry utility logic
    const message = error.message.toLowerCase();
    
    // Network errors are retryable
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return true;
    }

    // Temporary service errors are retryable
    if (message.includes('503') || message.includes('502') || message.includes('504')) {
      return true;
    }

    // Rate limiting is retryable
    if (message.includes('429') || message.includes('rate limit')) {
      return true;
    }

    // Validation errors are typically not retryable
    if (message.includes('validation') || message.includes('invalid')) {
      return false;
    }

    // Authentication errors are not retryable
    if (message.includes('401') || message.includes('403') || message.includes('unauthorized')) {
      return false;
    }

    // Default to retryable for unknown errors
    return true;
  }

  private calculateDelay(attemptNumber: number, config: RetryConfig): number {
    let delay: number;

    if (config.useExponentialBackoff) {
      delay = config.initialDelay * Math.pow(config.backoffMultiplier, attemptNumber);
    } else {
      delay = config.initialDelay;
    }

    // Apply maximum delay limit
    delay = Math.min(delay, config.maxDelay);

    // Apply jitter to prevent thundering herd
    if (config.jitterFactor > 0) {
      const jitter = delay * config.jitterFactor * Math.random();
      delay += jitter;
    }

    return Math.round(delay);
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateRetryStats(
    operationType: string,
    success: boolean,
    attempts: number,
    totalTime: number
  ): void {
    // Update retry patterns
    let pattern = this.retryStats.retryPatterns.get(operationType);
    
    if (!pattern) {
      pattern = {
        count: 0,
        successRate: 0,
        averageAttempts: 0
      };
      this.retryStats.retryPatterns.set(operationType, pattern);
    }

    pattern.count++;
    pattern.averageAttempts = (pattern.averageAttempts * (pattern.count - 1) + attempts) / pattern.count;
    
    if (success) {
      pattern.successRate = (pattern.successRate * (pattern.count - 1) + 1) / pattern.count;
    } else {
      pattern.successRate = (pattern.successRate * (pattern.count - 1)) / pattern.count;
    }

    // Update average retry time
    this.retryStats.averageRetryTime = 
      (this.retryStats.averageRetryTime * (this.retryStats.totalOperations - 1) + totalTime) / 
      this.retryStats.totalOperations;
  }
}

/**
 * Default transformation retry manager instance
 */
export const transformationRetryManager = new TransformationRetryManager();