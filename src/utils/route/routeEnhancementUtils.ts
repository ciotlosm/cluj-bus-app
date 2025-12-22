// Route Enhancement Utilities
// Computes additional attributes for routes to support filtering functionality
// Handles edge cases for missing or malformed route data

import type { TranzyRouteResponse } from '../../types/rawTranzyApi';
import type { EnhancedRoute } from '../../types/routeFilter';

/**
 * Enhance a single route with computed attributes
 * Computes isElevi and isExternal flags based on route naming patterns
 * 
 * @param route - Raw route data from Tranzy API
 * @returns Enhanced route with computed attributes
 */
export function enhanceRoute(route: TranzyRouteResponse): EnhancedRoute {
  // Handle edge cases for missing or null fields
  const routeShortName = route.route_short_name || '';
  const routeDesc = route.route_desc || '';
  
  // Compute isElevi: route_short_name OR route_desc starts with "TE"
  const isElevi = routeShortName.startsWith('TE') || routeDesc.startsWith('TE');
  
  // Compute isExternal: route_short_name starts with "M"
  const isExternal = routeShortName.startsWith('M');
  
  return {
    ...route,
    isElevi,
    isExternal
  };
}

/**
 * Enhance an array of routes with computed attributes
 * Applies enhancement logic to each route in the array
 * 
 * @param routes - Array of raw route data from Tranzy API
 * @returns Array of enhanced routes with computed attributes
 */
export function enhanceRoutes(routes: TranzyRouteResponse[]): EnhancedRoute[] {
  // Handle edge case: empty or invalid routes array
  if (!Array.isArray(routes)) {
    return [];
  }
  
  return routes.map(route => enhanceRoute(route));
}

/**
 * Check if a route is a Transport Elevi route
 * A route is considered Transport Elevi if route_short_name OR route_desc starts with "TE"
 * 
 * @param route - Route data to check
 * @returns True if route is Transport Elevi, false otherwise
 */
export function isEleviRoute(route: TranzyRouteResponse): boolean {
  const routeShortName = route.route_short_name || '';
  const routeDesc = route.route_desc || '';
  
  return routeShortName.startsWith('TE') || routeDesc.startsWith('TE');
}

/**
 * Check if a route is an External route
 * A route is considered External if route_short_name starts with "M"
 * 
 * @param route - Route data to check
 * @returns True if route is External, false otherwise
 */
export function isExternalRoute(route: TranzyRouteResponse): boolean {
  const routeShortName = route.route_short_name || '';
  
  return routeShortName.startsWith('M');
}

/**
 * Check if a route is a special route (either Elevi or External)
 * Special routes are excluded by default in the filtering system
 * 
 * @param route - Route data to check
 * @returns True if route is special (Elevi or External), false otherwise
 */
export function isSpecialRoute(route: TranzyRouteResponse): boolean {
  return isEleviRoute(route) || isExternalRoute(route);
}

/**
 * Filter routes to exclude special routes (Elevi and External)
 * Used for default filtering behavior when no meta filters are active
 * 
 * @param routes - Array of routes to filter
 * @returns Array of routes with special routes excluded
 */
export function excludeSpecialRoutes(routes: TranzyRouteResponse[]): TranzyRouteResponse[] {
  if (!Array.isArray(routes)) {
    return [];
  }
  
  return routes.filter(route => !isSpecialRoute(route));
}