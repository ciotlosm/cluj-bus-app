/**
 * Unified Cache System for Cluj Bus App
 * 
 * Simplifies caching to a single system with consistent behavior:
 * - Single TTL for all live data (30 seconds)
 * - Automatic UI updates when cache is refreshed
 * - localStorage persistence for offline support
 * - Event-driven cache invalidation
 */

import { logger } from '../utils/logger';

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
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
 * Unified Cache Manager
 * Single cache system for all live data with consistent 30-second TTL
 */
export class UnifiedCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private listeners = new Map<string, Set<CacheEventListener<any>>>();
  private readonly TTL = 30 * 1000; // 30 seconds for all live data
  private readonly STORAGE_KEY = 'cluj-bus-cache';
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.loadFromStorage();
    
    // Clean up expired entries every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 30 * 1000);

    // Save to storage when page unloads
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.saveToStorage();
      });
    }
  }

  /**
   * Get data from cache or fetch if needed
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    forceRefresh = false
  ): Promise<T> {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = this.getFromCache<T>(key);
      if (cached) {
        logger.debug('Cache hit', { key, age: Date.now() - cached.timestamp });
        return cached.data;
      }
    }

    // Fetch fresh data
    logger.debug('Cache miss, fetching fresh data', { key, forceRefresh });
    
    try {
      const data = await fetcher();
      this.set(key, data);
      return data;
    } catch (error) {
      // Try to return stale data if available and we're not force refreshing
      if (!forceRefresh) {
        const stale = this.getStaleFromCache<T>(key);
        if (stale) {
          logger.warn('Fetch failed, returning stale data', { key, error });
          return stale.data;
        }
      }
      
      logger.error('Fetch failed and no stale data available', { key, error });
      throw error;
    }
  }

  /**
   * Set data in cache and notify listeners
   */
  set<T>(key: string, data: T): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      key,
    };

    this.cache.set(key, entry);
    this.saveToStorage();
    
    // Notify listeners of cache update
    this.notifyListeners(key, {
      type: 'updated',
      key,
      data,
      timestamp: entry.timestamp,
    });

    logger.debug('Cache updated', { key });
  }

  /**
   * Get data from cache if valid (within TTL)
   */
  private getFromCache<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age <= this.TTL) {
      return entry;
    }

    return null;
  }

  /**
   * Get stale data from cache (beyond TTL but still exists)
   */
  private getStaleFromCache<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Return stale data up to 5 minutes old
    const age = Date.now() - entry.timestamp;
    if (age <= 5 * 60 * 1000) {
      return entry;
    }

    return null;
  }

  /**
   * Check if cache has valid data for key
   */
  has(key: string): boolean {
    return this.getFromCache(key) !== null;
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
   * Notify listeners of cache events
   */
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

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // Keep stale data for 5 minutes
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > maxAge) {
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

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const serialized = Array.from(this.cache.entries());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(serialized));
    } catch (error) {
      logger.warn('Failed to save cache to storage', { error });
    }
  }

  /**
   * Load cache from localStorage
   */
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

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    validEntries: number;
    staleEntries: number;
    expiredEntries: number;
    totalSize: number;
  } {
    const now = Date.now();
    let validEntries = 0;
    let staleEntries = 0;
    let expiredEntries = 0;
    let totalSize = 0;

    for (const entry of this.cache.values()) {
      const age = now - entry.timestamp;
      
      if (age <= this.TTL) {
        validEntries++;
      } else if (age <= 5 * 60 * 1000) {
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
  }
}

// Singleton instance
export const unifiedCache = new UnifiedCacheManager();

// Cache key helpers
export const CacheKeys = {
  // Live data keys (30-second TTL)
  vehicles: (agencyId: number) => `vehicles:${agencyId}`,
  busInfo: (city: string) => `busInfo:${city}`,
  stations: (city: string) => `stations:${city}`,
  
  // Route-specific data
  routeVehicles: (agencyId: number, routeId: string) => `routeVehicles:${agencyId}:${routeId}`,
  
  // Transit estimates (short-lived)
  transitEstimate: (origin: string, destination: string) => `transit:${origin}-${destination}`,
} as const;