/**
 * Arrival Calculation Utilities
 * Main orchestration functions for arrival time calculations
 */

import { calculateDistanceAlongShape, calculateDistanceViaStops } from './distanceUtils.ts';
import { calculateArrivalTime } from './timeUtils.ts';
import { generateStatusMessage, getArrivalStatus } from './statusUtils.ts';
import { determineNextStop } from './vehiclePositionUtils.ts';
import type {
  TranzyVehicleResponse,
  TranzyStopResponse,
  TranzyTripResponse,
  TranzyStopTimeResponse,
  RouteShape,
  ArrivalTimeResult,
  DistanceResult
} from '../../types/arrivalTime.ts';
import { ARRIVAL_STATUS_SORT_ORDER } from '../../types/arrivalTime.ts';

/**
 * Calculate arrival time for a single vehicle to a target stop
 */
export function calculateVehicleArrivalTime(
  vehicle: TranzyVehicleResponse,
  targetStop: TranzyStopResponse,
  trips: TranzyTripResponse[],
  stopTimes: TranzyStopTimeResponse[],
  stops: TranzyStopResponse[],
  routeShape?: RouteShape
): ArrivalTimeResult {
  // Determine the vehicle's actual next stop using GPS-based logic
  const nextStop = determineNextStop(vehicle, trips, stopTimes, stops, routeShape);
  
  // Calculate distance using the proper route from next stop to target
  const vehiclePosition = { lat: vehicle.latitude, lon: vehicle.longitude };
  const distanceResult = calculateRouteDistance(
    vehicle,
    targetStop,
    nextStop,
    stopTimes,
    stops,
    routeShape
  );

  // Calculate time estimate using actual intermediate stop count
  const intermediateStopCount = countIntermediateStopsFromNext(vehicle, targetStop, nextStop, stopTimes);
  const estimatedMinutes = calculateArrivalTime(
    distanceResult.totalDistance,
    intermediateStopCount
  );

  // Get status (determines both display and sort order)
  const status = getArrivalStatus(estimatedMinutes, vehicle, targetStop, trips, stopTimes, stops, routeShape);

  // Generate status message
  const statusMessage = generateStatusMessage(status, estimatedMinutes);

  return {
    vehicleId: vehicle.id,
    estimatedMinutes,
    status,
    statusMessage,
    confidence: distanceResult.confidence,
    calculationMethod: distanceResult.method,
    rawDistance: distanceResult.totalDistance
  };
}

/**
 * Calculate arrival times for multiple vehicles
 */
export function calculateMultipleArrivals(
  vehicles: TranzyVehicleResponse[],
  targetStop: TranzyStopResponse,
  trips: TranzyTripResponse[],
  stopTimes: TranzyStopTimeResponse[],
  stops: TranzyStopResponse[],
  routeShapes?: Map<string, RouteShape>
): ArrivalTimeResult[] {
  // Filter vehicles that serve the target stop (reuse existing filtering pattern)
  const relevantVehicles = vehicles.filter(vehicle => {
    if (!vehicle.trip_id) return false;
    const servesTarget = stopTimes.some(st => st.trip_id === vehicle.trip_id && st.stop_id === targetStop.stop_id);
    
    if (!servesTarget) {
      console.log('Filtering out vehicle:', {
        vehicleId: vehicle.id,
        tripId: vehicle.trip_id,
        targetStopId: targetStop.stop_id,
        reason: 'Vehicle trip does not serve target stop'
      });
    }
    
    return servesTarget;
  });
  
  return relevantVehicles.map(vehicle => {
    // Get route shape for this vehicle's trip
    let routeShape: RouteShape | undefined;
    if (routeShapes && vehicle.trip_id) {
      const trip = trips.find(t => t.trip_id === vehicle.trip_id);
      if (trip && trip.shape_id) {
        routeShape = routeShapes.get(trip.shape_id);
      }
    }
    
    return calculateVehicleArrivalTime(vehicle, targetStop, trips, stopTimes, stops, routeShape);
  });
}

/**
 * Sort vehicles by arrival priority using status-based ordering
 */
export function sortVehiclesByArrival(results: ArrivalTimeResult[]): ArrivalTimeResult[] {
  return [...results].sort((a, b) => {
    // Primary: sort by status priority
    const priorityDiff = ARRIVAL_STATUS_SORT_ORDER[a.status] - ARRIVAL_STATUS_SORT_ORDER[b.status];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Secondary: sort by time within same status group
    if (a.estimatedMinutes !== b.estimatedMinutes) {
      return a.estimatedMinutes - b.estimatedMinutes;
    }
    
    // Tertiary: stable sort by vehicle ID
    return a.vehicleId - b.vehicleId;
  });
}

/**
 * Calculate distance from vehicle to target using proper route through next stop
 */
function calculateRouteDistance(
  vehicle: TranzyVehicleResponse,
  targetStop: TranzyStopResponse,
  nextStop: TranzyStopResponse | null,
  stopTimes: TranzyStopTimeResponse[],
  stops: TranzyStopResponse[],
  routeShape?: RouteShape
): DistanceResult {
  const vehiclePosition = { lat: vehicle.latitude, lon: vehicle.longitude };
  
  // If no next stop determined, fall back to direct distance
  if (!nextStop) {
    const targetPosition = { lat: targetStop.stop_lat, lon: targetStop.stop_lon };
    return routeShape 
      ? calculateDistanceAlongShape(vehiclePosition, targetPosition, routeShape)
      : calculateDistanceViaStops(vehiclePosition, targetPosition, []);
  }
  
  // If next stop is the target, calculate direct distance
  if (nextStop.stop_id === targetStop.stop_id) {
    const targetPosition = { lat: targetStop.stop_lat, lon: targetStop.stop_lon };
    return routeShape 
      ? calculateDistanceAlongShape(vehiclePosition, targetPosition, routeShape)
      : calculateDistanceViaStops(vehiclePosition, targetPosition, []);
  }
  
  // Calculate route: vehicle → next stop → intermediate stops → target
  const intermediateStops = getIntermediateStopsFromNext(nextStop, targetStop, stopTimes, stops);
  
  if (routeShape) {
    // Use route shape for accurate distance calculation
    const targetPosition = { lat: targetStop.stop_lat, lon: targetStop.stop_lon };
    return calculateDistanceAlongShape(vehiclePosition, targetPosition, routeShape);
  } else {
    // Use stop-to-stop segments: vehicle → next → intermediates → target
    const routeStops = [
      { lat: nextStop.stop_lat, lon: nextStop.stop_lon },
      ...intermediateStops,
      { lat: targetStop.stop_lat, lon: targetStop.stop_lon }
    ];
    return calculateDistanceViaStops(vehiclePosition, { lat: targetStop.stop_lat, lon: targetStop.stop_lon }, routeStops);
  }
}

/**
 * Get intermediate stops between next stop and target stop
 */
function getIntermediateStopsFromNext(
  nextStop: TranzyStopResponse,
  targetStop: TranzyStopResponse,
  stopTimes: TranzyStopTimeResponse[],
  stops: TranzyStopResponse[]
): { lat: number, lon: number }[] {
  // Find the trip that contains both stops
  const nextStopTime = stopTimes.find(st => st.stop_id === nextStop.stop_id);
  if (!nextStopTime) return [];
  
  // Get all stops for this trip, sorted by sequence
  const tripStopTimes = stopTimes
    .filter(st => st.trip_id === nextStopTime.trip_id)
    .sort((a, b) => a.stop_sequence - b.stop_sequence);

  // Find indices of next stop and target stop
  const nextStopIndex = tripStopTimes.findIndex(st => st.stop_id === nextStop.stop_id);
  const targetStopIndex = tripStopTimes.findIndex(st => st.stop_id === targetStop.stop_id);
  
  if (nextStopIndex === -1 || targetStopIndex === -1 || nextStopIndex >= targetStopIndex) {
    return [];
  }

  // Get stops between next stop and target stop (exclusive of both endpoints)
  const intermediateStopTimes = tripStopTimes.slice(nextStopIndex + 1, targetStopIndex);
  
  return intermediateStopTimes.map(st => {
    const stopData = stops.find(s => s.stop_id === st.stop_id);
    return stopData ? { lat: stopData.stop_lat, lon: stopData.stop_lon } : { lat: 0, lon: 0 };
  }).filter(coord => coord.lat !== 0 || coord.lon !== 0);
}

/**
 * Count intermediate stops from next stop to target (for time calculation)
 */
function countIntermediateStopsFromNext(
  vehicle: TranzyVehicleResponse,
  targetStop: TranzyStopResponse,
  nextStop: TranzyStopResponse | null,
  stopTimes: TranzyStopTimeResponse[]
): number {
  if (!vehicle.trip_id || !nextStop) return 0;
  
  // Get stop times for this trip, sorted by sequence
  const tripStopTimes = stopTimes
    .filter(st => st.trip_id === vehicle.trip_id)
    .sort((a, b) => a.stop_sequence - b.stop_sequence);

  // Find indices of next stop and target stop
  const nextStopIndex = tripStopTimes.findIndex(st => st.stop_id === nextStop.stop_id);
  const targetStopIndex = tripStopTimes.findIndex(st => st.stop_id === targetStop.stop_id);
  
  if (nextStopIndex === -1 || targetStopIndex === -1 || nextStopIndex >= targetStopIndex) {
    return 0;
  }

  // Count stops from next stop to target (inclusive of next, exclusive of target)
  return targetStopIndex - nextStopIndex;
}