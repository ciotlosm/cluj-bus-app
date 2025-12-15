import { useEffect } from 'react';
import { useFavoriteBusStore } from '../stores/favoriteBusStore';
import { useConfigStore } from '../stores/configStore';
import { getRouteLabel, getRouteTypeInfoById } from '../utils/busDisplayUtils';
import { logger } from '../utils/logger';

export interface UseFavoriteBusDisplayReturn {
  // Data
  favoriteBusResult: any;
  isLoading: boolean;
  error: any;
  lastUpdate: Date | null;
  availableRoutes: any[];
  config: any;
  
  // Computed
  hasFavoriteRoutes: boolean;
  hasFavoriteBusData: boolean;
  
  // Actions
  refreshFavorites: () => Promise<void>;
  
  // Utilities
  getRouteLabel: (routeId: string) => string;
  getRouteTypeInfo: (routeId: string, theme?: any) => any;
}

export const useFavoriteBusDisplay = (): UseFavoriteBusDisplayReturn => {
  const { 
    favoriteBusResult, 
    isLoading, 
    error, 
    lastUpdate, 
    refreshFavorites, 
    loadCachedData,
    availableRoutes 
  } = useFavoriteBusStore();
  const { config } = useConfigStore();

  // Note: Available routes loading disabled in simplified mode

  // Load cached data immediately on mount (no automatic refresh)
  useEffect(() => {
    if (config?.favoriteBuses && config.favoriteBuses.length > 0) {
      // Only load cached data - no automatic refresh
      loadCachedData().catch((error) => {
        logger.warn('Failed to load cached data', error);
      });
      
      logger.info('Loaded cached data for favorite routes', { routes: config.favoriteBuses }, 'FAVORITES');
    }
  }, [config?.favoriteBuses, loadCachedData]);

  // Check if we have favorite buses configured
  const hasFavoriteRoutes = config?.favoriteBuses && config.favoriteBuses.length > 0;
  const hasFavoriteBusData = favoriteBusResult && favoriteBusResult.favoriteBuses.length > 0;

  // Helper functions
  const getRouteLabelHelper = (routeId: string): string => {
    return getRouteLabel(routeId, availableRoutes);
  };

  const getRouteTypeInfoHelper = (routeId: string, theme?: any) => {
    return getRouteTypeInfoById(routeId, availableRoutes, theme);
  };

  return {
    // Data
    favoriteBusResult,
    isLoading,
    error,
    lastUpdate,
    availableRoutes,
    config,
    
    // Computed
    hasFavoriteRoutes: !!hasFavoriteRoutes,
    hasFavoriteBusData: !!hasFavoriteBusData,
    
    // Actions
    refreshFavorites,
    
    // Utilities
    getRouteLabel: getRouteLabelHelper,
    getRouteTypeInfo: getRouteTypeInfoHelper,
  };
};