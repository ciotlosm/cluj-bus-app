import { useEffect } from 'react';
import { useFavoriteBusStore } from '../stores/favoriteBusStore';
import { useConfigStore } from '../stores/configStore';
import { getRouteLabel, getRouteTypeInfoById } from '../utils/busDisplayUtils';
import { logger } from '../utils/loggerFixed';

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
    availableRoutes 
  } = useFavoriteBusStore();
  const { config } = useConfigStore();

  // Note: Available routes loading disabled in simplified mode

  // Refresh favorites when component mounts or when favorite routes change
  useEffect(() => {
    if (config?.favoriteBuses && config.favoriteBuses.length > 0) {
      logger.info('Refreshing favorites for routes', { routes: config.favoriteBuses }, 'FAVORITES');
      refreshFavorites();
    }
  }, [config?.favoriteBuses, refreshFavorites]);

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