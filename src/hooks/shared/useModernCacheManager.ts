/**
 * Modern Cache Manager
 * 
 * Provides centralized cache management using unified store cache systems.
 * Replaces data hook cache operations with store-based cache methods.
 */

import { useCallback, useState } from 'react';
import { useVehicleStore } from '../../stores/vehicleStore';
import { useConfigStore } from '../../stores/configStore';
import { useLocationStore } from '../../stores/locationStore';
import { cacheManager } from '../../stores/shared/cacheManager';
import { enhancedTranzyApi } from '../../services/tranzyApiService';
import { logger } from '../../utils/logger';

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  entriesByType: Record<string, number>;
  entriesWithTimestamps: Record<string, { createdAt: number; updatedAt: number; age: number }>;
  lastCacheUpdate: number;
  lastRefresh?: Date;
}

export interface ModernCacheManagerState {
  isClearing: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastOperation: Date | null;
}

export interface ModernCacheManagerActions {
  getCacheStats: () => CacheStats;
  clearCache: () => Promise<void>;
  refreshCache: () => Promise<void>;
  forceRefreshAll: () => Promise<void>;
}

export interface ModernCacheManagerResult extends ModernCacheManagerState, ModernCacheManagerActions {}

/**
 * Modern cache manager hook using unified store cache systems
 */
export const useModernCacheManager = (): ModernCacheManagerResult => {
  const [state, setState] = useState<ModernCacheManagerState>({
    isClearing: false,
    isRefreshing: false,
    error: null,
    lastOperation: null
  });

  // Store instances for cache operations
  const vehicleStore = useVehicleStore();
  const configStore = useConfigStore();
  const locationStore = useLocationStore();

  const getCacheStats = useCallback((): CacheStats => {
    // Get unified cache statistics from store cache manager
    const unifiedStats = cacheManager.getStats();
    
    // Get vehicle store cache stats
    const vehicleStats = vehicleStore.cacheStats;
    
    // Combine statistics from all sources
    const stats: CacheStats = {
      totalEntries: unifiedStats.totalEntries,
      totalSize: unifiedStats.totalSize,
      entriesByType: {
        ...unifiedStats.entriesByType,
        // Add vehicle store specific categories
        vehicles: vehicleStore.vehicles.length,
        stations: vehicleStore.stations.length,
      },
      entriesWithTimestamps: unifiedStats.entriesWithTimestamps,
      lastCacheUpdate: Math.max(
        unifiedStats.lastCacheUpdate,
        vehicleStats.lastCacheUpdate,
        vehicleStore.lastCacheUpdate?.getTime() || 0
      ),
      lastRefresh: vehicleStore.lastUpdate || new Date()
    };

    // Add localStorage stats for app settings (excluding cache data)
    if (typeof window !== 'undefined') {
      const appSettingsKeys = ['unified-config-store', 'vehicle-store', 'location-store'];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && appSettingsKeys.includes(key)) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              stats.entriesByType['settings'] = (stats.entriesByType['settings'] || 0) + 1;
            }
          } catch (error) {
            logger.warn('Failed to read settings entry', { key, error }, 'CACHE_MANAGER');
          }
        }
      }
    }

    return stats;
  }, [vehicleStore]);

  const clearCache = useCallback(async () => {
    setState(prev => ({ ...prev, isClearing: true, error: null }));

    try {
      logger.info('Starting unified cache clear operation', {}, 'CACHE_MANAGER');

      // Clear unified cache manager
      cacheManager.clearAll();
      
      // Clear vehicle store cache
      vehicleStore.clearCache();
      
      // Clear enhanced API cache
      enhancedTranzyApi.clearCache();

      // Clear localStorage cache (excluding app settings)
      if (typeof window !== 'undefined') {
        const appSettingsKeys = ['unified-config-store', 'vehicle-store', 'location-store'];
        const keysToRemove: string[] = [];
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && !appSettingsKeys.includes(key)) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });

        logger.info('Cache cleared successfully', { 
          removedKeys: keysToRemove.length,
          storesCleaned: ['unified-cache', 'vehicle-store', 'enhanced-api']
        }, 'CACHE_MANAGER');
      }

      setState(prev => ({ 
        ...prev, 
        isClearing: false, 
        lastOperation: new Date() 
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during cache clear';
      setState(prev => ({ 
        ...prev, 
        isClearing: false, 
        error: errorMessage 
      }));
      
      logger.error('Unified cache clear failed', { error }, 'CACHE_MANAGER');
      throw error;
    }
  }, [vehicleStore]);

  const refreshCache = useCallback(async () => {
    setState(prev => ({ ...prev, isRefreshing: true, error: null }));

    try {
      logger.info('Starting unified cache refresh operation', {}, 'CACHE_MANAGER');

      // Refresh all store data using store methods
      await Promise.allSettled([
        vehicleStore.refreshVehicles({ forceRefresh: false }),
        vehicleStore.refreshStations(false),
        vehicleStore.refreshScheduleData(),
        vehicleStore.refreshLiveData()
      ]);

      // Update cache statistics
      vehicleStore.getCacheStats();

      setState(prev => ({ 
        ...prev, 
        isRefreshing: false, 
        lastOperation: new Date() 
      }));

      logger.info('Unified cache refresh completed successfully', {}, 'CACHE_MANAGER');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during cache refresh';
      setState(prev => ({ 
        ...prev, 
        isRefreshing: false, 
        error: errorMessage 
      }));
      
      logger.error('Unified cache refresh failed', { error }, 'CACHE_MANAGER');
      throw error;
    }
  }, [vehicleStore]);

  const forceRefreshAll = useCallback(async () => {
    setState(prev => ({ ...prev, isRefreshing: true, error: null }));

    try {
      logger.info('Starting unified force refresh all operation', {}, 'CACHE_MANAGER');

      // Force refresh all store data
      await vehicleStore.forceRefreshAll();

      // Update cache statistics
      vehicleStore.getCacheStats();

      setState(prev => ({ 
        ...prev, 
        isRefreshing: false, 
        lastOperation: new Date() 
      }));

      logger.info('Unified force refresh all completed successfully', {}, 'CACHE_MANAGER');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during force refresh';
      setState(prev => ({ 
        ...prev, 
        isRefreshing: false, 
        error: errorMessage 
      }));
      
      logger.error('Unified force refresh all failed', { error }, 'CACHE_MANAGER');
      throw error;
    }
  }, [vehicleStore]);

  return {
    // State
    ...state,
    
    // Actions
    getCacheStats,
    clearCache,
    refreshCache,
    forceRefreshAll
  };
};