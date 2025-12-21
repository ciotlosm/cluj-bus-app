import { ErrorType } from './types';
import type { StandardError, RetryConfig, ErrorSeverity } from './types';

/**
 * Standardized Error Handler
 * 
 * Replaces complex CompositionError class with simple, consistent error handling
 */
export class ErrorHandler {
  private static readonly ERROR_MESSAGES: Record<ErrorType, string> = {
    [ErrorType.NETWORK]: 'Unable to connect to transit service',
    [ErrorType.AUTHENTICATION]: 'Invalid API key or authentication failed',
    [ErrorType.VALIDATION]: 'Invalid data format received',
    [ErrorType.CONFIGURATION]: 'Configuration error - check settings',
    [ErrorType.CACHE]: 'Cache operation failed',
    [ErrorType.DATA_FETCH]: 'Unable to load transit data',
    [ErrorType.PROCESSING]: 'Error processing transit data'
  };

  private static readonly USER_MESSAGES: Record<ErrorType, string> = {
    [ErrorType.NETWORK]: 'Unable to connect to the transit service. Please check your internet connection.',
    [ErrorType.AUTHENTICATION]: 'Authentication failed. Please check your API key in settings.',
    [ErrorType.VALIDATION]: 'Invalid data format received. Please try again.',
    [ErrorType.CONFIGURATION]: 'Configuration error. Please check your settings and try again.',
    [ErrorType.CACHE]: 'Cache operation failed. Some data may be outdated.',
    [ErrorType.DATA_FETCH]: 'Unable to load transit data. Please try again in a moment.',
    [ErrorType.PROCESSING]: 'Error processing transit data. Some information may be unavailable.'
  };

  private static readonly RETRY_STRATEGIES: Record<ErrorType, RetryConfig> = {
    [ErrorType.NETWORK]: { maxRetries: 3, backoffType: 'exponential', initialDelay: 1000, maxDelay: 8000 },
    [ErrorType.AUTHENTICATION]: { maxRetries: 1, backoffType: 'none' },
    [ErrorType.VALIDATION]: { maxRetries: 0, backoffType: 'none' },
    [ErrorType.CONFIGURATION]: { maxRetries: 1, backoffType: 'none' },
    [ErrorType.CACHE]: { maxRetries: 2, backoffType: 'linear', initialDelay: 500, maxDelay: 2000 },
    [ErrorType.DATA_FETCH]: { maxRetries: 2, backoffType: 'exponential', initialDelay: 1000, maxDelay: 4000 },
    [ErrorType.PROCESSING]: { maxRetries: 1, backoffType: 'linear', initialDelay: 500, maxDelay: 1000 }
  };

  private static readonly ERROR_SEVERITY: Record<ErrorType, ErrorSeverity> = {
    [ErrorType.NETWORK]: 'medium',
    [ErrorType.AUTHENTICATION]: 'critical',
    [ErrorType.VALIDATION]: 'medium',
    [ErrorType.CONFIGURATION]: 'high',
    [ErrorType.CACHE]: 'low',
    [ErrorType.DATA_FETCH]: 'high',
    [ErrorType.PROCESSING]: 'low'
  };

  /**
   * Create a standardized error
   */
  static createError(
    type: ErrorType,
    message: string,
    context: Record<string, any> = {},
    originalError?: Error
  ): StandardError {
    const errorId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      type,
      message: message || this.ERROR_MESSAGES[type],
      userMessage: this.USER_MESSAGES[type],
      retryable: this.RETRY_STRATEGIES[type].maxRetries > 0,
      context,
      timestamp: new Date(),
      errorId,
      originalError
    };
  }

  /**
   * Create error from existing Error object
   */
  static fromError(error: Error, context: Record<string, any> = {}): StandardError {
    const type = this.classifyError(error);
    return this.createError(type, error.message, context, error);
  }

  /**
   * Get user-friendly message for error
   */
  static getUserMessage(error: StandardError): string {
    return error.userMessage;
  }

  /**
   * Check if error should be retried
   */
  static shouldRetry(error: StandardError, retryCount: number): boolean {
    const config = this.RETRY_STRATEGIES[error.type];
    return error.retryable && retryCount < config.maxRetries;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  static getRetryDelay(error: StandardError, retryCount: number): number {
    const config = this.RETRY_STRATEGIES[error.type];
    
    if (config.backoffType === 'none') {
      return 0;
    }

    const baseDelay = config.initialDelay || 1000;
    const maxDelay = config.maxDelay || 8000;

    let delay: number;
    
    if (config.backoffType === 'exponential') {
      delay = baseDelay * Math.pow(2, retryCount);
    } else {
      // linear backoff
      delay = baseDelay * (retryCount + 1);
    }

    return Math.min(delay, maxDelay);
  }

  /**
   * Get error severity
   */
  static getSeverity(error: StandardError): ErrorSeverity {
    return this.ERROR_SEVERITY[error.type];
  }

  /**
   * Classify error type from Error object
   */
  private static classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('401') || message.includes('403') || message.includes('unauthorized')) {
      return ErrorType.AUTHENTICATION;
    }
    
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return ErrorType.NETWORK;
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION;
    }
    
    if (message.includes('config') || message.includes('setup')) {
      return ErrorType.CONFIGURATION;
    }
    
    if (message.includes('cache')) {
      return ErrorType.CACHE;
    }

    if (message.includes('processing') || message.includes('transform')) {
      return ErrorType.PROCESSING;
    }
    
    return ErrorType.DATA_FETCH;
  }

  /**
   * Create error report for logging
   */
  static createErrorReport(error: StandardError): Record<string, any> {
    return {
      errorId: error.errorId,
      type: error.type,
      message: error.message,
      severity: this.getSeverity(error),
      retryable: error.retryable,
      timestamp: error.timestamp.toISOString(),
      context: error.context,
      originalError: error.originalError ? {
        name: error.originalError.name,
        message: error.originalError.message,
        stack: error.originalError.stack
      } : null
    };
  }
}