/**
 * Global constants and utility functions for the Nearby View Stabilization system
 * 
 * This module provides configurable constants and pure functions for:
 * - Distance threshold management
 * - Station proximity calculations
 * - Threshold evaluation logic
 * 
 * Requirements: 3.1, 3.2, 3.4
 */

import type { Coordinates, Station } from '../../types';
import { calculateDistance } from '../data-processing/distanceUtils';

// ============================================================================
// GLOBAL CONSTANTS
// ============================================================================

/**
 * Distance threshold for displaying a second nearby station (in meters)
 * This is the maximum distance between the closest station and a candidate second station
 * for the second station to be displayed.
 * 
 * Requirement 3.1: Default value of 200 meters
 * Requirement 3.2: Stored as Global_Constant accessible throughout the application
 */
export const NEARBY_STATION_DISTANCE_THRESHOLD = 200; // meters

/**
 * Maximum search radius for finding nearby stations (in meters)
 * Stations beyond this distance from the user will not be considered
 */
export const MAX_NEARBY_SEARCH_RADIUS = 5000; // meters

/**
 * GPS position stability threshold (in meters)
 * Small GPS position changes within this threshold should not trigger station switching
 * to maintain display stability
 * 
 * Requirement 5.1: Maintain station display stability
 */
export const STATION_STABILITY_THRESHOLD = 50; // meters

// ============================================================================
// DISTANCE CALCULATION AND THRESHOLD EVALUATION FUNCTIONS
// ============================================================================

/**
 * Check if a distance is within the nearby station threshold
 * 
 * @param distance - Distance in meters to evaluate
 * @param threshold - Optional custom threshold (defaults to global constant)
 * @returns True if distance is within threshold
 * 
 * Requirement 3.4: Apply current Global_Constant value consistently
 */
export const isWithinNearbyThreshold = (
  distance: number,
  threshold: number = NEARBY_STATION_DISTANCE_THRESHOLD
): boolean => {
  return distance <= threshold;
};

/**
 * Calculate the distance between two stations using their coordinates
 * 
 * @param station1 - First station
 * @param station2 - Second station
 * @returns Distance in meters between the two stations
 * 
 * Requirement 6.3: Use existing distance logic utilities present in the project
 */
export const calculateStationProximity = (
  station1: Station,
  station2: Station
): number => {
  return calculateDistance(station1.coordinates, station2.coordinates);
};

/**
 * Calculate distance from user location to a station
 * 
 * @param userLocation - User's GPS coordinates
 * @param station - Station to calculate distance to
 * @returns Distance in meters from user to station
 */
export const calculateUserToStationDistance = (
  userLocation: Coordinates,
  station: Station
): number => {
  return calculateDistance(userLocation, station.coordinates);
};

/**
 * Check if a station is within the maximum search radius from user location
 * 
 * @param userLocation - User's GPS coordinates
 * @param station - Station to check
 * @param maxRadius - Optional custom radius (defaults to global constant)
 * @returns True if station is within search radius
 */
export const isStationWithinSearchRadius = (
  userLocation: Coordinates,
  station: Station,
  maxRadius: number = MAX_NEARBY_SEARCH_RADIUS
): boolean => {
  const distance = calculateUserToStationDistance(userLocation, station);
  return distance <= maxRadius;
};

/**
 * Check if GPS position change is significant enough to trigger station re-evaluation
 * 
 * @param previousLocation - Previous GPS position
 * @param currentLocation - Current GPS position
 * @param stabilityThreshold - Optional custom threshold (defaults to global constant)
 * @returns True if position change is significant
 * 
 * Requirement 5.1: Avoid frequent switching between nearby stations
 */
export const isSignificantLocationChange = (
  previousLocation: Coordinates,
  currentLocation: Coordinates,
  stabilityThreshold: number = STATION_STABILITY_THRESHOLD
): boolean => {
  const distance = calculateDistance(previousLocation, currentLocation);
  return distance > stabilityThreshold;
};

// ============================================================================
// STATION PROXIMITY UTILITY FUNCTIONS
// ============================================================================

/**
 * Interface for distance calculation results
 */
export interface DistanceCalculationResult {
  distance: number;
  withinThreshold: boolean;
  calculationMethod: 'haversine';
}

/**
 * Interface for station distance information
 */
export interface StationDistanceInfo {
  station: Station;
  distanceFromUser: number;
  distanceBetweenStations?: number;
}

/**
 * Calculate comprehensive distance information for a station relative to user location
 * 
 * @param userLocation - User's GPS coordinates
 * @param station - Station to analyze
 * @param threshold - Optional custom threshold for evaluation
 * @returns Comprehensive distance calculation result
 */
export const calculateStationDistanceInfo = (
  userLocation: Coordinates,
  station: Station,
  threshold: number = NEARBY_STATION_DISTANCE_THRESHOLD
): DistanceCalculationResult => {
  const distance = calculateUserToStationDistance(userLocation, station);
  
  return {
    distance,
    withinThreshold: isWithinNearbyThreshold(distance, threshold),
    calculationMethod: 'haversine'
  };
};

/**
 * Evaluate if a candidate second station meets the distance threshold criteria
 * 
 * @param closestStation - The already identified closest station
 * @param candidateStation - Station being evaluated as potential second station
 * @param threshold - Optional custom threshold (defaults to global constant)
 * @returns True if candidate station should be displayed as second station
 * 
 * Requirements 2.3, 2.4, 2.5: Distance threshold evaluation for second station
 */
export const shouldDisplaySecondStation = (
  closestStation: Station,
  candidateStation: Station,
  threshold: number = NEARBY_STATION_DISTANCE_THRESHOLD
): boolean => {
  const distanceBetweenStations = calculateStationProximity(closestStation, candidateStation);
  return isWithinNearbyThreshold(distanceBetweenStations, threshold);
};

/**
 * Create station distance information with inter-station distance
 * 
 * @param userLocation - User's GPS coordinates
 * @param station - Station to analyze
 * @param referenceStation - Optional reference station for inter-station distance
 * @returns Station distance information object
 */
export const createStationDistanceInfo = (
  userLocation: Coordinates,
  station: Station,
  referenceStation?: Station
): StationDistanceInfo => {
  const distanceFromUser = calculateUserToStationDistance(userLocation, station);
  
  const result: StationDistanceInfo = {
    station,
    distanceFromUser
  };
  
  if (referenceStation) {
    result.distanceBetweenStations = calculateStationProximity(station, referenceStation);
  }
  
  return result;
};

/**
 * Sort stations by distance from user location (closest first)
 * 
 * @param userLocation - User's GPS coordinates
 * @param stations - Array of stations to sort
 * @returns Array of stations sorted by distance from user
 */
export const sortStationsByDistance = (
  userLocation: Coordinates,
  stations: Station[]
): Station[] => {
  return [...stations].sort((a, b) => {
    const distanceA = calculateUserToStationDistance(userLocation, a);
    const distanceB = calculateUserToStationDistance(userLocation, b);
    return distanceA - distanceB;
  });
};

/**
 * Filter stations within search radius and sort by distance
 * 
 * @param userLocation - User's GPS coordinates
 * @param stations - Array of stations to filter and sort
 * @param maxRadius - Optional custom radius (defaults to global constant)
 * @returns Array of stations within radius, sorted by distance
 */
export const getStationsWithinRadius = (
  userLocation: Coordinates,
  stations: Station[],
  maxRadius: number = MAX_NEARBY_SEARCH_RADIUS
): Station[] => {
  const stationsInRadius = stations.filter(station => 
    isStationWithinSearchRadius(userLocation, station, maxRadius)
  );
  
  return sortStationsByDistance(userLocation, stationsInRadius);
};