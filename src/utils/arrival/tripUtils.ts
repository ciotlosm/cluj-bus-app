/**
 * Trip Parsing Utilities
 * Shared logic for parsing trip sequences and stop relationships
 */

import type {
  TranzyVehicleResponse,
  TranzyStopResponse,
  TranzyStopTimeResponse
} from '../../types/arrivalTime.ts';

/**
 * Get sorted stop times for a vehicle's trip
 */
export function getTripStopSequence(
  vehicle: TranzyVehicleResponse,
  stopTimes: TranzyStopTimeResponse[]
): TranzyStopTimeResponse[] {
  if (!vehicle.trip_id) return [];
  
  return stopTimes
    .filter(st => st.trip_id === vehicle.trip_id)
    .sort((a, b) => a.stop_sequence - b.stop_sequence);
}

/**
 * Find a stop's position in the trip sequence
 */
export function findStopInSequence(
  stopId: number,
  tripStopTimes: TranzyStopTimeResponse[]
): { index: number; stopTime: TranzyStopTimeResponse | null } {
  const index = tripStopTimes.findIndex(st => st.stop_id === stopId);
  const stopTime = index >= 0 ? tripStopTimes[index] : null;
  
  return { index, stopTime };
}

/**
 * Get intermediate stop data between vehicle and target stop
 */
export function getIntermediateStopData(
  vehicle: TranzyVehicleResponse,
  targetStop: TranzyStopResponse,
  stopTimes: TranzyStopTimeResponse[],
  stops: TranzyStopResponse[]
): {
  coordinates: { lat: number; lon: number }[];
  count: number;
  tripStopTimes: TranzyStopTimeResponse[];
} {
  const tripStopTimes = getTripStopSequence(vehicle, stopTimes);
  const { index: targetStopIndex } = findStopInSequence(targetStop.stop_id, tripStopTimes);
  
  if (targetStopIndex === -1) {
    return {
      coordinates: [],
      count: 0,
      tripStopTimes
    };
  }

  // Get intermediate stops (assume vehicle is at beginning of trip for now)
  const intermediateStopTimes = tripStopTimes.slice(0, targetStopIndex);
  
  const coordinates = intermediateStopTimes.map(st => {
    const stopData = stops.find(s => s.stop_id === st.stop_id);
    return stopData ? { lat: stopData.stop_lat, lon: stopData.stop_lon } : { lat: 0, lon: 0 };
  });

  return {
    coordinates,
    count: Math.max(0, targetStopIndex),
    tripStopTimes
  };
}