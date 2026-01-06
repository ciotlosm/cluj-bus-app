/**
 * Station Filtering Types
 * Core interfaces for location-aware station filtering
 */

import type { TranzyStopResponse, TranzyVehicleResponse, TranzyRouteResponse, TranzyTripResponse } from './rawTranzyApi';

/**
 * Constants for filtering behavior
 */
export const SECONDARY_STATION_THRESHOLD = 100; // meters

/**
 * Vehicle with route information for a station
 */
export interface StationVehicle {
  vehicle: TranzyVehicleResponse;
  route: TranzyRouteResponse | null;
  trip: TranzyTripResponse | null; // NEW: trip information for headsign
  arrivalTime?: {
    statusMessage: string;
    confidence: 'high' | 'medium' | 'low';
    estimatedMinutes: number;
  }; // NEW: arrival time information
}

/**
 * Station with filtering metadata and associated vehicles
 */
export interface FilteredStation {
  station: TranzyStopResponse;
  distance: number;
  hasActiveTrips: boolean;
  stationType: 'primary' | 'all';
  vehicles: StationVehicle[]; // NEW: vehicles serving this station
  routeIds: number[]; // NEW: route IDs serving this station
}

/**
 * Station utility functions interface
 */
export interface StationUtilities {
  formatDistance: (distance: number) => string;
  getStationTypeColor: (stationType: 'primary' | 'all') => 'primary' | 'default';
  getStationTypeLabel: (stationType: 'primary' | 'all') => string;
}

/**
 * Hook result interface
 */
export interface StationFilterResult {
  filteredStations: FilteredStation[];
  loading: boolean;
  error: string | null;
  retryFiltering: () => void;
  utilities: StationUtilities;
}