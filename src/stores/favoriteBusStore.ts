import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ErrorState } from '../types';
import { favoriteBusService, type FavoriteBusResult } from '../services/favoriteBusService';
import { enhancedTranzyApi } from '../services/enhancedTranzyApi';
import { useConfigStore } from './configStore';
import { useLocationStore } from './locationStore';
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
  
  // Actions
  refreshFavorites: () => Promise<void>;
  loadAvailableRoutes: () => Promise<void>;
  clearError: () => void;
  
  // Auto-refresh system
  isAutoRefreshEnabled: boolean;
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
  manualRefresh: () => Promise<void>;
  updateRefreshRate: () => void;
}

// Global refresh interval
let autoRefreshInterval: number | null = null;

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

      // Refresh favorite buses
      refreshFavorites: async () => {
        const { config } = useConfigStore.getState();
        const { currentLocation, requestLocation } = useLocationStore.getState();
        
        if (!config?.homeLocation || !config?.favoriteBuses || config.favoriteBuses.length === 0) {
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

          // Get current location if not available
          let location = currentLocation;
          if (!location) {
            try {
              location = await requestLocation();
            } catch (locationError) {
              logger.warn('Could not get current location, using home as fallback');
              location = config.homeLocation;
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

      // Load available routes
      loadAvailableRoutes: async () => {
        const { config } = useConfigStore.getState();
        
        if (!config?.city || !config?.apiKey) {
          logger.warn('Cannot load available routes - missing city or API key');
          return;
        }

        set({ isLoading: true, error: null });

        try {
          // Set API key in enhanced API service
          enhancedTranzyApi.setApiKey(config.apiKey);

          // Get agency ID for the city
          const agencies = await enhancedTranzyApi.getAgencies();
          const agency = agencies.find(a => a.name.toLowerCase().includes(config.city.toLowerCase()));
          
          if (!agency) {
            throw new Error(`No agency found for city: ${config.city}`);
          }

          logger.info('Loading available routes for agency', { 
            agencyId: agency.id, 
            city: config.city,
            hasApiKey: !!config.apiKey,
            apiKeyLength: config.apiKey?.length || 0
          });

          // Get routes for the agency
          const routes = await enhancedTranzyApi.getRoutes(parseInt(agency.id));
          
          // Transform routes to the expected format (using only short names as requested)
          const availableRoutes = routes.map(route => ({
            shortName: route.shortName, // PRIMARY: What users see and interact with
            name: route.shortName, // Use short name instead of long name
            longName: route.shortName, // Simplified - no need for long descriptions
            description: route.description,
            type: route.type as 'bus' | 'trolleybus' | 'tram' | 'metro' | 'rail' | 'ferry' | 'other'
          }));

          set({
            availableRoutes,
            isLoading: false,
            error: null
          });

          logger.info('Available routes loaded successfully', { 
            count: availableRoutes.length,
            city: config.city 
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
      }
    }),
    {
      name: 'favorite-bus-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist non-sensitive data
        availableRoutes: state.availableRoutes,
        lastUpdate: state.lastUpdate,
        isAutoRefreshEnabled: state.isAutoRefreshEnabled
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
  });
}