/**
 * useStationVehicles Hook
 * Manages vehicle filtering and route mapping logic for a specific station
 * Integrates with vehicle, route, and trip stores to provide real-time vehicle data
 */

import { useMemo, useCallback, useEffect } from 'react';
import { useVehicleStore } from '../stores/vehicleStore';
import { useRouteStore } from '../stores/routeStore';
import { useTripStore } from '../stores/tripStore';
import { 
  getCachedStationRouteMapping, 
  getRouteIdsForStation 
} from '../utils/routeStationMapping';
import { CACHE_DURATIONS } from '../utils/constants';
import type { TranzyStopResponse, TranzyVehicleResponse, TranzyRouteResponse } from '../types/rawTranzyApi';

export interface StationVehicle {
  vehicle: TranzyVehicleResponse;
  route: TranzyRouteResponse | null;
}

export interface UseStationVehiclesResult {
  vehicles: StationVehicle[];
  loading: boolean;
  error: string | null;
  routeIds: number[];
  refresh: () => void;
}

/**
 * Custom hook to manage vehicle filtering and route mapping for a specific station
 * 
 * @param station - The station to show vehicles for
 * @returns Vehicle data, loading state, error state, and refresh function
 */
export function useStationVehicles(station: TranzyStopResponse): UseStationVehiclesResult {
  // Get data from stores
  const { 
    vehicles: allVehicles, 
    loading: vehicleLoading, 
    error: vehicleError,
    loadVehicles 
  } = useVehicleStore();
  
  const { 
    routes: allRoutes, 
    loading: routeLoading, 
    error: routeError,
    loadRoutes 
  } = useRouteStore();
  
  const { 
    stopTimes, 
    loading: tripLoading, 
    error: tripError,
    loadStopTimes 
  } = useTripStore();

  // Auto-load data when hook is used - with performance optimizations
  useEffect(() => {
    const loadAllData = async () => {
      const { useConfigStore } = await import('../stores/configStore');
      const { apiKey, agency_id } = useConfigStore.getState();
      
      if (apiKey && agency_id) {
        // Performance optimization: only load data if not already loaded or fresh
        // This ensures data sharing across all station components
        
        // Check if vehicle data is fresh before loading
        const vehicleStore = useVehicleStore.getState();
        if (allVehicles.length === 0 && !vehicleLoading && !vehicleError) {
          loadVehicles(apiKey, agency_id);
        } else if (allVehicles.length > 0 && !vehicleStore.isDataFresh(CACHE_DURATIONS.VEHICLES)) {
          // Refresh if data is older than configured duration
          loadVehicles(apiKey, agency_id);
        }
        
        if (allRoutes.length === 0 && !routeLoading && !routeError) {
          loadRoutes(apiKey, agency_id);
        }
        if (stopTimes.length === 0 && !tripLoading && !tripError) {
          loadStopTimes(apiKey, agency_id);
        }
      }
    };
    
    loadAllData();
  }, [
    allVehicles.length, vehicleLoading, vehicleError, loadVehicles,
    allRoutes.length, routeLoading, routeError, loadRoutes,
    stopTimes.length, tripLoading, tripError, loadStopTimes
  ]);

  // Create route-to-station mapping and get route IDs for this station
  // Uses cached mapping for performance optimization across all station components
  const routeIds = useMemo((): number[] => {
    // Return empty array if we don't have the required data
    if (stopTimes.length === 0 || allVehicles.length === 0) {
      return [];
    }

    try {
      // Use cached mapping to avoid repeated expensive calculations
      // This ensures all station components share the same mapping data
      const stationRouteMap = getCachedStationRouteMapping(stopTimes, allVehicles);
      
      // Get route IDs for this specific station
      return getRouteIdsForStation(station.stop_id, stationRouteMap);
    } catch (error) {
      console.warn('Failed to create route mapping:', error);
      return [];
    }
  }, [stopTimes, allVehicles, station.stop_id]);

  // Filter vehicles by route IDs and combine with route information
  const vehicles = useMemo((): StationVehicle[] => {
    // Return empty array if no route IDs or vehicles
    if (routeIds.length === 0 || allVehicles.length === 0) {
      return [];
    }

    try {
      // Performance optimization: create route lookup map for faster access
      const routeMap = new Map(allRoutes.map(route => [route.route_id, route]));
      
      // Filter vehicles that match this station's route IDs
      const filteredVehicles = allVehicles.filter(vehicle => 
        vehicle.route_id !== null && 
        vehicle.route_id !== undefined &&
        routeIds.includes(vehicle.route_id)
      );

      // Combine vehicle data with route information using the lookup map
      return filteredVehicles.map(vehicle => {
        // Use map lookup for O(1) route access instead of O(n) find
        const route = routeMap.get(vehicle.route_id) || null;
        
        return {
          vehicle,
          route
        };
      });
    } catch (error) {
      console.warn('Failed to filter vehicles:', error);
      return [];
    }
  }, [allVehicles, allRoutes, routeIds]);

  // Combine loading states - we're loading if any store is loading
  const loading = vehicleLoading || routeLoading || tripLoading;

  // Combine error states - show first error encountered
  const error = vehicleError || routeError || tripError;

  // Refresh function to reload all data
  const refresh = useCallback(async () => {
    try {
      const { useConfigStore } = await import('../stores/configStore');
      const { apiKey, agency_id } = useConfigStore.getState();
      
      if (apiKey && agency_id) {
        // Performance optimization: avoid concurrent refresh calls
        if (loading) {
          return; // Already refreshing
        }
        
        // Reload all data sources
        await Promise.all([
          loadVehicles(apiKey, agency_id),
          loadRoutes(apiKey, agency_id),
          loadStopTimes(apiKey, agency_id)
        ]);
      }
    } catch (error) {
      console.warn('Failed to refresh station vehicle data:', error);
    }
  }, [loadVehicles, loadRoutes, loadStopTimes, loading]);

  return {
    vehicles,
    loading,
    error,
    routeIds,
    refresh
  };
}