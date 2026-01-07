// Shared Refresh Orchestrator - Eliminates duplication between automatic and manual refresh
// Provides common store refresh coordination and error handling

import { useVehicleStore } from '../../stores/vehicleStore';
import { useStationStore } from '../../stores/stationStore';
import { useRouteStore } from '../../stores/routeStore';
import { useShapeStore } from '../../stores/shapeStore';
import { useStopTimeStore } from '../../stores/stopTimeStore';
import { useTripStore } from '../../stores/tripStore';
import { useStatusStore } from '../../stores/statusStore';

export interface RefreshResult {
  success: boolean;
  errors: string[];
  refreshedStores: string[];
  skippedStores: string[];
}

export interface RefreshOptions {
  skipIfFresh?: boolean;
  vehiclesOnly?: boolean;
  onProgress?: (storeName: string, status: 'starting' | 'completed' | 'error') => void;
}

/**
 * Registry of all stores with their refresh methods
 * Single source of truth to eliminate duplication
 */
const STORE_REGISTRY = [
  { name: 'vehicles', store: useVehicleStore },
  { name: 'stations', store: useStationStore },
  { name: 'routes', store: useRouteStore },
  { name: 'shapes', store: useShapeStore },
  { name: 'stopTimes', store: useStopTimeStore },
  { name: 'trips', store: useTripStore }
] as const;

/**
 * Shared refresh orchestrator used by both automatic and manual refresh services
 */
export class RefreshOrchestrator {
  /**
   * Check if network is available for refresh operations
   */
  static isNetworkAvailable(): boolean {
    const statusStore = useStatusStore.getState();
    return statusStore.networkOnline && statusStore.apiStatus !== 'offline';
  }

  /**
   * Refresh stores based on options
   * Used by both automatic and manual refresh services
   */
  static async refreshStores(options: RefreshOptions = {}): Promise<RefreshResult> {
    const result: RefreshResult = {
      success: true,
      errors: [],
      refreshedStores: [],
      skippedStores: []
    };

    // Check network connectivity
    if (!this.isNetworkAvailable()) {
      result.success = false;
      result.errors.push('Network unavailable');
      return result;
    }

    // Filter stores based on options
    let storesToRefresh: typeof STORE_REGISTRY[number][] = [...STORE_REGISTRY];
    
    if (options.vehiclesOnly) {
      storesToRefresh = STORE_REGISTRY.filter(s => s.name === 'vehicles');
    }

    // Refresh each store
    for (const { name, store } of storesToRefresh) {
      try {
        const storeState = store.getState();
        
        // Skip if fresh and option is set
        if (options.skipIfFresh && storeState.isDataFresh?.()) {
          result.skippedStores.push(name);
          continue;
        }

        // Notify progress callback
        options.onProgress?.(name, 'starting');

        await storeState.refreshData();
        result.refreshedStores.push(name);
        
        // Notify completion
        options.onProgress?.(name, 'completed');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`${name}: ${errorMessage}`);
        result.success = false;
        
        // Notify error
        options.onProgress?.(name, 'error');
      }
    }

    return result;
  }

  /**
   * Get list of all store names for external use
   */
  static getStoreNames(): string[] {
    return STORE_REGISTRY.map(s => s.name);
  }
}