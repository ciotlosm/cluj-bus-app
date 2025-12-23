/**
 * Arrival Time Utilities
 * Pure functions for converting distances to arrival times
 */

import { ARRIVAL_CONFIG } from '../../utils/core/constants.ts';

/**
 * Calculate arrival time based on distance and intermediate stops
 */
export function calculateArrivalTime(
  distance: number,
  intermediateStops: number
): number {
  // Convert distance from meters to kilometers
  const distanceKm = distance / 1000;
  
  // Calculate travel time based on average speed
  const travelTimeHours = distanceKm / ARRIVAL_CONFIG.AVERAGE_SPEED;
  const travelTimeMinutes = travelTimeHours * 60;
  
  // Add dwell time for intermediate stops
  const dwellTimeMinutes = calculateDwellTime(intermediateStops);
  
  // Total estimated time
  const totalMinutes = travelTimeMinutes + dwellTimeMinutes;
  
  // Round to reasonable precision (0.1 minutes = 6 seconds)
  return Math.round(totalMinutes * 10) / 10;
}

/**
 * Calculate total dwell time for intermediate stops
 */
export function calculateDwellTime(intermediateStops: number): number {
  // Convert dwell time from seconds to minutes
  const dwellTimePerStopMinutes = ARRIVAL_CONFIG.DWELL_TIME / 60;
  
  // Total dwell time for all intermediate stops
  return intermediateStops * dwellTimePerStopMinutes;
}

/**
 * Calculate speed-adjusted time (for future use with real-time speed data)
 */
export function calculateSpeedAdjustedTime(
  distance: number,
  currentSpeed: number,
  averageSpeed: number = ARRIVAL_CONFIG.AVERAGE_SPEED
): number {
  // If current speed is available and positive, use it for initial calculation
  if (currentSpeed > 0) {
    const distanceKm = distance / 1000;
    const timeAtCurrentSpeed = (distanceKm / currentSpeed) * 60; // minutes
    
    // Blend current speed with average speed for more realistic estimates
    const timeAtAverageSpeed = (distanceKm / averageSpeed) * 60;
    
    // Weight current speed more heavily for short distances
    const distanceWeight = Math.min(1, distance / 2000); // 2km threshold
    const blendedTime = timeAtCurrentSpeed * (1 - distanceWeight) + timeAtAverageSpeed * distanceWeight;
    
    return Math.round(blendedTime * 10) / 10;
  }
  
  // Fall back to average speed calculation if speed is 0 or unavailable
  return calculateArrivalTime(distance, 0);
}

/**
 * Calculate confidence-adjusted time range
 */
export function calculateTimeRange(
  estimatedTime: number,
  confidence: 'high' | 'medium' | 'low'
): { min: number; max: number; estimate: number } {
  let variabilityFactor: number;
  
  switch (confidence) {
    case 'high':
      variabilityFactor = 0.1; // ±10%
      break;
    case 'medium':
      variabilityFactor = 0.2; // ±20%
      break;
    case 'low':
      variabilityFactor = 0.3; // ±30%
      break;
  }
  
  const variation = estimatedTime * variabilityFactor;
  
  return {
    min: Math.max(0, estimatedTime - variation),
    max: estimatedTime + variation,
    estimate: estimatedTime
  };
}