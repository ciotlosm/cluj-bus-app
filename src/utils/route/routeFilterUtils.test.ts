// Route Filtering Utilities Tests
// Tests for transport type and meta filter logic with edge cases

import { describe, it, expect } from 'vitest';
import type { EnhancedRoute, RouteFilterState } from '../../types/routeFilter';
import { DEFAULT_FILTER_STATE } from '../../types/routeFilter';
import {
  filterRoutes,
  filterRoutesByTransportType,
  filterRoutesByMetaFilters,
  hasActiveMetaFilters,
  getFilteredRouteCount,
  isValidFilterState
} from './routeFilterUtils';

// Test data setup
const createTestRoute = (
  id: number,
  routeType: number,
  shortName: string = `Route${id}`,
  desc: string = `Description${id}`,
  isElevi: boolean = false,
  isExternal: boolean = false
): EnhancedRoute => ({
  agency_id: 1,
  route_id: id,
  route_short_name: shortName,
  route_long_name: `Long Name ${id}`,
  route_color: '#FF0000',
  route_type: routeType,
  route_desc: desc,
  isElevi,
  isExternal
});

const testRoutes: EnhancedRoute[] = [
  createTestRoute(1, 3, 'B1', 'Bus Route 1'), // Regular bus
  createTestRoute(2, 0, 'T1', 'Tram Route 1'), // Regular tram
  createTestRoute(3, 11, 'TR1', 'Trolleybus Route 1'), // Regular trolleybus
  createTestRoute(4, 3, 'TE1', 'Transport Elevi Bus', true, false), // Elevi bus
  createTestRoute(5, 0, 'TE2', 'Transport Elevi Tram', true, false), // Elevi tram
  createTestRoute(6, 3, 'M1', 'External Bus', false, true), // External bus
  createTestRoute(7, 0, 'M2', 'External Tram', false, true), // External tram
];

describe('filterRoutes', () => {
  it('should return all regular routes with default filter state', () => {
    const result = filterRoutes(testRoutes, DEFAULT_FILTER_STATE);
    
    // Should exclude Elevi and External routes by default
    expect(result).toHaveLength(3);
    expect(result.map(r => r.route_id)).toEqual([1, 2, 3]);
  });

  it('should filter by transport type - bus only', () => {
    const filterState: RouteFilterState = {
      transportType: 'bus',
      metaFilters: { elevi: false, external: false }
    };
    
    const result = filterRoutes(testRoutes, filterState);
    
    // Should return only regular bus (route_type = 3), excluding special routes
    expect(result).toHaveLength(1);
    expect(result[0].route_id).toBe(1);
    expect(result[0].route_type).toBe(3);
  });

  it('should filter by transport type - tram only', () => {
    const filterState: RouteFilterState = {
      transportType: 'tram',
      metaFilters: { elevi: false, external: false }
    };
    
    const result = filterRoutes(testRoutes, filterState);
    
    // Should return only regular tram (route_type = 0), excluding special routes
    expect(result).toHaveLength(1);
    expect(result[0].route_id).toBe(2);
    expect(result[0].route_type).toBe(0);
  });

  it('should filter by transport type - trolleybus only', () => {
    const filterState: RouteFilterState = {
      transportType: 'trolleybus',
      metaFilters: { elevi: false, external: false }
    };
    
    const result = filterRoutes(testRoutes, filterState);
    
    // Should return only regular trolleybus (route_type = 11), excluding special routes
    expect(result).toHaveLength(1);
    expect(result[0].route_id).toBe(3);
    expect(result[0].route_type).toBe(11);
  });

  it('should filter by Elevi meta filter', () => {
    const filterState: RouteFilterState = {
      transportType: 'all',
      metaFilters: { elevi: true, external: false }
    };
    
    const result = filterRoutes(testRoutes, filterState);
    
    // Should return only Elevi routes
    expect(result).toHaveLength(2);
    expect(result.map(r => r.route_id)).toEqual([4, 5]);
    expect(result.every(r => r.isElevi)).toBe(true);
  });

  it('should filter by External meta filter', () => {
    const filterState: RouteFilterState = {
      transportType: 'all',
      metaFilters: { elevi: false, external: true }
    };
    
    const result = filterRoutes(testRoutes, filterState);
    
    // Should return only External routes
    expect(result).toHaveLength(2);
    expect(result.map(r => r.route_id)).toEqual([6, 7]);
    expect(result.every(r => r.isExternal)).toBe(true);
  });

  it('should combine transport type and meta filter (AND logic)', () => {
    const filterState: RouteFilterState = {
      transportType: 'bus',
      metaFilters: { elevi: true, external: false }
    };
    
    const result = filterRoutes(testRoutes, filterState);
    
    // Should return only Elevi buses
    expect(result).toHaveLength(1);
    expect(result[0].route_id).toBe(4);
    expect(result[0].route_type).toBe(3);
    expect(result[0].isElevi).toBe(true);
  });

  it('should handle empty routes array', () => {
    const result = filterRoutes([], DEFAULT_FILTER_STATE);
    expect(result).toEqual([]);
  });

  it('should handle invalid routes array', () => {
    const result = filterRoutes(null as any, DEFAULT_FILTER_STATE);
    expect(result).toEqual([]);
  });
});

describe('filterRoutesByTransportType', () => {
  it('should return all routes when transport type is "all"', () => {
    const result = filterRoutesByTransportType(testRoutes, 'all');
    expect(result).toHaveLength(7);
  });

  it('should filter by bus transport type', () => {
    const result = filterRoutesByTransportType(testRoutes, 'bus');
    
    // Should return all buses (including special ones)
    expect(result).toHaveLength(3);
    expect(result.every(r => r.route_type === 3)).toBe(true);
  });

  it('should filter by tram transport type', () => {
    const result = filterRoutesByTransportType(testRoutes, 'tram');
    
    // Should return all trams (including special ones)
    expect(result).toHaveLength(3);
    expect(result.every(r => r.route_type === 0)).toBe(true);
  });

  it('should filter by trolleybus transport type', () => {
    const result = filterRoutesByTransportType(testRoutes, 'trolleybus');
    
    // Should return all trolleybuses
    expect(result).toHaveLength(1);
    expect(result.every(r => r.route_type === 11)).toBe(true);
  });
});

describe('filterRoutesByMetaFilters', () => {
  it('should exclude special routes when no meta filters active', () => {
    const result = filterRoutesByMetaFilters(testRoutes, false, false);
    
    // Should exclude Elevi and External routes
    expect(result).toHaveLength(3);
    expect(result.map(r => r.route_id)).toEqual([1, 2, 3]);
  });

  it('should show only Elevi routes when Elevi filter active', () => {
    const result = filterRoutesByMetaFilters(testRoutes, true, false);
    
    expect(result).toHaveLength(2);
    expect(result.every(r => r.isElevi)).toBe(true);
  });

  it('should show only External routes when External filter active', () => {
    const result = filterRoutesByMetaFilters(testRoutes, false, true);
    
    expect(result).toHaveLength(2);
    expect(result.every(r => r.isExternal)).toBe(true);
  });
});

describe('hasActiveMetaFilters', () => {
  it('should return false for default filter state', () => {
    expect(hasActiveMetaFilters(DEFAULT_FILTER_STATE)).toBe(false);
  });

  it('should return true when Elevi filter is active', () => {
    const filterState: RouteFilterState = {
      transportType: 'all',
      metaFilters: { elevi: true, external: false }
    };
    
    expect(hasActiveMetaFilters(filterState)).toBe(true);
  });

  it('should return true when External filter is active', () => {
    const filterState: RouteFilterState = {
      transportType: 'all',
      metaFilters: { elevi: false, external: true }
    };
    
    expect(hasActiveMetaFilters(filterState)).toBe(true);
  });
});

describe('getFilteredRouteCount', () => {
  it('should return correct count for default filter', () => {
    const count = getFilteredRouteCount(testRoutes, DEFAULT_FILTER_STATE);
    expect(count).toBe(3); // Only regular routes
  });

  it('should return correct count for Elevi filter', () => {
    const filterState: RouteFilterState = {
      transportType: 'all',
      metaFilters: { elevi: true, external: false }
    };
    
    const count = getFilteredRouteCount(testRoutes, filterState);
    expect(count).toBe(2); // Only Elevi routes
  });
});

describe('isValidFilterState', () => {
  it('should validate correct filter state', () => {
    expect(isValidFilterState(DEFAULT_FILTER_STATE)).toBe(true);
  });

  it('should reject null or undefined', () => {
    expect(isValidFilterState(null)).toBe(false);
    expect(isValidFilterState(undefined)).toBe(false);
  });

  it('should reject invalid transport type', () => {
    const invalidState = {
      transportType: 'invalid',
      metaFilters: { elevi: false, external: false }
    };
    
    expect(isValidFilterState(invalidState)).toBe(false);
  });

  it('should reject missing metaFilters', () => {
    const invalidState = {
      transportType: 'all'
    };
    
    expect(isValidFilterState(invalidState)).toBe(false);
  });

  it('should reject invalid metaFilters structure', () => {
    const invalidState = {
      transportType: 'all',
      metaFilters: { elevi: 'true', external: false }
    };
    
    expect(isValidFilterState(invalidState)).toBe(false);
  });
});