/**
 * Basic tests for VehicleTransformationService
 * 
 * These tests verify that the service can be instantiated and basic
 * transformation methods work correctly.
 */

import { describe, it, expect } from 'vitest';
import { VehicleTransformationService } from './VehicleTransformationService';
import { createDefaultTransformationContext } from '../types/presentationLayer';
import type { TranzyVehicleResponse } from '../types/tranzyApi';

describe('VehicleTransformationService', () => {
  it('should instantiate successfully', () => {
    const service = new VehicleTransformationService();
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(VehicleTransformationService);
  });

  it('should have all required methods', () => {
    const service = new VehicleTransformationService();
    
    expect(typeof service.transform).toBe('function');
    expect(typeof service.normalizeApiData).toBe('function');
    expect(typeof service.enrichWithSchedule).toBe('function');
    expect(typeof service.analyzeDirections).toBe('function');
    expect(typeof service.generateDisplayData).toBe('function');
    expect(typeof service.clearCache).toBe('function');
    expect(typeof service.getCacheStats).toBe('function');
  });

  it('should normalize API data correctly', async () => {
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

    const vehicles = await service.normalizeApiData(rawData, context);
    
    expect(vehicles).toHaveLength(1);
    expect(vehicles[0]).toMatchObject({
      id: 'vehicle-1',
      routeId: '42',
      tripId: 'trip-123',
      label: 'Bus 42',
      position: {
        latitude: 46.7712,
        longitude: 23.6236
      },
      speed: 25,
      bearing: 90,
      isWheelchairAccessible: true,
      isBikeAccessible: true
    });
    expect(vehicles[0].timestamp).toBeInstanceOf(Date);
  });

  it('should handle empty API data', async () => {
    const service = new VehicleTransformationService();
    const context = createDefaultTransformationContext('test-key', 'test-agency');
    
    const vehicles = await service.normalizeApiData([], context);
    expect(vehicles).toHaveLength(0);
  });

  it('should filter out invalid vehicles', async () => {
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
        route_id: 42, // Valid vehicle
        trip_id: 'trip-123',
        bearing: 90
      },
      {
        id: 'vehicle-2',
        label: 'Bus 43',
        latitude: null as any, // Invalid latitude
        longitude: 23.6236,
        timestamp: new Date().toISOString(),
        vehicle_type: 3,
        bike_accessible: 'BIKE_ACCESSIBLE',
        wheelchair_accessible: 'WHEELCHAIR_ACCESSIBLE',
        speed: 25,
        route_id: 43,
        trip_id: 'trip-124',
        bearing: 90
      },
      {
        id: 'vehicle-3',
        label: 'Bus 44',
        latitude: 46.7712,
        longitude: 23.6236,
        timestamp: new Date().toISOString(),
        vehicle_type: 3,
        bike_accessible: 'BIKE_ACCESSIBLE',
        wheelchair_accessible: 'WHEELCHAIR_ACCESSIBLE',
        speed: 25,
        route_id: null as any, // No route assignment
        trip_id: 'trip-125',
        bearing: 90
      }
    ];

    const vehicles = await service.normalizeApiData(rawData, context);
    
    // Should only include the first valid vehicle
    expect(vehicles).toHaveLength(1);
    expect(vehicles[0].id).toBe('vehicle-1');
  });

  it('should clear cache successfully', () => {
    const service = new VehicleTransformationService();
    
    expect(() => service.clearCache()).not.toThrow();
  });

  it('should return cache stats', () => {
    const service = new VehicleTransformationService();
    
    const stats = service.getCacheStats();
    expect(stats).toBeDefined();
    expect(typeof stats.size).toBe('number');
    expect(Array.isArray(stats.keys)).toBe(true);
  });
});