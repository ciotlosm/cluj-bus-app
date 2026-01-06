/**
 * Station Filter Strategies
 * Unified filtering algorithm with configurable result limits
 */

import { sortByDistance, calculateDistance } from '../location/distanceUtils';
import { hasActiveTrips } from './tripValidationUtils';
import { addStationMetadata } from './stationVehicleUtils';
import { useShapeStore } from '../../stores/shapeStore';
import type { FilteredStation } from '../../types/stationFilter';
import type { TranzyStopResponse, TranzyStopTimeResponse, TranzyVehicleResponse, TranzyRouteResponse, TranzyTripResponse } from '../../types/rawTranzyApi';
import type { RouteShape } from '../../types/arrivalTime';
import { SECONDARY_STATION_THRESHOLD } from '../../types/stationFilter';

/**
 * Unified Station Filtering - Handles both "all stations" and "proximity filtering" modes
 * @param maxResults - Maximum number of results (undefined = all stations, number = proximity filtering)
 * @param proximityThreshold - Distance threshold for proximity filtering (only used when maxResults is defined)
 */
export const filterStations = async (
  stops: TranzyStopResponse[],
  currentPosition: GeolocationPosition | null,
  stopTimes: TranzyStopTimeResponse[],
  vehicles: TranzyVehicleResponse[],
  allRoutes: TranzyRouteResponse[],
  maxResults?: number,
  proximityThreshold: number = SECONDARY_STATION_THRESHOLD,
  trips: TranzyTripResponse[] = [] // NEW: trip data for headsign
): Promise<FilteredStation[]> => {
  // Early return if no location and proximity filtering requested
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

  // Get route shapes early if we have trips data
  let routeShapes: Map<string, RouteShape> | undefined;
  if (trips.length > 0) {
    try {
      // Get unique shape IDs from all trips to pre-load shapes
      const uniqueShapeIds = [...new Set(trips.map(trip => trip.shape_id).filter(Boolean))];
      
      if (uniqueShapeIds.length > 0) {
        // Get shapes from the centralized store
        const shapeStore = useShapeStore.getState();
        routeShapes = new Map<string, RouteShape>();
        
        // Collect available shapes from the store
        for (const shapeId of uniqueShapeIds) {
          const shape = shapeStore.getShape(shapeId);
          if (shape) {
            routeShapes.set(shapeId, shape);
          }
        }
        
        // Pre-load route shapes for accurate distance calculations
        if (routeShapes.size > 0) {
          // Route shapes are available for filtering
        }
      }
    } catch (error) {
      console.warn('Failed to pre-load route shapes from store:', error);
      routeShapes = undefined;
    }
  }

  // Apply core filtering logic: location + trips
  const validStations: FilteredStation[] = [];
  let primaryStation: FilteredStation | null = null;
  
  for (const station of sortedStations) {
    // Skip stations without active trips
    if (!hasActiveTrips(station, stopTimes)) {
      continue;
    }

    // Create station with metadata (now with route shapes available)
    const stationWithMetadata = addStationMetadata({
      station,
      distance: userLocation ? calculateDistance(userLocation, { lat: station.stop_lat, lon: station.stop_lon }) : 0,
      hasActiveTrips: true,
      stationType: 'all' as const // Will be updated based on position
    }, stopTimes, vehicles, allRoutes, trips, stops, routeShapes);

    // Skip stations with no active vehicles - they should be filtered out entirely
    if (stationWithMetadata.vehicles.length === 0) {
      continue;
    }

    // For proximity filtering, check distance from primary station
    if (maxResults !== undefined) {
      if (primaryStation === null) {
        // First valid station becomes primary
        primaryStation = stationWithMetadata;
        validStations.push(stationWithMetadata);
      } else {
        // Check if this station is within proximity threshold of primary
        const distanceToPrimary = calculateDistance(
          { lat: primaryStation.station.stop_lat, lon: primaryStation.station.stop_lon },
          { lat: station.stop_lat, lon: station.stop_lon }
        );
        
        if (distanceToPrimary <= proximityThreshold) {
          // Station is within proximity, include it
          validStations.push(stationWithMetadata);
        }
        // If outside proximity threshold, skip this station but continue checking others
      }
    } else {
      // No proximity filtering, include all valid stations
      validStations.push(stationWithMetadata);
    }
  }

  // Update station types - only primary station gets special type, rest are 'all'
  return validStations.map((station, index) => ({
    ...station,
    stationType: index === 0 ? 'primary' : 'all' as const
  }));
};