/**
 * Route Shape Service
 * Manages fetching and caching of route shapes for arrival time calculations
 */

import { shapesService } from './shapesService.ts';
import { getCachedRouteShape } from '../utils/arrival/shapeUtils.ts';
import type { RouteShape } from '../types/arrivalTime.ts';
import type { TranzyTripResponse } from '../types/rawTranzyApi.ts';

/**
 * Fetch route shapes for multiple trips efficiently
 * Only fetches unique shape_ids to minimize API calls
 */
export async function fetchRouteShapesForTrips(trips: TranzyTripResponse[]): Promise<Map<string, RouteShape>> {
  const routeShapes = new Map<string, RouteShape>();
  
  // Get unique shape IDs to minimize API calls
  const uniqueShapeIds = [...new Set(trips.map(trip => trip.shape_id).filter(Boolean))];
  
  if (uniqueShapeIds.length === 0) {
    return routeShapes;
  }

  // Fetch shapes in parallel for better performance
  const shapePromises = uniqueShapeIds.map(async (shapeId) => {
    try {
      const shapePoints = await shapesService.getShapePoints(shapeId);
      if (shapePoints.length > 0) {
        const routeShape = getCachedRouteShape(shapeId, shapePoints);
        return { shapeId, routeShape };
      }
    } catch (error) {
      console.warn(`Failed to fetch shape ${shapeId}:`, error);
    }
    return null;
  });

  // Wait for all shape fetches to complete
  const results = await Promise.allSettled(shapePromises);
  
  // Add successful results to the map
  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value) {
      const { shapeId, routeShape } = result.value;
      routeShapes.set(shapeId, routeShape);
    }
  });

  return routeShapes;
}

/**
 * Fetch route shapes for vehicles based on their current trips
 * Filters to only active vehicles with trip assignments
 */
export async function fetchRouteShapesForVehicles(
  vehicles: any[], 
  trips: TranzyTripResponse[]
): Promise<Map<string, RouteShape>> {
  // Get trips for active vehicles only
  const activeVehicleTrips = vehicles
    .filter(vehicle => vehicle.trip_id)
    .map(vehicle => trips.find(trip => trip.trip_id === vehicle.trip_id))
    .filter(Boolean) as TranzyTripResponse[];

  return fetchRouteShapesForTrips(activeVehicleTrips);
}