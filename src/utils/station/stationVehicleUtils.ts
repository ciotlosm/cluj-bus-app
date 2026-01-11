/**
 * Station Vehicle Utilities
 * Vehicle retrieval and station metadata management
 * Supports both original and enhanced vehicle data with position predictions
 */

import { 
  getCachedStationRouteMapping, 
  getRouteIdsForStation 
} from '../route/routeStationMapping';
import { calculateVehicleArrivalTime, sortVehiclesByArrival, isVehicleOffRoute } from '../arrival/arrivalUtils';
import type { StationVehicle, FilteredStation } from '../../types/stationFilter';
import type { TranzyStopTimeResponse, TranzyVehicleResponse, TranzyRouteResponse, TranzyTripResponse, TranzyStopResponse } from '../../types/rawTranzyApi';
import type { EnhancedVehicleData } from '../vehicle/vehicleEnhancementUtils';
import type { ArrivalTimeResult, ArrivalStatus, RouteShape } from '../../types/arrivalTime';

/**
 * Sort StationVehicle objects by arrival time using existing arrival sorting logic
 * Adapts StationVehicle objects to work with the existing sortVehiclesByArrival function
 */
export const sortStationVehiclesByArrival = (vehicles: StationVehicle[]): StationVehicle[] => {
  // Convert StationVehicle objects to ArrivalTimeResult objects for sorting
  const arrivalResults: (ArrivalTimeResult & { originalVehicle: StationVehicle })[] = vehicles.map(stationVehicle => {
    if (stationVehicle.arrivalTime) {
      // Create a mock ArrivalTimeResult that matches the sorting interface
      return {
        vehicleId: stationVehicle.vehicle.id, // Keep as number - matches API type
        estimatedMinutes: stationVehicle.arrivalTime.estimatedMinutes,
        status: getStatusFromMessage(stationVehicle.arrivalTime.statusMessage), // Convert message back to status
        statusMessage: stationVehicle.arrivalTime.statusMessage,
        confidence: stationVehicle.arrivalTime.confidence,
        calculationMethod: 'route_shape' as const, // Default value
        originalVehicle: stationVehicle
      } as ArrivalTimeResult & { originalVehicle: StationVehicle };
    } else {
      // Vehicle without arrival time - assign lowest priority
      return {
        vehicleId: stationVehicle.vehicle.id, // Keep as number - matches API type
        estimatedMinutes: 999, // High value for sorting to end
        status: 'off_route' as const, // Lowest priority status
        statusMessage: '',
        confidence: 'low' as const,
        calculationMethod: 'route_shape' as const,
        originalVehicle: stationVehicle
      } as ArrivalTimeResult & { originalVehicle: StationVehicle };
    }
  });

  // Use existing sorting logic
  const sortedResults = sortVehiclesByArrival(arrivalResults as ArrivalTimeResult[]);
  
  // Extract the original StationVehicle objects in sorted order
  return (sortedResults as (ArrivalTimeResult & { originalVehicle: StationVehicle })[])
    .map(result => result.originalVehicle);
};

/**
 * Helper function to convert status message back to status enum
 * Updated to match the new 4-status system
 */
function getStatusFromMessage(statusMessage: string): ArrivalStatus {
  if (statusMessage.includes('At stop')) return 'at_stop';
  if (statusMessage.includes('Departed')) return 'departed';
  if (statusMessage.includes('minutes')) return 'in_minutes';
  return 'off_route';
}

/**
 * Get vehicles serving a specific station with arrival time calculations
 * Supports both original and enhanced vehicle data with position predictions
 */
export const getStationVehicles = (
  stationId: number,
  stopTimes: TranzyStopTimeResponse[],
  vehicles: EnhancedVehicleData[], // Simplified: only accept enhanced vehicles
  allRoutes: TranzyRouteResponse[],
  trips: TranzyTripResponse[] = [], // NEW: trip data for headsign
  stops: TranzyStopResponse[] = [], // NEW: stop data for arrival calculations
  routeShapes?: Map<string, RouteShape> // NEW: route shapes for accurate distance calculations
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

    // Performance optimization: create lookup maps for faster access
    const routeMap = new Map(allRoutes.map(route => [route.route_id, route]));
    const tripMap = new Map(trips.map(trip => [trip.trip_id, trip]));
    
    // Find the target stop for arrival calculations
    const targetStop = stops.find(stop => stop.stop_id === stationId);
    
    // Filter vehicles that match this station's route IDs AND actually stop at this station
    const filteredVehicles = vehicles.filter(vehicle => {
      // Basic route matching - require both route_id and trip_id
      if (vehicle.route_id === null || 
          vehicle.route_id === undefined ||
          !routeIds.includes(vehicle.route_id) ||
          !vehicle.trip_id) {
        return false;
      }
      
      // Basic validation - vehicle must have valid coordinates
      if (!vehicle.latitude || !vehicle.longitude) {
        return false;
      }
      
      // CRITICAL: Verify this vehicle's trip actually stops at this station
      const vehicleStopsAtStation = stopTimes.some(st => 
        st.trip_id === vehicle.trip_id && st.stop_id === stationId
      );
      
      if (!vehicleStopsAtStation) {
        return false;
      }
      
      return true;
    });

    // Combine vehicle data with route, trip, and arrival time information
    const vehiclesWithData = filteredVehicles
      .map(vehicle => {
        // Use map lookup for O(1) access instead of O(n) find
        const route = routeMap.get(vehicle.route_id) || null;
        const trip = vehicle.trip_id ? tripMap.get(vehicle.trip_id) || null : null;
        
        // Calculate arrival time if we have the target stop and required data
        let arrivalTime: {
          statusMessage: string;
          confidence: 'high' | 'medium' | 'low';
          estimatedMinutes: number;
        } | undefined;
        
        if (targetStop && stops.length > 0) {
          try {
            // Get route shape for this vehicle's trip
            let routeShape: RouteShape | undefined;
            if (routeShapes && trip && trip.shape_id) {
              routeShape = routeShapes.get(trip.shape_id);
            }
            
            const arrivalResult = calculateVehicleArrivalTime(
              vehicle,
              targetStop,
              trips,
              stopTimes,
              stops,
              routeShape // Now passing actual route shape data
            );
            
            arrivalTime = {
              statusMessage: arrivalResult.statusMessage,
              confidence: arrivalResult.confidence,
              estimatedMinutes: arrivalResult.estimatedMinutes
            };
          } catch (error) {
            console.warn('Failed to calculate arrival time for vehicle:', vehicle.id, error);
            // Continue without arrival time data
          }
        }
        
        return {
          vehicle,
          route,
          trip, // NEW: include trip data for headsign
          arrivalTime // NEW: include arrival time data
        };
      })
      .filter(vehicleData => {
        
        const { vehicle, trip } = vehicleData;
        
        // Get route shape for this vehicle's trip
        let routeShape: RouteShape | undefined;
        if (trip && trip.shape_id && routeShapes) {
          routeShape = routeShapes.get(trip.shape_id);
        }
        
        // Use existing utility to check if vehicle is off-route
        const isOffRoute = isVehicleOffRoute(vehicle, routeShape);
        
        return !isOffRoute;
      });

    // Sort vehicles by arrival time priority
    return sortStationVehiclesByArrival(vehiclesWithData);
  } catch (error) {
    console.warn('Failed to get station vehicles:', error);
    return [];
  }
};

/**
 * Add metadata (vehicles, route IDs) to a station
 * Supports both original and enhanced vehicle data with position predictions
 */
export const addStationMetadata = (
  station: any,
  stopTimes: TranzyStopTimeResponse[],
  vehicles: EnhancedVehicleData[], // Simplified: only accept enhanced vehicles
  allRoutes: TranzyRouteResponse[],
  trips: TranzyTripResponse[] = [], // NEW: trip data for headsign
  stops: TranzyStopResponse[] = [], // NEW: stop data for arrival calculations
  routeShapes?: Map<string, RouteShape> // NEW: route shapes for accurate distance calculations
): FilteredStation => {
  const stationObj = station.station || station;
  
  // Get vehicles for this station (now includes trip and arrival time data)
  const stationVehicles = getStationVehicles(stationObj.stop_id, stopTimes, vehicles, allRoutes, trips, stops, routeShapes);
  
  // Get route IDs for this station
  let routeIds: number[] = [];
  try {
    const stationRouteMap = getCachedStationRouteMapping(stopTimes, vehicles);
    routeIds = getRouteIdsForStation(stationObj.stop_id, stationRouteMap);
  } catch (error) {
    console.warn('Failed to get route IDs for station:', stationObj.stop_id, error);
  }
  
  return {
    ...station,
    vehicles: stationVehicles,
    routeIds
  };
};