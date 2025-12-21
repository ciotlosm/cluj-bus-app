/**
 * Smart Station Filtering Types
 * Core interfaces for location-aware station filtering
 */

import type { TranzyStopResponse } from './rawTranzyApi';

/**
 * Constants for filtering behavior
 */
export const SECONDARY_STATION_THRESHOLD = 100; // meters

/**
 * Station with filtering metadata
 */
export interface FilteredStation {
  station: TranzyStopResponse;
  distance: number;
  hasActiveTrips: boolean;
  stationType: 'primary' | 'secondary' | 'all';
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
export interface SmartStationFilterResult {
  filteredStations: FilteredStation[];
  loading: boolean;
  error: string | null;
  isFiltering: boolean;
  totalStations: number;
  toggleFiltering: () => void;
  retryFiltering: () => void;
  utilities: StationUtilities;
}