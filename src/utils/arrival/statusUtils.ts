/**
 * Arrival Status Utilities
 * Pure functions for generating human-friendly arrival messages
 */

import { calculateDistance } from '../location/distanceUtils.ts';
import { determineNextStopEnhanced } from './vehiclePositionUtils.ts';
import { ARRIVAL_CONFIG } from '../../utils/core/constants.ts';
import type { Stop, ArrivalStatus, Vehicle } from '../../types/arrivalTime.ts';
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
function isWithinProximityThreshold(vehiclePosition: Coordinates, targetStop: Stop): boolean {
  const distance = calculateDistance(vehiclePosition, targetStop.position);
  return distance <= ARRIVAL_CONFIG.PROXIMITY_THRESHOLD;
}

/**
 * Determine status when vehicle is within proximity threshold
 * Based on speed and next station logic
 */
function getProximityBasedStatus(vehicle: Vehicle, targetStop: Stop): 'at_stop' | 'arriving_soon' | 'just_left' {
  // Default to 0 if speed not available and within proximity threshold
  const speed = vehicle.speed ?? 0;
  
  if (speed === 0) {
    return 'at_stop'; // Stopped at station
  }
  
  // Determine if targetStop is the vehicle's next stop using enhanced logic
  const nextStopResult = determineNextStopEnhanced(vehicle);
  const isNextStation = nextStopResult.nextStop?.id === targetStop.id;
  
  return isNextStation ? 'arriving_soon' : 'just_left';
}

/**
 * Get arrival status based on proximity, speed, and enhanced sequence position
 */
export function getArrivalStatus(
  estimatedMinutes: number,
  vehicle: Vehicle,
  targetStop: Stop
): ArrivalStatus {
  // Check if within proximity threshold first
  if (isWithinProximityThreshold(vehicle.position, targetStop)) {
    return getProximityBasedStatus(vehicle, targetStop);
  }
  
  // Outside proximity threshold - use enhanced sequence-based logic
  const nextStopResult = determineNextStopEnhanced(vehicle);
  
  if (nextStopResult.isOffRoute) {
    // Vehicle is way off route
    return 'off_route';
  }
  
  if (nextStopResult.nextStop?.id === targetStop.id) {
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
 * Generate time-based arrival message
 */
function generateTimeBasedMessage(estimatedMinutes: number): string {
  const roundedMinutes = Math.round(estimatedMinutes);
  return `In ${roundedMinutes} minute${roundedMinutes !== 1 ? 's' : ''}`;
}