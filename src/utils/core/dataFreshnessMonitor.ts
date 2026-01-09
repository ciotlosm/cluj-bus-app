// Data Freshness Monitor - Event-based staleness checking for UI updates
// Eliminates periodic timers, checks staleness on refresh triggers and view changes
// Requirements: 3.1, 3.2, 3.3, 3.4, 3.5

import { useVehicleStore } from '../../stores/vehicleStore';
import { useStationStore } from '../../stores/stationStore';
import { useRouteStore } from '../../stores/routeStore';
import { useShapeStore } from '../../stores/shapeStore';
import { useStopTimeStore } from '../../stores/stopTimeStore';
import { useTripStore } from '../../stores/tripStore';
import { manualRefreshService } from '../../services/manualRefreshService';
import { AUTO_REFRESH_CYCLE, STALENESS_THRESHOLDS } from './constants';

/**
 * Interface for store timestamps read from all stores
 */
export interface StoreTimestamps {
  vehicles: number | null;
  stations: number | null;
  routes: number | null;
  shapes: number | null;
  stopTimes: number | null;
  trips: number | null;
}

/**
 * Data freshness status interface
 */
export interface DataFreshnessStatus {
  status: 'fresh' | 'stale';
  vehicleDataAge: number;
  staticDataAge: number;
  isRefreshing: boolean;
  nextVehicleRefresh: number; // seconds until next auto-refresh
}

/**
 * Event-based Data Freshness Monitor
 * No periodic timers - checks staleness on demand and via events
 */
export class DataFreshnessMonitor {
  private subscribers: Set<(status: DataFreshnessStatus) => void> = new Set();
  private unsubscribeFunctions: (() => void)[] = [];
  private lastVehicleRefresh: number = Date.now();

  constructor() {
    this.setupStoreSubscriptions();
    // No periodic timer - event-based only
  }

  /**
   * Read timestamps from all stores
   * Requirement 3.1: Monitor SHALL read timestamps from store data
   */
  private readStoreTimestamps(): StoreTimestamps {
    return {
      vehicles: useVehicleStore.getState().lastUpdated,
      stations: useStationStore.getState().lastUpdated,
      routes: useRouteStore.getState().lastUpdated,
      shapes: useShapeStore.getState().lastUpdated,
      stopTimes: useStopTimeStore.getState().lastUpdated,
      trips: useTripStore.getState().lastUpdated,
    };
  }

  /**
   * Calculate freshness status based on defined thresholds
   * Requirements 3.2, 3.3: Calculate staleness based on 5min/24hr thresholds
   */
  calculateFreshness(): DataFreshnessStatus {
    const timestamps = this.readStoreTimestamps();
    const now = Date.now();

    // Calculate vehicle data age (most critical)
    const vehicleAge = timestamps.vehicles ? now - timestamps.vehicles : Infinity;
    const isVehicleDataStale = vehicleAge > STALENESS_THRESHOLDS.VEHICLES;

    // Calculate static data age (stations, routes, shapes, stopTimes, trips)
    const staticDataAges = [
      timestamps.stations ? now - timestamps.stations : Infinity,
      timestamps.routes ? now - timestamps.routes : Infinity,
      timestamps.shapes ? now - timestamps.shapes : Infinity,
      timestamps.stopTimes ? now - timestamps.stopTimes : Infinity,
      timestamps.trips ? now - timestamps.trips : Infinity,
    ];

    const maxStaticDataAge = Math.max(...staticDataAges);
    const isStaticDataStale = maxStaticDataAge > STALENESS_THRESHOLDS.STATIC_DATA;

    // Overall status is stale if either vehicle or static data is stale
    const status = isVehicleDataStale || isStaticDataStale ? 'stale' : 'fresh';

    // Check if any store is currently refreshing
    const isRefreshing = this.isAnyStoreRefreshing();

    // Calculate next vehicle refresh countdown
    const timeSinceLastVehicleRefresh = now - this.lastVehicleRefresh;
    const nextVehicleRefresh = Math.max(0, 
      Math.ceil((AUTO_REFRESH_CYCLE - timeSinceLastVehicleRefresh) / 1000)
    );

    return {
      status,
      vehicleDataAge: vehicleAge,
      staticDataAge: maxStaticDataAge,
      isRefreshing,
      nextVehicleRefresh,
    };
  }

  /**
   * Check if any store is currently refreshing
   * Now checks the manual refresh service which handles both manual and automatic refreshes
   */
  private isAnyStoreRefreshing(): boolean {
    // Check manual refresh service state
    return manualRefreshService.isRefreshInProgress();
  }

  /**
   * Subscribe to changes in data freshness status
   * Requirement 3.4: Monitor SHALL update button color when data changes
   */
  subscribeToChanges(callback: (status: DataFreshnessStatus) => void): () => void {
    this.subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers of status changes
   */
  private notifySubscribers(): void {
    const status = this.calculateFreshness();
    this.subscribers.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.warn('Error in freshness monitor subscriber:', error);
      }
    });
  }

  /**
   * Manually trigger staleness check
   * Called on refresh triggers and view changes
   */
  checkStaleness(): void {
    this.notifySubscribers();
  }

  /**
   * Update last vehicle refresh time
   * Called when vehicle refresh completes
   */
  updateVehicleRefreshTime(): void {
    this.lastVehicleRefresh = Date.now();
    this.notifySubscribers();
  }

  /**
   * Setup reactive subscriptions to all stores
   * Requirement 3.4: React to store changes for immediate updates
   */
  private setupStoreSubscriptions(): void {
    // Subscribe to vehicle store changes
    const unsubVehicles = useVehicleStore.subscribe((state, prevState) => {
      if (state.lastUpdated !== prevState.lastUpdated) {
        this.updateVehicleRefreshTime();
      }
    });

    // Subscribe to other stores for lastUpdated changes
    const unsubStations = useStationStore.subscribe((state, prevState) => {
      if (state.lastUpdated !== prevState.lastUpdated) {
        this.notifySubscribers();
      }
    });

    const unsubRoutes = useRouteStore.subscribe((state, prevState) => {
      if (state.lastUpdated !== prevState.lastUpdated) {
        this.notifySubscribers();
      }
    });

    const unsubShapes = useShapeStore.subscribe((state, prevState) => {
      if (state.lastUpdated !== prevState.lastUpdated) {
        this.notifySubscribers();
      }
    });

    const unsubStopTimes = useStopTimeStore.subscribe((state, prevState) => {
      if (state.lastUpdated !== prevState.lastUpdated) {
        this.notifySubscribers();
      }
    });

    const unsubTrips = useTripStore.subscribe((state, prevState) => {
      if (state.lastUpdated !== prevState.lastUpdated) {
        this.notifySubscribers();
      }
    });

    // Store unsubscribe functions for cleanup
    this.unsubscribeFunctions = [
      unsubVehicles,
      unsubStations,
      unsubRoutes,
      unsubShapes,
      unsubStopTimes,
      unsubTrips,
    ];
  }

  /**
   * Cleanup subscriptions
   */
  destroy(): void {
    // Unsubscribe from all stores
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFunctions = [];

    // Clear subscribers
    this.subscribers.clear();
  }
}

/**
 * Singleton instance for global use
 * This ensures consistent monitoring across the application
 */
let globalMonitorInstance: DataFreshnessMonitor | null = null;

/**
 * Get or create the global data freshness monitor instance
 */
export function getDataFreshnessMonitor(): DataFreshnessMonitor {
  if (!globalMonitorInstance) {
    globalMonitorInstance = new DataFreshnessMonitor();
  }
  return globalMonitorInstance;
}

/**
 * Cleanup the global monitor instance (for testing or app shutdown)
 */
export function destroyDataFreshnessMonitor(): void {
  if (globalMonitorInstance) {
    globalMonitorInstance.destroy();
    globalMonitorInstance = null;
  }
}