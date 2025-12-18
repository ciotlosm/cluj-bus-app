import { useState, useEffect, useCallback, useRef } from 'react';
import { useVehicleStore } from '../../stores/vehicleStore';
import type { Route } from '../../types/tranzyApi';
import type { DataHookResult } from '../../types/dataHooks';
import { logger } from '../../utils/logger';

/**
 * Configuration options for useRouteStoreData hook
 */
export interface UseRouteStoreDataOptions {
  agencyId?: string;
  forceRefresh?: boolean;
  cacheMaxAge?: number; // milliseconds
}

/**
 * Store-based hook for reactive route data access
 * Replaces useRouteData with store-based architecture
 * 
 * Features:
 * - Reactive subscriptions to store state
 * - Same interface as original useRouteData hook
 * - Automatic store method calls for data fetching
 * - Loading states and error handling
 * - Route metadata processing and validation
 * - Caching through store
 * 
 * @param options Configuration options
 * @returns Route data with loading states and error information
 */
export const useRouteStoreData = (options: UseRouteStoreDataOptions = {}): DataHookResult<Route[]> => {
  const {
    agencyId,
    forceRefresh = false,
    cacheMaxAge = 10 * 60 * 1000 // 10 minutes default for route data
  } = options;

  // Local state for hook interface compatibility
  const [data, setData] = useState<Route[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Store subscriptions
  const vehicleStore = useVehicleStore();
  const storeError = useVehicleStore((state) => state.error);
  const storeIsLoading = useVehicleStore((state) => state.isLoading);

  // Refs for cleanup
  const isMountedRef = useRef(true);

  /**
   * Fetch route data using store method
   */
  const fetchRouteData = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      logger.debug('Fetching route data via store method', {
        agencyId,
        forceRefresh
      }, 'useRouteStoreData');

      const result = await vehicleStore.getRouteData({
        agencyId,
        forceRefresh,
        cacheMaxAge
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

      logger.debug('Route data fetched successfully via store', {
        count: result.data?.length || 0,
        hasError: !!result.error
      }, 'useRouteStoreData');

    } catch (fetchError) {
      if (!isMountedRef.current) return;

      const error = fetchError instanceof Error 
        ? fetchError 
        : new Error('Failed to fetch route data from store');
      
      setError(error);
      setData(null);
      logger.error('Route data fetch failed via store', { 
        error: error.message 
      }, 'useRouteStoreData');
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [vehicleStore, agencyId, forceRefresh, cacheMaxAge]);

  /**
   * Refetch function for manual refresh
   */
  const refetch = useCallback(async (): Promise<void> => {
    if (isLoading) {
      logger.debug('Refetch ignored - already loading', {}, 'useRouteStoreData');
      return;
    }

    await fetchRouteData();
  }, [isLoading, fetchRouteData]);

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
      // Always fetch route data as it's not stored in the main store state
      // Routes are typically cached by the API service layer
      await fetchRouteData();
    };

    loadInitialData();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchRouteData]);

  /**
   * Cleanup effect
   */
  useEffect(() => {
    return () => {
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