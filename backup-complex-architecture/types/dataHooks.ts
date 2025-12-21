/**
 * Shared types for data hooks (being migrated to stores)
 * These types are used by remaining data hooks and store-based hooks
 */

/**
 * Result interface for data hooks
 */
export interface DataHookResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

/**
 * Error types for data hooks
 */
export enum DataHookErrorType {
  NETWORK_ERROR = 'network_error',
  VALIDATION_ERROR = 'validation_error',
  CACHE_ERROR = 'cache_error',
  AUTHENTICATION_ERROR = 'authentication_error'
}

/**
 * Enhanced error class for data hooks
 */
export class DataHookError extends Error {
  constructor(
    message: string,
    public type: DataHookErrorType,
    public hookName: string,
    public context: Record<string, any> = {},
    public retryable: boolean = true,
    public timestamp: Date = new Date()
  ) {
    super(message);
    this.name = 'DataHookError';
  }
}

/**
 * Configuration options for useStationData hook (deprecated - use store methods)
 */
export interface UseStationDataOptions {
  agencyId?: string;
  forceRefresh?: boolean;
  cacheMaxAge?: number; // milliseconds
}