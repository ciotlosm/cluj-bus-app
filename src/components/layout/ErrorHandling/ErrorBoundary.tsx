import React, { Component, type ReactNode } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
} from '@mui/material';
import { ErrorDisplay } from './ErrorDisplay';
import type { ErrorState } from '../../../types';
import { StoreErrorHandler } from '../../../stores/shared/errorHandler';
import { logger } from '../../../utils/shared/logger';

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
    // Use standardized error handler to create consistent error state
    const errorState = StoreErrorHandler.createError(error, {
      storeName: 'ErrorBoundary',
      operation: 'componentRender',
      timestamp: new Date(),
      metadata: {
        errorName: error.name,
        componentStack: 'React component tree',
      },
    });

    return {
      hasError: true,
      error: { ...errorState, hasError: true, isRecoverable: true },
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
        <Box
          sx={{
            minHeight: '100vh',
            bgcolor: 'background.default',
            color: 'text.primary',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
          }}
        >
          <Container maxWidth="sm">
            <Paper
              elevation={8}
              sx={{
                p: 4,
                textAlign: 'center',
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 700,
                  color: 'text.primary',
                  mb: 1,
                }}
              >
                Something went wrong
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mb: 3 }}
              >
                The application encountered an unexpected error.
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <ErrorDisplay 
                  error={this.state.error} 
                  onRetry={this.state.error.retryable ? this.handleRetry : undefined}
                />
              </Box>
              
              {!this.state.error.retryable && (
                <Button
                  variant="text"
                  color="primary"
                  onClick={() => window.location.reload()}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 500,
                  }}
                >
                  Reload Page
                </Button>
              )}
            </Paper>
          </Container>
        </Box>
      );
    }

    return this.props.children;
  }
}