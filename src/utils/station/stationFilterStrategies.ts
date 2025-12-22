/**
 * Station Filter Strategies
 * Unified filtering algorithm with configurable result limits
 */

import { sortByDistance, calculateDistance } from '../location/distanceUtils';
import { hasActiveTrips, checkStationFavoritesMatch } from './tripValidationUtils';
import { addStationMetadata } from './stationVehicleUtils';
import type { FilteredStation } from '../../types/stationFilter';
import type { TranzyStopResponse, TranzyStopTimeResponse, TranzyVehicleResponse, TranzyRouteResponse } from '../../types/rawTranzyApi';
import { SECONDARY_STATION_THRESHOLD } from '../../types/stationFilter';

/**
 * Unified Station Filtering - Handles both "all stations" and "smart filtering" modes
 * @param maxResults - Maximum number of results (undefined = all stations, 2 = smart filtering)
 * @param proximityThreshold - Distance threshold for secondary station selection (only used when maxResults is limited)
 */
export const filterStations = (
  stops: TranzyStopResponse[],
  currentPosition: GeolocationPosition | null,
  stopTimes: TranzyStopTimeResponse[],
  vehicles: TranzyVehicleResponse[],
  allRoutes: TranzyRouteResponse[],
  favoriteRouteIds: Set<string>,
  favoritesStoreAvailable: boolean,
  favoritesFilterEnabled: boolean,
  hasFavoriteRoutes: boolean,
  maxResults?: number,
  proximityThreshold: number = SECONDARY_STATION_THRESHOLD
): FilteredStation[] => {
  // Early return if no location and smart filtering requested
  if (!currentPosition && maxResults !== undefined) {
    return [];
  }

  const userLocation = currentPosition ? 
    { lat: currentPosition.coords.latitude, lon: currentPosition.coords.longitude } : 
    null;

  // Sort stations by distance if location available
  const stationsWithCoords = stops.map(station => ({ ...station, lat: station.stop_lat, lon: station.stop_lon }));
  const sortedStations = userLocation ? 
    sortByDistance(stationsWithCoords, userLocation) : 
    stationsWithCoords;

  // Apply core filtering logic: location + trips + favorites
  const validStations: FilteredStation[] = [];
  
  for (const station of sortedStations) {
    // Skip stations without active trips
    if (!hasActiveTrips(station, stopTimes)) {
      continue;
    }

    // Apply favorites filter if enabled
    if (favoritesFilterEnabled && favoritesStoreAvailable && hasFavoriteRoutes) {
      try {
        const favoritesMatch = checkStationFavoritesMatch(station, stopTimes, vehicles, favoriteRouteIds);
        if (!favoritesMatch.matchesFavorites) {
          continue; // Skip stations that don't match favorites
        }
      } catch (error) {
        console.warn('Error checking favorites match for station:', station.stop_id, error);
        continue; // Skip station on error
      }
    }

    // Create station with metadata
    const stationWithMetadata = addStationMetadata({
      station,
      distance: userLocation ? calculateDistance(userLocation, { lat: station.stop_lat, lon: station.stop_lon }) : 0,
      hasActiveTrips: true,
      stationType: 'all' as const // Will be updated based on position
    }, stopTimes, vehicles, allRoutes, favoriteRouteIds, favoritesStoreAvailable);

    validStations.push(stationWithMetadata);

    // For smart filtering, apply proximity logic for secondary station
    if (maxResults !== undefined && validStations.length === 1) {
      // First station becomes primary, continue looking for secondary within proximity
      continue;
    } else if (maxResults !== undefined && validStations.length === 2) {
      // Check if this potential secondary station is within proximity threshold of primary
      const primaryStation = validStations[0];
      const distanceToPrimary = calculateDistance(
        { lat: primaryStation.station.stop_lat, lon: primaryStation.station.stop_lon },
        { lat: station.stop_lat, lon: station.stop_lon }
      );
      
      if (distanceToPrimary > proximityThreshold) {
        // Remove this station and stop looking for more
        validStations.pop();
        break;
      }
      // Secondary station is within proximity, keep it and stop
      break;
    } else if (maxResults !== undefined && validStations.length >= maxResults) {
      // Reached max results for smart filtering
      break;
    }
  }

  // Update station types based on position
  return validStations.map((station, index) => ({
    ...station,
    stationType: index === 0 ? 'primary' : 'all' as const
  }));
};