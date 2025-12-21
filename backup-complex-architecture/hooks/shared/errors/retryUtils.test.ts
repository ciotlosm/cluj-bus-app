import { describe, it, expect, vi } from 'vitest';
import { withRetry, RetryManager } from './retryUtils';
import { ErrorType } from './types';

describe('retryUtils', () => {
  describe('withRetry', () => {
    it('should succeed on first try when function succeeds', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      
      const result = await withRetry(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry network errors up to max retries', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue('success');
      
      const result = await withRetry(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should not retry validation errors', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Invalid data format'));
      
      await expect(withRetry(mockFn)).rejects.toThrow();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should respect custom max retries', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Network timeout'));
      
      await expect(withRetry(mockFn, {}, 1)).rejects.toThrow();
      expect(mockFn).toHaveBeenCalledTimes(2); // initial + 1 retry
    }, 10000);
  });

  describe('RetryManager', () => {
    it('should track retry count correctly', async () => {
      const manager = new RetryManager();
      const mockError = {
        type: ErrorType.NETWORK,
        retryable: true,
        message: 'test error'
      } as any;
      
      expect(manager.canRetry(mockError)).toBe(true);
      expect(manager.getRetryCount()).toBe(0);
      
      await manager.executeRetry(() => Promise.resolve('test'));
      expect(manager.getRetryCount()).toBe(1);
    });

    it('should reset state correctly', () => {
      const manager = new RetryManager();
      const mockError = {
        type: ErrorType.NETWORK,
        retryable: true,
        message: 'test error'
      } as any;
      
      manager.canRetry(mockError);
      manager.reset();
      
      expect(manager.getRetryCount()).toBe(0);
      expect(manager.getLastError()).toBe(null);
    });
  });
});