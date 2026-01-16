// Manual Refresh Service - Single entry point for all refresh operations
// Handles network connectivity checks and prevents concurrent executions

import { useVehicleStore } from '../stores/vehicleStore';
import { useStationStore } from '../stores/stationStore';
import { useRouteStore } from '../stores/routeStore';
import { useShapeStore } from '../stores/shapeStore';
import { useStopTimeStore } from '../stores/stopTimeStore';
import { useTripStore } from '../stores/tripStore';
import { useStationRoleStore } from '../stores/stationRoleStore';
import { useStatusStore } from '../stores/statusStore';
import { IN_MEMORY_CACHE_DURATIONS } from '../utils/core/constants';

export interface RefreshResult {
  success: boolean;
  errors: string[];
  refreshedStores: string[];
  skippedStores: string[];
}

export interface RefreshOptions {
  // No options needed - stores handle their own freshness logic
}

class ManualRefreshService {
  private isRefreshing = false;
  private refreshPromise: Promise<RefreshResult> | null = null;
  private currentProgress: { [storeName: string]: 'starting' | 'completed' | 'error' } = {};
  private progressCallbacks: Set<(progress: { [storeName: string]: 'starting' | 'completed' | 'error' }) => void> = new Set();

  async refreshData(options: RefreshOptions = {}): Promise<RefreshResult> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performRefresh(options);
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performRefresh(options: RefreshOptions): Promise<RefreshResult> {
    const result: RefreshResult = {
      success: true,
      errors: [],
      refreshedStores: [],
      skippedStores: []
    };

    if (!this.isNetworkAvailable()) {
      result.success = false;
      result.errors.push('Network unavailable');
      return result;
    }

    this.currentProgress = {};
    this.notifyProgressCallbacks();

    // Check freshness before refreshing each store
    const stores = [
      { name: 'vehicles', store: useVehicleStore, maxAge: IN_MEMORY_CACHE_DURATIONS.VEHICLES },
      { name: 'stations', store: useStationStore, maxAge: IN_MEMORY_CACHE_DURATIONS.STATIC_DATA },
      { name: 'routes', store: useRouteStore, maxAge: IN_MEMORY_CACHE_DURATIONS.STATIC_DATA },
      { name: 'shapes', store: useShapeStore, maxAge: IN_MEMORY_CACHE_DURATIONS.STATIC_DATA },
      { name: 'stopTimes', store: useStopTimeStore, maxAge: IN_MEMORY_CACHE_DURATIONS.STATIC_DATA },
      { name: 'trips', store: useTripStore, maxAge: IN_MEMORY_CACHE_DURATIONS.STATIC_DATA }
    ];

    for (const { name, store, maxAge } of stores) {
      try {
        const storeState = store.getState();
        
        // Check if data is fresh - skip refresh if so
        if (storeState.isDataFresh && storeState.isDataFresh(maxAge)) {
          result.skippedStores.push(name);
          
          // Still show progress for skipped stores to give user feedback
          this.currentProgress[name] = 'starting';
          this.notifyProgressCallbacks();
          
          // Brief delay to show the user something happened
          await new Promise(resolve => setTimeout(resolve, 150));
          
          this.currentProgress[name] = 'completed';
          this.notifyProgressCallbacks();
          continue;
        }
        
        this.currentProgress[name] = 'starting';
        this.notifyProgressCallbacks();

        // Call refreshData() method - always refreshes when called
        await storeState.refreshData();
        result.refreshedStores.push(name);
        
        this.currentProgress[name] = 'completed';
        this.notifyProgressCallbacks();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`${name}: ${errorMessage}`);
        result.success = false;
        
        this.currentProgress[name] = 'error';
        this.notifyProgressCallbacks();
      }
    }
    
    // Calculate station roles after trips and stopTimes are loaded
    // This needs to happen after both trips and stopTimes are available
    const tripsLoaded = result.refreshedStores.includes('trips') || result.skippedStores.includes('trips');
    const stopTimesLoaded = result.refreshedStores.includes('stopTimes') || result.skippedStores.includes('stopTimes');
    
    if (tripsLoaded && stopTimesLoaded) {
      try {
        const stationRoleStore = useStationRoleStore.getState();
        
        // Only calculate if data is stale or missing
        if (!stationRoleStore.isDataFresh(IN_MEMORY_CACHE_DURATIONS.STATIC_DATA)) {
          this.currentProgress['stationRoles'] = 'starting';
          this.notifyProgressCallbacks();
          
          await stationRoleStore.calculateStationRoles();
          
          this.currentProgress['stationRoles'] = 'completed';
          this.notifyProgressCallbacks();
        }
      } catch (error) {
        console.warn('Failed to calculate station roles:', error);
        this.currentProgress['stationRoles'] = 'error';
        this.notifyProgressCallbacks();
      }
    }
    
    this.currentProgress = {};
    this.notifyProgressCallbacks();
    
    return result;
  }

  // Remove redundant methods - only refreshData() is needed
  // Stores handle their own freshness logic via isDataFresh() checks

  private notifyProgressCallbacks(): void {
    this.progressCallbacks.forEach(callback => {
      try {
        callback({ ...this.currentProgress });
      } catch (error) {
        console.warn('Error in progress callback:', error);
      }
    });
  }

  isRefreshInProgress(): boolean {
    return this.isRefreshing;
  }

  subscribeToProgress(callback: (progress: { [storeName: string]: 'starting' | 'completed' | 'error' }) => void): () => void {
    this.progressCallbacks.add(callback);
    return () => {
      this.progressCallbacks.delete(callback);
    };
  }

  getCurrentProgress(): { [storeName: string]: 'starting' | 'completed' | 'error' } {
    return { ...this.currentProgress };
  }

  isNetworkAvailable(): boolean {
    const statusStore = useStatusStore.getState();
    return statusStore.networkOnline && statusStore.apiStatus !== 'offline';
  }
}

const refreshService = new ManualRefreshService();
export { refreshService as manualRefreshService };