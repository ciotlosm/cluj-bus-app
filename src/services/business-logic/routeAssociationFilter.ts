/**
 * Route Association Filter Component
 * 
 * This module implements functions to determine stations with valid route relationships,
 * route data validation, and association logic for the Nearby View Stabilization system.
 * 
 * Requirements: 1.2, 4.4, 6.2
 */

import type { Station } from '../types';
import { RouteType } from '../types';
import type { Route, StopTime, Trip } from '../types/tranzyApi';
import { logger } from '../utils/shared/logger';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Route association result for a single station
 * 
 * Requirements 1.2, 4.4: Route association filtering and validation
 */
export interface RouteAssociation {
  stationId: string;
  routeIds: string[];
  hasActiveRoutes: boolean;
}

/**
 * Comprehensive route association result
 * 
 * Requirements 1.2, 4.4: Route data validation and association logic
 */
export interface RouteAssociationResult {
  hasRoutes: boolean;
  associatedRoutes: Route[];
  routeCount: number;
}

/**
 * Station with validated route associations
 * 
 * Requirements 1.2: Only consider stations with route associations
 */
export interface StationWithValidatedRoutes extends Station {
  associatedRoutes: Route[];
  routeAssociation: RouteAssociation;
  isValidForDisplay: boolean;
}

/**
 * Route validation result
 * 
 * Requirements 6.2: Route data validation
 */
export interface RouteValidationResult {
  isValid: boolean;
  validRoutes: Route[];
  invalidRoutes: Route[];
  validationErrors: string[];
}

/**
 * Route association filter options
 */
export interface RouteAssociationFilterOptions {
  requireActiveRoutes?: boolean;
  validateRouteData?: boolean;
  logDetailedResults?: boolean;
}

// ============================================================================
// ROUTE DATA VALIDATION
// ============================================================================

/**
 * Validate route data structure and completeness
 * 
 * @param routes - Array of routes to validate
 * @returns Route validation result with valid/invalid routes and errors
 * 
 * Requirements 6.2: Route data validation and association logic
 */
export const validateRouteData = (routes: Route[]): RouteValidationResult => {
  const validRoutes: Route[] = [];
  const invalidRoutes: Route[] = [];
  const validationErrors: string[] = [];

  if (!Array.isArray(routes)) {
    validationErrors.push('Routes data is not an array');
    return {
      isValid: false,
      validRoutes: [],
      invalidRoutes: [],
      validationErrors
    };
  }

  for (const route of routes) {
    const routeErrors: string[] = [];

    // Validate required fields
    if (!route.id || typeof route.id !== 'string') {
      routeErrors.push(`Route missing or invalid id: ${route.id}`);
    }

    if (!route.routeName || typeof route.routeName !== 'string') {
      routeErrors.push(`Route ${route.id} missing or invalid routeName: ${route.routeName}`);
    }

    if (!route.agencyId || typeof route.agencyId !== 'string') {
      routeErrors.push(`Route ${route.id} missing or invalid agencyId: ${route.agencyId}`);
    }

    // Validate route type
    const validRouteTypes = Object.values(RouteType);
    if (!route.type || !validRouteTypes.includes(route.type)) {
      routeErrors.push(`Route ${route.id} has invalid type: ${route.type}`);
    }

    if (routeErrors.length === 0) {
      validRoutes.push(route);
    } else {
      invalidRoutes.push(route);
      validationErrors.push(...routeErrors);
    }
  }

  const isValid = validRoutes.length > 0 && invalidRoutes.length === 0;

  logger.debug('Route data validation completed', {
    totalRoutes: routes.length,
    validRoutes: validRoutes.length,
    invalidRoutes: invalidRoutes.length,
    isValid,
    errorCount: validationErrors.length
  });

  return {
    isValid,
    validRoutes,
    invalidRoutes,
    validationErrors
  };
};

/**
 * Validate GTFS stop times data structure
 * 
 * @param stopTimes - Array of stop times to validate
 * @returns True if stop times data is valid and usable
 * 
 * Requirements 6.2: Route data validation
 */
export const validateStopTimesData = (stopTimes?: StopTime[]): boolean => {
  if (!stopTimes || !Array.isArray(stopTimes)) {
    return false;
  }

  // Check if we have at least some valid stop times
  const validStopTimes = stopTimes.filter(st => 
    st && 
    typeof st.stopId === 'string' && 
    typeof st.tripId === 'string' &&
    st.stopId.length > 0 &&
    st.tripId.length > 0
  );

  const isValid = validStopTimes.length > 0;

  logger.debug('Stop times data validation', {
    totalStopTimes: stopTimes.length,
    validStopTimes: validStopTimes.length,
    isValid
  });

  return isValid;
};

/**
 * Validate GTFS trips data structure
 * 
 * @param trips - Array of trips to validate
 * @returns True if trips data is valid and usable
 * 
 * Requirements 6.2: Route data validation
 */
export const validateTripsData = (trips?: Trip[]): boolean => {
  if (!trips || !Array.isArray(trips)) {
    return false;
  }

  // Check if we have at least some valid trips
  const validTrips = trips.filter(trip => 
    trip && 
    typeof trip.id === 'string' && 
    typeof trip.routeId === 'string' &&
    trip.id.length > 0 &&
    trip.routeId.length > 0
  );

  const isValid = validTrips.length > 0;

  logger.debug('Trips data validation', {
    totalTrips: trips.length,
    validTrips: validTrips.length,
    isValid
  });

  return isValid;
};

// ============================================================================
// ROUTE ASSOCIATION LOGIC
// ============================================================================

/**
 * Determine stations with valid route relationships using GTFS data
 * 
 * This function implements the core logic for identifying which stations have
 * active routes passing through them based on GTFS stop_times and trips data.
 * 
 * @param stations - Array of stations to evaluate
 * @param routes - Array of available routes
 * @param stopTimes - Optional GTFS stop_times data for route-station associations
 * @param trips - Optional GTFS trips data for trip_id to route_id mapping
 * @param options - Optional configuration for filtering behavior
 * @returns Map of station ID to route association result
 * 
 * Requirements 1.2, 4.4: Determine stations with valid route relationships
 */
export const determineStationRouteAssociations = (
  stations: Station[],
  routes: Route[],
  stopTimes?: StopTime[],
  trips?: Trip[],
  options: RouteAssociationFilterOptions = {}
): Map<string, RouteAssociationResult> => {
  const {
    requireActiveRoutes = true,
    validateRouteData: shouldValidateRouteData = true,
    logDetailedResults = false
  } = options;

  const associationMap = new Map<string, RouteAssociationResult>();

  // Validate input data if requested
  if (shouldValidateRouteData) {
    const routeValidation = validateRouteData(routes);
    if (!routeValidation.isValid) {
      logger.warn('Route data validation failed', {
        errors: routeValidation.validationErrors,
        validRoutes: routeValidation.validRoutes.length,
        invalidRoutes: routeValidation.invalidRoutes.length
      });
      
      // Use only valid routes for processing
      routes = routeValidation.validRoutes;
    }
  }

  // Create lookup maps for efficient processing
  const routeMap = new Map<string, Route>();
  routes.forEach(route => {
    routeMap.set(route.id, route);
  });

  const tripToRouteMap = new Map<string, string>();
  if (validateTripsData(trips)) {
    trips!.forEach(trip => {
      tripToRouteMap.set(trip.id, trip.routeId);
    });
  }

  // Process each station to determine route associations
  for (const station of stations) {
    let associatedRoutes: Route[] = [];

    if (validateStopTimesData(stopTimes) && validateTripsData(trips)) {
      // Use GTFS data for accurate route associations
      associatedRoutes = getRoutesFromGTFSData(
        station,
        routeMap,
        tripToRouteMap,
        stopTimes!,
        logDetailedResults
      );
    } else if (requireActiveRoutes) {
      // No valid GTFS data and active routes required - no associations
      logger.debug('No valid GTFS data available and active routes required', {
        stationId: station.id,
        stationName: station.name,
        hasStopTimes: !!stopTimes,
        hasTrips: !!trips
      });
      associatedRoutes = [];
    } else {
      // Fallback: assume all routes serve all stations (backward compatibility)
      associatedRoutes = routes;
      
      if (logDetailedResults) {
        logger.debug('Using fallback route association (all routes)', {
          stationId: station.id,
          stationName: station.name,
          routeCount: associatedRoutes.length
        });
      }
    }

    const result: RouteAssociationResult = {
      hasRoutes: associatedRoutes.length > 0,
      associatedRoutes,
      routeCount: associatedRoutes.length
    };

    associationMap.set(station.id, result);
  }

  logger.debug('Station route associations determined', {
    totalStations: stations.length,
    stationsWithRoutes: Array.from(associationMap.values()).filter(r => r.hasRoutes).length,
    totalRoutes: routes.length,
    hasValidStopTimes: validateStopTimesData(stopTimes),
    hasValidTrips: validateTripsData(trips),
    requireActiveRoutes
  });

  return associationMap;
};

/**
 * Extract route associations from GTFS stop_times and trips data
 * 
 * @param station - Station to analyze
 * @param routeMap - Map of route ID to route object
 * @param tripToRouteMap - Map of trip ID to route ID
 * @param stopTimes - GTFS stop_times data
 * @param logDetails - Whether to log detailed processing information
 * @returns Array of routes associated with the station
 */
const getRoutesFromGTFSData = (
  station: Station,
  routeMap: Map<string, Route>,
  tripToRouteMap: Map<string, string>,
  stopTimes: StopTime[],
  logDetails: boolean
): Route[] => {
  // Find all stop times for this station
  const stationStopTimes = stopTimes.filter(stopTime => 
    stopTime && 
    stopTime.stopId && 
    stopTime.stopId.toString() === station.id.toString()
  );

  if (stationStopTimes.length === 0) {
    if (logDetails) {
      logger.debug('No stop times found for station', {
        stationId: station.id,
        stationName: station.name
      });
    }
    return [];
  }

  // Extract unique route IDs using GTFS trip_id -> route_id mapping
  const routeIds = new Set<string>();

  for (const stopTime of stationStopTimes) {
    if (stopTime.tripId) {
      const routeId = tripToRouteMap.get(stopTime.tripId);
      if (routeId) {
        routeIds.add(routeId);
      } else if (logDetails) {
        logger.debug('No route found for trip', {
          stationId: station.id,
          tripId: stopTime.tripId
        });
      }
    }
  }

  // Convert route IDs to route objects
  const associatedRoutes = Array.from(routeIds)
    .map(routeId => routeMap.get(routeId))
    .filter((route): route is Route => route !== undefined);

  if (logDetails) {
    logger.debug('GTFS route association extracted', {
      stationId: station.id,
      stationName: station.name,
      stopTimesCount: stationStopTimes.length,
      uniqueTrips: new Set(stationStopTimes.map(st => st.tripId)).size,
      routeIds: Array.from(routeIds),
      associatedRoutesCount: associatedRoutes.length
    });
  }

  return associatedRoutes;
};

/**
 * Filter stations to only include those with valid route associations
 * 
 * @param stations - Array of stations to filter
 * @param routes - Array of available routes
 * @param stopTimes - Optional GTFS stop_times data
 * @param trips - Optional GTFS trips data
 * @param options - Optional filtering configuration
 * @returns Array of stations with validated route associations
 * 
 * Requirements 1.2, 4.4: Filter stations with valid route relationships
 */
export const filterStationsWithValidRoutes = (
  stations: Station[],
  routes: Route[],
  stopTimes?: StopTime[],
  trips?: Trip[],
  options: RouteAssociationFilterOptions = {}
): StationWithValidatedRoutes[] => {
  const associationMap = determineStationRouteAssociations(
    stations,
    routes,
    stopTimes,
    trips,
    options
  );

  const stationsWithValidRoutes: StationWithValidatedRoutes[] = [];

  for (const station of stations) {
    const association = associationMap.get(station.id);

    if (association && association.hasRoutes) {
      const routeAssociation: RouteAssociation = {
        stationId: station.id,
        routeIds: association.associatedRoutes.map(route => route.id),
        hasActiveRoutes: association.hasRoutes
      };

      const stationWithRoutes: StationWithValidatedRoutes = {
        ...station,
        associatedRoutes: association.associatedRoutes,
        routeAssociation,
        isValidForDisplay: true
      };

      stationsWithValidRoutes.push(stationWithRoutes);
    }
  }

  logger.debug('Filtered stations with valid routes', {
    totalStations: stations.length,
    stationsWithValidRoutes: stationsWithValidRoutes.length,
    routesAvailable: routes.length,
    hasStopTimesData: !!stopTimes,
    hasTripsData: !!trips
  });

  return stationsWithValidRoutes;
};

/**
 * Create route association information for a single station
 * 
 * @param station - Station to analyze
 * @param routes - Array of available routes
 * @param stopTimes - Optional GTFS stop_times data
 * @param trips - Optional GTFS trips data
 * @returns Route association result for the station
 * 
 * Requirements 1.2, 4.4: Route association logic for individual stations
 */
export const getStationRouteAssociation = (
  station: Station,
  routes: Route[],
  stopTimes?: StopTime[],
  trips?: Trip[]
): RouteAssociationResult => {
  const associationMap = determineStationRouteAssociations(
    [station],
    routes,
    stopTimes,
    trips,
    { logDetailedResults: true }
  );

  const result = associationMap.get(station.id);
  
  if (!result) {
    logger.warn('No route association result for station', {
      stationId: station.id,
      stationName: station.name
    });
    
    return {
      hasRoutes: false,
      associatedRoutes: [],
      routeCount: 0
    };
  }

  return result;
};

/**
 * Validate that a station has the minimum required route associations for display
 * 
 * @param station - Station to validate
 * @param routes - Array of available routes
 * @param stopTimes - Optional GTFS stop_times data
 * @param trips - Optional GTFS trips data
 * @param minRoutes - Minimum number of routes required (default: 1)
 * @returns True if station meets minimum route requirements
 * 
 * Requirements 4.4: Route data validation for display eligibility
 */
export const validateStationForDisplay = (
  station: Station,
  routes: Route[],
  stopTimes?: StopTime[],
  trips?: Trip[],
  minRoutes: number = 1
): boolean => {
  const association = getStationRouteAssociation(station, routes, stopTimes, trips);
  
  const isValid = association.hasRoutes && association.routeCount >= minRoutes;
  
  logger.debug('Station display validation', {
    stationId: station.id,
    stationName: station.name,
    routeCount: association.routeCount,
    minRoutes,
    isValid
  });
  
  return isValid;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get summary statistics for route associations across all stations
 * 
 * @param stations - Array of stations to analyze
 * @param routes - Array of available routes
 * @param stopTimes - Optional GTFS stop_times data
 * @param trips - Optional GTFS trips data
 * @returns Summary statistics object
 */
export const getRouteAssociationStatistics = (
  stations: Station[],
  routes: Route[],
  stopTimes?: StopTime[],
  trips?: Trip[]
) => {
  const associationMap = determineStationRouteAssociations(
    stations,
    routes,
    stopTimes,
    trips
  );

  const stationsWithRoutes = Array.from(associationMap.values()).filter(r => r.hasRoutes);
  const routeCounts = stationsWithRoutes.map(r => r.routeCount);
  
  const statistics = {
    totalStations: stations.length,
    stationsWithRoutes: stationsWithRoutes.length,
    stationsWithoutRoutes: stations.length - stationsWithRoutes.length,
    totalRoutes: routes.length,
    averageRoutesPerStation: routeCounts.length > 0 
      ? routeCounts.reduce((sum, count) => sum + count, 0) / routeCounts.length 
      : 0,
    maxRoutesPerStation: routeCounts.length > 0 ? Math.max(...routeCounts) : 0,
    minRoutesPerStation: routeCounts.length > 0 ? Math.min(...routeCounts) : 0,
    hasGTFSData: validateStopTimesData(stopTimes) && validateTripsData(trips)
  };

  logger.debug('Route association statistics', statistics);

  return statistics;
};