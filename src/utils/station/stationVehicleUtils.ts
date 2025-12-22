/**
 * Station Vehicle Utilities
 * Vehicle retrieval and station metadata management
 */

import { 
  getCachedStationRouteMapping, 
  getRouteIdsForStation 
} from '../route/routeStationMapping';
import { checkStationFavoritesMatch } from './tripValidationUtils';
import type { StationVehicle, FilteredStation } from '../../types/stationFilter';
import type { TranzyStopTimeResponse, TranzyVehicleResponse, TranzyRouteResponse } from '../../types/rawTranzyApi';

/**
 * Get vehicles serving a specific station
 */
export const getStationVehicles = (
  stationId: number,
  stopTimes: TranzyStopTimeResponse[],
  vehicles: TranzyVehicleResponse[],
  allRoutes: TranzyRouteResponse[]
): StationVehicle[] => {
  // Return empty array if we don't have the required data
  if (stopTimes.length === 0 || vehicles.length === 0) {
    return [];
  }

  try {
    // Use cached mapping to avoid repeated expensive calculations
    const stationRouteMap = getCachedStationRouteMapping(stopTimes, vehicles);
    
    // Get route IDs for this specific station
    const routeIds = getRouteIdsForStation(stationId, stationRouteMap);
    
    if (routeIds.length === 0) {
      return [];
    }

    // Performance optimization: create route lookup map for faster access
    const routeMap = new Map(allRoutes.map(route => [route.route_id, route]));
    
    // Filter vehicles that match this station's route IDs
    const filteredVehicles = vehicles.filter(vehicle => 
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
    console.warn('Failed to get station vehicles:', error);
    return [];
  }
};

/**
 * Add metadata (favorites info, vehicles, route IDs) to a station
 */
export const addStationMetadata = (
  station: any,
  stopTimes: TranzyStopTimeResponse[],
  vehicles: TranzyVehicleResponse[],
  allRoutes: TranzyRouteResponse[],
  favoriteRouteIds: Set<string>,
  favoritesStoreAvailable: boolean
): FilteredStation => {
  const stationObj = station.station || station;
  
  // Get vehicles for this station
  const stationVehicles = getStationVehicles(stationObj.stop_id, stopTimes, vehicles, allRoutes);
  
  // Get route IDs for this station
  let routeIds: number[] = [];
  try {
    const stationRouteMap = getCachedStationRouteMapping(stopTimes, vehicles);
    routeIds = getRouteIdsForStation(stationObj.stop_id, stationRouteMap);
  } catch (error) {
    console.warn('Failed to get route IDs for station:', stationObj.stop_id, error);
  }
  
  // Only check favorites if store is available
  if (!favoritesStoreAvailable || favoriteRouteIds.size === 0) {
    return {
      ...station,
      matchesFavorites: false,
      favoriteRouteCount: 0,
      vehicles: stationVehicles,
      routeIds
    };
  }
  
  try {
    const favoritesMatch = checkStationFavoritesMatch(
      stationObj,
      stopTimes,
      vehicles,
      favoriteRouteIds
    );
    
    return {
      ...station,
      matchesFavorites: favoritesMatch.matchesFavorites,
      favoriteRouteCount: favoritesMatch.favoriteRouteCount,
      vehicles: stationVehicles,
      routeIds
    };
  } catch (error) {
    console.warn('Error checking station favorites match:', error);
    return {
      ...station,
      matchesFavorites: false,
      favoriteRouteCount: 0,
      vehicles: stationVehicles,
      routeIds
    };
  }
};