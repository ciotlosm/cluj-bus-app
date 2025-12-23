/**
 * Arrival Calculation Utilities
 * Main orchestration functions for arrival time calculations
 */

import { calculateDistanceAlongShape, calculateDistanceViaStops } from './distanceUtils.ts';
import { calculateArrivalTime } from './timeUtils.ts';
import { generateStatusMessage, getArrivalStatus } from './statusUtils.ts';
import type {
  Vehicle,
  Stop,
  RouteShape,
  ArrivalTimeResult
} from '../../types/arrivalTime.ts';
import { ARRIVAL_STATUS_SORT_ORDER } from '../../types/arrivalTime.ts';

/**
 * Calculate arrival time for a single vehicle to a target stop
 */
export function calculateVehicleArrivalTime(
  vehicle: Vehicle,
  targetStop: Stop,
  routeShape?: RouteShape
): ArrivalTimeResult {
  // Calculate distance using appropriate method
  const distanceResult = routeShape 
    ? calculateDistanceAlongShape(vehicle.position, targetStop, routeShape)
    : calculateDistanceViaStops(
        vehicle.position, 
        targetStop, 
        getIntermediateStops(vehicle, targetStop)
      );

  // Calculate time estimate
  const intermediateStopCount = countIntermediateStops(vehicle, targetStop);
  const estimatedMinutes = calculateArrivalTime(
    distanceResult.totalDistance,
    intermediateStopCount
  );

  // Get status (determines both display and sort order)
  const status = getArrivalStatus(estimatedMinutes, vehicle, targetStop);

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
  vehicles: Vehicle[],
  targetStop: Stop
): ArrivalTimeResult[] {
  // Filter vehicles that serve the target stop (reuse existing filtering pattern)
  const relevantVehicles = vehicles.filter(vehicle => {
    return vehicle.trip.stops.some(tripStop => tripStop.stopId === targetStop.id);
  });
  
  return relevantVehicles.map(vehicle => {
    const routeShape = vehicle.trip.shape;
    return calculateVehicleArrivalTime(vehicle, targetStop, routeShape);
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
    return a.vehicleId.localeCompare(b.vehicleId);
  });
}

/**
 * Get intermediate stops between vehicle and target
 */
function getIntermediateStops(vehicle: Vehicle, targetStop: Stop): Stop[] {
  // Placeholder implementation - will be enhanced in later tasks
  return vehicle.trip.stops
    .filter(tripStop => tripStop.stopId !== targetStop.id)
    .map(tripStop => ({
      id: tripStop.stopId,
      name: `Stop ${tripStop.stopId}`,
      position: tripStop.position
    }));
}

/**
 * Count intermediate stops between vehicle and target
 */
function countIntermediateStops(vehicle: Vehicle, targetStop: Stop): number {
  // Placeholder implementation - will be enhanced in later tasks
  const targetStopIndex = vehicle.trip.stops.findIndex(
    tripStop => tripStop.stopId === targetStop.id
  );
  
  if (targetStopIndex === -1) {
    return 0;
  }

  // Assume vehicle is at the beginning of the trip for now
  return Math.max(0, targetStopIndex);
}