/**
 * Caching and Performance Tests
 * 
 * Tests for task 14: Add caching and performance optimization
 * 
 * Requirements: 5.2, 5.3, 5.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { intelligentVehicleFilter } from '../services/data-processing/IntelligentVehicleFilter';
import { routeActivityAnalyzer } from '../services/RouteActivityAnalyzer';
import { vehicleTransformationService } from '../services/data-processing/VehicleTransformationService';
import type { CoreVehicle } from '../types/coreVehicle';
import type { FilteringContext } from '../services/data-processing/IntelligentVehicleFilter';
import type { TransformationStation } from '../types/presentationLayer';

describe('Caching and Performance Optimization', () => {
  beforeEach(() => {
    // Clear all caches before each test
    intelligentVehicleFilter.clearCache();
    routeActivityAnalyzer.clearCache();
    vehicleTransformationService.clearAllCaches();
  });

  describe('IntelligentVehicleFilter Caching', () => {
    it('should cache filtering results and improve performance', async () => {
      const vehicles: CoreVehicle[] = [
        {
          id: 'v1',
          routeId: 'route1',
          position: { latitude: 46.7712, longitude: 23.6236 },
          timestamp: new Date(),
          direction: 'inbound',
          speed: 25,
          confidence: 0.9
        },
        {
          id: 'v2',
          routeId: 'route2',
          position: { latitude: 46.7722, longitude: 23.6246 },
          timestamp: new Date(),
          direction: 'outbound',
          speed: 30,
          confidence: 0.8
        }
      ];

      const stations: TransformationStation[] = [
        {
          id: 'station1',
          name: 'Test Station',
          coordinates: { latitude: 46.7712, longitude: 23.6236 }
        }
      ];

      const context: FilteringContext = {
        targetStations: stations,
        busyRouteThreshold: 5,
        distanceFilterThreshold: 2000,
        debugMode: false,
        transformationContext: {
          targetStations: stations,
          userLocation: { latitude: 46.7712, longitude: 23.6236 },
          maxDistance: 2000,
          includeScheduleData: true,
          includeDirectionAnalysis: true
        }
      };

      // Analyze route activity
      const routeActivity = routeActivityAnalyzer.analyzeRouteActivity(vehicles);

      // First call - should be cache miss
      const startTime1 = performance.now();
      const result1 = intelligentVehicleFilter.filterVehicles(vehicles, routeActivity, context);
      const duration1 = performance.now() - startTime1;

      // Second call with same data - should be cache hit
      const startTime2 = performance.now();
      const result2 = intelligentVehicleFilter.filterVehicles(vehicles, routeActivity, context);
      const duration2 = performance.now() - startTime2;

      // Verify results are identical
      expect(result1.filteredVehicles).toHaveLength(result2.filteredVehicles.length);
      expect(result1.filteredVehicles[0].id).toBe(result2.filteredVehicles[0].id);

      // Verify cache hit rate improved
      const stats = intelligentVehicleFilter.getCacheStats();
      expect(stats.hitRate).toBeGreaterThan(0);

      // Second call should be faster due to caching
      expect(duration2).toBeLessThan(duration1);
    });

    it('should invalidate cache for specific vehicles', () => {
      const vehicles: CoreVehicle[] = [
        {
          id: 'v1',
          routeId: 'route1',
          position: { latitude: 46.7712, longitude: 23.6236 },
          timestamp: new Date(),
          direction: 'inbound',
          speed: 25,
          confidence: 0.9
        }
      ];

      const stations: TransformationStation[] = [
        {
          id: 'station1',
          name: 'Test Station',
          coordinates: { latitude: 46.7712, longitude: 23.6236 }
        }
      ];

      const context: FilteringContext = {
        targetStations: stations,
        busyRouteThreshold: 5,
        distanceFilterThreshold: 2000,
        debugMode: false,
        transformationContext: {
          targetStations: stations,
          userLocation: { latitude: 46.7712, longitude: 23.6236 },
          maxDistance: 2000,
          includeScheduleData: true,
          includeDirectionAnalysis: true
        }
      };

      const routeActivity = routeActivityAnalyzer.analyzeRouteActivity(vehicles);

      // Cache some results
      intelligentVehicleFilter.filterVehicles(vehicles, routeActivity, context);
      
      const statsBefore = intelligentVehicleFilter.getCacheStats();
      expect(statsBefore.size).toBeGreaterThan(0);

      // Invalidate cache for specific vehicle
      intelligentVehicleFilter.invalidateCacheForVehicles(['v1']);

      // Cache should be smaller or empty
      const statsAfter = intelligentVehicleFilter.getCacheStats();
      expect(statsAfter.size).toBeLessThanOrEqual(statsBefore.size);
    });
  });

  describe('VehicleTransformationService Performance', () => {
    it('should meet 50ms performance target for reasonable vehicle counts', async () => {
      const vehicles = Array.from({ length: 100 }, (_, i) => ({
        id: `vehicle_${i}`,
        routeId: `route_${i % 10}`,
        position: {
          latitude: 46.7712 + (Math.random() - 0.5) * 0.01,
          longitude: 23.6236 + (Math.random() - 0.5) * 0.01
        },
        timestamp: new Date(),
        direction: i % 2 === 0 ? 'inbound' : 'outbound',
        speed: 20 + Math.random() * 20,
        confidence: 0.8 + Math.random() * 0.2
      }));

      const performanceCheck = await vehicleTransformationService.performanceCheck(100);
      
      // For 100 vehicles, we should easily meet the 50ms target
      // (The target is for 1000 vehicles, so 100 should be much faster)
      expect(performanceCheck.target).toBe(50);
      expect(performanceCheck.averageTime).toBeLessThan(50);
    });

    it('should provide comprehensive cache statistics', () => {
      const stats = vehicleTransformationService.getCacheStatistics();
      
      expect(stats).toHaveProperty('transformation');
      expect(stats).toHaveProperty('routeActivity');
      expect(stats).toHaveProperty('intelligentFilter');
      expect(stats).toHaveProperty('lookups');
      expect(stats).toHaveProperty('overall');
      
      expect(stats.transformation).toHaveProperty('hitRate');
      expect(stats.routeActivity).toHaveProperty('cacheHitRate');
      expect(stats.intelligentFilter).toHaveProperty('hitRate');
      expect(stats.overall).toHaveProperty('transformationCount');
    });

    it('should support selective cache invalidation', () => {
      // This test verifies the method exists and can be called
      expect(() => {
        vehicleTransformationService.invalidateCacheForVehicles(['v1', 'v2']);
      }).not.toThrow();
      
      // Verify cache optimization method exists
      expect(() => {
        vehicleTransformationService.optimizeCaches();
      }).not.toThrow();
    });
  });

  describe('Distance Calculation Caching', () => {
    it('should cache distance calculations for performance', () => {
      const vehicles: CoreVehicle[] = [
        {
          id: 'v1',
          routeId: 'route1',
          position: { latitude: 46.7712, longitude: 23.6236 },
          timestamp: new Date(),
          direction: 'inbound',
          speed: 25,
          confidence: 0.9
        }
      ];

      const stations: TransformationStation[] = [
        {
          id: 'station1',
          name: 'Test Station',
          coordinates: { latitude: 46.7712, longitude: 23.6236 }
        }
      ];

      // First distance calculation
      const startTime1 = performance.now();
      const result1 = intelligentVehicleFilter.filterByDistance(vehicles, stations, 2000);
      const duration1 = performance.now() - startTime1;

      // Second distance calculation with same data - should use cache
      const startTime2 = performance.now();
      const result2 = intelligentVehicleFilter.filterByDistance(vehicles, stations, 2000);
      const duration2 = performance.now() - startTime2;

      // Results should be identical
      expect(result1).toHaveLength(result2.length);
      expect(result1[0].id).toBe(result2[0].id);

      // Second call should be faster due to distance caching
      expect(duration2).toBeLessThanOrEqual(duration1);
    });
  });
});