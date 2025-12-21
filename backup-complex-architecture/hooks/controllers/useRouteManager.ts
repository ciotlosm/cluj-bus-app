import { useState, useEffect, useMemo, useCallback } from 'react';
import { useConfigStore } from '../../stores/configStore';
import { useStoreEvent, StoreEvents } from '../../stores/shared/storeEvents';
import { getUniqueRouteTypes } from '../../utils/formatting/routeUtils';
import { logger } from '../../utils/shared/logger';

import { useRouteData } from '../shared/useStoreData';
// Error handling managed by store data hooks
import type { StandardError } from '../shared/errors/types';

import type { FavoriteRoute } from '../../types';
import type { Route } from '../../types/tranzyApi';

// Use the Route type from tranzyApi which matches what the API returns
type StoreRoute = Route;

export interface UseRouteManagerReturn {
  // State
  selectedRoutes: FavoriteRoute[];
  searchTerm: string;
  hasChanges: boolean;
  selectedTypes: string[];
  
  // Data
  availableRoutes: StoreRoute[];
  isLoading: boolean;
  config: any;
  error: StandardError | null;
  
  // Computed
  availableTypes: string[];
  favoriteRoutes: StoreRoute[];
  filteredAvailableRoutes: StoreRoute[];
  
  // Actions
  setSearchTerm: (term: string) => void;
  setSelectedTypes: (types: string[]) => void;
  handleToggleRoute: (routeName: string) => Promise<void>;
  handleSaveChanges: () => Promise<void>;
  handleTypeFilterChange: (event: React.MouseEvent<HTMLElement>, newTypes: string[]) => void;
  refetchRoutes: () => Promise<void>;
}

export const useRouteManager = (): UseRouteManagerReturn => {
  const { config, getFavoriteRoutes, addFavoriteRoute, removeFavoriteRoute } = useConfigStore();
  
  const [selectedRoutes, setSelectedRoutes] = useState<FavoriteRoute[]>(getFavoriteRoutes());
  const [searchTerm, setSearchTerm] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Use generic store data hook for route data
  const routeDataResult = useRouteData({ 
    agencyId: config?.agencyId,
    cacheMaxAge: 10 * 60 * 1000 // 10 minutes cache
  });

  const availableRoutes = routeDataResult.data || [];
  const isLoading = routeDataResult.isLoading;
  const error = routeDataResult.error;

  // Refetch function for manual refresh
  const refetchRoutes = useCallback(async () => {
    if (isLoading) {
      logger.debug('Refetch ignored - already loading', {}, 'ROUTE_MANAGER');
      return;
    }
    await routeDataResult.refetch();
  }, [isLoading, routeDataResult]);

  // Update selected routes when config changes
  useEffect(() => {
    const configRoutes = getFavoriteRoutes();
    setSelectedRoutes(configRoutes);
    setHasChanges(false);
    logger.debug('Updated selectedRoutes from config', { 
      routeCount: configRoutes.length,
      routes: configRoutes.map(r => r.routeName)
    }, 'ROUTE_MANAGER');
  }, [config?.favoriteRoutes, getFavoriteRoutes]); // Listen to the actual config changes

  // Listen to store events for real-time updates
  useStoreEvent(StoreEvents.CONFIG_CHANGED, (eventData) => {
    // Check if favorites changed
    if (eventData.changes.favoriteRoutes !== undefined) {
      const configRoutes = getFavoriteRoutes();
      setSelectedRoutes(configRoutes);
      logger.debug('Updated selectedRoutes from store event', { 
        routeCount: configRoutes.length,
        routes: configRoutes.map(r => r.routeName),
        changes: eventData.changes
      }, 'ROUTE_MANAGER');
    }
  }, [getFavoriteRoutes]);

  // Get unique route types for filtering
  const availableTypes = useMemo(() => {
    return getUniqueRouteTypes((availableRoutes || []) as any);
  }, [availableRoutes]);

  // Separate favorite and available routes
  const favoriteRoutes = useMemo(() => {
    if (!availableRoutes) return [];
    const selectedRouteNames = selectedRoutes.map(r => r.routeName);
    return availableRoutes.filter(route => selectedRouteNames.includes(route.routeName));
  }, [availableRoutes, selectedRoutes]);

  // Filter available routes based on search term and selected types
  const filteredAvailableRoutes = useMemo(() => {
    if (!availableRoutes) return [];
    const selectedRouteNames = selectedRoutes.map(r => r.routeName);
    return availableRoutes.filter(route => {
      // Exclude routes that are already in favorites
      if (selectedRouteNames.includes(route.routeName)) {
        return false;
      }
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (
        route.routeName?.toLowerCase().includes(searchLower) ||
        route.routeDesc?.toLowerCase().includes(searchLower)
      );
      
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(route.type);
      
      return matchesSearch && matchesType;
    });
  }, [availableRoutes, selectedRoutes, searchTerm, selectedTypes]);

  const handleToggleRoute = async (routeName: string): Promise<void> => {
    const isCurrentlySelected = selectedRoutes.some(r => r.routeName === routeName);
    
    // Optimistic UI update - update local state immediately for better UX
    if (isCurrentlySelected) {
      // Optimistically remove from local state
      const updatedRoutes = selectedRoutes.filter(r => r.routeName !== routeName);
      setSelectedRoutes(updatedRoutes);
      
      // Remove from favorites using Config Store method
      const routeToRemove = selectedRoutes.find(r => r.routeName === routeName);
      if (routeToRemove) {
        removeFavoriteRoute(routeToRemove.id);
        logger.info('Removed route from favorites', { routeName, routeId: routeToRemove.id }, 'ROUTE_MANAGER');
      }
    } else {
      // Add to favorites - find the complete route object and get proper route ID
      const routeToAdd = availableRoutes?.find(r => r.routeName === routeName);
      if (routeToAdd && config?.city) {
        try {
          // Import route mapping service dynamically to avoid circular dependencies
          const { routeMappingService } = await import('../../services/business-logic/routeMappingService');
          const routeMapping = await routeMappingService.getRouteMappingFromName(routeName, config.city);
          
          if (!routeMapping?.routeId) {
            logger.error('Cannot add route - no valid route ID found', { routeName }, 'ROUTE_MANAGER');
            return; // Don't add routes without proper IDs
          }
          
          const favoriteRoute: FavoriteRoute = {
            id: routeMapping.routeId, // Always use proper route ID from mapping service
            routeId: routeMapping.routeId,
            routeName: routeName,
            direction: 'to_work', // Default direction
                                                notifications: false,
      preferredStations: [],
      addedAt: new Date()
    };
          
          // Optimistically add to local state
          setSelectedRoutes(prev => [...prev, favoriteRoute]);
          
          // Use Config Store method to add favorite
          addFavoriteRoute(favoriteRoute);
          logger.info('Added route to favorites', { favoriteRoute }, 'ROUTE_MANAGER');
        } catch (error) {
          logger.error('Failed to get route mapping for route', { routeName, error }, 'ROUTE_MANAGER');
          // Don't add routes without proper mapping - this prevents API call failures
          logger.warn('Skipping route addition - route mapping service failed', { routeName }, 'ROUTE_MANAGER');
          return;
        }
      } else {
        return; // Exit early if route not found or no city configured
      }
    }
    
    // No need to manually save changes - Config Store methods handle persistence
    setHasChanges(false);
  };

  const handleSaveChanges = async (): Promise<void> => {
    // No longer needed - Config Store methods handle persistence automatically
    setHasChanges(false);
    logger.info('Save changes called - using Config Store auto-persistence', {}, 'ROUTE_MANAGER');
  };

  const handleTypeFilterChange = (_event: React.MouseEvent<HTMLElement>, newTypes: string[]): void => {
    // Ensure only single selection - take the first type if multiple somehow selected
    const singleType = newTypes.length > 1 ? [newTypes[0]] : newTypes;
    setSelectedTypes(singleType);
  };

  return {
    // State
    selectedRoutes,
    searchTerm,
    hasChanges,
    selectedTypes,
    
    // Data
    availableRoutes,
    isLoading,
    config,
    error,
    
    // Computed
    availableTypes,
    favoriteRoutes,
    filteredAvailableRoutes,
    
    // Actions
    setSearchTerm,
    setSelectedTypes,
    handleToggleRoute,
    handleSaveChanges,
    handleTypeFilterChange,
    refetchRoutes,
  };
};