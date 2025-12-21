import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { materialTheme } from '../../../../theme/materialTheme';
import { CentralizedErrorDisplay } from './CentralizedErrorDisplay';
import type { CentralizedErrorState } from '../../../hooks/shared/useCentralizedErrorHandler';

// Test wrapper with theme
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={materialTheme}>
    {children}
  </ThemeProvider>
);

describe('CentralizedErrorDisplay', () => {
  const mockErrorState: CentralizedErrorState = {
    error: {
      type: 'network',
      message: 'Network connection failed',
      userMessage: 'Unable to connect to the service',
      retryable: true,
      context: { component: 'TestComponent' },
      timestamp: new Date('2024-01-01T12:00:00Z'),
      errorId: 'test-error-123',
    },
    displayMessage: 'Unable to connect to the service. Please check your internet connection.',
    recoveryActions: [
      {
        label: 'Retry',
        action: vi.fn(),
        variant: 'primary',
      },
      {
        label: 'Cancel',
        action: vi.fn(),
        variant: 'secondary',
      },
    ],
    severity: 'medium',
    isRetryable: true,
    timestamp: new Date('2024-01-01T12:00:00Z'),
  };

  it('should render error message and title', () => {
    render(
      <TestWrapper>
        <CentralizedErrorDisplay errorState={mockErrorState} />
      </TestWrapper>
    );

    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText(mockErrorState.displayMessage)).toBeInTheDocument();
  });

  it('should render recovery actions', () => {
    render(
      <TestWrapper>
        <CentralizedErrorDisplay errorState={mockErrorState} />
      </TestWrapper>
    );

    expect(screen.getByText('Retry')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should call recovery action when clicked', () => {
    const mockAction = vi.fn();
    const errorStateWithAction: CentralizedErrorState = {
      ...mockErrorState,
      recoveryActions: [
        {
          label: 'Test Action',
          action: mockAction,
        },
      ],
    };

    render(
      <TestWrapper>
        <CentralizedErrorDisplay errorState={errorStateWithAction} />
      </TestWrapper>
    );

    const actionButton = screen.getByText('Test Action');
    fireEvent.click(actionButton);

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should render inline variant correctly', () => {
    render(
      <TestWrapper>
        <CentralizedErrorDisplay 
          errorState={mockErrorState} 
          variant="inline" 
        />
      </TestWrapper>
    );

    // Should render as Alert component
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should render page variant correctly', () => {
    render(
      <TestWrapper>
        <CentralizedErrorDisplay 
          errorState={mockErrorState} 
          variant="page" 
        />
      </TestWrapper>
    );

    // Should render with full-page styling - check for the page variant structure
    expect(screen.getByText(mockErrorState.displayMessage)).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('should show severity indicator when enabled', () => {
    render(
      <TestWrapper>
        <CentralizedErrorDisplay 
          errorState={mockErrorState} 
          showSeverity={true} 
        />
      </TestWrapper>
    );

    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
  });

  it('should hide severity indicator when disabled', () => {
    render(
      <TestWrapper>
        <CentralizedErrorDisplay 
          errorState={mockErrorState} 
          showSeverity={false} 
        />
      </TestWrapper>
    );

    expect(screen.queryByText('MEDIUM')).not.toBeInTheDocument();
  });

  it('should show timestamp when enabled', () => {
    render(
      <TestWrapper>
        <CentralizedErrorDisplay 
          errorState={mockErrorState} 
          showTimestamp={true} 
        />
      </TestWrapper>
    );

    // Should show some form of timestamp (exact format may vary)
    expect(screen.getByText(/ago|Just now|:/)).toBeInTheDocument();
  });

  it('should hide recovery actions when disabled', () => {
    render(
      <TestWrapper>
        <CentralizedErrorDisplay 
          errorState={mockErrorState} 
          hideRecoveryActions={true} 
        />
      </TestWrapper>
    );

    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it('should use custom title when provided', () => {
    const customTitle = 'Custom Error Title';
    
    render(
      <TestWrapper>
        <CentralizedErrorDisplay 
          errorState={mockErrorState} 
          title={customTitle} 
        />
      </TestWrapper>
    );

    expect(screen.getByText(customTitle)).toBeInTheDocument();
    expect(screen.queryByText('Warning')).not.toBeInTheDocument();
  });

  it('should limit recovery actions based on maxRecoveryActions', () => {
    const errorStateWithManyActions: CentralizedErrorState = {
      ...mockErrorState,
      recoveryActions: [
        { label: 'Action 1', action: vi.fn() },
        { label: 'Action 2', action: vi.fn() },
        { label: 'Action 3', action: vi.fn() },
        { label: 'Action 4', action: vi.fn() },
      ],
    };

    render(
      <TestWrapper>
        <CentralizedErrorDisplay 
          errorState={errorStateWithManyActions} 
          maxRecoveryActions={2} 
        />
      </TestWrapper>
    );

    expect(screen.getByText('Action 1')).toBeInTheDocument();
    expect(screen.getByText('Action 2')).toBeInTheDocument();
    expect(screen.queryByText('Action 3')).not.toBeInTheDocument();
    expect(screen.queryByText('Action 4')).not.toBeInTheDocument();
  });

  it('should render different severity levels correctly', () => {
    const criticalErrorState: CentralizedErrorState = {
      ...mockErrorState,
      severity: 'critical',
    };

    render(
      <TestWrapper>
        <CentralizedErrorDisplay 
          errorState={criticalErrorState} 
          showSeverity={true} 
        />
      </TestWrapper>
    );

    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    expect(screen.getByText('Critical Error')).toBeInTheDocument();
  });

  it('should handle empty recovery actions gracefully', () => {
    const errorStateWithoutActions: CentralizedErrorState = {
      ...mockErrorState,
      recoveryActions: [],
    };

    render(
      <TestWrapper>
        <CentralizedErrorDisplay errorState={errorStateWithoutActions} />
      </TestWrapper>
    );

    // Should render without errors and not show any action buttons
    expect(screen.getByText(mockErrorState.displayMessage)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});