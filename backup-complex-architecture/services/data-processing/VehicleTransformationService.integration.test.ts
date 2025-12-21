/**
 * Integration tests for VehicleTransformationService
 * 
 * These tests verify the complete transformation pipeline from raw API data
 * to UI-ready transformed vehicle data.
 */

import { describe, it, expect } from 'vitest';
import { VehicleTransformationService } from './VehicleTransformationService';
import { createDefaultTransformationContext } from '../types/presentationLayer';
import type { TranzyVehicleResponse } from '../types/tranzyApi';

describe('VehicleTransformationService Integration', () => {
  it('should perform complete transformation pipeline', async () => {
    const service = new VehicleTransformationService();
    
    // Create test context with target stations
    const context = createDefaultTransformationContext('test-key', 'test-agency');
    context.targetStations = [
      {
        id: 'station-1',
        name: 'Test Station',
        coordinates: { latitude: 46.7712, longitude: 23.6236 },
        routeIds: ['42'],
        isFavorite: false,
        accessibility: {
          wheelchairAccessible: true,
          bikeRacks: true,
          audioAnnouncements: false
        }
      }
    ];
    context.favoriteRoutes = ['42'];

    const rawData: TranzyVehicleResponse[] = [
      {
        id: 'vehicle-1',
        label: 'Bus 42A',
        latitude: 46.7710, // Close to station
        longitude: 23.6235,
        timestamp: new Date().toISOString(),
        vehicle_type: 3,
        bike_accessible: 'BIKE_ACCESSIBLE',
        wheelchair_accessible: 'WHEELCHAIR_ACCESSIBLE',
        speed: 15,
        route_id: 42,
        trip_id: 'trip-123',
        bearing: 90
      },
      {
        id: 'vehicle-2',
        label: 'Bus 43B',
        latitude: 46.7800, // Further from station
        longitude: 23.6300,
        timestamp: new Date().toISOString(),
        vehicle_type: 3,
        bike_accessible: 'BIKE_INACCESSIBLE',
        wheelchair_accessible: 'WHEELCHAIR_INACCESSIBLE',
        speed: 20,
        route_id: 43,
        trip_id: 'trip-124',
        bearing: 180
      }
    ];

    const result = await service.transform(rawData, context);

    // Verify structure
    expect(result).toBeDefined();
    expect(result.vehicles).toBeInstanceOf(Map);
    expect(result.schedules).toBeInstanceOf(Map);
    expect(result.directions).toBeInstanceOf(Map);
    expect(result.displayData).toBeInstanceOf(Map);
    expect(result.metadata).toBeDefined();

    // Verify vehicles were processed
    expect(result.vehicles.size).toBe(2);
    expect(result.vehicles.has('vehicle-1')).toBe(true);
    expect(result.vehicles.has('vehicle-2')).toBe(true);

    // Verify vehicle data
    const vehicle1 = result.vehicles.get('vehicle-1')!;
    expect(vehicle1.id).toBe('vehicle-1');
    expect(vehicle1.routeId).toBe('42');
    expect(vehicle1.label).toBe('Bus 42A');
    expect(vehicle1.isWheelchairAccessible).toBe(true);
    expect(vehicle1.isBikeAccessible).toBe(true);

    // Verify schedules were created
    expect(result.schedules.size).toBe(2);
    const schedule1 = result.schedules.get('vehicle-1')!;
    expect(schedule1.vehicleId).toBe('vehicle-1');
    expect(schedule1.routeId).toBe('42');
    expect(schedule1.stationId).toBe('station-1');
    expect(schedule1.isRealTime).toBe(true);
    expect(typeof schedule1.minutesUntilArrival).toBe('number');

    // Verify directions were analyzed
    expect(result.directions.size).toBe(2);
    const direction1 = result.directions.get('vehicle-1')!;
    expect(direction1.vehicleId).toBe('vehicle-1');
    expect(direction1.stationId).toBe('station-1');
    expect(direction1.routeId).toBe('42');
    expect(typeof direction1.distanceToStation).toBe('number');

    // Verify display data was generated
    expect(result.displayData.size).toBe(2);
    const display1 = result.displayData.get('vehicle-1')!;
    expect(display1.vehicleId).toBe('vehicle-1');
    expect(display1.displayName).toBe('42 - Bus 42A');
    expect(display1.routeName).toBe('42');
    expect(display1.vehicleLabel).toBe('Bus 42A');
    expect(display1.isRealTime).toBe(true);
    expect(display1.isWheelchairAccessible).toBe(true);
    expect(display1.isBikeAccessible).toBe(true);
    expect(display1.isFavorite).toBe(true); // Route 42 is in favorites

    // Verify grouping maps
    expect(result.vehiclesByRoute.has('42')).toBe(true);
    expect(result.vehiclesByRoute.has('43')).toBe(true);
    expect(result.vehiclesByRoute.get('42')).toContain('vehicle-1');
    expect(result.vehiclesByRoute.get('43')).toContain('vehicle-2');

    expect(result.vehiclesByStation.has('station-1')).toBe(true);
    expect(result.vehiclesByStation.get('station-1')).toContain('vehicle-1');
    expect(result.vehiclesByStation.get('station-1')).toContain('vehicle-2');

    // Verify favorite vehicles
    expect(result.favoriteVehicles.has('vehicle-1')).toBe(true); // Route 42 is favorite
    expect(result.favoriteVehicles.has('vehicle-2')).toBe(false); // Route 43 is not favorite

    // Verify real-time vehicles
    expect(result.realTimeVehicles.has('vehicle-1')).toBe(true);
    expect(result.realTimeVehicles.has('vehicle-2')).toBe(true);

    // Verify sorted arrays
    expect(result.sortedByArrival).toHaveLength(2);
    expect(result.sortedByPriority).toHaveLength(2);

    // Verify metadata
    expect(result.metadata.vehiclesProcessed).toBe(2);
    expect(result.metadata.vehiclesTransformed).toBe(2);
    expect(result.metadata.vehiclesFailed).toBe(0);
    expect(result.metadata.stepsExecuted).toContain('normalize-api-data');
    expect(result.metadata.stepsExecuted).toContain('enrich-with-schedule');
    expect(result.metadata.stepsExecuted).toContain('analyze-directions');
    expect(result.metadata.stepsExecuted).toContain('generate-display-data');
    expect(result.metadata.transformationDuration).toBeGreaterThan(0);
  });

  it('should handle transformation with no target stations', async () => {
    const service = new VehicleTransformationService();
    const context = createDefaultTransformationContext('test-key', 'test-agency');
    // No target stations

    const rawData: TranzyVehicleResponse[] = [
      {
        id: 'vehicle-1',
        label: 'Bus 42',
        latitude: 46.7712,
        longitude: 23.6236,
        timestamp: new Date().toISOString(),
        vehicle_type: 3,
        bike_accessible: 'BIKE_ACCESSIBLE',
        wheelchair_accessible: 'WHEELCHAIR_ACCESSIBLE',
        speed: 25,
        route_id: 42,
        trip_id: 'trip-123',
        bearing: 90
      }
    ];

    const result = await service.transform(rawData, context);

    // Should still process vehicles but with no schedule/direction data
    expect(result.vehicles.size).toBe(1);
    expect(result.schedules.size).toBe(0); // No schedules without target stations
    expect(result.directions.size).toBe(0); // No directions without target stations
    expect(result.displayData.size).toBe(1); // Display data should still be generated
  });

  it('should use cache for repeated transformations', async () => {
    const service = new VehicleTransformationService();
    const context = createDefaultTransformationContext('test-key', 'test-agency');

    const rawData: TranzyVehicleResponse[] = [
      {
        id: 'vehicle-1',
        label: 'Bus 42',
        latitude: 46.7712,
        longitude: 23.6236,
        timestamp: new Date().toISOString(),
        vehicle_type: 3,
        bike_accessible: 'BIKE_ACCESSIBLE',
        wheelchair_accessible: 'WHEELCHAIR_ACCESSIBLE',
        speed: 25,
        route_id: 42,
        trip_id: 'trip-123',
        bearing: 90
      }
    ];

    // First transformation
    const result1 = await service.transform(rawData, context);
    const duration1 = result1.metadata.transformationDuration;

    // Second transformation with same data should be faster (cached)
    const result2 = await service.transform(rawData, context);
    const duration2 = result2.metadata.transformationDuration;

    expect(result1.vehicles.size).toBe(result2.vehicles.size);
    expect(result1.metadata.vehiclesProcessed).toBe(result2.metadata.vehiclesProcessed);
    
    // Cache stats should show cache usage
    const stats = service.getCacheStats();
    expect(stats.size).toBeGreaterThan(0);
  });
});