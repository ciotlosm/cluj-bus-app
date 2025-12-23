/**
 * Arrival Status Utilities
 * Pure functions for generating human-friendly arrival messages
 */

import { calculateDistance } from '../location/distanceUtils.ts';
import { ARRIVAL_CONFIG } from '../../utils/core/constants.ts';
import type { TranzyStopResponse, TranzyVehicleResponse, TranzyTripResponse, TranzyStopTimeResponse, ArrivalStatus } from '../../types/arrivalTime.ts';
import type { Coordinates } from '../location/distanceUtils.ts';

/**
 * Generate human-friendly status message from status and time
 */
export function generateStatusMessage(status: ArrivalStatus, estimatedMinutes: number): string {
  switch (status) {
    case 'at_stop':
      return 'At stop';
    case 'arriving_soon':
      return 'Arriving soon';
    case 'in_minutes':
      return generateTimeBasedMessage(estimatedMinutes);
    case 'just_left':
      return 'Just left';
    case 'departed':
      return 'Departed';
    case 'off_route':
      return 'Off route';
  }
}

/**
 * Check if vehicle is within proximity threshold of a stop
 */
function isWithinProximityThreshold(vehiclePosition: Coordinates, targetStop: TranzyStopResponse): boolean {
  const stopPosition = { lat: targetStop.stop_lat, lon: targetStop.stop_lon };
  const distance = calculateDistance(vehiclePosition, stopPosition);
  return distance <= ARRIVAL_CONFIG.PROXIMITY_THRESHOLD;
}

/**
 * Determine status when vehicle is within proximity threshold
 * Based on speed and next station logic
 */
function getProximityBasedStatus(
  vehicle: TranzyVehicleResponse, 
  targetStop: TranzyStopResponse,
  trips: TranzyTripResponse[],
  stopTimes: TranzyStopTimeResponse[],
  stops: TranzyStopResponse[]
): 'at_stop' | 'arriving_soon' | 'just_left' {
  // Default to 0 if speed not available and within proximity threshold
  const speed = vehicle.speed ?? 0;
  
  if (speed === 0) {
    return 'at_stop'; // Stopped at station
  }
  
  // Determine if targetStop is the vehicle's next stop using enhanced logic
  const nextStop = determineNextStop(vehicle, trips, stopTimes, stops);
  const isNextStation = nextStop?.stop_id === targetStop.stop_id;
  
  return isNextStation ? 'arriving_soon' : 'just_left';
}

/**
 * Get arrival status based on proximity, speed, and enhanced sequence position
 */
export function getArrivalStatus(
  estimatedMinutes: number,
  vehicle: TranzyVehicleResponse,
  targetStop: TranzyStopResponse,
  trips: TranzyTripResponse[],
  stopTimes: TranzyStopTimeResponse[],
  stops: TranzyStopResponse[]
): ArrivalStatus {
  // Check if within proximity threshold first
  const vehiclePosition = { lat: vehicle.latitude, lon: vehicle.longitude };
  if (isWithinProximityThreshold(vehiclePosition, targetStop)) {
    return getProximityBasedStatus(vehicle, targetStop, trips, stopTimes, stops);
  }
  
  // Outside proximity threshold - use sequence-based logic
  const nextStop = determineNextStop(vehicle, trips, stopTimes, stops);
  
  if (!nextStop) {
    // Vehicle is way off route or no trip data
    return 'off_route';
  }
  
  if (nextStop.stop_id === targetStop.stop_id) {
    // Target stop is the vehicle's next stop
    return 'in_minutes';
  } else {
    // Target stop is not the next stop (vehicle passed it or going elsewhere)
    return 'departed';
  }
}

/**
 * Generate status message with confidence indicator
 */
export function generateStatusWithConfidence(
  status: ArrivalStatus,
  estimatedMinutes: number,
  confidence: 'high' | 'medium' | 'low'
): string {
  const baseMessage = generateStatusMessage(status, estimatedMinutes);
  return confidence === 'low' ? `${baseMessage} (estimated)` : baseMessage;
}

/**
 * Determine the next stop for a vehicle using trip data
 */
function determineNextStop(
  vehicle: TranzyVehicleResponse,
  trips: TranzyTripResponse[],
  stopTimes: TranzyStopTimeResponse[],
  stops: TranzyStopResponse[]
): TranzyStopResponse | null {
  if (!vehicle.trip_id) return null;
  
  // Get stop times for this trip, sorted by sequence
  const tripStopTimes = stopTimes
    .filter(st => st.trip_id === vehicle.trip_id)
    .sort((a, b) => a.stop_sequence - b.stop_sequence);

  if (tripStopTimes.length === 0) return null;

  // For now, assume the first stop in sequence is the next stop
  // This is a simplified implementation that can be enhanced later
  const nextStopTime = tripStopTimes[0];
  return stops.find(s => s.stop_id === nextStopTime.stop_id) || null;
}
function generateTimeBasedMessage(estimatedMinutes: number): string {
  const roundedMinutes = Math.round(estimatedMinutes);
  return `In ${roundedMinutes} minute${roundedMinutes !== 1 ? 's' : ''}`;
}