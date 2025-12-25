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
  getStationTypeLabel
} from '../utils/station/stationDisplayUtils';
import {
  filterStations
} from '../utils/station/stationFilterStrategies';
import { CACHE_DURATIONS } from '../utils/core/constants';
import { SECONDARY_STATION_THRESHOLD } from '../types/stationFilter';
import type { StationFilterResult, FilteredStation } from '../types/stationFilter';

export function useStationFilter(): StationFilterResult {
  const { currentPosition, loading: locationLoading, error: locationError } = useLocationStore();
  const { stops, loading: stationLoading, error: stationError } = useStationStore();
  const { stopTimes, trips, loading: tripLoading, error: tripError, loadStopTimes, loadTrips, getTripById } = useTripStore();
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
      // Get API credentials from app context for stores that haven't been updated yet
      const { isContextReady, getApiConfig } = await import('../context/appContext');
      
      if (!isContextReady()) {
        // Context not ready yet, skip loading
        return;
      }
      
      const { apiKey, agencyId } = getApiConfig();
      
      // Load stop times if not already loaded (trip store updated to use context)
      if (stopTimes.length === 0 && !tripLoading && !tripError) {
        loadStopTimes();
      }
      
      // Load trips if not already loaded (for headsign data)
      if (trips.length === 0 && !tripLoading && !tripError) {
        loadTrips();
      }
      
      // Load vehicles if not already loaded (vehicle store updated to use context)
      if (vehicles.length === 0 && !vehicleLoading && !vehicleError) {
        loadVehicles();
      } else if (vehicles.length > 0) {
        // Check if vehicle data is fresh and refresh if needed
        const vehicleStore = useVehicleStore.getState();
        if (!vehicleStore.isDataFresh(CACHE_DURATIONS.VEHICLES)) {
          loadVehicles();
        }
      }
      
      // Load routes if not already loaded (route store updated to use context)
      if (allRoutes.length === 0 && !routeLoading && !routeError) {
        loadRoutes();
      }
    };
    
    loadData();
  }, [stopTimes.length, trips.length, tripLoading, tripError, loadStopTimes, loadTrips, vehicles.length, vehicleLoading, vehicleError, loadVehicles, allRoutes.length, routeLoading, routeError, loadRoutes]);
  
  const [filteredStations, setFilteredStations] = useState<FilteredStation[]>([]);
  
  // Async filtering effect
  useEffect(() => {
    const filterAsync = async () => {
      // Early return if no stations available
      if (stops.length === 0) {
        setFilteredStations([]);
        return;
      }

      // Wait for trips to be loaded before filtering to avoid fallback calculations
      if (trips.length === 0 && !tripError) {
        setFilteredStations([]);
        return;
      }

      try {
        let result: FilteredStation[];
        
        // Choose filtering strategy based on isFiltering flag
        if (!isFiltering) {
          // Show all stations sorted by distance
          result = await filterStations(
            stops,
            currentPosition,
            stopTimes,
            vehicles,
            allRoutes,
            favoriteRouteIds,
            favoritesStoreAvailable,
            favoritesFilterEnabled,
            hasFavoriteRoutes,
            undefined, // maxResults undefined = all stations
            SECONDARY_STATION_THRESHOLD,
            trips // NEW: trip data for headsign
          );
        } else {
          // Smart filtering is enabled - need location
          if (!currentPosition) {
            result = []; // No location available for smart filtering
          } else {
            // Show only nearby relevant stations (max 2 results)
            result = await filterStations(
              stops,
              currentPosition,
              stopTimes,
              vehicles,
              allRoutes,
              favoriteRouteIds,
              favoritesStoreAvailable,
              favoritesFilterEnabled,
              hasFavoriteRoutes,
              2, // maxResults = 2 for smart filtering
              SECONDARY_STATION_THRESHOLD,
              trips // NEW: trip data for headsign
            );
          }
        }
        
        setFilteredStations(result);
      } catch (error) {
        console.error('Error filtering stations:', error);
        setFilteredStations([]);
      }
    };

    filterAsync();
  }, [stops, stopTimes, trips, vehicles, allRoutes, currentPosition, isFiltering, favoriteRouteIds, favoritesFilterEnabled, hasFavoriteRoutes, favoritesStoreAvailable]);
  
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