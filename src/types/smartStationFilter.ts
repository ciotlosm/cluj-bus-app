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
  stationType: 'primary' | 'secondary';
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
  utilities: {
    formatDistance: (distance: number) => string;
    getStationTypeColor: (stationType: 'primary' | 'secondary') => 'primary' | 'secondary';
    getStationTypeLabel: (stationType: 'primary' | 'secondary') => string;
  };
}