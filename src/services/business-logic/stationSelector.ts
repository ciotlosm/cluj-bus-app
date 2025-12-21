/**
 * Station Selection Core Logic
 * 
 * This module implements the core logic for identifying qualifying stations
 * based on route associations, distance calculations, and threshold evaluation.
 * 
 * Requirements: 1.1, 1.2, 2.2, 2.3, 2.4, 2.5
 */

import type { Coordinates, Station } from '../../types';
import type { Route, StopTime, Trip } from '../../types/tranzyApi';
import {
  NEARBY_STATION_DISTANCE_THRESHOLD,
  MAX_NEARBY_SEARCH_RADIUS,
  calculateUserToStationDistance,
  calculateStationProximity,
  shouldDisplaySecondStation,
  createStationDistanceInfo,
  type StationDistanceInfo
} from '../../utils/shared/nearbyViewConstants';
import { calculateDistance } from '../../utils/data-processing/distanceUtils';
import { logger } from '../../utils/shared/logger';
import {
  optimizedDistanceCalculation,
  optimizedRouteAssociationFiltering,
  type NearbyViewPerformanceMonitor
} from '../../utils/performance/nearbyViewPerformance';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Station selection criteria input
 */
export interface StationSelectionCriteria {
  userLocation: Coordinates;
  availableStations: Station[];
  routeData: Route[];
  stopTimesData?: StopTime[]; // Optional GTFS stop_times data for accurate route associations
  tripsData?: Trip[]; // Optional GTFS trips data for trip_id to route_id mapping
  maxSearchRadius?: number;
}

/**
 * Station with associated route information
 */
export interface StationWithRoutes extends Station {
  associatedRoutes: Route[];
  distanceFromUser: number;
}

/**
 * Station selection result
 */
export interface StationSelectionResult {
  closestStation: StationWithRoutes | null;
  secondStation: StationWithRoutes | null;
  rejectedStations: Array<{
    station: Station;
    rejectionReason: 'no_routes' | 'too_far' | 'threshold_exceeded';
  }>;
}

/**
 * Route association result for a station
 */
export interface RouteAssociationResult {
  hasRoutes: boolean;
  associatedRoutes: Route[];
  routeCount: number;
}

// ============================================================================
// ROUTE ASSOCIATION FILTER
// ============================================================================

/**
 * Determine which stations have valid route relationships using GTFS stop_times and trips data
 * 
 * @param stations - Array of stations to evaluate
 * @param routes - Array of available routes
 * @param stopTimes - Optional GTFS stop_times data for route-station associations
 * @param trips - Optional GTFS trips data for trip_id to route_id mapping
 * @returns Map of station ID to route association result
 * 
 * Requirements 1.2, 4.4, 6.2: Route association filtering
 */
export const filterStationsByRouteAssociation = (
  stations: Station[],
  routes: Route[],
  stopTimes?: StopTime[],
  trips?: Trip[],
  performanceMonitor?: NearbyViewPerformanceMonitor
): Map<string, RouteAssociationResult> => {
  // Use optimized route association filtering for better performance
  const optimizedResult = optimizedRouteAssociationFiltering(
    stations,
    routes,
    stopTimes,
    trips,
    performanceMonitor
  );
  
  // Convert to the expected format
  const associationMap = new Map<string, RouteAssociationResult>();
  
  optimizedResult.forEach((result, stationId) => {
    associationMap.set(stationId, {
      hasRoutes: result.hasRoutes,
      associatedRoutes: result.associatedRoutes,
      routeCount: result.routeCount
    });
  });
  
  return associationMap;
  
  // Legacy implementation kept for reference but not used
  /*
  const associationMap = new Map<string, RouteAssociationResult>();
  
  // Create maps for quick lookups
  const routeMap = new Map<string, Route>();
  routes.forEach(route => {
    routeMap.set(route.id, route);
  });
  
  const tripToRouteMap = new Map<string, string>();
  if (trips && Array.isArray(trips)) {
    trips.forEach(trip => {
      tripToRouteMap.set(trip.id, trip.routeId);
    });
  }
  
  for (const station of stations) {
    let associatedRoutes: Route[] = [];
    
    if (stopTimes && Array.isArray(stopTimes) && trips && Array.isArray(trips)) {
      // Use GTFS stop_times and trips data to find actual route associations
      const stationStopTimes = stopTimes.filter(stopTime => 
        stopTime && 
        stopTime.stopId && 
        stopTime.stopId.toString() === station.id.toString()
      );
      
      // Extract unique route IDs using proper GTFS trip_id -> route_id mapping
      const routeIds = new Set<string>();
      
      for (const stopTime of stationStopTimes) {
        if (stopTime.tripId) {
          // Use trips data to map trip_id to route_id (proper GTFS approach)
          const routeId = tripToRouteMap.get(stopTime.tripId);
          if (routeId) {
            routeIds.add(routeId);
          }
        }
      }
      
      // Convert route IDs to route objects
      associatedRoutes = Array.from(routeIds)
        .map(routeId => routeMap.get(routeId))
        .filter((route): route is Route => route !== undefined);
      
      logger.debug('Station route association from GTFS data', {
        stationId: station.id,
        stationName: station.name,
        stopTimesCount: stationStopTimes.length,
        tripsCount: trips.length,
        routeIds: Array.from(routeIds),
        associatedRoutesCount: associatedRoutes.length
      });
    } else if (stopTimes && Array.isArray(stopTimes)) {
      // Partial data: have stop_times but no trips data
      // Log warning and fall back to assuming all routes
      logger.warn('Station route association: stop_times available but no trips data for proper mapping', {
        stationId: station.id,
        stationName: station.name,
        hasStopTimes: true,
        hasTrips: false
      });
      
      associatedRoutes = routes;
    } else {
      // Fallback: assume all routes serve all stations (for backward compatibility)
      // This maintains the existing behavior when GTFS data is not available
      associatedRoutes = routes;
      
      logger.debug('Station route association fallback (no GTFS data)', {
        stationId: station.id,
        stationName: station.name,
        assumedRoutesCount: associatedRoutes.length,
        hasStopTimes: !!stopTimes,
        hasTrips: !!trips
      });
    }
    
    const result: RouteAssociationResult = {
      hasRoutes: associatedRoutes.length > 0,
      associatedRoutes,
      routeCount: associatedRoutes.length
    };
    
    associationMap.set(station.id, result);
  }
  
  logger.debug('Route association filtering completed', {
    totalStations: stations.length,
    stationsWithRoutes: Array.from(associationMap.values()).filter(r => r.hasRoutes).length,
    totalRoutes: routes.length,
    hasStopTimesData: !!stopTimes,
    hasTripsData: !!trips
  });
  
  return associationMap;
  */
};

/**
 * Filter stations to only include those with route associations
 * 
 * @param stations - Array of stations to filter
 * @param routes - Array of available routes
 * @param stopTimes - Optional GTFS stop_times data for accurate route associations
 * @param trips - Optional GTFS trips data for trip_id to route_id mapping
 * @returns Array of stations with route information
 * 
 * Requirements 1.2, 1.3, 2.2: Only consider stations with route associations
 */
export const getStationsWithRoutes = (
  stations: Station[],
  routes: Route[],
  stopTimes?: StopTime[],
  trips?: Trip[],
  performanceMonitor?: NearbyViewPerformanceMonitor
): StationWithRoutes[] => {
  const associationMap = filterStationsByRouteAssociation(stations, routes, stopTimes, trips, performanceMonitor);
  const stationsWithRoutes: StationWithRoutes[] = [];
  
  for (const station of stations) {
    const association = associationMap.get(station.id);
    
    if (association && association.hasRoutes) {
      const stationWithRoutes: StationWithRoutes = {
        ...station,
        associatedRoutes: association.associatedRoutes,
        distanceFromUser: 0 // Will be calculated later
      };
      
      stationsWithRoutes.push(stationWithRoutes);
    }
  }
  
  logger.debug('Filtered stations by route association', {
    totalStations: stations.length,
    stationsWithRoutes: stationsWithRoutes.length,
    routesAvailable: routes.length,
    hasStopTimesData: !!stopTimes,
    hasTripsData: !!trips
  });
  
  return stationsWithRoutes;
};

// ============================================================================
// STATION SELECTOR CLASS
// ============================================================================

/**
 * Core station selection logic implementation
 * 
 * Implements the main algorithm for identifying the closest station and
 * evaluating potential second stations based on distance thresholds.
 */
export class StationSelector {
  private distanceThreshold: number;
  private maxSearchRadius: number;
  
  constructor(
    distanceThreshold: number = NEARBY_STATION_DISTANCE_THRESHOLD,
    maxSearchRadius: number = MAX_NEARBY_SEARCH_RADIUS
  ) {
    this.distanceThreshold = distanceThreshold;
    this.maxSearchRadius = maxSearchRadius;
  }
  
  /**
   * Main station selection algorithm
   * 
   * @param criteria - Station selection criteria
   * @returns Station selection result with closest and optional second station
   * 
   * Requirements 1.1, 1.2, 2.2, 2.3, 2.4, 2.5: Complete station selection logic
   */
  selectStations(criteria: StationSelectionCriteria, performanceMonitor?: NearbyViewPerformanceMonitor): StationSelectionResult {
    const { userLocation, availableStations, routeData, stopTimesData, tripsData } = criteria;
    const maxRadius = criteria.maxSearchRadius || this.maxSearchRadius;
    
    const selectionStartTime = performance.now();
    
    logger.debug('Starting station selection', {
      userLocation,
      totalStations: availableStations.length,
      totalRoutes: routeData.length,
      hasStopTimesData: !!stopTimesData,
      stopTimesCount: stopTimesData?.length || 0,
      hasTripsData: !!tripsData,
      tripsCount: tripsData?.length || 0,
      maxRadius
    });
    
    // Step 1: Filter stations by route associations
    const stationsWithRoutes = this.filterStationsByRoutes(availableStations, routeData, stopTimesData, tripsData, performanceMonitor);
    
    if (stationsWithRoutes.length === 0) {
      logger.warn('No stations found with route associations');
      return {
        closestStation: null,
        secondStation: null,
        rejectedStations: availableStations.map(station => ({
          station,
          rejectionReason: 'no_routes' as const
        }))
      };
    }
    
    // Step 2: Calculate distances and filter by search radius (with optimization)
    const stationsWithDistances = this.calculateStationDistances(stationsWithRoutes, userLocation, performanceMonitor);
    const stationsInRadius = stationsWithDistances.filter(info => 
      info.distanceFromUser <= maxRadius
    );
    
    if (stationsInRadius.length === 0) {
      logger.warn('No stations found within search radius', { maxRadius });
      return {
        closestStation: null,
        secondStation: null,
        rejectedStations: stationsWithRoutes.map(station => ({
          station,
          rejectionReason: 'too_far' as const
        }))
      };
    }
    
    // Step 3: Sort by distance and identify closest station
    const sortedStations = stationsInRadius.sort((a, b) => a.distanceFromUser - b.distanceFromUser);
    const closestStationInfo = sortedStations[0];
    
    // The closest station already has the calculated distance from calculateStationDistances
    const closestStation = closestStationInfo.station as StationWithRoutes;
    
    logger.debug('Identified closest station', {
      stationId: closestStation.id,
      stationName: closestStation.name,
      distance: closestStation.distanceFromUser,
      routeCount: closestStation.associatedRoutes.length
    });
    
    // Step 4: Evaluate potential second station
    const secondStation = this.evaluateSecondStation(closestStation, sortedStations.slice(1));
    
    // Step 5: Collect rejected stations
    const rejectedStations = this.collectRejectedStations(
      availableStations,
      stationsWithRoutes,
      stationsInRadius,
      closestStation,
      secondStation
    );
    
    const result: StationSelectionResult = {
      closestStation,
      secondStation,
      rejectedStations
    };
    
    // Record station selection performance
    const selectionEndTime = performance.now();
    const selectionDuration = selectionEndTime - selectionStartTime;
    
    if (performanceMonitor) {
      performanceMonitor.recordStationSelection(selectionDuration, availableStations.length);
    }
    
    logger.debug('Station selection completed', {
      hasClosestStation: !!result.closestStation,
      hasSecondStation: !!result.secondStation,
      rejectedCount: result.rejectedStations.length,
      selectionTime: selectionDuration
    });
    
    return result;
  }
  
  /**
   * Filter stations that have associated routes
   * 
   * @param stations - Array of stations to filter
   * @param routes - Array of available routes
   * @param stopTimes - Optional GTFS stop_times data for accurate route associations
   * @param trips - Optional GTFS trips data for trip_id to route_id mapping
   * @returns Array of stations with route information
   * 
   * Requirements 1.2, 1.3: Only consider stations with route associations
   */
  private filterStationsByRoutes(stations: Station[], routes: Route[], stopTimes?: StopTime[], trips?: Trip[], performanceMonitor?: NearbyViewPerformanceMonitor): StationWithRoutes[] {
    return getStationsWithRoutes(stations, routes, stopTimes, trips, performanceMonitor);
  }
  
  /**
   * Calculate distances from user location to all stations
   * 
   * @param stations - Array of stations with routes
   * @param userLocation - User's GPS coordinates
   * @returns Array of station distance information
   * 
   * Requirements 1.1: Calculate geographic distance from user coordinates
   */
  private calculateStationDistances(
    stations: StationWithRoutes[],
    userLocation: Coordinates,
    performanceMonitor?: NearbyViewPerformanceMonitor
  ): StationDistanceInfo[] {
    if (performanceMonitor) {
      // Use optimized distance calculation with performance monitoring
      const results = optimizedDistanceCalculation(
        userLocation,
        stations,
        (from: Coordinates, to: Coordinates) => calculateDistance(from, to),
        performanceMonitor
      );
      
      // Update station objects with calculated distances and create distance info
      return results.map(({ station, distance }) => {
        const stationWithRoutes = station as StationWithRoutes;
        stationWithRoutes.distanceFromUser = distance;
        return createStationDistanceInfo(userLocation, stationWithRoutes);
      });
    } else {
      // Fallback to standard calculation
      return stations.map(station => {
        const distanceFromUser = calculateUserToStationDistance(userLocation, station);
        
        // Update the station object with calculated distance
        station.distanceFromUser = distanceFromUser;
        
        return createStationDistanceInfo(userLocation, station);
      });
    }
  }
  
  /**
   * Evaluate potential second station based on distance threshold
   * 
   * @param closestStation - The identified closest station
   * @param candidates - Array of candidate stations (excluding closest)
   * @returns Second station if one meets criteria, null otherwise
   * 
   * Requirements 2.3, 2.4, 2.5: Distance threshold evaluation for second station
   */
  private evaluateSecondStation(
    closestStation: StationWithRoutes,
    candidates: StationDistanceInfo[]
  ): StationWithRoutes | null {
    for (const candidate of candidates) {
      // Check if candidate has route associations (should already be filtered, but double-check)
      const candidateStation = candidate.station as StationWithRoutes;
      if (!candidateStation.associatedRoutes || candidateStation.associatedRoutes.length === 0) {
        continue;
      }
      
      // Apply distance threshold logic
      if (shouldDisplaySecondStation(closestStation, candidateStation, this.distanceThreshold)) {
        // Update candidate with distance information
        candidateStation.distanceFromUser = candidate.distanceFromUser;
        
        logger.debug('Selected second station', {
          stationId: candidateStation.id,
          stationName: candidateStation.name,
          distanceFromUser: candidateStation.distanceFromUser,
          distanceFromClosest: calculateStationProximity(closestStation, candidateStation),
          threshold: this.distanceThreshold
        });
        
        return candidateStation;
      }
    }
    
    logger.debug('No second station meets distance threshold', {
      threshold: this.distanceThreshold,
      candidatesEvaluated: candidates.length
    });
    
    return null;
  }
  
  /**
   * Collect information about rejected stations for debugging and analysis
   * 
   * @param allStations - All original stations
   * @param stationsWithRoutes - Stations that had routes
   * @param stationsInRadius - Stations within search radius
   * @param closestStation - Selected closest station
   * @param secondStation - Selected second station (if any)
   * @returns Array of rejected stations with reasons
   */
  private collectRejectedStations(
    allStations: Station[],
    stationsWithRoutes: StationWithRoutes[],
    stationsInRadius: StationDistanceInfo[],
    closestStation: StationWithRoutes,
    secondStation: StationWithRoutes | null
  ): Array<{ station: Station; rejectionReason: 'no_routes' | 'too_far' | 'threshold_exceeded' }> {
    const rejected: Array<{ station: Station; rejectionReason: 'no_routes' | 'too_far' | 'threshold_exceeded' }> = [];
    const selectedStationIds = new Set([
      closestStation.id,
      ...(secondStation ? [secondStation.id] : [])
    ]);
    
    for (const station of allStations) {
      if (selectedStationIds.has(station.id)) {
        continue; // Skip selected stations
      }
      
      // Determine rejection reason
      const hasRoutes = stationsWithRoutes.some(s => s.id === station.id);
      if (!hasRoutes) {
        rejected.push({ station, rejectionReason: 'no_routes' });
        continue;
      }
      
      const inRadius = stationsInRadius.some(s => s.station.id === station.id);
      if (!inRadius) {
        rejected.push({ station, rejectionReason: 'too_far' });
        continue;
      }
      
      // If it had routes and was in radius but wasn't selected, it exceeded threshold
      rejected.push({ station, rejectionReason: 'threshold_exceeded' });
    }
    
    return rejected;
  }
}

// ============================================================================
// EXPORTED INSTANCE
// ============================================================================

/**
 * Default station selector instance with standard configuration
 */
export const stationSelector = new StationSelector();