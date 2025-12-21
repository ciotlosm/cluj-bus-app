/**
 * Trip Validation Utilities
 * Functions to validate station trip data using stop times
 */

import type { TranzyStopTimeResponse, TranzyStopResponse } from '../types/rawTranzyApi';

/**
 * Check if a station has active trips using stop times data
 * @param station - The station to check
 * @param stopTimes - Array of stop times from trip store
 * @returns boolean indicating if station has active trips
 */
export function hasActiveTrips(
  station: TranzyStopResponse,
  stopTimes: TranzyStopTimeResponse[]
): boolean {
  // Find stop times for this station
  const stationStopTimes = stopTimes.filter(
    stopTime => stopTime.stop_id === station.stop_id
  );
  
  // Station has active trips if it has stop times with valid trip_id
  return stationStopTimes.some(stopTime => 
    stopTime.trip_id && stopTime.trip_id.trim().length > 0
  );
}



/**
 * Validate multiple stations for trip availability
 * @param stations - Array of stations to validate
 * @param stopTimes - Array of stop times from trip store
 * @returns Array of stations with their trip validation status
 */
export function validateStationsForTrips(
  stations: TranzyStopResponse[],
  stopTimes: TranzyStopTimeResponse[]
): Array<{ station: TranzyStopResponse; hasTrips: boolean }> {
  return stations.map(station => ({
    station,
    hasTrips: hasActiveTrips(station, stopTimes)
  }));
}

/**
 * Get stations that have active trips
 * @param stations - Array of stations to filter
 * @param stopTimes - Array of stop times from trip store
 * @returns Array of stations that have active trips
 */
export function getStationsWithTrips(
  stations: TranzyStopResponse[],
  stopTimes: TranzyStopTimeResponse[]
): TranzyStopResponse[] {
  const validatedStations = validateStationsForTrips(stations, stopTimes);
  
  return validatedStations
    .filter(item => item.hasTrips)
    .map(item => item.station);
}