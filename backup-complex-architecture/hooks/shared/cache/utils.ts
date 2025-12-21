/**
 * Utility functions and configurations for the unified cache system
 */

import type { CacheConfig } from './types';

/**
 * Predefined cache configurations for different data types
 */
export const CACHE_CONFIGS = {
  // Static data - changes rarely
  agencies: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    staleWhileRevalidate: true,
    maxEntries: 50,
  },
  stops: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    staleWhileRevalidate: true,
    maxEntries: 1000,
  },
  routes: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    staleWhileRevalidate: true,
    maxEntries: 500,
  },
  // Semi-static data - changes daily
  schedules: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
    staleWhileRevalidate: true,
    maxEntries: 200,
  },
  stopTimes: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
    staleWhileRevalidate: true,
    maxEntries: 500,
  },
  // Dynamic data - changes frequently
  vehicles: {
    ttl: 30 * 1000, // 30 seconds
    maxAge: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: true,
    maxEntries: 100,
  },
  // Real-time data - very short lived
  liveData: {
    ttl: 30 * 1000, // 30 seconds
    maxAge: 2 * 60 * 1000, // 2 minutes
    staleWhileRevalidate: true,
    maxEntries: 50,
  },
} as const satisfies Record<string, CacheConfig>;

/**
 * Create standardized cache key from parameters
 */
export const createCacheKey = (prefix: string, params: Record<string, any>): string => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${JSON.stringify(params[key])}`)
    .join('&');
  
  return sortedParams ? `${prefix}:${sortedParams}` : prefix;
};

/**
 * Cache key helpers for common data types
 */
export const CacheKeys = {
  // Live data keys
  vehicles: (agencyId: number, routeId?: number) => 
    routeId ? `vehicles:${agencyId}:${routeId}` : `vehicles:${agencyId}`,
  vehicleInfo: (city: string) => `vehicleInfo:${city}`,
  stations: (city: string) => `stations:${city}`,
  
  // Static data keys
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

/**
 * Estimate data size in bytes
 */
export const estimateDataSize = (data: any): number => {
  try {
    return new Blob([JSON.stringify(data)]).size;
  } catch {
    // Fallback estimation
    if (typeof data === 'string') return data.length * 2;
    if (typeof data === 'number') return 8;
    if (typeof data === 'boolean') return 4;
    if (Array.isArray(data)) return data.length * 100; // Rough estimate
    if (typeof data === 'object' && data !== null) return Object.keys(data).length * 50; // Rough estimate
    return 100; // Default estimate
  }
};

/**
 * Check if data is too large for caching
 */
export const isDataTooLarge = (data: any, maxSize?: number): boolean => {
  if (!maxSize) return false;
  
  const size = estimateDataSize(data);
  return size > maxSize;
};

/**
 * Get cache key type from key string
 */
export const getCacheKeyType = (key: string): string => {
  return key.split(':')[0] || 'unknown';
};

/**
 * Default memory pressure configuration
 */
export const DEFAULT_MEMORY_PRESSURE_CONFIG = {
  threshold: 0.8, // 80% of maxSize
  aggressiveCleanupRatio: 0.25, // Remove 25% of entries
  emergencyCleanupRatio: 0.5, // Keep only 50% of entries
};