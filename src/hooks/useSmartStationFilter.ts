/**
 * Smart Station Filtering Hook
 * Minimal implementation for location-based station filtering
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocationStore } from '../stores/locationStore';
import { useStationStore } from '../stores/stationStore';
import { useTripStore } from '../stores/tripStore';
import { calculateDistance, sortByDistance } from '../utils/location/distanceUtils';
import { hasActiveTrips } from '../utils/station/tripValidationUtils';
import type { SmartStationFilterResult, FilteredStation } from '../types/smartStationFilter';
import { SECONDARY_STATION_THRESHOLD } from '../types/smartStationFilter';

// Utility functions moved from StationView
const formatDistance = (distance: number): string => {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }
  return `${(distance / 1000).toFixed(1)}km`;
};

const getStationTypeColor = (stationType: 'primary' | 'secondary' | 'all'): 'primary' | 'secondary' | 'default' => {
  if (stationType === 'primary') return 'primary';
  if (stationType === 'secondary') return 'secondary';
  return 'default';
};

const getStationTypeLabel = (stationType: 'primary' | 'secondary' | 'all'): string => {
  if (stationType === 'primary') return 'Closest';
  if (stationType === 'secondary') return 'Nearby';
  return ''; // No label for filtered view
};

// Safe distance calculation with error handling
const safeCalculateDistance = (from: { lat: number; lon: number }, to: { lat: number; lon: number }): number => {
  try {
    return calculateDistance(from, to);
  } catch (error) {
    console.warn('Distance calculation failed:', error);
    return 0; // Return 0 distance on error
  }
};

export function useSmartStationFilter(): SmartStationFilterResult {
  const { currentPosition, loading: locationLoading, error: locationError } = useLocationStore();
  const { stops, loading: stationLoading, error: stationError } = useStationStore();
  const { stopTimes, loading: tripLoading, error: tripError, loadStopTimes } = useTripStore();
  
  const [isFiltering, setIsFiltering] = useState(true);
  
  // Auto-load stop times when hook is used
  useEffect(() => {
    const loadTripData = async () => {
      if (stopTimes.length === 0 && !tripLoading && !tripError) {
        const { useConfigStore } = await import('../stores/configStore');
        const { apiKey, agency_id } = useConfigStore.getState();
        
        if (apiKey && agency_id) {
          loadStopTimes(apiKey, agency_id);
        }
      }
    };
    
    loadTripData();
  }, [stopTimes.length, tripLoading, tripError, loadStopTimes]);
  
  const filteredStations = useMemo((): FilteredStation[] => {
    // Early return if no stations available
    if (stops.length === 0) {
      return [];
    }

    // When filtering is disabled, return all stations sorted by distance (if location available)
    if (!isFiltering) {
      const allStations = stops.map((station, index) => ({
        station,
        distance: currentPosition ? safeCalculateDistance(
          { lat: currentPosition.coords.latitude, lon: currentPosition.coords.longitude },
          { lat: station.stop_lat, lon: station.stop_lon }
        ) : 0,
        hasActiveTrips: hasActiveTrips(station, stopTimes),
        stationType: 'all' as const // Will be updated after sorting
      }));

      // Sort by distance if location is available
      if (currentPosition) {
        const sorted = allStations.sort((a, b) => a.distance - b.distance);
        // First station gets "Closest", others get no label
        return sorted.map((station, index) => ({
          ...station,
          stationType: index === 0 ? 'primary' : 'all' as const
        }));
      }
      
      return allStations;
    }
    
    // Smart filtering is enabled - need location
    if (!currentPosition) {
      return []; // No location available for smart filtering
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
      distance: safeCalculateDistance(userLocation, { lat: primaryStation.stop_lat, lon: primaryStation.stop_lon }),
      hasActiveTrips: true,
      stationType: 'all' // No labels in filtered view - position indicates priority
    }];
    
    // Find secondary station within 100m of primary that also has active trips
    // Select the closest one if multiple secondary stations are available
    const potentialSecondaryStations = sortedStations.filter(station => 
      station.stop_id !== primaryStation.stop_id &&
      hasActiveTrips(station, stopTimes) &&
      safeCalculateDistance(
        { lat: primaryStation.stop_lat, lon: primaryStation.stop_lon },
        { lat: station.stop_lat, lon: station.stop_lon }
      ) <= SECONDARY_STATION_THRESHOLD
    );
    
    // Select closest secondary station (first in distance-sorted array)
    const secondaryStation = potentialSecondaryStations[0];
    
    if (secondaryStation) {
      result.push({
        station: secondaryStation,
        distance: safeCalculateDistance(userLocation, { lat: secondaryStation.stop_lat, lon: secondaryStation.stop_lon }),
        hasActiveTrips: true,
        stationType: 'all' // No labels in filtered view
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