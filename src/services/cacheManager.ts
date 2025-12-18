/**
 * Cache Manager for Cluj Bus App
 * 
 * Unified caching system with:
 * - Event-driven UI updates
 * - Flexible TTL configurations
 * - Single source of truth for all caching needs
 */

import { logger } from '../utils/logger';

// Cache configuration for different data types
export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxAge: number; // Maximum age before forced refresh
  staleWhileRevalidate: boolean; // Return stale data while fetching fresh
}

// Cache configurations for different data types
export const CACHE_CONFIGS = {
  // Static data - changes rarely
  agencies: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    staleWhileRevalidate: true,
  },
  stops: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    staleWhileRevalidate: true,
  },
  routes: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    staleWhileRevalidate: true,
  },
  // Semi-static data - changes daily
  schedules: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
    staleWhileRevalidate: true,
  },
  stopTimes: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
    staleWhileRevalidate: true,
  },
  // Dynamic data - changes frequently
  vehicles: {
    ttl: 30 * 1000, // 30 seconds
    maxAge: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: true,
  },
  // Real-time data - very short lived
  liveData: {
    ttl: 30 * 1000, // 30 seconds
    maxAge: 2 * 60 * 1000, // 2 minutes
    staleWhileRevalidate: true,
  },
} as const;

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  createdAt: number; // When this entry was first created
  updatedAt: number; // When this entry was last updated
  key: string;
  config: CacheConfig;
  etag?: string;
  lastModified?: string;
  source: 'network' | 'cache' | 'offline';
}

// Cache event types for UI updates
export type CacheEventType = 'updated' | 'cleared' | 'expired';

export interface CacheEvent<T> {
  type: CacheEventType;
  key: string;
  data?: T;
  timestamp: number;
}

// Cache event listener type
export type CacheEventListener<T> = (event: CacheEvent<T>) => void;

/**
 * Cache Manager
 * Handles all caching needs with flexible configurations and event notifications
 */
export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private listeners = new Map<string, Set<CacheEventListener<any>>>();
  private pendingRequests = new Map<string, Promise<any>>();
  private readonly STORAGE_KEY = 'cache';
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    this.loadFromStorage();
    
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    // Save to storage when page unloads
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.saveToStorage();
      });
    }
  }

  /**
   * Get data from cache or fetch if needed (with config)
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: CacheConfig,
    forceRefresh = false
  ): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    // Check if we have valid cached data (unless force refresh)
    if (!forceRefresh && cached && this.isValid(cached, now, config)) {
      logger.debug('Cache hit', { key, age: now - cached.timestamp });
      
      // If stale but within max age, return cached data and refresh in background
      if (config.staleWhileRevalidate && this.isStale(cached, now, config)) {
        this.refreshInBackground(key, fetcher, config);
      }
      
      return cached.data;
    }

    // Check if there's already a pending request for this key
    const pending = this.pendingRequests.get(key);
    if (pending) {
      logger.debug('Using pending request', { key });
      return pending;
    }

    // If we have stale data and are offline, return it
    if (cached && !navigator.onLine) {
      logger.info('Returning stale data (offline)', { 
        key, 
        age: now - cached.timestamp 
      });
      return cached.data;
    }

    // Fetch fresh data
    return this.fetchAndCache(key, fetcher, config);
  }

  /**
   * Simple get for live data (uses liveData config by default)
   */
  async getLive<T>(
    key: string,
    fetcher: () => Promise<T>,
    forceRefresh = false
  ): Promise<T> {
    return this.get(key, fetcher, CACHE_CONFIGS.liveData, forceRefresh);
  }

  /**
   * Set data in cache and notify listeners
   */
  set<T>(key: string, data: T, config: CacheConfig = CACHE_CONFIGS.liveData): void {
    const now = Date.now();
    const existingEntry = this.cache.get(key);
    
    // Check if this single entry is too large
    try {
      const entrySize = JSON.stringify(data).length;
      const entrySizeMB = entrySize / (1024 * 1024);
      
      if (entrySizeMB > 2) { // Single entry over 2MB
        logger.warn('Large cache entry detected, skipping cache', {
          key,
          sizeMB: entrySizeMB.toFixed(2),
          maxAllowed: '2MB'
        });
        return; // Don't cache extremely large entries
      }
    } catch (error) {
      logger.warn('Failed to calculate entry size, skipping cache', { key, error });
      return;
    }
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      createdAt: existingEntry?.createdAt || now, // Preserve creation time if updating
      updatedAt: now, // Always update the modification time
      key,
      config,
      source: 'network',
    };

    this.cache.set(key, entry);
    
    // Check storage limits before saving
    const storageInfo = this.getStorageInfo();
    if (storageInfo.isNearLimit) {
      logger.warn('Cache approaching storage limit, performing cleanup', {
        sizeMB: storageInfo.estimatedSizeMB,
        entries: this.cache.size
      });
      this.performStorageCleanup();
    }
    
    this.saveToStorage();
    
    // Notify listeners of cache update
    this.notifyListeners(key, {
      type: 'updated',
      key,
      data,
      timestamp: entry.timestamp,
    });

    logger.debug('Cache updated', { key, isUpdate: !!existingEntry });
  }

  /**
   * Force refresh data regardless of cache state
   */
  async forceRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: CacheConfig
  ): Promise<T> {
    logger.info('Force refreshing cache', { key });
    return this.fetchAndCache(key, fetcher, config);
  }

  /**
   * Check if cache has valid data for key
   */
  has(key: string, config: CacheConfig = CACHE_CONFIGS.liveData): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    const now = Date.now();
    return this.isValid(cached, now, config);
  }

  /**
   * Get cached data immediately without triggering fetch (synchronous)
   * Returns null if no data is cached or if data is expired
   */
  getCached<T>(key: string, config: CacheConfig = CACHE_CONFIGS.liveData): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    
    // Return data if it's still within max age (even if stale)
    if (this.isValid(cached, now, config)) {
      logger.debug('Cache hit (immediate)', { key, age: now - cached.timestamp });
      return cached.data;
    }
    
    return null;
  }

  /**
   * Get cached data even if stale (synchronous)
   * Returns null only if no data is cached at all
   */
  getCachedStale<T>(key: string): { data: T; age: number; isStale: boolean } | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    const age = now - cached.timestamp;
    const isStale = age > cached.config.ttl;
    
    logger.debug('Cache hit (stale allowed)', { key, age, isStale });
    return {
      data: cached.data,
      age,
      isStale
    };
  }

  /**
   * Clear specific cache entry
   */
  clear(key: string): void {
    const existed = this.cache.delete(key);
    if (existed) {
      this.saveToStorage();
      this.notifyListeners(key, {
        type: 'cleared',
        key,
        timestamp: Date.now(),
      });
      logger.debug('Cache entry cleared', { key });
    }
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    const keys = Array.from(this.cache.keys());
    this.cache.clear();
    this.saveToStorage();
    
    // Notify all listeners
    keys.forEach(key => {
      this.notifyListeners(key, {
        type: 'cleared',
        key,
        timestamp: Date.now(),
      });
    });

    logger.info('All cache cleared');
  }

  /**
   * Subscribe to cache events for a specific key
   */
  subscribe<T>(key: string, listener: CacheEventListener<T>): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    
    this.listeners.get(key)!.add(listener);
    
    // Return unsubscribe function
    return () => {
      const keyListeners = this.listeners.get(key);
      if (keyListeners) {
        keyListeners.delete(listener);
        if (keyListeners.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  /**
   * Get the age of a cache entry in milliseconds
   */
  getCacheAge(key: string): number {
    const entry = this.cache.get(key);
    if (!entry) {
      return Infinity; // No cache = infinitely old
    }
    return Date.now() - entry.timestamp;
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): {
    estimatedSizeMB: number;
    isNearLimit: boolean;
    canSaveToStorage: boolean;
    largestEntries?: Array<{ key: string; sizeMB: number }>;
  } {
    try {
      const entriesWithSizes = Array.from(this.cache.entries()).map(([key, entry]) => {
        try {
          const entryData = JSON.stringify({
            ...entry,
            data: JSON.parse(JSON.stringify(entry.data)),
          });
          const sizeInMB = new Blob([entryData]).size / (1024 * 1024);
          return { key, sizeInMB, serialized: [key, JSON.parse(entryData)] };
        } catch (error) {
          return { key, sizeInMB: 0, serialized: null };
        }
      });
      
      const totalSizeMB = entriesWithSizes.reduce((sum, entry) => sum + entry.sizeInMB, 0);
      
      // Get largest entries for debugging
      const largestEntries = entriesWithSizes
        .sort((a, b) => b.sizeInMB - a.sizeInMB)
        .slice(0, 5)
        .map(({ key, sizeInMB }) => ({ key, sizeMB: Number(sizeInMB.toFixed(2)) }));
      
      return {
        estimatedSizeMB: Number(totalSizeMB.toFixed(2)),
        isNearLimit: totalSizeMB > 2, // Warning at 2MB (more conservative)
        canSaveToStorage: totalSizeMB < 3, // Block at 3MB (more conservative)
        largestEntries,
      };
    } catch (error) {
      logger.warn('Failed to calculate storage size', { error });
      return {
        estimatedSizeMB: 0,
        isNearLimit: false,
        canSaveToStorage: true,
      };
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    validEntries: number;
    staleEntries: number;
    expiredEntries: number;
    totalSize: number;
    entriesByType: Record<string, number>;
    entriesWithTimestamps: Record<string, { createdAt: number; updatedAt: number; age: number }>;
    lastCacheUpdate: number;
    oldestEntry?: { key: string; age: number };
    storageInfo: {
      estimatedSizeMB: number;
      isNearLimit: boolean;
      canSaveToStorage: boolean;
    };
  } {
    const now = Date.now();
    let validEntries = 0;
    let staleEntries = 0;
    let expiredEntries = 0;
    let totalSize = 0;
    let lastCacheUpdate = 0;
    const entriesByType: Record<string, number> = {};
    const entriesWithTimestamps: Record<string, { createdAt: number; updatedAt: number; age: number }> = {};
    let oldestEntry: { key: string; age: number } | undefined;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      const type = key.split(':')[0];
      
      entriesByType[type] = (entriesByType[type] || 0) + 1;
      
      // Track timestamps for each entry
      entriesWithTimestamps[key] = {
        createdAt: entry.createdAt || entry.timestamp,
        updatedAt: entry.updatedAt || entry.timestamp,
        age: age
      };
      
      // Track the most recent cache update
      if (entry.updatedAt && entry.updatedAt > lastCacheUpdate) {
        lastCacheUpdate = entry.updatedAt;
      } else if (entry.timestamp > lastCacheUpdate) {
        lastCacheUpdate = entry.timestamp;
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

      // Rough size calculation
      totalSize += JSON.stringify(entry.data).length;
    }

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
      storageInfo: this.getStorageInfo(),
    };
  }

  /**
   * Destroy the cache manager
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
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
      // Create and store the promise to prevent duplicate requests
      const promise = fetcher();
      this.pendingRequests.set(key, promise);

      const data = await promise;
      
      // Store in cache
      const now = Date.now();
      const existingEntry = this.cache.get(key);
      
      const entry: CacheEntry<T> = {
        key,
        data,
        timestamp: now,
        createdAt: existingEntry?.createdAt || now,
        updatedAt: now,
        config,
        source: 'network',
      };

      this.cache.set(key, entry);
      this.saveToStorage();
      
      // Notify listeners
      this.notifyListeners(key, {
        type: 'updated',
        key,
        data,
        timestamp: entry.timestamp,
      });

      logger.debug('Cache updated from network', { key });
      return data;
    } catch (error) {
      logger.error('Failed to fetch data', { key, error });
      
      // Try to return stale data if available
      const cached = this.cache.get(key);
      if (cached) {
        logger.info('Returning stale data due to fetch error', { key });
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
      logger.debug('Background refresh started', { key });
      await this.fetchAndCache(key, fetcher, config);
    } catch (error) {
      logger.warn('Background refresh failed', { key, error });
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

  private notifyListeners<T>(key: string, event: CacheEvent<T>): void {
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      keyListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          logger.error('Cache listener error', { key, error });
        }
      });
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > entry.config.maxAge) {
        toDelete.push(key);
      }
    }

    if (toDelete.length > 0) {
      toDelete.forEach(key => {
        this.cache.delete(key);
        this.notifyListeners(key, {
          type: 'expired',
          key,
          timestamp: now,
        });
      });
      
      this.saveToStorage();
      logger.debug('Cache cleanup completed', { expiredEntries: toDelete.length });
    }
  }

  private performStorageCleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    // Sort by age (oldest first)
    entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    // Remove oldest 30% of entries
    const toRemove = Math.floor(entries.length * 0.3);
    const keysToRemove = entries.slice(0, toRemove).map(([key]) => key);
    
    keysToRemove.forEach(key => {
      this.cache.delete(key);
      this.notifyListeners(key, {
        type: 'expired',
        key,
        timestamp: now,
      });
    });
    
    logger.info('Storage cleanup completed', { 
      removedEntries: keysToRemove.length,
      remainingEntries: this.cache.size 
    });
  }

  private performEmergencyCleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    logger.warn('Emergency cleanup starting', { 
      totalEntries: entries.length,
      cacheSize: this.cache.size 
    });
    
    // Calculate entry sizes to identify large entries
    const entriesWithSizes = entries.map(([key, entry]) => {
      try {
        const size = JSON.stringify(entry.data).length;
        return { key, entry, size, timestamp: entry.timestamp };
      } catch (error) {
        return { key, entry, size: 0, timestamp: entry.timestamp };
      }
    });
    
    // Sort by size (largest first) to remove biggest entries first
    entriesWithSizes.sort((a, b) => b.size - a.size);
    
    // Remove largest entries until we have reasonable size
    const maxEntriesToKeep = Math.min(20, Math.floor(entries.length * 0.5)); // Keep max 20 or 50% of entries
    const toKeep = entriesWithSizes.slice(-maxEntriesToKeep); // Keep smallest entries
    const keysToKeep = new Set(toKeep.map(({ key }) => key));
    
    // Remove everything else
    const keysToRemove: string[] = [];
    for (const [key] of this.cache.entries()) {
      if (!keysToKeep.has(key)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      this.cache.delete(key);
      this.notifyListeners(key, {
        type: 'expired',
        key,
        timestamp: now,
      });
    });
    
    logger.warn('Emergency cleanup completed', { 
      removedEntries: keysToRemove.length,
      keptEntries: this.cache.size,
      maxKeptEntries: maxEntriesToKeep,
      largestRemovedSizes: entriesWithSizes.slice(0, 5).map(e => ({ key: e.key, size: e.size }))
    });
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const serialized = Array.from(this.cache.entries()).map(([key, entry]) => [
        key,
        {
          ...entry,
          // Don't serialize functions or complex objects
          data: JSON.parse(JSON.stringify(entry.data)),
        },
      ]);
      
      const serializedData = JSON.stringify(serialized);
      
      // Check if data is too large (localStorage limit is usually 5-10MB)
      const sizeInMB = new Blob([serializedData]).size / (1024 * 1024);
      
      if (sizeInMB > 3) { // Keep under 3MB to be safe
        logger.warn('Cache too large for storage, performing cleanup', { 
          sizeMB: sizeInMB.toFixed(2),
          entries: this.cache.size 
        });
        
        // Perform aggressive cleanup and try again
        this.performStorageCleanup();
        
        // Re-serialize after cleanup
        const cleanedSerialized = Array.from(this.cache.entries()).map(([key, entry]) => [
          key,
          {
            ...entry,
            data: JSON.parse(JSON.stringify(entry.data)),
          },
        ]);
        
        const cleanedData = JSON.stringify(cleanedSerialized);
        const newSizeInMB = new Blob([cleanedData]).size / (1024 * 1024);
        
        if (newSizeInMB > 4) {
          logger.error('Cache still too large after cleanup, skipping storage save', {
            originalSizeMB: sizeInMB.toFixed(2),
            cleanedSizeMB: newSizeInMB.toFixed(2),
            entries: this.cache.size
          });
          return;
        }
        
        localStorage.setItem(this.STORAGE_KEY, cleanedData);
        logger.info('Cache saved after cleanup', { 
          sizeMB: newSizeInMB.toFixed(2),
          entries: this.cache.size 
        });
      } else {
        localStorage.setItem(this.STORAGE_KEY, serializedData);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        logger.error('Storage quota exceeded, performing emergency cleanup', { error });
        
        // Emergency cleanup - remove oldest entries
        this.performEmergencyCleanup();
        
        // Try to save again with minimal data
        try {
          // Get remaining entries and sort by size (smallest first)
          const remainingEntries = Array.from(this.cache.entries());
          const entriesWithSizes = remainingEntries.map(([key, entry]) => {
            try {
              const serializedEntry = JSON.stringify({
                ...entry,
                data: JSON.parse(JSON.stringify(entry.data)),
              });
              return { key, entry, size: serializedEntry.length, serialized: [key, JSON.parse(serializedEntry)] };
            } catch (error) {
              return null;
            }
          }).filter(Boolean);
          
          // Sort by size (smallest first) and take only the smallest entries
          entriesWithSizes.sort((a, b) => a.size - b.size);
          
          // Keep adding entries until we approach size limit
          const minimalSerialized = [];
          let totalSize = 0;
          const maxSize = 1024 * 1024; // 1MB limit for emergency save
          
          for (const entryData of entriesWithSizes) {
            if (totalSize + entryData.size < maxSize && minimalSerialized.length < 10) {
              minimalSerialized.push(entryData.serialized);
              totalSize += entryData.size;
            } else {
              break;
            }
          }
          
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(minimalSerialized));
          logger.info('Emergency cache save completed', { 
            entries: minimalSerialized.length,
            sizeMB: (totalSize / (1024 * 1024)).toFixed(2)
          });
        } catch (emergencyError) {
          logger.error('Emergency cache save failed, clearing storage', { emergencyError });
          localStorage.removeItem(this.STORAGE_KEY);
        }
      } else {
        logger.warn('Failed to save cache to storage', { error });
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
        
        logger.debug('Cache loaded from storage', { entries: this.cache.size });
      }
    } catch (error) {
      logger.warn('Failed to load cache from storage', { error });
      this.cache = new Map();
    }
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

// Cache key helpers (consolidated from both systems)
export const CacheKeys = {
  // Live data keys (30-second TTL)
  vehicles: (agencyId: number) => `vehicles:${agencyId}`,
  vehicleInfo: (city: string) => `vehicleInfo:${city}`,
  stations: (city: string) => `stations:${city}`,
  
  // Route-specific data
  routeVehicles: (agencyId: number, routeId: string) => `routeVehicles:${agencyId}:${routeId}`,
  
  // Static data keys (long TTL)
  agencies: () => 'agencies:all',
  routes: (agencyId: number) => `routes:agency:${agencyId}`,
  stops: (agencyId: number) => `stops:agency:${agencyId}`,
  trips: (agencyId: number, routeId?: number) => routeId 
    ? `trips:agency:${agencyId}:route:${routeId}`
    : `trips:agency:${agencyId}`,
  stopTimes: (agencyId: number, stopId?: number, tripId?: string) => 
    `stop_times:agency:${agencyId}${stopId ? `:stop:${stopId}` : ''}${tripId ? `:trip:${tripId}` : ''}`,
  shapes: (agencyId: number, shapeId?: string) => shapeId 
    ? `shapes:agency:${agencyId}:shape:${shapeId}`
    : `shapes:agency:${agencyId}`,
} as const;

// Backward compatibility exports (types already exported above)

// Legacy aliases for migration
export const unifiedCache = cacheManager;
export const dataCacheManager = cacheManager;
export const consolidatedCache = cacheManager;