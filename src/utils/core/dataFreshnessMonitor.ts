// Data Freshness Monitor - Utility for tracking data freshness across all stores
// Provides reactive monitoring and status calculation for manual refresh feature
// Requirements: 3.1, 3.2, 3.3, 3.4, 3.5

import { useVehicleStore } from '../../stores/vehicleStore';
import { useStationStore } from '../../stores/stationStore';
import { useRouteStore } from '../../stores/routeStore';
import { useShapeStore } from '../../stores/shapeStore';
import { useStopTimeStore } from '../../stores/stopTimeStore';
import { useTripStore } from '../../stores/tripStore';
import { manualRefreshService } from '../../services/manualRefreshService';

/**
 * Freshness thresholds based on design requirements
 * Vehicles: 5 minutes, General data: 24 hours
 */
export const FRESHNESS_THRESHOLDS = {
  VEHICLES: 5 * 60 * 1000,      // 5 minutes
  GENERAL_DATA: 24 * 60 * 60 * 1000, // 24 hours
} as const;

/**
 * Auto refresh intervals for monitoring
 */
export const AUTO_REFRESH_INTERVALS = {
  VEHICLES: 60 * 1000,          // 1 minute when in foreground
  STARTUP_DELAY: 2000,          // 2 seconds after app start
  FRESHNESS_CHECK: 30 * 1000,   // 30 seconds for time-based staleness detection
} as const;

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
  generalDataAge: number;
  isRefreshing: boolean;
  nextVehicleRefresh: number; // seconds until next auto-refresh
}

/**
 * Data Freshness Monitor class
 * Operates as a pure status calculator without modifying any data
 */
export class DataFreshnessMonitor {
  private subscribers: Set<(status: DataFreshnessStatus) => void> = new Set();
  private unsubscribeFunctions: (() => void)[] = [];
  private periodicCheckInterval: NodeJS.Timeout | null = null;
  private lastVehicleRefresh: number = Date.now();
  private refreshStartTime: number | null = null;
  private readonly MAX_REFRESH_TIME = 15000; // 15 seconds max refresh time (reduced from 30)

  constructor() {
    this.setupStoreSubscriptions();
    this.startPeriodicCheck();
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
    const isVehicleDataStale = vehicleAge > FRESHNESS_THRESHOLDS.VEHICLES;

    // Calculate general data age (stations, routes, shapes, stopTimes, trips)
    const generalDataAges = [
      timestamps.stations ? now - timestamps.stations : Infinity,
      timestamps.routes ? now - timestamps.routes : Infinity,
      timestamps.shapes ? now - timestamps.shapes : Infinity,
      timestamps.stopTimes ? now - timestamps.stopTimes : Infinity,
      timestamps.trips ? now - timestamps.trips : Infinity,
    ];

    const maxGeneralDataAge = Math.max(...generalDataAges);
    const isGeneralDataStale = maxGeneralDataAge > FRESHNESS_THRESHOLDS.GENERAL_DATA;

    // Overall status is stale if either vehicle or general data is stale
    const status = isVehicleDataStale || isGeneralDataStale ? 'stale' : 'fresh';

    // Check if any store is currently refreshing
    const isRefreshing = this.isAnyStoreRefreshing();

    // Calculate next vehicle refresh countdown
    const timeSinceLastVehicleRefresh = now - this.lastVehicleRefresh;
    const nextVehicleRefresh = Math.max(0, 
      Math.ceil((AUTO_REFRESH_INTERVALS.VEHICLES - timeSinceLastVehicleRefresh) / 1000)
    );

    return {
      status,
      vehicleDataAge: vehicleAge,
      generalDataAge: maxGeneralDataAge,
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
   * Setup reactive subscriptions to all stores
   * Requirement 3.4: React to store changes for immediate updates
   */
  private setupStoreSubscriptions(): void {
    // Subscribe to vehicle store changes
    const unsubVehicles = useVehicleStore.subscribe((state, prevState) => {
      if (state.lastUpdated !== prevState.lastUpdated) {
        this.lastVehicleRefresh = Date.now();
        this.notifySubscribers();
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
   * Start periodic check for time-based staleness detection
   * Requirement 3.5: 30-second periodic check for staleness
   */
  private startPeriodicCheck(): void {
    this.periodicCheckInterval = setInterval(() => {
      this.notifySubscribers();
    }, AUTO_REFRESH_INTERVALS.FRESHNESS_CHECK);
  }

  /**
   * Cleanup subscriptions and intervals
   */
  destroy(): void {
    // Unsubscribe from all stores
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFunctions = [];

    // Clear periodic check
    if (this.periodicCheckInterval) {
      clearInterval(this.periodicCheckInterval);
      this.periodicCheckInterval = null;
    }

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