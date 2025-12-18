import React, { useMemo } from 'react';
import type { 
  LiveVehicle, 
  Station, 
  Route, 
  StopTime, 
  Coordinates, 
  FavoriteRoute,
  EnhancedVehicleInfo 
} from '../../types';
import { useLocationStore } from '../../stores/locationStore';
import { useConfigStore } from '../../stores/configStore';
import { getEffectiveLocation } from '../../utils/locationUtils';
import { logger } from '../../utils/logger';

// Import store-based data hooks (replacing data layer hooks)
import { useStationStoreData } from '../shared/useStationStoreData';
import { useVehicleStoreData } from '../shared/useVehicleStoreData';
import { useRouteStoreData } from '../shared/useRouteStoreData';
import { useStopTimesStoreData } from '../shared/useStopTimesStoreData';

// Import processing layer hooks
import { useVehicleFiltering } from '../processing/useVehicleFiltering';
import { useVehicleGrouping } from '../processing/useVehicleGrouping';

/**
 * Enhanced vehicle with direction analysis (matches orchestration hook)
 */
interface EnhancedVehicleInfoWithDirection extends EnhancedVehicleInfo {
  _internalDirection?: 'arriving' | 'departing' | 'unknown';
  stopSequence?: Array<{
    stopId: string;
    stopName: string;
    sequence: number;
    isCurrent: boolean;
    isDestination: boolean;
  }>;
}

/**
 * Station vehicle group (matches orchestration hook format)
 */
interface StationVehicleGroup {
  station: { station: Station; distance: number };
  vehicles: EnhancedVehicleInfoWithDirection[];
  allRoutes: Array<{
    routeId: string;
    routeName: string;
    vehicleCount: number;
  }>;
}

/**
 * Configuration options for vehicle display (simplified from orchestration hook)
 */
export interface UseVehicleDisplayOptions {
  filterByFavorites?: boolean;
  maxStations?: number;
  maxVehiclesPerStation?: number;
  showAllVehiclesPerRoute?: boolean;
  maxSearchRadius?: number;
  proximityThreshold?: number;
}

/**
 * Result interface (matches orchestration hook exactly)
 */
export interface UseVehicleDisplayResult {
  stationVehicleGroups: StationVehicleGroup[];
  isLoading: boolean;
  isLoadingStations: boolean;
  isLoadingVehicles: boolean;
  isProcessingVehicles: boolean;
  effectiveLocationForDisplay: Coordinates | null;
  favoriteRoutes: FavoriteRoute[];
  allStations: Station[];
  vehicles: LiveVehicle[];
  error?: Error;
}

/**
 * Error types for composition hook
 */
export enum CompositionErrorType {
  DATA_FETCH_ERROR = 'data_fetch_error',
  PROCESSING_ERROR = 'processing_error',
  VALIDATION_ERROR = 'validation_error',
  CONFIGURATION_ERROR = 'configuration_error',
  NETWORK_ERROR = 'network_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  CACHE_ERROR = 'cache_error'
}

/**
 * Enhanced composition error for structured error reporting
 */
export class CompositionError extends Error {
  public readonly timestamp: Date;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly retryable: boolean;
  public readonly errorId: string;

  constructor(
    message: string,
    public readonly type: CompositionErrorType,
    public readonly hookName: string,
    public readonly context: Record<string, any> = {},
    public readonly originalError?: Error,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    retryable: boolean = true
  ) {
    super(message);
    this.name = 'CompositionError';
    this.timestamp = new Date();
    this.severity = severity;
    this.retryable = retryable;
    this.errorId = `${hookName}-${type}-${Date.now()}`;

    // Capture stack trace if available (Node.js specific)
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, CompositionError);
    }
  }

  /**
   * Create a structured error report for logging and debugging
   */
  toErrorReport(): Record<string, any> {
    return {
      errorId: this.errorId,
      message: this.message,
      type: this.type,
      hookName: this.hookName,
      severity: this.severity,
      retryable: this.retryable,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : null,
      stack: this.stack
    };
  }

  /**
   * Check if this error should trigger a retry
   */
  shouldRetry(maxRetries: number = 3, currentRetryCount: number = 0): boolean {
    return this.retryable && currentRetryCount < maxRetries;
  }

  /**
   * Create a user-friendly error message
   */
  getUserMessage(): string {
    switch (this.type) {
      case CompositionErrorType.NETWORK_ERROR:
        return 'Unable to connect to the transit service. Please check your internet connection.';
      case CompositionErrorType.AUTHENTICATION_ERROR:
        return 'Authentication failed. Please check your API key in settings.';
      case CompositionErrorType.CONFIGURATION_ERROR:
        return 'Configuration error. Please check your settings and try again.';
      case CompositionErrorType.DATA_FETCH_ERROR:
        return 'Unable to load transit data. Please try again in a moment.';
      case CompositionErrorType.PROCESSING_ERROR:
        return 'Error processing transit data. Some information may be unavailable.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

/**
 * Error context builder for consistent error reporting
 */
class ErrorContextBuilder {
  private context: Record<string, any> = {};

  addDataHookStatus(hookName: string, isLoading: boolean, error: Error | null, dataLength?: number) {
    this.context[`${hookName}Status`] = {
      isLoading,
      hasError: !!error,
      errorMessage: error?.message,
      dataLength: dataLength ?? 0
    };
    return this;
  }

  addProcessingInfo(step: string, inputSize: number, outputSize: number, processingTime?: number) {
    this.context.processing = this.context.processing || {};
    this.context.processing[step] = {
      inputSize,
      outputSize,
      processingTime: processingTime ?? 0
    };
    return this;
  }

  addConfiguration(config: Record<string, any>) {
    this.context.configuration = config;
    return this;
  }

  addUserContext(location: Coordinates | null, favoriteCount: number) {
    this.context.userContext = {
      hasLocation: !!location,
      location: location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : null,
      favoriteCount
    };
    return this;
  }

  build(): Record<string, any> {
    return { ...this.context };
  }
}

/**
 * Determine error type from original error
 */
const determineErrorType = (error: Error): CompositionErrorType => {
  const message = error.message.toLowerCase();
  
  if (message.includes('401') || message.includes('403') || message.includes('unauthorized')) {
    return CompositionErrorType.AUTHENTICATION_ERROR;
  }
  
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return CompositionErrorType.NETWORK_ERROR;
  }
  
  if (message.includes('validation') || message.includes('invalid')) {
    return CompositionErrorType.VALIDATION_ERROR;
  }
  
  if (message.includes('config') || message.includes('setup')) {
    return CompositionErrorType.CONFIGURATION_ERROR;
  }
  
  if (message.includes('cache')) {
    return CompositionErrorType.CACHE_ERROR;
  }
  
  return CompositionErrorType.DATA_FETCH_ERROR;
};

/**
 * Determine error severity based on type and context
 */
const determineErrorSeverity = (
  errorType: CompositionErrorType,
  context: Record<string, any>
): 'low' | 'medium' | 'high' | 'critical' => {
  switch (errorType) {
    case CompositionErrorType.AUTHENTICATION_ERROR:
      return 'critical';
    case CompositionErrorType.NETWORK_ERROR:
      return context.isInitialLoad ? 'high' : 'medium';
    case CompositionErrorType.CONFIGURATION_ERROR:
      return 'high';
    case CompositionErrorType.DATA_FETCH_ERROR:
      return context.partialDataAvailable ? 'medium' : 'high';
    case CompositionErrorType.PROCESSING_ERROR:
      return 'low';
    case CompositionErrorType.CACHE_ERROR:
      return 'low';
    default:
      return 'medium';
  }
};

/**
 * Utility function to analyze vehicle direction (simplified from orchestration hook)
 */
const analyzeVehicleDirection = (
  vehicle: LiveVehicle,
  targetStation: Station,
  stopTimes: StopTime[]
): { direction: 'arriving' | 'departing' | 'unknown'; estimatedMinutes: number; confidence: 'high' | 'medium' | 'low' } => {
  // Input validation
  if (!vehicle?.tripId || !targetStation?.id || !Array.isArray(stopTimes)) {
    return { direction: 'unknown', estimatedMinutes: 0, confidence: 'low' };
  }

  // Filter stop times for this vehicle's trip
  const tripStopTimes = stopTimes.filter(stopTime => 
    stopTime && 
    stopTime.tripId === vehicle.tripId &&
    stopTime.stopId &&
    typeof stopTime.sequence === 'number' &&
    !isNaN(stopTime.sequence)
  );

  if (tripStopTimes.length === 0) {
    return { direction: 'unknown', estimatedMinutes: 0, confidence: 'low' };
  }

  // Sort stop times by sequence
  const sortedStopTimes = tripStopTimes.sort((a, b) => a.sequence - b.sequence);

  // Find the target station in the trip's stop sequence
  const targetStopTime = sortedStopTimes.find(stopTime => stopTime.stopId === targetStation.id);
  
  if (!targetStopTime) {
    return { direction: 'unknown', estimatedMinutes: 0, confidence: 'low' };
  }

  const targetSequence = targetStopTime.sequence;

  // Simplified approach: estimate position based on time if available
  const now = new Date();
  const vehicleTimestamp = vehicle.timestamp instanceof Date ? vehicle.timestamp : new Date(vehicle.timestamp);
  
  // Calculate time since last vehicle update (in minutes)
  const minutesSinceUpdate = Math.max(0, (now.getTime() - vehicleTimestamp.getTime()) / (1000 * 60));

  let estimatedCurrentSequence = 0;
  let confidence: 'high' | 'medium' | 'low' = 'low';

  if (targetStopTime.arrivalTime && typeof targetStopTime.arrivalTime === 'string') {
    try {
      // Parse arrival time (HH:MM:SS format)
      const [hours, minutes, seconds] = targetStopTime.arrivalTime.split(':').map(Number);
      const scheduledArrival = new Date();
      scheduledArrival.setHours(hours, minutes, seconds || 0, 0);

      // Calculate time difference
      const timeDiffMinutes = (scheduledArrival.getTime() - now.getTime()) / (1000 * 60);

      if (timeDiffMinutes > 0) {
        // Vehicle should arrive in the future
        estimatedCurrentSequence = Math.max(0, targetSequence - Math.ceil(timeDiffMinutes / 2)); // Assume 2 minutes per stop
        confidence = 'medium';
      } else if (timeDiffMinutes > -10) {
        // Vehicle should have arrived recently (within 10 minutes)
        estimatedCurrentSequence = targetSequence;
        confidence = 'medium';
      } else {
        // Vehicle is likely past this stop
        estimatedCurrentSequence = targetSequence + Math.ceil(Math.abs(timeDiffMinutes) / 2);
        confidence = 'low';
      }
    } catch (error) {
      // Fallback to sequence-based estimation
      estimatedCurrentSequence = Math.floor(sortedStopTimes.length / 2);
      confidence = 'low';
    }
  } else {
    // No time data available, use middle of sequence as estimate
    estimatedCurrentSequence = Math.floor(sortedStopTimes.length / 2);
    confidence = 'low';
  }

  // Determine direction based on sequence comparison
  let direction: 'arriving' | 'departing' | 'unknown' = 'unknown';
  let estimatedMinutes = 0;

  if (estimatedCurrentSequence < targetSequence) {
    // Vehicle is before the target station → arriving
    direction = 'arriving';
    const remainingStops = targetSequence - estimatedCurrentSequence;
    estimatedMinutes = Math.max(1, remainingStops * 2); // 2 minutes per stop estimate
    
    // Adjust for vehicle age
    estimatedMinutes = Math.max(1, estimatedMinutes - minutesSinceUpdate);
    
    if (confidence === 'medium' && remainingStops <= 3) {
      confidence = 'high'; // High confidence for nearby arrivals with time data
    }
  } else if (estimatedCurrentSequence > targetSequence) {
    // Vehicle is after the target station → departing
    direction = 'departing';
    const stopsSinceDeparture = estimatedCurrentSequence - targetSequence;
    estimatedMinutes = stopsSinceDeparture * 2; // Time since departure
    
    // Departing vehicles have lower confidence unless very recent
    if (stopsSinceDeparture <= 2 && confidence === 'medium') {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }
  } else {
    // Vehicle is at or very near the target station
    direction = 'arriving';
    estimatedMinutes = 0; // At station
    
    if (confidence === 'medium') {
      confidence = 'high'; // High confidence when at station with time data
    }
  }

  return {
    direction,
    estimatedMinutes: Math.round(estimatedMinutes),
    confidence
  };
};

/**
 * Simple composition hook for vehicle display
 * Replaces useVehicleProcessingOrchestration for basic use cases
 * 
 * This hook composes existing data and processing hooks to provide
 * the same API as the orchestration hook but with much simpler logic.
 */
export const useVehicleDisplay = (options: UseVehicleDisplayOptions = {}): UseVehicleDisplayResult => {
  const {
    filterByFavorites = false,
    maxStations = 2,
    maxVehiclesPerStation = 5,
    showAllVehiclesPerRoute = false,
    maxSearchRadius = 5000,
    proximityThreshold = 200,
  } = options;

  // Get location and config from stores
  const { currentLocation } = useLocationStore();
  const { config } = useConfigStore();

  // Get effective location with fallback priority (same as orchestration hook)
  const effectiveLocationForDisplay = getEffectiveLocation(
    currentLocation,
    config?.homeLocation,
    config?.workLocation,
    config?.defaultLocation
  );

  // Get favorite routes from Config Store
  const { getFavoriteRoutes } = useConfigStore();
  const favoriteRoutes = useMemo(() => {
    return filterByFavorites ? getFavoriteRoutes() : [];
  }, [filterByFavorites, getFavoriteRoutes]);

  // Get agency ID for data hooks
  const agencyId = config?.agencyId;
  const isConfigured = !!agencyId;

  // Store-based data hooks - compose all required data using store methods
  const stationDataResult = useStationStoreData({
    agencyId,
    forceRefresh: false,
    cacheMaxAge: 5 * 60 * 1000 // 5 minutes
  });

  const vehicleDataResult = useVehicleStoreData({
    agencyId,
    forceRefresh: false,
    cacheMaxAge: 30 * 1000, // 30 seconds for live data
    autoRefresh: true,
    refreshInterval: 30 * 1000
  });

  const routeDataResult = useRouteStoreData({
    agencyId,
    forceRefresh: false,
    cacheMaxAge: 10 * 60 * 1000 // 10 minutes
  });

  const stopTimesDataResult = useStopTimesStoreData({
    agencyId,
    forceRefresh: false,
    cacheMaxAge: 2 * 60 * 1000 // 2 minutes
  });

  // Extract data with fallbacks
  const allStations = stationDataResult.data || [];
  const vehicles = vehicleDataResult.data || [];
  const routes = routeDataResult.data || [];
  const stopTimes = stopTimesDataResult.data || [];

  // Aggregate loading states (same as orchestration hook)
  const isLoadingStations = stationDataResult.isLoading;
  const isLoadingVehicles = vehicleDataResult.isLoading;
  const isLoadingRoutes = routeDataResult.isLoading;
  const isLoadingStopTimes = stopTimesDataResult.isLoading;
  
  const isLoading = isLoadingStations || isLoadingVehicles || isLoadingRoutes || isLoadingStopTimes;

  // Aggregate errors with comprehensive context and structured reporting
  const aggregatedError = useMemo(() => {
    const errors = [
      stationDataResult.error && { source: 'stations', error: stationDataResult.error },
      vehicleDataResult.error && { source: 'vehicles', error: vehicleDataResult.error },
      routeDataResult.error && { source: 'routes', error: routeDataResult.error },
      stopTimesDataResult.error && { source: 'stopTimes', error: stopTimesDataResult.error }
    ].filter(Boolean);

    if (errors.length === 0) return undefined;

    // Determine the most severe error type
    const primaryError = errors[0].error!;
    const errorType = determineErrorType(primaryError);
    
    // Build comprehensive error context
    const contextBuilder = new ErrorContextBuilder()
      .addDataHookStatus('stations', isLoadingStations, stationDataResult.error, allStations.length)
      .addDataHookStatus('vehicles', isLoadingVehicles, vehicleDataResult.error, vehicles.length)
      .addDataHookStatus('routes', routeDataResult.isLoading, routeDataResult.error, routes.length)
      .addDataHookStatus('stopTimes', stopTimesDataResult.isLoading, stopTimesDataResult.error, stopTimes.length)
      .addConfiguration({
        agencyId,
        filterByFavorites,
        maxStations,
        maxVehiclesPerStation,
        isConfigured
      })
      .addUserContext(effectiveLocationForDisplay, favoriteRoutes.length);

    const context = contextBuilder.build();
    
    // Add error-specific context
    context.dataErrors = errors.map(({ source, error }) => ({
      source,
      message: error!.message,
      type: determineErrorType(error!),
      timestamp: new Date().toISOString()
    }));
    
    context.partialDataAvailable = {
      stations: allStations.length > 0,
      vehicles: vehicles.length > 0,
      routes: routes.length > 0,
      stopTimes: stopTimes.length > 0
    };
    
    context.canContinueWithPartialData = allStations.length > 0 || vehicles.length > 0;
    context.totalErrors = errors.length;
    context.errorSources = errors.map(({ source }) => source);

    const severity = determineErrorSeverity(errorType, context);
    const retryable = errorType !== CompositionErrorType.AUTHENTICATION_ERROR && 
                     errorType !== CompositionErrorType.CONFIGURATION_ERROR;

    const errorMessages = errors.map(({ source, error }) => `${source}: ${error!.message}`);
    const compositionError = new CompositionError(
      `Data layer errors (${errors.length}): ${errorMessages.join('; ')}`,
      errorType,
      'useVehicleDisplay',
      context,
      primaryError,
      severity,
      retryable
    );

    // Log structured error for debugging
    logger.error('Vehicle display composition error', compositionError.toErrorReport(), 'useVehicleDisplay');

    return compositionError;
  }, [
    stationDataResult.error,
    vehicleDataResult.error,
    routeDataResult.error,
    stopTimesDataResult.error,
    isLoadingStations,
    isLoadingVehicles,
    allStations.length,
    vehicles.length,
    routes.length,
    stopTimes.length,
    agencyId,
    filterByFavorites,
    maxStations,
    maxVehiclesPerStation,
    isConfigured,
    effectiveLocationForDisplay,
    favoriteRoutes.length
  ]);

  // Error state management for processing errors and recovery
  const [processingError, setProcessingError] = React.useState<CompositionError | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const [lastSuccessfulData, setLastSuccessfulData] = React.useState<StationVehicleGroup[]>([]);

  // Error recovery mechanism
  const handleErrorRecovery = React.useCallback((error: CompositionError) => {
    if (error.shouldRetry(3, retryCount)) {
      logger.info('Attempting error recovery', {
        errorId: error.errorId,
        retryCount,
        errorType: error.type
      }, 'useVehicleDisplay');
      
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setProcessingError(null);
      }, Math.min(1000 * Math.pow(2, retryCount), 10000)); // Exponential backoff, max 10s
    } else {
      logger.warn('Max retries exceeded, using fallback data', {
        errorId: error.errorId,
        retryCount,
        hasLastSuccessfulData: lastSuccessfulData.length > 0
      }, 'useVehicleDisplay');
    }
  }, [retryCount, lastSuccessfulData.length]);

  // Reset retry count on successful data
  React.useEffect(() => {
    if (!aggregatedError && !processingError && retryCount > 0) {
      setRetryCount(0);
      logger.info('Error recovery successful', { retriesUsed: retryCount }, 'useVehicleDisplay');
    }
  }, [aggregatedError, processingError, retryCount]);

  // Processing layer hooks - compose vehicle filtering and grouping
  const vehicleFilteringResult = useVehicleFiltering(vehicles, {
    filterByFavorites,
    favoriteRoutes,
    maxSearchRadius,
    userLocation: effectiveLocationForDisplay
  });

  const vehicleGroupingResult = useVehicleGrouping(
    vehicleFilteringResult.filteredVehicles,
    allStations,
    effectiveLocationForDisplay || { latitude: 0, longitude: 0 },
    {
      maxStations,
      maxVehiclesPerStation,
      proximityThreshold
    }
  );

  // Processing state
  const isProcessingVehicles = useMemo(() => {
    return isLoading && (allStations.length > 0 || vehicles.length > 0);
  }, [isLoading, allStations.length, vehicles.length]);

  // Transform grouped results to match orchestration hook API format
  const stationVehicleGroups = useMemo(() => {
    // Early return if not configured or missing critical data
    if (!isConfigured || !effectiveLocationForDisplay) {
      return [];
    }

    // For favorites mode, check if we have favorite routes configured
    if (filterByFavorites && favoriteRoutes.length === 0) {
      return [];
    }

    // Need minimum data to proceed
    if (allStations.length === 0 || vehicles.length === 0) {
      return [];
    }

    try {
      logger.debug('Starting vehicle display composition', {
        stationsCount: allStations.length,
        vehiclesCount: vehicles.length,
        routesCount: routes.length,
        stopTimesCount: stopTimes.length,
        filterByFavorites,
        favoriteRoutesCount: favoriteRoutes.length,
        effectiveLocation: effectiveLocationForDisplay
      }, 'useVehicleDisplay');

      // Create route mapping for efficient lookups
      const routeIdMap = new Map<string, Route>();
      routes.forEach(route => {
        routeIdMap.set(route.id, route);
      });

      // Transform grouped results to match original API format
      const transformedGroups: StationVehicleGroup[] = vehicleGroupingResult.stationGroups.map(group => {
        // Enhance vehicles with direction analysis and route information
        const enhancedVehicles: EnhancedVehicleInfoWithDirection[] = group.vehicles.map(vehicle => {
          // Get route information
          const route = routeIdMap.get(vehicle.routeId || '');
          
          // Perform direction analysis
          const directionResult = analyzeVehicleDirection(
            vehicle,
            group.station.station,
            stopTimes
          );

          // Get destination from route data
          const destination = route?.routeDesc || 'Unknown destination';

          return {
            id: vehicle.id,
            routeId: vehicle.routeId || '',
            route: route?.routeName || `Route ${vehicle.routeId}`,
            destination,
            vehicle: {
              id: vehicle.id,
              routeId: vehicle.routeId || '',
              tripId: vehicle.tripId,
              label: vehicle.label,
              position: vehicle.position,
              timestamp: vehicle.timestamp,
              speed: vehicle.speed,
              isWheelchairAccessible: vehicle.isWheelchairAccessible,
              isBikeAccessible: vehicle.isBikeAccessible,
            },
            isLive: true,
            isScheduled: false,
            confidence: directionResult.confidence === 'high' ? 'high' : 'medium',
            direction: 'unknown' as 'work' | 'home' | 'unknown',
            station: group.station.station,
            minutesAway: directionResult.estimatedMinutes,
            estimatedArrival: new Date(Date.now() + directionResult.estimatedMinutes * 60000),
            _internalDirection: directionResult.direction,
            stopSequence: undefined
          };
        });

        // Apply vehicle selection logic based on mode (same as orchestration hook)
        let finalVehicles: EnhancedVehicleInfoWithDirection[];
        
        if (showAllVehiclesPerRoute) {
          // Show all vehicles (favorites mode)
          finalVehicles = enhancedVehicles
            .sort((a, b) => {
              // Priority sorting (same as orchestration hook)
              const aAtStation = a.minutesAway === 0 && a._internalDirection === 'arriving';
              const bAtStation = b.minutesAway === 0 && b._internalDirection === 'arriving';
              
              if (aAtStation && !bAtStation) return -1;
              if (!aAtStation && bAtStation) return 1;
              
              const aArriving = a._internalDirection === 'arriving' && a.minutesAway > 0;
              const bArriving = b._internalDirection === 'arriving' && b.minutesAway > 0;
              
              if (aArriving && !bArriving) return -1;
              if (!aArriving && bArriving) return 1;
              
              if (aArriving && bArriving) {
                return a.minutesAway - b.minutesAway;
              }
              
              return a.minutesAway - b.minutesAway;
            });
        } else {
          // Deduplicate by route and apply limits (station display mode)
          const routeGroups = new Map<string, EnhancedVehicleInfoWithDirection[]>();
          
          enhancedVehicles.forEach(vehicle => {
            const routeId = vehicle.routeId;
            if (!routeGroups.has(routeId)) {
              routeGroups.set(routeId, []);
            }
            routeGroups.get(routeId)!.push(vehicle);
          });

          // Select the best vehicle per route based on priority
          const bestVehiclePerRoute = Array.from(routeGroups.entries()).map(([routeId, vehicles]) => {
            const sortedVehicles = vehicles.sort((a, b) => {
              const aAtStation = a.minutesAway === 0 && a._internalDirection === 'arriving';
              const bAtStation = b.minutesAway === 0 && b._internalDirection === 'arriving';
              
              if (aAtStation && !bAtStation) return -1;
              if (!aAtStation && bAtStation) return 1;
              
              const aArriving = a._internalDirection === 'arriving' && a.minutesAway > 0;
              const bArriving = b._internalDirection === 'arriving' && b.minutesAway > 0;
              
              if (aArriving && !bArriving) return -1;
              if (!aArriving && bArriving) return 1;
              
              if (aArriving && bArriving) {
                return a.minutesAway - b.minutesAway;
              }
              
              return a.minutesAway - b.minutesAway;
            });
            
            return sortedVehicles[0];
          });

          // Check if there's only one route at this station
          const uniqueRoutes = Array.from(new Set(enhancedVehicles.map(v => v.routeId)));
          
          if (uniqueRoutes.length === 1) {
            // Single route: show all vehicles from that route (up to maxVehicles limit)
            finalVehicles = enhancedVehicles
              .sort((a, b) => {
                const aAtStation = a.minutesAway === 0 && a._internalDirection === 'arriving';
                const bAtStation = b.minutesAway === 0 && b._internalDirection === 'arriving';
                
                if (aAtStation && !bAtStation) return -1;
                if (!aAtStation && bAtStation) return 1;
                
                const aArriving = a._internalDirection === 'arriving' && a.minutesAway > 0;
                const bArriving = b._internalDirection === 'arriving' && b.minutesAway > 0;
                
                if (aArriving && !bArriving) return -1;
                if (!aArriving && bArriving) return 1;
                
                if (aArriving && bArriving) {
                  return a.minutesAway - b.minutesAway;
                }
                
                return a.minutesAway - b.minutesAway;
              })
              .slice(0, maxVehiclesPerStation);
          } else {
            // Multiple routes: deduplicate by route and limit to maxVehicles
            finalVehicles = bestVehiclePerRoute
              .sort((a, b) => {
                const aAtStation = a.minutesAway === 0 && a._internalDirection === 'arriving';
                const bAtStation = b.minutesAway === 0 && b._internalDirection === 'arriving';
                
                if (aAtStation && !bAtStation) return -1;
                if (!aAtStation && bAtStation) return 1;
                
                const aArriving = a._internalDirection === 'arriving' && a.minutesAway > 0;
                const bArriving = b._internalDirection === 'arriving' && b.minutesAway > 0;
                
                if (aArriving && !bArriving) return -1;
                if (!aArriving && bArriving) return 1;
                
                if (aArriving && bArriving) {
                  return a.minutesAway - b.minutesAway;
                }
                
                return a.minutesAway - b.minutesAway;
              })
              .slice(0, maxVehiclesPerStation);
          }
        }

        return {
          station: group.station,
          vehicles: finalVehicles,
          allRoutes: group.allRoutes
        };
      });

      logger.debug('Vehicle display composition completed', {
        finalStationGroups: transformedGroups.length,
        totalVehicles: transformedGroups.reduce((sum, group) => sum + group.vehicles.length, 0),
        processingOptions: {
          filterByFavorites,
          maxStations,
          maxVehiclesPerStation,
          showAllVehiclesPerRoute
        }
      }, 'useVehicleDisplay');

      return transformedGroups;

    } catch (error) {
      const originalError = error instanceof Error ? error : new Error(String(error));
      const errorType = CompositionErrorType.PROCESSING_ERROR;
      
      // Build comprehensive error context
      const contextBuilder = new ErrorContextBuilder()
        .addProcessingInfo('vehicleComposition', vehicles.length, 0, 0)
        .addConfiguration({
          agencyId,
          filterByFavorites,
          maxStations,
          maxVehiclesPerStation,
          showAllVehiclesPerRoute
        })
        .addUserContext(effectiveLocationForDisplay, favoriteRoutes.length);

      const context = contextBuilder.build();
      context.processingStep = 'composition';
      context.dataAvailable = {
        stations: allStations.length,
        vehicles: vehicles.length,
        routes: routes.length,
        stopTimes: stopTimes.length
      };
      context.options = options;
      context.originalError = originalError.message;
      context.stackTrace = originalError.stack;

      const severity = determineErrorSeverity(errorType, context);
      
      const processingError = new CompositionError(
        `Vehicle processing failed: ${originalError.message}`,
        errorType,
        'useVehicleDisplay',
        context,
        originalError,
        severity,
        true // Processing errors are generally retryable
      );

      // Log structured error
      logger.error('Vehicle display composition failed', processingError.toErrorReport(), 'useVehicleDisplay');

      // Store error for potential retry logic (could be used by parent components)
      // For now, return empty array to maintain functionality
      return [];
    }
  }, [
    isConfigured,
    effectiveLocationForDisplay,
    filterByFavorites,
    favoriteRoutes,
    allStations,
    vehicles,
    routes,
    stopTimes,
    maxStations,
    maxVehiclesPerStation,
    showAllVehiclesPerRoute,
    vehicleGroupingResult.stationGroups
  ]);

  // Store successful data for error recovery
  React.useEffect(() => {
    if (stationVehicleGroups.length > 0 && !aggregatedError && !processingError) {
      setLastSuccessfulData(stationVehicleGroups);
    }
  }, [stationVehicleGroups, aggregatedError, processingError]);

  // Handle processing errors with recovery
  React.useEffect(() => {
    if (processingError) {
      handleErrorRecovery(processingError);
    }
  }, [processingError, handleErrorRecovery]);

  // Determine final error state and data to return
  const finalError = processingError || aggregatedError;
  const finalStationVehicleGroups = React.useMemo(() => {
    // If we have current data, use it
    if (stationVehicleGroups.length > 0) {
      return stationVehicleGroups;
    }
    
    // If we have an error but also have last successful data, use that as fallback
    if (finalError && lastSuccessfulData.length > 0) {
      logger.info('Using fallback data due to error', {
        errorType: finalError.type,
        fallbackDataCount: lastSuccessfulData.length
      }, 'useVehicleDisplay');
      return lastSuccessfulData;
    }
    
    // Otherwise return empty array
    return [];
  }, [stationVehicleGroups, finalError, lastSuccessfulData]);

  return {
    stationVehicleGroups: finalStationVehicleGroups,
    isLoading,
    isLoadingStations,
    isLoadingVehicles,
    isProcessingVehicles,
    effectiveLocationForDisplay,
    favoriteRoutes,
    allStations,
    vehicles,
    error: finalError
  };
};