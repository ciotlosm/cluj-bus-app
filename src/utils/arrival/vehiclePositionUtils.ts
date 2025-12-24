/**
 * Vehicle Position Utilities
 * Simplified logic for determining vehicle position relative to stops using raw API data
 */

import { calculateDistance } from '../location/distanceUtils.ts';
import { projectPointToShape } from './distanceUtils.ts';
import { ARRIVAL_CONFIG } from '../core/constants.ts';
import type { TranzyVehicleResponse, TranzyStopResponse, TranzyTripResponse, TranzyStopTimeResponse, Coordinates, RouteShape } from '../../types/arrivalTime.ts';

/**
 * Determine the next stop for a vehicle using raw API data
 * Simplified implementation using stop times and trip data
 */
export function determineNextStop(
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
  // This is a simplified implementation that can be enhanced later with vehicle position analysis
  const nextStopTime = tripStopTimes[0];
  return stops.find(s => s.stop_id === nextStopTime.stop_id) || null;
}

