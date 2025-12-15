// Define the route type used by the store
type StoreRoute = {
  id: string; // Internal route ID for API calls ("40", "42", etc.)
  routeName: string; // route_short_name: What users see and interact with ("100", "101")
  routeDesc: string; // route_long_name: Full description ("Piața Unirii - Mănăștur")
  description?: string; // Additional description field
  type: 'bus' | 'trolleybus' | 'tram' | 'metro' | 'rail' | 'ferry' | 'other';
};

export interface RouteTypeInfo {
  label: string;
  icon: string;
  color: string;
}

export const getRouteTypeInfo = (type?: string, theme?: any): RouteTypeInfo => {
  const defaultColor = theme?.palette?.primary?.main || '#1976d2';
  
  switch (type) {
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

export const filterRoutes = (
  routes: StoreRoute[],
  searchTerm: string,
  selectedTypes: string[],
  excludeIds: string[] = []
): StoreRoute[] => {
  return routes.filter(route => {
    // Exclude routes that are in the exclude list
    if (excludeIds.includes(route.id)) {
      return false;
    }
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      route.routeName?.toLowerCase().includes(searchLower) ||
      route.routeDesc?.toLowerCase().includes(searchLower) ||
      route.id.toLowerCase().includes(searchLower)
    );
    
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(route.type || 'bus');
    
    return matchesSearch && matchesType;
  });
};

export const getUniqueRouteTypes = (routes: StoreRoute[]): string[] => {
  const types = [...new Set(routes.map(route => route.type || 'bus'))];
  return types.sort();
};

export const separateRoutes = (routes: StoreRoute[], favoriteIds: string[]) => {
  const favoriteRoutes = routes.filter(route => favoriteIds.includes(route.id));
  const availableRoutes = routes.filter(route => !favoriteIds.includes(route.id));
  
  return { favoriteRoutes, availableRoutes };
};