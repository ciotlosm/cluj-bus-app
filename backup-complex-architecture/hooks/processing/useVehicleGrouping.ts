import { useMemo } from 'react';
import type { Station, Coordinates } from '../../types';
import type { CoreVehicle } from '../../types/coreVehicle';
import { calculateDistance } from '../../utils/data-processing/distanceUtils';
import { logger } from '../../utils/shared/logger';
import { validateVehicleArray, validateStationArray } from '../shared/validation/arrayValidators';
import { validateCoordinates } from '../shared/validation/coordinateValidators';
import { createSafeVehicleArray } from '../shared/validation/safeDefaults';
import { ErrorHandler } from '../shared/errors/ErrorHandler';
import { ErrorType } from '../shared/errors/types';

/**
 * Configuration options for vehicle grouping
 */
export interface UseVehicleGroupingOptions {
  maxStations?: number; // Maximum number of stations to return
  maxVehiclesPerStation?: number; // Maximum vehicles per station
}

/**
 * Station with distance information
 */
export interface StationWithDistance {
  station: Station;
  distance: number; // Distance from user location in meters
}

/**
 * Vehicle grouped by station
 */
export interface StationVehicleGroup {
  station: StationWithDistance;
  vehicles: CoreVehicle[];
  allRoutes: Array<{
    routeId: string;
    routeName: string;
    vehicleCount: number;
  }>;
}

/**
 * Result of vehicle grouping operation
 */
export interface VehicleGroupingResult {
  stationGroups: StationVehicleGroup[];
  totalStations: number;
  totalVehicles: number;
  groupingStats: {
    stationsWithVehicles: number;
    averageVehiclesPerStation: number;
    maxDistanceIncluded: number;
  };
}

/**
 * Hook for grouping vehicles by stations with distance calculations
 * 
 * This is a pure processing hook that takes vehicles, stations, and user location
 * and returns vehicles grouped by their nearest stations. It handles:
 * - Station-based vehicle grouping with distance calculations
 * - Capacity constraints (max stations and vehicles per station)
 * - Route aggregation and vehicle counting per station
 * - Input validation and safe defaults
 * 
 * Note: This hook does NOT handle vehicle-to-station proximity logic.
 * Use useVehicleStationAnalysis for "at station" vs "between stations" detection.
 * 
 * @param vehicles Array of live vehicles to group (should be pre-analyzed with station info)
 * @param stations Array of stations to group vehicles by
 * @param userLocation User's current location for distance calculations
 * @param options Grouping configuration options
 * @returns Vehicles grouped by stations with statistics
 */
export const useVehicleGrouping = (
  vehicles: CoreVehicle[],
  stations: Station[],
  userLocation: Coordinates,
  options: UseVehicleGroupingOptions = {}
): VehicleGroupingResult => {
  const {
    maxStations = 5,
    maxVehiclesPerStation = 10
  } = options;

  return useMemo(() => {
    // Early return if maxStations is 0
    if (maxStations === 0) {
      return {
        stationGroups: [],
        totalStations: 0,
        totalVehicles: 0,
        groupingStats: {
          stationsWithVehicles: 0,
          averageVehiclesPerStation: 0,
          maxDistanceIncluded: 0
        }
      };
    }
    const emptyResult = {
      stationGroups: [],
      totalStations: 0,
      totalVehicles: 0,
      groupingStats: {
        stationsWithVehicles: 0,
        averageVehiclesPerStation: 0,
        maxDistanceIncluded: 0
      }
    };

    // Input validation using shared validation library
    const vehicleValidation = validateVehicleArray(vehicles, 'vehicles');
    if (!vehicleValidation.isValid) {
      const error = ErrorHandler.createError(
        ErrorType.VALIDATION,
        'Invalid vehicles input for grouping',
        { 
          validationErrors: vehicleValidation.errors,
          inputType: typeof vehicles
        }
      );
      
      logger.warn(error.message, ErrorHandler.createErrorReport(error), 'useVehicleGrouping');
      return emptyResult;
    }

    const stationValidation = validateStationArray(stations, 'stations');
    if (!stationValidation.isValid) {
      const error = ErrorHandler.createError(
        ErrorType.VALIDATION,
        'Invalid stations input for grouping',
        { 
          validationErrors: stationValidation.errors,
          inputType: typeof stations
        }
      );
      
      logger.warn(error.message, ErrorHandler.createErrorReport(error), 'useVehicleGrouping');
      return emptyResult;
    }

    const locationValidation = validateCoordinates(userLocation, 'userLocation');
    if (!locationValidation.isValid) {
      const error = ErrorHandler.createError(
        ErrorType.VALIDATION,
        'Invalid user location provided for vehicle grouping',
        { 
          userLocation,
          validationErrors: locationValidation.errors
        }
      );
      
      logger.warn(error.message, ErrorHandler.createErrorReport(error), 'useVehicleGrouping');
      return emptyResult;
    }

    const validVehicles = vehicleValidation.data!;
    const validStations = stationValidation.data!;
    const validUserLocation = locationValidation.data!;

    if (validVehicles.length === 0 || validStations.length === 0) {
      logger.debug('No valid vehicles or stations for grouping', {
        validVehicles: validVehicles.length,
        validStations: validStations.length,
        originalVehicles: vehicles.length,
        originalStations: stations.length
      }, 'useVehicleGrouping');
      
      return {
        stationGroups: [],
        totalStations: validStations.length,
        totalVehicles: validVehicles.length,
        groupingStats: {
          stationsWithVehicles: 0,
          averageVehiclesPerStation: 0,
          maxDistanceIncluded: 0
        }
      };
    }

    // Step 1: Calculate distances from user location to all stations
    const stationsWithDistances: StationWithDistance[] = validStations
      .map(station => {
        try {
          const distance = calculateDistance(validUserLocation, station.coordinates);
          return { station, distance };
        } catch (error) {
          const calcError = ErrorHandler.createError(
            ErrorType.PROCESSING,
            'Distance calculation failed for station',
            {
              stationId: station.id,
              stationCoordinates: station.coordinates,
              userLocation: validUserLocation,
              originalError: error instanceof Error ? error : new Error(String(error))
            }
          );
          
          logger.debug(calcError.message, ErrorHandler.createErrorReport(calcError), 'useVehicleGrouping');
          return null;
        }
      })
      .filter((item): item is StationWithDistance => item !== null)
      .sort((a, b) => a.distance - b.distance); // Sort by distance (closest first)

    // Step 2: Deduplicate vehicles by ID to prevent duplicates in groups
    const uniqueVehicles = new Map<string, CoreVehicle>();
    for (const vehicle of validVehicles) {
      uniqueVehicles.set(vehicle.id, vehicle);
    }
    const deduplicatedVehicles = Array.from(uniqueVehicles.values());

    // Step 3: Group vehicles by their nearest station
    // Note: This is purely organizational grouping, not proximity-based filtering
    const stationVehicleMap = new Map<string, CoreVehicle[]>();
    
    for (const vehicle of deduplicatedVehicles) {
      let nearestStation: StationWithDistance | null = null;
      let minDistance = Infinity;

      // Find the nearest station to this vehicle for organizational purposes
      for (const stationWithDistance of stationsWithDistances) {
        try {
          const distance = calculateDistance(vehicle.position, stationWithDistance.station.coordinates);
          if (distance < minDistance) {
            minDistance = distance;
            nearestStation = stationWithDistance;
          }
        } catch (error) {
          // Skip this station if distance calculation fails
          continue;
        }
      }

      // Group vehicle with its nearest station (no proximity filtering)
      // The vehicle-to-station relationship analysis should be done separately
      if (nearestStation) {
        const stationId = nearestStation.station.id;
        if (!stationVehicleMap.has(stationId)) {
          stationVehicleMap.set(stationId, []);
        }
        stationVehicleMap.get(stationId)!.push(vehicle);
      }
    }

    // Step 4: Create station groups with route aggregation
    const stationGroups: StationVehicleGroup[] = [];
    let maxDistanceIncluded = 0;

    for (const stationWithDistance of stationsWithDistances) {
      const stationId = stationWithDistance.station.id;
      const vehiclesAtStation = stationVehicleMap.get(stationId) || [];

      // Only include stations that have vehicles
      if (vehiclesAtStation.length > 0) {
        // Apply vehicle limit per station
        const limitedVehicles = vehiclesAtStation.slice(0, maxVehiclesPerStation);

        // Aggregate routes at this station
        const routeMap = new Map<string, { routeName: string; count: number }>();
        
        for (const vehicle of vehiclesAtStation) {
          const routeId = vehicle.routeId;
          if (routeMap.has(routeId)) {
            routeMap.get(routeId)!.count++;
          } else {
            // Extract route name from routeId (fallback to routeId if no better name available)
            const routeName = vehicle.label || routeId;
            routeMap.set(routeId, { routeName, count: 1 });
          }
        }

        // Convert route map to array and sort by route name
        const allRoutes = Array.from(routeMap.entries())
          .map(([routeId, { routeName, count }]) => ({
            routeId,
            routeName,
            vehicleCount: count
          }))
          .sort((a, b) => a.routeName.localeCompare(b.routeName));

        stationGroups.push({
          station: stationWithDistance,
          vehicles: limitedVehicles,
          allRoutes
        });

        // Track maximum distance included
        maxDistanceIncluded = Math.max(maxDistanceIncluded, stationWithDistance.distance);

        // Stop if we've reached the maximum number of stations
        if (stationGroups.length >= maxStations) {
          break;
        }
      }
    }

    // Step 5: Calculate grouping statistics
    const totalVehiclesInGroups = stationGroups.reduce((sum, group) => sum + group.vehicles.length, 0);
    const averageVehiclesPerStation = stationGroups.length > 0 
      ? totalVehiclesInGroups / stationGroups.length 
      : 0;

    const groupingStats = {
      stationsWithVehicles: stationGroups.length,
      averageVehiclesPerStation: Math.round(averageVehiclesPerStation * 100) / 100, // Round to 2 decimal places
      maxDistanceIncluded: Math.round(maxDistanceIncluded)
    };

    logger.debug('Vehicle grouping completed', {
      totalVehicles: validVehicles.length,
      deduplicatedVehicles: deduplicatedVehicles.length,
      totalStations: validStations.length,
      stationGroups: stationGroups.length,
      groupingStats,
      options: {
        maxStations,
        maxVehiclesPerStation
      }
    }, 'useVehicleGrouping');

    return {
      stationGroups,
      totalStations: validStations.length,
      totalVehicles: validVehicles.length,
      groupingStats
    };
  }, [
    vehicles,
    stations,
    userLocation,
    maxStations,
    maxVehiclesPerStation
  ]);
};