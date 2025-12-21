import { describe, it, expect } from 'vitest';
import { ErrorHandler } from './ErrorHandler';
import { ErrorType } from './types';

describe('ErrorHandler', () => {
  describe('createError', () => {
    it('should create a standardized error with all required fields', () => {
      const error = ErrorHandler.createError(
        ErrorType.NETWORK,
        'Connection failed',
        { url: 'https://api.example.com' }
      );

      expect(error.type).toBe(ErrorType.NETWORK);
      expect(error.message).toBe('Connection failed');
      expect(error.userMessage).toBe('Unable to connect to the transit service. Please check your internet connection.');
      expect(error.retryable).toBe(true);
      expect(error.context).toEqual({ url: 'https://api.example.com' });
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.errorId).toMatch(/^network-\d+-[a-z0-9]+$/);
    });

    it('should use default message when none provided', () => {
      const error = ErrorHandler.createError(ErrorType.AUTHENTICATION, '');
      expect(error.message).toBe('Invalid API key or authentication failed');
    });
  });

  describe('fromError', () => {
    it('should classify network errors correctly', () => {
      const originalError = new Error('Network timeout occurred');
      const error = ErrorHandler.fromError(originalError);

      expect(error.type).toBe(ErrorType.NETWORK);
      expect(error.originalError).toBe(originalError);
    });

    it('should classify authentication errors correctly', () => {
      const originalError = new Error('401 Unauthorized access');
      const error = ErrorHandler.fromError(originalError);

      expect(error.type).toBe(ErrorType.AUTHENTICATION);
    });

    it('should default to DATA_FETCH for unknown errors', () => {
      const originalError = new Error('Something went wrong');
      const error = ErrorHandler.fromError(originalError);

      expect(error.type).toBe(ErrorType.DATA_FETCH);
    });
  });

  describe('shouldRetry', () => {
    it('should allow retries for network errors', () => {
      const error = ErrorHandler.createError(ErrorType.NETWORK, 'Connection failed');
      expect(ErrorHandler.shouldRetry(error, 0)).toBe(true);
      expect(ErrorHandler.shouldRetry(error, 2)).toBe(true);
      expect(ErrorHandler.shouldRetry(error, 3)).toBe(false);
    });

    it('should not allow retries for validation errors', () => {
      const error = ErrorHandler.createError(ErrorType.VALIDATION, 'Invalid data');
      expect(ErrorHandler.shouldRetry(error, 0)).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should calculate exponential backoff for network errors', () => {
      const error = ErrorHandler.createError(ErrorType.NETWORK, 'Connection failed');
      
      expect(ErrorHandler.getRetryDelay(error, 0)).toBe(1000);
      expect(ErrorHandler.getRetryDelay(error, 1)).toBe(2000);
      expect(ErrorHandler.getRetryDelay(error, 2)).toBe(4000);
      expect(ErrorHandler.getRetryDelay(error, 3)).toBe(8000);
      expect(ErrorHandler.getRetryDelay(error, 4)).toBe(8000); // capped at maxDelay
    });

    it('should return 0 delay for non-retryable errors', () => {
      const error = ErrorHandler.createError(ErrorType.AUTHENTICATION, 'Auth failed');
      expect(ErrorHandler.getRetryDelay(error, 0)).toBe(0);
    });
  });

  describe('getSeverity', () => {
    it('should return critical severity for authentication errors', () => {
      const error = ErrorHandler.createError(ErrorType.AUTHENTICATION, 'Auth failed');
      expect(ErrorHandler.getSeverity(error)).toBe('critical');
    });

    it('should return low severity for cache errors', () => {
      const error = ErrorHandler.createError(ErrorType.CACHE, 'Cache miss');
      expect(ErrorHandler.getSeverity(error)).toBe('low');
    });
  });

  describe('createErrorReport', () => {
    it('should create a comprehensive error report', () => {
      const originalError = new Error('Original error');
      const error = ErrorHandler.createError(
        ErrorType.NETWORK,
        'Network failed',
        { retryCount: 1 },
        originalError
      );

      const report = ErrorHandler.createErrorReport(error);

      expect(report).toMatchObject({
        errorId: error.errorId,
        type: ErrorType.NETWORK,
        message: 'Network failed',
        severity: 'medium',
        retryable: true,
        context: { retryCount: 1 },
        originalError: {
          name: 'Error',
          message: 'Original error',
          stack: expect.any(String)
        }
      });
    });
  });
});