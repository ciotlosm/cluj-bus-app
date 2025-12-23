/**
 * Geometry Utilities
 * Pure geometric calculations for arrival time system
 */

import { calculateDistance } from '../location/distanceUtils.ts';
import type { Coordinates } from '../location/distanceUtils.ts';

/**
 * Core projection calculation - projects a point onto a line segment
 * Returns the projection parameter and closest point
 */
function projectPointToSegmentCore(
  point: Coordinates,
  segmentStart: Coordinates,
  segmentEnd: Coordinates
): { t: number; closestPoint: Coordinates } {
  // Vector from start to end of segment
  const segmentVector = {
    lat: segmentEnd.lat - segmentStart.lat,
    lon: segmentEnd.lon - segmentStart.lon
  };
  
  // Vector from start to point
  const pointVector = {
    lat: point.lat - segmentStart.lat,
    lon: point.lon - segmentStart.lon
  };
  
  // Calculate projection parameter
  const segmentLengthSquared = segmentVector.lat * segmentVector.lat + segmentVector.lon * segmentVector.lon;
  
  if (segmentLengthSquared === 0) {
    // Segment is a point
    return { t: 0, closestPoint: segmentStart };
  }
  
  const t = Math.max(0, Math.min(1, 
    (pointVector.lat * segmentVector.lat + pointVector.lon * segmentVector.lon) / segmentLengthSquared
  ));
  
  // Find closest point on segment
  const closestPoint = {
    lat: segmentStart.lat + t * segmentVector.lat,
    lon: segmentStart.lon + t * segmentVector.lon
  };
  
  return { t, closestPoint };
}

/**
 * Calculate progress along segment (0 = at start, 1 = at end, <0 = before start, >1 = after end)
 */
export function calculateProgressAlongSegment(
  vehiclePosition: Coordinates,
  segmentStart: Coordinates,
  segmentEnd: Coordinates
): number {
  // Vector from start to end of segment
  const segmentVector = {
    lat: segmentEnd.lat - segmentStart.lat,
    lon: segmentEnd.lon - segmentStart.lon
  };
  
  // Vector from start to vehicle
  const vehicleVector = {
    lat: vehiclePosition.lat - segmentStart.lat,
    lon: vehiclePosition.lon - segmentStart.lon
  };
  
  // Calculate projection parameter (dot product)
  const segmentLengthSquared = segmentVector.lat * segmentVector.lat + segmentVector.lon * segmentVector.lon;
  
  if (segmentLengthSquared === 0) {
    return 0; // Segment is a point
  }
  
  return (vehicleVector.lat * segmentVector.lat + vehicleVector.lon * segmentVector.lon) / segmentLengthSquared;
}

/**
 * Calculate distance from a point to a line segment
 */
export function distancePointToLineSegment(
  point: Coordinates,
  segmentStart: Coordinates,
  segmentEnd: Coordinates
): number {
  const { closestPoint } = projectPointToSegmentCore(point, segmentStart, segmentEnd);
  return calculateDistance(point, closestPoint);
}

/**
 * Project a point onto a line segment (for route shape calculations)
 * Returns both the closest point and the position parameter
 */
export function projectPointToSegment(
  point: Coordinates, 
  segmentStart: Coordinates, 
  segmentEnd: Coordinates
): { point: Coordinates; position: number } {
  const { t, closestPoint } = projectPointToSegmentCore(point, segmentStart, segmentEnd);
  return { point: closestPoint, position: t };
}