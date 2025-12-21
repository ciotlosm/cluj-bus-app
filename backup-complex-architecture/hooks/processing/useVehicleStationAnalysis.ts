import { useMemo } from 'react';
import type { Station } from '../../types';
import type { CoreVehicle } from '../../types/coreVehicle';
import { calculateDistance } from '../../utils/data-processing/distanceUtils';
import { logger } from '../../utils/shared/logger';
import { validateVehicleArray, validateStationArray } from '../shared/validation/arrayValidators';
import { ErrorHandler } from '../shared/errors/ErrorHandler';
import { ErrorType } from '../shared/errors/types';

/**
 * Vehicle station status enum
 */
export enum VehicleStationStatus {
  AT_STATION = 'at_station',           // Close to station AND stopped (speed = 0)
  CLOSE_TO_STATION = 'close_to_station', // Close to station but moving (speed > 0)
  BETWEEN_STATIONS = 'between_stations'   // Not close to any station
}

/**
 * Configuration options for vehicle-station analysis
 */
export interface UseVehicleStationAnalysisOptions {
  atStationThreshold?: number; // Distance threshold for "at station" detection (meters)
  requireStoppedForAtStation?: boolean; // Whether vehicle must be stopped to be considered "at station"
}

/**
 * Vehicle with station analysis information
 */
export interface VehicleWithStationAnalysis extends CoreVehicle {
  nearestStation: {
    station: Station;
    distance: number; // Distance to nearest station in meters
  } | null;
  stationStatus: VehicleStationStatus; // Current status relative to stations
  // Convenience flags (derived from stationStatus)
  isAtStation: boolean; // True if status is AT_STATION
  isCloseToStation: boolean; // True if status is CLOSE_TO_STATION
  isBetweenStations: boolean; // True if status is BETWEEN_STATIONS
}

/**
 * Result of vehicle-station analysis
 */
export interface VehicleStationAnalysisResult {
  analyzedVehicles: VehicleWithStationAnalysis[];
  analysisStats: {
    totalVehicles: number;
    vehiclesAtStations: number;        // AT_STATION count
    vehiclesCloseToStations: number;   // CLOSE_TO_STATION count
    vehiclesBetweenStations: number;   // BETWEEN_STATIONS count
    averageDistanceToNearestStation: number;
  };
}

/**
 * Hook for analyzing vehicle-to-station relationships
 * 
 * This hook determines vehicle status relative to stations with three states:
 * - AT_STATION: Close to station (≤100m) AND stopped (speed = 0)
 * - CLOSE_TO_STATION: Close to station (≤100m) but moving (speed > 0)
 * - BETWEEN_STATIONS: Not close to any station (>100m from nearest)
 * 
 * Features:
 * - Finding nearest station for each vehicle
 * - Three-state classification for better granularity
 * - Input validation and safe defaults
 * - Comprehensive statistics
 * 
 * @param vehicles Array of live vehicles to analyze
 * @param stations Array of stations for proximity analysis
 * @param options Analysis configuration options
 * @returns Vehicles with station analysis information
 */
export const useVehicleStationAnalysis = (
  vehicles: CoreVehicle[],
  stations: Station[],
  options: UseVehicleStationAnalysisOptions = {}
): VehicleStationAnalysisResult => {
  const {
    atStationThreshold = 100, // 100 meters default
    requireStoppedForAtStation = true // Default to requiring stopped for "at station"
  } = options;

  return useMemo(() => {
    const emptyResult: VehicleStationAnalysisResult = {
      analyzedVehicles: [],
      analysisStats: {
        totalVehicles: 0,
        vehiclesAtStations: 0,
        vehiclesCloseToStations: 0,
        vehiclesBetweenStations: 0,
        averageDistanceToNearestStation: 0
      }
    };

    // Input validation using shared validation library
    const vehicleValidation = validateVehicleArray(vehicles, 'vehicles');
    if (!vehicleValidation.isValid) {
      const error = ErrorHandler.createError(
        ErrorType.VALIDATION,
        'Invalid vehicles input for station analysis',
        { 
          validationErrors: vehicleValidation.errors,
          inputType: typeof vehicles
        }
      );
      
      logger.warn(error.message, ErrorHandler.createErrorReport(error), 'useVehicleStationAnalysis');
      return emptyResult;
    }

    const stationValidation = validateStationArray(stations, 'stations');
    if (!stationValidation.isValid) {
      const error = ErrorHandler.createError(
        ErrorType.VALIDATION,
        'Invalid stations input for station analysis',
        { 
          validationErrors: stationValidation.errors,
          inputType: typeof stations
        }
      );
      
      logger.warn(error.message, ErrorHandler.createErrorReport(error), 'useVehicleStationAnalysis');
      return emptyResult;
    }

    const validVehicles = vehicleValidation.data!;
    const validStations = stationValidation.data!;

    if (validVehicles.length === 0) {
      return {
        analyzedVehicles: [],
        analysisStats: {
          totalVehicles: 0,
          vehiclesAtStations: 0,
          vehiclesCloseToStations: 0,
          vehiclesBetweenStations: 0,
          averageDistanceToNearestStation: 0
        }
      };
    }

    if (validStations.length === 0) {
      // No stations available - all vehicles are "between stations"
      const analyzedVehicles: VehicleWithStationAnalysis[] = validVehicles.map(vehicle => ({
        ...vehicle,
        nearestStation: null,
        stationStatus: VehicleStationStatus.BETWEEN_STATIONS,
        isAtStation: false,
        isCloseToStation: false,
        isBetweenStations: true
      }));

      return {
        analyzedVehicles,
        analysisStats: {
          totalVehicles: validVehicles.length,
          vehiclesAtStations: 0,
          vehiclesCloseToStations: 0,
          vehiclesBetweenStations: validVehicles.length,
          averageDistanceToNearestStation: Infinity
        }
      };
    }

    // Analyze each vehicle's relationship to stations
    const analyzedVehicles: VehicleWithStationAnalysis[] = [];
    let totalDistanceToNearestStation = 0;
    let vehiclesAtStations = 0;
    let vehiclesCloseToStations = 0;

    for (const vehicle of validVehicles) {
      let nearestStation: { station: Station; distance: number } | null = null;
      let minDistance = Infinity;

      // Find the nearest station to this vehicle
      for (const station of validStations) {
        try {
          const distance = calculateDistance(vehicle.position, station.coordinates);
          if (distance < minDistance) {
            minDistance = distance;
            nearestStation = { station, distance };
          }
        } catch (error) {
          // Skip this station if distance calculation fails
          logger.debug('Distance calculation failed for vehicle-station pair', {
            vehicleId: vehicle.id,
            stationId: station.id,
            error: error instanceof Error ? error.message : String(error)
          }, 'useVehicleStationAnalysis');
          continue;
        }
      }

      // Determine station status using three-state logic
      let stationStatus: VehicleStationStatus;
      
      if (nearestStation && nearestStation.distance <= atStationThreshold) {
        // Vehicle is close to a station - check if stopped or moving based on configuration
        const isStopped = vehicle.speed === undefined || vehicle.speed === 0;
        
        if (requireStoppedForAtStation) {
          // Strict mode: must be stopped to be "at station", otherwise "close to station"
          stationStatus = isStopped 
            ? VehicleStationStatus.AT_STATION 
            : VehicleStationStatus.CLOSE_TO_STATION;
        } else {
          // Lenient mode: close to station counts as "at station" regardless of speed
          stationStatus = VehicleStationStatus.AT_STATION;
        }
      } else {
        // Vehicle is not close to any station
        stationStatus = VehicleStationStatus.BETWEEN_STATIONS;
      }

      // Create convenience flags
      const isAtStation = stationStatus === VehicleStationStatus.AT_STATION;
      const isCloseToStation = stationStatus === VehicleStationStatus.CLOSE_TO_STATION;
      const isBetweenStations = stationStatus === VehicleStationStatus.BETWEEN_STATIONS;

      const analyzedVehicle: VehicleWithStationAnalysis = {
        ...vehicle,
        nearestStation,
        stationStatus,
        isAtStation,
        isCloseToStation,
        isBetweenStations
      };

      analyzedVehicles.push(analyzedVehicle);

      // Update statistics
      if (nearestStation) {
        totalDistanceToNearestStation += nearestStation.distance;
      }
      if (isAtStation) {
        vehiclesAtStations++;
      } else if (isCloseToStation) {
        vehiclesCloseToStations++;
      }
    }

    // Calculate analysis statistics
    const averageDistanceToNearestStation = validVehicles.length > 0 
      ? totalDistanceToNearestStation / validVehicles.length 
      : 0;

    const vehiclesBetweenStations = validVehicles.length - vehiclesAtStations - vehiclesCloseToStations;

    const analysisStats = {
      totalVehicles: validVehicles.length,
      vehiclesAtStations,
      vehiclesCloseToStations,
      vehiclesBetweenStations,
      averageDistanceToNearestStation: Math.round(averageDistanceToNearestStation)
    };

    logger.debug('Vehicle-station analysis completed', {
      totalVehicles: validVehicles.length,
      totalStations: validStations.length,
      analysisStats,
      statusBreakdown: {
        atStation: vehiclesAtStations,
        closeToStation: vehiclesCloseToStations,
        betweenStations: vehiclesBetweenStations
      },
      options: {
        atStationThreshold,
        requireStoppedForAtStation
      }
    }, 'useVehicleStationAnalysis');

    return {
      analyzedVehicles,
      analysisStats
    };
  }, [
    vehicles,
    stations,
    atStationThreshold,
    requireStoppedForAtStation
  ]);
};