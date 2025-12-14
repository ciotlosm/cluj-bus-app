import { useState, useEffect, useMemo } from 'react';
import { useConfigStore } from '../stores/configStore';
import { useFavoriteBusStore } from '../stores/favoriteBusStore';
import { getUniqueRouteTypes } from '../utils/routeUtils';
import { logger } from '../utils/loggerFixed';

import type { FavoriteRoute } from '../types';

// Define the route type used by the store
type StoreRoute = {
  shortName: string; // PRIMARY: What users see and interact with
  name?: string; // Optional - might be undefined from API
  longName?: string; // Optional - might be undefined from API
  description?: string;
  type: 'bus' | 'trolleybus' | 'tram' | 'metro' | 'rail' | 'ferry' | 'other';
};

export interface UseFavoriteBusManagerReturn {
  // State
  selectedRoutes: FavoriteRoute[];
  searchTerm: string;
  hasChanges: boolean;
  selectedTypes: string[];
  
  // Data
  availableRoutes: StoreRoute[];
  isLoading: boolean;
  config: any;
  
  // Computed
  availableTypes: string[];
  favoriteRoutes: StoreRoute[];
  filteredAvailableRoutes: StoreRoute[];
  
  // Actions
  setSearchTerm: (term: string) => void;
  setSelectedTypes: (types: string[]) => void;
  handleToggleRoute: (routeShortName: string) => Promise<void>;
  handleSaveChanges: () => Promise<void>;
  handleTypeFilterChange: (event: React.MouseEvent<HTMLElement>, newTypes: string[]) => void;
}

export const useFavoriteBusManager = (): UseFavoriteBusManagerReturn => {
  const { config, updateConfig } = useConfigStore();
  const { availableRoutes, loadAvailableRoutes, isLoading } = useFavoriteBusStore();
  
  const [selectedRoutes, setSelectedRoutes] = useState<FavoriteRoute[]>(config?.favoriteBuses || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Load available routes when component mounts
  useEffect(() => {
    if (availableRoutes.length === 0 && config?.city) {
      logger.info('Loading available routes for city', { city: config.city }, 'FAVORITES');
      loadAvailableRoutes();
    }
  }, [availableRoutes.length, loadAvailableRoutes, config?.city]);

  // Update selected routes when config changes
  useEffect(() => {
    const configRoutes = config?.favoriteBuses || [];
    setSelectedRoutes(configRoutes);
    setHasChanges(false);
  }, [config?.favoriteBuses]);

  // Get unique route types for filtering
  const availableTypes = useMemo(() => {
    return getUniqueRouteTypes(availableRoutes as any);
  }, [availableRoutes]);

  // Separate favorite and available routes
  const favoriteRoutes = useMemo(() => {
    const selectedShortNames = selectedRoutes.map(r => r.shortName);
    return availableRoutes.filter(route => selectedShortNames.includes(route.shortName));
  }, [availableRoutes, selectedRoutes]);

  // Filter available routes based on search term and selected types
  const filteredAvailableRoutes = useMemo(() => {
    const selectedShortNames = selectedRoutes.map(r => r.shortName);
    return availableRoutes.filter(route => {
      // Exclude routes that are already in favorites
      if (selectedShortNames.includes(route.shortName)) {
        return false;
      }
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (
        route.shortName?.toLowerCase().includes(searchLower) ||
        route.name?.toLowerCase().includes(searchLower) ||
        route.description?.toLowerCase().includes(searchLower) ||
        route.longName?.toLowerCase().includes(searchLower)
      );
      
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(route.type);
      
      return matchesSearch && matchesType;
    });
  }, [availableRoutes, selectedRoutes, searchTerm, selectedTypes]);

  const handleToggleRoute = async (routeShortName: string): Promise<void> => {
    const isCurrentlySelected = selectedRoutes.some(r => r.shortName === routeShortName);
    
    if (isCurrentlySelected) {
      // Remove from favorites
      const newSelectedRoutes = selectedRoutes.filter(r => r.shortName !== routeShortName);
      setSelectedRoutes(newSelectedRoutes);
    } else {
      // Add to favorites - find the complete route object and get proper route ID
      const routeToAdd = availableRoutes.find(r => r.shortName === routeShortName);
      if (routeToAdd && config?.city) {
        try {
          // Import route mapping service dynamically to avoid circular dependencies
          const { routeMappingService } = await import('../services/routeMappingService');
          const routeMapping = await routeMappingService.getRouteMappingFromShortName(routeShortName, config.city);
          
          if (!routeMapping?.routeId) {
            console.error('❌ Cannot add route - no valid route ID found for:', routeShortName);
            return; // Don't add routes without proper IDs
          }
          
          const favoriteRoute: FavoriteRoute = {
            id: routeMapping.routeId, // Always use proper route ID from mapping service
            shortName: routeShortName,
            longName: routeToAdd.longName || routeMapping.routeLongName || `Route ${routeShortName}`,
            type: routeToAdd.type
          };
          const newSelectedRoutes = [...selectedRoutes, favoriteRoute];
          setSelectedRoutes(newSelectedRoutes);
          logger.info('Added route to favorites', { favoriteRoute }, 'FAVORITES');
        } catch (error) {
          logger.error('Failed to get route mapping for route', { routeShortName, error }, 'FAVORITES');
          // Don't add routes without proper mapping - this prevents API call failures
          logger.warn('Skipping route addition - route mapping service failed', { routeShortName }, 'FAVORITES');
          return;
        }
      }
    }
    
    setHasChanges(true);
  };

  const handleSaveChanges = async (): Promise<void> => {
    try {
      await updateConfig({ favoriteBuses: selectedRoutes });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save favorite buses:', error);
    }
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
  };
};