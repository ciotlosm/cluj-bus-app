import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { CacheManager, globalCache } from './cacheManager';

/**
 * **Feature: hook-refactoring, Property 13: Memory Cleanup**
 * **Validates: Requirements 4.4**
 * 
 * Property: For any component unmounting that uses the hooks, all subscriptions, 
 * timers, and cached references should be properly cleaned up
 */

describe('Cache Manager Memory Cleanup Property Tests', () => {
  let testCache: CacheManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    testCache = new CacheManager({ maxSize: 10, maxAge: 1000 });
    // Ensure clean state
    testCache.clear();
    // Stop any automatic cleanup to avoid interference
    testCache.destroy();
    testCache = new CacheManager({ maxSize: 10, maxAge: 1000 });
  });

  afterEach(() => {
    testCache.destroy();
    vi.useRealTimers();
  });

  describe('Property 13: Memory Cleanup', () => {
    it('should properly cleanup expired entries', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 20 }),
              data: fc.oneof(fc.string(), fc.integer(), fc.boolean()),
              maxAge: fc.integer({ min: 100, max: 2000 })
            }),
            { minLength: 1, maxLength: 15 }
          ).map(entries => 
            // Ensure unique keys by adding index
            entries.map((entry, index) => ({
              ...entry,
              key: `${entry.key}-${index}`
            }))
          ),
          fc.integer({ min: 500, max: 3000 }), // time to advance
          (entries, timeAdvance) => {
            // Ensure cache is empty at start
            testCache.clear();
            expect(testCache.size()).toBe(0);

            // Add entries to cache (keys are already unique from generator)
            entries.forEach(({ key, data, maxAge }) => {
              testCache.set(key, data, maxAge);
            });

            const initialSize = testCache.size();
            expect(initialSize).toBe(Math.min(entries.length, 10)); // Respects max size

            // Advance time
            vi.advanceTimersByTime(timeAdvance);

            // Perform cleanup
            testCache.cleanup();

            const finalSize = testCache.size();

            // Basic sanity checks for cleanup behavior
            expect(finalSize).toBeGreaterThanOrEqual(0);
            expect(finalSize).toBeLessThanOrEqual(initialSize);
            expect(finalSize).toBeLessThanOrEqual(10); // Cache max size

            // Verify that all remaining entries are still valid
            const stats = testCache.getStats();
            expect(stats.expiredEntries).toBe(0);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should enforce cache size limits and evict oldest entries', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 20 }),
              data: fc.string()
            }),
            { minLength: 15, maxLength: 30 } // More entries than cache size
          ),
          (entries) => {
            const maxSize = 10;
            const cache = new CacheManager({ maxSize, maxAge: 10000 });

            // Add entries sequentially
            entries.forEach(({ key, data }, index) => {
              cache.set(`${key}-${index}`, data); // Ensure unique keys
            });

            // Cache should never exceed max size
            expect(cache.size()).toBeLessThanOrEqual(maxSize);

            // If we added more entries than max size, verify oldest were evicted
            if (entries.length > maxSize) {
              expect(cache.size()).toBe(maxSize);

              // The last maxSize entries should be present
              const lastEntries = entries.slice(-maxSize);
              lastEntries.forEach(({ key, data }, index) => {
                const actualIndex = entries.length - maxSize + index;
                const cachedData = cache.get(`${key}-${actualIndex}`);
                expect(cachedData).toBe(data);
              });

              // Earlier entries should be evicted
              const firstEntries = entries.slice(0, entries.length - maxSize);
              firstEntries.forEach(({ key }, index) => {
                const cachedData = cache.get(`${key}-${index}`);
                expect(cachedData).toBeNull();
              });
            }

            cache.destroy();
            return true;
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should perform aggressive cleanup under memory pressure', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 10 }),
              data: fc.string()
            }),
            { minLength: 20, maxLength: 40 }
          ),
          (entries) => {
            const maxSize = 20;
            const cache = new CacheManager({ maxSize, maxAge: 10000 });

            // Fill cache to capacity
            entries.slice(0, maxSize).forEach(({ key, data }, index) => {
              cache.set(`${key}-${index}`, data);
            });

            expect(cache.size()).toBe(maxSize);

            // Trigger aggressive cleanup (simulates memory pressure)
            cache.forceCleanup();

            // After aggressive cleanup, cache should be significantly smaller
            const sizeAfterCleanup = cache.size();
            expect(sizeAfterCleanup).toBeLessThan(maxSize);

            // Should have removed approximately 25% of entries
            const expectedMaxSize = Math.floor(maxSize * 0.75);
            expect(sizeAfterCleanup).toBeLessThanOrEqual(expectedMaxSize);

            cache.destroy();
            return true;
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should properly cleanup all resources on destroy', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 10 }),
              data: fc.string()
            }),
            { minLength: 5, maxLength: 15 }
          ),
          (entries) => {
            const cache = new CacheManager({ maxSize: 20, maxAge: 1000 });

            // Add entries
            entries.forEach(({ key, data }, index) => {
              cache.set(`${key}-${index}`, data);
            });

            const sizeBeforeDestroy = cache.size();
            expect(sizeBeforeDestroy).toBeGreaterThan(0);

            // Destroy cache
            cache.destroy();

            // After destroy, cache should be empty
            expect(cache.size()).toBe(0);

            // Should not be able to retrieve any data
            entries.forEach(({ key }, index) => {
              expect(cache.get(`${key}-${index}`)).toBeNull();
            });

            return true;
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle concurrent operations safely during cleanup', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 10 }),
              data: fc.string(),
              operation: fc.constantFrom('set', 'get', 'invalidate', 'cleanup')
            }),
            { minLength: 10, maxLength: 30 }
          ),
          (operations) => {
            const cache = new CacheManager({ maxSize: 15, maxAge: 1000 });

            // Perform operations concurrently
            operations.forEach(({ key, data, operation }, index) => {
              const uniqueKey = `${key}-${index}`;
              
              try {
                switch (operation) {
                  case 'set':
                    cache.set(uniqueKey, data);
                    break;
                  case 'get':
                    cache.get(uniqueKey);
                    break;
                  case 'invalidate':
                    cache.invalidate(uniqueKey);
                    break;
                  case 'cleanup':
                    cache.cleanup();
                    break;
                }
              } catch (error) {
                // Operations should not throw errors during cleanup
                throw new Error(`Operation ${operation} threw error: ${error}`);
              }
            });

            // Cache should remain in valid state
            expect(cache.size()).toBeGreaterThanOrEqual(0);
            expect(cache.size()).toBeLessThanOrEqual(15);

            const stats = cache.getStats();
            expect(stats.totalEntries).toBe(cache.size());

            cache.destroy();
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should maintain memory statistics accuracy during cleanup operations', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 10 }),
              data: fc.string(),
              maxAge: fc.integer({ min: 500, max: 2000 })
            }),
            { minLength: 5, maxLength: 20 }
          ),
          fc.integer({ min: 0, max: 3000 }), // time advance
          (entries, timeAdvance) => {
            const cache = new CacheManager({ maxSize: 25, maxAge: 1000 });

            // Add entries
            entries.forEach(({ key, data, maxAge }, index) => {
              cache.set(`${key}-${index}`, data, maxAge);
            });

            // Get initial stats
            const initialStats = cache.getStats();
            expect(initialStats.totalEntries).toBe(cache.size());

            // Advance time to expire some entries
            vi.advanceTimersByTime(timeAdvance);

            // Get stats before cleanup
            const statsBeforeCleanup = cache.getStats();
            
            // Perform cleanup
            cache.cleanup();

            // Get stats after cleanup
            const statsAfterCleanup = cache.getStats();

            // Verify stats consistency
            expect(statsAfterCleanup.totalEntries).toBe(cache.size());
            expect(statsAfterCleanup.expiredEntries).toBe(0); // Should be 0 after cleanup
            expect(statsAfterCleanup.validEntries).toBe(statsAfterCleanup.totalEntries);

            // Memory stats should be accurate
            const memoryStats = cache.getMemoryStats();
            expect(memoryStats.totalEntries).toBe(cache.size());
            expect(memoryStats.memoryPressure).toBeGreaterThanOrEqual(0);
            expect(memoryStats.memoryPressure).toBeLessThanOrEqual(1);

            cache.destroy();
            return true;
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Global Cache Memory Management', () => {
    it('should handle global cache cleanup without affecting other operations', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 5, maxLength: 15 }),
          fc.array(fc.string(), { minLength: 5, maxLength: 15 }),
          (keys, values) => {
            const minLength = Math.min(keys.length, values.length);
            const testKeys = keys.slice(0, minLength);
            const testValues = values.slice(0, minLength);

            // Store original global cache state
            const originalSize = globalCache.size();

            // Add test data to global cache
            testKeys.forEach((key, index) => {
              globalCache.set(`test-${key}`, testValues[index], 1000);
            });

            const sizeAfterAdding = globalCache.size();
            expect(sizeAfterAdding).toBeGreaterThanOrEqual(originalSize);

            // Force cleanup
            globalCache.forceCleanup();

            // Global cache should still be functional
            const sizeAfterCleanup = globalCache.size();
            expect(sizeAfterCleanup).toBeGreaterThanOrEqual(0);

            // Should be able to add new data
            globalCache.set('test-after-cleanup', 'test-value', 1000);
            expect(globalCache.get('test-after-cleanup')).toBe('test-value');

            // Cleanup test data
            testKeys.forEach(key => {
              globalCache.invalidate(`test-${key}`);
            });
            globalCache.invalidate('test-after-cleanup');

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});