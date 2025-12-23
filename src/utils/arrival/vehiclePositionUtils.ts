/**
 * Vehicle Position Utilities
 * Logic for determining vehicle position relative to stops and routes
 */

import { calculateDistance } from '../location/distanceUtils.ts';
import { calculateProgressAlongSegment, distancePointToLineSegment } from './geometryUtils.ts';
import type { Vehicle, Stop, Trip, TripStop, Coordinates } from '../../types/arrivalTime.ts';

// Constants for vehicle position calculations
const SEGMENT_TOLERANCE = 500; // meters - tolerance for off-route detection

/**
 * Get sorted trip stops by sequence number
 */
export function getSortedTripStops(trip: Trip): TripStop[] {
  return [...trip.stops].sort((a, b) => a.sequence - b.sequence);
}

/**
 * Find the closest stop to vehicle position within trip sequence
 */
export function findClosestStopInTrip(vehiclePosition: Coordinates, trip: Trip): TripStop | null {
  const sortedStops = getSortedTripStops(trip);
  if (sortedStops.length === 0) return null;
  
  let closestStop = sortedStops[0];
  let minDistance = calculateDistance(vehiclePosition, closestStop.position);
  
  for (const stop of sortedStops) {
    const distance = calculateDistance(vehiclePosition, stop.position);
    if (distance < minDistance) {
      minDistance = distance;
      closestStop = stop;
    }
  }
  
  return closestStop;
}

/**
 * Get the next stop in sequence after the given stop
 */
export function getNextStopInSequence(currentStop: TripStop, trip: Trip): TripStop | null {
  const sortedStops = getSortedTripStops(trip);
  const currentIndex = sortedStops.findIndex(stop => stop.stopId === currentStop.stopId);
  
  if (currentIndex === -1 || currentIndex === sortedStops.length - 1) {
    return null; // Stop not found or is the last stop
  }
  
  return sortedStops[currentIndex + 1];
}

/**
 * Enhanced next stop determination with three-tier classification
 */
export function determineNextStopEnhanced(vehicle: Vehicle): { nextStop: Stop | null, isOffRoute: boolean } {
  const trip = vehicle.trip;
  if (!trip.stops || trip.stops.length === 0) {
    return { nextStop: null, isOffRoute: false };
  }

  // Find closest stop in trip sequence
  const closestStop = findClosestStopInTrip(vehicle.position, trip);
  if (!closestStop) {
    return { nextStop: null, isOffRoute: false };
  }
  
  // Get next stop in sequence after closest
  const secondStop = getNextStopInSequence(closestStop, trip);
  if (!secondStop) {
    // Closest stop is the last stop, so it's the next stop
    return { 
      nextStop: {
        id: closestStop.stopId,
        name: `Stop ${closestStop.stopId}`,
        position: closestStop.position
      }, 
      isOffRoute: false 
    };
  }
  
  // Check if vehicle is on route (within segment tolerance)
  const distanceToSegment = distancePointToLineSegment(vehicle.position, closestStop.position, secondStop.position);
  
  if (distanceToSegment > SEGMENT_TOLERANCE) {
    // Vehicle is way off route
    return { nextStop: null, isOffRoute: true };
  }
  
  // Vehicle is on route - determine direction using progress and speed
  const progressAlongSegment = calculateProgressAlongSegment(vehicle.position, closestStop.position, secondStop.position);
  const speed = vehicle.speed ?? 0;
  
  if (progressAlongSegment > 0 && speed > 0) {
    // Vehicle has made progress along segment and is moving → heading to second station
    return { 
      nextStop: {
        id: secondStop.stopId,
        name: `Stop ${secondStop.stopId}`,
        position: secondStop.position
      }, 
      isOffRoute: false 
    };
  } else {
    // Vehicle has no progress or is stopped → at or heading to closest station
    return { 
      nextStop: {
        id: closestStop.stopId,
        name: `Stop ${closestStop.stopId}`,
        position: closestStop.position
      }, 
      isOffRoute: false 
    };
  }
}

/**
 * Identify the next stop for a vehicle using enhanced segment containment logic
 */
export function identifyNextStop(vehicle: Vehicle): Stop | null {
  const result = determineNextStopEnhanced(vehicle);
  return result.nextStop;
}