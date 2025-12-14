import React, { Component, type ReactNode } from 'react';
import { ErrorDisplay } from './ErrorDisplay';
import type { ErrorState } from '../../../types';
import { logger } from '../../../utils/loggerFixed';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: ErrorState, retry: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: ErrorState | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Classify the error type
    let errorType: ErrorState['type'] = 'network';
    
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      errorType = 'network';
    } else if (error.name === 'SyntaxError' || error.message.includes('JSON')) {
      errorType = 'parsing';
    } else if (error.message.includes('Authentication') || error.message.includes('Unauthorized')) {
      errorType = 'authentication';
    }

    const errorState: ErrorState = {
      type: errorType,
      message: error.message || 'An unexpected error occurred',
      timestamp: new Date(),
      retryable: errorType === 'network' || errorType === 'authentication',
    };

    return {
      hasError: true,
      error: errorState,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Enhanced logging with context
    logger.componentError('ErrorBoundary', error);
    logger.error('React Error Boundary Caught Error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: 'ErrorBoundary',
    }, 'REACT');

    // Log additional context
    logger.info('Error Boundary State', {
      hasError: this.state.hasError,
      errorType: this.state.error?.type,
      timestamp: new Date().toISOString(),
    }, 'REACT');
  }

  handleRetry = () => {
    logger.info('User triggered error boundary retry');
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Something went wrong
              </h1>
              <p className="text-gray-600">
                The application encountered an unexpected error.
              </p>
            </div>
            
            <ErrorDisplay 
              error={this.state.error} 
              onRetry={this.state.error.retryable ? this.handleRetry : undefined}
            />
            
            {!this.state.error.retryable && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => window.location.reload()}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Reload Page
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}