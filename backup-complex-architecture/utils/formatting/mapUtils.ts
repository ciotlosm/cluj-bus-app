import { calculateDistance } from '../data-processing/distanceUtils';
import { logger } from '../shared/logger';

/**
 * Default distance threshold for considering two points as overlapping on a map
 */
export const DEFAULT_OVERLAP_THRESHOLD_METERS = 200;

/**
 * Default padding in degrees for map bounds when points are overlapping
 * Approximately 220 meters to ensure symbols don't visually overlap
 */
export const DEFAULT_MAP_PADDING_DEGREES = 0.002;

/**
 * Check if two geographic points are overlapping (within a specified distance)
 * @param point1 First coordinate point
 * @param point2 Second coordinate point
 * @param thresholdMeters Distance threshold in meters (default: 200m)
 * @returns True if points are within the threshold distance
 */
export const arePointsOverlapping = (
  point1: { latitude: number; longitude: number },
  point2: { latitude: number; longitude: number },
  thresholdMeters: number = DEFAULT_OVERLAP_THRESHOLD_METERS
): boolean => {
  const distance = calculateDistance(point1, point2);
  return distance <= thresholdMeters;
};

/**
 * Calculate map bounds for overlapping points with appropriate zoom
 * @param point1 First coordinate point
 * @param point2 Second coordinate point
 * @param paddingDegrees Padding in degrees (default: 0.002 ≈ 220m)
 * @returns Map bounds as [[south, west], [north, east]]
 */
export const calculateOverlapBounds = (
  point1: { latitude: number; longitude: number },
  point2: { latitude: number; longitude: number },
  paddingDegrees: number = DEFAULT_MAP_PADDING_DEGREES
): [[number, number], [number, number]] => {
  const centerLat = (point1.latitude + point2.latitude) / 2;
  const centerLng = (point1.longitude + point2.longitude) / 2;
  
  return [
    [centerLat - paddingDegrees, centerLng - paddingDegrees],
    [centerLat + paddingDegrees, centerLng + paddingDegrees],
  ];
};

/**
 * Log overlap detection for debugging
 * @param type Type of overlap (e.g., 'bus-user', 'bus-station')
 * @param point1 First point with optional name
 * @param point2 Second point with optional name
 * @param distance Distance between points in meters
 * @param bounds Calculated bounds
 */
export const logOverlapDetection = (
  type: string,
  point1: { latitude: number; longitude: number; name?: string },
  point2: { latitude: number; longitude: number; name?: string },
  distance: number,
  bounds: [[number, number], [number, number]]
): void => {
  logger.info(`${type} overlap detected, applying zoom`, {
    type,
    distance: Math.round(distance),
    point1: {
      lat: point1.latitude,
      lng: point1.longitude,
      name: point1.name
    },
    point2: {
      lat: point2.latitude,
      lng: point2.longitude,
      name: point2.name
    },
    centerLat: (bounds[0][0] + bounds[1][0]) / 2,
    centerLng: (bounds[0][1] + bounds[1][1]) / 2,
    padding: (bounds[1][0] - bounds[0][0]) / 2
  });
};