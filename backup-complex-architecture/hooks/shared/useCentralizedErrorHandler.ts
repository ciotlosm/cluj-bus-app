import React, { useState, useCallback, useRef } from 'react';
import { ErrorHandler } from './errors/ErrorHandler';
import { StoreErrorHandler } from '../../stores/shared/errorHandler';
import { ErrorType } from './errors/types';
import type { StandardError } from './errors/types';
import type { ErrorState } from '../../stores/shared/errorHandler';
import { logger } from '../../utils/shared/logger';

/**
 * Error recovery action interface
 */
export interface ErrorRecoveryAction {
  label: string;
  action: () => void | Promise<void>;
  variant?: 'primary' | 'secondary';
}

/**
 * Centralized error handling configuration
 */
export interface ErrorHandlingConfig {
  /** Component or feature name for context */
  context: string;
  /** Whether to automatically log errors */
  autoLog?: boolean;
  /** Default recovery actions */
  defaultRecoveryActions?: ErrorRecoveryAction[];
  /** Custom error message formatter */
  formatError?: (error: StandardError | ErrorState) => string;
  /** Error severity threshold for logging */
  logSeverityThreshold?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Centralized error state
 */
export interface CentralizedErrorState {
  /** Current error */
  error: StandardError | ErrorState | null;
  /** Error display message */
  displayMessage: string;
  /** Available recovery actions */
  recoveryActions: ErrorRecoveryAction[];
  /** Error severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Whether error is retryable */
  isRetryable: boolean;
  /** Error timestamp */
  timestamp: Date;
}

/**
 * Centralized error handler return interface
 */
export interface UseCentralizedErrorHandlerReturn {
  /** Current error state */
  errorState: CentralizedErrorState | null;
  /** Handle a new error */
  handleError: (error: unknown, operation?: string, metadata?: Record<string, any>) => void;
  /** Clear current error */
  clearError: () => void;
  /** Retry last failed operation */
  retryLastOperation: () => Promise<void>;
  /** Add recovery action */
  addRecoveryAction: (action: ErrorRecoveryAction) => void;
  /** Remove recovery action */
  removeRecoveryAction: (label: string) => void;
  /** Check if error is of specific type */
  isErrorType: (type: ErrorType | ErrorState['type']) => boolean;
  /** Get user-friendly error message */
  getUserMessage: () => string;
}

/**
 * Centralized error handling hook
 * Unifies StoreErrorHandler and ErrorHandler patterns
 * Provides consistent error handling across all components
 * 
 * Validates Requirements: 7.2, 7.4, 7.5
 */
export function useCentralizedErrorHandler(
  config: ErrorHandlingConfig
): UseCentralizedErrorHandlerReturn {
  const [errorState, setErrorState] = useState<CentralizedErrorState | null>(null);
  const lastOperationRef = useRef<(() => Promise<any>) | null>(null);
  const configRef = useRef(config);

  // Update config ref when config changes
  configRef.current = config;

  /**
   * Convert various error types to standardized format
   */
  const normalizeError = useCallback((error: unknown): StandardError | ErrorState => {
    // Handle StandardError from ErrorHandler
    if (error && typeof error === 'object' && 'type' in error && 'errorId' in error) {
      return error as StandardError;
    }

    // Handle ErrorState from StoreErrorHandler
    if (error && typeof error === 'object' && 'type' in error && 'timestamp' in error && !('errorId' in error)) {
      return error as ErrorState;
    }

    // Handle regular Error objects
    if (error instanceof Error) {
      return ErrorHandler.fromError(error, { context: configRef.current.context });
    }

    // Handle string errors
    if (typeof error === 'string') {
      return ErrorHandler.createError(
        ErrorType.DATA_FETCH,
        error,
        { context: configRef.current.context }
      );
    }

    // Handle unknown errors
    return ErrorHandler.createError(
      ErrorType.DATA_FETCH,
      'An unexpected error occurred',
      { context: configRef.current.context, originalError: error }
    );
  }, []);

  /**
   * Get error severity
   */
  const getErrorSeverity = useCallback((error: StandardError | ErrorState): 'low' | 'medium' | 'high' | 'critical' => {
    if ('errorId' in error) {
      // StandardError
      return ErrorHandler.getSeverity(error);
    } else {
      // ErrorState - map types to severity
      const severityMap: Record<ErrorState['type'], 'low' | 'medium' | 'high' | 'critical'> = {
        network: 'medium',
        authentication: 'critical',
        parsing: 'medium',
        noData: 'low',
        partial: 'low',
      };
      return severityMap[error.type] || 'medium';
    }
  }, []);

  /**
   * Get user-friendly error message
   */
  const getUserMessage = useCallback((error: StandardError | ErrorState): string => {
    const { formatError } = configRef.current;
    
    if (formatError) {
      return formatError(error);
    }

    if ('errorId' in error) {
      // StandardError
      return ErrorHandler.getUserMessage(error);
    } else {
      // ErrorState
      return error.message;
    }
  }, []);

  /**
   * Check if error is retryable
   */
  const isErrorRetryable = useCallback((error: StandardError | ErrorState): boolean => {
    if ('errorId' in error) {
      // StandardError
      return error.retryable;
    } else {
      // ErrorState
      return error.retryable;
    }
  }, []);

  /**
   * Log error if configured to do so
   */
  const logError = useCallback((error: StandardError | ErrorState, operation?: string, metadata?: Record<string, any>) => {
    const { autoLog = true, logSeverityThreshold = 'low' } = configRef.current;
    
    if (!autoLog) return;

    const severity = getErrorSeverity(error);
    const severityLevels = ['low', 'medium', 'high', 'critical'];
    const thresholdIndex = severityLevels.indexOf(logSeverityThreshold);
    const errorSeverityIndex = severityLevels.indexOf(severity);

    if (errorSeverityIndex >= thresholdIndex) {
      const logData = {
        context: configRef.current.context,
        operation,
        severity,
        metadata,
        error: 'errorId' in error ? ErrorHandler.createErrorReport(error) : error,
      };

      if (severity === 'critical') {
        logger.error(`${configRef.current.context}: Critical error${operation ? ` in ${operation}` : ''}`, logData);
      } else if (severity === 'high') {
        logger.warn(`${configRef.current.context}: High severity error${operation ? ` in ${operation}` : ''}`, logData);
      } else {
        logger.info(`${configRef.current.context}: Error${operation ? ` in ${operation}` : ''}`, logData);
      }
    }
  }, [getErrorSeverity]);

  /**
   * Handle a new error
   */
  const handleError = useCallback((error: unknown, operation?: string, metadata?: Record<string, any>) => {
    const normalizedError = normalizeError(error);
    const severity = getErrorSeverity(normalizedError);
    const displayMessage = getUserMessage(normalizedError);
    const isRetryable = isErrorRetryable(normalizedError);

    // Log the error
    logError(normalizedError, operation, metadata);

    // Create recovery actions
    const recoveryActions: ErrorRecoveryAction[] = [...(configRef.current.defaultRecoveryActions || [])];

    // Add retry action if error is retryable and we have a last operation
    if (isRetryable && lastOperationRef.current) {
      recoveryActions.unshift({
        label: 'Retry',
        action: async () => {
          if (lastOperationRef.current) {
            try {
              await lastOperationRef.current();
              // Clear error on successful retry
              setErrorState(null);
            } catch (retryError) {
              // Handle retry failure
              handleError(retryError, 'retry');
            }
          }
        },
        variant: 'primary',
      });
    }

    // Set error state
    setErrorState({
      error: normalizedError,
      displayMessage,
      recoveryActions,
      severity,
      isRetryable,
      timestamp: new Date(),
    });
  }, [normalizeError, getErrorSeverity, getUserMessage, isErrorRetryable, logError]);

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  /**
   * Retry last failed operation
   */
  const retryLastOperation = useCallback(async () => {
    if (lastOperationRef.current) {
      clearError();
      try {
        await lastOperationRef.current();
      } catch (error) {
        handleError(error, 'retry');
      }
    }
  }, [clearError, handleError]);

  /**
   * Add recovery action
   */
  const addRecoveryAction = useCallback((action: ErrorRecoveryAction) => {
    setErrorState(current => {
      if (!current) return current;
      
      return {
        ...current,
        recoveryActions: [...current.recoveryActions, action],
      };
    });
  }, []);

  /**
   * Remove recovery action
   */
  const removeRecoveryAction = useCallback((label: string) => {
    setErrorState(current => {
      if (!current) return current;
      
      return {
        ...current,
        recoveryActions: current.recoveryActions.filter(action => action.label !== label),
      };
    });
  }, []);

  /**
   * Check if error is of specific type
   */
  const isErrorType = useCallback((type: ErrorType | ErrorState['type']): boolean => {
    if (!errorState?.error) return false;
    return errorState.error.type === type;
  }, [errorState]);

  /**
   * Get user-friendly error message
   */
  const getUserMessageCallback = useCallback((): string => {
    if (!errorState) return '';
    return errorState.displayMessage;
  }, [errorState]);

  /**
   * Store last operation for retry functionality
   */
  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<T> => {
    lastOperationRef.current = operation;
    clearError();
    
    try {
      return await operation();
    } catch (error) {
      handleError(error, operationName);
      throw error;
    }
  }, [clearError, handleError]);

  return {
    errorState,
    handleError,
    clearError,
    retryLastOperation,
    addRecoveryAction,
    removeRecoveryAction,
    isErrorType,
    getUserMessage: getUserMessageCallback,
  };
}

/**
 * Higher-order component for automatic error boundary integration
 */
export function withCentralizedErrorHandling<P extends object>(
  Component: React.ComponentType<P>,
  config: ErrorHandlingConfig
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => {
    const errorHandler = useCentralizedErrorHandler(config);

    // Add error handler to props if component expects it
    const enhancedProps = {
      ...props,
      errorHandler,
    } as P & { errorHandler: UseCentralizedErrorHandlerReturn };

    return React.createElement(Component, enhancedProps);
  };

  WrappedComponent.displayName = `withCentralizedErrorHandling(${Component.displayName || Component.name})`;

  return WrappedComponent;
}