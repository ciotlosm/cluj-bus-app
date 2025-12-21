/**
 * Standardized Error Types
 * 
 * Replaces complex CompositionError with simple, consistent error types
 */

export enum ErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  CONFIGURATION = 'configuration',
  CACHE = 'cache',
  DATA_FETCH = 'data_fetch',
  PROCESSING = 'processing'
}

/**
 * Standard error interface for all hooks
 */
export interface StandardError {
  type: ErrorType;
  message: string;
  userMessage: string;
  retryable: boolean;
  context: Record<string, any>;
  timestamp: Date;
  errorId: string;
  originalError?: Error;
}

/**
 * Retry configuration for different error types
 */
export interface RetryConfig {
  maxRetries: number;
  backoffType: 'none' | 'linear' | 'exponential';
  initialDelay?: number;
  maxDelay?: number;
}

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
