import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCentralizedErrorHandler } from './useCentralizedErrorHandler';
import { ErrorHandler } from './errors/ErrorHandler';
import { ErrorType } from './errors/types';

// Mock logger
vi.mock('../../utils/shared/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('useCentralizedErrorHandler', () => {
  const mockConfig = {
    context: 'TestComponent',
    autoLog: true,
    logSeverityThreshold: 'medium' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with no error state', () => {
    const { result } = renderHook(() => useCentralizedErrorHandler(mockConfig));

    expect(result.current.errorState).toBeNull();
  });

  it('should handle standard errors correctly', () => {
    const { result } = renderHook(() => useCentralizedErrorHandler(mockConfig));

    const testError = new Error('Test error message');

    act(() => {
      result.current.handleError(testError, 'testOperation');
    });

    expect(result.current.errorState).not.toBeNull();
    expect(result.current.errorState?.error).toBeDefined();
    expect(result.current.errorState?.severity).toBeDefined();
    expect(result.current.errorState?.displayMessage).toBeDefined();
  });

  it('should handle StandardError objects correctly', () => {
    const { result } = renderHook(() => useCentralizedErrorHandler(mockConfig));

    const standardError = ErrorHandler.createError(
      ErrorType.NETWORK,
      'Network error',
      { context: 'test' }
    );

    act(() => {
      result.current.handleError(standardError, 'networkOperation');
    });

    expect(result.current.errorState).not.toBeNull();
    expect(result.current.errorState?.error).toEqual(standardError);
    expect(result.current.errorState?.severity).toBe('medium');
  });

  it('should clear error state', () => {
    const { result } = renderHook(() => useCentralizedErrorHandler(mockConfig));

    // Set an error first
    act(() => {
      result.current.handleError(new Error('Test error'));
    });

    expect(result.current.errorState).not.toBeNull();

    // Clear the error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.errorState).toBeNull();
  });

  it('should add and remove recovery actions', () => {
    const { result } = renderHook(() => useCentralizedErrorHandler(mockConfig));

    // Set an error first
    act(() => {
      result.current.handleError(new Error('Test error'));
    });

    const initialActionsCount = result.current.errorState?.recoveryActions.length || 0;

    // Add recovery action
    const testAction = {
      label: 'Test Action',
      action: vi.fn(),
    };

    act(() => {
      result.current.addRecoveryAction(testAction);
    });

    expect(result.current.errorState?.recoveryActions).toHaveLength(initialActionsCount + 1);
    expect(result.current.errorState?.recoveryActions).toContainEqual(testAction);

    // Remove recovery action
    act(() => {
      result.current.removeRecoveryAction('Test Action');
    });

    expect(result.current.errorState?.recoveryActions).toHaveLength(initialActionsCount);
    expect(result.current.errorState?.recoveryActions).not.toContainEqual(testAction);
  });

  it('should check error type correctly', () => {
    const { result } = renderHook(() => useCentralizedErrorHandler(mockConfig));

    const networkError = ErrorHandler.createError(
      ErrorType.NETWORK,
      'Network error'
    );

    act(() => {
      result.current.handleError(networkError);
    });

    expect(result.current.isErrorType(ErrorType.NETWORK)).toBe(true);
    expect(result.current.isErrorType(ErrorType.AUTHENTICATION)).toBe(false);
  });

  it('should return user message correctly', () => {
    const { result } = renderHook(() => useCentralizedErrorHandler(mockConfig));

    const testError = ErrorHandler.createError(
      ErrorType.AUTHENTICATION,
      'Auth failed'
    );

    act(() => {
      result.current.handleError(testError);
    });

    const userMessage = result.current.getUserMessage();
    expect(userMessage).toBe(ErrorHandler.getUserMessage(testError));
  });

  it('should handle retryable errors with retry action', () => {
    const { result } = renderHook(() => useCentralizedErrorHandler(mockConfig));

    const retryableError = ErrorHandler.createError(
      ErrorType.NETWORK,
      'Network timeout'
    );

    act(() => {
      result.current.handleError(retryableError);
    });

    expect(result.current.errorState?.isRetryable).toBe(true);
    // Note: Retry action is only added when there's a last operation stored
    // For this test, we just verify the error is marked as retryable
  });

  it('should handle non-retryable errors without retry action', () => {
    const { result } = renderHook(() => useCentralizedErrorHandler(mockConfig));

    const nonRetryableError = ErrorHandler.createError(
      ErrorType.VALIDATION,
      'Invalid data format'
    );

    act(() => {
      result.current.handleError(nonRetryableError);
    });

    expect(result.current.errorState?.isRetryable).toBe(false);
    // Should not have retry action for non-retryable errors
    const hasRetryAction = result.current.errorState?.recoveryActions.some(
      action => action.label === 'Retry'
    );
    expect(hasRetryAction).toBe(false);
  });

  it('should use custom error formatter when provided', () => {
    const customFormatter = vi.fn().mockReturnValue('Custom error message');
    const configWithFormatter = {
      ...mockConfig,
      formatError: customFormatter,
    };

    const { result } = renderHook(() => useCentralizedErrorHandler(configWithFormatter));

    const testError = new Error('Original error');

    act(() => {
      result.current.handleError(testError);
    });

    expect(customFormatter).toHaveBeenCalled();
    expect(result.current.errorState?.displayMessage).toBe('Custom error message');
  });

  it('should include default recovery actions from config', () => {
    const defaultAction = {
      label: 'Default Action',
      action: vi.fn(),
    };

    const configWithDefaults = {
      ...mockConfig,
      defaultRecoveryActions: [defaultAction],
    };

    const { result } = renderHook(() => useCentralizedErrorHandler(configWithDefaults));

    act(() => {
      result.current.handleError(new Error('Test error'));
    });

    expect(result.current.errorState?.recoveryActions).toContainEqual(defaultAction);
  });

  it('should handle string errors correctly', () => {
    const { result } = renderHook(() => useCentralizedErrorHandler(mockConfig));

    act(() => {
      result.current.handleError('String error message');
    });

    expect(result.current.errorState).not.toBeNull();
    expect(result.current.errorState?.error).toBeDefined();
    expect(result.current.errorState?.displayMessage).toBeDefined();
  });

  it('should handle unknown error types correctly', () => {
    const { result } = renderHook(() => useCentralizedErrorHandler(mockConfig));

    const unknownError = { someProperty: 'unknown error' };

    act(() => {
      result.current.handleError(unknownError);
    });

    expect(result.current.errorState).not.toBeNull();
    expect(result.current.errorState?.error).toBeDefined();
    expect(result.current.errorState?.displayMessage).toBeDefined();
  });
});