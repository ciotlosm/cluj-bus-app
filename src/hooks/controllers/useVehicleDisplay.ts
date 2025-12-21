import { useMemo, useCallback, useState, useEffect } from 'react';
import type { Station, Coordinates, FavoriteRoute } from '../../types';
import type { CoreVehicle } from '../../types/coreVehicle';
import { useLocationStore } from '../../stores/locationStore';
import { useConfigStore } from '../../stores/configStore';
import { getEffectiveLocation } from '../../utils/formatting/locationUtils';
import { logger } from '../../utils/shared/logger';

import { useVehicleData, useStationData, useRouteData, useStopTimesData } from '../shared/useStoreData';
import { ErrorHandler } from '../shared/errors/ErrorHandler';
import type { StandardError } from '../shared/errors/types';

import { stationSelector } from '../../services/business-logic/stationSelector';
import type { 
  StationSelectionCriteria, 
  StationSelectionResult, 
  StationWithRoutes 
} from '../../services/business-logic/stationSelector';
import { NEARBY_STATION_DISTANCE_THRESHOLD } from '../../utils/shared/nearbyViewConstants';
import { enhancedTranzyApi } from '../../services/api/tranzyApiService';
import { analyzeVehicleDirection } from '../shared/processing/vehicleDirectionAnalysis';

import { vehicleTransformationService } from '../../services/data-processing/VehicleTransformationService';
import type { 
  TransformedVehicleData, 
  VehicleDisplayData,
  TransformationContext,
  TransformationStation
} from '../../types/presentationLayer';
import { createDefaultTransformationContext } from '../../types/presentationLayer';
import type { TranzyVehicleResponse } from '../../types/tranzyApi';

interface StationVehicleGroup {
  station: { station: Station; distance: number };
  vehicles: VehicleDisplayData[];
  allRoutes: Array<{
    routeId: string;
    routeName: string;
    vehicleCount: number;
  }>;
}

export interface UseVehicleDisplayOptions {
  filterByFavorites?: boolean;
  maxStations?: number; // Will be enforced to maximum of 2 stations
  maxVehiclesPerStation?: number;
  showAllVehiclesPerRoute?: boolean;
}

// Station selection metadata for debugging and empty states
interface StationSelectionMetadata {
  totalStationsEvaluated: number;
  stationsWithRoutes: number;
  stationsInRadius: number;
  rejectedByDistance: number;
  rejectedByThreshold: number;
  rejectedByRoutes: number;
  selectionTime: number;
  thresholdUsed: number;
  stabilityApplied: boolean;
}

export interface UseVehicleDisplayResult {
  stationVehicleGroups: StationVehicleGroup[];
  transformedData: TransformedVehicleData | null;
  stationSelectionResult: StationSelectionResult | null;
  stationSelectionMetadata: StationSelectionMetadata | null;
  isLoading: boolean;
  isLoadingStations: boolean;
  isLoadingVehicles: boolean;
  isProcessingVehicles: boolean;
  effectiveLocationForDisplay: Coordinates | null;
  favoriteRoutes: FavoriteRoute[];
  allStations: Station[];
  vehicles: CoreVehicle[];
  error?: StandardError;
}



/**
 * Vehicle display hook using new transformation service architecture
 * Uses VehicleTransformationService for all data processing
 * Requirements: 2.4, 8.1, 8.2
 */
export const useVehicleDisplay = (options: UseVehicleDisplayOptions = {}): UseVehicleDisplayResult => {
  const {
    filterByFavorites = false,
    maxStations = 2,
    maxVehiclesPerStation = 5
  } = options;

  // Enforce 2-station maximum display limit (Requirements 2.5, 6.4)
  const enforcedMaxStations = Math.min(maxStations, 2);

  const { currentLocation } = useLocationStore();
  const { config, getFavoriteRoutes } = useConfigStore();

  const effectiveLocationForDisplay = getEffectiveLocation(
    currentLocation,
    config?.homeLocation,
    config?.workLocation,
    config?.defaultLocation
  );

  const favoriteRoutes = useMemo(() => {
    return filterByFavorites ? getFavoriteRoutes() : [];
  }, [filterByFavorites, getFavoriteRoutes]);

  const agencyId = config?.agencyId;
  const apiKey = config?.apiKey;

  // Use generic store data hooks
  const stationDataResult = useStationData({ agencyId, cacheMaxAge: 5 * 60 * 1000 });
  const vehicleDataResult = useVehicleData({ 
    agencyId, 
    cacheMaxAge: 30 * 1000, 
    autoRefresh: true, 
    refreshInterval: 30 * 1000 
  });
  const routeDataResult = useRouteData({ agencyId, cacheMaxAge: 10 * 60 * 1000 });
  // Use longer cache to avoid duplicate calls during refresh
  const stopTimesDataResult = useStopTimesData({ agencyId, cacheMaxAge: 5 * 60 * 1000 });

  const allStations = stationDataResult.data || [];
  const vehicles = vehicleDataResult.data || [];
  const routes = routeDataResult.data || [];
  const stopTimes = stopTimesDataResult.data || [];

  const isLoadingStations = stationDataResult.isLoading;
  const isLoadingVehicles = vehicleDataResult.isLoading;
  const isLoading = isLoadingStations || routeDataResult.isLoading || stopTimesDataResult.isLoading;

  // Standardized error handling
  const error = useMemo(() => {
    const errors = [
      stationDataResult.error,
      vehicleDataResult.error,
      routeDataResult.error,
      stopTimesDataResult.error
    ].filter(Boolean);

    if (errors.length === 0) return undefined;

    const primaryError = errors[0]!;
    return ErrorHandler.createError(
      primaryError.type,
      `Data fetch failed: ${primaryError.message}`,
      { errorCount: errors.length, hasData: allStations.length > 0 || vehicles.length > 0 },
      primaryError.originalError
    );
  }, [stationDataResult.error, vehicleDataResult.error, routeDataResult.error, stopTimesDataResult.error, allStations.length, vehicles.length]);

  // Fetch trips data for proper StationSelector integration
  const [tripsData, setTripsData] = useState<any[] | null>(null);
  
  useEffect(() => {
    const fetchTripsData = async () => {
      if (!agencyId || !apiKey) return;
      
      try {
        const trips = await enhancedTranzyApi.getTrips(parseInt(agencyId));
        setTripsData(trips);
      } catch (error) {
        logger.warn('Failed to fetch trips data for StationSelector', { error }, 'useVehicleDisplay');
        setTripsData(null);
      }
    };
    
    fetchTripsData();
  }, [agencyId, apiKey]);

  // Station selection using StationSelector service
  // Requirements 3.1, 3.2, 3.3, 3.5: Route association filtering integration
  // Requirements 2.1, 2.2, 2.3: Ensure NEARBY_STATION_DISTANCE_THRESHOLD is used consistently
  const { stationSelectionResult, stationSelectionMetadata } = useMemo((): {
    stationSelectionResult: StationSelectionResult | null;
    stationSelectionMetadata: StationSelectionMetadata | null;
  } => {
    if (!effectiveLocationForDisplay || allStations.length === 0) {
      return {
        stationSelectionResult: null,
        stationSelectionMetadata: null
      };
    }

    const selectionStartTime = performance.now();

    // Requirements 3.1, 3.2: Only consider stations with route associations
    // First, enhance stations with existing route data if available
    const stationsWithRouteInfo = allStations.map(station => {
      // Use existing station.routes property if available (Requirements 3.2)
      if (station.routes && Array.isArray(station.routes) && station.routes.length > 0) {
        return {
          ...station,
          hasRouteAssociations: true,
          routeIds: station.routes
        };
      }
      
      // If no station.routes property, we'll rely on GTFS data in StationSelector
      return {
        ...station,
        hasRouteAssociations: false,
        routeIds: []
      };
    });

    // Requirements 3.4: Handle edge case where all stations lack route associations
    const stationsWithExistingRoutes = stationsWithRouteInfo.filter(s => s.hasRouteAssociations);
    
    // If we have stations with existing route data, prefer those
    // Otherwise, let StationSelector handle route association filtering via GTFS data
    const stationsToEvaluate = stationsWithExistingRoutes.length > 0 
      ? stationsWithExistingRoutes.map(s => ({ ...s, routes: s.routeIds }))
      : allStations;

    // Requirements 3.4: If no routes are available at all, return appropriate result
    if (routes.length === 0 && stationsWithExistingRoutes.length === 0) {
      logger.warn('No route data available for station selection', {
        totalStations: allStations.length,
        stationsWithRoutes: stationsWithExistingRoutes.length,
        routeDataCount: routes.length
      }, 'useVehicleDisplay');
      
      const selectionEndTime = performance.now();
      const selectionTime = selectionEndTime - selectionStartTime;
      
      return {
        stationSelectionResult: {
          closestStation: null,
          secondStation: null,
          rejectedStations: allStations.map(station => ({
            station,
            rejectionReason: 'no_routes' as const
          }))
        },
        stationSelectionMetadata: {
          totalStationsEvaluated: allStations.length,
          stationsWithRoutes: 0,
          stationsInRadius: 0,
          rejectedByDistance: 0,
          rejectedByThreshold: 0,
          rejectedByRoutes: allStations.length,
          selectionTime,
          thresholdUsed: NEARBY_STATION_DISTANCE_THRESHOLD,
          stabilityApplied: false
        }
      };
    }

    const criteria: StationSelectionCriteria = {
      userLocation: effectiveLocationForDisplay,
      availableStations: stationsToEvaluate,
      routeData: routes,
      stopTimesData: stopTimes.length > 0 ? stopTimes : undefined,
      tripsData: tripsData || undefined,
      maxSearchRadius: 5000 // 5km search radius
    };

    try {
      const result = stationSelector.selectStations(criteria);
      
      // Calculate metadata from the selection result
      const selectionEndTime = performance.now();
      const selectionTime = selectionEndTime - selectionStartTime;
      
      // Count stations in different categories
      const rejectedByRoutes = result.rejectedStations.filter(r => r.rejectionReason === 'no_routes').length;
      const rejectedByDistance = result.rejectedStations.filter(r => r.rejectionReason === 'too_far').length;
      const rejectedByThreshold = result.rejectedStations.filter(r => r.rejectionReason === 'threshold_exceeded').length;
      
      // Calculate stations that had routes (total - rejected by no routes)
      const stationsWithRoutes = stationsToEvaluate.length - rejectedByRoutes;
      
      // Calculate stations in radius (stations with routes - rejected by distance)
      const stationsInRadius = stationsWithRoutes - rejectedByDistance;
      
      const metadata: StationSelectionMetadata = {
        totalStationsEvaluated: stationsToEvaluate.length,
        stationsWithRoutes,
        stationsInRadius,
        rejectedByDistance,
        rejectedByThreshold,
        rejectedByRoutes,
        selectionTime,
        thresholdUsed: NEARBY_STATION_DISTANCE_THRESHOLD,
        stabilityApplied: false // TODO: Will be updated when GPS stability is implemented
      };
      
      // Requirements 3.4: Handle edge case where StationSelector finds no stations with routes
      if (!result.closestStation && !result.secondStation) {
        const allRejectedForNoRoutes = result.rejectedStations.every(
          rejected => rejected.rejectionReason === 'no_routes'
        );
        
        if (allRejectedForNoRoutes) {
          logger.warn('All nearby stations lack route associations', {
            totalStationsEvaluated: stationsToEvaluate.length,
            rejectedCount: result.rejectedStations.length,
            userLocation: effectiveLocationForDisplay
          }, 'useVehicleDisplay');
        }
      }
      
      // Validate that the result respects the 2-station maximum limit (Requirements 2.5, 6.4)
      if (result.closestStation && result.secondStation) {
        logger.debug('Station selection with distance threshold validation', {
          hasClosestStation: !!result.closestStation,
          hasSecondStation: !!result.secondStation,
          distanceThreshold: NEARBY_STATION_DISTANCE_THRESHOLD,
          rejectedCount: result.rejectedStations.length,
          userLocation: effectiveLocationForDisplay,
          metadata
        }, 'useVehicleDisplay');
      }
      
      logger.debug('Station selection completed with route association filtering', {
        hasClosestStation: !!result.closestStation,
        hasSecondStation: !!result.secondStation,
        rejectedCount: result.rejectedStations.length,
        stationsWithExistingRoutes: stationsWithExistingRoutes.length,
        totalStationsEvaluated: stationsToEvaluate.length,
        userLocation: effectiveLocationForDisplay,
        metadata
      }, 'useVehicleDisplay');

      return {
        stationSelectionResult: result,
        stationSelectionMetadata: metadata
      };
    } catch (selectionError) {
      logger.error('StationSelector failed during route association filtering', {
        error: selectionError instanceof Error ? selectionError.message : String(selectionError),
        criteriaValid: {
          hasUserLocation: !!effectiveLocationForDisplay,
          stationCount: stationsToEvaluate.length,
          routeCount: routes.length,
          hasStopTimes: stopTimes.length > 0,
          hasTrips: !!tripsData
        },
        stationsWithExistingRoutes: stationsWithExistingRoutes.length
      }, 'useVehicleDisplay');
      
      const selectionEndTime = performance.now();
      const selectionTime = selectionEndTime - selectionStartTime;
      
      return {
        stationSelectionResult: null,
        stationSelectionMetadata: {
          totalStationsEvaluated: stationsToEvaluate.length,
          stationsWithRoutes: stationsWithExistingRoutes.length,
          stationsInRadius: 0,
          rejectedByDistance: 0,
          rejectedByThreshold: 0,
          rejectedByRoutes: 0,
          selectionTime,
          thresholdUsed: NEARBY_STATION_DISTANCE_THRESHOLD,
          stabilityApplied: false
        }
      };
    }
  }, [effectiveLocationForDisplay, allStations, routes, stopTimes, tripsData]);

  // Create transformation context
  const transformationContext = useMemo((): TransformationContext | null => {
    // Validate required configuration
    if (!apiKey || !agencyId || apiKey.trim() === '' || agencyId.trim() === '') {
      logger.debug('Missing or invalid API configuration', {
        hasApiKey: !!apiKey,
        hasAgencyId: !!agencyId,
        apiKeyLength: apiKey?.length || 0,
        agencyIdLength: agencyId?.length || 0
      }, 'useVehicleDisplay');
      return null;
    }

    const context = createDefaultTransformationContext(apiKey.trim(), agencyId.trim());
    
    // Update context with current data
    context.userLocation = effectiveLocationForDisplay || undefined;
    context.homeLocation = config?.homeLocation;
    context.workLocation = config?.workLocation;
    context.favoriteRoutes = favoriteRoutes.map(fr => fr.routeId);
    context.maxVehiclesPerRoute = maxVehiclesPerStation;
    context.maxRoutes = enforcedMaxStations; // Enforce maximum 2 stations limit
    context.routeData = routes; // Add route data for name lookups
    
    // Use selected stations from StationSelectionResult instead of raw slicing
    // Requirements 2.5, 6.4: Enforce maximum 2 stations (closest + optional second)
    const selectedStations: TransformationStation[] = [];
    
    if (stationSelectionResult?.closestStation) {
      selectedStations.push(convertToTransformationStation(stationSelectionResult.closestStation, stopTimes, tripsData));
    }
    
    if (stationSelectionResult?.secondStation) {
      selectedStations.push(convertToTransformationStation(stationSelectionResult.secondStation, stopTimes, tripsData));
    }
    
    // Validate that we never exceed 2 stations (Requirements 2.5, 6.4)
    if (selectedStations.length > 2) {
      logger.warn('Station selection exceeded 2-station limit, truncating', {
        selectedCount: selectedStations.length,
        maxAllowed: 2
      }, 'useVehicleDisplay');
      selectedStations.splice(2); // Keep only first 2 stations
    }
    
    // Requirements 3.3, 3.4: Handle case where no stations have route associations
    if (selectedStations.length === 0) {
      // Check if this is due to lack of route associations vs other reasons
      if (stationSelectionResult && stationSelectionResult.rejectedStations.length > 0) {
        const allRejectedForNoRoutes = stationSelectionResult.rejectedStations.every(
          rejected => rejected.rejectionReason === 'no_routes'
        );
        
        if (allRejectedForNoRoutes) {
          logger.warn('No transformation context: all stations lack route associations', {
            totalStationsEvaluated: allStations.length,
            rejectedForNoRoutes: stationSelectionResult.rejectedStations.length,
            hasRouteData: routes.length > 0
          }, 'useVehicleDisplay');
        } else {
          logger.debug('No transformation context: stations rejected for other reasons', {
            rejectedStations: stationSelectionResult.rejectedStations.map(r => ({
              stationId: r.station.id,
              reason: r.rejectionReason
            }))
          }, 'useVehicleDisplay');
        }
      } else if (allStations.length > 0) {
        logger.error('StationSelector failed and no fallback available - this should not happen in production', {
          availableStations: allStations.length,
          hasStationSelectionResult: !!stationSelectionResult
        }, 'useVehicleDisplay');
      }
      
      // Return null context to prevent transformation with invalid data
      return null;
    } else {
      context.targetStations = selectedStations;
      
      // Validate distance threshold enforcement (Requirements 2.1, 2.2, 2.3, 7.2)
      if (selectedStations.length === 2 && stationSelectionResult?.closestStation && stationSelectionResult?.secondStation) {
        const distanceBetweenStations = calculateDistance(
          stationSelectionResult.closestStation.coordinates,
          stationSelectionResult.secondStation.coordinates
        );
        
        if (distanceBetweenStations > NEARBY_STATION_DISTANCE_THRESHOLD) {
          logger.warn('Second station exceeds distance threshold but was selected', {
            distanceBetweenStations,
            threshold: NEARBY_STATION_DISTANCE_THRESHOLD,
            closestStationId: stationSelectionResult.closestStation.id,
            secondStationId: stationSelectionResult.secondStation.id
          }, 'useVehicleDisplay');
        } else {
          logger.debug('Distance threshold validation passed with route association filtering', {
            distanceBetweenStations,
            threshold: NEARBY_STATION_DISTANCE_THRESHOLD,
            stationCount: selectedStations.length,
            stationsHaveRoutes: selectedStations.every(s => s.routeIds.length > 0)
          }, 'useVehicleDisplay');
        }
      }
    }

    // Determine user context
    if (effectiveLocationForDisplay && config?.workLocation) {
      const distanceToWork = calculateDistance(effectiveLocationForDisplay, config.workLocation);
      if (distanceToWork < 500) { // Within 500m of work
        context.userContext = 'work';
        context.isAtWork = true;
      }
    }
    
    if (effectiveLocationForDisplay && config?.homeLocation) {
      const distanceToHome = calculateDistance(effectiveLocationForDisplay, config.homeLocation);
      if (distanceToHome < 500) { // Within 500m of home
        context.userContext = 'home';
        context.isAtHome = true;
      }
    }

    return context;
  }, [apiKey, agencyId, effectiveLocationForDisplay, config, favoriteRoutes, stationSelectionResult, allStations, maxStations, maxVehiclesPerStation, tripsData]);

  // Transform vehicle data using the transformation service
  const [transformedData, setTransformedData] = useState<TransformedVehicleData | null>(null);

  const transformVehicleData = useCallback(async () => {
    if (!transformationContext) {
      logger.debug('No transformation context available', {
        hasApiKey: !!apiKey,
        hasAgencyId: !!agencyId,
        configExists: !!config
      }, 'useVehicleDisplay');
      setTransformedData(null);
      return;
    }

    if (vehicles.length === 0) {
      logger.debug('No vehicles to transform', {
        vehicleCount: vehicles.length,
        isLoadingVehicles
      }, 'useVehicleDisplay');
      setTransformedData(null);
      return;
    }

    try {
      // Convert CoreVehicle to TranzyVehicleResponse format
      const rawVehicleData: TranzyVehicleResponse[] = vehicles.map(vehicle => ({
        id: vehicle.id,
        route_id: parseInt(vehicle.routeId) || 0,
        trip_id: vehicle.tripId,
        label: vehicle.label || `Vehicle ${vehicle.id}`,
        // CoreVehicle uses position object
        latitude: vehicle.position.latitude,
        longitude: vehicle.position.longitude,
        bearing: vehicle.bearing,
        speed: vehicle.speed || 0,
        timestamp: vehicle.timestamp instanceof Date ? vehicle.timestamp.toISOString() : String(vehicle.timestamp),
        vehicle_type: 3, // Bus type (GTFS standard)
        wheelchair_accessible: vehicle.isWheelchairAccessible ? 'WHEELCHAIR_ACCESSIBLE' : 'WHEELCHAIR_INACCESSIBLE',
        bike_accessible: vehicle.isBikeAccessible ? 'BIKE_ACCESSIBLE' : 'BIKE_INACCESSIBLE'
      }));

      // Apply filtering if needed
      const filteredData = filterByFavorites 
        ? rawVehicleData.filter(v => favoriteRoutes.some(fr => fr.routeId === String(v.route_id)))
        : rawVehicleData;

      // Transform using the service
      const result = await vehicleTransformationService.transform(filteredData, transformationContext);
      
      // Enhance direction data with stop sequences using actual GTFS data
      if (stopTimes.length > 0) {
        for (const [vehicleId, direction] of result.directions.entries()) {
          const vehicle = result.vehicles.get(vehicleId);
          if (vehicle?.tripId) {
            // Find stop times for this trip
            const tripStopTimes = stopTimes
              .filter(st => st.tripId === vehicle.tripId)
              .sort((a, b) => a.sequence - b.sequence);
            
            if (tripStopTimes.length > 0) {
              // Generate stop sequence from actual GTFS data
              const stopSequence = tripStopTimes.map((stopTime, index) => {
                const station = allStations.find(s => s.id === stopTime.stopId);
                return {
                  stopId: stopTime.stopId,
                  stopName: station?.name || `Stop ${stopTime.stopId}`,
                  sequence: stopTime.sequence,
                  isCurrent: direction.isAtStation && direction.stationId === stopTime.stopId,
                  isDestination: index === tripStopTimes.length - 1,
                  estimatedArrival: undefined // Could be calculated from schedule data
                };
              });
              
              // Update the direction with stop sequence
              const enhancedDirection = {
                ...direction,
                stopSequence
              };
              
              result.directions.set(vehicleId, enhancedDirection);
            }
          }
        }
      }
      
      logger.info('Vehicle transformation completed', {
        vehiclesProcessed: filteredData.length,
        vehiclesTransformed: result.vehicles.size,
        stationsAnalyzed: result.vehiclesByStation.size,
        vehiclesWithStopSequences: Array.from(result.directions.values()).filter(d => d.stopSequence && d.stopSequence.length > 0).length
      }, 'useVehicleDisplay');

      setTransformedData(result);
    } catch (transformationError) {
      // Pass the error directly as the second parameter, with additional data in a separate object
      const errorToLog = transformationError instanceof Error 
        ? transformationError 
        : new Error(String(transformationError));
      
      logger.error('Vehicle transformation failed', errorToLog, 'useVehicleDisplay');
      
      // Log detailed context for debugging
      logger.info('Transformation failure context', {
        vehicleCount: vehicles.length,
        hasContext: !!transformationContext,
        contextDetails: transformationContext ? {
          hasApiConfig: !!transformationContext.apiConfig,
          apiKeyLength: transformationContext.apiConfig?.apiKey?.length || 0,
          agencyId: transformationContext.apiConfig?.agencyId,
          targetStationsCount: transformationContext.targetStations?.length || 0,
          favoriteRoutesCount: transformationContext.favoriteRoutes?.length || 0,
          hasPreferences: !!transformationContext.preferences,
          timestamp: transformationContext.timestamp
        } : null,
        errorType: errorToLog.name,
        errorMessage: errorToLog.message
      }, 'useVehicleDisplay');
      
      setTransformedData(null);
    }
  }, [transformationContext, vehicles, filterByFavorites, favoriteRoutes, stopTimes, allStations]);

  // Effect to trigger transformation when dependencies change
  useEffect(() => {
    transformVehicleData();
  }, [transformVehicleData]);

  // Convert transformed data to station vehicle groups
  const stationVehicleGroups = useMemo(() => {
    // If transformation failed or no data, return empty array
    if (!transformedData) {
      logger.debug('No transformed data available for station grouping', {
        hasTransformedData: !!transformedData,
        effectiveLocationExists: !!effectiveLocationForDisplay,
        stationCount: allStations.length,
        vehicleCount: vehicles.length
      }, 'useVehicleDisplay');
      return [];
    }

    try {
      const groups: StationVehicleGroup[] = [];

      // Group vehicles by station using the transformed data
      for (const [stationId, vehicleIds] of transformedData.vehiclesByStation.entries()) {
        const stationInfo = transformedData.stationInfo.get(stationId);
        const station = allStations.find(s => s.id === stationId);

        // Get display data for vehicles at this station
        const vehicleDisplayData: VehicleDisplayData[] = vehicleIds
          .map(vehicleId => transformedData.displayData.get(vehicleId))
          .filter((data): data is VehicleDisplayData => data !== undefined)
          .slice(0, maxVehiclesPerStation)
          .sort((a, b) => b.displayPriority - a.displayPriority);

        if (vehicleDisplayData.length === 0) {
          continue;
        }

        // Calculate distance to station
        const distance = effectiveLocationForDisplay 
          ? calculateDistance(effectiveLocationForDisplay, stationInfo.coordinates)
          : 0;

        // Get route information
        const routeMap = new Map<string, { routeId: string; routeName: string; vehicleCount: number }>();
        
        for (const displayData of vehicleDisplayData) {
          const routeId = displayData.routeName;
          if (!routeMap.has(routeId)) {
            routeMap.set(routeId, {
              routeId,
              routeName: displayData.routeName,
              vehicleCount: 0
            });
          }
          routeMap.get(routeId)!.vehicleCount++;
        }

        groups.push({
          station: {
            station,
            distance
          },
          vehicles: vehicleDisplayData,
          allRoutes: Array.from(routeMap.values())
        });
      }

      // Sort by distance and limit to enforcedMaxStations
      return groups
        .sort((a, b) => a.station.distance - b.station.distance)
        .slice(0, enforcedMaxStations);

    } catch (processingError) {
      logger.error('Station grouping failed', {
        error: processingError instanceof Error ? processingError.message : String(processingError)
      }, 'useVehicleDisplay');
      return [];
    }
  }, [transformedData, allStations, maxVehiclesPerStation, maxStations, effectiveLocationForDisplay]);

  const isProcessingVehicles = isLoading && (allStations.length > 0 || vehicles.length > 0);

  return {
    stationVehicleGroups,
    transformedData: transformedData || null,
    stationSelectionResult,
    stationSelectionMetadata,
    isLoading,
    isLoadingStations,
    isLoadingVehicles,
    isProcessingVehicles,
    effectiveLocationForDisplay,
    favoriteRoutes,
    allStations,
    vehicles,
    error
  };
};

// Helper function to convert Station or StationWithRoutes to TransformationStation
// Requirements 3.2: Use existing station.routes data when available
function convertToTransformationStation(
  station: Station | StationWithRoutes, 
  stopTimes?: any[], 
  trips?: any[]
): TransformationStation {
  // Extract route IDs from different possible sources
  let routeIds: string[] = [];
  
  if ('associatedRoutes' in station && station.associatedRoutes) {
    // StationWithRoutes has associatedRoutes array
    routeIds = station.associatedRoutes.map(route => route.id);
  } else if (station.routes && Array.isArray(station.routes)) {
    // Station has routes property (Requirements 3.2: Pass existing station.routes data)
    routeIds = station.routes;
  } else if (stopTimes && trips) {
    // Fallback: Extract route IDs from GTFS data
    try {
      // Find stop times for this station
      const stationStopTimes = stopTimes.filter(st => 
        st.stop_id === station.id || st.stop_id === station.id.toString()
      );
      
      // Get trip IDs from stop times
      const tripIds = [...new Set(stationStopTimes.map(st => st.trip_id))].filter(Boolean);
      
      // Find routes from trips
      const stationTrips = trips.filter(trip => tripIds.includes(trip.trip_id));
      const stationRouteIds = [...new Set(stationTrips.map(trip => trip.route_id))].filter(Boolean);
      
      routeIds = stationRouteIds.map(id => id.toString());
      
      if (routeIds.length > 0) {
        logger.debug('Populated station route IDs from GTFS data', {
          stationId: station.id,
          stationName: station.name,
          routeIds,
          stopTimesCount: stationStopTimes.length,
          tripsCount: stationTrips.length
        }, 'useVehicleDisplay');
      }
    } catch (error) {
      logger.warn('Failed to extract route IDs from GTFS data', {
        stationId: station.id,
        stationName: station.name,
        error: error instanceof Error ? error.message : String(error)
      }, 'useVehicleDisplay');
    }
  }
  
  // Requirements 3.1: Log when stations lack route associations
  if (routeIds.length === 0) {
    logger.warn('Converting station without route associations to TransformationStation', {
      stationId: station.id,
      stationName: station.name,
      hasAssociatedRoutes: 'associatedRoutes' in station && !!station.associatedRoutes,
      hasRoutesProperty: !!station.routes,
      hasGtfsData: !!(stopTimes && trips),
      stopTimesAvailable: stopTimes?.length || 0,
      tripsAvailable: trips?.length || 0
    }, 'useVehicleDisplay');
  }
  
  return {
    id: station.id,
    name: station.name,
    coordinates: {
      latitude: station.coordinates.latitude,
      longitude: station.coordinates.longitude
    },
    routeIds,
    isFavorite: station.isFavorite || false,
    accessibility: {
      wheelchairAccessible: false, // Station accessibility not available in current Station type
      bikeRacks: false,
      audioAnnouncements: false
    }
  };
}

// Helper function to calculate distance between two coordinates
function calculateDistance(pos1: Coordinates, pos2: Coordinates): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = pos1.latitude * Math.PI / 180;
  const φ2 = pos2.latitude * Math.PI / 180;
  const Δφ = (pos2.latitude - pos1.latitude) * Math.PI / 180;
  const Δλ = (pos2.longitude - pos1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}