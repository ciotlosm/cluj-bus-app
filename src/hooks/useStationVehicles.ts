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
  createCompleteStationRouteMapping, 
  getRouteIdsForStation 
} from '../utils/routeStationMapping';
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

  // Auto-load data when hook is used
  useEffect(() => {
    const loadAllData = async () => {
      const { useConfigStore } = await import('../stores/configStore');
      const { apiKey, agency_id } = useConfigStore.getState();
      
      if (apiKey && agency_id) {
        // Load all required data if not already loaded
        if (allVehicles.length === 0 && !vehicleLoading && !vehicleError) {
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
  const routeIds = useMemo((): number[] => {
    // Return empty array if we don't have the required data
    if (stopTimes.length === 0 || allVehicles.length === 0) {
      return [];
    }

    try {
      // Create complete mapping from stop times and vehicle data
      const stationRouteMap = createCompleteStationRouteMapping(stopTimes, allVehicles);
      
      // Get route IDs for this specific station
      return getRouteIdsForStation(station.stop_id, stationRouteMap);
    } catch (error) {
      console.warn('Failed to create route mapping:', error);
      return [];
    }
  }, [stopTimes, allVehicles, station.stop_id]);

  // Filter vehicles by route IDs and combine with route information
  const vehicles = useMemo((): StationVehicle[] => {
    console.log('🚗 useStationVehicles: Starting vehicle filtering', {
      routeIdsLength: routeIds.length,
      routeIds: routeIds,
      vehiclesLength: allVehicles.length
    });

    // Return empty array if no route IDs or vehicles
    if (routeIds.length === 0 || allVehicles.length === 0) {
      console.log('❌ useStationVehicles: Cannot filter - missing route IDs or vehicles');
      return [];
    }

    try {
      // Filter vehicles that match this station's route IDs
      const filteredVehicles = allVehicles.filter(vehicle => 
        vehicle.route_id !== null && 
        vehicle.route_id !== undefined &&
        routeIds.includes(vehicle.route_id)
      );

      console.log('🔍 useStationVehicles: Vehicle filtering results', {
        totalVehicles: allVehicles.length,
        vehiclesWithRouteId: allVehicles.filter(v => v.route_id !== null).length,
        matchingVehicles: filteredVehicles.length,
        vehicleRouteIds: allVehicles.map(v => v.route_id).filter(id => id !== null).slice(0, 10),
        stationRouteIds: routeIds
      });

      // Combine vehicle data with route information
      const result = filteredVehicles.map(vehicle => {
        // Find the route for this vehicle
        const route = allRoutes.find(r => r.route_id === vehicle.route_id) || null;
        
        return {
          vehicle,
          route
        };
      });

      console.log('✅ useStationVehicles: Final result', {
        vehicleCount: result.length,
        vehicles: result.map(v => ({ id: v.vehicle.id, label: v.vehicle.label, route_id: v.vehicle.route_id }))
      });

      return result;
    } catch (error) {
      console.error('💥 useStationVehicles: Failed to filter vehicles:', error);
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
  }, [loadVehicles, loadRoutes, loadStopTimes]);

  return {
    vehicles,
    loading,
    error,
    routeIds,
    refresh
  };
}