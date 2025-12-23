/**
 * DistanceCalculator Class
 * Handles geometric calculations along route shapes and fallback distance calculations
 * Implements GPS projection algorithms for accurate arrival time calculations
 */

import type {
  Coordinates,
  TranzyStopResponse,
  RouteShape,
  DistanceResult,
  ProjectionResult
} from '../../types/arrivalTime.ts';

import {
  calculateDistanceAlongShape,
  calculateDistanceViaStops,
  projectPointToShape
} from './distanceUtils.ts';

/**
 * DistanceCalculator class for handling all distance-related calculations
 * for vehicle arrival time estimation
 */
export class DistanceCalculator {
  /**
   * Calculate distance along route shape from vehicle to target stop
   * Uses GPS projection algorithms to find closest points on route shape
   * 
   * @param vehiclePosition Current GPS position of the vehicle
   * @param targetStop The stop the vehicle is heading to
   * @param routeShape The route geometry (polyline) to follow
   * @returns Distance result with total distance and confidence level
   */
  calculateDistanceAlongShape(
    vehiclePosition: Coordinates,
    targetStop: TranzyStopResponse,
    routeShape: RouteShape
  ): DistanceResult {
    const targetStopPosition = { lat: targetStop.stop_lat, lon: targetStop.stop_lon };
    return calculateDistanceAlongShape(vehiclePosition, targetStopPosition, routeShape);
  }

  /**
   * Calculate distance via intermediate stops (fallback method)
   * Used when route shape is not available
   * Sums straight-line distances between consecutive stops
   * 
   * @param vehiclePosition Current GPS position of the vehicle
   * @param targetStop The stop the vehicle is heading to
   * @param intermediateStops Array of stops between vehicle and target
   * @returns Distance result using stop-to-stop segments
   */
  calculateDistanceViaStops(
    vehiclePosition: Coordinates,
    targetStop: TranzyStopResponse,
    intermediateStops: Coordinates[]
  ): DistanceResult {
    const targetStopPosition = { lat: targetStop.stop_lat, lon: targetStop.stop_lon };
    return calculateDistanceViaStops(vehiclePosition, targetStopPosition, intermediateStops);
  }

  /**
   * Project a GPS point to the closest point on route shape
   * Implements GPS projection algorithms to handle cases where
   * vehicle/stop positions are not exactly on the route shape
   * 
   * @param point GPS position to project
   * @param shape Route shape to project onto
   * @returns Projection result with closest point and distance information
   */
  projectPointToShape(
    point: Coordinates,
    shape: RouteShape
  ): ProjectionResult {
    return projectPointToShape(point, shape);
  }

  /**
   * Calculate distance using the most appropriate method
   * Automatically selects between route shape and stop segments based on availability
   * 
   * @param vehiclePosition Current GPS position of the vehicle
   * @param targetStop The stop the vehicle is heading to
   * @param routeShape Optional route shape (if available)
   * @param intermediateStops Array of stops between vehicle and target (for fallback)
   * @returns Distance result using the best available method
   */
  calculateDistance(
    vehiclePosition: Coordinates,
    targetStop: TranzyStopResponse,
    routeShape?: RouteShape,
    intermediateStops: Coordinates[] = []
  ): DistanceResult {
    // Prefer route shape method when available
    if (routeShape && routeShape.segments.length > 0) {
      return this.calculateDistanceAlongShape(vehiclePosition, targetStop, routeShape);
    }

    // Fall back to stop segments method
    return this.calculateDistanceViaStops(vehiclePosition, targetStop, intermediateStops);
  }
}

/**
 * Default instance for convenience
 * Can be used directly without instantiating the class
 */
export const distanceCalculator = new DistanceCalculator();