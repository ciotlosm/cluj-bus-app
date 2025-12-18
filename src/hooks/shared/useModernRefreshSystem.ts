/**
 * Modern Refresh System
 * 
 * Provides centralized refresh control for all data types using store-based architecture.
 * Replaces data hooks with direct store method calls for better performance and consistency.
 */

import { useCallback, useEffect, useState } from 'react';
import { useConfigStore } from '../../stores/configStore';
import { useVehicleStore } from '../../stores/vehicleStore';
import { useStoreEvent, StoreEvents, StoreEventManager } from '../../stores/shared/storeEvents';
import { logger } from '../../utils/logger';

export interface ModernRefreshSystemState {
  isLoading: boolean;
  lastUpdate: Date | null;
  lastApiUpdate: Date | null;
  error: string | null;
  isAutoRefreshEnabled: boolean;
}

export interface ModernRefreshSystemActions {
  refreshAll: (forceRefresh?: boolean) => Promise<void>;
  refreshVehicles: (forceRefresh?: boolean) => Promise<void>;
  refreshStations: (forceRefresh?: boolean) => Promise<void>;
  refreshRoutes: (forceRefresh?: boolean) => Promise<void>;
  refreshStopTimes: (forceRefresh?: boolean) => Promise<void>;
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
  toggleAutoRefresh: () => void;
}

export interface ModernRefreshSystemResult extends ModernRefreshSystemState, ModernRefreshSystemActions {
  // Data access (for components that need it) - now from stores
  stations: any[];
  vehicles: any[];
  routes: any[];
  stopTimes: any[];
}

/**
 * Modern refresh system hook using store-based architecture
 */
export const useModernRefreshSystem = (): ModernRefreshSystemResult => {
  const { config: initialConfig } = useConfigStore();
  const vehicleStore = useVehicleStore();
  const [config, setConfig] = useState(initialConfig);
  const agencyId = config?.agencyId;
  
  // Subscribe to configuration changes via events
  useStoreEvent(
    StoreEvents.CONFIG_CHANGED,
    useCallback((data: any) => {
      setConfig(data.config);
    }, []),
    []
  );

  // State management - synchronized with store state
  const [state, setState] = useState<ModernRefreshSystemState>({
    isLoading: vehicleStore.isLoading,
    lastUpdate: vehicleStore.lastUpdate,
    lastApiUpdate: vehicleStore.lastApiUpdate,
    error: vehicleStore.error?.message || null,
    isAutoRefreshEnabled: vehicleStore.isAutoRefreshEnabled
  });

  // Data state from stores
  const [dataState, setDataState] = useState({
    stations: vehicleStore.stations || [],
    vehicles: vehicleStore.vehicles || [],
    routes: [] as any[],
    stopTimes: [] as any[]
  });

  // Subscribe to store updates via events
  useStoreEvent(
    StoreEvents.VEHICLES_UPDATED,
    useCallback((data: any) => {
      const now = new Date();
      setState(prev => ({
        ...prev,
        lastUpdate: now,
        lastApiUpdate: data.source === 'api' ? now : prev.lastApiUpdate,
        isLoading: false
      }));
      setDataState(prev => ({
        ...prev,
        vehicles: data.vehicles
      }));
    }, []),
    []
  );

  // Sync with store state changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isLoading: vehicleStore.isLoading,
      lastUpdate: vehicleStore.lastUpdate,
      lastApiUpdate: vehicleStore.lastApiUpdate,
      error: vehicleStore.error?.message || null,
      isAutoRefreshEnabled: vehicleStore.isAutoRefreshEnabled
    }));
    
    setDataState(prev => ({
      ...prev,
      stations: vehicleStore.stations || [],
      vehicles: vehicleStore.vehicles || []
    }));
  }, [
    vehicleStore.isLoading,
    vehicleStore.lastUpdate,
    vehicleStore.lastApiUpdate,
    vehicleStore.error,
    vehicleStore.isAutoRefreshEnabled,
    vehicleStore.stations,
    vehicleStore.vehicles
  ]);

  // Refresh functions using store methods
  const refreshStations = useCallback(async (forceRefresh = false) => {
    if (!agencyId) return;
    logger.debug('Refreshing stations data via store', { forceRefresh }, 'MODERN_REFRESH');
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const result = await vehicleStore.getStationData({
        agencyId,
        forceRefresh,
        cacheMaxAge: 60000 // 1 minute
      });
      
      if (result.data) {
        setDataState(prev => ({ ...prev, stations: result.data }));
        
        // Emit event for coordination
        StoreEventManager.emit(StoreEvents.CACHE_INVALIDATED, {
          cacheKeys: [`stations:${agencyId}`],
          reason: 'manual_refresh'
        });
      }
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: result.error?.message || null,
        lastUpdate: result.lastUpdated,
        lastApiUpdate: result.lastUpdated
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [agencyId, vehicleStore]);

  const refreshVehicles = useCallback(async (forceRefresh = false) => {
    if (!agencyId) return;
    logger.debug('Refreshing vehicles data via store', { forceRefresh }, 'MODERN_REFRESH');
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const result = await vehicleStore.getVehicleData({
        agencyId,
        forceRefresh,
        cacheMaxAge: 30000 // 30 seconds for live data
      });
      
      if (result.data) {
        setDataState(prev => ({ ...prev, vehicles: result.data }));
        
        // Emit event for coordination
        StoreEventManager.emit(StoreEvents.VEHICLES_UPDATED, {
          vehicles: result.data,
          timestamp: result.lastUpdated || new Date(),
          source: 'api'
        });
      }
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: result.error?.message || null,
        lastUpdate: result.lastUpdated,
        lastApiUpdate: result.lastUpdated
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [agencyId, vehicleStore]);

  const refreshRoutes = useCallback(async (forceRefresh = false) => {
    if (!agencyId) return;
    logger.debug('Refreshing routes data via store', { forceRefresh }, 'MODERN_REFRESH');
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const result = await vehicleStore.getRouteData({
        agencyId,
        forceRefresh,
        cacheMaxAge: 60000 // 1 minute
      });
      
      if (result.data) {
        setDataState(prev => ({ ...prev, routes: result.data }));
        
        // Emit event for coordination
        StoreEventManager.emit(StoreEvents.CACHE_INVALIDATED, {
          cacheKeys: [`routes:${agencyId}`],
          reason: 'manual_refresh'
        });
      }
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: result.error?.message || null,
        lastUpdate: result.lastUpdated,
        lastApiUpdate: result.lastUpdated
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [agencyId, vehicleStore]);

  const refreshStopTimes = useCallback(async (forceRefresh = false) => {
    if (!agencyId) return;
    logger.debug('Refreshing stop times data via store', { forceRefresh }, 'MODERN_REFRESH');
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const result = await vehicleStore.getStopTimesData({
        agencyId,
        forceRefresh,
        cacheMaxAge: 120000 // 2 minutes
      });
      
      if (result.data) {
        setDataState(prev => ({ ...prev, stopTimes: result.data }));
        
        // Emit event for coordination
        StoreEventManager.emit(StoreEvents.CACHE_INVALIDATED, {
          cacheKeys: [`stopTimes:${agencyId}`],
          reason: 'manual_refresh'
        });
      }
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: result.error?.message || null,
        lastUpdate: result.lastUpdated,
        lastApiUpdate: result.lastUpdated
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [agencyId, vehicleStore]);

  const refreshAll = useCallback(async (forceRefresh = false) => {
    if (!agencyId) {
      logger.warn('Cannot refresh - no agency ID configured', {}, 'MODERN_REFRESH');
      return;
    }

    logger.info('Refreshing all data', { forceRefresh, agencyId }, 'MODERN_REFRESH');
    
    try {
      await Promise.all([
        refreshStations(forceRefresh),
        refreshVehicles(forceRefresh),
        refreshRoutes(forceRefresh),
        refreshStopTimes(forceRefresh)
      ]);
      
      logger.info('All data refreshed successfully', {}, 'MODERN_REFRESH');
    } catch (error) {
      logger.error('Failed to refresh all data', { error }, 'MODERN_REFRESH');
      throw error;
    }
  }, [agencyId, refreshStations, refreshVehicles, refreshRoutes, refreshStopTimes]);

  // Auto-refresh management using store methods
  const startAutoRefresh = useCallback(() => {
    if (state.isAutoRefreshEnabled) {
      logger.debug('Auto-refresh already enabled', {}, 'MODERN_REFRESH');
      return;
    }

    // Use store's auto-refresh system
    vehicleStore.startAutoRefresh();
    
    setState(prev => ({ ...prev, isAutoRefreshEnabled: true }));
    
    logger.info('Auto-refresh started via store', {}, 'MODERN_REFRESH');
  }, [state.isAutoRefreshEnabled, vehicleStore]);

  const stopAutoRefresh = useCallback(() => {
    if (!state.isAutoRefreshEnabled) {
      logger.debug('Auto-refresh already disabled', {}, 'MODERN_REFRESH');
      return;
    }

    // Use store's auto-refresh system
    vehicleStore.stopAutoRefresh();
    
    setState(prev => ({ ...prev, isAutoRefreshEnabled: false }));
    
    logger.info('Auto-refresh stopped via store', {}, 'MODERN_REFRESH');
  }, [state.isAutoRefreshEnabled, vehicleStore]);

  const toggleAutoRefresh = useCallback(() => {
    if (state.isAutoRefreshEnabled) {
      stopAutoRefresh();
    } else {
      startAutoRefresh();
    }
  }, [state.isAutoRefreshEnabled, startAutoRefresh, stopAutoRefresh]);

  // Cleanup on unmount - delegate to store
  useEffect(() => {
    return () => {
      // Store handles its own cleanup
      logger.debug('Modern refresh system unmounting', {}, 'MODERN_REFRESH');
    };
  }, []);

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
    
    // Data access from stores
    stations: dataState.stations,
    vehicles: dataState.vehicles,
    routes: dataState.routes,
    stopTimes: dataState.stopTimes
  };
};