import { useState, useEffect, useCallback, useRef } from 'react';
import { useVehicleStore } from '../../stores/vehicleStore';
import type { Route, StopTime } from '../../types/tranzyApi';
import type { CoreVehicle } from '../../types/coreVehicle';
import type { Station } from '../../types';
import type { VehicleDisplayData } from '../../types/presentationLayer';
import { RouteType } from '../../types';
import { ErrorHandler } from './errors/ErrorHandler';
import type { StandardError } from './errors/types';

import { logger } from '../../utils/shared/logger';

/**
 * Data type mapping for type-safe generic hook usage
 * Maps data type keys to their corresponding TypeScript interfaces
 */
export type DataTypeMap = {
  vehicles: CoreVehicle;
  stations: Station;
  routes: Route;
  stopTimes: StopTime;
};

/**
 * Store method mapping for each data type
 * Maps data type keys to their corresponding store method names
 */
export type StoreMethodMap = {
  vehicles: 'getVehicleData';
  stations: 'getStationData';
  routes: 'getRouteData';
  stopTimes: 'getStopTimesData';
};

/**
 * Configuration schema for each data type
 * Defines required and optional parameters for each data type
 */
export type DataTypeConfigSchema = {
  vehicles: {
    required: ['agencyId'];
    optional: ['routeId', 'forceRefresh', 'cacheMaxAge', 'autoRefresh', 'refreshInterval'];
    filters: ['routeId', 'tripId', 'vehicleId'];
  };
  stations: {
    required: ['agencyId'];
    optional: ['forceRefresh', 'cacheMaxAge'];
    filters: ['stationId', 'coordinates', 'radius'];
  };
  routes: {
    required: ['agencyId'];
    optional: ['forceRefresh', 'cacheMaxAge'];
    filters: ['routeType', 'routeId'];
  };
  stopTimes: {
    required: ['agencyId'];
    optional: ['tripId', 'stopId', 'forceRefresh', 'cacheMaxAge', 'autoRefresh', 'refreshInterval'];
    filters: ['tripId', 'stopId', 'timeRange'];
  };
};

/**
 * Type-safe filter definitions for each data type
 */
export type DataTypeFilters = {
  vehicles: {
    routeId?: string;
    tripId?: string;
    vehicleId?: string;
    coordinates?: { latitude: number; longitude: number; radius: number };
  };
  stations: {
    stationId?: string;
    coordinates?: { latitude: number; longitude: number; radius: number };
  };
  routes: {
    routeType?: RouteType;
    routeId?: string;
  };
  stopTimes: {
    tripId?: string;
    stopId?: string;
    timeRange?: { start: Date; end: Date };
  };
};

/**
 * Enhanced configuration interface for the generic useStoreData hook
 * Uses compile-time type checking to ensure valid configurations
 */
export interface UseStoreDataConfig<T extends keyof DataTypeMap> {
  dataType: T;
  agencyId?: string; // Recommended for proper data fetching
  routeId?: string;
  tripId?: string;
  stopId?: string;
  forceRefresh?: boolean;
  cacheMaxAge?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  filters?: DataTypeFilters[T];
}

/**
 * Type-safe configuration type with compile-time validation
 * Ensures configuration objects match expected schema for each data type
 */
export type ValidateDataTypeConfig<T extends keyof DataTypeMap> = 
  T extends 'vehicles' 
    ? UseStoreDataConfig<'vehicles'> & { 
        filters?: DataTypeFilters['vehicles'];
      }
    : T extends 'stations'
    ? UseStoreDataConfig<'stations'> & { 
        filters?: DataTypeFilters['stations'];
      }
    : T extends 'routes'
    ? UseStoreDataConfig<'routes'> & { 
        filters?: DataTypeFilters['routes'];
      }
    : T extends 'stopTimes'
    ? UseStoreDataConfig<'stopTimes'> & { 
        filters?: DataTypeFilters['stopTimes'];
      }
    : never;

/**
 * Store data result interface with standardized error handling
 */
export interface StoreDataResult<T> {
  data: T[] | null;
  isLoading: boolean;
  error: StandardError | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
}

/**
 * Generic store data hook that replaces 4 duplicated hooks
 * 
 * Consolidates functionality from:
 * - useVehicleStoreData (200+ lines)
 * - useStationStoreData (180+ lines) 
 * - useRouteStoreData (170+ lines)
 * - useStopTimesStoreData (190+ lines)
 * 
 * Features:
 * - Type-safe data access with generic types
 * - Unified store method calling with proper error handling
 * - Auto-refresh consolidation replacing 4 separate implementations
 * - Subscription management with proper cleanup
 * - Standardized error handling using ErrorHandler
 * - Input validation using InputValidator
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export function useStoreData<T extends keyof DataTypeMap>(
  config: UseStoreDataConfig<T>
): StoreDataResult<DataTypeMap[T]> {
  // Enhanced configuration validation using type-safe validator
  const configValidation = DataTypeConfigValidator.validateConfig(config);

  if (!configValidation.isValid) {
    logger.error('Invalid useStoreData configuration', {
      errors: configValidation.errors,
      config
    }, 'useStoreData');
    throw new Error(`Invalid configuration: ${configValidation.errors.join(', ')}`);
  }

  const {
    dataType,
    agencyId,
    routeId,
    tripId,
    stopId,
    forceRefresh = false,
    cacheMaxAge = getDefaultCacheMaxAge(dataType),
    autoRefresh = getDefaultAutoRefresh(dataType),
    refreshInterval = getDefaultRefreshInterval(dataType),
    filters
  } = config;

  // Local state for hook interface compatibility
  const [data, setData] = useState<DataTypeMap[T][] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<StandardError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Store subscriptions
  const vehicleStore = useVehicleStore();
  const storeError = useVehicleStore((state) => state.error);
  const storeIsLoading = useVehicleStore((state) => state.isLoading);

  // Get store data for reactive updates
  const storeVehicles = useVehicleStore((state) => state.vehicles);
  const storeStations = useVehicleStore((state) => state.stations);

  // Refs for cleanup and auto-refresh
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Get the appropriate store method for the data type
   */
  const getStoreMethod = useCallback(() => {
    const methodMap: StoreMethodMap = {
      vehicles: 'getVehicleData',
      stations: 'getStationData', 
      routes: 'getRouteData',
      stopTimes: 'getStopTimesData'
    };
    
    const methodName = methodMap[dataType];
    return vehicleStore[methodName] as any;
  }, [vehicleStore, dataType]);

  /**
   * Fetch data using the appropriate store method
   */
  const fetchData = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      logger.debug(`Fetching ${dataType} data via generic store hook`, {
        agencyId,
        routeId,
        tripId,
        stopId,
        forceRefresh
      }, 'useStoreData');

      const storeMethod = getStoreMethod();
      
      // Build options object based on data type with defaults
      const options = {
        agencyId,
        forceRefresh,
        cacheMaxAge,
        ...(dataType === 'vehicles' && {
          routeId,
          autoRefresh,
          refreshInterval
        }),
        ...(dataType === 'stopTimes' && {
          tripId,
          stopId,
          autoRefresh,
          refreshInterval
        })
      };
      
      const result = await storeMethod(options);

      if (!isMountedRef.current) return;

      if (result.error) {
        // Convert store error to StandardError
        const standardError = ErrorHandler.fromError(
          new Error(result.error.message),
          { dataType, agencyId, routeId, tripId, stopId }
        );
        setError(standardError);
        setData(null);
      } else {
        // Apply filters if specified
        let processedData = result.data || [];
        if (filters && processedData.length > 0) {
          processedData = applyTypeSafeFilters(processedData, filters, dataType);
        }
        
        setData(processedData);
        setError(null);
      }
      
      setLastUpdated(result.lastUpdated);

      logger.debug(`${dataType} data fetched successfully via generic hook`, {
        count: result.data?.length || 0,
        hasError: !!result.error
      }, 'useStoreData');

    } catch (fetchError) {
      if (!isMountedRef.current) return;

      const standardError = ErrorHandler.fromError(
        fetchError instanceof Error ? fetchError : new Error('Unknown fetch error'),
        { dataType, agencyId, routeId, tripId, stopId }
      );
      
      setError(standardError);
      setData(null);
      logger.error(`${dataType} data fetch failed via generic hook`, { 
        error: standardError.message 
      }, 'useStoreData');
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    dataType, 
    agencyId, 
    routeId, 
    tripId, 
    stopId, 
    forceRefresh, 
    cacheMaxAge, 
    autoRefresh, 
    refreshInterval,
    filters,
    getStoreMethod
  ]);

  /**
   * Refetch function for manual refresh
   */
  const refetch = useCallback(async (): Promise<void> => {
    if (isLoading) {
      logger.debug('Refetch ignored - already loading', { dataType }, 'useStoreData');
      return;
    }

    await fetchData();
  }, [isLoading, fetchData, dataType]);

  /**
   * Setup automatic refresh for live data
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
      if (isMountedRef.current) {
        try {
          logger.debug(`Auto-refreshing ${dataType} data via generic hook`, { 
            interval: refreshInterval 
          }, 'useStoreData');
          
          await fetchData();
        } catch (fetchError) {
          // Don't update error state on auto-refresh failures to avoid UI flicker
          logger.warn(`Auto-refresh failed for ${dataType}`, { 
            error: fetchError instanceof Error ? fetchError.message : String(fetchError) 
          }, 'useStoreData');
        }
      }
    }, refreshInterval);

    logger.debug(`Auto-refresh setup for ${dataType}`, { interval: refreshInterval }, 'useStoreData');
  }, [autoRefresh, refreshInterval, fetchData, dataType]);

  /**
   * Subscribe to store state changes for reactive updates
   */
  useEffect(() => {
    // Handle reactive updates for data types that are stored in the main store state
    if (dataType === 'vehicles' && storeVehicles && storeVehicles.length > 0) {
      // Filter store vehicles by routeId if specified
      let filteredVehicles = routeId 
        ? storeVehicles.filter((vehicle: any) => vehicle.routeId === routeId)
        : storeVehicles;
      
      // Apply additional filters if specified
      if (filters && dataType === 'vehicles') {
        filteredVehicles = applyFilters(filteredVehicles, filters as DataTypeFilters['vehicles'], 'vehicles') as any[];
      }
      
      setData(filteredVehicles as DataTypeMap[T][]);
      setLastUpdated(vehicleStore.lastUpdate);
      
      logger.debug(`Using store ${dataType} for reactive update`, {
        totalCount: storeVehicles.length,
        filteredCount: filteredVehicles.length,
        routeId
      }, 'useStoreData');
    }

    if (dataType === 'stations' && storeStations && storeStations.length > 0) {
      let filteredStations = storeStations;
      
      // Apply filters if specified
      if (filters && dataType === 'stations') {
        filteredStations = applyFilters(filteredStations as Station[], filters as DataTypeFilters['stations'], 'stations') as any[];
      }
      
      setData(filteredStations as DataTypeMap[T][]);
      setLastUpdated(vehicleStore.lastUpdate);
      
      logger.debug(`Using store ${dataType} for reactive update`, {
        count: filteredStations.length
      }, 'useStoreData');
    }
  }, [storeVehicles, storeStations, vehicleStore.lastUpdate, routeId, dataType, filters, storeVehicles?.length]);

  /**
   * Sync store error and isLoading state
   */
  useEffect(() => {
    // Sync store error state
    if (storeError && !error) {
      const standardError = ErrorHandler.fromError(
        new Error(storeError.message),
        { dataType, source: 'store' }
      );
      setError(standardError);
    }

    // Sync store isLoading state
    if (storeIsLoading !== isLoading) {
      setIsLoading(storeIsLoading);
    }
  }, [storeError, storeIsLoading, error, isLoading, dataType]);

  /**
   * Initial data fetch effect
   */
  useEffect(() => {
    isMountedRef.current = true;

    const loadInitialData = async () => {
      // Check if store already has data for reactive data types
      if (dataType === 'vehicles' && storeVehicles && storeVehicles.length > 0) {
        let filteredVehicles = routeId 
          ? storeVehicles.filter((vehicle: any) => vehicle.routeId === routeId)
          : storeVehicles;
        
        if (filters && dataType === 'vehicles') {
          filteredVehicles = applyFilters(filteredVehicles, filters as DataTypeFilters['vehicles'], 'vehicles') as any[];
        }
        
        setData(filteredVehicles as DataTypeMap[T][]);
        setLastUpdated(vehicleStore.lastUpdate);
        setIsLoading(false);
        
        logger.debug(`Using existing store ${dataType} data`, {
          count: filteredVehicles.length
        }, 'useStoreData');
        return;
      }

      if (dataType === 'stations' && storeStations && storeStations.length > 0) {
        let filteredStations = storeStations;
        
        if (filters && dataType === 'stations') {
          filteredStations = applyFilters(filteredStations as Station[], filters as DataTypeFilters['stations'], 'stations') as any[];
        }
        
        setData(filteredStations as DataTypeMap[T][]);
        setLastUpdated(vehicleStore.lastUpdate);
        setIsLoading(false);
        
        logger.debug(`Using existing store ${dataType} data`, {
          count: filteredStations.length
        }, 'useStoreData');
        return;
      }

      // Fetch fresh data if store is empty or for non-reactive data types
      await fetchData();
    };

    loadInitialData();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchData, dataType, routeId, filters, storeVehicles, storeStations, vehicleStore.lastUpdate]);

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
}

/**
 * Helper function to get default cache max age based on data type
 */
function getDefaultCacheMaxAge(dataType: keyof DataTypeMap): number {
  const defaults = {
    vehicles: 30 * 1000, // 30 seconds for live data
    stations: 5 * 60 * 1000, // 5 minutes for station data
    routes: 10 * 60 * 1000, // 10 minutes for route data
    stopTimes: 2 * 60 * 1000 // 2 minutes for schedule data
  };
  
  return defaults[dataType];
}

/**
 * Helper function to get default auto-refresh setting based on data type
 */
function getDefaultAutoRefresh(dataType: keyof DataTypeMap): boolean {
  const defaults = {
    vehicles: true, // Auto-refresh for live vehicle data
    stations: false, // No auto-refresh for station data
    routes: false, // No auto-refresh for route data
    stopTimes: false // No auto-refresh for schedule data by default
  };
  
  return defaults[dataType];
}

/**
 * Helper function to get default refresh interval based on data type
 */
function getDefaultRefreshInterval(dataType: keyof DataTypeMap): number {
  const defaults = {
    vehicles: 30 * 1000, // 30 seconds for live data
    stations: 0, // No auto-refresh
    routes: 0, // No auto-refresh
    stopTimes: 5 * 60 * 1000 // 5 minutes if enabled
  };
  
  return defaults[dataType];
}



/**
 * Type-safe helper function to apply filters to data
 * Uses the DataTypeFilters interface for compile-time type checking
 */
function applyFilters<T extends keyof DataTypeMap>(
  data: DataTypeMap[T][],
  filters: DataTypeFilters[T],
  dataType: T
): DataTypeMap[T][] {
  if (!filters || Object.keys(filters).length === 0) {
    return data;
  }

  return data.filter(item => {
    switch (dataType) {
      case 'vehicles':
        return applyVehicleFilters(item as CoreVehicle, filters as DataTypeFilters['vehicles']);
      case 'stations':
        return applyStationFilters(item as Station, filters as DataTypeFilters['stations']);
      case 'routes':
        return applyRouteFilters(item as Route, filters as DataTypeFilters['routes']);
      case 'stopTimes':
        return applyStopTimeFilters(item as StopTime, filters as DataTypeFilters['stopTimes']);
      default:
        return true;
    }
  });
}

/**
 * Apply filters specific to vehicle data
 */
function applyVehicleFilters(vehicle: CoreVehicle, filters: DataTypeFilters['vehicles']): boolean {
  if (filters.routeId && vehicle.routeId !== filters.routeId) {
    return false;
  }
  
  if (filters.tripId && vehicle.tripId !== filters.tripId) {
    return false;
  }
  
  if (filters.vehicleId && vehicle.id !== filters.vehicleId) {
    return false;
  }
  
  if (filters.coordinates) {
    const distance = calculateDistance(
      { latitude: vehicle.position.latitude, longitude: vehicle.position.longitude },
      { latitude: filters.coordinates.latitude, longitude: filters.coordinates.longitude }
    );
    if (distance > filters.coordinates.radius) {
      return false;
    }
  }
  
  return true;
}

/**
 * Apply filters specific to station data
 */
function applyStationFilters(station: Station, filters: DataTypeFilters['stations']): boolean {
  if (filters.stationId && station.id !== filters.stationId) {
    return false;
  }
  
  if (filters.coordinates) {
    const distance = calculateDistance(
      station.coordinates,
      { latitude: filters.coordinates.latitude, longitude: filters.coordinates.longitude }
    );
    if (distance > filters.coordinates.radius) {
      return false;
    }
  }
  
  return true;
}

/**
 * Apply filters specific to route data
 */
function applyRouteFilters(route: Route, filters: DataTypeFilters['routes']): boolean {
  if (filters.routeId && route.id !== filters.routeId) {
    return false;
  }
  
  if (filters.routeType && route.type !== filters.routeType) {
    return false;
  }
  
  return true;
}

/**
 * Apply filters specific to stop time data
 */
function applyStopTimeFilters(stopTime: StopTime, filters: DataTypeFilters['stopTimes']): boolean {
  if (filters.tripId && stopTime.tripId !== filters.tripId) {
    return false;
  }
  
  if (filters.stopId && stopTime.stopId !== filters.stopId) {
    return false;
  }
  
  if (filters.timeRange) {
    const arrivalTime = new Date(stopTime.arrivalTime);
    if (arrivalTime < filters.timeRange.start || arrivalTime > filters.timeRange.end) {
      return false;
    }
  }
  
  return true;
}

/**
 * Calculate distance between two coordinates in meters
 */
function calculateDistance(
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number }
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = coord1.latitude * Math.PI / 180;
  const φ2 = coord2.latitude * Math.PI / 180;
  const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

/**
 * Type-safe wrapper for applying filters based on data type
 */
function applyTypeSafeFilters<T extends keyof DataTypeMap>(
  data: any[],
  filters: DataTypeFilters[T],
  dataType: T
): any[] {
  switch (dataType) {
    case 'vehicles':
      return applyFilters(data, filters as DataTypeFilters['vehicles'], 'vehicles');
    case 'stations':
      return applyFilters(data as Station[], filters as DataTypeFilters['stations'], 'stations');
    case 'routes':
      return applyFilters(data as Route[], filters as DataTypeFilters['routes'], 'routes');
    case 'stopTimes':
      return applyFilters(data as StopTime[], filters as DataTypeFilters['stopTimes'], 'stopTimes');
    default:
      return data;
  }
}

/**
 * Runtime validation for data type configurations
 * Validates configuration objects against their schema at runtime
 */
export class DataTypeConfigValidator {
  /**
   * Validates a configuration object for a specific data type
   */
  static validateConfig<T extends keyof DataTypeMap>(
    config: UseStoreDataConfig<T>
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const { dataType } = config;

    // Validate required fields - agencyId is recommended but not strictly required for backward compatibility
    if (!config.agencyId) {
      logger.warn(`agencyId not provided for ${dataType} data type - this may cause issues with data fetching`, {
        dataType,
        config
      }, 'DataTypeConfigValidator');
    }

    // Validate data type specific requirements
    switch (dataType) {
      case 'vehicles':
        // No additional required fields for vehicles
        break;
      case 'stations':
        // No additional required fields for stations
        break;
      case 'routes':
        // No additional required fields for routes
        break;
      case 'stopTimes':
        // stopTimes can work with just agencyId, but tripId or stopId are recommended
        if (!config.tripId && !config.stopId) {
          logger.debug('stopTimes query without tripId or stopId may return large datasets', {
            agencyId: config.agencyId
          }, 'DataTypeConfigValidator');
        }
        break;
    }

    // Validate optional numeric fields
    if (config.cacheMaxAge !== undefined && config.cacheMaxAge < 0) {
      errors.push('cacheMaxAge must be non-negative');
    }

    if (config.refreshInterval !== undefined && config.refreshInterval < 1000) {
      errors.push('refreshInterval must be at least 1000ms');
    }

    // Validate filters if present
    if (config.filters) {
      const filterErrors = this.validateFilters(dataType, config.filters);
      errors.push(...filterErrors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates filters for a specific data type
   */
  private static validateFilters<T extends keyof DataTypeMap>(
    dataType: T,
    filters: DataTypeFilters[T]
  ): string[] {
    const errors: string[] = [];

    switch (dataType) {
      case 'vehicles': {
        const vehicleFilters = filters as DataTypeFilters['vehicles'];
        if (vehicleFilters.coordinates) {
          if (!this.isValidCoordinate(vehicleFilters.coordinates.latitude) ||
              !this.isValidCoordinate(vehicleFilters.coordinates.longitude)) {
            errors.push('Invalid coordinates in vehicle filters');
          }
          if (vehicleFilters.coordinates.radius <= 0) {
            errors.push('Radius must be positive in vehicle filters');
          }
        }
        break;
      }

      case 'stations': {
        const stationFilters = filters as DataTypeFilters['stations'];
        if (stationFilters.coordinates) {
          if (!this.isValidCoordinate(stationFilters.coordinates.latitude) ||
              !this.isValidCoordinate(stationFilters.coordinates.longitude)) {
            errors.push('Invalid coordinates in station filters');
          }
          if (stationFilters.coordinates.radius <= 0) {
            errors.push('Radius must be positive in station filters');
          }
        }
        break;
      }

      case 'routes': {
        const routeFilters = filters as DataTypeFilters['routes'];
        if (routeFilters.routeType) {
          const validTypes = Object.values(RouteType);
          if (!validTypes.includes(routeFilters.routeType)) {
            errors.push(`Invalid route type: ${routeFilters.routeType}`);
          }
        }
        break;
      }

      case 'stopTimes': {
        const stopTimeFilters = filters as DataTypeFilters['stopTimes'];
        if (stopTimeFilters.timeRange) {
          if (stopTimeFilters.timeRange.start >= stopTimeFilters.timeRange.end) {
            errors.push('Time range start must be before end');
          }
        }
        break;
      }
    }

    return errors;
  }

  /**
   * Validates coordinate values
   */
  private static isValidCoordinate(value: number): boolean {
    return typeof value === 'number' && 
           !isNaN(value) && 
           isFinite(value) &&
           value >= -180 && 
           value <= 180;
  }

  /**
   * Creates a safe default configuration for a data type
   */
  static createDefaultConfig<T extends keyof DataTypeMap>(
    dataType: T,
    agencyId?: string
  ): UseStoreDataConfig<T> {
    const baseConfig = {
      dataType,
      agencyId,
      forceRefresh: false,
      cacheMaxAge: getDefaultCacheMaxAge(dataType),
      autoRefresh: getDefaultAutoRefresh(dataType),
      refreshInterval: getDefaultRefreshInterval(dataType)
    };

    return baseConfig as UseStoreDataConfig<T>;
  }
}

/**
 * Type-safe configuration builder for common data access patterns
 */
export class DataConfigBuilder {
  /**
   * Creates a configuration for fetching vehicles by route
   */
  static forVehiclesByRoute(agencyId: string, routeId: string): UseStoreDataConfig<'vehicles'> {
    return {
      dataType: 'vehicles',
      agencyId,
      routeId,
      autoRefresh: true,
      refreshInterval: 30000, // 30 seconds for live data
      filters: { routeId }
    };
  }

  /**
   * Creates a configuration for fetching vehicles near a location
   */
  static forVehiclesNearLocation(
    agencyId: string, 
    coordinates: { latitude: number; longitude: number }, 
    radiusKm: number = 1
  ): UseStoreDataConfig<'vehicles'> {
    return {
      dataType: 'vehicles',
      agencyId,
      autoRefresh: true,
      refreshInterval: 30000,
      filters: { 
        coordinates: { 
          latitude: coordinates.latitude, 
          longitude: coordinates.longitude, 
          radius: radiusKm * 1000 // Convert to meters
        } 
      }
    };
  }

  /**
   * Creates a configuration for fetching stations near a location
   */
  static forStationsNearLocation(
    agencyId: string,
    coordinates: { latitude: number; longitude: number },
    radiusKm: number = 0.5
  ): UseStoreDataConfig<'stations'> {
    return {
      dataType: 'stations',
      agencyId,
      cacheMaxAge: 5 * 60 * 1000, // 5 minutes cache for stations
      filters: {
        coordinates: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          radius: radiusKm * 1000 // Convert to meters
        }
      }
    };
  }

  /**
   * Creates a configuration for fetching routes by type
   */
  static forRoutesByType(
    agencyId: string,
    routeType: DataTypeFilters['routes']['routeType']
  ): UseStoreDataConfig<'routes'> {
    return {
      dataType: 'routes',
      agencyId,
      cacheMaxAge: 10 * 60 * 1000, // 10 minutes cache for routes
      filters: { routeType }
    };
  }

  /**
   * Creates a configuration for fetching stop times for a trip
   */
  static forStopTimesByTrip(agencyId: string, tripId: string): UseStoreDataConfig<'stopTimes'> {
    return {
      dataType: 'stopTimes',
      agencyId,
      tripId,
      cacheMaxAge: 2 * 60 * 1000, // 2 minutes cache for schedule data
      filters: { tripId }
    };
  }

  /**
   * Creates a configuration for fetching stop times at a station
   */
  static forStopTimesByStop(agencyId: string, stopId: string): UseStoreDataConfig<'stopTimes'> {
    return {
      dataType: 'stopTimes',
      agencyId,
      stopId,
      cacheMaxAge: 2 * 60 * 1000, // 2 minutes cache for schedule data
      filters: { stopId }
    };
  }
}

/**
 * Type-safe helper functions for common data access patterns
 * These functions provide compile-time type checking and runtime validation
 */
export const useVehicleData = (config: Omit<UseStoreDataConfig<'vehicles'>, 'dataType'>) => {
  const fullConfig = { ...config, dataType: 'vehicles' as const };
  
  // Runtime validation
  const validation = DataTypeConfigValidator.validateConfig(fullConfig);
  if (!validation.isValid) {
    logger.error('Invalid vehicle data configuration', {
      errors: validation.errors,
      config: fullConfig
    }, 'useVehicleData');
  }
  
  return useStoreData(fullConfig);
};

export const useStationData = (config: Omit<UseStoreDataConfig<'stations'>, 'dataType'>) => {
  const fullConfig = { ...config, dataType: 'stations' as const };
  
  // Runtime validation
  const validation = DataTypeConfigValidator.validateConfig(fullConfig);
  if (!validation.isValid) {
    logger.error('Invalid station data configuration', {
      errors: validation.errors,
      config: fullConfig
    }, 'useStationData');
  }
  
  return useStoreData(fullConfig);
};

export const useRouteData = (config: Omit<UseStoreDataConfig<'routes'>, 'dataType'>) => {
  const fullConfig = { ...config, dataType: 'routes' as const };
  
  // Runtime validation
  const validation = DataTypeConfigValidator.validateConfig(fullConfig);
  if (!validation.isValid) {
    logger.error('Invalid route data configuration', {
      errors: validation.errors,
      config: fullConfig
    }, 'useRouteData');
  }
  
  return useStoreData(fullConfig);
};

export const useStopTimesData = (config: Omit<UseStoreDataConfig<'stopTimes'>, 'dataType'>) => {
  const fullConfig = { ...config, dataType: 'stopTimes' as const };
  
  // Runtime validation
  const validation = DataTypeConfigValidator.validateConfig(fullConfig);
  if (!validation.isValid) {
    logger.error('Invalid stop times data configuration', {
      errors: validation.errors,
      config: fullConfig
    }, 'useStopTimesData');
  }
  
  return useStoreData(fullConfig);
};