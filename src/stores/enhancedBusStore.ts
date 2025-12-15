import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ErrorState, EnhancedVehicleInfo } from '../types';
import { useConfigStore } from './configStore';
import { enhancedTranzyApi } from '../services/tranzyApiService';
import { logger } from '../utils/logger';

export interface EnhancedBusStore {
  // Data
  buses: EnhancedVehicleInfo[]; // Note: keeping 'buses' name for UI compatibility
  lastUpdate: Date | null;
  lastApiUpdate: Date | null; // When we last received fresh data from API
  lastCacheUpdate: Date | null; // When we last updated cache
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
  
  // Actions
  refreshBuses: (forceRefresh?: boolean) => Promise<void>;
  refreshScheduleData: () => Promise<void>;
  refreshLiveData: () => Promise<void>;
  forceRefreshAll: () => Promise<void>;
  clearError: () => void;
  
  // Auto-refresh system
  isAutoRefreshEnabled: boolean;
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
  manualRefresh: () => Promise<void>;
  
  // Cache management
  getCacheStats: () => void;
  clearCache: () => void;
  
  // Helper methods
  calculateDistance: (from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) => number;
}

// Global refresh intervals
let liveDataInterval: number | null = null;
let scheduleDataInterval: number | null = null;

export const useEnhancedBusStore = create<EnhancedBusStore>()(
  persist(
    (set, get) => ({
      buses: [],
      lastUpdate: null,
      lastApiUpdate: null,
      lastCacheUpdate: null,
      isLoading: false,
      error: null,
      cacheStats: {
        totalEntries: 0,
        totalSize: 0,
        entriesByType: {},
        entriesWithTimestamps: {},
        lastCacheUpdate: 0,
      },
      isAutoRefreshEnabled: false,

      refreshBuses: async (forceRefresh = false) => {
        set({ isLoading: true, error: null });
        
        try {
          const config = useConfigStore.getState().config;
          if (!config?.city || !config?.apiKey) {
            throw new Error('Configuration not available');
          }

          // Set API key
          enhancedTranzyApi.setApiKey(config.apiKey);

          // Use the stored agency ID instead of looking up by name
          if (!config.agencyId) {
            throw new Error('Agency ID not configured');
          }
          
          const agencyId = parseInt(config.agencyId);

          // Get enhanced vehicle information
          const enhancedVehicles = await enhancedTranzyApi.getEnhancedVehicleInfo(
            agencyId,
            undefined, // stopId - get all stops
            undefined, // routeId - get all routes
            forceRefresh
          );

          // Classify vehicles by direction using user locations
          const classifiedVehicles = enhancedVehicles.map((vehicle) => {
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
            buses: classifiedVehicles,
            lastUpdate: now,
            lastApiUpdate: now, // Fresh API data received
            lastCacheUpdate: now, // Cache updated with fresh data
            isLoading: false,
          });

          // Update cache stats
          get().getCacheStats();

          logger.info('Enhanced vehicles refreshed', {
            vehicleCount: classifiedVehicles.length,
            liveCount: classifiedVehicles.filter(v => v.isLive).length,
            scheduledCount: classifiedVehicles.filter(v => v.isScheduled).length,
            forceRefresh,
          }, 'BUS_STORE');

        } catch (error) {
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

          logger.error('Failed to refresh buses', { error, forceRefresh }, 'BUS_STORE');
        }
      },

      refreshScheduleData: async () => {
        try {
          const config = useConfigStore.getState().config;
          if (!config?.agencyId || !config?.apiKey) return;

          enhancedTranzyApi.setApiKey(config.apiKey);
          
          const agencyId = parseInt(config.agencyId);

          // Refresh schedule-related data (routes, stops, trips, stop_times)
          await Promise.allSettled([
            enhancedTranzyApi.getRoutes(agencyId, true),
            enhancedTranzyApi.getStops(agencyId, true),
            enhancedTranzyApi.getTrips(agencyId, undefined, true),
            enhancedTranzyApi.getStopTimes(agencyId, undefined, undefined, true),
          ]);

          logger.info('Schedule data refreshed', { agencyId }, 'BUS_STORE');
          
        } catch (error) {
          logger.warn('Failed to refresh schedule data', { error }, 'BUS_STORE');
        }
      },

      refreshLiveData: async () => {
        try {
          const config = useConfigStore.getState().config;
          if (!config?.agencyId || !config?.apiKey) return;

          // Refresh GPS location if permission is granted
          try {
            const { useLocationStore } = await import('./locationStore');
            const locationStore = useLocationStore.getState();
            
            if (locationStore.locationPermission === 'granted') {
              await locationStore.requestLocation();
              logger.debug('GPS location refreshed during auto refresh', {}, 'BUS_STORE');
            }
          } catch (locationError) {
            logger.warn('Failed to refresh GPS location during auto refresh:', locationError, 'BUS_STORE');
            // Continue with data refresh even if GPS fails
          }

          enhancedTranzyApi.setApiKey(config.apiKey);
          
          const agencyId = parseInt(config.agencyId);

          // Get fresh vehicle data
          await enhancedTranzyApi.getVehicles(agencyId);
          
          // Refresh the bus display with new live data
          await get().refreshBuses(false); // Don't force refresh schedule data

          logger.debug('Live data refreshed', { agencyId }, 'BUS_STORE');
          
        } catch (error) {
          logger.warn('Failed to refresh live data', { error }, 'BUS_STORE');
        }
      },

      forceRefreshAll: async () => {
        set({ isLoading: true });
        
        try {
          const config = useConfigStore.getState().config;
          if (!config?.agencyId || !config?.apiKey) {
            throw new Error('Configuration not available');
          }

          enhancedTranzyApi.setApiKey(config.apiKey);
          
          const agencyId = parseInt(config.agencyId);

          // Force refresh all data
          await enhancedTranzyApi.forceRefreshAll(agencyId);
          
          // Refresh buses with fresh data
          await get().refreshBuses(true);
          
          set({ 
            cacheStats: { 
              ...get().cacheStats, 
              lastRefresh: new Date() 
            } 
          });

          logger.info('Force refresh all completed', { agencyId }, 'BUS_STORE');
          
        } catch (error) {
          const errorState: ErrorState = {
            type: 'network',
            message: error instanceof Error ? error.message : 'Force refresh failed',
            timestamp: new Date(),
            retryable: true,
          };
          
          set({
            error: errorState,
            isLoading: false,
          });

          logger.error('Force refresh all failed', { error }, 'BUS_STORE');
        }
      },

      clearError: () => {
        set({ error: null });
      },

      startAutoRefresh: () => {
        const config = useConfigStore.getState().config;
        if (!config?.refreshRate) return;

        // Stop existing intervals
        get().stopAutoRefresh();

        // Start live data refresh using user's refresh rate setting
        liveDataInterval = setInterval(() => {
          get().refreshLiveData();
        }, config.refreshRate); // Use user's setting

        // Start schedule data refresh (daily at 3 AM)
        const now = new Date();
        const tomorrow3AM = new Date(now);
        tomorrow3AM.setDate(tomorrow3AM.getDate() + 1);
        tomorrow3AM.setHours(3, 0, 0, 0);
        
        const msUntil3AM = tomorrow3AM.getTime() - now.getTime();
        
        setTimeout(() => {
          get().refreshScheduleData();
          
          // Then refresh daily
          scheduleDataInterval = setInterval(() => {
            get().refreshScheduleData();
          }, 24 * 60 * 60 * 1000); // 24 hours
          
        }, msUntil3AM);

        set({ isAutoRefreshEnabled: true });
        
        logger.info('Auto refresh started', {
          liveInterval: `${config.refreshRate / 1000} seconds`,
          scheduleInterval: 'daily at 3 AM',
        }, 'BUS_STORE');
      },

      stopAutoRefresh: () => {
        if (liveDataInterval) {
          clearInterval(liveDataInterval);
          liveDataInterval = null;
        }
        
        if (scheduleDataInterval) {
          clearInterval(scheduleDataInterval);
          scheduleDataInterval = null;
        }

        set({ isAutoRefreshEnabled: false });
        logger.info('Auto refresh stopped', {}, 'BUS_STORE');
      },

      manualRefresh: async () => {
        logger.info('Manual refresh triggered', {}, 'BUS_STORE');
        await get().refreshBuses(false);
      },

      getCacheStats: () => {
        const stats = enhancedTranzyApi.getCacheStats();
        set({ cacheStats: stats });
      },

      clearCache: () => {
        enhancedTranzyApi.clearCache();
        set({
          buses: [],
          lastUpdate: null,
          cacheStats: {
            totalEntries: 0,
            totalSize: 0,
            entriesByType: {},
            entriesWithTimestamps: {},
            lastCacheUpdate: 0,
          },
        });
        logger.info('Cache cleared from store', {}, 'BUS_STORE');
      },

      calculateDistance: (from, to) => {
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
      name: 'bus-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist non-sensitive data
      partialize: (state) => ({
        lastUpdate: state.lastUpdate,
        cacheStats: state.cacheStats,
      }),
    }
  )
);