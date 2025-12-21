import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from './debounce';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should delay function execution', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 1000);

    debouncedFn('test');
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(mockFn).toHaveBeenCalledWith('test');
  });

  it('should cancel previous calls when called multiple times', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 1000);

    debouncedFn('first');
    debouncedFn('second');
    debouncedFn('third');

    vi.advanceTimersByTime(1000);
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('third');
  });

  it('should allow canceling pending execution', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 1000);

    debouncedFn('test');
    debouncedFn.cancel();

    vi.advanceTimersByTime(1000);
    expect(mockFn).not.toHaveBeenCalled();
  });

  it('should allow flushing pending execution immediately', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 1000);

    debouncedFn('test');
    debouncedFn.flush();

    expect(mockFn).toHaveBeenCalledWith('test');
    
    // Should not call again after timeout
    vi.advanceTimersByTime(1000);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple arguments correctly', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 1000);

    debouncedFn('arg1', 'arg2', 'arg3');
    vi.advanceTimersByTime(1000);

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
  });

  it('should work with different delay values', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 500);

    debouncedFn('test');
    vi.advanceTimersByTime(400);
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledWith('test');
  });
});