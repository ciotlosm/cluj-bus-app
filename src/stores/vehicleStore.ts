/**
 * Unified Vehicle Store
 * Consolidates functionality from busStore, busDataStore, enhancedBusStore, and offlineStore
 * Uses shared utilities for consistent patterns across the application
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { 
  VehicleStore, 
  RefreshOptions, 
  Coordinates,
  Station,
  EnhancedVehicleInfo 
} from '../types';
import type { LiveVehicle, Route, StopTime } from '../types/tranzyApi';
import { StoreEventManager, StoreEvents } from './shared/storeEvents';
import { autoRefreshManager } from './shared/autoRefresh';
import { StoreErrorHandler } from './shared/errorHandler';
import { cacheManager } from './shared/cacheManager';
import { enhancedTranzyApi } from '../services/tranzyApiService';
import { logger } from '../utils/logger';
import { locationWarningTracker } from '../utils/locationWarningTracker';

/**
 * Unified Vehicle Store Implementation
 * Merges all vehicle-related functionality into a single, cohesive store
 */
export const useVehicleStore = create<VehicleStore>()(
  persist(
    (set, get) => ({
      // Unified Data - using EnhancedVehicleInfo as primary model
      vehicles: [],
      stations: [],
      
      // State Management
      isLoading: false,
      error: null,
      lastUpdate: null,
      lastApiUpdate: null,
      lastCacheUpdate: null,
      
      // Cache and Offline Integration
      cacheStats: {
        totalEntries: 0,
        totalSize: 0,
        entriesByType: {},
        entriesWithTimestamps: {},
        lastCacheUpdate: 0,
      },
      isOnline: navigator.onLine,
      isUsingCachedData: false,
      
      // Auto-refresh state
      isAutoRefreshEnabled: false,

      // Actions - Data Management
      refreshVehicles: async (options: RefreshOptions = {}) => {
        const context = StoreErrorHandler.createContext('VehicleStore', 'refreshVehicles', options);
        set({ isLoading: true, error: null });

        try {
          // Get configuration from config store (will be available after config store is created)
          const configStore = await import('./configStore').then(m => m.useConfigStore.getState());
          const config = configStore.config;
          
          if (!config?.city || !config?.apiKey) {
            throw new Error('Configuration not available');
          }

          // Set API key for enhanced API
          enhancedTranzyApi.setApiKey(config.apiKey);
          
          if (!config.agencyId) {
            throw new Error('Agency ID not configured');
          }
          
          const agencyId = parseInt(config.agencyId);

          // Fetch enhanced vehicle information with retry logic
          const fetchVehicleData = async (): Promise<EnhancedVehicleInfo[]> => {
            return await enhancedTranzyApi.getEnhancedVehicleInfo(
              agencyId,
              undefined, // stopId - get all stops
              undefined, // routeId - get all routes  
              options.forceRefresh
            );
          };

          const vehicles = await StoreErrorHandler.withRetry(
            fetchVehicleData,
            context
          );

          // Classify vehicles by direction using user locations
          const classifiedVehicles = vehicles.map((vehicle) => {
            if (!config.homeLocation || !config.workLocation) {
              return { ...vehicle, direction: 'unknown' as const };
            }

            // Calculate distances from vehicle station to home and work
            const distanceToHome = get().calculateDistance(
              vehicle.station.coordinates, 
              config.homeLocation
            );
            const distanceToWork = get().calculateDistance(
              vehicle.station.coordinates, 
              config.workLocation
            );

            // If station is closer to home, vehicles likely go to work (and vice versa)
            const direction: 'work' | 'home' | 'unknown' = distanceToHome < distanceToWork ? 'work' : 'home';
            
            return { ...vehicle, direction };
          });

          const now = new Date();
          set({
            vehicles: classifiedVehicles,
            lastUpdate: now,
            lastApiUpdate: now,
            lastCacheUpdate: now,
            isLoading: false,
            error: null,
            isUsingCachedData: false,
          });

          // Update cache stats
          get().getCacheStats();

          // Emit event for other stores/components
          StoreEventManager.emit(StoreEvents.VEHICLES_UPDATED, {
            vehicles: classifiedVehicles,
            timestamp: now,
            source: 'api',
          });

          logger.info('Vehicles refreshed successfully', {
            vehicleCount: classifiedVehicles.length,
            liveCount: classifiedVehicles.filter(v => v.isLive).length,
            scheduledCount: classifiedVehicles.filter(v => v.isScheduled).length,
            forceRefresh: options.forceRefresh,
          });

        } catch (error) {
          const errorState = StoreErrorHandler.createError(error, context);
          set({
            error: errorState,
            isLoading: false,
          });

          // Try to use cached data as fallback
          const cachedData = cacheManager.getCachedStale(`vehicles:${context.metadata?.agencyId}`);
          if (cachedData && Array.isArray(cachedData.data) && cachedData.data.length > 0) {
            set({
              vehicles: cachedData.data as EnhancedVehicleInfo[],
              isUsingCachedData: true,
              lastCacheUpdate: new Date(Date.now() - cachedData.age),
            });
            
            logger.warn('Using cached vehicle data due to fetch error', {
              cacheAge: cachedData.age,
              isStale: cachedData.isStale,
            });
          }
        }
      },

      refreshStations: async (forceRefresh = false) => {
        const context = StoreErrorHandler.createContext('VehicleStore', 'refreshStations', { forceRefresh });

        try {
          const configStore = await import('./configStore').then(m => m.useConfigStore.getState());
          const config = configStore.config;
          
          if (!config?.city || !config?.apiKey) {
            throw new Error('Configuration not available');
          }

          enhancedTranzyApi.setApiKey(config.apiKey);
          const agencyId = parseInt(config.agencyId!);

          const fetchStationData = async (): Promise<Station[]> => {
            const stops = await enhancedTranzyApi.getStops(agencyId, forceRefresh);
            
            // Convert API stops to Station format
            return stops.map((stop: any) => ({
              id: stop.stop_id?.toString() || stop.id?.toString() || '',
              name: stop.stop_name || stop.name || 'Unknown Station',
              coordinates: {
                latitude: stop.stop_lat || stop.latitude || 0,
                longitude: stop.stop_lon || stop.longitude || 0,
              },
              isFavorite: false, // Will be updated by favorites store
            }));
          };

          const stations = await StoreErrorHandler.withRetry(
            fetchStationData,
            context
          );

          set({ stations });
          
          logger.info('Stations refreshed successfully', { 
            stationCount: stations.length,
            forceRefresh,
          });

        } catch (error) {
          const errorState = StoreErrorHandler.createError(error, context);
          logger.error('Failed to refresh stations', { error: errorState.message });
        }
      },

      refreshScheduleData: async () => {
        const context = StoreErrorHandler.createContext('VehicleStore', 'refreshScheduleData');

        try {
          const configStore = await import('./configStore').then(m => m.useConfigStore.getState());
          const config = configStore.config;
          
          if (!config?.agencyId || !config?.apiKey) {
            return;
          }

          enhancedTranzyApi.setApiKey(config.apiKey);
          const agencyId = parseInt(config.agencyId);

          // Refresh schedule-related data (routes, stops, trips, stop_times)
          await Promise.allSettled([
            enhancedTranzyApi.getRoutes(agencyId, true),
            enhancedTranzyApi.getStops(agencyId, true),
            enhancedTranzyApi.getTrips(agencyId, undefined, true),
            enhancedTranzyApi.getStopTimes(agencyId, undefined, undefined, true),
          ]);

          logger.info('Schedule data refreshed', { agencyId });

        } catch (error) {
          const errorState = StoreErrorHandler.createError(error, context);
          logger.error('Failed to refresh schedule data', { error: errorState.message });
        }
      },

      refreshLiveData: async () => {
        const context = StoreErrorHandler.createContext('VehicleStore', 'refreshLiveData');

        try {
          const configStore = await import('./configStore').then(m => m.useConfigStore.getState());
          const config = configStore.config;
          
          if (!config?.agencyId || !config?.apiKey) {
            return;
          }

          // Refresh GPS location if permission is granted
          try {
            const { useLocationStore } = await import('./locationStore');
            const locationStore = useLocationStore.getState();
            
            if (locationStore.locationPermission === 'granted') {
              await locationStore.requestLocation();
              logger.debug('GPS location refreshed during live data update');
            }
          } catch (locationError) {
            locationWarningTracker.warnLocationRefresh(logger, locationError, 'VehicleStore');
            // Continue with data refresh even if GPS fails
          }

          enhancedTranzyApi.setApiKey(config.apiKey);
          const agencyId = parseInt(config.agencyId);

          // Get fresh vehicle data
          await enhancedTranzyApi.getVehicles(agencyId);
          
          // Refresh the vehicle display with new live data
          await get().refreshVehicles({ forceRefresh: false, includeLive: true });

          logger.debug('Live data refreshed', { agencyId });

        } catch (error) {
          const errorState = StoreErrorHandler.createError(error, context);
          logger.error('Failed to refresh live data', { error: errorState.message });
        }
      },

      forceRefreshAll: async () => {
        const context = StoreErrorHandler.createContext('VehicleStore', 'forceRefreshAll');
        set({ isLoading: true });

        try {
          const configStore = await import('./configStore').then(m => m.useConfigStore.getState());
          const config = configStore.config;
          
          if (!config?.agencyId || !config?.apiKey) {
            throw new Error('Configuration not available');
          }

          enhancedTranzyApi.setApiKey(config.apiKey);
          const agencyId = parseInt(config.agencyId);

          // Force refresh all data
          await enhancedTranzyApi.forceRefreshAll(agencyId);
          
          // Refresh all data types
          await Promise.allSettled([
            get().refreshVehicles({ forceRefresh: true }),
            get().refreshStations(true),
            get().refreshScheduleData(),
          ]);
          
          set({ isLoading: false });
          
          logger.info('Force refresh all completed', { agencyId });

        } catch (error) {
          const errorState = StoreErrorHandler.createError(error, context);
          set({
            error: errorState,
            isLoading: false,
          });
        }
      },

      // Actions - Data Fetching Methods (replaces data hooks)
      getStationData: async (options: {
        agencyId?: string;
        forceRefresh?: boolean;
        cacheMaxAge?: number;
      } = {}) => {
        const context = StoreErrorHandler.createContext('VehicleStore', 'getStationData', options);
        
        try {
          // Get configuration
          const configStore = await import('./configStore').then(m => m.useConfigStore.getState());
          const config = configStore.config;
          
          const agencyId = options.agencyId || config?.agencyId;
          if (!agencyId || !config?.apiKey) {
            throw new Error('Agency ID or API key not configured');
          }

          // Set API key for enhanced API
          enhancedTranzyApi.setApiKey(config.apiKey);
          
          const fetchStationData = async () => {
            return await enhancedTranzyApi.getStops(parseInt(agencyId), options.forceRefresh);
          };

          const stations = await StoreErrorHandler.withRetry(fetchStationData, context);
          
          // Update store state
          set({ stations });
          
          logger.info('Station data fetched via store method', {
            agencyId,
            count: stations.length,
            forceRefresh: options.forceRefresh
          });

          return {
            data: stations,
            isLoading: false,
            error: null,
            lastUpdated: new Date()
          };

        } catch (error) {
          const errorState = StoreErrorHandler.createError(error, context);
          logger.error('Store getStationData failed', { error: errorState.message });
          
          return {
            data: null,
            isLoading: false,
            error: errorState,
            lastUpdated: null
          };
        }
      },

      getVehicleData: async (options: {
        agencyId?: string;
        routeId?: string;
        forceRefresh?: boolean;
        cacheMaxAge?: number;
        autoRefresh?: boolean;
        refreshInterval?: number;
      } = {}) => {
        const context = StoreErrorHandler.createContext('VehicleStore', 'getVehicleData', options);
        
        try {
          // Get configuration
          const configStore = await import('./configStore').then(m => m.useConfigStore.getState());
          const config = configStore.config;
          
          const agencyId = options.agencyId || config?.agencyId;
          if (!agencyId || !config?.apiKey) {
            throw new Error('Agency ID or API key not configured');
          }

          // Set API key for enhanced API
          enhancedTranzyApi.setApiKey(config.apiKey);
          
          const fetchVehicleData = async () => {
            const routeId = options.routeId ? parseInt(options.routeId) : undefined;
            return await enhancedTranzyApi.getVehicles(parseInt(agencyId), routeId);
          };

          const vehicles = await StoreErrorHandler.withRetry(fetchVehicleData, context);
          
          logger.info('Vehicle data fetched via store method', {
            agencyId,
            routeId: options.routeId,
            count: vehicles.length,
            forceRefresh: options.forceRefresh
          });

          return {
            data: vehicles,
            isLoading: false,
            error: null,
            lastUpdated: new Date()
          };

        } catch (error) {
          const errorState = StoreErrorHandler.createError(error, context);
          logger.error('Store getVehicleData failed', { error: errorState.message });
          
          return {
            data: null,
            isLoading: false,
            error: errorState,
            lastUpdated: null
          };
        }
      },

      getRouteData: async (options: {
        agencyId?: string;
        forceRefresh?: boolean;
        cacheMaxAge?: number;
      } = {}) => {
        const context = StoreErrorHandler.createContext('VehicleStore', 'getRouteData', options);
        
        try {
          // Get configuration
          const configStore = await import('./configStore').then(m => m.useConfigStore.getState());
          const config = configStore.config;
          
          const agencyId = options.agencyId || config?.agencyId;
          if (!agencyId || !config?.apiKey) {
            throw new Error('Agency ID or API key not configured');
          }

          // Set API key for enhanced API
          enhancedTranzyApi.setApiKey(config.apiKey);
          
          const fetchRouteData = async () => {
            return await enhancedTranzyApi.getRoutes(parseInt(agencyId), options.forceRefresh);
          };

          const routes = await StoreErrorHandler.withRetry(fetchRouteData, context);
          
          logger.info('Route data fetched via store method', {
            agencyId,
            count: routes.length,
            forceRefresh: options.forceRefresh
          });

          return {
            data: routes,
            isLoading: false,
            error: null,
            lastUpdated: new Date()
          };

        } catch (error) {
          const errorState = StoreErrorHandler.createError(error, context);
          logger.error('Store getRouteData failed', { error: errorState.message });
          
          return {
            data: null,
            isLoading: false,
            error: errorState,
            lastUpdated: null
          };
        }
      },

      getStopTimesData: async (options: {
        agencyId?: string;
        tripId?: string;
        stopId?: string;
        forceRefresh?: boolean;
        cacheMaxAge?: number;
        autoRefresh?: boolean;
        refreshInterval?: number;
      } = {}) => {
        const context = StoreErrorHandler.createContext('VehicleStore', 'getStopTimesData', options);
        
        try {
          // Get configuration
          const configStore = await import('./configStore').then(m => m.useConfigStore.getState());
          const config = configStore.config;
          
          const agencyId = options.agencyId || config?.agencyId;
          if (!agencyId || !config?.apiKey) {
            throw new Error('Agency ID or API key not configured');
          }

          // Set API key for enhanced API
          enhancedTranzyApi.setApiKey(config.apiKey);
          
          const fetchStopTimesData = async () => {
            const stopId = options.stopId ? parseInt(options.stopId) : undefined;
            return await enhancedTranzyApi.getStopTimes(
              parseInt(agencyId), 
              stopId, 
              options.tripId, 
              options.forceRefresh
            );
          };

          const stopTimes = await StoreErrorHandler.withRetry(fetchStopTimesData, context);
          
          logger.info('Stop times data fetched via store method', {
            agencyId,
            stopId: options.stopId,
            tripId: options.tripId,
            count: stopTimes.length,
            forceRefresh: options.forceRefresh
          });

          return {
            data: stopTimes,
            isLoading: false,
            error: null,
            lastUpdated: new Date()
          };

        } catch (error) {
          const errorState = StoreErrorHandler.createError(error, context);
          logger.error('Store getStopTimesData failed', { error: errorState.message });
          
          return {
            data: null,
            isLoading: false,
            error: errorState,
            lastUpdated: null
          };
        }
      },

      // Actions - Auto Refresh using shared manager
      startAutoRefresh: () => {
        const { isAutoRefreshEnabled } = get();
        if (isAutoRefreshEnabled) return;

        // Get refresh rate from config
        import('./configStore').then(m => {
          const config = m.useConfigStore.getState().config;
          if (!config?.refreshRate) {
            logger.warn('Cannot start auto refresh: refresh rate not configured');
            return;
          }

          // Start live data refresh using shared auto-refresh manager
          autoRefreshManager.start({
            key: 'vehicles-live',
            callback: () => get().refreshLiveData(),
            intervalMs: config.refreshRate,
            immediate: false,
            onError: (error) => {
              logger.error('Auto-refresh error for live data', { error: error.message });
            },
          });

          // Start schedule data refresh (daily at 3 AM)
          const now = new Date();
          const tomorrow3AM = new Date(now);
          tomorrow3AM.setDate(tomorrow3AM.getDate() + 1);
          tomorrow3AM.setHours(3, 0, 0, 0);
          
          const msUntil3AM = tomorrow3AM.getTime() - now.getTime();
          
          setTimeout(() => {
            autoRefreshManager.start({
              key: 'vehicles-schedule',
              callback: () => get().refreshScheduleData(),
              intervalMs: 24 * 60 * 60 * 1000, // 24 hours
              immediate: true,
              onError: (error) => {
                logger.error('Auto-refresh error for schedule data', { error: error.message });
              },
            });
          }, msUntil3AM);

          set({ isAutoRefreshEnabled: true });
          
          logger.info('Auto refresh started', {
            liveInterval: `${config.refreshRate / 1000} seconds`,
            scheduleInterval: 'daily at 3 AM',
          });
        });
      },

      stopAutoRefresh: () => {
        autoRefreshManager.stop('vehicles-live');
        autoRefreshManager.stop('vehicles-schedule');
        
        set({ isAutoRefreshEnabled: false });
        logger.info('Auto refresh stopped');
      },

      manualRefresh: async () => {
        logger.info('Manual refresh triggered');
        await get().refreshVehicles({ forceRefresh: false });
      },

      // Actions - Cache Management
      getCacheStats: () => {
        const stats = cacheManager.getStats();
        set({ cacheStats: stats });
      },

      clearCache: () => {
        cacheManager.clearAll();
        enhancedTranzyApi.clearCache();
        
        set({
          vehicles: [],
          stations: [],
          lastUpdate: null,
          lastApiUpdate: null,
          lastCacheUpdate: null,
          isUsingCachedData: false,
          cacheStats: {
            totalEntries: 0,
            totalSize: 0,
            entriesByType: {},
            entriesWithTimestamps: {},
            lastCacheUpdate: 0,
          },
        });
        
        logger.info('All vehicle cache cleared');
      },

      clearError: () => {
        set({ error: null });
      },

      // Helper Methods
      calculateDistance: (from: Coordinates, to: Coordinates): number => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = from.latitude * Math.PI / 180;
        const φ2 = to.latitude * Math.PI / 180;
        const Δφ = (to.latitude - from.latitude) * Math.PI / 180;
        const Δλ = (to.longitude - from.longitude) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
      },
    }),
    {
      name: 'vehicle-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist non-sensitive, non-volatile data
      partialize: (state) => ({
        lastUpdate: state.lastUpdate,
        lastApiUpdate: state.lastApiUpdate,
        lastCacheUpdate: state.lastCacheUpdate,
        cacheStats: state.cacheStats,
        isAutoRefreshEnabled: state.isAutoRefreshEnabled,
      }),
    }
  )
);

// Connection status monitoring
if (typeof window !== 'undefined') {
  // Monitor online/offline status
  const updateConnectionStatus = () => {
    useVehicleStore.setState({ isOnline: navigator.onLine });
    
    if (navigator.onLine) {
      logger.info('Network connection restored');
      // Optionally trigger a refresh when coming back online
      const store = useVehicleStore.getState();
      if (store.isAutoRefreshEnabled) {
        store.refreshVehicles().catch(error => {
          logger.warn('Failed to refresh vehicles after reconnection', { error });
        });
      }
    } else {
      logger.warn('Network connection lost');
    }
  };

  window.addEventListener('online', updateConnectionStatus);
  window.addEventListener('offline', updateConnectionStatus);

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    useVehicleStore.getState().stopAutoRefresh();
  });

  // Pause/resume auto-refresh on visibility change
  document.addEventListener('visibilitychange', () => {
    const store = useVehicleStore.getState();
    if (document.hidden) {
      if (store.isAutoRefreshEnabled) {
        autoRefreshManager.pauseAll();
      }
    } else {
      if (store.isAutoRefreshEnabled) {
        autoRefreshManager.resumeAll();
      }
    }
  });
}