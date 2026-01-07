// Manual Refresh Service - Coordinates refresh across all stores
// Handles network connectivity checks and error handling for API failures
// Ensures refresh operations are atomic and prevent concurrent executions

import { RefreshOrchestrator, type RefreshResult, type RefreshOptions } from '../utils/core/refreshOrchestrator';

// Re-export types for backward compatibility
export type { RefreshResult, RefreshOptions };

class ManualRefreshService {
  private isRefreshing = false;
  private refreshPromise: Promise<RefreshResult> | null = null;
  private currentProgress: { [storeName: string]: 'starting' | 'completed' | 'error' } = {};
  private progressCallbacks: Set<(progress: { [storeName: string]: 'starting' | 'completed' | 'error' }) => void> = new Set();

  /**
   * Performs manual refresh of all stores with network connectivity checks
   * Ensures atomic operations and prevents concurrent executions
   */
  async refreshAllStores(options: RefreshOptions = {}): Promise<RefreshResult> {
    // Prevent concurrent refresh operations
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
    // Reset progress tracking
    this.currentProgress = {};
    this.notifyProgressCallbacks();
    
    // Use shared orchestrator with progress callback
    const result = await RefreshOrchestrator.refreshStores({
      ...options,
      onProgress: (storeName, status) => {
        this.currentProgress[storeName] = status;
        this.notifyProgressCallbacks();
      }
    });
    
    // Clear progress tracking immediately when refresh completes
    this.currentProgress = {};
    this.notifyProgressCallbacks();
    
    return result;
  }

  private notifyProgressCallbacks(): void {
    this.progressCallbacks.forEach(callback => {
      try {
        callback({ ...this.currentProgress });
      } catch (error) {
        console.warn('Error in progress callback:', error);
      }
    });
  }

  /**
   * Refresh only vehicle data for high-priority updates
   */
  async refreshVehicleData(): Promise<RefreshResult> {
    // Use the same unified refresh mechanism with progress tracking
    return this.refreshAllStores({ vehiclesOnly: true });
  }

  /**
   * Checks if a manual refresh operation is currently in progress
   */
  isRefreshInProgress(): boolean {
    return this.isRefreshing;
  }

  /**
   * Subscribe to refresh progress updates
   */
  subscribeToProgress(callback: (progress: { [storeName: string]: 'starting' | 'completed' | 'error' }) => void): () => void {
    this.progressCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.progressCallbacks.delete(callback);
    };
  }

  /**
   * Get current refresh progress
   */
  getCurrentProgress(): { [storeName: string]: 'starting' | 'completed' | 'error' } {
    return { ...this.currentProgress };
  }

  /**
   * Gets the current network connectivity status
   */
  isNetworkAvailable(): boolean {
    return RefreshOrchestrator.isNetworkAvailable();
  }
}

// Export singleton instance
export const manualRefreshService = new ManualRefreshService();