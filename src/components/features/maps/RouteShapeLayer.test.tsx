/**
 * RouteShapeLayer - Component tests
 * Tests route shape rendering, direction indicators, and color management
 */

import { describe, it, expect } from 'vitest';
import { RouteShapeLayer } from './RouteShapeLayer';
import { DEFAULT_MAP_COLORS } from '../../../types/interactiveMap';
import type { TranzyRouteResponse } from '../../../types/rawTranzyApi';
import type { RouteShape } from '../../../types/arrivalTime';

// Test data
const mockRouteShape: RouteShape = {
  id: '1_0',
  points: [
    { lat: 46.7712, lon: 23.6236 },
    { lat: 46.7722, lon: 23.6246 },
    { lat: 46.7732, lon: 23.6256 },
  ],
  segments: [
    {
      start: { lat: 46.7712, lon: 23.6236 },
      end: { lat: 46.7722, lon: 23.6246 },
      distance: 150,
    },
    {
      start: { lat: 46.7722, lon: 23.6246 },
      end: { lat: 46.7732, lon: 23.6256 },
      distance: 150,
    },
  ],
};

const mockRoute: TranzyRouteResponse = {
  agency_id: 1,
  route_id: 1,
  route_short_name: '24',
  route_long_name: 'Test Route',
  route_color: 'FF6B6B',
  route_type: 3,
  route_desc: 'Test route description',
};

const mockRoutes = new Map([[1, mockRoute]]);
const mockRouteShapes = new Map([['1_0', mockRouteShape]]);

describe('RouteShapeLayer', () => {
  it('should be importable', () => {
    expect(RouteShapeLayer).toBeDefined();
    expect(typeof RouteShapeLayer).toBe('function');
  });

  it('should accept required props', () => {
    const props = {
      routeShapes: mockRouteShapes,
      routes: mockRoutes,
      colorScheme: DEFAULT_MAP_COLORS,
    };
    
    // Should not throw when creating with valid props
    expect(() => RouteShapeLayer(props)).not.toThrow();
  });

  it('should handle empty route shapes', () => {
    const props = {
      routeShapes: new Map(),
      routes: mockRoutes,
      colorScheme: DEFAULT_MAP_COLORS,
    };
    
    expect(() => RouteShapeLayer(props)).not.toThrow();
  });

  it('should handle direction arrows option', () => {
    const props = {
      routeShapes: mockRouteShapes,
      routes: mockRoutes,
      showDirectionArrows: true,
      colorScheme: DEFAULT_MAP_COLORS,
    };
    
    expect(() => RouteShapeLayer(props)).not.toThrow();
  });

  it('should handle highlighted routes', () => {
    const props = {
      routeShapes: mockRouteShapes,
      routes: mockRoutes,
      highlightedRouteIds: [1],
      colorScheme: DEFAULT_MAP_COLORS,
    };
    
    expect(() => RouteShapeLayer(props)).not.toThrow();
  });

  it('should handle route shapes with insufficient points', () => {
    const singlePointShape: RouteShape = {
      id: '2_0',
      points: [{ lat: 46.7712, lon: 23.6236 }],
      segments: [],
    };
    
    const routeShapesWithSinglePoint = new Map([['2_0', singlePointShape]]);
    
    const props = {
      routeShapes: routeShapesWithSinglePoint,
      routes: mockRoutes,
      colorScheme: DEFAULT_MAP_COLORS,
    };
    
    expect(() => RouteShapeLayer(props)).not.toThrow();
  });

  it('should handle optional props', () => {
    const props = {
      routeShapes: mockRouteShapes,
      routes: mockRoutes,
      highlightedRouteIds: [1, 2],
      showDirectionArrows: true,
      colorScheme: DEFAULT_MAP_COLORS,
    };
    
    expect(() => RouteShapeLayer(props)).not.toThrow();
  });
});