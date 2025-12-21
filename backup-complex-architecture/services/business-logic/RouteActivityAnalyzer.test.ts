/**
 * Route Activity Analyzer Tests
 * 
 * Tests for the RouteActivityAnalyzer service including vehicle counting,
 * route classification, data quality validation, and caching functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RouteActivityAnalyzer,
  RouteClassification,
  DEFAULT_ROUTE_ACTIVITY_CONFIG,
  createRouteActivityAnalyzer,
  type RouteActivityConfig,
  type VehicleDataQuality
} from './RouteActivityAnalyzer';
import type { CoreVehicle } from '../types/coreVehicle';

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Create a test vehicle with minimal required properties
 */
function createTestVehicle(overrides: Partial<CoreVehicle> = {}): CoreVehicle {
  const now = new Date();
  return {
    id: `vehicle-${Math.random().toString(36).substr(2, 9)}`,
    routeId: 'route-1',
    tripId: 'trip-1',
    label: 'Test Vehicle',
    position: {
      latitude: 46.7712,
      longitude: 23.6236,
      accuracy: 10
    },
    timestamp: now,
    speed: 30,
    bearing: 90,
    isWheelchairAccessible: true,
    isBikeAccessible: false,
    ...overrides
  };
}

/**
 * Create multiple test vehicles for a route
 */
function createVehiclesForRoute(routeId: string, count: number): CoreVehicle[] {
  return Array.from({ length: count }, (_, index) => 
    createTestVehicle({
      id: `vehicle-${routeId}-${index}`,
      routeId,
      label: `${routeId}-${index}`
    })
  );
}

/**
 * Create a stale vehicle (old timestamp)
 */
function createStaleVehicle(ageMinutes: number = 10): CoreVehicle {
  const staleTime = new Date(Date.now() - ageMinutes * 60 * 1000);
  return createTestVehicle({
    id: 'stale-vehicle',
    timestamp: staleTime
  });
}

/**
 * Create an invalid vehicle (bad position)
 */
function createInvalidVehicle(): CoreVehicle {
  return createTestVehicle({
    id: 'invalid-vehicle',
    position: {
      latitude: 999, // Invalid latitude
      longitude: 999, // Invalid longitude
    }
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe('RouteActivityAnalyzer', () => {
  let analyzer: RouteActivityAnalyzer;
  
  beforeEach(() => {
    analyzer = new RouteActivityAnalyzer();
  });
  
  describe('constructor and configuration', () => {
    it('should initialize with default configuration', () => {
      const defaultAnalyzer = new RouteActivityAnalyzer();
      const metrics = defaultAnalyzer.getPerformanceMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.analysisTime).toBe(0);
      expect(metrics.vehiclesProcessed).toBe(0);
    });
    
    it('should accept custom configuration', () => {
      const customConfig: Partial<RouteActivityConfig> = {
        busyRouteThreshold: 10,
        staleDataThresholdMs: 10 * 60 * 1000 // 10 minutes
      };
      
      const customAnalyzer = new RouteActivityAnalyzer(customConfig);
      expect(customAnalyzer).toBeDefined();
    });
    
    it('should create analyzer using factory function', () => {
      const factoryAnalyzer = createRouteActivityAnalyzer({
        busyRouteThreshold: 3
      });
      
      expect(factoryAnalyzer).toBeInstanceOf(RouteActivityAnalyzer);
    });
  });
  
  describe('getRouteVehicleCount', () => {
    it('should count vehicles for a specific route', () => {
      const vehicles = [
        ...createVehiclesForRoute('route-1', 3),
        ...createVehiclesForRoute('route-2', 2)
      ];
      
      const route1Count = analyzer.getRouteVehicleCount('route-1', vehicles);
      const route2Count = analyzer.getRouteVehicleCount('route-2', vehicles);
      
      expect(route1Count).toBe(3);
      expect(route2Count).toBe(2);
    });
    
    it('should return 0 for non-existent route', () => {
      const vehicles = createVehiclesForRoute('route-1', 3);
      const count = analyzer.getRouteVehicleCount('non-existent', vehicles);
      
      expect(count).toBe(0);
    });
    
    it('should exclude invalid vehicles from count', () => {
      const vehicles = [
        ...createVehiclesForRoute('route-1', 2),
        createInvalidVehicle(),
        createStaleVehicle()
      ];
      
      // Set the invalid and stale vehicles to route-1
      vehicles[2].routeId = 'route-1';
      vehicles[3].routeId = 'route-1';
      
      const count = analyzer.getRouteVehicleCount('route-1', vehicles);
      
      // Should only count the 2 valid vehicles
      expect(count).toBe(2);
    });
  });
  
  describe('classifyRoute', () => {
    it('should classify route as BUSY when above threshold', () => {
      const classification = analyzer.classifyRoute('route-1', 6, 5);
      expect(classification).toBe(RouteClassification.BUSY);
    });
    
    it('should classify route as QUIET when at threshold', () => {
      const classification = analyzer.classifyRoute('route-1', 5, 5);
      expect(classification).toBe(RouteClassification.QUIET);
    });
    
    it('should classify route as QUIET when below threshold', () => {
      const classification = analyzer.classifyRoute('route-1', 3, 5);
      expect(classification).toBe(RouteClassification.QUIET);
    });
    
    it('should handle zero vehicles', () => {
      const classification = analyzer.classifyRoute('route-1', 0, 5);
      expect(classification).toBe(RouteClassification.QUIET);
    });
  });
  
  describe('validateVehicleData', () => {
    it('should validate a good vehicle', () => {
      const vehicle = createTestVehicle();
      const quality = analyzer.validateVehicleData(vehicle);
      
      expect(quality.isPositionValid).toBe(true);
      expect(quality.isTimestampRecent).toBe(true);
      expect(quality.hasRequiredFields).toBe(true);
      expect(quality.stalenessScore).toBeGreaterThan(0.9);
    });
    
    it('should detect invalid position', () => {
      const vehicle = createInvalidVehicle();
      const quality = analyzer.validateVehicleData(vehicle);
      
      expect(quality.isPositionValid).toBe(false);
    });
    
    it('should detect stale timestamp', () => {
      const vehicle = createStaleVehicle(10); // 10 minutes old
      const quality = analyzer.validateVehicleData(vehicle);
      
      expect(quality.isTimestampRecent).toBe(false);
      expect(quality.stalenessScore).toBe(0);
    });
    
    it('should detect missing required fields', () => {
      const vehicle = createTestVehicle();
      // Remove required field
      (vehicle as any).id = undefined;
      
      const quality = analyzer.validateVehicleData(vehicle);
      
      expect(quality.hasRequiredFields).toBe(false);
    });
    
    it('should calculate staleness score correctly', () => {
      // Create a vehicle that's 2.5 minutes old (half of 5-minute threshold)
      const halfStaleVehicle = createStaleVehicle(2.5);
      const quality = analyzer.validateVehicleData(halfStaleVehicle);
      
      expect(quality.isTimestampRecent).toBe(true);
      expect(quality.stalenessScore).toBeCloseTo(0.5, 1);
    });
  });
  
  describe('filterValidVehicles', () => {
    it('should filter out invalid vehicles', () => {
      const vehicles = [
        createTestVehicle({ id: 'valid-1' }),
        createTestVehicle({ id: 'valid-2' }),
        createInvalidVehicle(),
        createStaleVehicle()
      ];
      
      const validVehicles = analyzer.filterValidVehicles(vehicles);
      
      expect(validVehicles).toHaveLength(2);
      expect(validVehicles[0].id).toBe('valid-1');
      expect(validVehicles[1].id).toBe('valid-2');
    });
    
    it('should return empty array when all vehicles are invalid', () => {
      const vehicles = [
        createInvalidVehicle(),
        createStaleVehicle()
      ];
      
      const validVehicles = analyzer.filterValidVehicles(vehicles);
      
      expect(validVehicles).toHaveLength(0);
    });
    
    it('should return all vehicles when all are valid', () => {
      const vehicles = [
        createTestVehicle({ id: 'valid-1' }),
        createTestVehicle({ id: 'valid-2' }),
        createTestVehicle({ id: 'valid-3' })
      ];
      
      const validVehicles = analyzer.filterValidVehicles(vehicles);
      
      expect(validVehicles).toHaveLength(3);
    });
  });
  
  describe('analyzeRouteActivity', () => {
    it('should analyze route activity correctly', () => {
      const vehicles = [
        ...createVehiclesForRoute('busy-route', 7), // Above default threshold of 5
        ...createVehiclesForRoute('quiet-route', 3) // Below threshold
      ];
      
      const activities = analyzer.analyzeRouteActivity(vehicles);
      
      expect(activities.size).toBe(2);
      
      const busyActivity = activities.get('busy-route');
      expect(busyActivity).toBeDefined();
      expect(busyActivity!.vehicleCount).toBe(7);
      expect(busyActivity!.classification).toBe(RouteClassification.BUSY);
      
      const quietActivity = activities.get('quiet-route');
      expect(quietActivity).toBeDefined();
      expect(quietActivity!.vehicleCount).toBe(3);
      expect(quietActivity!.classification).toBe(RouteClassification.QUIET);
    });
    
    it('should exclude invalid vehicles from analysis', () => {
      const vehicles = [
        ...createVehiclesForRoute('route-1', 3),
        createInvalidVehicle(),
        createStaleVehicle()
      ];
      
      // Set invalid vehicles to same route
      vehicles[3].routeId = 'route-1';
      vehicles[4].routeId = 'route-1';
      
      const activities = analyzer.analyzeRouteActivity(vehicles);
      
      expect(activities.size).toBe(1);
      const activity = activities.get('route-1');
      expect(activity!.vehicleCount).toBe(3); // Only valid vehicles counted
      expect(activity!.validVehicleCount).toBe(3);
    });
    
    it('should handle empty vehicle array', () => {
      const activities = analyzer.analyzeRouteActivity([]);
      
      expect(activities.size).toBe(0);
    });
    
    it('should update lastUpdated timestamp', () => {
      const vehicles = createVehiclesForRoute('route-1', 2);
      const beforeTime = new Date();
      
      const activities = analyzer.analyzeRouteActivity(vehicles);
      
      const afterTime = new Date();
      const activity = activities.get('route-1');
      
      expect(activity!.lastUpdated.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(activity!.lastUpdated.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });
  
  describe('caching functionality', () => {
    it('should cache analysis results', () => {
      const vehicles = createVehiclesForRoute('route-1', 3);
      
      // First analysis
      const activities1 = analyzer.analyzeRouteActivity(vehicles);
      
      // Second analysis with same vehicles should use cache
      const activities2 = analyzer.analyzeRouteActivity(vehicles);
      
      expect(activities1).toEqual(activities2);
    });
    
    it('should return cached snapshot', () => {
      const vehicles = createVehiclesForRoute('route-1', 3);
      
      // Analyze to create cache
      analyzer.analyzeRouteActivity(vehicles);
      
      const snapshot = analyzer.getRouteActivitySnapshot();
      
      expect(snapshot).toBeDefined();
      expect(snapshot!.totalVehicles).toBe(3);
      expect(snapshot!.routeActivities.size).toBe(1);
    });
    
    it('should clear cache', () => {
      const vehicles = createVehiclesForRoute('route-1', 3);
      
      // Analyze to create cache
      analyzer.analyzeRouteActivity(vehicles);
      
      // Verify cache exists
      expect(analyzer.getRouteActivitySnapshot()).toBeDefined();
      
      // Clear cache
      analyzer.clearCache();
      
      // Verify cache is cleared
      expect(analyzer.getRouteActivitySnapshot()).toBeNull();
    });
  });
  
  describe('performance metrics', () => {
    it('should track performance metrics', () => {
      const vehicles = createVehiclesForRoute('route-1', 5);
      
      analyzer.analyzeRouteActivity(vehicles);
      
      const metrics = analyzer.getPerformanceMetrics();
      
      expect(metrics.vehiclesProcessed).toBe(5);
      expect(metrics.validVehicles).toBe(5);
      expect(metrics.invalidVehicles).toBe(0);
      expect(metrics.routesAnalyzed).toBe(1);
      expect(metrics.analysisTime).toBeGreaterThan(0);
    });
    
    it('should track invalid vehicles in metrics', () => {
      const vehicles = [
        ...createVehiclesForRoute('route-1', 2),
        createInvalidVehicle(),
        createStaleVehicle()
      ];
      
      analyzer.analyzeRouteActivity(vehicles);
      
      const metrics = analyzer.getPerformanceMetrics();
      
      expect(metrics.vehiclesProcessed).toBe(4);
      expect(metrics.validVehicles).toBe(2);
      expect(metrics.invalidVehicles).toBe(2);
    });
  });
  
  describe('edge cases', () => {
    it('should handle vehicles with same route ID', () => {
      const vehicles = [
        createTestVehicle({ id: 'v1', routeId: 'same-route' }),
        createTestVehicle({ id: 'v2', routeId: 'same-route' }),
        createTestVehicle({ id: 'v3', routeId: 'same-route' })
      ];
      
      const activities = analyzer.analyzeRouteActivity(vehicles);
      
      expect(activities.size).toBe(1);
      expect(activities.get('same-route')!.vehicleCount).toBe(3);
    });
    
    it('should handle vehicles with undefined optional fields', () => {
      const vehicle = createTestVehicle({
        speed: undefined,
        bearing: undefined,
        tripId: undefined
      });
      
      const quality = analyzer.validateVehicleData(vehicle);
      
      expect(quality.hasRequiredFields).toBe(true);
      expect(quality.isPositionValid).toBe(true);
    });
    
    it('should handle very large vehicle arrays', () => {
      // Create 1000 vehicles across 10 routes
      const vehicles: CoreVehicle[] = [];
      for (let i = 0; i < 10; i++) {
        vehicles.push(...createVehiclesForRoute(`route-${i}`, 100));
      }
      
      const startTime = performance.now();
      const activities = analyzer.analyzeRouteActivity(vehicles);
      const endTime = performance.now();
      
      expect(activities.size).toBe(10);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      
      const metrics = analyzer.getPerformanceMetrics();
      expect(metrics.vehiclesProcessed).toBe(1000);
    });
  });
});