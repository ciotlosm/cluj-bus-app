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
}

/**
 * Station with filtering metadata and associated vehicles
 */
export interface FilteredStation {
  station: TranzyStopResponse;
  distance: number;
  hasActiveTrips: boolean;
  stationType: 'primary' | 'secondary' | 'all';
  matchesFavorites: boolean; // NEW: indicates if station serves favorite routes
  favoriteRouteCount: number; // NEW: number of favorite routes served
  vehicles: StationVehicle[]; // NEW: vehicles serving this station
  routeIds: number[]; // NEW: route IDs serving this station
}

/**
 * Station utility functions interface
 */
export interface StationUtilities {
  formatDistance: (distance: number) => string;
  getStationTypeColor: (stationType: 'primary' | 'secondary' | 'all') => 'primary' | 'secondary' | 'default';
  getStationTypeLabel: (stationType: 'primary' | 'secondary' | 'all') => string;
}

/**
 * Hook result interface
 */
export interface StationFilterResult {
  filteredStations: FilteredStation[];
  loading: boolean;
  error: string | null;
  isFiltering: boolean;
  totalStations: number;
  toggleFiltering: () => void;
  retryFiltering: () => void;
  utilities: StationUtilities;
  // Favorites filtering
  favoritesFilterEnabled: boolean;
  toggleFavoritesFilter: () => void;
  hasFavoriteRoutes: boolean;
}