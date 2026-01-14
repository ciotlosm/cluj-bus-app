/**
 * Common TypeScript interfaces and types
 * Shared types used across multiple domains to eliminate duplication
 */

/**
 * Unified retry configuration for network operations and error recovery
 * Used by both store refresh operations and location service retries
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Base delay in milliseconds for first retry */
  baseDelay: number;
  /** Maximum delay in milliseconds (prevents infinite backoff) */
  maxDelay: number;
  /** Multiplier for exponential backoff (e.g., 2 = double delay each retry) */
  backoffMultiplier: number;
}

/**
 * Default retry configuration for most network operations
 * Conservative settings suitable for API calls and location requests
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2
};

/**
 * Fast retry configuration for time-sensitive operations
 * Shorter delays for operations that need quick feedback
 */
export const FAST_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 100, // 100ms
  maxDelay: 1000, // 1 second
  backoffMultiplier: 2
};

/**
 * Generic storage wrapper for persisted data
 * Provides consistent structure for localStorage and cache operations
 */
export interface StorageData<T> {
  /** The actual data being stored */
  data: T;
  /** Timestamp when data was last updated (null if never updated) */
  lastUpdated: number | null;
  /** Error message if data loading/saving failed (null if no error) */
  error: string | null;
}

/**
 * Generic result interface for operations that can succeed or fail
 * Provides consistent structure for API calls, validations, etc.
 */
export interface OperationResult<T = void> {
  /** Whether the operation completed successfully */
  success: boolean;
  /** Result data if successful (undefined for void operations) */
  data?: T;
  /** Error message if operation failed */
  error?: string;
  /** Additional metadata about the operation */
  metadata?: Record<string, unknown>;
}

/**
 * Generic loading state interface
 * Provides consistent structure for async operation states
 */
export interface LoadingState {
  /** Whether operation is currently in progress */
  loading: boolean;
  /** Error message if operation failed (null if no error) */
  error: string | null;
  /** Timestamp of last successful operation (null if never succeeded) */
  lastUpdated: number | null;
}

/**
 * Generic pagination interface
 * Standard structure for paginated data responses
 */
export interface PaginationInfo {
  /** Current page number (0-based) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items across all pages */
  totalItems: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there are more pages after current */
  hasNextPage: boolean;
  /** Whether there are pages before current */
  hasPreviousPage: boolean;
}

/**
 * Generic paginated response wrapper
 * Combines data with pagination metadata
 */
export interface PaginatedResponse<T> {
  /** Array of items for current page */
  items: T[];
  /** Pagination metadata */
  pagination: PaginationInfo;
}