/**
 * Vehicle Position Utilities
 * Reuses existing vehicle progress estimation logic
 */

import { getTripStopSequence } from './tripUtils.ts';
import { estimateVehicleProgressWithStops } from './vehicleProgressUtils.ts';
import type { TranzyVehicleResponse, TranzyStopResponse, TranzyTripResponse, TranzyStopTimeResponse } from '../../types/arrivalTime.ts';

/**
 * Determine the next stop for a vehicle using existing vehicle progress estimation
 * Reuses the same logic as the vehicle card stop list
 */
export function determineNextStop(
  vehicle: TranzyVehicleResponse,
  trips: TranzyTripResponse[],
  stopTimes: TranzyStopTimeResponse[],
  stops: TranzyStopResponse[]
): TranzyStopResponse | null {
  if (!vehicle.trip_id) return null;
  
  // Get trip stop sequence using existing utility
  const tripStopTimes = getTripStopSequence(vehicle, stopTimes);
  if (tripStopTimes.length === 0) return null;

  // Use existing vehicle progress estimation logic
  const vehicleProgress = estimateVehicleProgressWithStops(vehicle, tripStopTimes, stops);
  
  // If we have a clear segment, return the next stop
  if (vehicleProgress.segmentBetweenStops) {
    const nextStopId = vehicleProgress.segmentBetweenStops.nextStop.stop_id;
    return stops.find(s => s.stop_id === nextStopId) || null;
  }
  
  // Fallback: return the first stop in the trip sequence
  const firstStopTime = tripStopTimes[0];
  return stops.find(s => s.stop_id === firstStopTime.stop_id) || null;
}

