import { useCentralizedErrorHandler, type ErrorHandlingConfig, type ErrorRecoveryAction } from './useCentralizedErrorHandler';
import { ErrorHandler } from './errors/ErrorHandler';
import { StoreErrorHandler } from '../../stores/shared/errorHandler';
import type { ErrorType } from './errors/types';
import { logger } from '../../utils/shared/logger';

/**
 * Common error handling patterns and utilities
 * Provides pre-configured error handlers for common scenarios
 * 
 * Validates Requirements: 7.2, 7.4, 7.5
 */

/**
 * Pre-configured error handling configurations for common scenarios
 */
export const ErrorHandlingConfigs = {
  /**
   * API operations (network requests, data fetching)
   */
  api: (context: string): ErrorHandlingConfig => ({
    context: `API:${context}`,
    autoLog: true,
    logSeverityThreshold: 'medium',
    defaultRecoveryActions: [
      {
        label: 'Refresh',
        action: () => window.location.reload(),
        variant: 'secondary',
      },
    ],
  }),

  /**
   * Form operations (validation, submission)
   */
  form: (context: string): ErrorHandlingConfig => ({
    context: `Form:${context}`,
    autoLog: true,
    logSeverityThreshold: 'high',
    defaultRecoveryActions: [
      {
        label: 'Clear Form',
        action: () => {
          // This will be overridden by the component
          logger.info('Clear form action triggered');
        },
        variant: 'secondary',
      },
    ],
  }),

  /**
   * UI component operations (rendering, interactions)
   */
  component: (context: string): ErrorHandlingConfig => ({
    context: `Component:${context}`,
    autoLog: true,
    logSeverityThreshold: 'low',
    defaultRecoveryActions: [],
  }),

  /**
   * Data processing operations (transformations, calculations)
   */
  processing: (context: string): ErrorHandlingConfig => ({
    context: `Processing:${context}`,
    autoLog: true,
    logSeverityThreshold: 'medium',
    defaultRecoveryActions: [
      {
        label: 'Reset Data',
        action: () => {
          // This will be overridden by the component
          logger.info('Reset data action triggered');
        },
        variant: 'secondary',
      },
    ],
  }),

  /**
   * Authentication operations (login, API key validation)
   */
  auth: (context: string): ErrorHandlingConfig => ({
    context: `Auth:${context}`,
    autoLog: true,
    logSeverityThreshold: 'high',
    defaultRecoveryActions: [
      {
        label: 'Go to Settings',
        action: () => {
          // Navigate to settings - this will be overridden by the component
          logger.info('Navigate to settings action triggered');
        },
        variant: 'primary',
      },
    ],
  }),
};

/**
 * Hook for API error handling
 */
export function useApiErrorHandler(context: string) {
  return useCentralizedErrorHandler(ErrorHandlingConfigs.api(context));
}

/**
 * Hook for form error handling
 */
export function useFormErrorHandler(context: string) {
  const errorHandler = useCentralizedErrorHandler(ErrorHandlingConfigs.form(context));

  // Add form-specific utilities
  const handleValidationError = (fieldErrors: Record<string, string>) => {
    const errorMessage = Object.entries(fieldErrors)
      .map(([field, error]) => `${field}: ${error}`)
      .join(', ');
    
    errorHandler.handleError(
      ErrorHandler.createError('VALIDATION' as ErrorType, errorMessage),
      'validation'
    );
  };

  const handleSubmissionError = (error: unknown) => {
    errorHandler.handleError(error, 'submission');
  };

  return {
    ...errorHandler,
    handleValidationError,
    handleSubmissionError,
  };
}

/**
 * Hook for component error handling
 */
export function useComponentErrorHandler(context: string) {
  return useCentralizedErrorHandler(ErrorHandlingConfigs.component(context));
}

/**
 * Hook for data processing error handling
 */
export function useProcessingErrorHandler(context: string) {
  return useCentralizedErrorHandler(ErrorHandlingConfigs.processing(context));
}

/**
 * Hook for authentication error handling
 */
export function useAuthErrorHandler(context: string) {
  const errorHandler = useCentralizedErrorHandler(ErrorHandlingConfigs.auth(context));

  // Add auth-specific utilities
  const handleApiKeyError = () => {
    errorHandler.handleError(
      ErrorHandler.createError('AUTHENTICATION' as ErrorType, 'Invalid API key'),
      'apiKeyValidation'
    );
  };

  const handlePermissionError = () => {
    errorHandler.handleError(
      ErrorHandler.createError('AUTHENTICATION' as ErrorType, 'Insufficient permissions'),
      'permissionCheck'
    );
  };

  return {
    ...errorHandler,
    handleApiKeyError,
    handlePermissionError,
  };
}

/**
 * Utility function to execute async operations with centralized error handling
 */
export async function executeWithErrorHandling<T>(
  operation: () => Promise<T>,
  errorHandler: ReturnType<typeof useCentralizedErrorHandler>,
  operationName?: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    errorHandler.handleError(error, operationName);
    return null;
  }
}

/**
 * Utility function to create recovery actions for common scenarios
 */
export const RecoveryActions = {
  /**
   * Retry action
   */
  retry: (retryFn: () => void | Promise<void>): ErrorRecoveryAction => ({
    label: 'Try Again',
    action: retryFn,
    variant: 'primary',
  }),

  /**
   * Refresh page action
   */
  refresh: (): ErrorRecoveryAction => ({
    label: 'Refresh Page',
    action: () => window.location.reload(),
    variant: 'secondary',
  }),

  /**
   * Go back action
   */
  goBack: (): ErrorRecoveryAction => ({
    label: 'Go Back',
    action: () => window.history.back(),
    variant: 'secondary',
  }),

  /**
   * Navigate to settings action
   */
  goToSettings: (navigate?: (path: string) => void): ErrorRecoveryAction => ({
    label: 'Open Settings',
    action: () => {
      if (navigate) {
        navigate('/settings');
      } else {
        // Fallback for apps without router
        window.location.hash = '#/settings';
      }
    },
    variant: 'primary',
  }),

  /**
   * Clear data action
   */
  clearData: (clearFn: () => void): ErrorRecoveryAction => ({
    label: 'Clear Data',
    action: clearFn,
    variant: 'secondary',
  }),

  /**
   * Contact support action
   */
  contactSupport: (supportUrl?: string): ErrorRecoveryAction => ({
    label: 'Contact Support',
    action: () => {
      const url = supportUrl || 'mailto:support@example.com';
      window.open(url, '_blank');
    },
    variant: 'secondary',
  }),
};

/**
 * Utility function to determine if an error should trigger a notification
 */
export function shouldShowNotification(
  errorType: ErrorType | string,
  severity: 'low' | 'medium' | 'high' | 'critical'
): boolean {
  // Show notifications for high and critical errors
  if (severity === 'high' || severity === 'critical') {
    return true;
  }

  // Show notifications for authentication errors regardless of severity
  if (errorType === 'AUTHENTICATION' || errorType === 'authentication') {
    return true;
  }

  // Don't show notifications for low severity cache or processing errors
  if (
    (errorType === 'CACHE' || errorType === 'cache') ||
    (errorType === 'PROCESSING' || errorType === 'processing')
  ) {
    return false;
  }

  return false;
}

/**
 * Utility function to get error context from component props
 */
export function getErrorContext(componentName: string, props?: Record<string, any>): string {
  const propsContext = props ? Object.keys(props).join(',') : '';
  return `${componentName}${propsContext ? `(${propsContext})` : ''}`;
}

/**
 * Utility function to merge error handlers
 */
export function mergeErrorHandlers(
  ...handlers: ReturnType<typeof useCentralizedErrorHandler>[]
): ReturnType<typeof useCentralizedErrorHandler> {
  const primaryHandler = handlers[0];
  
  if (!primaryHandler) {
    throw new Error('At least one error handler is required');
  }

  return {
    ...primaryHandler,
    handleError: (error: unknown, operation?: string, metadata?: Record<string, any>) => {
      // Handle error with all handlers
      handlers.forEach(handler => {
        handler.handleError(error, operation, metadata);
      });
    },
    clearError: () => {
      // Clear errors in all handlers
      handlers.forEach(handler => {
        handler.clearError();
      });
    },
  };
}