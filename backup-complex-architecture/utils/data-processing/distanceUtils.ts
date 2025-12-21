import type { Coordinates } from '../../types';

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param pos1 First coordinate
 * @param pos2 Second coordinate
 * @returns Distance in meters
 */
export const calculateDistance = (
  pos1: { latitude: number; longitude: number },
  pos2: { latitude: number; longitude: number }
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = pos1.latitude * Math.PI / 180;
  const φ2 = pos2.latitude * Math.PI / 180;
  const Δφ = (pos2.latitude - pos1.latitude) * Math.PI / 180;
  const Δλ = (pos2.longitude - pos1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

/**
 * Format distance for display
 * @param distanceInMeters Distance in meters
 * @returns Formatted string (e.g., "150m", "1.2km")
 */
export const formatDistance = (distanceInMeters: number): string => {
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)}m`;
  } else {
    return `${(distanceInMeters / 1000).toFixed(1)}km`;
  }
};

/**
 * Check if two coordinates are within a certain distance
 * @param pos1 First coordinate
 * @param pos2 Second coordinate
 * @param maxDistanceMeters Maximum distance in meters
 * @returns True if coordinates are within the specified distance
 */
export const isWithinDistance = (
  pos1: { latitude: number; longitude: number },
  pos2: { latitude: number; longitude: number },
  maxDistanceMeters: number
): boolean => {
  return calculateDistance(pos1, pos2) <= maxDistanceMeters;
};