/**
 * Route Shape Service
 * Manages fetching and caching of route shapes for arrival time calculations
 */

import { shapesService } from './shapesService.ts';
import { getCachedRouteShape } from '../utils/shapes/shapeUtils.ts';
import type { RouteShape } from '../types/arrivalTime.ts';
import type { TranzyTripResponse, TranzyShapeResponse } from '../types/rawTranzyApi.ts';

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

  try {
    // Fetch all shapes from API (since we don't have a method to fetch specific shapes)
    const allShapes = await shapesService.getAllShapes();
    
    // Group shapes by shape_id
    const shapeGroups = new Map<string, TranzyShapeResponse[]>();
    allShapes.forEach(shape => {
      if (!shapeGroups.has(shape.shape_id)) {
        shapeGroups.set(shape.shape_id, []);
      }
      shapeGroups.get(shape.shape_id)!.push(shape);
    });

    // Create RouteShape objects for requested shape IDs
    uniqueShapeIds.forEach(shapeId => {
      const shapePoints = shapeGroups.get(shapeId);
      if (shapePoints && shapePoints.length > 0) {
        try {
          const routeShape = getCachedRouteShape(shapeId, shapePoints);
          routeShapes.set(shapeId, routeShape);
        } catch (error) {
          console.warn(`Failed to create route shape for ${shapeId}:`, error);
        }
      }
    });

  } catch (error) {
    console.warn('Failed to fetch shapes:', error);
  }

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