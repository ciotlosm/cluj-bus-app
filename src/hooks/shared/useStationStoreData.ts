import { useState, useEffect, useCallback, useRef } from 'react';
import { useVehicleStore } from '../../stores/vehicleStore';
import type { Station } from '../../types';
import type { DataHookResult } from '../../types/dataHooks';
import { logger } from '../../utils/logger';

/**
 * Configuration options for useStationStoreData hook
 */
export interface UseStationStoreDataOptions {
  agencyId?: string;
  forceRefresh?: boolean;
  cacheMaxAge?: number; // milliseconds
}

/**
 * Store-based hook for reactive station data access
 * Replaces useStationData with store-based architecture
 * 
 * Features:
 * - Reactive subscriptions to store state
 * - Same interface as original useStationData hook
 * - Automatic store method calls for data fetching
 * - Loading states and error handling
 * - Caching through store
 * 
 * @param options Configuration options
 * @returns Station data with loading states and error information
 */
export const useStationStoreData = (options: UseStationStoreDataOptions = {}): DataHookResult<Station[]> => {
  const {
    agencyId,
    forceRefresh = false,
    cacheMaxAge = 5 * 60 * 1000 // 5 minutes default
  } = options;

  // Local state for hook interface compatibility
  const [data, setData] = useState<Station[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Store subscriptions
  const vehicleStore = useVehicleStore();
  const storeStations = useVehicleStore((state) => state.stations);
  const storeError = useVehicleStore((state) => state.error);
  const storeIsLoading = useVehicleStore((state) => state.isLoading);

  // Refs for cleanup
  const isMountedRef = useRef(true);

  /**
   * Fetch station data using store method
   */
  const fetchStationData = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      logger.debug('Fetching station data via store method', {
        agencyId,
        forceRefresh
      }, 'useStationStoreData');

      const result = await vehicleStore.getStationData({
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

      logger.debug('Station data fetched successfully via store', {
        count: result.data?.length || 0,
        hasError: !!result.error
      }, 'useStationStoreData');

    } catch (fetchError) {
      if (!isMountedRef.current) return;

      const error = fetchError instanceof Error 
        ? fetchError 
        : new Error('Failed to fetch station data from store');
      
      setError(error);
      setData(null);
      logger.error('Station data fetch failed via store', { 
        error: error.message 
      }, 'useStationStoreData');
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
      logger.debug('Refetch ignored - already loading', {}, 'useStationStoreData');
      return;
    }

    await fetchStationData();
  }, [isLoading, fetchStationData]);

  /**
   * Subscribe to store state changes for reactive updates
   */
  useEffect(() => {
    // If store has stations and we don't have local data, use store data
    if (storeStations && storeStations.length > 0 && !data) {
      setData(storeStations);
      setLastUpdated(vehicleStore.lastUpdate);
      
      logger.debug('Using store stations for reactive update', {
        count: storeStations.length
      }, 'useStationStoreData');
    }

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
  }, [storeStations, storeError, storeIsLoading, vehicleStore.lastUpdate, data, error, isLoading]);

  /**
   * Initial data fetch effect
   */
  useEffect(() => {
    isMountedRef.current = true;

    const loadInitialData = async () => {
      // Check if store already has data
      if (storeStations && storeStations.length > 0) {
        setData(storeStations);
        setLastUpdated(vehicleStore.lastUpdate);
        setIsLoading(false);
        
        logger.debug('Using existing store station data', {
          count: storeStations.length
        }, 'useStationStoreData');
        return;
      }

      // Fetch fresh data if store is empty
      await fetchStationData();
    };

    loadInitialData();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchStationData, storeStations, vehicleStore.lastUpdate]);

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