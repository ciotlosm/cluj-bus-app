/**
 * Station Filtering Hook
 * Main hook for location-based station filtering with favorites integration and vehicle data
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocationStore } from '../stores/locationStore';
import { useStationStore } from '../stores/stationStore';
import { useTripStore } from '../stores/tripStore';
import { useVehicleStore } from '../stores/vehicleStore';
import { useRouteStore } from '../stores/routeStore';
import { useFavoritesStore } from '../stores/favoritesStore';
import { 
  formatDistance,
  getStationTypeColor,
  getStationTypeLabel,
  useAllStationsStrategy,
  useSmartFilteringStrategy
} from '../utils/station/stationFilterUtils';
import { CACHE_DURATIONS } from '../utils/core/constants';
import type { StationFilterResult, FilteredStation } from '../types/stationFilter';

export function useStationFilter(): StationFilterResult {
  const { currentPosition, loading: locationLoading, error: locationError } = useLocationStore();
  const { stops, loading: stationLoading, error: stationError } = useStationStore();
  const { stopTimes, loading: tripLoading, error: tripError, loadStopTimes } = useTripStore();
  const { vehicles, loading: vehicleLoading, error: vehicleError, loadVehicles } = useVehicleStore();
  const { 
    routes: allRoutes, 
    loading: routeLoading, 
    error: routeError,
    loadRoutes 
  } = useRouteStore();
  
  // Safely access favorites store with error handling
  let favoriteRouteIds: Set<string>;
  let getFavoriteCount: () => number;
  let favoritesStoreAvailable = true;
  
  try {
    const favoritesStore = useFavoritesStore();
    favoriteRouteIds = favoritesStore.favoriteRouteIds;
    getFavoriteCount = favoritesStore.getFavoriteCount;
  } catch (error) {
    console.warn('Favorites store unavailable, disabling favorites filtering:', error);
    favoriteRouteIds = new Set<string>();
    getFavoriteCount = () => 0;
    favoritesStoreAvailable = false;
  }
  
  const [isFiltering, setIsFiltering] = useState(true);
  const [favoritesFilterEnabled, setFavoritesFilterEnabled] = useState(true);
  
  // Check if user has favorite routes configured
  const hasFavoriteRoutes = useMemo(() => {
    try {
      return getFavoriteCount() > 0;
    } catch (error) {
      console.warn('Error checking favorite routes count:', error);
      return false;
    }
  }, [getFavoriteCount]);
  
  // Auto-load stop times, vehicles, and routes when hook is used
  useEffect(() => {
    const loadData = async () => {
      const { useConfigStore } = await import('../stores/configStore');
      const { apiKey, agency_id } = useConfigStore.getState();
      
      if (apiKey && agency_id) {
        // Load stop times if not already loaded
        if (stopTimes.length === 0 && !tripLoading && !tripError) {
          loadStopTimes(apiKey, agency_id);
        }
        
        // Load vehicles if not already loaded (needed for route mapping)
        if (vehicles.length === 0 && !vehicleLoading && !vehicleError) {
          loadVehicles(apiKey, agency_id);
        } else if (vehicles.length > 0) {
          // Check if vehicle data is fresh and refresh if needed
          const vehicleStore = useVehicleStore.getState();
          if (!vehicleStore.isDataFresh(CACHE_DURATIONS.VEHICLES)) {
            loadVehicles(apiKey, agency_id);
          }
        }
        
        // Load routes if not already loaded (needed for vehicle display)
        if (allRoutes.length === 0 && !routeLoading && !routeError) {
          loadRoutes(apiKey, agency_id);
        }
      }
    };
    
    loadData();
  }, [stopTimes.length, tripLoading, tripError, loadStopTimes, vehicles.length, vehicleLoading, vehicleError, loadVehicles, allRoutes.length, routeLoading, routeError, loadRoutes]);
  
  const filteredStations = useMemo((): FilteredStation[] => {
    // Early return if no stations available
    if (stops.length === 0) {
      return [];
    }

    // Choose filtering strategy based on isFiltering flag
    if (!isFiltering) {
      // Show all stations sorted by distance
      return useAllStationsStrategy(
        stops,
        currentPosition,
        stopTimes,
        vehicles,
        allRoutes,
        favoriteRouteIds,
        favoritesStoreAvailable,
        favoritesFilterEnabled,
        hasFavoriteRoutes
      );
    }
    
    // Smart filtering is enabled - need location
    if (!currentPosition) {
      return []; // No location available for smart filtering
    }
    
    // Show only nearby relevant stations
    return useSmartFilteringStrategy(
      stops,
      currentPosition,
      stopTimes,
      vehicles,
      allRoutes,
      favoriteRouteIds,
      favoritesStoreAvailable,
      favoritesFilterEnabled,
      hasFavoriteRoutes
    );
  }, [stops, stopTimes, vehicles, allRoutes, currentPosition, isFiltering, favoriteRouteIds, favoritesFilterEnabled, hasFavoriteRoutes, favoritesStoreAvailable]);
  
  const toggleFiltering = useCallback(() => setIsFiltering(prev => !prev), []);
  const toggleFavoritesFilter = useCallback(() => {
    // Only allow toggling if favorites store is available
    if (favoritesStoreAvailable) {
      setFavoritesFilterEnabled(prev => !prev);
    } else {
      console.warn('Cannot toggle favorites filter: favorites store unavailable');
    }
  }, [favoritesStoreAvailable]);
  const retryFiltering = useCallback(() => {}, []); // No-op for simple implementation
  
  return {
    filteredStations,
    loading: locationLoading || stationLoading || tripLoading || vehicleLoading || routeLoading,
    error: locationError || stationError || tripError || vehicleError || routeError,
    isFiltering,
    totalStations: stops.length,
    toggleFiltering,
    retryFiltering,
    // Favorites filtering
    favoritesFilterEnabled: favoritesStoreAvailable ? favoritesFilterEnabled : false,
    toggleFavoritesFilter,
    hasFavoriteRoutes: favoritesStoreAvailable ? hasFavoriteRoutes : false,
    // Utility functions for UI formatting
    utilities: {
      formatDistance,
      getStationTypeColor,
      getStationTypeLabel
    }
  };
}