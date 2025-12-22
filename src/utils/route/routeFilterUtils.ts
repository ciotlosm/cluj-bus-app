// Route Filtering Utilities
// Implements filtering logic for transport type and meta filter constraints
// Handles combined filter logic with AND constraints and default exclusions

import type { EnhancedRoute, RouteFilterState } from '../../types/routeFilter';
import { TRANSPORT_TYPE_MAP } from '../../types/routeFilter';

/**
 * Filter enhanced routes based on the provided filter state
 * Implements combined filter logic with transport type and meta filter constraints
 * 
 * Requirements addressed:
 * - 5.1: Combined filter logic (AND constraints)
 * - 5.2: Default exclusion of special routes when no meta filters active
 * - 5.5: Exclude routes with isElevi=true OR isExternal=true by default
 * - 3.1: Favorites filter isolation (show only favorites when active)
 * - 3.2: Combined filter logic with favorites (AND operation)
 * - 3.3: Empty favorites filter handling
 * 
 * @param routes - Array of enhanced routes to filter
 * @param filterState - Current filter state with transport types and meta filters
 * @returns Array of routes matching the filter criteria
 */
export function filterRoutes(
  routes: EnhancedRoute[], 
  filterState: RouteFilterState
): EnhancedRoute[] {
  // Handle edge case: empty or invalid routes array
  if (!Array.isArray(routes)) {
    return [];
  }

  return routes.filter(route => {
    // Step 1: Apply meta filter constraints
    const { elevi, external, favorites } = filterState.metaFilters;
    
    // If Favorites meta filter is active, only show favorite routes
    if (favorites && !route.isFavorite) {
      return false;
    }
    
    // If Elevi meta filter is active, only show Elevi routes
    if (elevi && !route.isElevi) {
      return false;
    }
    
    // If External meta filter is active, only show External routes
    if (external && !route.isExternal) {
      return false;
    }
    
    // Step 2: If no meta filters are active, exclude special routes by default
    // This implements the default exclusion behavior (Requirements 5.2, 5.5)
    // Note: favorites filter doesn't affect default exclusion behavior
    if (!elevi && !external) {
      if (route.isElevi || route.isExternal) {
        return false;
      }
    }
    
    // Step 3: Apply transport type filter
    // If no transport types are selected, show all transport types
    const { bus, tram, trolleybus } = filterState.transportTypes;
    const hasActiveTransportFilters = bus || tram || trolleybus;
    
    if (hasActiveTransportFilters) {
      // Check if route matches any of the selected transport types
      const routeTypeMatches = (
        (bus && route.route_type === TRANSPORT_TYPE_MAP.bus) ||
        (tram && route.route_type === TRANSPORT_TYPE_MAP.tram) ||
        (trolleybus && route.route_type === TRANSPORT_TYPE_MAP.trolleybus)
      );
      
      if (!routeTypeMatches) {
        return false;
      }
    }
    
    // Route passes all filter constraints
    return true;
  });
}

/**
 * Filter routes by transport types only
 * Utility function for transport type filtering without meta filters
 * 
 * @param routes - Array of enhanced routes to filter
 * @param transportTypes - Transport type filters object
 * @returns Array of routes matching the selected transport types
 */
export function filterRoutesByTransportType(
  routes: EnhancedRoute[], 
  transportTypes: { bus: boolean; tram: boolean; trolleybus: boolean }
): EnhancedRoute[] {
  if (!Array.isArray(routes)) {
    return [];
  }

  // If no transport types are selected, return all routes
  const { bus, tram, trolleybus } = transportTypes;
  const hasActiveTransportFilters = bus || tram || trolleybus;
  
  if (!hasActiveTransportFilters) {
    return routes;
  }

  return routes.filter(route => {
    return (
      (bus && route.route_type === TRANSPORT_TYPE_MAP.bus) ||
      (tram && route.route_type === TRANSPORT_TYPE_MAP.tram) ||
      (trolleybus && route.route_type === TRANSPORT_TYPE_MAP.trolleybus)
    );
  });
}

/**
 * Filter routes by meta filters only
 * Utility function for meta filter constraints without transport type filtering
 * 
 * @param routes - Array of enhanced routes to filter
 * @param elevi - Whether to show only Elevi routes
 * @param external - Whether to show only External routes
 * @param favorites - Whether to show only favorite routes
 * @returns Array of routes matching the meta filter criteria
 */
export function filterRoutesByMetaFilters(
  routes: EnhancedRoute[], 
  elevi: boolean, 
  external: boolean,
  favorites: boolean = false
): EnhancedRoute[] {
  if (!Array.isArray(routes)) {
    return [];
  }

  return routes.filter(route => {
    // If Favorites filter is active, only show favorite routes
    if (favorites && !route.isFavorite) {
      return false;
    }
    
    // If Elevi filter is active, only show Elevi routes
    if (elevi && !route.isElevi) {
      return false;
    }
    
    // If External filter is active, only show External routes
    if (external && !route.isExternal) {
      return false;
    }
    
    // If no meta filters are active, exclude special routes by default
    // Note: favorites filter doesn't affect default exclusion behavior
    if (!elevi && !external) {
      if (route.isElevi || route.isExternal) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Check if any transport type filters are active in the filter state
 * Utility function to determine if transport type filtering should be applied
 * 
 * @param filterState - Current filter state
 * @returns True if any transport type filter is active, false otherwise
 */
export function hasActiveTransportFilters(filterState: RouteFilterState): boolean {
  const { bus, tram, trolleybus } = filterState.transportTypes;
  return bus || tram || trolleybus;
}

/**
 * Check if any meta filters are active in the filter state
 * Utility function to determine if meta filter logic should be applied
 * 
 * @param filterState - Current filter state
 * @returns True if any meta filter is active, false otherwise
 */
export function hasActiveMetaFilters(filterState: RouteFilterState): boolean {
  return filterState.metaFilters.elevi || filterState.metaFilters.external || filterState.metaFilters.favorites;
}

/**
 * Get the count of routes that would be returned by the filter
 * Utility function for displaying filter result counts without computing the full result
 * 
 * @param routes - Array of enhanced routes to count
 * @param filterState - Current filter state
 * @returns Number of routes that match the filter criteria
 */
export function getFilteredRouteCount(
  routes: EnhancedRoute[], 
  filterState: RouteFilterState
): number {
  return filterRoutes(routes, filterState).length;
}

/**
 * Validate filter state structure
 * Ensures the filter state has the expected structure and valid values
 * 
 * @param filterState - Filter state to validate
 * @returns True if filter state is valid, false otherwise
 */
export function isValidFilterState(filterState: any): filterState is RouteFilterState {
  if (!filterState || typeof filterState !== 'object') {
    return false;
  }
  
  // Check transport types structure
  if (!filterState.transportTypes || typeof filterState.transportTypes !== 'object') {
    return false;
  }
  
  const { bus, tram, trolleybus } = filterState.transportTypes;
  if (typeof bus !== 'boolean' || typeof tram !== 'boolean' || typeof trolleybus !== 'boolean') {
    return false;
  }
  
  // Check meta filters structure
  if (!filterState.metaFilters || typeof filterState.metaFilters !== 'object') {
    return false;
  }
  
  if (typeof filterState.metaFilters.elevi !== 'boolean' || 
      typeof filterState.metaFilters.external !== 'boolean' ||
      typeof filterState.metaFilters.favorites !== 'boolean') {
    return false;
  }
  
  return true;
}