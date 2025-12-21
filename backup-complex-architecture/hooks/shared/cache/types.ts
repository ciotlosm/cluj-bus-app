/**
 * Type definitions for the unified cache system
 */

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxAge: number; // Maximum age before forced refresh
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh
  maxSize?: number; // Maximum cache size in bytes
  maxEntries?: number; // Maximum number of entries
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  createdAt: number;
  updatedAt: number;
  key: string;
  config: CacheConfig;
  size: number;
  accessCount: number;
  lastAccessed: number;
  etag?: string;
  lastModified?: string;
  source: 'network' | 'cache' | 'offline';
}

export interface CacheStats {
  totalEntries: number;
  validEntries: number;
  staleEntries: number;
  expiredEntries: number;
  totalSize: number;
  entriesByType: Record<string, number>;
  entriesWithTimestamps: Record<string, { 
    createdAt: number; 
    updatedAt: number; 
    age: number;
    accessCount: number;
  }>;
  lastCacheUpdate: number;
  oldestEntry?: { key: string; age: number };
  hitRate: number;
  missRate: number;
  memoryPressure: number;
  isUnderPressure: boolean;
  storageInfo: {
    estimatedSizeMB: number;
    isNearLimit: boolean;
    canSaveToStorage: boolean;
    largestEntries?: Array<{ key: string; sizeMB: number }>;
  };
}

export type CacheEventType = 'hit' | 'miss' | 'updated' | 'cleared' | 'expired' | 'evicted';

export interface CacheEvent<T> {
  type: CacheEventType;
  key: string;
  data?: T;
  timestamp: number;
}

export type CacheEventListener<T> = (event: CacheEvent<T>) => void;

export interface RequestDeduplicationEntry<T> {
  promise: Promise<T>;
  timestamp: number;
}

export interface MemoryPressureConfig {
  threshold: number; // Percentage of maxSize to trigger cleanup
  aggressiveCleanupRatio: number; // Percentage of entries to remove during aggressive cleanup
  emergencyCleanupRatio: number; // Percentage of entries to keep during emergency cleanup
}