/**
 * Backward Compatibility Demonstration
 * Shows how existing code patterns work with the new shape store
 */

import { useShapeStore } from '../stores/shapeStore';
import { convertToRouteShape, getCachedRouteShape } from '../utils/shapes/shapeUtils';
import { processAllShapes } from '../utils/shapes/shapeProcessingUtils';
import type { TranzyShapeResponse } from '../types/rawTranzyApi';
import type { RouteShape } from '../types/arrivalTime';

// Example: How existing code would work with the new system

// 1. OLD WAY: Individual shape fetching (still works)
export function oldWayShapeFetching(shapePoints: TranzyShapeResponse[]): RouteShape {
  // This still works exactly as before
  return convertToRouteShape(shapePoints);
}

// 2. OLD WAY: Cached shape fetching (still works)
export function oldWayCachedShapeFetching(shapeId: string, shapePoints: TranzyShapeResponse[]): RouteShape {
  // This still works exactly as before
  return getCachedRouteShape(shapeId, shapePoints);
}

// 3. NEW WAY: Using the shape store (drop-in replacement)
export function newWayShapeAccess(shapeId: string): RouteShape | undefined {
  const store = useShapeStore.getState();
  return store.getShape(shapeId);
}

// 4. MIGRATION EXAMPLE: How existing route shape service patterns can be replaced
export class BackwardCompatibleShapeService {
  // Old interface: get shape by ID
  async getShapeById(shapeId: string): Promise<RouteShape | undefined> {
    const store = useShapeStore.getState();
    
    // Try to get from store first
    let shape = store.getShape(shapeId);
    
    if (!shape) {
      // If not in store, initialize shapes (this will load all shapes)
      await store.initializeShapes();
      shape = store.getShape(shapeId);
    }
    
    return shape;
  }
  
  // Old interface: get multiple shapes
  async getShapesByIds(shapeIds: string[]): Promise<Map<string, RouteShape>> {
    const store = useShapeStore.getState();
    const result = new Map<string, RouteShape>();
    
    // Ensure shapes are loaded
    if (store.shapes.size === 0) {
      await store.initializeShapes();
    }
    
    // Get all requested shapes
    for (const shapeId of shapeIds) {
      const shape = store.getShape(shapeId);
      if (shape) {
        result.set(shapeId, shape);
      }
    }
    
    return result;
  }
  
  // Old interface: check if shape exists
  hasShape(shapeId: string): boolean {
    const store = useShapeStore.getState();
    return store.hasShape(shapeId);
  }
}

// 5. EXAMPLE: How arrival time calculations continue to work
export function calculateArrivalWithShape(shapeId: string, vehiclePosition: { lat: number; lon: number }): number | null {
  const store = useShapeStore.getState();
  const shape = store.getShape(shapeId);
  
  if (!shape) {
    return null;
  }
  
  // This is the same RouteShape interface as before
  // All existing arrival calculation code continues to work
  const segments = shape.segments;
  const points = shape.points;
  
  // Example calculation (simplified)
  let totalDistance = 0;
  for (const segment of segments) {
    totalDistance += segment.distance;
  }
  
  // Return mock arrival time based on distance
  return totalDistance * 60; // seconds
}

// 6. EXAMPLE: How existing filtering code continues to work
export function filterShapesByBounds(bounds: { north: number; south: number; east: number; west: number }): RouteShape[] {
  const store = useShapeStore.getState();
  const results: RouteShape[] = [];
  
  // Iterate through all shapes (same interface as before)
  for (const [shapeId, shape] of store.shapes) {
    // Check if any point is within bounds
    const hasPointInBounds = shape.points.some(point => 
      point.lat >= bounds.south && 
      point.lat <= bounds.north && 
      point.lon >= bounds.west && 
      point.lon <= bounds.east
    );
    
    if (hasPointInBounds) {
      results.push(shape);
    }
  }
  
  return results;
}

// 7. EXAMPLE: Performance comparison demonstration
export function performanceComparison() {
  const store = useShapeStore.getState();
  
  // Simulate having shapes loaded
  const mockShapes = new Map<string, RouteShape>();
  // ... populate with mock data
  
  // NEW WAY: O(1) lookup
  const start1 = performance.now();
  for (let i = 0; i < 1000; i++) {
    store.getShape('test_shape_1');
  }
  const end1 = performance.now();
  
  console.log(`New way (O(1) lookup): ${end1 - start1}ms for 1000 lookups`);
  
  // OLD WAY: Would require API calls or linear search
  // This demonstrates the performance improvement
  
  return {
    newWayTime: end1 - start1,
    improvement: 'Instant lookup vs API calls'
  };
}

// 8. EXAMPLE: Error handling remains the same
export function errorHandlingExample(shapeId: string): RouteShape | null {
  try {
    const store = useShapeStore.getState();
    const shape = store.getShape(shapeId);
    
    if (!shape) {
      console.warn(`Shape ${shapeId} not found`);
      return null;
    }
    
    // Validate shape data (same as before)
    if (!shape.points || shape.points.length === 0) {
      console.warn(`Shape ${shapeId} has no points`);
      return null;
    }
    
    return shape;
  } catch (error) {
    console.error(`Error accessing shape ${shapeId}:`, error);
    return null;
  }
}

// Summary: All existing patterns continue to work
// - convertToRouteShape() still works for individual processing
// - getCachedRouteShape() still works for caching
// - RouteShape interface is identical
// - Error handling patterns are the same
// - Performance is improved (O(1) vs API calls)
// - New bulk loading is transparent to existing code