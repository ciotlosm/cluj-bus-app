/**
 * Smart Station Filtering Hook
 * Minimal implementation for location-based station filtering
 */

import { useState, useMemo, useCallback } from 'react';
import { useLocationStore } from '../stores/locationStore';
import { useStationStore } from '../stores/stationStore';
import { useTripStore } from '../stores/tripStore';
import { calculateDistance, sortByDistance } from '../utils/distanceUtils';
import { hasActiveTrips } from '../utils/tripValidationUtils';
import type { SmartStationFilterResult, FilteredStation } from '../types/smartStationFilter';
import { SECONDARY_STATION_THRESHOLD } from '../types/smartStationFilter';

// Utility functions moved from StationView
const formatDistance = (distance: number): string => {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }
  return `${(distance / 1000).toFixed(1)}km`;
};

const getStationTypeColor = (stationType: 'primary' | 'secondary'): 'primary' | 'secondary' => {
  return stationType === 'primary' ? 'primary' : 'secondary';
};

const getStationTypeLabel = (stationType: 'primary' | 'secondary'): string => {
  return stationType === 'primary' ? 'Closest' : 'Nearby';
};

export function useSmartStationFilter(): SmartStationFilterResult {
  const { currentPosition, loading: locationLoading, error: locationError } = useLocationStore();
  const { stops, loading: stationLoading, error: stationError } = useStationStore();
  const { stopTimes, loading: tripLoading, error: tripError } = useTripStore();
  
  const [isFiltering, setIsFiltering] = useState(true);
  
  const filteredStations = useMemo((): FilteredStation[] => {
    // Return all stations if filtering disabled or no location
    if (!isFiltering || !currentPosition) {
      return stops.map(station => ({
        station,
        distance: currentPosition ? calculateDistance(
          { lat: currentPosition.coords.latitude, lon: currentPosition.coords.longitude },
          { lat: station.stop_lat, lon: station.stop_lon }
        ) : 0,
        hasActiveTrips: hasActiveTrips(station, stopTimes),
        stationType: 'primary' as const
      }));
    }
    
    // Sort stations by distance
    const userLocation = { lat: currentPosition.coords.latitude, lon: currentPosition.coords.longitude };
    const stationsWithCoords = stops.map(station => ({ ...station, lat: station.stop_lat, lon: station.stop_lon }));
    const sortedStations = sortByDistance(stationsWithCoords, userLocation);
    
    // Find primary station by evaluating stations in distance order
    // Skip stations without trips and continue to next closest
    let primaryStation: typeof sortedStations[0] | undefined;
    
    for (const station of sortedStations) {
      // Check if station has associated stop times and active trips
      if (hasActiveTrips(station, stopTimes)) {
        primaryStation = station;
        break; // First station with valid trips becomes primary
      }
      // Skip stations without trips and continue to next closest
    }
    
    // If no stations have valid trips, return empty array
    if (!primaryStation) return [];
    
    // Create result with primary station (first station with valid trips)
    const result: FilteredStation[] = [{
      station: primaryStation,
      distance: calculateDistance(userLocation, { lat: primaryStation.stop_lat, lon: primaryStation.stop_lon }),
      hasActiveTrips: true,
      stationType: 'primary' // Designated as primary station
    }];
    
    // Find secondary station within 100m of primary that also has active trips
    // Select the closest one if multiple secondary stations are available
    const potentialSecondaryStations = sortedStations.filter(station => 
      station.stop_id !== primaryStation.stop_id &&
      hasActiveTrips(station, stopTimes) &&
      calculateDistance(
        { lat: primaryStation.stop_lat, lon: primaryStation.stop_lon },
        { lat: station.stop_lat, lon: station.stop_lon }
      ) <= SECONDARY_STATION_THRESHOLD
    );
    
    // Select closest secondary station (first in distance-sorted array)
    const secondaryStation = potentialSecondaryStations[0];
    
    if (secondaryStation) {
      result.push({
        station: secondaryStation,
        distance: calculateDistance(userLocation, { lat: secondaryStation.stop_lat, lon: secondaryStation.stop_lon }),
        hasActiveTrips: true,
        stationType: 'secondary'
      });
    }
    
    return result;
  }, [stops, stopTimes, currentPosition, isFiltering]);
  
  const toggleFiltering = useCallback(() => setIsFiltering(prev => !prev), []);
  const retryFiltering = useCallback(() => {}, []); // No-op for simple implementation
  
  return {
    filteredStations,
    loading: locationLoading || stationLoading || tripLoading,
    error: locationError || stationError || tripError,
    isFiltering,
    totalStations: stops.length,
    toggleFiltering,
    retryFiltering,
    // Utility functions for UI formatting
    utilities: {
      formatDistance,
      getStationTypeColor,
      getStationTypeLabel
    }
  };
}