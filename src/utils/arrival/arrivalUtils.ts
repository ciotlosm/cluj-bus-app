/**
 * Arrival Calculation Utilities
 * Main orchestration functions for arrival time calculations
 */

import { calculateDistanceAlongShape, calculateDistanceViaStops } from './distanceUtils.ts';
import { calculateArrivalTime } from './timeUtils.ts';
import { generateStatusMessage, getArrivalStatus } from './statusUtils.ts';
import type {
  TranzyVehicleResponse,
  TranzyStopResponse,
  TranzyTripResponse,
  TranzyStopTimeResponse,
  RouteShape,
  ArrivalTimeResult
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
  // Calculate distance using appropriate method
  const vehiclePosition = { lat: vehicle.latitude, lon: vehicle.longitude };
  const stopPosition = { lat: targetStop.stop_lat, lon: targetStop.stop_lon };
  const distanceResult = routeShape 
    ? calculateDistanceAlongShape(vehiclePosition, stopPosition, routeShape)
    : calculateDistanceViaStops(
        vehiclePosition, 
        stopPosition, 
        getIntermediateStops(vehicle, targetStop, stopTimes, stops)
      );

  // Calculate time estimate
  const intermediateStopCount = countIntermediateStops(vehicle, targetStop, stopTimes);
  const estimatedMinutes = calculateArrivalTime(
    distanceResult.totalDistance,
    intermediateStopCount
  );

  // Get status (determines both display and sort order)
  const status = getArrivalStatus(estimatedMinutes, vehicle, targetStop, trips, stopTimes, stops);

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
  stops: TranzyStopResponse[]
): ArrivalTimeResult[] {
  // Filter vehicles that serve the target stop (reuse existing filtering pattern)
  const relevantVehicles = vehicles.filter(vehicle => {
    if (!vehicle.trip_id) return false;
    return stopTimes.some(st => st.trip_id === vehicle.trip_id && st.stop_id === targetStop.stop_id);
  });
  
  return relevantVehicles.map(vehicle => {
    const routeShape = undefined; // Route shape not implemented yet
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
 * Get intermediate stops between vehicle and target
 */
function getIntermediateStops(
  vehicle: TranzyVehicleResponse, 
  targetStop: TranzyStopResponse,
  stopTimes: TranzyStopTimeResponse[],
  stops: TranzyStopResponse[]
): { lat: number, lon: number }[] {
  if (!vehicle.trip_id) return [];
  
  // Get stop times for this trip, sorted by sequence
  const tripStopTimes = stopTimes
    .filter(st => st.trip_id === vehicle.trip_id)
    .sort((a, b) => a.stop_sequence - b.stop_sequence);

  // Find target stop index
  const targetStopIndex = tripStopTimes.findIndex(st => st.stop_id === targetStop.stop_id);
  if (targetStopIndex === -1) return [];

  // Get intermediate stops (assume vehicle is at beginning of trip for now)
  const intermediateStopTimes = tripStopTimes.slice(0, targetStopIndex);
  
  return intermediateStopTimes.map(st => {
    const stopData = stops.find(s => s.stop_id === st.stop_id);
    return stopData ? { lat: stopData.stop_lat, lon: stopData.stop_lon } : { lat: 0, lon: 0 };
  });
}

/**
 * Count intermediate stops between vehicle and target
 */
function countIntermediateStops(
  vehicle: TranzyVehicleResponse, 
  targetStop: TranzyStopResponse,
  stopTimes: TranzyStopTimeResponse[]
): number {
  if (!vehicle.trip_id) return 0;
  
  // Get stop times for this trip, sorted by sequence
  const tripStopTimes = stopTimes
    .filter(st => st.trip_id === vehicle.trip_id)
    .sort((a, b) => a.stop_sequence - b.stop_sequence);

  // Find target stop index
  const targetStopIndex = tripStopTimes.findIndex(st => st.stop_id === targetStop.stop_id);
  if (targetStopIndex === -1) return 0;

  // Assume vehicle is at the beginning of the trip for now
  return Math.max(0, targetStopIndex);
}