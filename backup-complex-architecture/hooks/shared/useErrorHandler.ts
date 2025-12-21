import { useState, useCallback } from 'react';
import type { ErrorState } from '../../types';
import { StoreErrorHandler } from '../../stores/shared/errorHandler';
import { withRetry, isRetryableError, RetryError } from '../../utils/formatting/retryUtils';

export interface UseErrorHandlerReturn {
  error: ErrorState | null;
  isLoading: boolean;
  executeWithErrorHandling: <T>(
    operation: () => Promise<T>,
    options?: {
      retryOptions?: Parameters<typeof withRetry>[1];
      errorType?: ErrorState['type'];
      customErrorMessage?: string;
    }
  ) => Promise<T | null>;
  clearError: () => void;
  retryLastOperation: () => Promise<void>;
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<ErrorState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastOperation, setLastOperation] = useState<(() => Promise<any>) | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    options: {
      retryOptions?: Parameters<typeof withRetry>[1];
      errorType?: ErrorState['type'];
      customErrorMessage?: string;
    } = {}
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    setLastOperation(() => operation);

    try {
      const result = await withRetry(operation, options.retryOptions);
      setIsLoading(false);
      return result;
    } catch (error) {
      // Use standardized error handler to create consistent error state
      const errorState = StoreErrorHandler.createError(error, {
        storeName: 'useErrorHandler',
        operation: 'executeWithErrorHandling',
        timestamp: new Date(),
        metadata: {
          hasCustomMessage: !!options.customErrorMessage,
          specifiedErrorType: options.errorType,
        },
      });

      // Override message if custom message is provided
      if (options.customErrorMessage) {
        errorState.message = options.customErrorMessage;
      }

      // Override error type if specified
      if (options.errorType) {
        (errorState as any).type = options.errorType;
      }

      // Ensure all required properties are set
      const completeErrorState = {
        ...errorState,
        hasError: true,
        isRecoverable: true,
      };

      setError(completeErrorState);
      setIsLoading(false);
      return null;
    }
  }, []);

  const retryLastOperation = useCallback(async () => {
    if (lastOperation) {
      await executeWithErrorHandling(lastOperation);
    }
  }, [lastOperation, executeWithErrorHandling]);

  return {
    error,
    isLoading,
    executeWithErrorHandling,
    clearError,
    retryLastOperation,
  };
}