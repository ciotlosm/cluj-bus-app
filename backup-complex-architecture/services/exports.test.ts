/**
 * Services Export Tests
 * 
 * Tests to verify that all services can be imported correctly from the index.
 */

import { describe, it, expect } from 'vitest';

describe('Services Exports', () => {
  it('should export RouteActivityAnalyzer from services index', async () => {
    const servicesModule = await import('./index');
    
    // Verify RouteActivityAnalyzer exports
    expect(servicesModule.RouteActivityAnalyzer).toBeDefined();
    expect(servicesModule.routeActivityAnalyzer).toBeDefined();
    expect(servicesModule.createRouteActivityAnalyzer).toBeDefined();
    expect(servicesModule.RouteClassification).toBeDefined();
    expect(servicesModule.DEFAULT_ROUTE_ACTIVITY_CONFIG).toBeDefined();
    
    // Verify the singleton is an instance of the class
    expect(servicesModule.routeActivityAnalyzer).toBeInstanceOf(servicesModule.RouteActivityAnalyzer);
    
    // Verify factory function works
    const customAnalyzer = servicesModule.createRouteActivityAnalyzer({ busyRouteThreshold: 10 });
    expect(customAnalyzer).toBeInstanceOf(servicesModule.RouteActivityAnalyzer);
  });
  
  it('should export all existing services', async () => {
    const servicesModule = await import('./index');
    
    // Verify existing service exports still work
    expect(servicesModule.VehicleTransformationService).toBeDefined();
    expect(servicesModule.vehicleTransformationService).toBeDefined();
    expect(servicesModule.StationSelector).toBeDefined();
    expect(servicesModule.stationSelector).toBeDefined();
  });
});