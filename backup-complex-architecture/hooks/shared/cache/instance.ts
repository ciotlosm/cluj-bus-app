/**
 * Global unified cache instance
 * 
 * Provides a singleton cache manager that replaces all existing cache systems
 */

import { UnifiedCacheManager } from './UnifiedCacheManager';

/**
 * Global unified cache instance
 * Replaces:
 * - cacheManager from src/services/cacheManager.ts
 * - globalCache from src/hooks/shared/cacheManager.ts  
 * - cacheManager from src/stores/shared/cacheManager.ts
 */
export const unifiedCache = new UnifiedCacheManager({
  threshold: 0.8, // 80% memory pressure threshold
  aggressiveCleanupRatio: 0.25, // Remove 25% during cleanup
  emergencyCleanupRatio: 0.5, // Keep 50% during emergency
});

// Legacy aliases for backward compatibility during migration
export const cacheManager = unifiedCache;
export const globalCache = unifiedCache;
export const dataCacheManager = unifiedCache;
export const consolidatedCache = unifiedCache;