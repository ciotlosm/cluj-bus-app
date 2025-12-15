import type { FavoriteBusInfo } from '../services/favoriteBusService';

export interface RouteTypeInfo {
  label: string;
  icon: string;
  color: string;
}

export const getRouteTypeInfo = (routeType?: string, theme?: any): RouteTypeInfo => {
  const defaultColor = theme?.palette?.primary?.main || '#1976d2';
  
  switch (routeType) {
    case 'bus':
      return { 
        label: 'Bus', 
        icon: '🚌', 
        color: theme?.palette?.primary?.main || defaultColor 
      };
    case 'trolleybus':
      return { 
        label: 'Trolleybus', 
        icon: '🚎', 
        color: theme?.palette?.success?.main || '#2e7d32' 
      };
    case 'tram':
      return { 
        label: 'Tram', 
        icon: '🚋', 
        color: theme?.palette?.warning?.main || '#ed6c02' 
      };
    case 'metro':
      return { 
        label: 'Metro', 
        icon: '🚇', 
        color: theme?.palette?.secondary?.main || '#9c27b0' 
      };
    case 'rail':
      return { 
        label: 'Train', 
        icon: '🚆', 
        color: theme?.palette?.info?.main || '#0288d1' 
      };
    default:
      return { 
        label: 'Bus', 
        icon: '🚌', 
        color: defaultColor 
      };
  }
};

export const getUrgencyColor = (minutesAway: number, theme?: any) => {
  if (minutesAway <= 5) return theme?.palette?.error?.main || '#d32f2f';
  if (minutesAway <= 10) return theme?.palette?.warning?.main || '#ed6c02';
  return theme?.palette?.success?.main || '#2e7d32';
};

export const getDisplayRouteName = (bus: FavoriteBusInfo): string => {
  const { routeName, routeDesc } = bus;
  
  // If routeDesc exists and is different from routeName, use it
  if (routeDesc && routeDesc !== routeName && !routeDesc.startsWith('Route ')) {
    return routeDesc;
  }
  
  // Otherwise, create a proper label
  if (routeName) {
    return `Route ${routeName}`;
  }
  
  return `Route ${routeName}`;
};

export const getAvatarRouteNumber = (bus: FavoriteBusInfo): string => {
  const { routeName, routeDesc } = bus;
  
  // Strategy 1: Extract route number from routeDesc if it contains meaningful route info
  if (routeDesc && routeDesc !== routeName) {
    // Look for route numbers in the routeDesc (e.g., "Route 42", "42", "42A", etc.)
    const routeNumberMatch = routeDesc.match(/\b(\d+[A-Z]?)\b/);
    if (routeNumberMatch) {
      return routeNumberMatch[1];
    }
    
    // If routeName starts with "Route " followed by a number, extract it
    const routePrefixMatch = routeName.match(/^Route\s+(\d+[A-Z]?)$/i);
    if (routePrefixMatch) {
      return routePrefixMatch[1];
    }
  }
  
  // Strategy 2: Use routeName as fallback
  if (routeName) {
    return routeName;
  }
  
  // Strategy 3: Fallback to generic number
  return '?';
};

export const getRouteLabel = (routeId: string, availableRoutes: any[]): string => {
  const route = availableRoutes.find(r => r.id === routeId);
  if (route) {
    return route.routeName || `Route ${routeId}`;
  }
  return `Route ${routeId}`;
};

export const getRouteTypeInfoById = (routeId: string, availableRoutes: any[], theme?: any): RouteTypeInfo => {
  const route = availableRoutes.find(r => r.id === routeId);
  const type = route?.type || 'bus';
  return getRouteTypeInfo(type, theme);
};