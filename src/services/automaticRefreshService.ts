// Automatic Refresh Service - Handles automatic refresh timers and app lifecycle
// Requirements: 7.1, 7.2, 7.3, 7.4, 7.5

import { useStatusStore } from '../stores/statusStore';
import { manualRefreshService } from './manualRefreshService';
import { AUTO_REFRESH_CYCLE } from '../utils/core/constants';

interface AutoRefreshConfig {
  vehicleRefreshInterval: number;
  enableBackgroundRefresh: boolean;
}

class AutomaticRefreshService {
  private vehicleRefreshTimer: NodeJS.Timeout | null = null;
  private networkStatusUnsubscribe: (() => void) | null = null;
  private isAppInForeground = true;
  private hasInitializedStartup = false;
  private config: AutoRefreshConfig;

  constructor(config: Partial<AutoRefreshConfig> = {}) {
    this.config = {
      vehicleRefreshInterval: AUTO_REFRESH_CYCLE,
      enableBackgroundRefresh: false,
      ...config
    };

    this.setupVisibilityHandling();
    this.setupNetworkStatusMonitoring();
  }

  /**
   * Initialize the automatic refresh system
   * Requirement 7.1: Cache-first startup strategy
   */
  async initialize(): Promise<void> {
    if (this.hasInitializedStartup) {
      return;
    }

    this.hasInitializedStartup = true;

    // Start background refresh immediately (components handle their own cache loading)
    this.startBackgroundRefresh();

    // Start vehicle refresh timer if in foreground
    if (this.isAppInForeground) {
      this.startVehicleRefreshTimer();
    }
  }

  /**
   * Start background refresh with network connectivity check
   * Requirements 7.3, 7.4: Fetch fresh data when network is available
   */
  private async startBackgroundRefresh(): Promise<void> {
    if (!manualRefreshService.isNetworkAvailable()) {
      // Network not available, wait for connectivity
      return;
    }

    try {
      // Single refresh call - no duplicate calls needed
      await manualRefreshService.refreshData();
    } catch (error) {
      console.warn('Background refresh failed:', error);
    }
  }

  /**
   * Remove unused loadCachedDataOnStartup method
   * Components now handle their own cache loading via Zustand persist
   */

  /**
   * Start automatic vehicle refresh timer
   * Requirement 7.2: 1-minute automatic refresh for vehicle data when in foreground
   */
  private startVehicleRefreshTimer(): void {
    if (this.vehicleRefreshTimer) {
      return; // Timer already running
    }

    this.vehicleRefreshTimer = setInterval(async () => {
      // Only refresh if app is in foreground and network is available
      if (!this.isAppInForeground) {
        return;
      }

      const statusStore = useStatusStore.getState();
      if (!statusStore.networkOnline) {
        return;
      }

      try {
        // Use the same unified refresh mechanism for consistency
        // This ensures proper button state management and timer coordination
        await this.triggerManualRefresh();
      } catch (error) {
        console.warn('Automatic vehicle refresh failed:', error);
      }
    }, this.config.vehicleRefreshInterval);
  }

  /**
   * Stop automatic vehicle refresh timer
   */
  private stopVehicleRefreshTimer(): void {
    if (this.vehicleRefreshTimer) {
      clearInterval(this.vehicleRefreshTimer);
      this.vehicleRefreshTimer = null;
    }
  }

  /**
   * Setup app visibility change handling
   * Requirement 7.4: Handle app visibility changes for timer management
   */
  private setupVisibilityHandling(): void {
    // Handle page visibility changes
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      this.handleAppVisibilityChange(isVisible);
    };

    // Handle window focus/blur events
    const handleFocus = () => this.handleAppVisibilityChange(true);
    const handleBlur = () => this.handleAppVisibilityChange(false);

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Store cleanup functions
    this.cleanupVisibilityHandlers = () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }

  private cleanupVisibilityHandlers: (() => void) | null = null;

  /**
   * Handle app visibility changes
   */
  private handleAppVisibilityChange(isVisible: boolean): void {
    const wasInForeground = this.isAppInForeground;
    this.isAppInForeground = isVisible;

    if (isVisible && !wasInForeground) {
      // App came to foreground
      this.onAppForeground();
    } else if (!isVisible && wasInForeground) {
      // App went to background
      this.onAppBackground();
    }
  }

  /**
   * Handle app coming to foreground
   */
  private async onAppForeground(): Promise<void> {
    // Start vehicle refresh timer
    this.startVehicleRefreshTimer();

    // Check if any data is stale and refresh if needed
    await this.refreshStaleDataOnForeground();
  }

  /**
   * Handle app going to background
   */
  private onAppBackground(): void {
    // Stop vehicle refresh timer to save battery
    if (!this.config.enableBackgroundRefresh) {
      this.stopVehicleRefreshTimer();
    }
  }

  /**
   * Refresh stale data when app comes to foreground
   * Requirement 7.5: Automatic refresh for stale data when network becomes available
   */
  private async refreshStaleDataOnForeground(): Promise<void> {
    if (!manualRefreshService.isNetworkAvailable()) {
      return;
    }

    try {
      // Use the same unified refresh mechanism for consistency
      await this.triggerManualRefresh();
    } catch (error) {
      console.warn('Failed to refresh stale data on foreground:', error);
    }
  }

  /**
   * Setup network status monitoring
   * Requirement 7.4: Automatic refresh when network becomes available
   */
  private setupNetworkStatusMonitoring(): void {
    // Subscribe to network status changes
    this.networkStatusUnsubscribe = useStatusStore.subscribe((state, prevState) => {
      // Network became available
      if (state.networkOnline && !prevState.networkOnline) {
        this.onNetworkAvailable();
      }
    });
  }

  /**
   * Handle network becoming available
   */
  private async onNetworkAvailable(): Promise<void> {
    if (!this.hasInitializedStartup) {
      return;
    }

    try {
      // Use the same unified refresh mechanism for consistency
      await this.triggerManualRefresh();
    } catch (error) {
      console.warn('Failed to refresh data when network became available:', error);
    }
  }

  /**
   * Manually trigger a refresh and reset the automatic timer
   * This should be called by the manual refresh button to keep both systems in sync
   */
  async triggerManualRefresh(): Promise<void> {
    try {
      // Stop current timer
      this.stopVehicleRefreshTimer();
      
      // Trigger the same refresh logic used by automatic refresh
      await manualRefreshService.refreshData();
      
      // Restart timer (resets the countdown)
      if (this.isAppInForeground) {
        this.startVehicleRefreshTimer();
      }
    } catch (error) {
      // Restart timer even if refresh failed
      if (this.isAppInForeground) {
        this.startVehicleRefreshTimer();
      }
      throw error; // Re-throw for button to handle
    }
  }

  /**
   * Check if automatic refresh is currently active
   */
  isActive(): boolean {
    return this.vehicleRefreshTimer !== null;
  }

  /**
   * Get current configuration
   */
  getConfig(): AutoRefreshConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AutoRefreshConfig>): void {
    const oldConfig = this.config;
    this.config = { ...this.config, ...newConfig };

    // Restart timer if interval changed
    if (oldConfig.vehicleRefreshInterval !== this.config.vehicleRefreshInterval) {
      if (this.vehicleRefreshTimer) {
        this.stopVehicleRefreshTimer();
        if (this.isAppInForeground) {
          this.startVehicleRefreshTimer();
        }
      }
    }
  }

  /**
   * Cleanup all timers and event listeners
   */
  destroy(): void {
    // Stop timers
    this.stopVehicleRefreshTimer();

    // Cleanup network status subscription
    if (this.networkStatusUnsubscribe) {
      this.networkStatusUnsubscribe();
      this.networkStatusUnsubscribe = null;
    }

    // Cleanup visibility handlers
    if (this.cleanupVisibilityHandlers) {
      this.cleanupVisibilityHandlers();
      this.cleanupVisibilityHandlers = null;
    }

    this.hasInitializedStartup = false;
  }
}

// Export singleton instance
export const automaticRefreshService = new AutomaticRefreshService();

// Export types for use in components
export type { AutoRefreshConfig };