import { describe, it, expect, vi } from 'vitest';
import { withRetry, isRetryableError, RetryError } from './retryUtils';

describe('Retry Utils', () => {
  it('should succeed on first attempt when operation succeeds', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    
    const result = await withRetry(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValue('success');
    
    const result = await withRetry(operation, { maxRetries: 3, baseDelay: 1 });
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should throw RetryError after max retries exceeded', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Persistent failure'));
    
    await expect(
      withRetry(operation, { maxRetries: 2, baseDelay: 1 })
    ).rejects.toThrow(RetryError);
    
    expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should identify retryable errors correctly', () => {
    expect(isRetryableError(new Error('NetworkError'))).toBe(false); // name check
    expect(isRetryableError(Object.assign(new Error('test'), { name: 'NetworkError' }))).toBe(true);
    expect(isRetryableError(new Error('fetch failed'))).toBe(true);
    expect(isRetryableError(new Error('timeout occurred'))).toBe(true);
    expect(isRetryableError(new Error('status 500'))).toBe(true);
    expect(isRetryableError(new Error('status 404'))).toBe(false);
    expect(isRetryableError(new Error('validation error'))).toBe(false);
  });
});