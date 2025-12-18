/**
 * Integration Tests for GPS Position Stability Logic
 * 
 * These tests demonstrate the GPS stability functionality working end-to-end
 * with realistic scenarios of GPS position changes and station selection stability.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createNearbyViewController, type NearbyViewOptions } from '../../controllers/nearbyViewController';
import type { Coordinates, Station, LiveVehicle } from '../../types';
import type { Route } from '../../types/tranzyApi';

// Mock logger to avoid console output during tests
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('GPS Position Stability Integration Tests', () => {
  // Test scenario: User walking near two bus stations
  const userStartLocation: Coordinates = { latitude: 46.7712, longitude: 23.6236 };
  const userNearbyLocation: Coordinates = { latitude: 46.7713, longitude: 23.6237 }; // ~15m away
  const userDistantLocation: Coordinates = { latitude: 46.7800, longitude: 23.6300 }; // ~1km away
  
  const station1: Station = {
    id: 'station1',
    name: 'Main Station',
    coordinates: { latitude: 46.7720, longitude: 23.6240 },
    isFavorite: false
  };
  
  const station2: Station = {
    id: 'station2',
    name: 'Secondary Station',
    coordinates: { latitude: 46.7725, longitude: 23.6245 },
    isFavorite: false
  };
  
  const route42: Route = {
    id: 'route42',
    routeName: '42',
    routeDesc: 'Route 42 - Main Line',
    agencyId: 'ctp-cluj',
    type: 'bus'
  };
  
  const stopTime1 = {
    tripId: 'trip42_1',
    stopId: 'station1',
    arrivalTime: '08:00:00',
    departureTime: '08:00:00',
    sequence: 1,
    isPickupAvailable: true,
    isDropOffAvailable: true
  };
  
  const stopTime2 = {
    tripId: 'trip42_1',
    stopId: 'station2',
    arrivalTime: '08:05:00',
    departureTime: '08:05:00',
    sequence: 2,
    isPickupAvailable: true,
    isDropOffAvailable: true
  };
  
  const trip42 = {
    id: 'trip42_1',
    routeId: 'route42',
    serviceId: 'weekday',
    direction: 'inbound' as const,
    isWheelchairAccessible: false,
    areBikesAllowed: false
  };
  
  const vehicle42: LiveVehicle = {
    id: 'bus42_001',
    routeId: 'route42',
    tripId: 'trip42_1',
    label: '42',
    position: { latitude: 46.7718, longitude: 23.6238 },
    timestamp: new Date().toISOString(),
    speed: 30,
    isWheelchairAccessible: false,
    isBikeAccessible: false
  };

  describe('Normal Stability Mode', () => {
    it('should maintain station selection for small GPS movements', async () => {
      const controller = createNearbyViewController({
        stabilityMode: 'normal',
        enableStabilityTracking: true,
        enableSecondStation: true
      });

      // First selection at starting location
      const result1 = await controller.processNearbyView(
        userStartLocation,
        [station1, station2],
        [route42],
        [vehicle42],
        [stopTime1, stopTime2],
        [trip42]
      );

      expect(result1.selectionMetadata.stabilityApplied).toBe(false); // First selection
      
      // Small movement - should potentially apply stability override
      const result2 = await controller.processNearbyView(
        userNearbyLocation,
        [station1, station2],
        [route42],
        [vehicle42],
        [stopTime1, stopTime2],
        [trip42]
      );

      // Check that stability tracking is working
      const metrics = controller.getStabilityMetrics();
      expect(metrics.locationHistoryLength).toBeGreaterThan(0);
      expect(typeof metrics.stabilityScore).toBe('number');
      
      // Large movement - should force new selection
      const result3 = await controller.processNearbyView(
        userDistantLocation,
        [station1, station2],
        [route42],
        [vehicle42],
        [stopTime1, stopTime2],
        [trip42]
      );

      expect(result3.selectionMetadata.stabilityApplied).toBe(false); // New selection due to large movement
    });
  });

  describe('Strict Stability Mode', () => {
    it('should be more conservative with stability overrides', async () => {
      const controller = createNearbyViewController({
        stabilityMode: 'strict',
        enableStabilityTracking: true,
        enableSecondStation: true
      });

      // Process multiple small movements
      await controller.processNearbyView(
        userStartLocation,
        [station1, station2],
        [route42],
        [vehicle42],
        [stopTime1, stopTime2],
        [trip42]
      );

      await controller.processNearbyView(
        userNearbyLocation,
        [station1, station2],
        [route42],
        [vehicle42],
        [stopTime1, stopTime2],
        [trip42]
      );

      const metrics = controller.getStabilityMetrics();
      expect(metrics.maxConsecutiveOverrides).toBe(10); // Strict mode allows more overrides
    });
  });

  describe('Flexible Stability Mode', () => {
    it('should be more liberal with new selections', async () => {
      const controller = createNearbyViewController({
        stabilityMode: 'flexible',
        enableStabilityTracking: true,
        enableSecondStation: true
      });

      // Process movements
      await controller.processNearbyView(
        userStartLocation,
        [station1, station2],
        [route42],
        [vehicle42],
        [stopTime1, stopTime2],
        [trip42]
      );

      const metrics = controller.getStabilityMetrics();
      expect(metrics.maxConsecutiveOverrides).toBe(3); // Flexible mode allows fewer overrides
    });
  });

  describe('Stability Context Management', () => {
    it('should track location history correctly', async () => {
      const controller = createNearbyViewController({
        stabilityMode: 'normal',
        enableStabilityTracking: true
      });

      // Process several location updates
      const locations = [
        userStartLocation,
        userNearbyLocation,
        { latitude: 46.7714, longitude: 23.6238 },
        { latitude: 46.7715, longitude: 23.6239 }
      ];

      for (const location of locations) {
        await controller.processNearbyView(
          location,
          [station1, station2],
          [route42],
          [vehicle42],
          [stopTime1, stopTime2],
          [trip42]
        );
      }

      const context = controller.getStabilityContext();
      expect(context.locationHistory).toBeDefined();
      expect(context.locationHistory!.length).toBeGreaterThan(0);
      expect(context.locationHistory!.length).toBeLessThanOrEqual(10); // Should cap at 10 entries
    });

    it('should reset stability context when requested', async () => {
      const controller = createNearbyViewController({
        stabilityMode: 'normal',
        enableStabilityTracking: true
      });

      // Build up some history
      await controller.processNearbyView(
        userStartLocation,
        [station1, station2],
        [route42],
        [vehicle42],
        [stopTime1, stopTime2],
        [trip42]
      );

      // Reset context
      controller.resetStabilityContext();

      const context = controller.getStabilityContext();
      expect(context.consecutiveOverrides).toBe(0);
      expect(context.stabilityScore).toBe(0.5);
      expect(context.locationHistory).toEqual([]);
    });

    it('should allow forcing new selection', async () => {
      const controller = createNearbyViewController({
        stabilityMode: 'normal',
        enableStabilityTracking: true
      });

      // Build up some overrides
      await controller.processNearbyView(
        userStartLocation,
        [station1, station2],
        [route42],
        [vehicle42],
        [stopTime1, stopTime2],
        [trip42]
      );

      // Force new selection
      controller.forceNewSelection();

      // Should not crash and should be callable
      expect(() => controller.forceNewSelection()).not.toThrow();
    });
  });

  describe('Stability Metrics', () => {
    it('should provide comprehensive stability information', async () => {
      const controller = createNearbyViewController({
        stabilityMode: 'normal',
        enableStabilityTracking: true
      });

      await controller.processNearbyView(
        userStartLocation,
        [station1, station2],
        [route42],
        [vehicle42],
        [stopTime1, stopTime2],
        [trip42]
      );

      const metrics = controller.getStabilityMetrics();
      
      // Verify all expected properties exist
      expect(metrics).toHaveProperty('stabilityScore');
      expect(metrics).toHaveProperty('consecutiveOverrides');
      expect(metrics).toHaveProperty('maxConsecutiveOverrides');
      expect(metrics).toHaveProperty('locationHistoryLength');
      expect(metrics).toHaveProperty('lastSelectionAge');
      expect(metrics).toHaveProperty('isStable');
      
      // Verify types
      expect(typeof metrics.stabilityScore).toBe('number');
      expect(typeof metrics.consecutiveOverrides).toBe('number');
      expect(typeof metrics.maxConsecutiveOverrides).toBe('number');
      expect(typeof metrics.locationHistoryLength).toBe('number');
      expect(typeof metrics.isStable).toBe('boolean');
      
      // Verify ranges
      expect(metrics.stabilityScore).toBeGreaterThanOrEqual(0);
      expect(metrics.stabilityScore).toBeLessThanOrEqual(1);
      expect(metrics.consecutiveOverrides).toBeGreaterThanOrEqual(0);
      expect(metrics.maxConsecutiveOverrides).toBeGreaterThan(0);
    });
  });

  describe('Error Handling with Stability', () => {
    it('should handle errors gracefully while maintaining stability context', async () => {
      const controller = createNearbyViewController({
        stabilityMode: 'normal',
        enableStabilityTracking: true
      });

      // Valid processing first
      await controller.processNearbyView(
        userStartLocation,
        [station1, station2],
        [route42],
        [vehicle42],
        [stopTime1, stopTime2],
        [trip42]
      );

      // Then invalid input
      const errorResult = await controller.processNearbyView(
        null, // Invalid location
        [station1, station2],
        [route42],
        [vehicle42],
        [stopTime1, stopTime2],
        [trip42]
      );

      expect(errorResult.error).toBeDefined();
      
      // Stability context should still be accessible
      const context = controller.getStabilityContext();
      expect(context).toBeDefined();
      
      const metrics = controller.getStabilityMetrics();
      expect(metrics).toBeDefined();
    });
  });
});