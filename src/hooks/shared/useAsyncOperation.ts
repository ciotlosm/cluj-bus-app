import { useState, useCallback } from 'react';
import { logger } from '../../utils/shared/logger';

export interface AsyncOperationOptions {
  /** Custom error message prefix */
  errorMessage?: string;
  /** Log category for debugging */
  logCategory?: string;
  /** Whether to log successful operations */
  logSuccess?: boolean;
  /** Custom error handler */
  onError?: (error: Error) => void;
  /** Custom success handler */
  onSuccess?: <T>(result: T) => void;
}

/**
 * Reusable hook for handling async operations with loading states and error management
 * Eliminates duplication of try-catch-finally patterns across the app
 */
export const useAsyncOperation = <T = any>() => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<T | null>(null);

  const execute = useCallback(async (
    operation: () => Promise<T>,
    options: AsyncOperationOptions = {}
  ): Promise<T | null> => {
    const {
      errorMessage = 'Operation failed',
      logCategory = 'ASYNC_OP',
      logSuccess = false,
      onError,
      onSuccess,
    } = options;

    setIsLoading(true);
    setError(null);

    try {
      const result = await operation();
      
      setLastResult(result);
      
      if (logSuccess) {
        logger.debug(`${errorMessage} completed successfully`, { result }, logCategory);
      }
      
      onSuccess?.(result);
      return result;
      
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      const fullMessage = `${errorMessage}: ${errorObj.message}`;
      
      logger.error(fullMessage, { 
        error: errorObj,
        stack: errorObj.stack 
      }, logCategory);
      
      setError(fullMessage);
      onError?.(errorObj);
      return null;
      
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Execute operation without error handling (throws on error)
  const executeUnsafe = useCallback(async (
    operation: () => Promise<T>,
    options: AsyncOperationOptions = {}
  ): Promise<T> => {
    const {
      errorMessage = 'Operation failed',
      logCategory = 'ASYNC_OP',
      logSuccess = false,
      onSuccess,
    } = options;

    setIsLoading(true);
    setError(null);

    try {
      const result = await operation();
      
      setLastResult(result);
      
      if (logSuccess) {
        logger.debug(`${errorMessage} completed successfully`, { result }, logCategory);
      }
      
      onSuccess?.(result);
      return result;
      
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      const fullMessage = `${errorMessage}: ${errorObj.message}`;
      
      logger.error(fullMessage, { 
        error: errorObj,
        stack: errorObj.stack 
      }, logCategory);
      
      setError(fullMessage);
      throw errorObj;
      
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Reset all state
  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setLastResult(null);
  }, []);

  return {
    execute,
    executeUnsafe,
    isLoading,
    error,
    lastResult,
    clearError,
    reset,
  };
};

/**
 * Simplified version for one-off async operations
 */
export const executeAsync = async <T>(
  operation: () => Promise<T>,
  options: AsyncOperationOptions = {}
): Promise<T | null> => {
  const {
    errorMessage = 'Operation failed',
    logCategory = 'ASYNC_OP',
    onError,
  } = options;

  try {
    const result = await operation();
    return result;
  } catch (err) {
    const errorObj = err instanceof Error ? err : new Error(String(err));
    const fullMessage = `${errorMessage}: ${errorObj.message}`;
    
    logger.error(fullMessage, { 
      error: errorObj,
      stack: errorObj.stack 
    }, logCategory);
    
    onError?.(errorObj);
    return null;
  }
};