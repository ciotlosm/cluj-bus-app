import { create } from 'zustand';
import type { VehicleInfo, Station, ErrorState, EnhancedVehicleInfo } from '../types';
import { useAppStore } from './appStore';
import { useLocationStore } from './locationStore';
import { useOfflineStore } from './offlineStore';
import { withRetry, isRetryableError, RetryError } from '../utils/retryUtils';
import { cacheManager as unifiedCache, CacheKeys, CACHE_CONFIGS } from '../services/cacheManager';
import { enhancedTranzyApi } from '../services/tranzyApiService';
import { logger } from '../utils/logger';

export interface BusDataStore {
  // Basic vehicle data
  buses: VehicleInfo[]; // Note: keeping 'buses' name for UI compatibility
  stations: Station[];
  
  // Enhanced vehicle data
  enhancedBuses: EnhancedVehicleInfo[]; // Note: keeping 'buses' name for UI compatibility
  
  // State
  lastUpdate: Date | null;
  lastApiUpdate: Date | null;
  lastCacheUpdate: Date | null;
  isLoading: boolean;
  error: ErrorState | null;
  
  // Cache info
  cacheStats: {
    totalEntries: number;
    totalSize: number;
    entriesByType: Record<string, number>;
    entriesWithTimestamps: Record<string, { createdAt: number; updatedAt: number; age: number }>;
    lastCacheUpdate: number;
    lastRefresh?: Date;
  };
  
  // Auto-refresh system
  isAutoRefreshEnabled: boolean;
  
  // Actions - Basic bus data
  refreshBuses: (forceRefresh?: boolean) => Promise<void>;
  refreshStations: (forceRefresh?: boolean) => Promise<void>;
  
  // Actions - Enhanced bus data
  refreshEnhancedBuses: (forceRefresh?: boolean) => Promise<void>;
  refreshScheduleData: () => Promise<void>;
  refreshLiveData: () => Promise<void>;
  forceRefreshAll: () => Promise<void>;
  
  // Actions - Auto-refresh
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
  manualRefresh: () => Promise<void>;
  
  // Actions - Cache management
  getCacheStats: () => void;
  clearCache: () => void;
  clearError: () => void;
  
  // Helper methods
  calculateDistance: (from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) => number;
}

// Global refresh intervals
let refreshIntervalId: number | null = null;
let liveDataInterval: number | null = null;
let scheduleDataInterval: number | null = null;

export const useBusDataStore = create<BusDataStore>((set, get) => ({
  // Initial state
  buses: [],
  stations: [],
  enhancedBuses: [],
  lastUpdate: null,
  lastApiUpdate: null,
  lastCacheUpdate: null,
  isLoading: false,
  error: null,
  isAutoRefreshEnabled: false,
  cacheStats: {
    totalEntries: 0,
    totalSize: 0,
    entriesByType: {},
    entriesWithTimestamps: {},
    lastCacheUpdate: 0,
  },

  // Basic bus data actions
  refreshBuses: async (forceRefresh = false) => {
    set({ isLoading: true, error: null });
    
    try {
      const config = useAppStore.getState().config;
      if (!config) {
        throw new Error('Configuration not available');
      }

      const fetchBusData = async (): Promise<BusInfo[]> => {
        const { tranzyApiService } = await import('../services/tranzyApiService');
        const apiService = tranzyApiService();
        
        if (config.apiKey) {
          apiService.setApiKey(config.apiKey);
        }
        
        return await apiService.getBusesForCity(config.city);
      };

      let buses: BusInfo[];

      try {
        const cacheKey = CacheKeys.vehicleInfo(config.city);
        buses = forceRefresh
          ? await unifiedCache.forceRefresh(cacheKey, fetchBusData, CACHE_CONFIGS.liveData)
          : await unifiedCache.getLive(cacheKey, fetchBusData);

        const now = new Date();
        set({
          buses,
          lastUpdate: now,
          lastApiUpdate: now,
          lastCacheUpdate: now,
          isLoading: false,
          error: null,
        });

        logger.info('Buses refreshed successfully', {
          busCount: buses.length,
          city: config.city,
          forceRefresh,
        });

      } catch (error) {
        if (error instanceof RetryError) {
          throw error;
        }

        logger.warn('Primary bus fetch failed, trying fallback', { error });
        
        const fallbackBuses = await unifiedCache.getLive(
          CacheKeys.vehicleInfo(config.city),
          fetchBusData,
          true
        );

        const now = new Date();
        set({
          buses: fallbackBuses,
          lastUpdate: now,
          lastCacheUpdate: now,
          isLoading: false,
          error: null,
        });

        useOfflineStore.getState().setUsingCachedData(true, now);
      }

    } catch (error) {
      const errorState: ErrorState = {
        message: error instanceof Error ? error.message : 'Failed to refresh buses',
        type: isRetryableError(error) ? 'network' : 'noData',
        timestamp: new Date(),
        retryable: isRetryableError(error),
      };

      set({
        error: errorState,
        isLoading: false,
      });

      logger.error('Failed to refresh buses', { error });
    }
  },

  refreshStations: async (forceRefresh = false) => {
    try {
      const config = useAppStore.getState().config;
      if (!config) {
        throw new Error('Configuration not available');
      }

      const fetchStationData = async (): Promise<Station[]> => {
        const { tranzyApiService } = await import('../services/tranzyApiService');
        const apiService = tranzyApiService();
        
        if (config.apiKey) {
          apiService.setApiKey(config.apiKey);
        }
        
        return await apiService.getStationsForCity(config.city);
      };

      const cacheKey = CacheKeys.stations(config.city);
      const stations = forceRefresh
        ? await unifiedCache.forceRefresh(cacheKey, fetchStationData, CACHE_CONFIGS.stops)
        : await unifiedCache.get(cacheKey, fetchStationData, CACHE_CONFIGS.stops);

      set({ stations });
      logger.info('Stations refreshed successfully', { stationCount: stations.length });

    } catch (error) {
      logger.error('Failed to refresh stations', { error });
    }
  },

  // Enhanced bus data actions
  refreshEnhancedBuses: async (forceRefresh = false) => {
    set({ isLoading: true, error: null });
    
    try {
      const config = useAppStore.getState().config;
      if (!config || !config.agencyId) {
        throw new Error('Agency configuration not available');
      }

      const agencyId = parseInt(config.agencyId);
      const enhancedVehicles = await enhancedTranzyApi.getEnhancedVehicleInfo(
        agencyId,
        undefined, // stopId
        undefined, // routeId
        forceRefresh
      );

      const now = new Date();
      set({
        enhancedBuses: enhancedVehicles,
        lastUpdate: now,
        lastApiUpdate: now,
        isLoading: false,
        error: null,
      });

      logger.info('Enhanced vehicles refreshed successfully', {
        vehicleCount: enhancedVehicles.length,
        agencyId,
      });

    } catch (error) {
      const errorState: ErrorState = {
        message: error instanceof Error ? error.message : 'Failed to refresh enhanced buses',
        type: 'network',
        timestamp: new Date(),
        retryable: true,
      };

      set({
        error: errorState,
        isLoading: false,
      });

      logger.error('Failed to refresh enhanced buses', { error });
    }
  },

  refreshScheduleData: async () => {
    try {
      const config = useAppStore.getState().config;
      if (!config || !config.agencyId) return;

      const agencyId = parseInt(config.agencyId);
      await enhancedTranzyApi.forceRefreshAll(agencyId);
      
      logger.info('Schedule data refreshed', { agencyId });
    } catch (error) {
      logger.error('Failed to refresh schedule data', { error });
    }
  },

  refreshLiveData: async () => {
    await get().refreshEnhancedBuses(true);
  },

  forceRefreshAll: async () => {
    const config = useAppStore.getState().config;
    if (!config || !config.agencyId) return;

    const agencyId = parseInt(config.agencyId);
    
    try {
      await Promise.allSettled([
        get().refreshBuses(true),
        get().refreshStations(true),
        get().refreshEnhancedBuses(true),
        enhancedTranzyApi.forceRefreshAll(agencyId),
      ]);
      
      logger.info('Force refresh completed', { agencyId });
    } catch (error) {
      logger.error('Force refresh failed', { error });
    }
  },

  // Auto-refresh actions
  startAutoRefresh: () => {
    const { isAutoRefreshEnabled } = get();
    if (isAutoRefreshEnabled) return;

    // Main refresh every 30 seconds
    refreshIntervalId = window.setInterval(() => {
      get().refreshBuses();
    }, 30000);

    // Live data refresh every 15 seconds
    liveDataInterval = window.setInterval(() => {
      get().refreshLiveData();
    }, 15000);

    // Schedule data refresh every 5 minutes
    scheduleDataInterval = window.setInterval(() => {
      get().refreshScheduleData();
    }, 5 * 60 * 1000);

    set({ isAutoRefreshEnabled: true });
    logger.info('Auto-refresh started');
  },

  stopAutoRefresh: () => {
    if (refreshIntervalId) {
      clearInterval(refreshIntervalId);
      refreshIntervalId = null;
    }
    if (liveDataInterval) {
      clearInterval(liveDataInterval);
      liveDataInterval = null;
    }
    if (scheduleDataInterval) {
      clearInterval(scheduleDataInterval);
      scheduleDataInterval = null;
    }

    set({ isAutoRefreshEnabled: false });
    logger.info('Auto-refresh stopped');
  },

  manualRefresh: async () => {
    await Promise.allSettled([
      get().refreshBuses(true),
      get().refreshEnhancedBuses(true),
    ]);
  },

  // Cache management
  getCacheStats: () => {
    const stats = unifiedCache.getStats();
    set({ cacheStats: stats });
  },

  clearCache: () => {
    unifiedCache.clearAll();
    enhancedTranzyApi.clearCache();
    logger.info('All cache cleared');
  },

  clearError: () => {
    set({ error: null });
  },

  // Helper methods
  calculateDistance: (
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number }
  ): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (to.latitude - from.latitude) * Math.PI / 180;
    const dLon = (to.longitude - from.longitude) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(from.latitude * Math.PI / 180) * Math.cos(to.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  },
}));

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    useBusDataStore.getState().stopAutoRefresh();
  });
}