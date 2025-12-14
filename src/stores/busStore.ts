import { create } from 'zustand';
import type { BusStore, BusInfo, Station, ErrorState } from '../types';
import { useDirectionStore } from './directionStore';
import { useConfigStore } from './configStore';
import { useLocationStore } from './locationStore';
import { useOfflineStore } from './offlineStore';
import { withRetry, isRetryableError, RetryError } from '../utils/retryUtils';
import { DataCache } from '../utils/cacheUtils';
import { logger } from '../utils/logger';

// Create cache instances for different data types
const busCache = new DataCache<BusInfo[]>();
const stationCache = new DataCache<Station[]>();

// Global refresh interval management
let refreshIntervalId: number | null = null;

export const useBusStore = create<BusStore>((set, get) => ({
  buses: [],
  stations: [],
  lastUpdate: null,
  lastApiUpdate: null, // When we last received fresh data from API
  lastCacheUpdate: null, // When we last updated cache
  isLoading: false,
  error: null,
  isAutoRefreshEnabled: false,

  refreshBuses: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const config = useConfigStore.getState().config;
      if (!config) {
        throw new Error('Configuration not available');
      }

      // Try to fetch fresh data with retry mechanism
      const fetchBusData = async (): Promise<BusInfo[]> => {
        const { tranzyApiService } = await import('../services/tranzyApiService');
        const apiService = tranzyApiService();
        
        // Set the API key from config
        if (config.apiKey) {
          apiService.setApiKey(config.apiKey);
        }
        
        // Fetch buses for the configured city
        return await apiService.getBusesForCity(config.city);
      };

      let buses: BusInfo[];
      let isUsingCachedData = false;

      try {
        // Attempt to fetch fresh data with retry
        buses = await withRetry(fetchBusData, {
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 8000,
        });
        
        // Cache the fresh data
        busCache.set(config.city, buses);
        
        // Update timestamps for fresh API data
        const now = new Date();
        set({ 
          lastApiUpdate: now,
          lastCacheUpdate: now
        });
      } catch (error) {
        // If fetch fails, try to use cached data for graceful degradation
        const cachedResult = busCache.getStale(config.city);
        
        if (cachedResult) {
          buses = cachedResult.data;
          isUsingCachedData = true;
          
          // Update offline store to indicate we're using cached data
          const offlineStore = useOfflineStore.getState();
          const cacheTimestamp = new Date(Date.now() - cachedResult.age);
          offlineStore.setUsingCachedData(true, cachedResult.data.length > 0 ? cacheTimestamp : undefined);
          
          // Update cache timestamp (but not API timestamp since this is cached data)
          set({ lastCacheUpdate: cacheTimestamp });
          
          // Create appropriate error state
          const errorState: ErrorState = {
            type: error instanceof RetryError ? 'network' : 'partial',
            message: isUsingCachedData 
              ? `Using cached data (${Math.round(cachedResult.age / 1000)}s old): ${error instanceof Error ? error.message : 'Unknown error'}`
              : error instanceof Error ? error.message : 'Unknown error occurred',
            timestamp: new Date(),
            retryable: isRetryableError(error instanceof Error ? error : new Error(String(error))),
          };
          
          set({ error: errorState });
        } else {
          // No cached data available
          const offlineStore = useOfflineStore.getState();
          offlineStore.setUsingCachedData(false);
          
          const errorState: ErrorState = {
            type: 'noData',
            message: error instanceof Error ? error.message : 'No data available',
            timestamp: new Date(),
            retryable: isRetryableError(error instanceof Error ? error : new Error(String(error))),
          };
          
          set({
            error: errorState,
            isLoading: false,
          });
          return;
        }
      }

      // Classify bus directions using intelligence
      const { calculateDistance } = useLocationStore.getState();
      const { classifyBusesWithIntelligence } = useDirectionStore.getState();
      
      console.log('Bus data fetched:', { 
        busCount: buses.length, 
        config: config?.city,
        hasHomeLocation: !!config?.homeLocation,
        hasWorkLocation: !!config?.workLocation,
        homeLocation: config?.homeLocation,
        workLocation: config?.workLocation,
        sampleBus: buses[0]
      });
      
      if (config && buses.length > 0) {
        const classifiedBuses = classifyBusesWithIntelligence(buses, config, calculateDistance);
        console.log('Classified buses:', { 
          classifiedCount: classifiedBuses.length,
          workBuses: classifiedBuses.filter(b => b.direction === 'work').length,
          homeBuses: classifiedBuses.filter(b => b.direction === 'home').length,
          unknownBuses: classifiedBuses.filter(b => b.direction === 'unknown').length,
          sampleClassified: classifiedBuses.slice(0, 3).map(b => ({ 
            id: b.id, 
            route: b.route, 
            direction: b.direction,
            stationCoords: b.station.coordinates
          }))
        });
        set({ buses: classifiedBuses });
      } else {
        console.log('Setting buses directly:', { busCount: buses.length });
        set({ buses });
      }
      
      set({
        lastUpdate: new Date(),
        isLoading: false,
      });
    } catch (error) {
      // Final fallback error handling
      const errorState: ErrorState = {
        type: 'network',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date(),
        retryable: true,
      };
      
      set({
        error: errorState,
        isLoading: false,
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },

  // Real-time refresh system implementation
  startAutoRefresh: () => {
    const config = useConfigStore.getState().config;
    if (!config || !config.refreshRate) {
      console.warn('Cannot start auto refresh: configuration not available or refresh rate not set');
      return;
    }

    // Stop any existing interval
    if (refreshIntervalId) {
      clearInterval(refreshIntervalId);
    }

    // Start new interval with configured refresh rate
    refreshIntervalId = setInterval(async () => {
      const currentState = get();
      // Only refresh if not currently loading to avoid overlapping requests
      if (!currentState.isLoading) {
        await currentState.refreshBuses();
      }
    }, config.refreshRate);

    set({ isAutoRefreshEnabled: true });
    console.log(`Auto refresh started with interval: ${config.refreshRate}ms`);
  },

  stopAutoRefresh: () => {
    if (refreshIntervalId) {
      clearInterval(refreshIntervalId);
      refreshIntervalId = null;
    }
    set({ isAutoRefreshEnabled: false });
    console.log('Auto refresh stopped');
  },

  manualRefresh: async () => {
    // Manual refresh bypasses automatic timing and triggers immediately
    const currentState = get();
    
    // Clear any error state before manual refresh
    set({ error: null });
    
    // Perform the refresh
    await currentState.refreshBuses();
    
    console.log('Manual refresh completed');
  },
}));