/**
 * Station Filter Utilities
 * Reusable utility functions for station filtering and vehicle management
 */

import { calculateDistance, sortByDistance } from '../location/distanceUtils';
import { hasActiveTrips, checkStationFavoritesMatch } from './tripValidationUtils';
import { 
  getCachedStationRouteMapping, 
  getRouteIdsForStation 
} from '../route/routeStationMapping';
import type { StationVehicle, FilteredStation } from '../../types/stationFilter';
import type { TranzyStopResponse, TranzyStopTimeResponse, TranzyVehicleResponse, TranzyRouteResponse } from '../../types/rawTranzyApi';
import { SECONDARY_STATION_THRESHOLD } from '../../types/stationFilter';

/**
 * Format distance for display
 */
export const formatDistance = (distance: number): string => {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }
  return `${(distance / 1000).toFixed(1)}km`;
};

/**
 * Get Material-UI color for station type
 */
export const getStationTypeColor = (stationType: 'primary' | 'secondary' | 'all'): 'primary' | 'secondary' | 'default' => {
  if (stationType === 'primary') return 'primary';
  if (stationType === 'secondary') return 'secondary';
  return 'default';
};

/**
 * Get display label for station type
 */
export const getStationTypeLabel = (stationType: 'primary' | 'secondary' | 'all'): string => {
  if (stationType === 'primary') return 'Closest';
  if (stationType === 'secondary') return 'Nearby';
  return ''; // No label for filtered view
};

/**
 * Safe distance calculation with error handling
 */
export const safeCalculateDistance = (from: { lat: number; lon: number }, to: { lat: number; lon: number }): number => {
  try {
    return calculateDistance(from, to);
  } catch (error) {
    console.warn('Distance calculation failed:', error);
    return 0; // Return 0 distance on error
  }
};

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

/**
 * All Stations Strategy - Show all stations sorted by distance
 * Used when smart filtering is disabled
 */
export const useAllStationsStrategy = (
  stops: TranzyStopResponse[],
  currentPosition: GeolocationPosition | null,
  stopTimes: TranzyStopTimeResponse[],
  vehicles: TranzyVehicleResponse[],
  allRoutes: TranzyRouteResponse[],
  favoriteRouteIds: Set<string>,
  favoritesStoreAvailable: boolean,
  favoritesFilterEnabled: boolean,
  hasFavoriteRoutes: boolean
): FilteredStation[] => {
  const allStations = stops.map((station) => ({
    station,
    distance: currentPosition ? safeCalculateDistance(
      { lat: currentPosition.coords.latitude, lon: currentPosition.coords.longitude },
      { lat: station.stop_lat, lon: station.stop_lon }
    ) : 0,
    hasActiveTrips: hasActiveTrips(station, stopTimes),
    stationType: 'all' as const, // Will be updated after sorting
    matchesFavorites: false, // Will be updated by addStationMetadata
    favoriteRouteCount: 0, // Will be updated by addStationMetadata
    vehicles: [], // Will be updated by addStationMetadata
    routeIds: [] // Will be updated by addStationMetadata
  }));

  // Add favorites information and vehicles to all stations
  const stationsWithMetadata = allStations.map(station => 
    addStationMetadata(station, stopTimes, vehicles, allRoutes, favoriteRouteIds, favoritesStoreAvailable)
  );

  // Apply favorites filter if enabled, store is available, and user has favorites
  // Combined filter logic: location + trips + favorites (AND operation)
  let finalStations = stationsWithMetadata;
  if (favoritesFilterEnabled && favoritesStoreAvailable && hasFavoriteRoutes) {
    finalStations = stationsWithMetadata.filter(station => station.matchesFavorites);
  }

  // Sort by distance if location is available
  if (currentPosition) {
    const sorted = finalStations.sort((a, b) => a.distance - b.distance);
    // First station gets "primary", others get "all"
    return sorted.map((station, index) => ({
      ...station,
      stationType: index === 0 ? 'primary' : 'all' as const
    }));
  }
  
  return finalStations;
};

/**
 * Smart Filtering Strategy - Show only nearby relevant stations
 * Used when smart filtering is enabled
 */
export const useSmartFilteringStrategy = (
  stops: TranzyStopResponse[],
  currentPosition: GeolocationPosition,
  stopTimes: TranzyStopTimeResponse[],
  vehicles: TranzyVehicleResponse[],
  allRoutes: TranzyRouteResponse[],
  favoriteRouteIds: Set<string>,
  favoritesStoreAvailable: boolean,
  favoritesFilterEnabled: boolean,
  hasFavoriteRoutes: boolean
): FilteredStation[] => {
  // Sort stations by distance
  const userLocation = { lat: currentPosition.coords.latitude, lon: currentPosition.coords.longitude };
  const stationsWithCoords = stops.map(station => ({ ...station, lat: station.stop_lat, lon: station.stop_lon }));
  const sortedStations = sortByDistance(stationsWithCoords, userLocation);
  
  // Find primary station by evaluating stations in distance order
  // Combined filter logic: location + trips + favorites (AND operation)
  // Skip stations without trips and continue to next closest
  // Also apply favorites filter if enabled and store is available
  let primaryStation: typeof sortedStations[0] | undefined;
  
  for (const station of sortedStations) {
    // Check if station has associated stop times and active trips
    if (hasActiveTrips(station, stopTimes)) {
      // If favorites filter is enabled, store is available, and user has favorites, check if station matches
      if (favoritesFilterEnabled && favoritesStoreAvailable && hasFavoriteRoutes) {
        try {
          const favoritesMatch = checkStationFavoritesMatch(station, stopTimes, vehicles, favoriteRouteIds);
          if (favoritesMatch.matchesFavorites) {
            primaryStation = station;
            break; // First station with valid trips and matching favorites becomes primary
          }
        } catch (error) {
          console.warn('Error checking favorites match for station:', station.stop_id, error);
          // Continue to next station on error
          continue;
        }
      } else {
        // Favorites filter disabled or no favorites configured - apply only location and trip filters
        primaryStation = station;
        break; // First station with valid trips becomes primary
      }
    }
    // Skip stations without trips and continue to next closest
  }
  
  // If no stations have valid trips (or matching favorites), return empty array
  if (!primaryStation) return [];
  
  // Create result with primary station (first station with valid trips and matching favorites)
  const primaryWithMetadata = addStationMetadata({
    station: primaryStation,
    distance: safeCalculateDistance(userLocation, { lat: primaryStation.stop_lat, lon: primaryStation.stop_lon }),
    hasActiveTrips: true,
    stationType: 'all' // No labels in filtered view - position indicates priority
  }, stopTimes, vehicles, allRoutes, favoriteRouteIds, favoritesStoreAvailable);
  
  const result: FilteredStation[] = [primaryWithMetadata];
  
  // Find secondary station within 100m of primary that also has active trips
  // Combined filter logic: location + trips + favorites (AND operation)
  // Select the closest one if multiple secondary stations are available
  // Also apply favorites filter if enabled and store is available
  const potentialSecondaryStations = sortedStations.filter(station => {
    if (station.stop_id === primaryStation.stop_id) return false;
    if (!hasActiveTrips(station, stopTimes)) return false;
    
    const distanceToPrimary = safeCalculateDistance(
      { lat: primaryStation.stop_lat, lon: primaryStation.stop_lon },
      { lat: station.stop_lat, lon: station.stop_lon }
    );
    
    if (distanceToPrimary > SECONDARY_STATION_THRESHOLD) return false;
    
    // If favorites filter is enabled, store is available, and user has favorites, check if station matches
    if (favoritesFilterEnabled && favoritesStoreAvailable && hasFavoriteRoutes) {
      try {
        const favoritesMatch = checkStationFavoritesMatch(station, stopTimes, vehicles, favoriteRouteIds);
        return favoritesMatch.matchesFavorites;
      } catch (error) {
        console.warn('Error checking favorites match for secondary station:', station.stop_id, error);
        return false; // Exclude station on error
      }
    }
    
    return true; // Favorites filter disabled - include station
  });
  
  // Select closest secondary station (first in distance-sorted array)
  const secondaryStation = potentialSecondaryStations[0];
  
  if (secondaryStation) {
    const secondaryWithMetadata = addStationMetadata({
      station: secondaryStation,
      distance: safeCalculateDistance(userLocation, { lat: secondaryStation.stop_lat, lon: secondaryStation.stop_lon }),
      hasActiveTrips: true,
      stationType: 'all' // No labels in filtered view
    }, stopTimes, vehicles, allRoutes, favoriteRouteIds, favoritesStoreAvailable);
    
    result.push(secondaryWithMetadata);
  }
  
  return result;
};