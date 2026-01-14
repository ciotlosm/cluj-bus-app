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
  
  const [filteredStations, setFilteredStations] = useState<FilteredStation[]>([]);
  const [lastFilterPosition, setLastFilterPosition] = useState<GeolocationPosition | null>(null);
  
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
  
  // Async filtering effect - only re-filter when location changes significantly or data changes
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

      // Check if we should re-filter based on location change OR if we have no filtered stations yet
      // Always re-filter when vehicles/stops/trips data changes (dependencies trigger this effect)
      const hasLocationChanged = shouldRefilter(currentPosition, lastFilterPosition);
      const hasNoResults = filteredStations.length === 0;
      
      if (!hasLocationChanged && !hasNoResults && lastFilterPosition !== null) {
        // Location hasn't changed significantly and we have results, but data might have changed
        // Re-filter to update vehicle predictions in existing stations
      }

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
      } catch (error) {
        console.error('Error filtering stations:', error);
        setFilteredStations([]);
      }
    };

    filterAsync();
  }, [stops, stopTimes, trips, vehicles, allRoutes, currentPosition, shouldRefilter, lastFilterPosition]);
  
  const retryFiltering = useCallback(() => {
    // Force re-filtering by clearing last position
    setLastFilterPosition(null);
  }, []);
  
  return {
    filteredStations,
    // Only show loading for initial data loads, not location updates when we have data
    loading: (locationLoading && stops.length === 0) || stationLoading || tripLoading || vehicleLoading || routeLoading,
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