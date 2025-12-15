import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ErrorState } from '../types';
import { favoriteBusService, type FavoriteBusResult } from '../services/favoriteBusService';
import { enhancedTranzyApi } from '../services/tranzyApiService';
import { useConfigStore } from './configStore';
import { useLocationStore } from './locationStore';
import { cacheManager, CacheKeys } from '../services/cacheManager';
import { logger } from '../utils/logger';

export interface FavoriteBusStore {
  // Data
  favoriteBusResult: FavoriteBusResult | null;
  availableRoutes: { 
    shortName: string; // PRIMARY: What users see and interact with
    name: string; 
    longName: string; 
    description?: string; 
    type: 'bus' | 'trolleybus' | 'tram' | 'metro' | 'rail' | 'ferry' | 'other';
  }[];
  lastUpdate: Date | null;
  isLoading: boolean;
  error: ErrorState | null;
  
  // Simple favorites (for backward compatibility)
  favorites: {
    buses: string[];
    stations: string[];
  };
  
  // Actions
  refreshFavorites: () => Promise<void>;
  loadAvailableRoutes: () => Promise<void>;
  loadCachedData: () => void;
  clearError: () => void;
  
  // Simple favorites actions
  addFavoriteBus: (routeShortName: string) => void;
  removeFavoriteBus: (routeShortName: string) => void;
  addFavoriteStation: (stationId: string) => void;
  removeFavoriteStation: (stationId: string) => void;
  getFilteredStations: () => any[]; // For test compatibility
  
  // Auto-refresh system
  isAutoRefreshEnabled: boolean;
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
  manualRefresh: () => Promise<void>;
  updateRefreshRate: () => void;
  
  // Cache subscription system
  subscribeToCacheChanges: () => void;
  unsubscribeFromCacheChanges: () => void;
}

// Global refresh interval
let autoRefreshInterval: number | null = null;
// Cache subscription cleanup functions
let cacheUnsubscribers: (() => void)[] = [];

export const useFavoriteBusStore = create<FavoriteBusStore>()(
  persist(
    (set, get) => ({
      // Initial state
      favoriteBusResult: null,
      availableRoutes: [],
      lastUpdate: null,
      isLoading: false,
      error: null,
      isAutoRefreshEnabled: false,
      favorites: {
        buses: [],
        stations: [],
      },

      // Refresh favorite buses
      refreshFavorites: async () => {
        const { config } = useConfigStore.getState();
        const { currentLocation, requestLocation } = useLocationStore.getState();
        
        if (!config?.favoriteBuses || config.favoriteBuses.length === 0) {
          set({
            favoriteBusResult: null,
            error: null
          });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          // Set API key in enhanced API service
          enhancedTranzyApi.setApiKey(config.apiKey);

          // Get location for direction detection (priority: current -> home -> work -> default Cluj center)
          let location = currentLocation;
          if (!location) {
            try {
              location = await requestLocation();
            } catch (locationError) {
              logger.warn('Could not get current location, trying saved locations');
              // Fallback to saved locations
              if (config.homeLocation) {
                location = config.homeLocation;
                logger.info('Using home location as fallback');
              } else if (config.workLocation) {
                location = config.workLocation;
                logger.info('Using work location as fallback');
              } else {
                // Use configurable default location or Cluj-Napoca center as fallback
                location = config.defaultLocation || { latitude: 46.7712, longitude: 23.6236 };
                logger.info('Using default fallback location for direction detection', { location });
              }
            }
          }

          logger.info('Refreshing favorite buses', {
            favoriteRoutes: config.favoriteBuses,
            currentLocation: location,
            homeLocation: config.homeLocation
          });

          // Get favorite bus info (simplified - just live vehicles)
          const result = await favoriteBusService.getFavoriteBusInfo(
            config.favoriteBuses,
            config.city,
            location // Pass user's current location for closest stop calculation
          );

          const updateTime = new Date();
          set({
            favoriteBusResult: result,
            lastUpdate: updateTime,
            isLoading: false,
            error: null
          });

          logger.info('Favorite buses refreshed successfully', {
            count: result.favoriteBuses.length,
            updateTime: updateTime.toISOString()
          });

        } catch (error) {
          logger.error('Failed to refresh favorite buses', error);
          set({
            isLoading: false,
            error: {
              type: 'network',
              message: error instanceof Error ? error.message : 'Failed to refresh favorite buses',
              timestamp: new Date(),
              retryable: true
            }
          });
        }
      },

      // Load cached data immediately without triggering fetch
      loadCachedData: async () => {
        const { config } = useConfigStore.getState();
        const { currentLocation } = useLocationStore.getState();
        
        if (!config?.favoriteBuses || config.favoriteBuses.length === 0) {
          return;
        }

        // Set up cache subscriptions for reactive updates
        get().subscribeToCacheChanges();

        try {
          // Check if we have cached vehicle data that we can use
          const agencyId = parseInt(config.agencyId || '2'); // Default to CTP Cluj
          const vehicleCacheKey = CacheKeys.vehicles(agencyId);
          
          // Try to get cached data (even if stale)
          const cachedResult = cacheManager.getCachedStale(vehicleCacheKey);
          
          if (cachedResult) {
            logger.info('Found cached vehicle data on startup, processing immediately', {
              cacheAge: cachedResult.age,
              isStale: cachedResult.isStale,
              agencyId,
              cacheKey: vehicleCacheKey
            });
            
            // Process cached data immediately using the same service
            try {
              // Use fallback location if current location not available
              let location = currentLocation;
              if (!location) {
                if (config.homeLocation) {
                  location = config.homeLocation;
                } else if (config.workLocation) {
                  location = config.workLocation;
                } else {
                  location = config.defaultLocation || { latitude: 46.7712, longitude: 23.6236 };
                }
              }

              // Process cached data through favoriteBusService
              const result = await favoriteBusService.getFavoriteBusInfo(
                config.favoriteBuses,
                config.city,
                location
              );

              // Set the result immediately
              set({
                favoriteBusResult: result,
                lastUpdate: new Date(Date.now() - cachedResult.age),
                error: null
              });

              logger.info('Cached favorite bus data processed and displayed', {
                count: result.favoriteBuses.length,
                cacheAge: cachedResult.age
              });

            } catch (error) {
              logger.warn('Failed to process cached data, will wait for fresh fetch', error);
              // Set timestamp to indicate we tried to load cached data
              set({
                lastUpdate: new Date(Date.now() - cachedResult.age),
                error: null
              });
            }
          }
        } catch (error) {
          logger.warn('Failed to load cached vehicle data', error);
        }
      },

      // Load available routes
      loadAvailableRoutes: async () => {
        const { config } = useConfigStore.getState();
        
        if (!config?.agencyId || !config?.apiKey) {
          logger.warn('Cannot load available routes - missing agency ID or API key');
          return;
        }

        set({ isLoading: true, error: null });

        try {
          // Set API key in enhanced API service
          enhancedTranzyApi.setApiKey(config.apiKey);

          const agencyId = parseInt(config.agencyId);

          logger.info('Loading available routes for agency', { 
            agencyId, 
            city: config.city,
            hasApiKey: !!config.apiKey,
            apiKeyLength: config.apiKey?.length || 0
          });

          // Get routes for the agency
          const routes = await enhancedTranzyApi.getRoutes(agencyId);
          
          // Transform routes to the expected format
          const availableRoutes = routes.map(route => ({
            shortName: route.shortName, // route_short_name: What users see and interact with ("100", "101")
            name: route.shortName, // Use shortName as name for compatibility
            longName: route.longName, // route_long_name: Full description ("Piața Unirii - Mănăștur")
            type: route.type as 'bus' | 'trolleybus' | 'tram' | 'metro' | 'rail' | 'ferry' | 'other'
          }));

          set({
            availableRoutes,
            isLoading: false,
            error: null
          });

          logger.info('Available routes loaded successfully', { 
            count: availableRoutes.length,
            city: config.city,
            agencyId 
          });

        } catch (error) {
          logger.error('Failed to load available routes', error);
          
          // Check if it's an authentication error
          const isAuthError = error instanceof Error && 
            (error.message.includes('403') || 
             error.message.includes('Unauthorized') || 
             error.message.includes('Forbidden'));
          
          const errorMessage = isAuthError 
            ? 'API key is invalid or expired. Please get a new API key from tranzy.ai and update it in Settings.'
            : (error instanceof Error ? error.message : 'Failed to load available routes');
          
          set({
            isLoading: false,
            availableRoutes: [],
            error: {
              type: isAuthError ? 'authentication' : 'network',
              message: errorMessage,
              timestamp: new Date(),
              retryable: false // Don't retry with invalid API key
            }
          });
        }
      },

      // Clear error state
      clearError: () => {
        set({ error: null });
      },

      // Simple favorites actions (for backward compatibility)
      addFavoriteBus: (routeShortName: string) => {
        const currentFavorites = get().favorites;
        if (!currentFavorites.buses.includes(routeShortName)) {
          set({
            favorites: {
              ...currentFavorites,
              buses: [...currentFavorites.buses, routeShortName],
            },
          });
        }
      },

      removeFavoriteBus: (routeShortName: string) => {
        const currentFavorites = get().favorites;
        set({
          favorites: {
            ...currentFavorites,
            buses: currentFavorites.buses.filter(bus => bus !== routeShortName),
          },
        });
      },

      addFavoriteStation: (stationId: string) => {
        const currentFavorites = get().favorites;
        if (!currentFavorites.stations.includes(stationId)) {
          set({
            favorites: {
              ...currentFavorites,
              stations: [...currentFavorites.stations, stationId],
            },
          });
        }
      },

      removeFavoriteStation: (stationId: string) => {
        const currentFavorites = get().favorites;
        set({
          favorites: {
            ...currentFavorites,
            stations: currentFavorites.stations.filter(station => station !== stationId),
          },
        });
      },

      getFilteredStations: () => {
        // Simple implementation for test compatibility
        return [];
      },

      // Manual refresh
      manualRefresh: async () => {
        logger.info('Manual refresh triggered for favorite buses');
        await get().refreshFavorites();
      },

      // Start auto-refresh
      startAutoRefresh: () => {
        const state = get();
        if (state.isAutoRefreshEnabled) return;

        // Get user's configured refresh rate
        const { config } = useConfigStore.getState();
        const refreshRate = config?.refreshRate || 60000; // Default to 1 minute if not configured

        logger.info('Starting auto-refresh for favorite buses', { refreshRate: `${refreshRate / 1000}s` });
        
        // Initial refresh
        state.refreshFavorites();
        
        // Set up interval using user's configured refresh rate
        autoRefreshInterval = window.setInterval(() => {
          const currentState = get();
          if (currentState.isAutoRefreshEnabled) {
            logger.debug('Auto-refreshing favorite buses');
            currentState.refreshFavorites();
          }
        }, refreshRate); // Use user's configured refresh rate

        set({ isAutoRefreshEnabled: true });
      },

      // Stop auto-refresh
      stopAutoRefresh: () => {
        logger.info('Stopping auto-refresh for favorite buses');
        
        if (autoRefreshInterval) {
          clearInterval(autoRefreshInterval);
          autoRefreshInterval = null;
        }
        
        set({ isAutoRefreshEnabled: false });
      },

      // Update refresh rate (restart auto-refresh with new rate)
      updateRefreshRate: () => {
        const state = get();
        if (state.isAutoRefreshEnabled) {
          // Restart auto-refresh with new rate
          state.stopAutoRefresh();
          state.startAutoRefresh();
        }
      },

      // Subscribe to cache changes to update components when cache is updated externally
      subscribeToCacheChanges: () => {
        const { config } = useConfigStore.getState();
        
        if (!config?.favoriteBuses || config.favoriteBuses.length === 0) {
          return;
        }

        // Clean up existing subscriptions
        get().unsubscribeFromCacheChanges();

        const agencyId = parseInt(config.agencyId || '2');
        const vehicleCacheKey = CacheKeys.vehicles(agencyId);

        // Subscribe to vehicle cache updates
        const unsubscribe = cacheManager.subscribe(vehicleCacheKey, async (event) => {
          if (event.type === 'updated' && event.data) {
            logger.info('Cache updated externally, processing new data', {
              cacheKey: vehicleCacheKey,
              timestamp: event.timestamp
            });

            try {
              // Process the updated cache data
              const { currentLocation } = useLocationStore.getState();
              let location = currentLocation;
              
              if (!location) {
                if (config.homeLocation) {
                  location = config.homeLocation;
                } else if (config.workLocation) {
                  location = config.workLocation;
                } else {
                  location = config.defaultLocation || { latitude: 46.7712, longitude: 23.6236 };
                }
              }

              // Process the new cache data
              const result = await favoriteBusService.getFavoriteBusInfo(
                config.favoriteBuses,
                config.city,
                location
              );

              // Update the store with new data
              set({
                favoriteBusResult: result,
                lastUpdate: new Date(event.timestamp),
                error: null,
                isLoading: false
              });

              logger.info('Components updated from cache change', {
                count: result.favoriteBuses.length,
                timestamp: event.timestamp
              });

            } catch (error) {
              logger.warn('Failed to process cache update', error);
            }
          }
        });

        // Store the unsubscriber
        cacheUnsubscribers.push(unsubscribe);

        logger.info('Subscribed to cache changes', { cacheKey: vehicleCacheKey });
      },

      // Unsubscribe from cache changes
      unsubscribeFromCacheChanges: () => {
        cacheUnsubscribers.forEach(unsubscribe => unsubscribe());
        cacheUnsubscribers = [];
        logger.info('Unsubscribed from cache changes');
      }
    }),
    {
      name: 'bus-tracker-favorites',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist non-sensitive data
        availableRoutes: state.availableRoutes,
        lastUpdate: state.lastUpdate,
        isAutoRefreshEnabled: state.isAutoRefreshEnabled,
        favorites: state.favorites
      })
    }
  )
);

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
    }
    // Clean up cache subscriptions
    cacheUnsubscribers.forEach(unsubscribe => unsubscribe());
    cacheUnsubscribers = [];
  });
}