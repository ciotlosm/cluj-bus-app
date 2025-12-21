// Error type definitions and constants
// Centralized error types for consistent error handling across the application

/**
 * Location-specific error types and messages
 */
export const LocationErrorTypes = {
  PERMISSION_DENIED: 'permission_denied',
  POSITION_UNAVAILABLE: 'position_unavailable', 
  TIMEOUT: 'timeout',
  NOT_SUPPORTED: 'not_supported',
  NETWORK_ERROR: 'network_error',
  RETRY_EXHAUSTED: 'retry_exhausted'
} as const;

export type LocationErrorType = typeof LocationErrorTypes[keyof typeof LocationErrorTypes];

export interface LocationError {
  code: number;
  message: string;
  type: LocationErrorType;
  retryable: boolean;
}

/**
 * API call result tracking for status aggregation
 */
export interface ApiCallResult {
  success: boolean;
  responseTime: number;
  timestamp: number;
  operation: string;
}

/**
 * Retry configuration for location requests
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2
};