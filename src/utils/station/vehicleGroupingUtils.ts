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
  if (statusMessage.includes('minute')) return 'in_minutes'; // Changed from 'minutes' to 'minute' to catch both singular and plural
  return 'off_route';
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
 * Implements status-priority grouping with trip diversity within each status
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
  
  // Step 1: Group vehicles by status and sort within each status by arrival time
  const byStatus: Record<ArrivalStatus, StationVehicle[]> = {
    'at_stop': [],
    'in_minutes': [],
    'departed': [],
    'off_route': []
  };
  
  for (const vehicle of vehicles) {
    const status = getVehicleStatus(vehicle);
    byStatus[status].push(vehicle);
  }
  
  // Sort vehicles within each status group by arrival time (earliest first)
  for (const status of Object.keys(byStatus) as ArrivalStatus[]) {
    byStatus[status].sort((a, b) => {
      const aMinutes = a.arrivalTime?.estimatedMinutes ?? 999;
      const bMinutes = b.arrivalTime?.estimatedMinutes ?? 999;
      return aMinutes - bMinutes;
    });
  }
  
  // Step 2: Apply trip diversity within each status category
  // Select up to MAX_VEHICLES_PER_TRIP_STATUS vehicles per trip per status
  const selectedByStatus: Record<ArrivalStatus, StationVehicle[]> = {
    'at_stop': [],
    'in_minutes': [],
    'departed': [],
    'off_route': []
  };
  
  for (const [status, vehiclesInStatus] of Object.entries(byStatus) as [ArrivalStatus, StationVehicle[]][]) {
    const tripCounts = new Map<string, number>();
    
    for (const vehicle of vehiclesInStatus) {
      const tripId = vehicle.trip?.trip_id || `no-trip-${vehicle.vehicle.id}`;
      const currentCount = tripCounts.get(tripId) || 0;
      
      if (currentCount < VEHICLE_DISPLAY.MAX_VEHICLES_PER_TRIP_STATUS) {
        selectedByStatus[status].push(vehicle);
        tripCounts.set(tripId, currentCount + 1);
      }
    }
  }
  
  // Step 3: Fill slots with status priority (at_stop → in_minutes → departed → off_route)
  const finalDisplayed: StationVehicle[] = [];
  const allHidden: StationVehicle[] = [];
  
  // Priority order for filling slots
  const statusPriority: ArrivalStatus[] = ['at_stop', 'in_minutes', 'departed', 'off_route'];
  
  for (const status of statusPriority) {
    const selectedForStatus = selectedByStatus[status];
    const allForStatus = byStatus[status];
    
    // Add selected vehicles for this status
    for (const vehicle of selectedForStatus) {
      if (finalDisplayed.length < options.maxVehicles) {
        finalDisplayed.push(vehicle);
      } else {
        allHidden.push(vehicle);
      }
    }
    
    // Add remaining vehicles from this status to hidden
    for (const vehicle of allForStatus) {
      if (!selectedForStatus.includes(vehicle)) {
        allHidden.push(vehicle);
      }
    }
  }
  
  return {
    displayed: finalDisplayed,
    hidden: allHidden,
    groupingApplied: true
  };
}