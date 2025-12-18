import { useState, useEffect, useCallback, useRef } from 'react';
import { useVehicleStore } from '../../stores/vehicleStore';
import type { StopTime } from '../../types/tranzyApi';
import type { DataHookResult } from '../../types/dataHooks';
import { logger } from '../../utils/logger';

/**
 * Configuration options for useStopTimesStoreData hook
 */
export interface UseStopTimesStoreDataOptions {
  agencyId?: string;
  tripId?: string;
  stopId?: string;
  forceRefresh?: boolean;
  cacheMaxAge?: number; // milliseconds
  autoRefresh?: boolean; // Enable automatic refresh for real-time updates
  refreshInterval?: number; // milliseconds
}

/**
 * Store-based hook for reactive stop times data access
 * Replaces useStopTimesData with store-based architecture
 * 
 * Features:
 * - Reactive subscriptions to store state
 * - Same interface as original useStopTimesData hook
 * - Automatic store method calls for data fetching
 * - Loading states and error handling
 * - Auto-refresh support through store
 * - Trip and stop filtering
 * 
 * @param options Configuration options
 * @returns Stop times data with loading states and error information
 */
export const useStopTimesStoreData = (options: UseStopTimesStoreDataOptions = {}): DataHookResult<StopTime[]> => {
  const {
    agencyId,
    tripId,
    stopId,
    forceRefresh = false,
    cacheMaxAge = 2 * 60 * 1000, // 2 minutes default for schedule data
    autoRefresh = false, // Disabled by default for schedule data
    refreshInterval = 5 * 60 * 1000 // 5 minutes default refresh interval
  } = options;

  // Local state for hook interface compatibility
  const [data, setData] = useState<StopTime[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Store subscriptions
  const vehicleStore = useVehicleStore();
  const storeError = useVehicleStore((state) => state.error);
  const storeIsLoading = useVehicleStore((state) => state.isLoading);

  // Refs for cleanup and auto-refresh
  const refreshIntervalRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Fetch stop times data using store method
   */
  const fetchStopTimesData = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      logger.debug('Fetching stop times data via store method', {
        agencyId,
        tripId,
        stopId,
        forceRefresh
      }, 'useStopTimesStoreData');

      const result = await vehicleStore.getStopTimesData({
        agencyId,
        tripId,
        stopId,
        forceRefresh,
        cacheMaxAge,
        autoRefresh,
        refreshInterval
      });

      if (!isMountedRef.current) return;

      if (result.error) {
        // Convert ErrorState to Error for hook interface compatibility
        const error = new Error(result.error.message);
        setError(error);
        setData(null);
      } else {
        setData(result.data);
        setError(null);
      }
      
      setLastUpdated(result.lastUpdated);

      logger.debug('Stop times data fetched successfully via store', {
        count: result.data?.length || 0,
        hasError: !!result.error
      }, 'useStopTimesStoreData');

    } catch (fetchError) {
      if (!isMountedRef.current) return;

      const error = fetchError instanceof Error 
        ? fetchError 
        : new Error('Failed to fetch stop times data from store');
      
      setError(error);
      setData(null);
      logger.error('Stop times data fetch failed via store', { 
        error: error.message 
      }, 'useStopTimesStoreData');
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [vehicleStore, agencyId, tripId, stopId, forceRefresh, cacheMaxAge, autoRefresh, refreshInterval]);

  /**
   * Refetch function for manual refresh
   */
  const refetch = useCallback(async (): Promise<void> => {
    if (isLoading) {
      logger.debug('Refetch ignored - already loading', {}, 'useStopTimesStoreData');
      return;
    }

    await fetchStopTimesData();
  }, [isLoading, fetchStopTimesData]);

  /**
   * Setup automatic refresh for real-time updates
   */
  const setupAutoRefresh = useCallback(() => {
    if (!autoRefresh || refreshInterval <= 0) {
      return;
    }

    // Clear existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Set up new interval
    refreshIntervalRef.current = setInterval(async () => {
      if (!isLoading && isMountedRef.current) {
        try {
          logger.debug('Auto-refreshing stop times data via store', { 
            interval: refreshInterval 
          }, 'useStopTimesStoreData');
          
          await fetchStopTimesData();
        } catch (fetchError) {
          // Don't update error state on auto-refresh failures to avoid UI flicker
          logger.warn('Auto-refresh failed via store', { 
            error: fetchError instanceof Error ? fetchError.message : String(fetchError) 
          }, 'useStopTimesStoreData');
        }
      }
    }, refreshInterval);

    logger.debug('Auto-refresh setup via store', { interval: refreshInterval }, 'useStopTimesStoreData');
  }, [autoRefresh, refreshInterval, isLoading, fetchStopTimesData]);

  /**
   * Subscribe to store state changes for reactive updates
   */
  useEffect(() => {
    // Sync store error state
    if (storeError && !error) {
      // Convert ErrorState to Error for hook interface compatibility
      const errorObj = new Error(storeError.message);
      setError(errorObj);
    }

    // Sync store loading state
    if (storeIsLoading !== isLoading) {
      setIsLoading(storeIsLoading);
    }
  }, [storeError, storeIsLoading, error, isLoading]);

  /**
   * Initial data fetch effect
   */
  useEffect(() => {
    isMountedRef.current = true;

    const loadInitialData = async () => {
      // Always fetch stop times data as it's not stored in the main store state
      // Stop times are typically cached by the API service layer
      await fetchStopTimesData();
    };

    loadInitialData();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchStopTimesData]);

  /**
   * Auto-refresh setup effect
   */
  useEffect(() => {
    setupAutoRefresh();

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [setupAutoRefresh]);

  /**
   * Cleanup effect
   */
  useEffect(() => {
    return () => {
      // Clear refresh intervals
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      isMountedRef.current = false;
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch,
    lastUpdated
  };
};