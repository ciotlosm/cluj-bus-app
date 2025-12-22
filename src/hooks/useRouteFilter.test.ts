import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useRouteFilter } from './useRouteFilter';
import type { TranzyRouteResponse } from '../types/rawTranzyApi';
import type { RouteFilterState } from '../types/routeFilter';
import { DEFAULT_FILTER_STATE } from '../types/routeFilter';

// Test data
const testRoutes: TranzyRouteResponse[] = [
  {
    agency_id: 1,
    route_id: 1,
    route_short_name: '1',
    route_long_name: 'Regular Bus Route',
    route_color: '#FF0000',
    route_type: 3, // Bus
    route_desc: 'Regular bus route'
  },
  {
    agency_id: 1,
    route_id: 2,
    route_short_name: 'TE1',
    route_long_name: 'Transport Elevi Route',
    route_color: '#00FF00',
    route_type: 3, // Bus
    route_desc: 'Transport Elevi route'
  },
  {
    agency_id: 1,
    route_id: 3,
    route_short_name: 'M1',
    route_long_name: 'External Route',
    route_color: '#0000FF',
    route_type: 0, // Tram
    route_desc: 'External route'
  }
];

describe('useRouteFilter', () => {
  it('should enhance routes with computed attributes', () => {
    const { result } = renderHook(() => 
      useRouteFilter(testRoutes, DEFAULT_FILTER_STATE)
    );

    const { enhancedRoutes } = result.current;

    expect(enhancedRoutes).toHaveLength(3);
    
    // Check regular route
    expect(enhancedRoutes[0]).toMatchObject({
      route_id: 1,
      isElevi: false,
      isExternal: false
    });

    // Check Elevi route
    expect(enhancedRoutes[1]).toMatchObject({
      route_id: 2,
      isElevi: true,
      isExternal: false
    });

    // Check External route
    expect(enhancedRoutes[2]).toMatchObject({
      route_id: 3,
      isElevi: false,
      isExternal: true
    });
  });

  it('should filter routes based on default filter state', () => {
    const { result } = renderHook(() => 
      useRouteFilter(testRoutes, DEFAULT_FILTER_STATE)
    );

    const { filteredRoutes } = result.current;

    // Default state should exclude Elevi and External routes
    expect(filteredRoutes).toHaveLength(1);
    expect(filteredRoutes[0].route_id).toBe(1);
  });

  it('should filter routes by transport type', () => {
    const filterState: RouteFilterState = {
      transportTypes: { bus: true, tram: false, trolleybus: false },
      metaFilters: { elevi: false, external: false }
    };

    const { result } = renderHook(() => 
      useRouteFilter(testRoutes, filterState)
    );

    const { filteredRoutes } = result.current;

    // Should return only regular bus routes (excluding special routes)
    expect(filteredRoutes).toHaveLength(1);
    expect(filteredRoutes[0].route_type).toBe(3);
    expect(filteredRoutes[0].route_id).toBe(1);
  });

  it('should filter routes by meta filters', () => {
    const filterState: RouteFilterState = {
      transportTypes: { bus: false, tram: false, trolleybus: false },
      metaFilters: { elevi: true, external: false }
    };

    const { result } = renderHook(() => 
      useRouteFilter(testRoutes, filterState)
    );

    const { filteredRoutes } = result.current;

    // Should return only Elevi routes
    expect(filteredRoutes).toHaveLength(1);
    expect(filteredRoutes[0].route_id).toBe(2);
    expect(filteredRoutes[0].isElevi).toBe(true);
  });

  it('should handle empty routes array', () => {
    const { result } = renderHook(() => 
      useRouteFilter([], DEFAULT_FILTER_STATE)
    );

    const { enhancedRoutes, filteredRoutes } = result.current;

    expect(enhancedRoutes).toEqual([]);
    expect(filteredRoutes).toEqual([]);
  });

  it('should memoize results when inputs do not change', () => {
    const { result, rerender } = renderHook(
      ({ routes, filterState }) => useRouteFilter(routes, filterState),
      {
        initialProps: {
          routes: testRoutes,
          filterState: DEFAULT_FILTER_STATE
        }
      }
    );

    const firstResult = result.current;

    // Rerender with same props
    rerender({
      routes: testRoutes,
      filterState: DEFAULT_FILTER_STATE
    });

    const secondResult = result.current;

    // Results should be the same object references (memoized)
    expect(firstResult.enhancedRoutes).toBe(secondResult.enhancedRoutes);
    expect(firstResult.filteredRoutes).toBe(secondResult.filteredRoutes);
  });

  it('should recompute when routes change', () => {
    const { result, rerender } = renderHook(
      ({ routes, filterState }) => useRouteFilter(routes, filterState),
      {
        initialProps: {
          routes: testRoutes,
          filterState: DEFAULT_FILTER_STATE
        }
      }
    );

    const firstResult = result.current;

    // Rerender with different routes
    const newRoutes = [...testRoutes, {
      agency_id: 1,
      route_id: 4,
      route_short_name: '4',
      route_long_name: 'New Route',
      route_color: '#FFFF00',
      route_type: 3,
      route_desc: 'New route'
    }];

    rerender({
      routes: newRoutes,
      filterState: DEFAULT_FILTER_STATE
    });

    const secondResult = result.current;

    // Results should be different (recomputed)
    expect(firstResult.enhancedRoutes).not.toBe(secondResult.enhancedRoutes);
    expect(firstResult.filteredRoutes).not.toBe(secondResult.filteredRoutes);
    expect(secondResult.enhancedRoutes).toHaveLength(4);
  });

  it('should recompute when filter state changes', () => {
    const { result, rerender } = renderHook(
      ({ routes, filterState }) => useRouteFilter(routes, filterState),
      {
        initialProps: {
          routes: testRoutes,
          filterState: DEFAULT_FILTER_STATE
        }
      }
    );

    const firstResult = result.current;

    // Rerender with different filter state
    const newFilterState: RouteFilterState = {
      transportTypes: { bus: true, tram: false, trolleybus: false },
      metaFilters: { elevi: false, external: false }
    };

    rerender({
      routes: testRoutes,
      filterState: newFilterState
    });

    const secondResult = result.current;

    // Enhanced routes should be the same (memoized), but filtered routes should change
    expect(firstResult.enhancedRoutes).toBe(secondResult.enhancedRoutes);
    expect(firstResult.filteredRoutes).not.toBe(secondResult.filteredRoutes);
  });
});