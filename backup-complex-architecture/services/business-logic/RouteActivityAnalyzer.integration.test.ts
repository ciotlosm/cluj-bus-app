/**
 * Route Activity Analyzer Integration Tests
 * 
 * Integration tests to verify the RouteActivityAnalyzer works correctly
 * with the existing service architecture and can be imported properly.
 */

import { describe, it, expect } from 'vitest';
import {
  RouteActivityAnalyzer,
  routeActivityAnalyzer,
  createRouteActivityAnalyzer,
  RouteClassification,
  DEFAULT_ROUTE_ACTIVITY_CONFIG
} from './RouteActivityAnalyzer';
import type {
  IRouteActivityAnalyzer,
  RouteActivityInfo,
  VehicleDataQuality,
  RouteActivitySnapshot
} from './RouteActivityAnalyzer';
import { createCoreVehicle } from '../types/coreVehicle';

describe('RouteActivityAnalyzer Integration', () => {
  it('should export all required interfaces and classes', () => {
    // Verify class exports
    expect(RouteActivityAnalyzer).toBeDefined();
    expect(typeof RouteActivityAnalyzer).toBe('function');
    
    // Verify singleton export
    expect(routeActivityAnalyzer).toBeDefined();
    expect(routeActivityAnalyzer).toBeInstanceOf(RouteActivityAnalyzer);
    
    // Verify factory function
    expect(createRouteActivityAnalyzer).toBeDefined();
    expect(typeof createRouteActivityAnalyzer).toBe('function');
    
    // Verify enum export
    expect(RouteClassification).toBeDefined();
    expect(RouteClassification.BUSY).toBe('busy');
    expect(RouteClassification.QUIET).toBe('quiet');
    
    // Verify config export
    expect(DEFAULT_ROUTE_ACTIVITY_CONFIG).toBeDefined();
    expect(DEFAULT_ROUTE_ACTIVITY_CONFIG.busyRouteThreshold).toBe(5);
  });
  
  it('should work with CoreVehicle factory function', () => {
    const analyzer = new RouteActivityAnalyzer();
    
    // Create vehicles using the CoreVehicle factory
    const vehicle1 = createCoreVehicle({
      id: 'test-vehicle-1',
      routeId: 'route-42',
      label: 'Bus 42A',
      position: { latitude: 46.7712, longitude: 23.6236 }
    });
    
    const vehicle2 = createCoreVehicle({
      id: 'test-vehicle-2',
      routeId: 'route-42',
      label: 'Bus 42B',
      position: { latitude: 46.7720, longitude: 23.6240 }
    });
    
    const vehicles = [vehicle1, vehicle2];
    
    // Test route activity analysis
    const activities = analyzer.analyzeRouteActivity(vehicles);
    
    expect(activities.size).toBe(1);
    const routeActivity = activities.get('route-42');
    expect(routeActivity).toBeDefined();
    expect(routeActivity!.vehicleCount).toBe(2);
    expect(routeActivity!.classification).toBe(RouteClassification.QUIET);
  });
  
  it('should implement the IRouteActivityAnalyzer interface correctly', () => {
    const analyzer: IRouteActivityAnalyzer = new RouteActivityAnalyzer();
    
    // Verify all interface methods are available
    expect(typeof analyzer.analyzeRouteActivity).toBe('function');
    expect(typeof analyzer.classifyRoute).toBe('function');
    expect(typeof analyzer.getRouteVehicleCount).toBe('function');
    expect(typeof analyzer.validateVehicleData).toBe('function');
    expect(typeof analyzer.filterValidVehicles).toBe('function');
    expect(typeof analyzer.getRouteActivitySnapshot).toBe('function');
    expect(typeof analyzer.clearCache).toBe('function');
    expect(typeof analyzer.getPerformanceMetrics).toBe('function');
  });
  
  it('should work with the singleton instance', () => {
    // Create test vehicle
    const vehicle = createCoreVehicle({
      id: 'singleton-test',
      routeId: 'test-route',
      label: 'Test Bus',
      position: { latitude: 46.7712, longitude: 23.6236 }
    });
    
    // Test with singleton
    const count = routeActivityAnalyzer.getRouteVehicleCount('test-route', [vehicle]);
    expect(count).toBe(1);
    
    const classification = routeActivityAnalyzer.classifyRoute('test-route', 1, 5);
    expect(classification).toBe(RouteClassification.QUIET);
  });
  
  it('should handle real-world vehicle data structure', () => {
    const analyzer = new RouteActivityAnalyzer();
    
    // Create vehicles with all optional fields
    const completeVehicle = createCoreVehicle({
      id: 'complete-vehicle',
      routeId: 'route-1',
      tripId: 'trip-123',
      label: 'Bus 1A',
      position: { 
        latitude: 46.7712, 
        longitude: 23.6236,
        accuracy: 15
      },
      speed: 35,
      bearing: 90,
      isWheelchairAccessible: true,
      isBikeAccessible: false
    });
    
    // Test data quality validation
    const quality = analyzer.validateVehicleData(completeVehicle);
    expect(quality.isPositionValid).toBe(true);
    expect(quality.isTimestampRecent).toBe(true);
    expect(quality.hasRequiredFields).toBe(true);
    expect(quality.stalenessScore).toBeGreaterThan(0.9);
    
    // Test route analysis
    const activities = analyzer.analyzeRouteActivity([completeVehicle]);
    expect(activities.size).toBe(1);
    
    const activity = activities.get('route-1');
    expect(activity).toBeDefined();
    expect(activity!.routeId).toBe('route-1');
    expect(activity!.vehicleCount).toBe(1);
    expect(activity!.validVehicleCount).toBe(1);
  });
  
  it('should provide performance metrics for monitoring', () => {
    const analyzer = new RouteActivityAnalyzer();
    
    // Create multiple vehicles for performance testing
    const vehicles = Array.from({ length: 50 }, (_, i) => 
      createCoreVehicle({
        id: `perf-vehicle-${i}`,
        routeId: `route-${Math.floor(i / 10)}`, // 5 routes with 10 vehicles each
        label: `Bus ${i}`,
        position: { 
          latitude: 46.7712 + (i * 0.001), 
          longitude: 23.6236 + (i * 0.001)
        }
      })
    );
    
    // Analyze performance
    const startTime = performance.now();
    analyzer.analyzeRouteActivity(vehicles);
    const endTime = performance.now();
    
    const metrics = analyzer.getPerformanceMetrics();
    
    expect(metrics.vehiclesProcessed).toBe(50);
    expect(metrics.validVehicles).toBe(50);
    expect(metrics.invalidVehicles).toBe(0);
    expect(metrics.routesAnalyzed).toBe(5);
    expect(metrics.analysisTime).toBeGreaterThan(0);
    expect(metrics.analysisTime).toBeLessThan(100); // Should be fast
    
    // Verify actual performance
    expect(endTime - startTime).toBeLessThan(50); // Should complete within 50ms
  });
});