/**
 * VehicleLayer - Component tests
 * Tests vehicle marker rendering, coloring strategies, and click handlers
 */

import { describe, it, expect, vi } from 'vitest';
import { VehicleLayer } from './VehicleLayer';
import { VehicleColorStrategy, DEFAULT_MAP_COLORS } from '../../../types/interactiveMap';
import type { TranzyVehicleResponse, TranzyRouteResponse } from '../../../types/rawTranzyApi';

// Test data
const mockVehicle: TranzyVehicleResponse = {
  id: 1,
  label: 'Test Vehicle',
  latitude: 46.7712,
  longitude: 23.6236,
  timestamp: '2023-12-23T14:30:00Z',
  speed: 25,
  route_id: 1,
  trip_id: 'trip_123',
  vehicle_type: 3,
  bike_accessible: 'BIKE_INACCESSIBLE',
  wheelchair_accessible: 'WHEELCHAIR_ACCESSIBLE',
};

const mockRoute: TranzyRouteResponse = {
  agency_id: 1,
  route_id: 1,
  route_short_name: '24',
  route_long_name: 'Test Route',
  route_color: '#FF6B6B',
  route_type: 3,
  route_desc: 'Test route description',
};

const mockRoutes = new Map([[1, mockRoute]]);

describe('VehicleLayer', () => {
  it('should be importable', () => {
    expect(VehicleLayer).toBeDefined();
    expect(typeof VehicleLayer).toBe('function');
  });

  it('should accept required props', () => {
    const props = {
      vehicles: [mockVehicle],
      routes: mockRoutes,
      colorScheme: DEFAULT_MAP_COLORS,
    };
    
    // Should not throw when creating with valid props
    expect(() => VehicleLayer(props)).not.toThrow();
  });

  it('should handle empty vehicles array', () => {
    const props = {
      vehicles: [],
      routes: mockRoutes,
      colorScheme: DEFAULT_MAP_COLORS,
    };
    
    expect(() => VehicleLayer(props)).not.toThrow();
  });

  it('should handle different color strategies', () => {
    const strategies = [
      VehicleColorStrategy.BY_ROUTE,
      VehicleColorStrategy.BY_CONFIDENCE,
      VehicleColorStrategy.UNIFORM,
    ];

    strategies.forEach(strategy => {
      const props = {
        vehicles: [mockVehicle],
        routes: mockRoutes,
        colorStrategy: strategy,
        colorScheme: DEFAULT_MAP_COLORS,
      };
      
      expect(() => VehicleLayer(props)).not.toThrow();
    });
  });

  it('should handle vehicles without route_id', () => {
    const vehicleWithoutRoute = { ...mockVehicle, route_id: null };
    const props = {
      vehicles: [vehicleWithoutRoute],
      routes: mockRoutes,
      colorScheme: DEFAULT_MAP_COLORS,
    };
    
    expect(() => VehicleLayer(props)).not.toThrow();
  });

  it('should handle optional props', () => {
    const props = {
      vehicles: [mockVehicle],
      routes: mockRoutes,
      colorScheme: DEFAULT_MAP_COLORS,
      onVehicleClick: vi.fn(),
      highlightedVehicleId: 1,
    };
    
    expect(() => VehicleLayer(props)).not.toThrow();
  });
});