import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { CentralizedErrorDisplay } from '../CentralizedErrorDisplay';
import { ErrorHandler } from '../../../../hooks/shared/errors/ErrorHandler';
import { ErrorType } from '../../../../hooks/shared/errors/types';
import type { CentralizedErrorState } from '../../../../hooks/shared/useCentralizedErrorHandler';
import { logger } from '../../../../utils/shared/logger';

/**
 * Error boundary props
 */
export interface CentralizedErrorBoundaryProps {
  /** Child components */
  children: ReactNode;
  /** Component context for error reporting */
  context: string;
  /** Fallback component to render on error */
  fallback?: (errorState: CentralizedErrorState, resetError: () => void) => ReactNode;
  /** Error display variant */
  variant?: 'inline' | 'card' | 'page';
  /** Custom error title */
  title?: string;
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to show recovery actions */
  showRecoveryActions?: boolean;
  /** Whether to auto-reset after successful retry */
  autoReset?: boolean;
}

/**
 * Error boundary state
 */
interface CentralizedErrorBoundaryState {
  hasError: boolean;
  errorState: CentralizedErrorState | null;
}

/**
 * Centralized error boundary component
 * Catches JavaScript errors anywhere in the child component tree
 * Integrates with centralized error handling system
 * 
 * Validates Requirements: 7.2, 7.5
 */
export class CentralizedErrorBoundary extends Component<
  CentralizedErrorBoundaryProps,
  CentralizedErrorBoundaryState
> {
  constructor(props: CentralizedErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorState: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<CentralizedErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { context, onError } = this.props;

    // Create standardized error
    const standardError = ErrorHandler.fromError(error, {
      context,
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    // Create error state
    const errorState: CentralizedErrorState = {
      error: standardError,
      displayMessage: ErrorHandler.getUserMessage(standardError),
      recoveryActions: [
        {
          label: 'Reload Page',
          action: () => window.location.reload(),
          variant: 'primary',
        },
        {
          label: 'Go Back',
          action: () => window.history.back(),
          variant: 'secondary',
        },
      ],
      severity: ErrorHandler.getSeverity(standardError),
      isRetryable: false, // Error boundaries typically don't retry
      timestamp: new Date(),
    };

    // Log error
    logger.error(`${context}: Error boundary caught error`, {
      error: ErrorHandler.createErrorReport(standardError),
      componentStack: errorInfo.componentStack,
    });

    // Update state
    this.setState({ errorState });

    // Call onError callback if provided
    if (onError) {
      onError(error, errorInfo);
    }
  }

  /**
   * Reset error state
   */
  resetError = () => {
    this.setState({
      hasError: false,
      errorState: null,
    });
  };

  /**
   * Add retry functionality to error state
   */
  addRetryAction = (retryFn: () => void | Promise<void>) => {
    this.setState(prevState => {
      if (!prevState.errorState) return prevState;

      const retryAction = {
        label: 'Try Again',
        action: async () => {
          try {
            await retryFn();
            if (this.props.autoReset) {
              this.resetError();
            }
          } catch (error) {
            // If retry fails, update error state
            logger.warn(`${this.props.context}: Retry failed`, { error });
          }
        },
        variant: 'primary' as const,
      };

      return {
        ...prevState,
        errorState: {
          ...prevState.errorState,
          recoveryActions: [retryAction, ...prevState.errorState.recoveryActions],
        },
      };
    });
  };

  render() {
    const { 
      children, 
      fallback, 
      variant = 'card', 
      title, 
      showRecoveryActions = true 
    } = this.props;
    const { hasError, errorState } = this.state;

    if (hasError && errorState) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(errorState, this.resetError);
      }

      // Use default error display
      return (
        <CentralizedErrorDisplay
          errorState={errorState}
          variant={variant}
          title={title}
          hideRecoveryActions={!showRecoveryActions}
          showSeverity={true}
          showTimestamp={true}
        />
      );
    }

    return children;
  }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  boundaryProps: Omit<CentralizedErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => (
    <CentralizedErrorBoundary {...boundaryProps}>
      <Component {...(props as any)} ref={ref} />
    </CentralizedErrorBoundary>
  ));

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Hook for accessing error boundary context
 */
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return {
    captureError,
    resetError,
  };
}

export default CentralizedErrorBoundary;