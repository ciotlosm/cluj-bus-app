import type { EnhancedVehicleWithDirection, VehicleTransformationOptions, VehicleTransformationPipeline } from './types';

/**
 * Sort vehicles by priority (arriving vehicles first, then by estimated minutes)
 */
const sortVehiclesByPriority = (vehicles: EnhancedVehicleWithDirection[]): EnhancedVehicleWithDirection[] => {
  return vehicles.sort((a, b) => {
    // Priority sorting
    const aAtStation = a.minutesAway === 0 && a._internalDirection === 'arriving';
    const bAtStation = b.minutesAway === 0 && b._internalDirection === 'arriving';
    
    if (aAtStation && !bAtStation) return -1;
    if (!aAtStation && bAtStation) return 1;
    
    const aArriving = a._internalDirection === 'arriving' && a.minutesAway > 0;
    const bArriving = b._internalDirection === 'arriving' && b.minutesAway > 0;
    
    if (aArriving && !bArriving) return -1;
    if (!aArriving && bArriving) return 1;
    
    if (aArriving && bArriving) {
      return a.minutesAway - b.minutesAway;
    }
    
    return a.minutesAway - b.minutesAway;
  });
};

/**
 * Deduplicate vehicles by route, keeping the best vehicle per route
 */
const deduplicateByRoute = (
  vehicles: EnhancedVehicleWithDirection[],
  maxVehiclesPerStation: number
): EnhancedVehicleWithDirection[] => {
  const routeGroups = new Map<string, EnhancedVehicleWithDirection[]>();
  
  vehicles.forEach(vehicle => {
    const routeId = vehicle.routeId;
    if (!routeGroups.has(routeId)) {
      routeGroups.set(routeId, []);
    }
    routeGroups.get(routeId)!.push(vehicle);
  });

  // Select the best vehicle per route based on priority
  const bestVehiclePerRoute = Array.from(routeGroups.entries()).map(([routeId, routeVehicles]) => {
    const sortedVehicles = sortVehiclesByPriority(routeVehicles);
    return sortedVehicles[0];
  });

  // Check if there's only one route at this station
  const uniqueRoutes = Array.from(new Set(vehicles.map(v => v.routeId)));
  
  if (uniqueRoutes.length === 1) {
    // Single route: show all vehicles from that route (up to maxVehicles limit)
    return sortVehiclesByPriority(vehicles).slice(0, maxVehiclesPerStation);
  } else {
    // Multiple routes: deduplicate by route and limit to maxVehicles
    return sortVehiclesByPriority(bestVehiclePerRoute).slice(0, maxVehiclesPerStation);
  }
};

/**
 * Create a vehicle transformation pipeline for processing enhanced vehicles
 * 
 * This utility creates a reusable transformation pipeline that can apply
 * various processing steps to enhanced vehicles based on configuration options.
 * 
 * @param options Transformation options
 * @returns Transformation pipeline function
 */
export const createVehicleTransformationPipeline = (
  options: VehicleTransformationOptions = {}
): VehicleTransformationPipeline => {
  const {
    maxVehiclesPerStation = 5,
    showAllVehiclesPerRoute = false,
    sortByPriority = true
  } = options;

  return (vehicles: EnhancedVehicleWithDirection[]): EnhancedVehicleWithDirection[] => {
    if (!Array.isArray(vehicles) || vehicles.length === 0) {
      return [];
    }

    let processedVehicles = [...vehicles];

    // Apply sorting if requested
    if (sortByPriority) {
      processedVehicles = sortVehiclesByPriority(processedVehicles);
    }

    // Apply vehicle selection logic based on mode
    if (showAllVehiclesPerRoute) {
      // Show all vehicles (favorites mode) - just apply limit
      processedVehicles = processedVehicles.slice(0, maxVehiclesPerStation);
    } else {
      // Deduplicate by route and apply limits (station display mode)
      processedVehicles = deduplicateByRoute(processedVehicles, maxVehiclesPerStation);
    }

    return processedVehicles;
  };
};