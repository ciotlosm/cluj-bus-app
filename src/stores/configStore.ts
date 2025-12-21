/**
 * Unified Configuration Store
 * Consolidates configuration, theme, and agency management into a single store
 * Replaces: appStore.ts, configStore.ts, agencyStore.ts, themeStore.ts
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ConfigStore, UserConfig, ErrorState, ThemeMode, FavoriteRoute } from '../types';
import { StoreEventManager, StoreEvents } from './shared/storeEvents';
import { StoreErrorHandler } from './shared/errorHandler';
import { enhancedTranzyApi, tranzyApiService } from '../services/api/tranzyApiService';
import { routeMappingService } from '../services/business-logic/routeMappingService';
import { logger, LogLevel } from '../utils/shared/logger';

// Simple encryption/decryption for sensitive data
const encryptData = (data: string): string => {
  return btoa(data);
};

const decryptData = (encryptedData: string): string => {
  try {
    return atob(encryptedData);
  } catch {
    return '';
  }
};

// Custom storage that encrypts sensitive fields
const createEncryptedStorage = () => ({
  getItem: (name: string): string | null => {
    const item = localStorage.getItem(name);
    if (!item) return null;
    
    try {
      const parsed = JSON.parse(item);
      if (parsed.state?.config?.apiKey) {
        parsed.state.config.apiKey = decryptData(parsed.state.config.apiKey);
      }
      return JSON.stringify(parsed);
    } catch {
      return item;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      const parsed = JSON.parse(value);
      if (parsed.state?.config?.apiKey) {
        parsed.state.config.apiKey = encryptData(parsed.state.config.apiKey);
      }
      localStorage.setItem(name, JSON.stringify(parsed));
    } catch {
      localStorage.setItem(name, value);
    }
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name);
  },
});

// Detect system theme preference
const getSystemTheme = (): ThemeMode => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark'; // Default to dark theme
};

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set, get) => ({
      // Configuration state
      config: null,
      isConfigured: false,
      isFullyConfigured: false,
      
      // Theme state (integrated from themeStore)
      theme: getSystemTheme(),
      
      // Agencies state (integrated from agencyStore)
      agencies: [],
      isAgenciesLoading: false,
      agenciesError: null,
      isApiValidated: false,

      // Configuration actions
      updateConfig: (updates: Partial<UserConfig>) => {
        const currentConfig = get().config;
        const updatedConfig = currentConfig 
          ? { ...currentConfig, ...updates }
          : updates as UserConfig;
        
        // Check what changed for event emission
        const changes: Record<string, any> = {};
        if (currentConfig) {
          Object.keys(updates).forEach(key => {
            if (currentConfig[key as keyof UserConfig] !== updatedConfig[key as keyof UserConfig]) {
              changes[key] = updatedConfig[key as keyof UserConfig];
            }
          });
        } else {
          Object.assign(changes, updates);
        }
        
        // Check configuration completeness
        const isConfigured = !!(
          updatedConfig.apiKey &&
          updatedConfig.refreshRate
        );
        
        const isFullyConfigured = !!(
          updatedConfig.city &&
          updatedConfig.agencyId &&
          updatedConfig.apiKey &&
          updatedConfig.refreshRate &&
          updatedConfig.homeLocation &&
          updatedConfig.workLocation
        );
        
        // Update route mapping cache duration if refresh rate changed
        const refreshRateChanged = currentConfig?.refreshRate !== updatedConfig.refreshRate;
        if (refreshRateChanged) {
          routeMappingService.updateCacheDuration();
        }

        // Sync log level with logger if it changed
        const logLevelChanged = currentConfig?.logLevel !== updatedConfig.logLevel;
        if (logLevelChanged && updatedConfig.logLevel !== undefined) {
          logger.setLogLevel(updatedConfig.logLevel as LogLevel);
        }

        // Reset API validation if API key changed
        const apiKeyChanged = currentConfig?.apiKey !== updatedConfig.apiKey;
        const newApiValidated = apiKeyChanged ? false : get().isApiValidated;
        
        set({
          config: updatedConfig,
          isConfigured,
          isFullyConfigured,
          isApiValidated: newApiValidated,
        });

        // Emit configuration change event
        StoreEventManager.emit(StoreEvents.CONFIG_CHANGED, {
          config: updatedConfig,
          changes,
        });

        logger.info('Configuration updated', { 
          hasApiKey: !!updatedConfig.apiKey,
          city: updatedConfig.city,
          isConfigured,
          isFullyConfigured,
          changes: Object.keys(changes),
        });
      },

      resetConfig: () => {
        set({ 
          config: null, 
          isConfigured: false,
          isFullyConfigured: false,
          isApiValidated: false,
          agencies: [], // Clear agencies when config is reset
        });

        // Emit configuration change event
        StoreEventManager.emit(StoreEvents.CONFIG_CHANGED, {
          config: null,
          changes: { reset: true },
        });

        logger.info('Configuration reset');
      },

      validateConfig: () => {
        const { config } = get();
        const isValid = Boolean(
          config?.apiKey && 
          config?.city && 
          config?.homeLocation && 
          config?.workLocation &&
          config?.agencyId
        );
        
        set({ isFullyConfigured: isValid });
        return isValid;
      },

      // Theme actions (integrated from themeStore)
      setTheme: (mode: ThemeMode) => {
        const currentTheme = get().theme;
        if (currentTheme !== mode) {
          set({ theme: mode });
          
          // Apply theme immediately to prevent flash
          if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-theme', mode);
          }

          // Emit theme change event
          StoreEventManager.emit(StoreEvents.THEME_CHANGED, {
            theme: mode,
            source: 'user',
          });

          logger.info('Theme changed', { theme: mode, source: 'user' });
        }
      },

      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        get().setTheme(newTheme);
      },

      // Agency actions (integrated from agencyStore)
      fetchAgencies: async () => {
        const { isAgenciesLoading } = get();
        
        if (isAgenciesLoading) {
          logger.warn('Agency fetch already in progress');
          return;
        }

        set({ isAgenciesLoading: true, agenciesError: null });
        logger.info('Starting agency fetch');

        try {
          const agencies = await StoreErrorHandler.withRetry(
            () => enhancedTranzyApi.getAgencies(),
            StoreErrorHandler.createContext('ConfigStore', 'fetchAgencies')
          );
          
          logger.info('Agencies fetched successfully', { 
            agencyCount: agencies.length 
          });
          
          set({
            agencies,
            isAgenciesLoading: false,
            agenciesError: null,
            isApiValidated: true,
          });

          // Emit API validation event
          StoreEventManager.emit(StoreEvents.API_KEY_VALIDATED, {
            isValid: true,
            agencies,
          });
        } catch (error) {
          const errorState = StoreErrorHandler.createError(error, 
            StoreErrorHandler.createContext('ConfigStore', 'fetchAgencies')
          );
          
          logger.error('Failed to fetch agencies', { error });
          
          set({
            agenciesError: errorState,
            isAgenciesLoading: false,
            isApiValidated: false,
          });

          // Emit API validation event
          StoreEventManager.emit(StoreEvents.API_KEY_VALIDATED, {
            isValid: false,
          });
        }
      },

      validateApiKey: async (apiKey: string) => {
        logger.info('Validating API key', { keyLength: apiKey.length });
        
        set({ isAgenciesLoading: true, agenciesError: null, isApiValidated: false });

        try {
          const service = tranzyApiService();
          service.setApiKey(apiKey);
          
          const isValid = await StoreErrorHandler.withRetry(
            () => service.validateApiKey(apiKey),
            StoreErrorHandler.createContext('ConfigStore', 'validateApiKey', { keyLength: apiKey.length })
          );
          
          if (!isValid) {
            // Create standardized authentication error for invalid API key
            const authError = new (await import('./shared/errorHandler')).AuthenticationError(
              'Invalid API key. Please check your key and try again.'
            );
            const errorState = StoreErrorHandler.createError(
              authError,
              StoreErrorHandler.createContext('ConfigStore', 'validateApiKey', { 
                keyLength: apiKey.length,
                validationResult: 'invalid'
              })
            );
            
            set({
              isAgenciesLoading: false,
              agenciesError: errorState,
              isApiValidated: false,
            });

            // Emit API validation event
            StoreEventManager.emit(StoreEvents.API_KEY_VALIDATED, {
              isValid: false,
            });
            
            return false;
          }

          // If validation successful, fetch and cache agencies
          const agencies = await service.getAgencies();
          
          set({
            agencies,
            isAgenciesLoading: false,
            agenciesError: null,
            isApiValidated: true,
          });
          
          logger.info('API validation and agency fetch successful', { 
            agencyCount: agencies.length,
          });

          // Emit API validation event
          StoreEventManager.emit(StoreEvents.API_KEY_VALIDATED, {
            isValid: true,
            agencies,
          });
          
          return true;
        } catch (error) {
          const errorState = StoreErrorHandler.createError(error,
            StoreErrorHandler.createContext('ConfigStore', 'validateApiKey', { keyLength: apiKey.length })
          );

          set({
            isAgenciesLoading: false,
            agenciesError: errorState,
            isApiValidated: false,
          });
          
          logger.error('API validation failed', { error });

          // Emit API validation event
          StoreEventManager.emit(StoreEvents.API_KEY_VALIDATED, {
            isValid: false,
          });
          
          return false;
        }
      },

      clearAgenciesError: () => {
        set({ agenciesError: null });
        logger.debug('Agencies error cleared');
      },

      // Favorites actions (integrated from removed FavoritesStore)
      addFavoriteRoute: (route: FavoriteRoute) => {
        try {
          const { config } = get();
          if (!config) {
            logger.warn('Cannot add favorite route - no configuration found');
            return;
          }

          const currentFavorites = config.favoriteRoutes || [];
          
          // Check if route already exists (by id)
          const existingIndex = currentFavorites.findIndex(fav => fav.id === route.id);
          if (existingIndex !== -1) {
            logger.debug('Route already in favorites', { routeId: route.id, routeName: route.routeName });
            return;
          }

          // Add new favorite route
          const updatedFavorites = [...currentFavorites, route];
          
          get().updateConfig({
            favoriteRoutes: updatedFavorites
          });

          logger.info('Added favorite route', { 
            routeId: route.id, 
            routeName: route.routeName,
            totalFavorites: updatedFavorites.length 
          });
        } catch (error) {
          const errorState = StoreErrorHandler.createError(error,
            StoreErrorHandler.createContext('ConfigStore', 'addFavoriteRoute', { routeId: route.id })
          );
          logger.error('Failed to add favorite route', { error, routeId: route.id });
          // Note: We don't set error state here as this is a simple operation
          // The error is logged for debugging purposes
        }
      },

      removeFavoriteRoute: (routeId: string) => {
        try {
          const { config } = get();
          if (!config) {
            logger.warn('Cannot remove favorite route - no configuration found');
            return;
          }

          const currentFavorites = config.favoriteRoutes || [];
          const updatedFavorites = currentFavorites.filter(fav => fav.id !== routeId);
          
          if (updatedFavorites.length === currentFavorites.length) {
            logger.debug('Route not found in favorites', { routeId });
            return;
          }

          get().updateConfig({
            favoriteRoutes: updatedFavorites
          });

          logger.info('Removed favorite route', { 
            routeId, 
            totalFavorites: updatedFavorites.length 
          });
        } catch (error) {
          const errorState = StoreErrorHandler.createError(error,
            StoreErrorHandler.createContext('ConfigStore', 'removeFavoriteRoute', { routeId })
          );
          logger.error('Failed to remove favorite route', { error, routeId });
        }
      },

      addFavoriteStation: (stationId: string) => {
        try {
          const { config } = get();
          if (!config) {
            logger.warn('Cannot add favorite station - no configuration found');
            return;
          }

          // Note: UserConfig doesn't have favoriteStations field, but we can extend it
          // For now, we'll use a simple array structure similar to favoriteRoutes
          const currentConfig = config as any;
          const currentFavoriteStations = currentConfig.favoriteStations || [];
          
          // Check if station already exists
          if (currentFavoriteStations.includes(stationId)) {
            logger.debug('Station already in favorites', { stationId });
            return;
          }

          // Add new favorite station
          const updatedFavoriteStations = [...currentFavoriteStations, stationId];
          
          get().updateConfig({
            ...config,
            favoriteStations: updatedFavoriteStations
          } as any);

          logger.info('Added favorite station', { 
            stationId, 
            totalFavorites: updatedFavoriteStations.length 
          });
        } catch (error) {
          const errorState = StoreErrorHandler.createError(error,
            StoreErrorHandler.createContext('ConfigStore', 'addFavoriteStation', { stationId })
          );
          logger.error('Failed to add favorite station', { error, stationId });
        }
      },

      removeFavoriteStation: (stationId: string) => {
        try {
          const { config } = get();
          if (!config) {
            logger.warn('Cannot remove favorite station - no configuration found');
            return;
          }

          const currentConfig = config as any;
          const currentFavoriteStations = currentConfig.favoriteStations || [];
          const updatedFavoriteStations = currentFavoriteStations.filter((id: string) => id !== stationId);
          
          if (updatedFavoriteStations.length === currentFavoriteStations.length) {
            logger.debug('Station not found in favorites', { stationId });
            return;
          }

          get().updateConfig({
            ...config,
            favoriteStations: updatedFavoriteStations
          } as any);

          logger.info('Removed favorite station', { 
            stationId, 
            totalFavorites: updatedFavoriteStations.length 
          });
        } catch (error) {
          const errorState = StoreErrorHandler.createError(error,
            StoreErrorHandler.createContext('ConfigStore', 'removeFavoriteStation', { stationId })
          );
          logger.error('Failed to remove favorite station', { error, stationId });
        }
      },

      getFavoriteRoutes: () => {
        const { config } = get();
        if (!config || !config.favoriteRoutes) {
          return [];
        }
        return config.favoriteRoutes;
      },

      getFavoriteStations: () => {
        const { config } = get();
        if (!config) {
          return [];
        }
        const configWithStations = config as any;
        return configWithStations.favoriteStations || [];
      },
    }),
    {
      name: 'unified-config-store',
      storage: createJSONStorage(() => createEncryptedStorage()),
      version: 3, // Increment for migration from separate stores
      migrate: (persistedState: any, version: number) => {
        logger.info('Migrating config store', { version, persistedState });
        
        // Migration from version 2 (separate stores) to version 3 (unified)
        if (version < 3) {
          // Try to preserve existing data structure
          if (persistedState?.config) {
            return {
              ...persistedState,
              theme: persistedState.theme || getSystemTheme(),
              agencies: persistedState.agencies || [],
              isApiValidated: persistedState.isApiValidated || false,
            };
          }
        }
        
        return persistedState;
      },
      // Only persist essential state, not loading/error states
      partialize: (state) => ({
        config: state.config,
        isConfigured: state.isConfigured,
        isFullyConfigured: state.isFullyConfigured,
        theme: state.theme,
        agencies: state.agencies,
        isApiValidated: state.isApiValidated,
      }),
    }
  )
);

// Initialize theme and log level on store creation
if (typeof window !== 'undefined') {
  // Apply initial theme to prevent flash
  const initialState = useConfigStore.getState();
  document.documentElement.setAttribute('data-theme', initialState.theme);
  
  // Set initial log level from config or default
  if (initialState.config?.logLevel !== undefined) {
    logger.setLogLevel(initialState.config.logLevel as LogLevel);
  } else {
    // Set default log level based on environment
    const defaultLevel = (window.location.hostname === 'localhost' ? 1 : 2) as LogLevel; // INFO for dev, WARN for prod
    logger.setLogLevel(defaultLevel);
  }

  // Listen for system theme changes
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleThemeChange = (e: MediaQueryListEvent) => {
      const { theme } = useConfigStore.getState();
      // Only update if current theme matches system preference (user hasn't manually overridden)
      if (theme === getSystemTheme()) {
        const newTheme = e.matches ? 'dark' : 'light';
        useConfigStore.getState().setTheme(newTheme);
        
        // Emit theme change event with system source
        StoreEventManager.emit(StoreEvents.THEME_CHANGED, {
          theme: newTheme,
          source: 'system',
        });
      }
    };
    
    mediaQuery.addEventListener('change', handleThemeChange);
  }
}