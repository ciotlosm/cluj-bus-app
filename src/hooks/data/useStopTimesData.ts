import { useState, useEffect, useCallback, useRef } from 'react';
import type { StopTime } from '../../types/tranzyApi';
import { enhancedTranzyApi } from '../../services/tranzyApiService';
import { globalCache, createCacheKey } from '../shared/cacheManager';
import { logger } from '../../utils/logger';
import type { DataHookResult } from '../../types/dataHooks';
import { DataHookError, DataHookErrorType } from '../../types/dataHooks';

/**
 * Configuration options for useStopTimesData hook
 */
export interface UseStopTimesDataOptions {
  agencyId?: string;
  tripId?: string;
  stopId?: string;
  forceRefresh?: boolean;
  cacheMaxAge?: number; // milliseconds
  autoRefresh?: boolean; // Enable automatic refresh for real-time updates
  refreshInterval?: number; // milliseconds
}

/**
 * Exponential backoff configuration
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffFactor: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2
};

/**
 * Calculate delay for exponential backoff with jitter
 */
const calculateRetryDelay = (attempt: number, config: RetryConfig): number => {
  const exponentialDelay = Math.min(
    config.baseDelay * Math.pow(config.backoffFactor, attempt),
    config.maxDelay
  );
  
  // Add jitter (±25% of the delay)
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.max(0, exponentialDelay + jitter);
};

/**
 * Hook for fetching stop times data with trip and stop filtering
 * 
 * Features:
 * - Stop times data fetching with trip and stop filtering
 * - Schedule data processing and validation
 * - Real-time updates integration with automatic refresh
 * - Automatic caching with TTL
 * - Exponential backoff retry logic
 * - Request deduplication
 * - Loading states and timestamps
 * - Comprehensive error handling
 * 
 * @param options Configuration options
 * @returns Stop times data with loading states and error information
 */
export const useStopTimesData = (options: UseStopTimesDataOptions = {}): DataHookResult<StopTime[]> => {
  const {
    agencyId,
    tripId,
    stopId,
    forceRefresh = false,
    cacheMaxAge = 2 * 60 * 1000, // 2 minutes default for schedule data
    autoRefresh = false, // Disabled by default for schedule data
    refreshInterval = 5 * 60 * 1000 // 5 minutes default refresh interval
  } = options;

  // State management
  const [data, setData] = useState<StopTime[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Refs for cleanup and retry logic
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const refreshIntervalRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);

  /**
   * Get configured agency ID from config store or use provided one
   */
  const getAgencyId = useCallback(async (): Promise<number> => {
    if (agencyId) {
      return parseInt(agencyId);
    }

    try {
      // Dynamic import to avoid circular dependencies
      const { useConfigStore } = await import('../../stores/configStore');
      const config = useConfigStore.getState().config;
      
      if (config?.agencyId) {
        return parseInt(config.agencyId);
      }
    } catch (error) {
      logger.warn('Could not get agency ID from config store', { error }, 'useStopTimesData');
    }
    
    // Fallback to CTP Cluj agency ID
    return 2;
  }, [agencyId]);

  /**
   * Validate time format and handle edge cases
   */
  const validateTimeFormat = useCallback((timeStr: string): string => {
    if (!timeStr || typeof timeStr !== 'string') {
      return '00:00:00';
    }

    // Check if it matches HH:MM:SS format (including times > 24:00:00)
    const timeRegex = /^(\d{1,2}):(\d{2}):(\d{2})$/;
    const match = timeStr.match(timeRegex);
    
    if (!match) {
      logger.warn('Invalid time format, using default', { timeStr }, 'useStopTimesData');
      return '00:00:00';
    }

    const [, hours, minutes, seconds] = match;
    const h = parseInt(hours);
    const m = parseInt(minutes);
    const s = parseInt(seconds);

    // Validate ranges (allow hours > 23 for next-day times)
    if (h < 0 || m < 0 || m > 59 || s < 0 || s > 59) {
      logger.warn('Invalid time values, using default', { timeStr, h, m, s }, 'useStopTimesData');
      return '00:00:00';
    }

    // Format with leading zeros
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  /**
   * Validate and process stop times data
   */
  const validateStopTimesData = useCallback((stopTimes: any[]): StopTime[] => {
    if (!Array.isArray(stopTimes)) {
      throw new DataHookError(
        'Invalid stop times data format received from API',
        DataHookErrorType.VALIDATION_ERROR,
        'useStopTimesData',
        { responseType: typeof stopTimes }
      );
    }

    // Filter and validate stop times
    const validStopTimes = stopTimes.filter(stopTime => {
      // Basic validation - must have required fields
      return (
        stopTime &&
        typeof stopTime === 'object' &&
        stopTime.tripId &&
        stopTime.stopId &&
        stopTime.arrivalTime &&
        stopTime.departureTime &&
        typeof stopTime.sequence === 'number' &&
        stopTime.sequence >= 0
      );
    });

    // Process and enhance stop times data
    const processedStopTimes = validStopTimes.map(stopTime => ({
      ...stopTime,
      // Ensure IDs are strings
      tripId: stopTime.tripId.toString(),
      stopId: stopTime.stopId.toString(),
      // Validate time format (HH:MM:SS)
      arrivalTime: validateTimeFormat(stopTime.arrivalTime),
      departureTime: validateTimeFormat(stopTime.departureTime),
      // Ensure sequence is a valid number
      sequence: Math.max(0, parseInt(stopTime.sequence) || 0),
      // Clean up headsign
      headsign: stopTime.headsign ? stopTime.headsign.trim() : undefined,
      // Validate boolean fields with safe defaults
      isPickupAvailable: stopTime.isPickupAvailable !== false, // Default to true
      isDropOffAvailable: stopTime.isDropOffAvailable !== false // Default to true
    }));

    // Sort by trip ID and then by sequence for consistent ordering
    processedStopTimes.sort((a, b) => {
      const tripCompare = a.tripId.localeCompare(b.tripId);
      if (tripCompare !== 0) return tripCompare;
      return a.sequence - b.sequence;
    });

    // Filter out duplicate entries (same trip, stop, and sequence)
    const uniqueStopTimes = processedStopTimes.filter((stopTime, index, array) => {
      return index === 0 || !(
        stopTime.tripId === array[index - 1].tripId &&
        stopTime.stopId === array[index - 1].stopId &&
        stopTime.sequence === array[index - 1].sequence
      );
    });

    logger.debug('Stop times data validated and processed', {
      originalCount: stopTimes.length,
      validCount: uniqueStopTimes.length,
      filteredCount: stopTimes.length - uniqueStopTimes.length,
      duplicatesRemoved: processedStopTimes.length - uniqueStopTimes.length
    }, 'useStopTimesData');

    return uniqueStopTimes;
  }, []);

  /**
   * Fetch stop times data with retry logic
   */
  const fetchStopTimesData = useCallback(async (retryAttempt = 0): Promise<StopTime[]> => {
    const currentAgencyId = await getAgencyId();
    const currentStopId = stopId ? parseInt(stopId) : undefined;
    const cacheKey = createCacheKey('stop_times', { 
      agencyId: currentAgencyId, 
      stopId: currentStopId,
      tripId: tripId
    });

    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh && retryAttempt === 0) {
        const cachedData = globalCache.get<StopTime[]>(cacheKey);
        if (cachedData) {
          logger.debug('Stop times data loaded from cache', { 
            agencyId: currentAgencyId, 
            stopId: currentStopId,
            tripId: tripId,
            count: cachedData.length 
          }, 'useStopTimesData');
          return cachedData;
        }
      }

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      logger.info('Fetching stop times data from API', { 
        agencyId: currentAgencyId, 
        stopId: currentStopId,
        tripId: tripId,
        forceRefresh,
        retryAttempt 
      }, 'useStopTimesData');

      // Fetch from API using the service
      const apiService = enhancedTranzyApi; // Use singleton instance that has API key set
      const stopTimes = await apiService.getStopTimes(currentAgencyId, currentStopId, tripId, forceRefresh);

      // Validate and process the response
      const validatedStopTimes = validateStopTimesData(stopTimes);

      // Cache the successful result
      globalCache.set(cacheKey, validatedStopTimes, cacheMaxAge);

      logger.info('Stop times data fetched successfully', { 
        agencyId: currentAgencyId, 
        stopId: currentStopId,
        tripId: tripId,
        count: validatedStopTimes.length 
      }, 'useStopTimesData');

      // Reset retry count on success
      retryCountRef.current = 0;

      return validatedStopTimes;

    } catch (fetchError) {
      // Handle different types of errors
      let error: DataHookError;

      if (fetchError instanceof DataHookError) {
        error = fetchError;
      } else if (fetchError instanceof Error) {
        // Determine error type based on error characteristics
        let errorType = DataHookErrorType.NETWORK_ERROR;
        let retryable = true;

        if (fetchError.message.includes('401') || fetchError.message.includes('403')) {
          errorType = DataHookErrorType.AUTHENTICATION_ERROR;
          retryable = false;
        } else if (fetchError.message.includes('400') || fetchError.message.includes('404')) {
          errorType = DataHookErrorType.VALIDATION_ERROR;
          retryable = false;
        } else if (fetchError.message.includes('validation') || fetchError.message.includes('format')) {
          errorType = DataHookErrorType.VALIDATION_ERROR;
          retryable = false;
        }

        error = new DataHookError(
          `Failed to fetch stop times data: ${fetchError.message}`,
          errorType,
          'useStopTimesData',
          { 
            agencyId: currentAgencyId, 
            stopId: currentStopId,
            tripId: tripId,
            retryAttempt, 
            originalError: fetchError.message 
          },
          retryable
        );
      } else {
        error = new DataHookError(
          'Unknown error occurred while fetching stop times data',
          DataHookErrorType.NETWORK_ERROR,
          'useStopTimesData',
          { agencyId: currentAgencyId, stopId: currentStopId, tripId: tripId, retryAttempt }
        );
      }

      // Retry logic for retryable errors
      if (error.retryable && retryAttempt < DEFAULT_RETRY_CONFIG.maxRetries) {
        const delay = calculateRetryDelay(retryAttempt, DEFAULT_RETRY_CONFIG);
        
        logger.warn('Stop times data fetch failed, retrying', {
          agencyId: currentAgencyId,
          stopId: currentStopId,
          tripId: tripId,
          retryAttempt,
          nextRetryIn: delay,
          error: error.message
        }, 'useStopTimesData');

        return new Promise((resolve, reject) => {
          retryTimeoutRef.current = setTimeout(async () => {
            try {
              const result = await fetchStopTimesData(retryAttempt + 1);
              resolve(result);
            } catch (retryError) {
              reject(retryError);
            }
          }, delay);
        });
      }

      // Try to return cached data as fallback
      const cachedData = globalCache.get<StopTime[]>(cacheKey);
      if (cachedData) {
        logger.warn('Using cached stop times data as fallback', {
          agencyId: currentAgencyId,
          stopId: currentStopId,
          tripId: tripId,
          count: cachedData.length,
          error: error.message
        }, 'useStopTimesData');
        return cachedData;
      }

      throw error;
    }
  }, [agencyId, stopId, tripId, forceRefresh, cacheMaxAge, getAgencyId, validateStopTimesData, validateTimeFormat]);

  /**
   * Refetch function for manual refresh
   */
  const refetch = useCallback(async (): Promise<void> => {
    if (isLoading) {
      logger.debug('Refetch ignored - already loading', {}, 'useStopTimesData');
      return;
    }

    setIsLoading(true);
    setError(null);
    retryCountRef.current = 0;

    try {
      const stopTimes = await fetchStopTimesData();
      setData(stopTimes);
      setLastUpdated(new Date());
    } catch (fetchError) {
      const error = fetchError instanceof DataHookError 
        ? fetchError 
        : new DataHookError(
            'Failed to refetch stop times data',
            DataHookErrorType.NETWORK_ERROR,
            'useStopTimesData'
          );
      
      setError(error);
      logger.error('Stop times data refetch failed', { error: error.message }, 'useStopTimesData');
    } finally {
      setIsLoading(false);
    }
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
      if (!isLoading) {
        try {
          logger.debug('Auto-refreshing stop times data', { 
            interval: refreshInterval 
          }, 'useStopTimesData');
          
          const stopTimes = await fetchStopTimesData();
          setData(stopTimes);
          setLastUpdated(new Date());
          setError(null);
        } catch (fetchError) {
          // Don't update error state on auto-refresh failures to avoid UI flicker
          logger.warn('Auto-refresh failed', { 
            error: fetchError instanceof Error ? fetchError.message : String(fetchError) 
          }, 'useStopTimesData');
        }
      }
    }, refreshInterval);

    logger.debug('Auto-refresh setup', { interval: refreshInterval }, 'useStopTimesData');
  }, [autoRefresh, refreshInterval, isLoading, fetchStopTimesData]);

  /**
   * Initial data fetch effect
   */
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const stopTimes = await fetchStopTimesData();
        
        if (isMounted) {
          setData(stopTimes);
          setLastUpdated(new Date());
        }
      } catch (fetchError) {
        if (isMounted) {
          const error = fetchError instanceof DataHookError 
            ? fetchError 
            : new DataHookError(
                'Failed to load initial stop times data',
                DataHookErrorType.NETWORK_ERROR,
                'useStopTimesData'
              );
          
          setError(error);
          logger.error('Initial stop times data load failed', { error: error.message }, 'useStopTimesData');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
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
      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Clear retry timeouts
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      // Clear refresh intervals
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
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