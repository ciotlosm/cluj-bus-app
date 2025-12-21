/**
 * Unified Refresh System Hook
 * 
 * Replaces the legacy useModernRefreshSystem with a simplified interface
 * that leverages the existing unified auto-refresh infrastructure and generic useStoreData hook.
 * 
 * This hook provides the same interface as the legacy system but uses:
 * - autoRefreshManager for coordinated refresh intervals
 * - useStoreData for type-safe data access
 * - vehicleStore methods for data fetching
 * - Standardized error handling
 */

import { useCallback, useState, useEffect } from 'react';
import { useConfigStore } from '../../stores/configStore';
import { useVehicleStore } from '../../stores/vehicleStore';
import { useStoreData } from './useStoreData';
// Auto refresh managed by vehicle store
import { logger } from '../../utils/shared/logger';

export interface RefreshSystemState {
  isLoading: boolean;
  lastUpdate: Date | null;
  lastApiUpdate: Date | null;
  error: string | null;
  isAutoRefreshEnabled: boolean;
}

export interface RefreshSystemActions {
  refreshAll: (forceRefresh?: boolean) => Promise<void>;
  refreshVehicles: (forceRefresh?: boolean) => Promise<void>;
  refreshStations: (forceRefresh?: boolean) => Promise<void>;
  refreshRoutes: (forceRefresh?: boolean) => Promise<void>;
  refreshStopTimes: (forceRefresh?: boolean) => Promise<void>;
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
  toggleAutoRefresh: () => void;
}

export interface RefreshSystemResult extends RefreshSystemState, RefreshSystemActions {
  // Data access using unified store data
  stations: any[];
  vehicles: any[];
  routes: any[];
  stopTimes: any[];
}

/**
 * Unified refresh system hook using existing infrastructure
 * 
 * Consolidates refresh functionality using:
 * - autoRefreshManager for coordinated intervals
 * - useStoreData for data access
 * - vehicleStore for data fetching
 * 
 * Requirements: 1.5, 7.2, 7.3
 */
export const useRefreshSystem = (): RefreshSystemResult => {
  const { config } = useConfigStore();
  const vehicleStore = useVehicleStore();
  const agencyId = config?.agencyId;

  // Use unified store data hooks for data access
  const vehicleData = useStoreData({
    dataType: 'vehicles',
    agencyId,
    autoRefresh: false // We'll manage refresh manually
  });

  const stationData = useStoreData({
    dataType: 'stations',
    agencyId,
    autoRefresh: false
  });

  const routeData = useStoreData({
    dataType: 'routes',
    agencyId,
    autoRefresh: false
  });

  // Note: stopTimes are now fetched on-demand when specific tripId/stopId is needed
  // This prevents massive unfiltered datasets that freeze the browser

  // Aggregate state from store and data hooks
  const [state, setState] = useState<RefreshSystemState>({
    isLoading: vehicleStore.isLoading || vehicleData.isLoading || stationData.isLoading || routeData.isLoading,
    lastUpdate: vehicleStore.lastUpdate,
    lastApiUpdate: vehicleStore.lastApiUpdate,
    error: vehicleStore.error?.message || vehicleData.error?.message || stationData.error?.message || routeData.error?.message || null,
    isAutoRefreshEnabled: vehicleStore.isAutoRefreshEnabled
  });

  // Update state when store or data hooks change
  useEffect(() => {
    setState({
      isLoading: vehicleStore.isLoading || vehicleData.isLoading || stationData.isLoading || routeData.isLoading,
      lastUpdate: vehicleStore.lastUpdate || vehicleData.lastUpdated || stationData.lastUpdated || routeData.lastUpdated,
      lastApiUpdate: vehicleStore.lastApiUpdate,
      error: vehicleStore.error?.message || vehicleData.error?.message || stationData.error?.message || routeData.error?.message || null,
      isAutoRefreshEnabled: vehicleStore.isAutoRefreshEnabled
    });
  }, [
    vehicleStore.isLoading,
    vehicleStore.lastUpdate,
    vehicleStore.lastApiUpdate,
    vehicleStore.error,
    vehicleStore.isAutoRefreshEnabled,
    vehicleData.isLoading,
    vehicleData.lastUpdated,
    vehicleData.error,
    stationData.isLoading,
    stationData.lastUpdated,
    stationData.error,
    routeData.isLoading,
    routeData.lastUpdated,
    routeData.error
  ]);

  // Refresh functions using store methods
  const refreshStations = useCallback(async (forceRefresh = false) => {
    if (!agencyId) {
      logger.warn('Cannot refresh stations - no agency ID configured', {}, 'useRefreshSystem');
      return;
    }

    logger.debug('Refreshing stations data via unified refresh system', { forceRefresh }, 'useRefreshSystem');
    await stationData.refetch();
  }, [agencyId, stationData]);

  const refreshVehicles = useCallback(async (forceRefresh = false) => {
    if (!agencyId) {
      logger.warn('Cannot refresh vehicles - no agency ID configured', {}, 'useRefreshSystem');
      return;
    }

    logger.debug('Refreshing vehicles data via unified refresh system', { forceRefresh }, 'useRefreshSystem');
    await vehicleData.refetch();
  }, [agencyId, vehicleData]);

  const refreshRoutes = useCallback(async (forceRefresh = false) => {
    if (!agencyId) {
      logger.warn('Cannot refresh routes - no agency ID configured', {}, 'useRefreshSystem');
      return;
    }

    logger.debug('Refreshing routes data via unified refresh system', { forceRefresh }, 'useRefreshSystem');
    await routeData.refetch();
  }, [agencyId, routeData]);

  const refreshStopTimes = useCallback(async (forceRefresh = false) => {
    if (!agencyId) {
      logger.warn('Cannot refresh stop times - no agency ID configured', {}, 'useRefreshSystem');
      return;
    }
    // Note: stopTimes are now fetched on-demand when specific tripId/stopId is needed
    logger.debug('Stop times refresh skipped - now fetched on-demand only', { agencyId }, 'useRefreshSystem');
  }, [agencyId]);

  const refreshAll = useCallback(async (forceRefresh = false) => {
    if (!agencyId) {
      logger.warn('Cannot refresh - no agency ID configured', {}, 'useRefreshSystem');
      return;
    }

    logger.info('Refreshing all data via unified refresh system', { forceRefresh, agencyId }, 'useRefreshSystem');
    
    try {
      await Promise.all([
        refreshStations(forceRefresh),
        refreshVehicles(forceRefresh),
        refreshRoutes(forceRefresh),
        refreshStopTimes(forceRefresh)
      ]);
      
      logger.info('All data refreshed successfully via unified system', {}, 'useRefreshSystem');
    } catch (error) {
      logger.error('Failed to refresh all data via unified system', { error }, 'useRefreshSystem');
      throw error;
    }
  }, [agencyId, refreshStations, refreshVehicles, refreshRoutes, refreshStopTimes]);

  // Auto-refresh management using store's unified system
  const startAutoRefresh = useCallback(() => {
    if (state.isAutoRefreshEnabled) {
      logger.debug('Auto-refresh already enabled via unified system', {}, 'useRefreshSystem');
      return;
    }

    // Use store's unified auto-refresh system
    vehicleStore.startAutoRefresh();
    
    logger.info('Auto-refresh started via unified system', {}, 'useRefreshSystem');
  }, [state.isAutoRefreshEnabled, vehicleStore]);

  const stopAutoRefresh = useCallback(() => {
    if (!state.isAutoRefreshEnabled) {
      logger.debug('Auto-refresh already disabled via unified system', {}, 'useRefreshSystem');
      return;
    }

    // Use store's unified auto-refresh system
    vehicleStore.stopAutoRefresh();
    
    logger.info('Auto-refresh stopped via unified system', {}, 'useRefreshSystem');
  }, [state.isAutoRefreshEnabled, vehicleStore]);

  const toggleAutoRefresh = useCallback(() => {
    if (state.isAutoRefreshEnabled) {
      stopAutoRefresh();
    } else {
      startAutoRefresh();
    }
  }, [state.isAutoRefreshEnabled, startAutoRefresh, stopAutoRefresh]);

  return {
    // State
    ...state,
    
    // Actions
    refreshAll,
    refreshVehicles,
    refreshStations,
    refreshRoutes,
    refreshStopTimes,
    startAutoRefresh,
    stopAutoRefresh,
    toggleAutoRefresh,
    
    // Data access from unified store data hooks
    stations: stationData.data || [],
    vehicles: vehicleData.data || [],
    routes: routeData.data || [],
    stopTimes: [] // Empty array - stopTimes fetched on-demand when needed
  };
};