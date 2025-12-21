/**
 * Unified Cache Manager
 * 
 * Consolidates all cache functionality from:
 * - src/services/cacheManager.ts (TTL, event-driven updates, localStorage persistence)
 * - src/hooks/shared/cacheManager.ts (request deduplication, memory pressure detection)
 * - src/stores/shared/cacheManager.ts (LRU eviction, advanced statistics)
 */

import type { 
  CacheConfig, 
  CacheEntry, 
  CacheStats, 
  CacheEvent, 
  CacheEventListener, 
  RequestDeduplicationEntry,
  MemoryPressureConfig 
} from './types';
import { 
  estimateDataSize, 
  isDataTooLarge, 
  getCacheKeyType, 
  DEFAULT_MEMORY_PRESSURE_CONFIG 
} from './utils';

export class UnifiedCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private listeners = new Map<string, Set<CacheEventListener<any>>>();
  private pendingRequests = new Map<string, RequestDeduplicationEntry<any>>();
  private readonly STORAGE_KEY = 'unified-cache';
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private memoryPressureConfig: MemoryPressureConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    requests: 0,
  };

  constructor(memoryConfig?: Partial<MemoryPressureConfig>) {
    this.memoryPressureConfig = { ...DEFAULT_MEMORY_PRESSURE_CONFIG, ...memoryConfig };
    this.loadFromStorage();
    this.startCleanupInterval();
    this.setupLifecycleHandlers();
  }

  /**
   * Get data from cache or fetch if needed
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: CacheConfig,
    forceRefresh = false
  ): Promise<T> {
    this.stats.requests++;
    const cached = this.cache.get(key);
    const now = Date.now();

    // Check if we have valid cached data (unless force refresh)
    if (!forceRefresh && cached && this.isValid(cached, now, config)) {
      this.updateAccessStats(cached, now);
      this.stats.hits++;
      this.emitEvent({ type: 'hit', key, data: cached.data, timestamp: now });
      
      // If stale but within max age, return cached data and refresh in background
      if (config.staleWhileRevalidate && this.isStale(cached, now, config)) {
        this.refreshInBackground(key, fetcher, config);
      }
      
      return cached.data;
    }

    this.stats.misses++;
    this.emitEvent({ type: 'miss', key, timestamp: now });

    // Check for pending request (request deduplication)
    const pending = this.pendingRequests.get(key);
    if (pending && (now - pending.timestamp) < 30000) { // 30 second timeout for pending requests
      return pending.promise;
    }

    // If we have stale data and are offline, return it
    if (cached && !navigator.onLine) {
      console.info(`Returning stale data (offline): ${key}`, { 
        age: now - cached.timestamp 
      });
      return cached.data;
    }

    // If we have stale data and stale-while-revalidate is enabled
    if (cached && config.staleWhileRevalidate && !forceRefresh) {
      // Return stale data immediately
      const staleData = cached.data;
      
      // Fetch fresh data in background
      this.refreshInBackground(key, fetcher, config);
      
      return staleData;
    }

    // Fetch fresh data with request deduplication
    return this.fetchAndCache(key, fetcher, config);
  }

  /**
   * Set data in cache directly
   */
  set<T>(key: string, data: T, config: CacheConfig): void {
    // Check if data is too large
    if (isDataTooLarge(data, config.maxSize)) {
      console.warn(`Data too large for cache: ${key}`);
      return;
    }

    const now = Date.now();
    const size = estimateDataSize(data);
    const existingEntry = this.cache.get(key);
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      createdAt: existingEntry?.createdAt || now,
      updatedAt: now,
      key,
      config,
      size,
      accessCount: existingEntry?.accessCount || 1,
      lastAccessed: now,
      source: 'network',
    };

    this.cache.set(key, entry);
    this.enforceLimits(config);
    this.saveToStorage();
    
    this.emitEvent({ 
      type: 'updated', 
      key, 
      data, 
      timestamp: now 
    });
  }

  /**
   * Force refresh data regardless of cache state
   */
  async forceRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: CacheConfig
  ): Promise<T> {
    console.info(`Force refreshing cache: ${key}`);
    return this.fetchAndCache(key, fetcher, config);
  }

  /**
   * Get cached data immediately without triggering fetch (synchronous)
   */
  getCached<T>(key: string, config: CacheConfig): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    
    if (this.isValid(cached, now, config)) {
      this.updateAccessStats(cached, now);
      return cached.data;
    }
    
    return null;
  }

  /**
   * Get cached data even if stale (for offline scenarios)
   */
  getCachedStale<T>(key: string): { data: T; age: number; isStale: boolean } | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    const age = now - cached.timestamp;
    const isStale = age > cached.config.ttl;
    
    this.updateAccessStats(cached, now);
    
    return {
      data: cached.data,
      age,
      isStale
    };
  }

  /**
   * Check if cache has valid data for key
   */
  has(key: string, config: CacheConfig): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    const now = Date.now();
    return this.isValid(cached, now, config);
  }

  /**
   * Clear specific cache entry
   */
  clear(key: string): void {
    const existed = this.cache.delete(key);
    this.pendingRequests.delete(key);
    
    if (existed) {
      this.saveToStorage();
      this.emitEvent({
        type: 'cleared',
        key,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Clear cache entries matching pattern
   */
  clearPattern(pattern: RegExp): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.pendingRequests.delete(key);
      this.emitEvent({
        type: 'cleared',
        key,
        timestamp: now,
      });
    });
    
    if (keysToDelete.length > 0) {
      this.saveToStorage();
    }
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    const keys = Array.from(this.cache.keys());
    const now = Date.now();
    
    this.cache.clear();
    this.pendingRequests.clear();
    this.saveToStorage();
    
    // Notify all listeners
    keys.forEach(key => {
      this.emitEvent({
        type: 'cleared',
        key,
        timestamp: now,
      });
    });

    // Reset stats
    this.stats = { hits: 0, misses: 0, evictions: 0, requests: 0 };
  }

  /**
   * Subscribe to cache events
   */
  subscribe<T>(
    keyOrPattern: string, 
    listener: CacheEventListener<T>
  ): () => void {
    if (!this.listeners.has(keyOrPattern)) {
      this.listeners.set(keyOrPattern, new Set());
    }
    
    this.listeners.get(keyOrPattern)!.add(listener);
    
    // Return unsubscribe function
    return () => {
      const keyListeners = this.listeners.get(keyOrPattern);
      if (keyListeners) {
        keyListeners.delete(listener);
        if (keyListeners.size === 0) {
          this.listeners.delete(keyOrPattern);
        }
      }
    };
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): CacheStats {
    const now = Date.now();
    let validEntries = 0;
    let staleEntries = 0;
    let expiredEntries = 0;
    let totalSize = 0;
    let lastCacheUpdate = 0;
    const entriesByType: Record<string, number> = {};
    const entriesWithTimestamps: Record<string, any> = {};
    let oldestEntry: { key: string; age: number } | undefined;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      const type = getCacheKeyType(key);
      
      entriesByType[type] = (entriesByType[type] || 0) + 1;
      totalSize += entry.size;
      
      entriesWithTimestamps[key] = {
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        age,
        accessCount: entry.accessCount,
      };
      
      if (entry.updatedAt > lastCacheUpdate) {
        lastCacheUpdate = entry.updatedAt;
      }
      
      if (!oldestEntry || age > oldestEntry.age) {
        oldestEntry = { key, age };
      }
      
      if (this.isValid(entry, now, entry.config)) {
        validEntries++;
      } else if (age <= entry.config.maxAge) {
        staleEntries++;
      } else {
        expiredEntries++;
      }
    }

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    const missRate = totalRequests > 0 ? this.stats.misses / totalRequests : 0;
    const memoryPressure = this.cache.size > 0 ? totalSize / (this.cache.size * 1024 * 1024) : 0;

    return {
      totalEntries: this.cache.size,
      validEntries,
      staleEntries,
      expiredEntries,
      totalSize,
      entriesByType,
      entriesWithTimestamps,
      lastCacheUpdate,
      oldestEntry,
      hitRate,
      missRate,
      memoryPressure,
      isUnderPressure: memoryPressure > this.memoryPressureConfig.threshold,
      storageInfo: this.getStorageInfo(),
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > entry.config.maxAge) {
        this.cache.delete(key);
        this.pendingRequests.delete(key);
        this.emitEvent({
          type: 'expired',
          key,
          timestamp: now,
        });
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.saveToStorage();
    }

    return cleaned;
  }

  /**
   * Destroy cache manager and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
    this.listeners.clear();
    this.pendingRequests.clear();
  }

  // Private methods

  private async fetchAndCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: CacheConfig
  ): Promise<T> {
    try {
      // Create and store the promise for request deduplication
      const promise = fetcher();
      this.pendingRequests.set(key, {
        promise,
        timestamp: Date.now(),
      });

      const data = await promise;
      this.set(key, data, config);
      
      return data;
    } catch (error) {
      // Try to return stale data if available
      const cached = this.cache.get(key);
      if (cached) {
        console.info(`Returning stale data due to fetch error: ${key}`, error);
        return cached.data;
      }
      
      throw error;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  private async refreshInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: CacheConfig
  ): Promise<void> {
    try {
      await this.fetchAndCache(key, fetcher, config);
    } catch (error) {
      console.warn(`Background refresh failed for ${key}:`, error);
    }
  }

  private isValid(entry: CacheEntry<any>, now: number, config: CacheConfig): boolean {
    const age = now - entry.timestamp;
    return age < config.maxAge;
  }

  private isStale(entry: CacheEntry<any>, now: number, config: CacheConfig): boolean {
    const age = now - entry.timestamp;
    return age > config.ttl;
  }

  private updateAccessStats(entry: CacheEntry<any>, now: number): void {
    entry.accessCount++;
    entry.lastAccessed = now;
  }

  private emitEvent<T>(event: CacheEvent<T>): void {
    // Emit to specific key subscribers
    const keySubscribers = this.listeners.get(event.key);
    if (keySubscribers) {
      keySubscribers.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Cache event listener error for ${event.key}:`, error);
        }
      });
    }

    // Emit to pattern subscribers (keys ending with '*')
    this.listeners.forEach((subscribers, pattern) => {
      if (pattern.endsWith('*')) {
        const prefix = pattern.slice(0, -1);
        if (event.key.startsWith(prefix)) {
          subscribers.forEach(listener => {
            try {
              listener(event);
            } catch (error) {
              console.error(`Cache event listener error for pattern ${pattern}:`, error);
            }
          });
        }
      }
    });
  }

  private enforceLimits(config: CacheConfig): void {
    // Enforce max entries (LRU eviction)
    if (config.maxEntries && this.cache.size > config.maxEntries) {
      this.performLRUEviction(config.maxEntries);
    }

    // Check memory pressure
    const stats = this.getStats();
    if (stats.isUnderPressure) {
      this.performMemoryPressureCleanup();
    }
  }

  private performLRUEviction(maxEntries: number): void {
    const entries = Array.from(this.cache.entries());
    entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    const toRemove = entries.slice(0, this.cache.size - maxEntries);
    const now = Date.now();
    
    toRemove.forEach(([key]) => {
      this.cache.delete(key);
      this.pendingRequests.delete(key);
      this.stats.evictions++;
      this.emitEvent({ type: 'evicted', key, timestamp: now });
    });
  }

  private performMemoryPressureCleanup(): void {
    const entries = Array.from(this.cache.entries());
    const now = Date.now();
    
    // Sort by size (largest first) and age (oldest first)
    entries.sort(([, a], [, b]) => {
      const sizeWeight = b.size - a.size;
      const ageWeight = (now - a.lastAccessed) - (now - b.lastAccessed);
      return sizeWeight * 0.7 + ageWeight * 0.3; // Prioritize size over age
    });
    
    const toRemove = Math.floor(entries.length * this.memoryPressureConfig.aggressiveCleanupRatio);
    
    for (let i = 0; i < toRemove; i++) {
      const [key] = entries[i];
      this.cache.delete(key);
      this.pendingRequests.delete(key);
      this.stats.evictions++;
      this.emitEvent({ type: 'evicted', key, timestamp: now });
    }
  }

  private getStorageInfo() {
    try {
      const entriesWithSizes = Array.from(this.cache.entries()).map(([key, entry]) => {
        const sizeInMB = entry.size / (1024 * 1024);
        return { key, sizeMB: Number(sizeInMB.toFixed(2)) };
      });
      
      const totalSizeMB = entriesWithSizes.reduce((sum, entry) => sum + entry.sizeMB, 0);
      
      const largestEntries = entriesWithSizes
        .sort((a, b) => b.sizeMB - a.sizeMB)
        .slice(0, 5);
      
      return {
        estimatedSizeMB: Number(totalSizeMB.toFixed(2)),
        isNearLimit: totalSizeMB > 2, // Warning at 2MB
        canSaveToStorage: totalSizeMB < 3, // Block at 3MB
        largestEntries,
      };
    } catch (error) {
      console.warn('Failed to calculate storage size:', error);
      return {
        estimatedSizeMB: 0,
        isNearLimit: false,
        canSaveToStorage: true,
      };
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const storageInfo = this.getStorageInfo();
      
      if (!storageInfo.canSaveToStorage) {
        console.warn('Cache too large for storage, performing cleanup');
        this.performMemoryPressureCleanup();
      }
      
      const serialized = Array.from(this.cache.entries()).map(([key, entry]) => [
        key,
        {
          ...entry,
          data: JSON.parse(JSON.stringify(entry.data)),
        },
      ]);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(serialized));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('Storage quota exceeded, performing emergency cleanup');
        this.performEmergencyCleanup();
      } else {
        console.warn('Failed to save cache to storage:', error);
      }
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.cache = new Map(parsed);
        
        // Clean up any expired entries from storage
        this.cleanup();
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
      this.cache = new Map();
    }
  }

  private performEmergencyCleanup(): void {
    const entries = Array.from(this.cache.entries());
    const keepRatio = this.memoryPressureConfig.emergencyCleanupRatio;
    const toKeep = Math.floor(entries.length * keepRatio);
    
    // Sort by access count and recency (keep most accessed and recent)
    entries.sort(([, a], [, b]) => {
      const accessWeight = b.accessCount - a.accessCount;
      const recencyWeight = b.lastAccessed - a.lastAccessed;
      return accessWeight * 0.6 + recencyWeight * 0.4;
    });
    
    const keysToKeep = new Set(entries.slice(0, toKeep).map(([key]) => key));
    const now = Date.now();
    
    for (const [key] of this.cache.entries()) {
      if (!keysToKeep.has(key)) {
        this.cache.delete(key);
        this.pendingRequests.delete(key);
        this.emitEvent({ type: 'evicted', key, timestamp: now });
      }
    }
    
    // Try to save minimal cache
    try {
      const minimalSerialized = Array.from(this.cache.entries()).map(([key, entry]) => [
        key,
        { ...entry, data: JSON.parse(JSON.stringify(entry.data)) },
      ]);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(minimalSerialized));
    } catch (emergencyError) {
      console.error('Emergency cache save failed, clearing storage');
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  private startCleanupInterval(): void {
    if (typeof window !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        const cleaned = this.cleanup();
        // Cache cleanup completed silently
      }, 5 * 60 * 1000); // Every 5 minutes
    }
  }

  private setupLifecycleHandlers(): void {
    if (typeof window !== 'undefined') {
      // Save to storage when page unloads
      window.addEventListener('beforeunload', () => {
        this.saveToStorage();
      });

      // Pause/resume based on visibility
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.saveToStorage();
        }
      });
    }
  }
}