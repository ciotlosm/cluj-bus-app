import { describe, it, expect } from 'vitest';
import { createVehicleTransformationPipeline } from './vehicleTransformationPipeline';
import type { EnhancedVehicleWithDirection } from './types';

describe('createVehicleTransformationPipeline', () => {
  const createMockVehicle = (id: string, routeId: string, minutesAway: number, direction: 'arriving' | 'departing' | 'unknown' = 'arriving'): EnhancedVehicleWithDirection => ({
    id,
    routeId,
    route: `Route ${routeId}`,
    destination: 'Test Destination',
    vehicle: {
      id,
      routeId,
      tripId: `trip-${id}`,
      label: `Bus ${id}`,
      position: { latitude: 46.7712, longitude: 23.6236 },
      timestamp: new Date(),
      speed: 30,
      isWheelchairAccessible: false,
      isBikeAccessible: false
    },
    isLive: true,
    isScheduled: false,
    confidence: 'medium',
    direction: 'unknown' as 'work' | 'home' | 'unknown',
    station: {
      id: 'station-1',
      name: 'Test Station',
      coordinates: { latitude: 46.7712, longitude: 23.6236 },
      routeIds: [routeId]
    },
    minutesAway,
    estimatedArrival: new Date(Date.now() + minutesAway * 60000),
    _internalDirection: direction
  });

  it('should create a transformation pipeline with default options', () => {
    const pipeline = createVehicleTransformationPipeline();
    expect(typeof pipeline).toBe('function');
  });

  it('should handle empty vehicle arrays', () => {
    const pipeline = createVehicleTransformationPipeline();
    const result = pipeline([]);
    expect(result).toEqual([]);
  });

  it('should sort vehicles by priority', () => {
    const vehicles = [
      createMockVehicle('v1', 'route1', 10, 'arriving'),
      createMockVehicle('v2', 'route1', 0, 'arriving'), // At station
      createMockVehicle('v3', 'route1', 5, 'arriving')
    ];

    const pipeline = createVehicleTransformationPipeline({ sortByPriority: true });
    const result = pipeline(vehicles);

    expect(result[0].minutesAway).toBe(0); // At station should be first
    expect(result[1].minutesAway).toBe(5); // Then closest arriving
    expect(result[2].minutesAway).toBe(10); // Then further arriving
  });

  it('should limit vehicles per station', () => {
    const vehicles = [
      createMockVehicle('v1', 'route1', 5),
      createMockVehicle('v2', 'route1', 10),
      createMockVehicle('v3', 'route1', 15),
      createMockVehicle('v4', 'route1', 20)
    ];

    const pipeline = createVehicleTransformationPipeline({ maxVehiclesPerStation: 2 });
    const result = pipeline(vehicles);

    expect(result.length).toBe(2);
  });

  it('should show all vehicles per route when enabled', () => {
    const vehicles = [
      createMockVehicle('v1', 'route1', 5),
      createMockVehicle('v2', 'route1', 10),
      createMockVehicle('v3', 'route2', 15),
      createMockVehicle('v4', 'route2', 20)
    ];

    const pipeline = createVehicleTransformationPipeline({ 
      showAllVehiclesPerRoute: true,
      maxVehiclesPerStation: 3
    });
    const result = pipeline(vehicles);

    expect(result.length).toBe(3); // Limited by maxVehiclesPerStation
  });

  it('should deduplicate by route when showAllVehiclesPerRoute is false', () => {
    const vehicles = [
      createMockVehicle('v1', 'route1', 5),
      createMockVehicle('v2', 'route1', 10), // Same route, should be filtered
      createMockVehicle('v3', 'route2', 15),
      createMockVehicle('v4', 'route3', 20)
    ];

    const pipeline = createVehicleTransformationPipeline({ 
      showAllVehiclesPerRoute: false,
      maxVehiclesPerStation: 10
    });
    const result = pipeline(vehicles);

    expect(result.length).toBe(3); // One per route
    expect(result.find(v => v.routeId === 'route1')?.minutesAway).toBe(5); // Best vehicle from route1
  });

  it('should handle single route with multiple vehicles', () => {
    const vehicles = [
      createMockVehicle('v1', 'route1', 10),
      createMockVehicle('v2', 'route1', 5),
      createMockVehicle('v3', 'route1', 15)
    ];

    const pipeline = createVehicleTransformationPipeline({ 
      showAllVehiclesPerRoute: false,
      maxVehiclesPerStation: 2
    });
    const result = pipeline(vehicles);

    // Single route: should show multiple vehicles up to limit
    expect(result.length).toBe(2);
    expect(result[0].minutesAway).toBe(5); // Closest first
    expect(result[1].minutesAway).toBe(10); // Then next closest
  });

  it('should handle invalid input gracefully', () => {
    const pipeline = createVehicleTransformationPipeline();
    const result = pipeline(null as any);
    expect(result).toEqual([]);
  });
});