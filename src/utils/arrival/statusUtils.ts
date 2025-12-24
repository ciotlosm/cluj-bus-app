/**
 * Arrival Status Utilities
 * Pure functions for generating human-friendly arrival messages
 */

import { calculateDistance } from '../location/distanceUtils.ts';
import { determineNextStop } from './vehiclePositionUtils.ts';
import { projectPointToShape } from './distanceUtils.ts';
import { ARRIVAL_CONFIG } from '../../utils/core/constants.ts';
import type { TranzyStopResponse, TranzyVehicleResponse, TranzyTripResponse, TranzyStopTimeResponse, ArrivalStatus, RouteShape } from '../../types/arrivalTime.ts';
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
  stops: TranzyStopResponse[],
  routeShape?: RouteShape
): 'at_stop' | 'arriving_soon' | 'just_left' {
  // Default to 0 if speed not available and within proximity threshold
  const speed = vehicle.speed ?? 0;
  
  if (speed === 0) {
    return 'at_stop'; // Stopped at station
  }
  
  // Determine if targetStop is the vehicle's next stop using enhanced logic
  const nextStop = determineNextStop(vehicle, trips, stopTimes, stops, routeShape);
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
  stops: TranzyStopResponse[],
  routeShape?: RouteShape
): ArrivalStatus {
  // Check if within proximity threshold first
  const vehiclePosition = { lat: vehicle.latitude, lon: vehicle.longitude };
  if (isWithinProximityThreshold(vehiclePosition, targetStop)) {
    return getProximityBasedStatus(vehicle, targetStop, trips, stopTimes, stops, routeShape);
  }
  
  // Outside proximity threshold - use sequence-based logic
  const nextStop = determineNextStop(vehicle, trips, stopTimes, stops, routeShape);
  
  if (!nextStop) {
    // Vehicle is way off route, past all stops, or GPS detection failed
    // In most cases, this means the vehicle has completed its route
    return 'departed';
  }
  
  // Check if target stop is in the vehicle's future route
  const routeAnalysis = analyzeVehicleRoutePosition(
    vehicle, 
    targetStop, 
    nextStop, 
    stopTimes,
    routeShape // Pass route shape for GPS-based analysis
  );
  
  if (routeAnalysis.status === 'target_not_in_route') {
    // Target stop is not in this vehicle's route at all - should not happen if filtering is correct
    console.log('WARNING: Vehicle should not be in list - target not in route');
    return 'departed';
  } else if (routeAnalysis.status === 'target_in_future') {
    // Target stop is in vehicle's future route
    return 'in_minutes';
  } else if (routeAnalysis.status === 'target_passed') {
    // Vehicle has passed the target stop - check how recently
    const distanceFromStation = calculateDistance(vehiclePosition, {
      lat: targetStop.stop_lat,
      lon: targetStop.stop_lon
    });
    
    // If very close (within 200m), consider it "just left"
    if (distanceFromStation <= 200) {
      return 'just_left';
    } else {
      return 'departed';
    }
  } else {
    // Fallback
    return 'departed';
  }
}

/**
 * Analyze vehicle's position relative to target stop using GPS-based route positioning
 */
function analyzeVehicleRoutePosition(
  vehicle: TranzyVehicleResponse,
  targetStop: TranzyStopResponse,
  nextStop: TranzyStopResponse | null, // Allow null for vehicles past all stops
  stopTimes: TranzyStopTimeResponse[],
  routeShape?: RouteShape // Add route shape for GPS-based analysis
): { status: 'target_in_future' | 'target_passed' | 'target_not_in_route' } {
  if (!vehicle.trip_id) return { status: 'target_not_in_route' };
  
  // Get all stops for this trip, sorted by sequence
  const tripStopTimes = stopTimes
    .filter(st => st.trip_id === vehicle.trip_id)
    .sort((a, b) => a.stop_sequence - b.stop_sequence);

  // Find the target stop sequence
  const targetStopSequence = tripStopTimes.find(st => st.stop_id === targetStop.stop_id)?.stop_sequence;
  
  if (targetStopSequence === undefined) {
    console.log('Target stop not found in trip - not in route');
    return { status: 'target_not_in_route' };
  }
  
  // If GPS detection failed (nextStop is null), vehicle is likely past all stops
  if (!nextStop) {
    console.log('GPS detection failed - vehicle likely past all stops, target is passed');
    return { status: 'target_passed' };
  }
  
  // CRITICAL: Use GPS-based route segment analysis if route shape is available
  if (routeShape) {
    const vehiclePosition = { lat: vehicle.latitude, lon: vehicle.longitude };
    const targetPosition = { lat: targetStop.stop_lat, lon: targetStop.stop_lon };
    
    try {
      const vehicleProjection = projectPointToShape(vehiclePosition, routeShape);
      const stationProjection = projectPointToShape(targetPosition, routeShape);
      
      // Simple and direct: if vehicle segment > station segment, vehicle has passed
      if (vehicleProjection.segmentIndex > stationProjection.segmentIndex) {
        return { status: 'target_passed' };
      }
      
      // If vehicle segment < station segment, vehicle is approaching
      if (vehicleProjection.segmentIndex < stationProjection.segmentIndex) {
        return { status: 'target_in_future' };
      }
      
      // Same segment - check position along segment
      if (vehicleProjection.positionAlongSegment > stationProjection.positionAlongSegment) {
        return { status: 'target_passed' };
      } else {
        return { status: 'target_in_future' };
      }
    } catch (error) {
      // Fall through to sequence-based logic
    }
  }
  
  // Fallback to sequence-based logic
  const nextStopSequence = tripStopTimes.find(st => st.stop_id === nextStop.stop_id)?.stop_sequence;
  
  if (nextStopSequence === undefined) {
    return { status: 'target_passed' };
  }
  
  // Handle the case where target stop is at sequence 0 (first stop)
  if (targetStopSequence === 0 && nextStopSequence > 0) {
    return { status: 'target_passed' };
  }
  
  // Compare sequences to determine if target is in future or past
  if (targetStopSequence < nextStopSequence) {
    return { status: 'target_passed' };
  } else if (targetStopSequence > nextStopSequence) {
    return { status: 'target_in_future' };
  } else {
    return { status: 'target_in_future' };
  }
}

/**
 * Generate time-based message for arrival status
 */
function generateTimeBasedMessage(estimatedMinutes: number): string {
  const roundedMinutes = Math.round(estimatedMinutes);
  return `In ${roundedMinutes} minute${roundedMinutes !== 1 ? 's' : ''}`;
}