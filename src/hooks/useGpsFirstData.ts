/**
 * GPS-First Data Loading Hook
 * 
 * React hook that implements the GPS-first data loading approach
 * for reliable first-screen data display.
 * 
 * This hook ensures that:
 * 1. All data is validated before display
 * 2. Only stops with valid trip_ids are considered
 * 3. Routes and vehicles are filtered to relevant data only
 * 4. Second stop selection uses proper distance validation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocationStore } from '../stores/locationStore';
import { useConfigStore } from '../stores/configStore';
import { gpsFirstDataLoader, type GpsFirstDataResult, type GpsFirstDataOptions } from '../services/business-logic/gpsFirstDataLoader';
import { getEffectiveLocation } from '../utils/formatting/locationUtils';
import { logger } from '../utils/shared/logger';

// ============================================================================
// INTERFACES
// ============================================================================

export interface UseGpsFirstDataOptions {
  maxSearchRadius?: number;
  secondStopRadius?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  forceRefresh?: boolean;
}

export interface UseGpsFirstDataResult extends GpsFirstDataResult {
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdate: Date | null;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export const useGpsFirstData = (options: UseGpsFirstDataOptions = {}): UseGpsFirstDataResult => {
  const {
    maxSearchRadius = 1000,
    secondStopRadius = 200,
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    forceRefresh = false
  } = options;

  // Store dependencies
  const { currentLocation } = useLocationStore();
  const { config } = useConfigStore();

  // Hook state
  const [data, setData] = useState<GpsFirstDataResult>({
    primaryStop: null,
    secondaryStop: null,
    availableTrips: [],
    availableRoutes: [],
    vehicles: [],
    enhancedVehicles: [],
    stopTimes: [],
    validationMetadata: {
      totalStopsEvaluated: 0,
      stopsWithValidTrips: 0,
      tripsFound: 0,
      vehiclesFound: 0,
      processingTime: 0
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Refs for cleanup and control
  const refreshTimeoutRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Get effective location with fallback priority
  const effectiveLocation = getEffectiveLocation(
    currentLocation,
    config?.homeLocation,
    config?.workLocation,
    config?.defaultLocation
  );

  // Check if we have required configuration
  const isConfigured = !!(config?.agencyId && effectiveLocation);
  const agencyId = config?.agencyId ? parseInt(config.agencyId) : null;

  // Main data loading function
  const loadData = useCallback(async (force = false): Promise<void> => {
    if (!isConfigured || !agencyId || !effectiveLocation) {
      const missingConfig = [];
      if (!config?.agencyId) missingConfig.push('agencyId');
      if (!effectiveLocation) missingConfig.push('location');
      
      setError(`Configuration incomplete: missing ${missingConfig.join(', ')}`);
      setIsLoading(false);
      return;
    }

    // Abort previous request if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      setError(null);

      logger.debug('Starting GPS-first data loading', {
        location: effectiveLocation,
        agencyId,
        maxSearchRadius,
        secondStopRadius,
        forceRefresh: force
      });

      const loadOptions: GpsFirstDataOptions = {
        userLocation: effectiveLocation,
        agencyId,
        maxSearchRadius,
        secondStopRadius,
        forceRefresh: force
      };

      const result = await gpsFirstDataLoader.loadValidatedData(loadOptions);

      // Check if component is still mounted
      if (!isMountedRef.current) {
        return;
      }

      setData(result);
      setLastUpdate(new Date());
      setIsLoading(false);

      // Log success metrics
      logger.info('GPS-first data loading completed', {
        hasPrimaryStop: !!result.primaryStop,
        hasSecondaryStop: !!result.secondaryStop,
        tripsFound: result.availableTrips.length,
        routesFound: result.availableRoutes.length,
        vehiclesFound: result.vehicles.length,
        processingTime: `${result.validationMetadata.processingTime.toFixed(2)}ms`
      });

    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('GPS-first data loading failed', {
        error: errorMessage,
        location: effectiveLocation,
        agencyId
      });

      setError(errorMessage);
      setIsLoading(false);
    }
  }, [isConfigured, agencyId, effectiveLocation, maxSearchRadius, secondStopRadius]);

  // Manual refresh function
  const refresh = useCallback(async (): Promise<void> => {
    await loadData(true);
  }, [loadData]);

  // Auto-refresh effect
  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    // Initial load
    loadData(forceRefresh);

    // Setup auto-refresh if enabled
    if (autoRefresh && refreshInterval > 0) {
      const scheduleRefresh = () => {
        refreshTimeoutRef.current = window.setTimeout(() => {
          if (isMountedRef.current) {
            loadData(false);
            scheduleRefresh(); // Schedule next refresh
          }
        }, refreshInterval);
      };
      
      scheduleRefresh();
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [
    isConfigured,
    effectiveLocation?.latitude,
    effectiveLocation?.longitude,
    agencyId,
    autoRefresh,
    refreshInterval,
    forceRefresh,
    loadData
  ]);

  // Cleanup effect
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      
      // Clear timeouts
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      
      // Abort pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  return {
    ...data,
    isLoading,
    error,
    refresh,
    lastUpdate
  };
};

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Simplified hook for basic GPS-first data loading
 */
export const useValidatedNearbyData = () => {
  return useGpsFirstData({
    maxSearchRadius: 1000,
    secondStopRadius: 200,
    autoRefresh: true,
    refreshInterval: 30000
  });
};

/**
 * Hook for GPS-first data with custom radius settings
 */
export const useGpsFirstDataWithRadius = (
  maxRadius: number,
  secondRadius: number
) => {
  return useGpsFirstData({
    maxSearchRadius: maxRadius,
    secondStopRadius: secondRadius,
    autoRefresh: true,
    refreshInterval: 30000
  });
};