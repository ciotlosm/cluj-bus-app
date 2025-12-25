/**
 * Vehicle Grouping Utilities
 * Functions for optimizing vehicle display in station lists
 */

import { VEHICLE_DISPLAY } from '../core/constants';
import type { StationVehicle } from '../../types/stationFilter';
import type { ArrivalStatus } from '../../types/arrivalTime';

/**
 * Result of vehicle grouping operation
 */
export interface GroupedVehicles {
  displayed: StationVehicle[];
  hidden: StationVehicle[];
  groupingApplied: boolean;
}

/**
 * Options for vehicle grouping
 */
export interface VehicleGroupingOptions {
  maxVehicles: number;
  routeCount: number;
}

/**
 * Extract arrival status from a station vehicle
 */
function getVehicleStatus(vehicle: StationVehicle): ArrivalStatus {
  if (!vehicle.arrivalTime) {
    return 'off_route';
  }
  
  const statusMessage = vehicle.arrivalTime.statusMessage;
  if (statusMessage.includes('At stop')) return 'at_stop';
  if (statusMessage.includes('Departed')) return 'departed';
  if (statusMessage.includes('minutes')) return 'in_minutes';
  return 'off_route';
}

/**
 * Get trip identifier for grouping vehicles
 */
function getTripId(vehicle: StationVehicle): string {
  return vehicle.trip?.trip_id || `no-trip-${vehicle.vehicle.id}`;
}

/**
 * Select the best vehicle from a group with the same trip and status
 * Prioritizes vehicles with the earliest arrival time
 */
export function selectBestVehiclePerStatus(
  vehicles: StationVehicle[],
  status: ArrivalStatus
): StationVehicle | null {
  const vehiclesWithStatus = vehicles.filter(v => getVehicleStatus(v) === status);
  
  if (vehiclesWithStatus.length === 0) {
    return null;
  }
  
  // Sort by estimated minutes (ascending) to get earliest arrival
  return vehiclesWithStatus.sort((a, b) => {
    const aMinutes = a.arrivalTime?.estimatedMinutes ?? 999;
    const bMinutes = b.arrivalTime?.estimatedMinutes ?? 999;
    return aMinutes - bMinutes;
  })[0];
}

/**
 * Group vehicles for display optimization
 * Implements trip-based grouping with status-based selection
 */
export function groupVehiclesForDisplay(
  vehicles: StationVehicle[],
  options: VehicleGroupingOptions
): GroupedVehicles {
  // If single route or under threshold, show all vehicles
  if (options.routeCount === 1 || vehicles.length <= options.maxVehicles) {
    return {
      displayed: vehicles,
      hidden: [],
      groupingApplied: false
    };
  }
  
  // Apply grouping logic: maximum one vehicle per trip per status
  const tripStatusGroups = new Map<string, Map<ArrivalStatus, StationVehicle[]>>();
  
  // Group vehicles by trip and status
  for (const vehicle of vehicles) {
    const tripId = getTripId(vehicle);
    const status = getVehicleStatus(vehicle);
    
    if (!tripStatusGroups.has(tripId)) {
      tripStatusGroups.set(tripId, new Map());
    }
    
    const tripGroups = tripStatusGroups.get(tripId)!;
    if (!tripGroups.has(status)) {
      tripGroups.set(status, []);
    }
    
    tripGroups.get(status)!.push(vehicle);
  }
  
  // Select best vehicle from each trip-status group
  const selectedVehicles: StationVehicle[] = [];
  const hiddenVehicles: StationVehicle[] = [];
  
  for (const [tripId, statusGroups] of tripStatusGroups) {
    for (const [status, vehiclesInGroup] of statusGroups) {
      // Limit to MAX_VEHICLES_PER_TRIP_STATUS per group
      const maxPerGroup = VEHICLE_DISPLAY.MAX_VEHICLES_PER_TRIP_STATUS;
      
      if (vehiclesInGroup.length <= maxPerGroup) {
        // All vehicles fit in the limit
        selectedVehicles.push(...vehiclesInGroup);
      } else {
        // Select best vehicles and mark rest as hidden
        const sortedVehicles = vehiclesInGroup.sort((a, b) => {
          const aMinutes = a.arrivalTime?.estimatedMinutes ?? 999;
          const bMinutes = b.arrivalTime?.estimatedMinutes ?? 999;
          return aMinutes - bMinutes;
        });
        
        selectedVehicles.push(...sortedVehicles.slice(0, maxPerGroup));
        hiddenVehicles.push(...sortedVehicles.slice(maxPerGroup));
      }
    }
  }
  
  // Limit total displayed vehicles to threshold
  let finalDisplayed: StationVehicle[];
  let finalHidden: StationVehicle[];
  
  if (selectedVehicles.length <= options.maxVehicles) {
    finalDisplayed = selectedVehicles;
    finalHidden = hiddenVehicles;
  } else {
    // Sort selected vehicles by arrival priority before limiting
    const sortedSelected = selectedVehicles.sort((a, b) => {
      const aStatus = getVehicleStatus(a);
      const bStatus = getVehicleStatus(b);
      const aMinutes = a.arrivalTime?.estimatedMinutes ?? 999;
      const bMinutes = b.arrivalTime?.estimatedMinutes ?? 999;
      
      // Sort by status priority first, then by time
      const statusOrder = { 'at_stop': 0, 'in_minutes': 1, 'departed': 2, 'off_route': 3 };
      const statusDiff = statusOrder[aStatus] - statusOrder[bStatus];
      
      if (statusDiff !== 0) {
        return statusDiff;
      }
      
      return aMinutes - bMinutes;
    });
    
    finalDisplayed = sortedSelected.slice(0, options.maxVehicles);
    finalHidden = [...sortedSelected.slice(options.maxVehicles), ...hiddenVehicles];
  }
  
  return {
    displayed: finalDisplayed,
    hidden: finalHidden,
    groupingApplied: true
  };
}