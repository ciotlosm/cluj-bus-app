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
  isExternal: boolean = false,
  isFavorite: boolean = false
): EnhancedRoute => ({
  agency_id: 1,
  route_id: id,
  route_short_name: shortName,
  route_long_name: `Long Name ${id}`,
  route_color: '#FF0000',
  route_type: routeType,
  route_desc: desc,
  isElevi,
  isExternal,
  isFavorite
});

const testRoutes: EnhancedRoute[] = [
  createTestRoute(1, 3, 'B1', 'Bus Route 1'), // Regular bus
  createTestRoute(2, 0, 'T1', 'Tram Route 1'), // Regular tram
  createTestRoute(3, 11, 'TR1', 'Trolleybus Route 1'), // Regular trolleybus
  createTestRoute(4, 3, 'TE1', 'Transport Elevi Bus', true, false), // Elevi bus
  createTestRoute(5, 0, 'TE2', 'Transport Elevi Tram', true, false), // Elevi tram
  createTestRoute(6, 3, 'M1', 'External Bus', false, true), // External bus
  createTestRoute(7, 0, 'M2', 'External Tram', false, true), // External tram
  createTestRoute(8, 3, 'B2', 'Favorite Bus Route', false, false, true), // Favorite bus
  createTestRoute(9, 0, 'T2', 'Favorite Tram Route', false, false, true), // Favorite tram
];

describe('filterRoutes', () => {
  it('should return all regular routes with default filter state', () => {
    const result = filterRoutes(testRoutes, DEFAULT_FILTER_STATE);
    
    // Should exclude Elevi and External routes by default, include favorites
    expect(result).toHaveLength(5); // Routes 1, 2, 3, 8, 9
    expect(result.map(r => r.route_id)).toEqual([1, 2, 3, 8, 9]);
  });

  it('should filter by transport type - bus only', () => {
    const filterState: RouteFilterState = {
      transportTypes: { bus: true, tram: false, trolleybus: false },
      metaFilters: { elevi: false, external: false, favorites: false }
    };
    
    const result = filterRoutes(testRoutes, filterState);
    
    // Should return regular buses (route_type = 3), excluding special routes, including favorites
    expect(result).toHaveLength(2); // Routes 1 and 8 (regular bus and favorite bus)
    expect(result.map(r => r.route_id)).toEqual([1, 8]);
    expect(result.every(r => r.route_type === 3)).toBe(true);
  });

  it('should filter by transport type - tram only', () => {
    const filterState: RouteFilterState = {
      transportTypes: { bus: false, tram: true, trolleybus: false },
      metaFilters: { elevi: false, external: false, favorites: false }
    };
    
    const result = filterRoutes(testRoutes, filterState);
    
    // Should return regular trams (route_type = 0), excluding special routes, including favorites
    expect(result).toHaveLength(2); // Routes 2 and 9 (regular tram and favorite tram)
    expect(result.map(r => r.route_id)).toEqual([2, 9]);
    expect(result.every(r => r.route_type === 0)).toBe(true);
  });

  it('should filter by transport type - trolleybus only', () => {
    const filterState: RouteFilterState = {
      transportTypes: { bus: false, tram: false, trolleybus: true },
      metaFilters: { elevi: false, external: false, favorites: false }
    };
    
    const result = filterRoutes(testRoutes, filterState);
    
    // Should return only regular trolleybus (route_type = 11), excluding special routes
    expect(result).toHaveLength(1);
    expect(result[0].route_id).toBe(3);
    expect(result[0].route_type).toBe(11);
  });

  it('should filter by Elevi meta filter', () => {
    const filterState: RouteFilterState = {
      transportTypes: { bus: false, tram: false, trolleybus: false },
      metaFilters: { elevi: true, external: false, favorites: false }
    };
    
    const result = filterRoutes(testRoutes, filterState);
    
    // Should return only Elevi routes
    expect(result).toHaveLength(2);
    expect(result.map(r => r.route_id)).toEqual([4, 5]);
    expect(result.every(r => r.isElevi)).toBe(true);
  });

  it('should filter by External meta filter', () => {
    const filterState: RouteFilterState = {
      transportTypes: { bus: false, tram: false, trolleybus: false },
      metaFilters: { elevi: false, external: true, favorites: false }
    };
    
    const result = filterRoutes(testRoutes, filterState);
    
    // Should return only External routes
    expect(result).toHaveLength(2);
    expect(result.map(r => r.route_id)).toEqual([6, 7]);
    expect(result.every(r => r.isExternal)).toBe(true);
  });

  it('should combine transport type and meta filter (AND logic)', () => {
    const filterState: RouteFilterState = {
      transportTypes: { bus: true, tram: false, trolleybus: false },
      metaFilters: { elevi: true, external: false, favorites: false }
    };
    
    const result = filterRoutes(testRoutes, filterState);
    
    // Should return only Elevi buses
    expect(result).toHaveLength(1);
    expect(result[0].route_id).toBe(4);
    expect(result[0].route_type).toBe(3);
    expect(result[0].isElevi).toBe(true);
  });

  it('should filter by favorites meta filter', () => {
    const filterState: RouteFilterState = {
      transportTypes: { bus: false, tram: false, trolleybus: false },
      metaFilters: { elevi: false, external: false, favorites: true }
    };
    
    const result = filterRoutes(testRoutes, filterState);
    
    // Should return only favorite routes
    expect(result).toHaveLength(2);
    expect(result.map(r => r.route_id)).toEqual([8, 9]);
    expect(result.every(r => r.isFavorite)).toBe(true);
  });

  it('should combine favorites filter with transport type filter', () => {
    const filterState: RouteFilterState = {
      transportTypes: { bus: true, tram: false, trolleybus: false },
      metaFilters: { elevi: false, external: false, favorites: true }
    };
    
    const result = filterRoutes(testRoutes, filterState);
    
    // Should return only favorite buses
    expect(result).toHaveLength(1);
    expect(result[0].route_id).toBe(8);
    expect(result[0].route_type).toBe(3);
    expect(result[0].isFavorite).toBe(true);
  });

  it('should return empty result when favorites filter active but no favorites exist', () => {
    // Create test routes without favorites
    const routesWithoutFavorites = testRoutes.filter(r => !r.isFavorite);
    
    const filterState: RouteFilterState = {
      transportTypes: { bus: false, tram: false, trolleybus: false },
      metaFilters: { elevi: false, external: false, favorites: true }
    };
    
    const result = filterRoutes(routesWithoutFavorites, filterState);
    
    // Should return empty array when no favorites exist
    expect(result).toHaveLength(0);
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
  it('should return all routes when no transport types are selected', () => {
    const transportTypes = { bus: false, tram: false, trolleybus: false };
    const result = filterRoutesByTransportType(testRoutes, transportTypes);
    expect(result).toHaveLength(9);
  });

  it('should filter by bus transport type', () => {
    const transportTypes = { bus: true, tram: false, trolleybus: false };
    const result = filterRoutesByTransportType(testRoutes, transportTypes);
    
    // Should return all buses (including special ones)
    expect(result).toHaveLength(4); // Routes 1, 4, 6, 8
    expect(result.every(r => r.route_type === 3)).toBe(true);
  });

  it('should filter by tram transport type', () => {
    const transportTypes = { bus: false, tram: true, trolleybus: false };
    const result = filterRoutesByTransportType(testRoutes, transportTypes);
    
    // Should return all trams (including special ones)
    expect(result).toHaveLength(4); // Routes 2, 5, 7, 9
    expect(result.every(r => r.route_type === 0)).toBe(true);
  });

  it('should filter by trolleybus transport type', () => {
    const transportTypes = { bus: false, tram: false, trolleybus: true };
    const result = filterRoutesByTransportType(testRoutes, transportTypes);
    
    // Should return all trolleybuses
    expect(result).toHaveLength(1);
    expect(result.every(r => r.route_type === 11)).toBe(true);
  });
});

describe('filterRoutesByMetaFilters', () => {
  it('should exclude special routes when no meta filters active', () => {
    const result = filterRoutesByMetaFilters(testRoutes, false, false);
    
    // Should exclude Elevi and External routes, include favorites
    expect(result).toHaveLength(5); // Routes 1, 2, 3, 8, 9
    expect(result.map(r => r.route_id)).toEqual([1, 2, 3, 8, 9]);
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

  it('should show only favorite routes when favorites filter active', () => {
    const result = filterRoutesByMetaFilters(testRoutes, false, false, true);
    
    expect(result).toHaveLength(2); // Routes 8, 9
    expect(result.every(r => r.isFavorite)).toBe(true);
    expect(result.map(r => r.route_id)).toEqual([8, 9]);
  });
});

describe('hasActiveMetaFilters', () => {
  it('should return false for default filter state', () => {
    expect(hasActiveMetaFilters(DEFAULT_FILTER_STATE)).toBe(false);
  });

  it('should return true when Elevi filter is active', () => {
    const filterState: RouteFilterState = {
      transportTypes: { bus: false, tram: false, trolleybus: false },
      metaFilters: { elevi: true, external: false, favorites: false }
    };
    
    expect(hasActiveMetaFilters(filterState)).toBe(true);
  });

  it('should return true when External filter is active', () => {
    const filterState: RouteFilterState = {
      transportTypes: { bus: false, tram: false, trolleybus: false },
      metaFilters: { elevi: false, external: true, favorites: false }
    };
    
    expect(hasActiveMetaFilters(filterState)).toBe(true);
  });

  it('should return true when Favorites filter is active', () => {
    const filterState: RouteFilterState = {
      transportTypes: { bus: false, tram: false, trolleybus: false },
      metaFilters: { elevi: false, external: false, favorites: true }
    };
    
    expect(hasActiveMetaFilters(filterState)).toBe(true);
  });
});

describe('getFilteredRouteCount', () => {
  it('should return correct count for default filter', () => {
    const count = getFilteredRouteCount(testRoutes, DEFAULT_FILTER_STATE);
    expect(count).toBe(5); // Regular routes including favorites
  });

  it('should return correct count for Elevi filter', () => {
    const filterState: RouteFilterState = {
      transportTypes: { bus: false, tram: false, trolleybus: false },
      metaFilters: { elevi: true, external: false, favorites: false }
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