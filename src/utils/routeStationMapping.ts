// Route-to-Station Mapping Utilities
// Creates efficient mappings between stations and routes using stop_times and vehicle data
// Handles edge cases like missing data and provides fast lookup functions

import type { TranzyStopTimeResponse, TranzyVehicleResponse } from '../types/rawTranzyApi';

/**
 * Mapping of stop_id to array of route_ids serving that station
 */
export interface StationRouteMap {
  [stop_id: number]: number[];
}

/**
 * Mapping of trip_id to route_id derived from vehicle data
 */
export interface TripRouteMap {
  [trip_id: string]: number;
}

/**
 * Create a mapping from trip_id to route_id using vehicle data
 * Vehicles contain both trip_id and route_id, allowing us to build this mapping
 * 
 * @param vehicles - Array of vehicle responses from API
 * @returns Mapping of trip_id to route_id
 */
export function createTripRouteMapping(vehicles: TranzyVehicleResponse[]): TripRouteMap {
  console.log('🚌 createTripRouteMapping: Starting', { vehiclesLength: vehicles.length });
  
  const tripRouteMap: TripRouteMap = {};
  
  // Handle edge case: empty or invalid vehicles array
  if (!Array.isArray(vehicles)) {
    console.log('❌ createTripRouteMapping: Invalid vehicles array');
    return tripRouteMap;
  }
  
  let validMappings = 0;
  let skippedVehicles = 0;
  
  for (const vehicle of vehicles) {
    // Skip vehicles with missing or invalid data
    if (!vehicle || 
        vehicle.trip_id === null || 
        vehicle.trip_id === undefined || 
        vehicle.trip_id.trim() === '' ||
        vehicle.route_id === null || 
        vehicle.route_id === undefined) {
      skippedVehicles++;
      continue;
    }
    
    // Map trip_id to route_id
    tripRouteMap[vehicle.trip_id] = vehicle.route_id;
    validMappings++;
  }
  
  console.log('✅ createTripRouteMapping: Complete', {
    totalVehicles: vehicles.length,
    validMappings,
    skippedVehicles,
    sampleMappings: Object.entries(tripRouteMap).slice(0, 5)
  });
  
  return tripRouteMap;
}

/**
 * Create a mapping from stop_id to route_ids using stop_times and trip-route mapping
 * 
 * @param stopTimes - Array of stop time responses from API
 * @param tripRouteMap - Mapping of trip_id to route_id (from createTripRouteMapping)
 * @returns Mapping of stop_id to array of route_ids
 */
export function createStationRouteMapping(
  stopTimes: TranzyStopTimeResponse[], 
  tripRouteMap: TripRouteMap
): StationRouteMap {
  console.log('🚏 createStationRouteMapping: Starting', {
    stopTimesLength: stopTimes.length,
    tripRouteMapSize: Object.keys(tripRouteMap).length
  });

  const stationRouteMap: StationRouteMap = {};
  
  // Handle edge case: empty or invalid stop times array
  if (!Array.isArray(stopTimes)) {
    console.log('❌ createStationRouteMapping: Invalid stopTimes array');
    return stationRouteMap;
  }
  
  let processedStopTimes = 0;
  let skippedStopTimes = 0;
  let foundRoutes = 0;
  
  for (const stopTime of stopTimes) {
    // Skip invalid stop times
    if (!stopTime || 
        stopTime.stop_id === null || 
        stopTime.stop_id === undefined ||
        !stopTime.trip_id || 
        stopTime.trip_id.trim() === '') {
      skippedStopTimes++;
      continue;
    }
    
    processedStopTimes++;
    
    // Get route_id for this trip_id
    const route_id = tripRouteMap[stopTime.trip_id];
    
    // Skip if we don't have route information for this trip
    if (route_id === null || route_id === undefined) {
      continue;
    }
    
    foundRoutes++;
    
    // Initialize array for this station if it doesn't exist
    if (!stationRouteMap[stopTime.stop_id]) {
      stationRouteMap[stopTime.stop_id] = [];
    }
    
    // Add route_id if it's not already in the array (avoid duplicates)
    if (!stationRouteMap[stopTime.stop_id].includes(route_id)) {
      stationRouteMap[stopTime.stop_id].push(route_id);
    }
  }
  
  console.log('✅ createStationRouteMapping: Complete', {
    totalStopTimes: stopTimes.length,
    processedStopTimes,
    skippedStopTimes,
    foundRoutes,
    stationsWithRoutes: Object.keys(stationRouteMap).length,
    sampleStations: Object.entries(stationRouteMap).slice(0, 5)
  });
  
  return stationRouteMap;
}

/**
 * Get route_ids for a specific station
 * 
 * @param stop_id - The station ID to look up
 * @param stationRouteMap - The station-to-routes mapping
 * @returns Array of route_ids serving this station, empty array if none found
 */
export function getRouteIdsForStation(
  stop_id: number, 
  stationRouteMap: StationRouteMap
): number[] {
  // Handle edge cases
  if (stop_id === null || stop_id === undefined || !stationRouteMap) {
    return [];
  }
  
  return stationRouteMap[stop_id] || [];
}

/**
 * Create complete route-to-station mapping from raw API data
 * Combines trip-route mapping and station-route mapping in one function
 * 
 * @param stopTimes - Array of stop time responses from API
 * @param vehicles - Array of vehicle responses from API
 * @returns Complete station-to-routes mapping
 */
export function createCompleteStationRouteMapping(
  stopTimes: TranzyStopTimeResponse[],
  vehicles: TranzyVehicleResponse[]
): StationRouteMap {
  console.log('🗺️ createCompleteStationRouteMapping: Starting', {
    stopTimesLength: stopTimes.length,
    vehiclesLength: vehicles.length
  });

  // Handle edge cases
  if (!Array.isArray(stopTimes) || !Array.isArray(vehicles)) {
    console.log('❌ createCompleteStationRouteMapping: Invalid input arrays');
    return {};
  }
  
  // Step 1: Create trip-to-route mapping from vehicle data
  console.log('🔧 createCompleteStationRouteMapping: Creating trip-route mapping...');
  const tripRouteMap = createTripRouteMapping(vehicles);
  console.log('✅ createCompleteStationRouteMapping: Trip-route mapping created', {
    tripCount: Object.keys(tripRouteMap).length,
    sampleEntries: Object.entries(tripRouteMap).slice(0, 5)
  });
  
  // Step 2: Create station-to-routes mapping using stop times and trip-route mapping
  console.log('🔧 createCompleteStationRouteMapping: Creating station-route mapping...');
  const stationRouteMap = createStationRouteMapping(stopTimes, tripRouteMap);
  console.log('✅ createCompleteStationRouteMapping: Station-route mapping created', {
    stationCount: Object.keys(stationRouteMap).length,
    sampleEntries: Object.entries(stationRouteMap).slice(0, 5)
  });
  
  return stationRouteMap;
}

/**
 * Check if a station has any routes serving it
 * 
 * @param stop_id - The station ID to check
 * @param stationRouteMap - The station-to-routes mapping
 * @returns True if station has routes, false otherwise
 */
export function hasRoutesForStation(
  stop_id: number, 
  stationRouteMap: StationRouteMap
): boolean {
  const routeIds = getRouteIdsForStation(stop_id, stationRouteMap);
  return routeIds.length > 0;
}

