/**
 * React Hook for Nearby View Controller Integration
 * 
 * This hook provides a React interface to the NearbyViewController,
 * integrating it with existing vehicle processing systems and providing
 * clean state management for components.
 * 
 * Requirements: 6.5 - Integration with existing vehicle processing systems
 */

import * as React from 'react';
import { useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  nearbyViewController,
  createNearbyViewController,
  type NearbyViewOptions,
  type NearbyViewResult,
  type NearbyViewError,
  NearbyViewErrorType
} from '../../controllers/nearbyViewController';
import { useLocationStore } from '../../stores/locationStore';
import { useConfigStore } from '../../stores/configStore';
import { useVehicleStore } from '../../stores/vehicleStore';
import { useStoreEvents, StoreEvents } from '../../stores/shared/storeEvents';
import { getEffectiveLocation } from '../../utils/locationUtils';
import { logger } from '../../utils/logger';
import { 
  createErrorContextWithOfflineState,
  shouldTriggerOfflineMode,
  getUserFriendlyErrorMessage,
  getActionableInstructions
} from '../../utils/nearbyViewErrorHandler';

// Import store-based data hooks
import { useStationStoreData } from '../shared/useStationStoreData';
import { useVehicleStoreData } from '../shared/useVehicleStoreData';
import { useRouteStoreData } from '../shared/useRouteStoreData';
import { useStopTimesStoreData } from '../shared/useStopTimesStoreData';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Hook options for nearby view controller
 */
export interface UseNearbyViewControllerOptions extends NearbyViewOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableCaching?: boolean;
  cacheMaxAge?: number;
}

/**
 * Hook result interface
 */
export interface UseNearbyViewControllerResult extends NearbyViewResult {
  refresh: () => Promise<void>;
  resetStability: () => void;
  updateOptions: (options: Partial<NearbyViewOptions>) => void;
  isRefreshing: boolean;
  lastRefresh: Date | null;
}

/**
 * Internal hook state
 */
interface HookState {
  result: NearbyViewResult | null;
  isRefreshing: boolean;
  lastRefresh: Date | null;
  error: NearbyViewError | null;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * React hook for nearby view controller integration
 * 
 * Provides a clean interface for components to use nearby view functionality
 * while integrating with existing data hooks and state management.
 * 
 * @param options - Configuration options for the hook and controller
 * @returns Hook result with nearby view data and control functions
 * 
 * Requirements 6.5: Clean integration with existing vehicle processing
 */
export const useNearbyViewController = (
  options: UseNearbyViewControllerOptions = {}
): UseNearbyViewControllerResult => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    enableCaching = true,
    cacheMaxAge = 60000, // 1 minute
    ...controllerOptions
  } = options;

  // Get initial state from stores
  const { currentLocation: initialLocation } = useLocationStore();
  const { config: initialConfig } = useConfigStore();
  const { error: vehicleError, isOnline, isUsingCachedData, lastUpdate, lastCacheUpdate } = useVehicleStore();
  
  // Use local state to track changes via events
  const [currentLocation, setCurrentLocation] = React.useState(initialLocation);
  const [config, setConfig] = React.useState(initialConfig);
  
  // Subscribe to store events for reactive updates
  useStoreEvents([
    {
      event: StoreEvents.LOCATION_CHANGED,
      handler: React.useCallback((data: any) => {
        setCurrentLocation(data.location);
      }, [])
    },
    {
      event: StoreEvents.CONFIG_CHANGED,
      handler: React.useCallback((data: any) => {
        setConfig(data.config);
      }, [])
    }
  ], []);

  // Get effective location with fallback priority
  const effectiveLocationForDisplay = getEffectiveLocation(
    currentLocation,
    config?.homeLocation,
    config?.workLocation,
    config?.defaultLocation
  );

  // Get agency ID for data hooks
  const agencyId = config?.agencyId;
  const isConfigured = !!agencyId;

  // Create controller instance with options
  const controller = useMemo(() => {
    return createNearbyViewController(controllerOptions);
  }, [
    controllerOptions.enableSecondStation,
    controllerOptions.customDistanceThreshold,
    controllerOptions.stabilityMode,
    controllerOptions.maxSearchRadius,
    controllerOptions.maxVehiclesPerStation,
    controllerOptions.requireActiveRoutes,
    controllerOptions.enableStabilityTracking
  ]);

  // Stabilize options to prevent hook recreation
  const stationDataOptions = React.useMemo(() => ({
    agencyId,
    forceRefresh: false,
    cacheMaxAge: enableCaching ? cacheMaxAge : 0
  }), [agencyId, enableCaching, cacheMaxAge]);

  // Store-based data hooks - fetch all required data
  const stationDataResult = useStationStoreData(stationDataOptions);

  const vehicleDataResult = useVehicleStoreData({
    agencyId,
    forceRefresh: false,
    cacheMaxAge: 30 * 1000, // 30 seconds for live data
    autoRefresh: autoRefresh,
    refreshInterval: refreshInterval
  });

  const routeDataResult = useRouteStoreData({
    agencyId,
    forceRefresh: false,
    cacheMaxAge: enableCaching ? cacheMaxAge : 0
  });

  const stopTimesDataResult = useStopTimesStoreData({
    agencyId,
    forceRefresh: false,
    cacheMaxAge: enableCaching ? Math.min(cacheMaxAge, 2 * 60 * 1000) : 0 // Max 2 minutes for stop times
  });

  // Debug: Check what stationDataResult contains
  React.useEffect(() => {
    logger.debug('useNearbyViewController data extraction', {
      stationDataResult: {
        data: stationDataResult.data ? `Array(${stationDataResult.data.length})` : stationDataResult.data,
        isLoading: stationDataResult.isLoading,
        error: stationDataResult.error?.message,
        lastUpdated: stationDataResult.lastUpdated
      },
      agencyId,
      isConfigured
    }, 'useNearbyViewController');
  }, [stationDataResult.data, stationDataResult.isLoading, stationDataResult.error, agencyId, isConfigured]);

  // Extract data with fallbacks
  const stations = stationDataResult.data || [];
  const vehicles = vehicleDataResult.data || [];
  const routes = routeDataResult.data || [];
  const stopTimes = stopTimesDataResult.data || [];

  // Aggregate loading states
  const isLoadingData = stationDataResult.isLoading || 
                       vehicleDataResult.isLoading || 
                       routeDataResult.isLoading || 
                       stopTimesDataResult.isLoading;

  // Hook state management
  const [state, setState] = React.useState<HookState>({
    result: null,
    isRefreshing: false,
    lastRefresh: null,
    error: null
  });

  // Refs for cleanup and control
  const refreshTimeoutRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const isProcessingRef = useRef(false);

  // Process nearby view data
  const processNearbyView = useCallback(async (forceRefresh = false): Promise<void> => {
    // Prevent multiple simultaneous processing calls
    if (isProcessingRef.current) {
      return;
    }

    // Skip if not configured or no location
    if (!isConfigured || !effectiveLocationForDisplay) {
      const errorType = !isConfigured ? NearbyViewErrorType.CONFIGURATION_ERROR : NearbyViewErrorType.NO_GPS_LOCATION;
      const error: NearbyViewError = {
        type: errorType,
        message: !isConfigured ? 'Agency not configured' : 'GPS location not available',
        fallbackAction: 'show_message',
        retryable: !isConfigured,
        context: {
          isConfigured,
          hasLocation: !!effectiveLocationForDisplay,
          agencyId,
          hasDefaultLocation: !!(config?.defaultLocation || config?.homeLocation || config?.workLocation)
        }
      };

      // Create enhanced error context with offline state
      const errorContext = createErrorContextWithOfflineState(
        {
          userLocation: effectiveLocationForDisplay,
          stationsCount: stations.length,
          routesCount: routes.length,
          vehiclesCount: vehicles.length,
          hasGTFSData: stopTimes.length > 0,
          isConfigured,
          retryCount: 0
        },
        {
          isOnline,
          isApiOnline: isOnline, // Use isOnline as fallback for isApiOnline
          isUsingCachedData,
          lastApiSuccess: lastUpdate, // Use lastUpdate as fallback for lastApiSuccess
          lastCacheUpdate
        }
      );

      // Get user-friendly error message
      const userMessage = getUserFriendlyErrorMessage(error, errorContext);
      const actionableInstructions = getActionableInstructions(error, errorContext);

      logger.debug('Nearby view validation failed', {
        errorType: error.type,
        userMessage,
        actionableInstructions,
        errorContext
      });

      setState(prev => ({
        ...prev,
        result: {
          selectedStations: { closestStation: null, secondStation: null, rejectedStations: [] },
          stationVehicleGroups: [],
          isLoading: false,
          effectiveLocationForDisplay: null,
          thresholdUsed: controllerOptions.customDistanceThreshold || 200,
          selectionMetadata: {
            totalStationsEvaluated: 0,
            stationsWithRoutes: 0,
            selectionTime: 0,
            stabilityApplied: false
          },
          error
        },
        error
      }));
      return;
    }

    // Skip if still loading data and not forcing refresh
    if (isLoadingData && !forceRefresh) {
      setState(prev => ({
        ...prev,
        result: {
          selectedStations: { closestStation: null, secondStation: null, rejectedStations: [] },
          stationVehicleGroups: [],
          isLoading: true,
          effectiveLocationForDisplay,
          thresholdUsed: controllerOptions.customDistanceThreshold || 200,
          selectionMetadata: {
            totalStationsEvaluated: 0,
            stationsWithRoutes: 0,
            selectionTime: 0,
            stabilityApplied: false
          }
        },
        error: null
      }));
      return;
    }

    // Abort previous request if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Set processing flag
    isProcessingRef.current = true;

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setState(prev => ({ ...prev, isRefreshing: true, error: null }));

      logger.debug('Processing nearby view with controller', {
        location: effectiveLocationForDisplay,
        stationsCount: stations.length,
        vehiclesCount: vehicles.length,
        routesCount: routes.length,
        stopTimesCount: stopTimes.length,
        forceRefresh
      });

      // Process nearby view using controller
      const result = await controller.processNearbyView(
        effectiveLocationForDisplay,
        stations,
        routes,
        vehicles,
        stopTimes.length > 0 ? stopTimes : undefined,
        undefined // trips data not available in current data hooks
      );

      // Check if component is still mounted
      if (!isMountedRef.current) {
        return;
      }

      setState(prev => ({
        ...prev,
        result,
        isRefreshing: false,
        lastRefresh: new Date(),
        error: result.error || null
      }));

      logger.debug('Nearby view processing completed', {
        hasClosestStation: !!result.selectedStations.closestStation,
        hasSecondStation: !!result.selectedStations.secondStation,
        vehicleGroupsCount: result.stationVehicleGroups.length,
        hasError: !!result.error
      });

    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      logger.error('Nearby view processing failed', {
        error: error instanceof Error ? error.message : String(error),
        location: effectiveLocationForDisplay,
        offlineState: {
          isOnline,
          isApiOnline: isOnline,
          isUsingCachedData
        }
      });

      const nearbyError: NearbyViewError = {
        type: NearbyViewErrorType.DATA_LOADING_ERROR,
        message: `Processing failed: ${error instanceof Error ? error.message : String(error)}`,
        fallbackAction: 'retry',
        retryable: true,
        context: {
          originalError: error instanceof Error ? error.message : String(error),
          hasOfflineData: isUsingCachedData,
          isOnline
        }
      };

      // Create enhanced error context
      const errorContext = createErrorContextWithOfflineState(
        {
          userLocation: effectiveLocationForDisplay,
          stationsCount: stations.length,
          routesCount: routes.length,
          vehiclesCount: vehicles.length,
          hasGTFSData: stopTimes.length > 0,
          isConfigured,
          retryCount: state.error?.type === nearbyError.type ? (state.error.context?.retryCount || 0) + 1 : 0
        },
        {
          isOnline,
          isApiOnline: isOnline,
          isUsingCachedData,
          lastApiSuccess: lastUpdate,
          lastCacheUpdate
        }
      );

      // Check if we should trigger offline mode
      if (shouldTriggerOfflineMode(nearbyError, errorContext)) {
        nearbyError.type = NearbyViewErrorType.OFFLINE_MODE;
        nearbyError.message = 'Operating in offline mode with cached data';
        nearbyError.fallbackAction = 'use_cached_data';
      }

      setState(prev => ({
        ...prev,
        result: {
          selectedStations: { closestStation: null, secondStation: null, rejectedStations: [] },
          stationVehicleGroups: [],
          isLoading: false,
          effectiveLocationForDisplay,
          thresholdUsed: controllerOptions.customDistanceThreshold || 200,
          selectionMetadata: {
            totalStationsEvaluated: 0,
            stationsWithRoutes: 0,
            selectionTime: 0,
            stabilityApplied: false
          },
          error: nearbyError
        },
        isRefreshing: false,
        error: nearbyError
      }));
    } finally {
      // Always clear processing flag
      isProcessingRef.current = false;
    }
  }, [
    isConfigured,
    effectiveLocationForDisplay,
    stations?.length,
    vehicles?.length,
    routes?.length,
    stopTimes?.length,
    isLoadingData,
    controller,
    controllerOptions.customDistanceThreshold,
    agencyId
  ]);

  // Auto-refresh effect
  useEffect(() => {
    // Prevent infinite loops by checking if we have stable data
    if (isLoadingData || !isConfigured || !effectiveLocationForDisplay) {
      return;
    }

    if (autoRefresh && refreshInterval > 0) {
      const scheduleRefresh = () => {
        refreshTimeoutRef.current = window.setTimeout(() => {
          processNearbyView(false);
          scheduleRefresh(); // Schedule next refresh
        }, refreshInterval);
      };

      // Initial processing
      processNearbyView(false);
      
      // Schedule first refresh
      scheduleRefresh();

      return () => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
      };
    } else {
      // Process once if auto-refresh is disabled
      processNearbyView(false);
    }
  }, [autoRefresh, refreshInterval, isLoadingData, isConfigured, effectiveLocationForDisplay]); // Added guards to prevent infinite loop

  // Cleanup effect
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      isProcessingRef.current = false;
      
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Manual refresh function
  const refresh = useCallback(async (): Promise<void> => {
    await processNearbyView(true);
  }, []); // Removed processNearbyView dependency to prevent infinite loop

  // Reset stability context
  const resetStability = useCallback((): void => {
    controller.resetStabilityContext();
    logger.debug('Stability context reset via hook');
  }, [controller]);

  // Update controller options
  const updateOptions = useCallback((newOptions: Partial<NearbyViewOptions>): void => {
    controller.updateOptions(newOptions);
    logger.debug('Controller options updated via hook', { newOptions });
  }, [controller]);

  // Create result object
  const result: UseNearbyViewControllerResult = useMemo(() => {
    const baseResult = state.result || {
      selectedStations: { closestStation: null, secondStation: null, rejectedStations: [] },
      stationVehicleGroups: [],
      isLoading: isLoadingData,
      effectiveLocationForDisplay,
      thresholdUsed: controllerOptions.customDistanceThreshold || 200,
      selectionMetadata: {
        totalStationsEvaluated: 0,
        stationsWithRoutes: 0,
        selectionTime: 0,
        stabilityApplied: false
      },
      error: state.error || undefined
    };

    return {
      ...baseResult,
      refresh,
      resetStability,
      updateOptions,
      isRefreshing: state.isRefreshing,
      lastRefresh: state.lastRefresh
    };
  }, [
    state.result,
    state.isRefreshing,
    state.lastRefresh,
    state.error,
    isLoadingData,
    effectiveLocationForDisplay,
    controllerOptions.customDistanceThreshold,
    refresh,
    resetStability,
    updateOptions
  ]);

  return result;
};

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Simplified hook for basic nearby view functionality
 * 
 * @param options - Basic configuration options
 * @returns Simplified result with essential data
 */
export const useNearbyView = (options: Partial<NearbyViewOptions> = {}) => {
  const result = useNearbyViewController({
    ...options,
    autoRefresh: true,
    refreshInterval: 30000,
    enableCaching: true
  });

  return {
    stationGroups: result.stationVehicleGroups,
    isLoading: result.isLoading,
    error: result.error,
    effectiveLocation: result.effectiveLocationForDisplay,
    refresh: result.refresh
  };
};

/**
 * Hook for nearby view with custom stability settings
 * 
 * @param stabilityMode - Stability mode configuration
 * @param customThreshold - Custom distance threshold
 * @returns Nearby view result with stability configuration
 */
export const useStableNearbyView = (
  stabilityMode: 'strict' | 'normal' | 'flexible' = 'normal',
  customThreshold?: number
) => {
  return useNearbyViewController({
    stabilityMode,
    customDistanceThreshold: customThreshold,
    enableStabilityTracking: true,
    autoRefresh: true,
    refreshInterval: 30000
  });
};