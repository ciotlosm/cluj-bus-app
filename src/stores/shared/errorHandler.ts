/**
 * Standardized error handling for all stores
 * Provides consistent error classification, formatting, and retry logic
 */

import { logger } from '../../utils/shared/logger';
import { withRetry } from '../../utils/retryUtils';

export interface ErrorState {
  type: 'network' | 'parsing' | 'noData' | 'partial' | 'authentication';
  message: string;
  timestamp: Date;
  retryable: boolean;
}

export interface ErrorContext {
  storeName: string;
  operation: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Custom error types for better classification
 */
export class NetworkError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NoDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoDataError';
  }
}

export class PartialDataError extends Error {
  constructor(message: string, public availableData?: any) {
    super(message);
    this.name = 'PartialDataError';
  }
}

/**
 * Standardized error handler for stores
 */
export class StoreErrorHandler {
  /**
   * Create a standardized error state from any error
   */
  static createError(error: unknown, context: ErrorContext): ErrorState {
    const errorState: ErrorState = {
      type: this.classifyError(error),
      message: this.formatErrorMessage(error, context),
      timestamp: context.timestamp,
      retryable: this.isRetryable(error),
    };

    this.logError(errorState, context, error);
    return errorState;
  }

  /**
   * Classify error type for consistent handling
   */
  private static classifyError(error: unknown): ErrorState['type'] {
    if (error instanceof AuthenticationError) return 'authentication';
    if (error instanceof NetworkError) return 'network';
    if (error instanceof ValidationError) return 'parsing';
    if (error instanceof NoDataError) return 'noData';
    if (error instanceof PartialDataError) return 'partial';

    // Check error message for common patterns
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('403') || message.includes('unauthorized') || message.includes('forbidden')) {
        return 'authentication';
      }
      if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
        return 'network';
      }
      if (message.includes('parse') || message.includes('json') || message.includes('invalid')) {
        return 'parsing';
      }
      if (message.includes('no data') || message.includes('empty') || message.includes('not found')) {
        return 'noData';
      }
    }

    return 'network'; // Default fallback
  }

  /**
   * Format user-friendly error message
   */
  private static formatErrorMessage(error: unknown, context: ErrorContext): string {
    if (error instanceof AuthenticationError) {
      return 'API key is invalid or expired. Please check your API key in Settings.';
    }

    if (error instanceof NetworkError) {
      if (error.statusCode === 429) {
        return 'Too many requests. Please wait a moment and try again.';
      }
      if (error.statusCode && error.statusCode >= 500) {
        return 'Server is temporarily unavailable. Please try again later.';
      }
      return 'Network connection failed. Please check your internet connection.';
    }

    if (error instanceof ValidationError) {
      return `Data validation failed: ${error.message}`;
    }

    if (error instanceof NoDataError) {
      return 'No data available at this time. Please try again later.';
    }

    if (error instanceof PartialDataError) {
      return 'Some data is unavailable, but partial information is shown.';
    }

    if (error instanceof Error) {
      // Try to make generic errors more user-friendly
      const message = error.message;
      if (message.includes('fetch')) {
        return 'Failed to load data. Please check your connection and try again.';
      }
      if (message.includes('timeout')) {
        return 'Request timed out. Please try again.';
      }
      return message;
    }

    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Determine if error is retryable
   */
  private static isRetryable(error: unknown): boolean {
    if (error instanceof AuthenticationError) return false;
    if (error instanceof ValidationError) return false;
    
    if (error instanceof NetworkError) {
      // Don't retry client errors (4xx), but retry server errors (5xx)
      if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
        return error.statusCode === 429; // Retry rate limits
      }
      return true;
    }

    return true; // Default to retryable
  }

  /**
   * Log error with appropriate level and context
   */
  private static logError(errorState: ErrorState, context: ErrorContext, originalError: unknown): void {
    const logData = {
      errorType: errorState.type,
      operation: context.operation,
      retryable: errorState.retryable,
      metadata: context.metadata,
      originalError: originalError instanceof Error ? originalError.message : String(originalError),
    };

    if (errorState.type === 'authentication') {
      logger.warn(`${context.storeName}: Authentication error in ${context.operation}`, logData);
    } else if (errorState.type === 'network') {
      logger.warn(`${context.storeName}: Network error in ${context.operation}`, logData);
    } else {
      logger.error(`${context.storeName}: Error in ${context.operation}`, logData);
    }
  }

  /**
   * Execute operation with retry logic and error handling
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    maxRetries = 3
  ): Promise<T> {
    try {
      return await withRetry(operation, {
        maxRetries,
        baseDelay: 1000,
        maxDelay: 8000,
      });
    } catch (error) {
      throw this.createError(error, context);
    }
  }

  /**
   * Wrap async operation with standardized error handling
   */
  static async handleAsync<T>(
    operation: () => Promise<T>,
    context: ErrorContext
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const errorState = this.createError(error, context);
      throw new Error(errorState.message);
    }
  }

  /**
   * Create error context helper
   */
  static createContext(
    storeName: string,
    operation: string,
    metadata?: Record<string, any>
  ): ErrorContext {
    return {
      storeName,
      operation,
      timestamp: new Date(),
      metadata,
    };
  }
}

/**
 * Utility functions for common error scenarios
 */
export const ErrorUtils = {
  /**
   * Check if error indicates API key issues
   */
  isApiKeyError(error: unknown): boolean {
    if (error instanceof AuthenticationError) return true;
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('403') || 
             message.includes('unauthorized') || 
             message.includes('forbidden') ||
             message.includes('api key');
    }
    return false;
  },

  /**
   * Check if error indicates network connectivity issues
   */
  isNetworkError(error: unknown): boolean {
    if (error instanceof NetworkError) return true;
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('network') || 
             message.includes('fetch') || 
             message.includes('connection') ||
             message.includes('timeout');
    }
    return false;
  },

  /**
   * Extract status code from error if available
   */
  getStatusCode(error: unknown): number | undefined {
    if (error instanceof NetworkError) return error.statusCode;
    if (error && typeof error === 'object' && 'status' in error) {
      return error.status as number;
    }
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as any).response;
      if (response && typeof response.status === 'number') {
        return response.status;
      }
    }
    return undefined;
  },
};