/**
 * Station Filtering Hook
 * Main hook for location-based station filtering with favorites integration and vehicle data
 * Shows all stations within proximity of the closest station
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocationStore } from '../stores/locationStore';
import { useStationStore } from '../stores/stationStore';
import { useStopTimeStore } from '../stores/stopTimeStore';
import { useTripStore } from '../stores/tripStore';
import { useVehicleStore } from '../stores/vehicleStore';
import { useRouteStore } from '../stores/routeStore';
import { 
  formatDistance,
  getStationTypeColor,
  getStationTypeLabel
} from '../utils/station/stationDisplayUtils';
import {
  filterStations
} from '../utils/station/stationFilterStrategies';
import { IN_MEMORY_CACHE_DURATIONS } from '../utils/core/constants';
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
  
  // Async filtering effect - always shows stations within proximity of closest station
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
      } catch (error) {
        console.error('Error filtering stations:', error);
        setFilteredStations([]);
      }
    };

    filterAsync();
  }, [stops, stopTimes, trips, vehicles, allRoutes, currentPosition]);
  
  const retryFiltering = useCallback(() => {}, []); // No-op for simple implementation
  
  return {
    filteredStations,
    loading: locationLoading || stationLoading || tripLoading || vehicleLoading || routeLoading,
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