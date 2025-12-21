import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataCache } from './cacheUtils';

describe('DataCache', () => {
  let cache: DataCache<string>;

  beforeEach(() => {
    cache = new DataCache<string>({ ttl: 1000, maxAge: 5000 }); // 1s TTL, 5s max age
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should store and retrieve fresh data', () => {
    cache.set('key1', 'value1');
    
    expect(cache.get('key1')).toBe('value1');
    expect(cache.has('key1')).toBe(true);
  });

  it('should return null for non-existent keys', () => {
    expect(cache.get('nonexistent')).toBeNull();
    expect(cache.has('nonexistent')).toBe(false);
  });

  it('should return stale data within max age', () => {
    cache.set('key1', 'value1');
    
    // Advance time past TTL but within max age
    vi.advanceTimersByTime(2000); // 2 seconds
    
    expect(cache.get('key1')).toBe('value1'); // Should still return stale data
    
    const staleResult = cache.getStale('key1');
    expect(staleResult?.data).toBe('value1');
    expect(staleResult?.isStale).toBe(true);
    expect(staleResult?.age).toBe(2000);
  });

  it('should remove data after max age', () => {
    cache.set('key1', 'value1');
    
    // Advance time past max age
    vi.advanceTimersByTime(6000); // 6 seconds
    
    expect(cache.get('key1')).toBeNull();
    expect(cache.getStale('key1')).toBeNull();
  });

  it('should clear all data', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    expect(cache.size()).toBe(2);
    
    cache.clear();
    
    expect(cache.size()).toBe(0);
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
  });

  it('should cleanup expired entries', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    // Advance time past max age for cleanup
    vi.advanceTimersByTime(6000);
    
    expect(cache.size()).toBe(2); // Still in cache until cleanup
    
    cache.cleanup();
    
    expect(cache.size()).toBe(0); // Cleaned up
  });
});