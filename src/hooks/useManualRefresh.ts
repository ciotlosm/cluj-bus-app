// useManualRefresh Hook - React hook for manual refresh functionality
// Provides reactive state management for refresh operations and network status

import { useState, useCallback, useEffect } from 'react';
import { type RefreshResult, type RefreshOptions } from '../utils/core/refreshOrchestrator';
import { useStatusStore } from '../stores/statusStore';
import { manualRefreshService } from '../services/manualRefreshService';

interface UseManualRefreshReturn {
  // State
  isRefreshing: boolean;
  isNetworkAvailable: boolean;
  lastRefreshResult: RefreshResult | null;
  
  // Actions
  refreshAll: (options?: RefreshOptions) => Promise<RefreshResult>;
  refreshVehicles: () => Promise<RefreshResult>;
  
  // Status helpers
  canRefresh: boolean;
}

/**
 * Hook for managing manual refresh operations
 * Provides reactive state and actions for triggering data refresh
 */
export function useManualRefresh(): UseManualRefreshReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshResult, setLastRefreshResult] = useState<RefreshResult | null>(null);
  
  // Subscribe to network status from StatusStore
  const networkOnline = useStatusStore(state => state.networkOnline);
  const apiStatus = useStatusStore(state => state.apiStatus);
  
  const isNetworkAvailable = networkOnline && apiStatus !== 'offline';
  const canRefresh = isNetworkAvailable && !isRefreshing;

  // Refresh all stores - simplified to just call service
  const refreshAll = useCallback(async (options?: RefreshOptions): Promise<RefreshResult> => {
    const result = await manualRefreshService.refreshAllStores(options);
    setLastRefreshResult(result);
    return result;
  }, []);

  // Refresh only vehicle data - simplified to just call service
  const refreshVehicles = useCallback(async (): Promise<RefreshResult> => {
    const result = await manualRefreshService.refreshVehicleData();
    setLastRefreshResult(result);
    return result;
  }, []);

  // Sync with service state
  useEffect(() => {
    const checkServiceState = () => {
      const serviceIsRefreshing = manualRefreshService.isRefreshInProgress();
      setIsRefreshing(serviceIsRefreshing);
    };

    // Check immediately
    checkServiceState();

    // Set up periodic check to stay in sync
    const interval = setInterval(checkServiceState, 100);

    return () => clearInterval(interval);
  }, []);

  return {
    // State
    isRefreshing,
    isNetworkAvailable,
    lastRefreshResult,
    
    // Actions
    refreshAll,
    refreshVehicles,
    
    // Status helpers
    canRefresh
  };
}