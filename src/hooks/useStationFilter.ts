/**
 * Station Filtering Hook
 * Main hook for location-based station filtering with favorites integration and vehicle data
 * Shows all stations within proximity of the closest station
 */

import { useState, useCallback, useEffect } from 'react';
import { useLocationStore } from '../stores/locationStore';
import { useStationStore } from '../stores/stationStore';
import { useStopTimeStore } from '../stores/stopTimeStore';
import { useTripStore } from '../stores/tripStore';
import { useVehicleStore } from '../stores/vehicleStore';
import { useRouteStore } from '../stores/routeStore';
import { useStationCacheStore } from '../stores/stationCacheStore';
import { calculateDistance } from '../utils/location/distanceUtils';
import { LOCATION_CONFIG } from '../utils/core/constants';
import { 
  formatDistance,
  getStationTypeColor,
  getStationTypeLabel
} from '../utils/station/stationDisplayUtils';
import {
  filterStations
} from '../utils/station/stationFilterStrategies';
import { SECONDARY_STATION_THRESHOLD } from '../types/stationFilter';
import type { FilteredStation } from '../types/stationFilter';

interface StationFilterResult {
  filteredStations: FilteredStation[];
  loading: boolean;
  processing: boolean; // NEW: Track when filtering is actively running
  error: string | null;
  retryFiltering: () => void;
  utilities: {
    formatDistance: typeof formatDistance;
    getStationTypeColor: typeof getStationTypeColor;
    getStationTypeLabel: typeof getStationTypeLabel;
  };
}

export function useStationFilter(): StationFilterResult {
  const { currentPosition, loading: locationLoading, error: locationError } = useLocationStore();
  const { stops, loading: stationLoading, error: stationError } = useStationStore();
  const { stopTimes, loading: stopTimeLoading, error: stopTimeError, loadStopTimes } = useStopTimeStore();
  const { trips, loading: tripLoading, error: tripError, loadTrips } = useTripStore();
  const { vehicles, loading: vehicleLoading, error: vehicleError, loadVehicles } = useVehicleStore();
  const { 
    routes: allRoutes, 
    loading: routeLoading, 
    error: routeError,
    loadRoutes 
  } = useRouteStore();
  
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
      
      // Load stop times if not already loaded (stop time store updated to use context)
      if (stopTimes.length === 0 && !stopTimeLoading && !stopTimeError) {
        loadStopTimes();
      }
      
      // Load trips if not already loaded (for headsign data)
      if (trips.length === 0 && !tripLoading && !tripError) {
        loadTrips();
      }
      
      // Load vehicles if not already loaded (consistent with other stores)
      if (vehicles.length === 0 && !vehicleLoading && !vehicleError) {
        loadVehicles();
      }
      
      // Load routes if not already loaded (route store updated to use context)
      if (allRoutes.length === 0 && !routeLoading && !routeError) {
        loadRoutes();
      }
    };
    
    loadData();
  }, [stopTimes.length, trips.length, stopTimeLoading, tripLoading, stopTimeError, tripError, loadStopTimes, loadTrips, vehicles.length, vehicleLoading, vehicleError, loadVehicles, allRoutes.length, routeLoading, routeError, loadRoutes]);
  
  // Use Zustand store for cache (persists across unmounts)
  const { get: getCachedStations, set: setCachedStations } = useStationCacheStore();
  
  // Generate cache key from location (rounded to 3 decimals = ~100m precision)
  const getCacheKey = useCallback((position: GeolocationPosition | null): string | null => {
    if (!position) return null;
    const lat = position.coords.latitude.toFixed(3);
    const lon = position.coords.longitude.toFixed(3);
    return `${lat},${lon}`;
  }, []);
  
  // Initialize filtered stations from cache if available
  const initialFilteredStations = useCallback(() => {
    const cacheKey = getCacheKey(currentPosition);
    if (cacheKey) {
      const cached = getCachedStations(cacheKey);
      if (cached) {
        return cached;
      }
    }
    return [];
  }, [currentPosition, getCacheKey, getCachedStations]);
  
  const [filteredStations, setFilteredStations] = useState<FilteredStation[]>(initialFilteredStations);
  const [lastFilterPosition, setLastFilterPosition] = useState<GeolocationPosition | null>(null);
  const [processing, setProcessing] = useState(false);
  
  // Helper function to check if location change is significant enough to re-filter
  const shouldRefilter = useCallback((newPosition: GeolocationPosition | null, lastPosition: GeolocationPosition | null): boolean => {
    if (!newPosition) return false;
    if (!lastPosition) return true;
    
    // Use existing distance utility instead of duplicating calculation
    const distance = calculateDistance(
      { lat: lastPosition.coords.latitude, lon: lastPosition.coords.longitude },
      { lat: newPosition.coords.latitude, lon: newPosition.coords.longitude }
    );
    
    // Use constant from configuration
    return distance > LOCATION_CONFIG.REFILTER_DISTANCE_THRESHOLD;
  }, []);
  
  // Async filtering effect with 100ms debounce - batch rapid updates
  useEffect(() => {
    const filterAsync = async () => {
      // Early return if no stations available
      if (stops.length === 0) {
        setFilteredStations([]);
        setProcessing(false);
        return;
      }

      // Wait for trips to be loaded before filtering to avoid fallback calculations
      if (trips.length === 0 && !tripError) {
        setFilteredStations([]);
        setProcessing(false);
        return;
      }

      // Check if we should re-filter based on location change OR if we have no filtered stations yet
      // Always re-filter when vehicles/stops/trips data changes (dependencies trigger this effect)
      const hasLocationChanged = shouldRefilter(currentPosition, lastFilterPosition);
      const hasNoResults = filteredStations.length === 0;
      
      // Check cache for this location
      const cacheKey = getCacheKey(currentPosition);
      const cachedStations = cacheKey ? getCachedStations(cacheKey) : null;
      
      if (cachedStations) {
        // Use cached filtered stations immediately
        setFilteredStations(cachedStations);
        
        // If location hasn't changed and we have results, skip re-filtering
        // But still update vehicles in background
        if (!hasLocationChanged && !hasNoResults && lastFilterPosition !== null) {
          // Just update vehicles without full re-filter
          setProcessing(true);
          try {
            // Re-filter to update vehicle data
            const result = await filterStations(
              stops,
              currentPosition!,
              stopTimes,
              vehicles,
              allRoutes,
              1,
              SECONDARY_STATION_THRESHOLD,
              trips
            );
            setFilteredStations(result);
            // Update cache
            if (cacheKey) {
              setCachedStations(cacheKey, result);
            }
          } catch (error) {
            console.error('Error updating vehicles:', error);
          } finally {
            setProcessing(false);
          }
          return;
        }
      }

      setProcessing(true);
      try {
        let result: FilteredStation[];
        
        // Always use proximity filtering - need location
        if (!currentPosition) {
          result = []; // No location available for proximity filtering
        } else {
          // Show all stations within proximity of the closest station (unlimited results)
          result = await filterStations(
            stops,
            currentPosition,
            stopTimes,
            vehicles,
            allRoutes,
            1, // Enable proximity filtering
            SECONDARY_STATION_THRESHOLD,
            trips
          );
        }
        
        setFilteredStations(result);
        setLastFilterPosition(currentPosition); // Update last filter position
        
        // Update cache
        if (cacheKey && result.length > 0) {
          setCachedStations(cacheKey, result);
        }
      } catch (error) {
        console.error('Error filtering stations:', error);
        setFilteredStations([]);
      } finally {
        setProcessing(false);
      }
    };

    // Debounce filter execution by 100ms to batch rapid updates
    const timeoutId = setTimeout(() => {
      filterAsync();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [stops, stopTimes, trips, vehicles, allRoutes, currentPosition, shouldRefilter, lastFilterPosition, filteredStations.length, tripError]);
  
  const retryFiltering = useCallback(() => {
    // Force re-filtering by clearing last position
    setLastFilterPosition(null);
  }, []);
  
  return {
    filteredStations,
    // Only show loading for initial data loads when cache is empty
    // Don't show loading during background refreshes when we already have data
    // Removed vehicleLoading - let vehicles load in background while showing cached stations
    loading: (
      locationLoading || 
      (stationLoading && stops.length === 0) || 
      (tripLoading && trips.length === 0) || 
      (stopTimeLoading && stopTimes.length === 0) ||
      (routeLoading && allRoutes.length === 0)
    ),
    processing, // NEW: Track when filtering is actively running
    error: locationError || stationError || tripError || vehicleError || routeError,
    retryFiltering,
    // Utility functions for UI formatting
    utilities: {
      formatDistance,
      getStationTypeColor,
      getStationTypeLabel
    }
  };
}