/**
 * Tests for UnifiedCacheManager
 * Validates consolidation of 3 separate cache systems
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnifiedCacheManager } from './UnifiedCacheManager';
import { CACHE_CONFIGS } from './utils';

describe('UnifiedCacheManager', () => {
  let cache: UnifiedCacheManager;
  let mockFetcher: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cache = new UnifiedCacheManager();
    mockFetcher = vi.fn();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    });
  });

  afterEach(() => {
    cache.destroy();
    vi.clearAllMocks();
  });

  describe('Basic Cache Operations', () => {
    it('should cache and retrieve data', async () => {
      const testData = { id: 1, name: 'test' };
      mockFetcher.mockResolvedValue(testData);

      const result = await cache.get('test-key', mockFetcher, CACHE_CONFIGS.liveData);
      
      expect(result).toEqual(testData);
      expect(mockFetcher).toHaveBeenCalledTimes(1);
      
      // Second call should use cache
      const result2 = await cache.get('test-key', mockFetcher, CACHE_CONFIGS.liveData);
      expect(result2).toEqual(testData);
      expect(mockFetcher).toHaveBeenCalledTimes(1); // Still only called once
    });

    it('should set and get cached data directly', () => {
      const testData = { id: 1, name: 'test' };
      
      cache.set('direct-key', testData, CACHE_CONFIGS.liveData);
      const result = cache.getCached('direct-key', CACHE_CONFIGS.liveData);
      
      expect(result).toEqual(testData);
    });

    it('should check if cache has valid data', () => {
      const testData = { id: 1, name: 'test' };
      
      expect(cache.has('missing-key', CACHE_CONFIGS.liveData)).toBe(false);
      
      cache.set('existing-key', testData, CACHE_CONFIGS.liveData);
      expect(cache.has('existing-key', CACHE_CONFIGS.liveData)).toBe(true);
    });
  });

  describe('TTL and Expiration', () => {
    it('should respect TTL configuration', async () => {
      const testData = { id: 1, name: 'test' };
      mockFetcher.mockResolvedValue(testData);
      
      const shortTTLConfig = { ...CACHE_CONFIGS.liveData, ttl: 100, maxAge: 200 };
      
      await cache.get('ttl-key', mockFetcher, shortTTLConfig);
      expect(mockFetcher).toHaveBeenCalledTimes(1);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      await cache.get('ttl-key', mockFetcher, shortTTLConfig);
      expect(mockFetcher).toHaveBeenCalledTimes(2); // Should fetch again
    });

    it('should return stale data when staleWhileRevalidate is enabled', async () => {
      const testData = { id: 1, name: 'test' };
      const updatedData = { id: 1, name: 'updated' };
      
      mockFetcher.mockResolvedValueOnce(testData);
      
      const config = { 
        ...CACHE_CONFIGS.liveData, 
        ttl: 100, 
        maxAge: 1000,
        staleWhileRevalidate: true 
      };
      
      // Initial fetch
      await cache.get('stale-key', mockFetcher, config);
      
      // Wait for TTL to expire but not maxAge
      await new Promise(resolve => setTimeout(resolve, 150));
      
      mockFetcher.mockResolvedValueOnce(updatedData);
      
      // Should return stale data immediately and refresh in background
      const result = await cache.get('stale-key', mockFetcher, config);
      expect(result).toEqual(testData); // Stale data returned immediately
    });

    it('should get stale data for offline scenarios', async () => {
      const testData = { id: 1, name: 'test' };
      
      cache.set('stale-key', testData, { ...CACHE_CONFIGS.liveData, ttl: 100 });
      
      // Wait for data to become stale
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const staleResult = cache.getCachedStale('stale-key');
      expect(staleResult).toBeTruthy();
      expect(staleResult!.data).toEqual(testData);
      expect(staleResult!.isStale).toBe(true);
    });
  });

  describe('Request Deduplication', () => {
    it('should deduplicate concurrent requests', async () => {
      const testData = { id: 1, name: 'test' };
      mockFetcher.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(testData), 100))
      );

      // Start multiple concurrent requests
      const promises = [
        cache.get('dedup-key', mockFetcher, CACHE_CONFIGS.liveData),
        cache.get('dedup-key', mockFetcher, CACHE_CONFIGS.liveData),
        cache.get('dedup-key', mockFetcher, CACHE_CONFIGS.liveData),
      ];

      const results = await Promise.all(promises);
      
      // All should return the same data
      results.forEach(result => expect(result).toEqual(testData));
      
      // But fetcher should only be called once
      expect(mockFetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache Management', () => {
    it('should clear specific cache entries', () => {
      cache.set('key1', { data: 1 }, CACHE_CONFIGS.liveData);
      cache.set('key2', { data: 2 }, CACHE_CONFIGS.liveData);
      
      expect(cache.has('key1', CACHE_CONFIGS.liveData)).toBe(true);
      expect(cache.has('key2', CACHE_CONFIGS.liveData)).toBe(true);
      
      cache.clear('key1');
      
      expect(cache.has('key1', CACHE_CONFIGS.liveData)).toBe(false);
      expect(cache.has('key2', CACHE_CONFIGS.liveData)).toBe(true);
    });

    it('should clear cache entries by pattern', () => {
      cache.set('vehicles:1', { data: 1 }, CACHE_CONFIGS.vehicles);
      cache.set('vehicles:2', { data: 2 }, CACHE_CONFIGS.vehicles);
      cache.set('routes:1', { data: 3 }, CACHE_CONFIGS.routes);
      
      cache.clearPattern(/^vehicles:/);
      
      expect(cache.has('vehicles:1', CACHE_CONFIGS.vehicles)).toBe(false);
      expect(cache.has('vehicles:2', CACHE_CONFIGS.vehicles)).toBe(false);
      expect(cache.has('routes:1', CACHE_CONFIGS.routes)).toBe(true);
    });

    it('should clear all cache entries', () => {
      cache.set('key1', { data: 1 }, CACHE_CONFIGS.liveData);
      cache.set('key2', { data: 2 }, CACHE_CONFIGS.liveData);
      
      cache.clearAll();
      
      expect(cache.has('key1', CACHE_CONFIGS.liveData)).toBe(false);
      expect(cache.has('key2', CACHE_CONFIGS.liveData)).toBe(false);
    });

    it('should cleanup expired entries', async () => {
      const expiredConfig = { ...CACHE_CONFIGS.liveData, ttl: 50, maxAge: 100 };
      
      cache.set('expired-key', { data: 1 }, expiredConfig);
      cache.set('valid-key', { data: 2 }, CACHE_CONFIGS.routes); // Long TTL
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const cleaned = cache.cleanup();
      expect(cleaned).toBe(1);
      expect(cache.has('expired-key', expiredConfig)).toBe(false);
      expect(cache.has('valid-key', CACHE_CONFIGS.routes)).toBe(true);
    });
  });

  describe('Event System', () => {
    it('should emit cache events', () => {
      const listener = vi.fn();
      const unsubscribe = cache.subscribe('event-key', listener);
      
      cache.set('event-key', { data: 1 }, CACHE_CONFIGS.liveData);
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'updated',
          key: 'event-key',
          data: { data: 1 },
        })
      );
      
      unsubscribe();
    });

    it('should support pattern-based event subscriptions', () => {
      const listener = vi.fn();
      const unsubscribe = cache.subscribe('vehicles:*', listener);
      
      cache.set('vehicles:1', { data: 1 }, CACHE_CONFIGS.vehicles);
      cache.set('routes:1', { data: 2 }, CACHE_CONFIGS.routes);
      
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'vehicles:1',
        })
      );
      
      unsubscribe();
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide comprehensive cache statistics', () => {
      cache.set('vehicles:1', { data: 1 }, CACHE_CONFIGS.vehicles);
      cache.set('routes:1', { data: 2 }, CACHE_CONFIGS.routes);
      
      const stats = cache.getStats();
      
      expect(stats.totalEntries).toBe(2);
      expect(stats.entriesByType.vehicles).toBe(1);
      expect(stats.entriesByType.routes).toBe(1);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.missRate).toBeGreaterThanOrEqual(0);
    });

    it('should track hit and miss rates', async () => {
      const testData = { id: 1, name: 'test' };
      mockFetcher.mockResolvedValue(testData);
      
      // Miss
      await cache.get('stats-key', mockFetcher, CACHE_CONFIGS.liveData);
      
      // Hit
      await cache.get('stats-key', mockFetcher, CACHE_CONFIGS.liveData);
      
      const stats = cache.getStats();
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.missRate).toBeGreaterThan(0);
    });
  });

  describe('Memory Management', () => {
    it('should enforce entry limits with LRU eviction', () => {
      const limitedConfig = { ...CACHE_CONFIGS.liveData, maxEntries: 2 };
      
      cache.set('key1', { data: 1 }, limitedConfig);
      cache.set('key2', { data: 2 }, limitedConfig);
      cache.set('key3', { data: 3 }, limitedConfig); // Should evict key1
      
      expect(cache.has('key1', limitedConfig)).toBe(false);
      expect(cache.has('key2', limitedConfig)).toBe(true);
      expect(cache.has('key3', limitedConfig)).toBe(true);
    });

    it('should handle large data gracefully', () => {
      const largeData = { data: 'x'.repeat(1000000) }; // 1MB string
      const sizeConfig = { ...CACHE_CONFIGS.liveData, maxSize: 500000 }; // 500KB limit
      
      // Should not cache data that's too large
      cache.set('large-key', largeData, sizeConfig);
      expect(cache.has('large-key', sizeConfig)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should return stale data on fetch error', async () => {
      const testData = { id: 1, name: 'test' };
      
      // First successful fetch
      mockFetcher.mockResolvedValueOnce(testData);
      await cache.get('error-key', mockFetcher, CACHE_CONFIGS.liveData);
      
      // Second fetch fails
      mockFetcher.mockRejectedValueOnce(new Error('Network error'));
      
      // Should return stale data
      const result = await cache.get('error-key', mockFetcher, CACHE_CONFIGS.liveData, true);
      expect(result).toEqual(testData);
    });

    it('should throw error when no stale data available', async () => {
      mockFetcher.mockRejectedValue(new Error('Network error'));
      
      await expect(
        cache.get('no-stale-key', mockFetcher, CACHE_CONFIGS.liveData)
      ).rejects.toThrow('Network error');
    });

    it('should handle offline scenarios', async () => {
      const testData = { id: 1, name: 'test' };
      
      // Cache some data while online
      mockFetcher.mockResolvedValue(testData);
      await cache.get('offline-key', mockFetcher, CACHE_CONFIGS.liveData);
      
      // Go offline
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      // Should return cached data even if expired
      const result = await cache.get('offline-key', mockFetcher, CACHE_CONFIGS.liveData, true);
      expect(result).toEqual(testData);
    });
  });

  describe('Force Refresh', () => {
    it('should bypass cache on force refresh', async () => {
      const testData = { id: 1, name: 'test' };
      const updatedData = { id: 1, name: 'updated' };
      
      mockFetcher.mockResolvedValueOnce(testData);
      await cache.get('force-key', mockFetcher, CACHE_CONFIGS.liveData);
      
      mockFetcher.mockResolvedValueOnce(updatedData);
      const result = await cache.forceRefresh('force-key', mockFetcher, CACHE_CONFIGS.liveData);
      
      expect(result).toEqual(updatedData);
      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });
  });
});