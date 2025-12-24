/**
 * Vehicle Grouping Utilities
 * Intelligent grouping and selection of vehicles for optimized station display
 */

import type { StationVehicle } from '../../types/stationFilter';
import type { ArrivalStatus } from '../../types/arrivalTime';
import { VEHICLE_DISPLAY } from '../core/constants';

/**
 * Result of vehicle grouping operation
 */
export interface GroupedVehicles {
  displayed: StationVehicle[];
  hidden: StationVehicle[];
  groupingApplied: boolean;
}

/**
 * Options for vehicle grouping behavior
 */
export interface VehicleGroupingOptions {
  maxVehicles: number;
  includeOffRoute: boolean;
  routeCount: number;
}



/**
 * Select the best vehicle from a group with the same route and status
 * Prioritizes vehicles with the earliest arrival time within each status category
 * 
 * @param vehicles - Array of vehicles with same route and status
 * @param status - The arrival status for this group
 * @returns The best vehicle from the group, or null if no valid vehicle
 */
export const selectBestVehiclePerStatus = (
  vehicles: StationVehicle[],
  status: ArrivalStatus
): StationVehicle | null => {
  if (vehicles.length === 0) {
    return null;
  }
  
  // Filter vehicles that match the specified status
  const statusVehicles = vehicles.filter(vehicle => 
    (vehicle.arrivalTime?.status ?? 'off_route') === status
  );
  
  if (statusVehicles.length === 0) {
    return null;
  }
  
  // For vehicles with arrival time data, select the one with earliest arrival
  const vehiclesWithArrival = statusVehicles.filter(vehicle => vehicle.arrivalTime);
  
  if (vehiclesWithArrival.length > 0) {
    return vehiclesWithArrival.reduce((best, current) => {
      if (!best.arrivalTime || !current.arrivalTime) {
        return best;
      }
      return current.arrivalTime.estimatedMinutes < best.arrivalTime.estimatedMinutes ? current : best;
    });
  }
  
  // If no vehicles have arrival time data, return the first one
  return statusVehicles[0];
};

/**
 * Group vehicles for optimized display based on station complexity and route count
 * Implements the core grouping logic for vehicle display optimization
 * 
 * @param vehicles - Array of station vehicles to group
 * @param options - Grouping options including thresholds and filters
 * @returns Grouped vehicles with display and hidden arrays
 */
export const groupVehiclesForDisplay = (
  vehicles: StationVehicle[],
  options: VehicleGroupingOptions
): GroupedVehicles => {
  // Handle empty vehicle list
  if (vehicles.length === 0) {
    return {
      displayed: [],
      hidden: [],
      groupingApplied: false
    };
  }
  
  // Filter out off-route vehicles if not included
  const filteredVehicles = options.includeOffRoute 
    ? vehicles 
    : vehicles.filter(vehicle => (vehicle.arrivalTime?.status ?? 'off_route') !== 'off_route');
  
  // Single route stations always show all vehicles (Requirement 1.1)
  if (options.routeCount <= 1) {
    return {
      displayed: filteredVehicles,
      hidden: [],
      groupingApplied: false
    };
  }
  
  // Multi-route stations under threshold show all vehicles (Requirement 1.2)
  if (filteredVehicles.length <= options.maxVehicles) {
    return {
      displayed: filteredVehicles,
      hidden: [],
      groupingApplied: false
    };
  }
  
  // Apply grouping logic for multi-route stations over threshold (Requirement 1.3)
  const routeStatusGroups = new Map<string, StationVehicle[]>();
  
  // Group vehicles by route and status
  filteredVehicles.forEach(vehicle => {
    const routeId = vehicle.route?.route_id || vehicle.vehicle.route_id;
    const status = vehicle.arrivalTime?.status ?? 'off_route';
    const groupKey = `${routeId}-${status}`;
    
    if (!routeStatusGroups.has(groupKey)) {
      routeStatusGroups.set(groupKey, []);
    }
    routeStatusGroups.get(groupKey)!.push(vehicle);
  });
  
  // Select best vehicle from each group (max 1 per route per status)
  const displayedVehicles: StationVehicle[] = [];
  const hiddenVehicles: StationVehicle[] = [];
  
  // Process each group and select the best vehicle
  routeStatusGroups.forEach((groupVehicles, groupKey) => {
    const [, status] = groupKey.split('-');
    const bestVehicle = selectBestVehiclePerStatus(groupVehicles, status as ArrivalStatus);
    
    if (bestVehicle) {
      displayedVehicles.push(bestVehicle);
      // Add remaining vehicles to hidden list
      groupVehicles.forEach(vehicle => {
        if (vehicle !== bestVehicle) {
          hiddenVehicles.push(vehicle);
        }
      });
    }
  });
  
  // Sort displayed vehicles to maintain consistent ordering
  // Use the existing sorting logic from stationVehicleUtils
  displayedVehicles.sort((a, b) => {
    const aStatus = a.arrivalTime?.status ?? 'off_route';
    const bStatus = b.arrivalTime?.status ?? 'off_route';
    const aTime = a.arrivalTime?.estimatedMinutes || 999;
    const bTime = b.arrivalTime?.estimatedMinutes || 999;
    
    // First sort by status priority, then by arrival time
    const statusOrder = { 'at_stop': 0, 'arriving_soon': 1, 'in_minutes': 2, 'just_left': 3, 'departed': 4, 'off_route': 5 };
    const aOrder = statusOrder[aStatus] || 5;
    const bOrder = statusOrder[bStatus] || 5;
    
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    return aTime - bTime;
  });
  
  // Enforce the overall vehicle limit (Requirement 4.1)
  if (displayedVehicles.length > options.maxVehicles) {
    const limitedDisplayed = displayedVehicles.slice(0, options.maxVehicles);
    const additionalHidden = displayedVehicles.slice(options.maxVehicles);
    
    return {
      displayed: limitedDisplayed,
      hidden: [...hiddenVehicles, ...additionalHidden],
      groupingApplied: true
    };
  }
  
  return {
    displayed: displayedVehicles,
    hidden: hiddenVehicles,
    groupingApplied: true
  };
};