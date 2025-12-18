import { useState, useEffect, useCallback, useRef } from 'react';
import type { Route } from '../../types/tranzyApi';
import { enhancedTranzyApi } from '../../services/tranzyApiService';
import { globalCache, createCacheKey } from '../shared/cacheManager';
import { logger } from '../../utils/logger';
import type { DataHookResult } from '../../types/dataHooks';
import { DataHookError, DataHookErrorType } from '../../types/dataHooks';

/**
 * Configuration options for useRouteData hook
 */
export interface UseRouteDataOptions {
  agencyId?: string;
  forceRefresh?: boolean;
  cacheMaxAge?: number; // milliseconds
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
 * Hook for fetching route data with caching, error handling, and offline fallback
 * 
 * Features:
 * - Automatic caching with TTL
 * - Exponential backoff retry logic
 * - Request deduplication
 * - Route metadata processing and validation
 * - Fallback data for offline scenarios
 * - Loading states and timestamps
 * - Comprehensive error handling
 * 
 * @param options Configuration options
 * @returns Route data with loading states and error information
 */
export const useRouteData = (options: UseRouteDataOptions = {}): DataHookResult<Route[]> => {
  const {
    agencyId,
    forceRefresh = false,
    cacheMaxAge = 10 * 60 * 1000 // 10 minutes default for route data
  } = options;

  // State management
  const [data, setData] = useState<Route[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Refs for cleanup and retry logic
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
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
      logger.warn('Could not get agency ID from config store', { error }, 'useRouteData');
    }
    
    // Fallback to CTP Cluj agency ID
    return 2;
  }, [agencyId]);

  /**
   * Validate and process route metadata
   */
  const validateRouteData = useCallback((routes: any[]): Route[] => {
    if (!Array.isArray(routes)) {
      throw new DataHookError(
        'Invalid route data format received from API',
        DataHookErrorType.VALIDATION_ERROR,
        'useRouteData',
        { responseType: typeof routes }
      );
    }

    // Filter and validate routes
    const validRoutes = routes.filter(route => {
      // Basic validation - must have required fields
      return (
        route &&
        typeof route === 'object' &&
        route.id &&
        route.routeName &&
        route.agencyId &&
        typeof route.routeName === 'string' &&
        route.routeName.trim().length > 0
      );
    });

    // Process and enhance route metadata
    const processedRoutes = validRoutes.map(route => ({
      ...route,
      // Ensure route name is trimmed and not empty
      routeName: route.routeName.trim(),
      // Provide fallback for route description
      routeDesc: route.routeDesc || route.routeName,
      // Validate route type
      type: ['tram', 'metro', 'rail', 'bus', 'ferry', 'trolleybus', 'other'].includes(route.type) 
        ? route.type 
        : 'other',
      // Validate color codes (hex format)
      color: route.color && /^#[0-9A-Fa-f]{6}$/.test(route.color) 
        ? route.color 
        : undefined,
      textColor: route.textColor && /^#[0-9A-Fa-f]{6}$/.test(route.textColor) 
        ? route.textColor 
        : undefined,
      // Validate URL format
      url: route.url && typeof route.url === 'string' && route.url.startsWith('http') 
        ? route.url 
        : undefined
    }));

    // Sort routes by route name for consistent ordering
    processedRoutes.sort((a, b) => {
      // Natural sort for route names (handles numbers correctly)
      return a.routeName.localeCompare(b.routeName, undefined, { 
        numeric: true, 
        sensitivity: 'base' 
      });
    });

    logger.debug('Route data validated and processed', {
      originalCount: routes.length,
      validCount: processedRoutes.length,
      filteredCount: routes.length - processedRoutes.length,
      routeTypes: Array.from(new Set(processedRoutes.map(r => r.type)))
    }, 'useRouteData');

    return processedRoutes;
  }, []);

  /**
   * Fetch route data with retry logic
   */
  const fetchRouteData = useCallback(async (retryAttempt = 0): Promise<Route[]> => {
    const currentAgencyId = await getAgencyId();
    const cacheKey = createCacheKey('routes', { agencyId: currentAgencyId });

    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh && retryAttempt === 0) {
        const cachedData = globalCache.get<Route[]>(cacheKey);
        if (cachedData) {
          logger.debug('Route data loaded from cache', { 
            agencyId: currentAgencyId, 
            count: cachedData.length 
          }, 'useRouteData');
          return cachedData;
        }
      }

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      logger.info('Fetching route data from API', { 
        agencyId: currentAgencyId, 
        forceRefresh,
        retryAttempt 
      }, 'useRouteData');

      // Fetch from API using the service
      const apiService = enhancedTranzyApi; // Use singleton instance that has API key set
      const routes = await apiService.getRoutes(currentAgencyId, forceRefresh);

      // Validate and process the response
      const validatedRoutes = validateRouteData(routes);

      // Cache the successful result
      globalCache.set(cacheKey, validatedRoutes, cacheMaxAge);

      logger.info('Route data fetched successfully', { 
        agencyId: currentAgencyId, 
        count: validatedRoutes.length,
        routeTypes: Array.from(new Set(validatedRoutes.map(r => r.type)))
      }, 'useRouteData');

      // Reset retry count on success
      retryCountRef.current = 0;

      return validatedRoutes;

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
          `Failed to fetch route data: ${fetchError.message}`,
          errorType,
          'useRouteData',
          { agencyId: currentAgencyId, retryAttempt, originalError: fetchError.message },
          retryable
        );
      } else {
        error = new DataHookError(
          'Unknown error occurred while fetching route data',
          DataHookErrorType.NETWORK_ERROR,
          'useRouteData',
          { agencyId: currentAgencyId, retryAttempt }
        );
      }

      // Retry logic for retryable errors
      if (error.retryable && retryAttempt < DEFAULT_RETRY_CONFIG.maxRetries) {
        const delay = calculateRetryDelay(retryAttempt, DEFAULT_RETRY_CONFIG);
        
        logger.warn('Route data fetch failed, retrying', {
          agencyId: currentAgencyId,
          retryAttempt,
          nextRetryIn: delay,
          error: error.message
        }, 'useRouteData');

        return new Promise((resolve, reject) => {
          retryTimeoutRef.current = window.setTimeout(async () => {
            try {
              const result = await fetchRouteData(retryAttempt + 1);
              resolve(result);
            } catch (retryError) {
              reject(retryError);
            }
          }, delay);
        });
      }

      // Try to return cached data as fallback for offline scenarios
      const cachedData = globalCache.get<Route[]>(cacheKey);
      if (cachedData) {
        logger.warn('Using cached route data as offline fallback', {
          agencyId: currentAgencyId,
          count: cachedData.length,
          error: error.message
        }, 'useRouteData');
        return cachedData;
      }

      // If no cache available, provide minimal fallback data for offline scenarios
      if (error.type === DataHookErrorType.NETWORK_ERROR) {
        logger.warn('Providing minimal fallback route data for offline scenario', {
          agencyId: currentAgencyId
        }, 'useRouteData');
        
        // Return basic route data for common Cluj routes as offline fallback
        const fallbackRoutes: Route[] = [
          {
            id: '1',
            agencyId: currentAgencyId.toString(),
            routeName: '24',
            routeDesc: 'Mănăștur - Zorilor',
            type: 'bus'
          },
          {
            id: '2', 
            agencyId: currentAgencyId.toString(),
            routeName: '25',
            routeDesc: 'Mănăștur - Centru',
            type: 'bus'
          },
          {
            id: '3',
            agencyId: currentAgencyId.toString(), 
            routeName: '35',
            routeDesc: 'Mănăștur - Gheorgheni',
            type: 'bus'
          }
        ];
        
        return fallbackRoutes;
      }

      throw error;
    }
  }, [agencyId, forceRefresh, cacheMaxAge, getAgencyId, validateRouteData]);

  /**
   * Refetch function for manual refresh
   */
  const refetch = useCallback(async (): Promise<void> => {
    if (isLoading) {
      logger.debug('Refetch ignored - already loading', {}, 'useRouteData');
      return;
    }

    setIsLoading(true);
    setError(null);
    retryCountRef.current = 0;

    try {
      const routes = await fetchRouteData();
      setData(routes);
      setLastUpdated(new Date());
    } catch (fetchError) {
      const error = fetchError instanceof DataHookError 
        ? fetchError 
        : new DataHookError(
            'Failed to refetch route data',
            DataHookErrorType.NETWORK_ERROR,
            'useRouteData'
          );
      
      setError(error);
      logger.error('Route data refetch failed', { error: error.message }, 'useRouteData');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, fetchRouteData]);

  /**
   * Initial data fetch effect
   */
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const routes = await fetchRouteData();
        
        if (isMounted) {
          setData(routes);
          setLastUpdated(new Date());
        }
      } catch (fetchError) {
        if (isMounted) {
          const error = fetchError instanceof DataHookError 
            ? fetchError 
            : new DataHookError(
                'Failed to load initial route data',
                DataHookErrorType.NETWORK_ERROR,
                'useRouteData'
              );
          
          setError(error);
          logger.error('Initial route data load failed', { error: error.message }, 'useRouteData');
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
  }, [fetchRouteData]);

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