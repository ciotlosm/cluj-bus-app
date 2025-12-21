/**
 * GPS-First Data Loading Service
 * 
 * Implements the GPS-first approach to ensure reliable data loading:
 * 1. Fetch all stops
 * 2. Fetch stop times 
 * 3. Find closest stop based on GPS coordinates
 * 4. Validate stop has valid trip_id in stop_times
 * 5. Find second stop within radius with valid trip_id
 * 6. Get routes, shapes, headsign from trips
 * 7. Get vehicles based on trip_id
 * 
 * This ensures we only display data that is complete and validated.
 */

import type { Coordinates, Station } from '../types';
import type { Route, StopTime, Trip } from '../types/tranzyApi';
import type { CoreVehicle } from '../types/coreVehicle';
import { enhancedTranzyApi } from '../api/tranzyApiService';
import { calculateDistance } from '../utils/distanceUtils';
import { logger } from '../utils/shared/logger';
// Legacy enhanceVehicleWithRoute import removed - using VehicleTransformationService instead
import { vehicleTransformationService } from './VehicleTransformationService';
import { createDefaultTransformationContext } from '../types/presentationLayer';
import type { TransformationContext, TransformedVehicleData } from '../types/presentationLayer';
import type { TranzyVehicleResponse } from '../types/tranzyApi';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ValidatedStop {
  stop: Station;
  validTripIds: string[];
  distanceFromUser: number;
}

export interface EnhancedVehicleWithStops extends CoreVehicle {
  stopSequence?: Array<{
    stopId: string;
    stopName: string;
    sequence: number;
    isCurrent: boolean;
    isDestination: boolean;
  }>;
  _internalDirection?: 'arriving' | 'departing' | 'unknown';
  estimatedMinutes?: number;
}

export interface GpsFirstDataResult {
  primaryStop: ValidatedStop | null;
  secondaryStop: ValidatedStop | null;
  availableTrips: Trip[];
  availableRoutes: Route[];
  vehicles: CoreVehicle[];
  enhancedVehicles: EnhancedVehicleWithStops[]; // Vehicles with stopSequence data
  stopTimes: StopTime[]; // Expose stopTimes for further processing if needed
  validationMetadata: {
    totalStopsEvaluated: number;
    stopsWithValidTrips: number;
    tripsFound: number;
    vehiclesFound: number;
    processingTime: number;
  };
}

export interface GpsFirstDataOptions {
  userLocation: Coordinates;
  agencyId: number;
  maxSearchRadius?: number; // Default 1000m
  secondStopRadius?: number; // Default 200m  
  forceRefresh?: boolean;
}

// ============================================================================
// GPS-FIRST DATA LOADER
// ============================================================================

export class GpsFirstDataLoader {
  private readonly DEFAULT_MAX_RADIUS = 1000; // 1km
  private readonly DEFAULT_SECOND_STOP_RADIUS = 200; // 200m

  /**
   * Main GPS-first data loading method
   * Implements the complete validation pipeline
   */
  async loadValidatedData(options: GpsFirstDataOptions): Promise<GpsFirstDataResult> {
    const startTime = performance.now();
    const {
      userLocation,
      agencyId,
      maxSearchRadius = this.DEFAULT_MAX_RADIUS,
      secondStopRadius = this.DEFAULT_SECOND_STOP_RADIUS,
      forceRefresh = false
    } = options;

    logger.info('Starting GPS-first data loading', {
      userLocation,
      agencyId,
      maxSearchRadius,
      secondStopRadius,
      forceRefresh
    });

    try {
      // Step 1: Fetch all stops
      logger.debug('Step 1: Fetching all stops');
      const allStops = await enhancedTranzyApi.getStops(agencyId, forceRefresh);
      
      if (allStops.length === 0) {
        throw new Error('No stops available from API');
      }

      // Step 2: Fetch stop times
      logger.debug('Step 2: Fetching stop times');
      const allStopTimes = await enhancedTranzyApi.getStopTimes(agencyId, undefined, undefined, forceRefresh);
      
      if (allStopTimes.length === 0) {
        throw new Error('No stop times available from API');
      }

      // Step 3: Find closest stop with valid trip_id
      logger.debug('Step 3: Finding closest stop with valid trip_id');
      const primaryStop = await this.findClosestValidStop(
        userLocation,
        allStops,
        allStopTimes,
        maxSearchRadius
      );

      if (!primaryStop) {
        logger.warn('No valid primary stop found within radius', { maxSearchRadius });
        return this.createEmptyResult(allStops.length, 0, 0, 0, performance.now() - startTime);
      }

      // Step 4: Find second stop within smaller radius
      logger.debug('Step 4: Finding second stop within radius');
      const secondaryStop = await this.findSecondValidStop(
        primaryStop,
        allStops,
        allStopTimes,
        secondStopRadius
      );

      // Step 5: Get all unique trip IDs from both stops
      const allValidTripIds = new Set([
        ...primaryStop.validTripIds,
        ...(secondaryStop?.validTripIds || [])
      ]);

      // Step 6: Get trips data for route and headsign information
      logger.debug('Step 5: Fetching trips data for route information');
      const allTrips = await enhancedTranzyApi.getTrips(agencyId, undefined, forceRefresh);
      
      // Filter trips to only those that serve our stops
      const relevantTrips = allTrips.filter(trip => allValidTripIds.has(trip.id));

      // Step 7: Get routes data
      logger.debug('Step 6: Fetching routes data');
      const allRoutes = await enhancedTranzyApi.getRoutes(agencyId, forceRefresh);
      
      // Filter routes to only those used by our trips
      const relevantRouteIds = new Set(relevantTrips.map(trip => trip.routeId));
      const relevantRoutes = allRoutes.filter(route => relevantRouteIds.has(route.id));

      // Step 8: Get vehicles based on trip_ids
      logger.debug('Step 7: Fetching vehicles for relevant trips');
      const allVehicles = await enhancedTranzyApi.getVehicles(agencyId);
      
      // Filter vehicles to only those with trip_ids that serve our stops
      const relevantVehicles = allVehicles.filter(vehicle => 
        vehicle.tripId && allValidTripIds.has(vehicle.tripId)
      );

      // Step 9: Use VehicleTransformationService for enhanced vehicle processing
      logger.debug('Step 8: Using VehicleTransformationService for vehicle enhancement');
      let enhancedVehicles: EnhancedVehicleWithStops[] = [];
      let transformedData: TransformedVehicleData | null = null;
      
      try {
        // Convert CoreVehicle to TranzyVehicleResponse format for transformation service
        const rawVehicleData: TranzyVehicleResponse[] = relevantVehicles.map(vehicle => ({
          id: vehicle.id,
          route_id: parseInt(vehicle.routeId),
          trip_id: vehicle.tripId,
          label: vehicle.label,
          latitude: vehicle.position.latitude,
          longitude: vehicle.position.longitude,
          timestamp: vehicle.timestamp.toISOString(),
          speed: vehicle.speed,
          bearing: vehicle.bearing,
          vehicle_type: 3, // Default to bus type
          wheelchair_accessible: vehicle.isWheelchairAccessible ? 'WHEELCHAIR_ACCESSIBLE' : 'WHEELCHAIR_INACCESSIBLE',
          bike_accessible: vehicle.isBikeAccessible ? 'BIKE_ACCESSIBLE' : 'BIKE_INACCESSIBLE'
        }));

        // Create transformation context
        const context = this.createTransformationContext(userLocation, agencyId, primaryStop, secondaryStop);

        // Use the transformation service
        transformedData = await vehicleTransformationService.transform(rawVehicleData, context);

        // Convert transformed data to enhanced vehicles format
        enhancedVehicles = this.convertTransformedDataToEnhancedVehicles(
          transformedData,
          relevantVehicles,
          allStops,
          allStopTimes
        );

        logger.info('Successfully enhanced vehicles using VehicleTransformationService', {
          vehiclesProcessed: rawVehicleData.length,
          enhancedVehicles: enhancedVehicles.length,
          transformationDuration: transformedData.metadata.transformationDuration
        });

      } catch (error) {
        logger.warn('VehicleTransformationService failed, falling back to legacy enhancement', {
          error: error instanceof Error ? error.message : String(error),
          vehicleCount: relevantVehicles.length
        });

        // Fallback: return basic enhanced vehicles without transformation
        enhancedVehicles = relevantVehicles.map(vehicle => ({
          ...vehicle,
          stopSequence: []
        }));
      }

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      const result: GpsFirstDataResult = {
        primaryStop,
        secondaryStop,
        availableTrips: relevantTrips,
        availableRoutes: relevantRoutes,
        vehicles: relevantVehicles,
        enhancedVehicles,
        stopTimes: allStopTimes,
        validationMetadata: {
          totalStopsEvaluated: allStops.length,
          stopsWithValidTrips: secondaryStop ? 2 : 1,
          tripsFound: relevantTrips.length,
          vehiclesFound: relevantVehicles.length,
          processingTime
        }
      };

      logger.info('GPS-first data loading completed successfully', {
        primaryStopId: primaryStop.stop.id,
        primaryStopName: primaryStop.stop.name,
        secondaryStopId: secondaryStop?.stop.id,
        secondaryStopName: secondaryStop?.stop.name,
        tripsFound: relevantTrips.length,
        routesFound: relevantRoutes.length,
        vehiclesFound: relevantVehicles.length,
        enhancedVehiclesFound: enhancedVehicles.length,
        vehiclesWithStopSequence: enhancedVehicles.filter(v => v.stopSequence && v.stopSequence.length > 0).length,
        processingTime: `${processingTime.toFixed(2)}ms`
      });

      return result;

    } catch (error) {
      const processingTime = performance.now() - startTime;
      const errorToLog = error instanceof Error ? error : new Error(String(error));
      logger.error('GPS-first data loading failed', errorToLog, 'GPS_FIRST');
      logger.info('GPS-first loading context', {
        userLocation,
        agencyId,
        processingTime: `${processingTime.toFixed(2)}ms`
      });
      
      return this.createEmptyResult(0, 0, 0, 0, processingTime);
    }
  }

  /**
   * Find the closest stop to user location that has valid trip_ids in stop_times
   */
  private async findClosestValidStop(
    userLocation: Coordinates,
    allStops: Station[],
    stopTimes: StopTime[],
    maxRadius: number
  ): Promise<ValidatedStop | null> {
    // Calculate distances and sort by proximity
    const stopsWithDistances = allStops
      .map(stop => ({
        stop,
        distance: calculateDistance(userLocation, stop.coordinates)
      }))
      .filter(item => item.distance <= maxRadius)
      .sort((a, b) => a.distance - b.distance);

    logger.debug('Evaluating stops for valid trip_ids', {
      stopsInRadius: stopsWithDistances.length,
      maxRadius
    });

    // Find the closest stop with valid trip_ids
    for (const { stop, distance } of stopsWithDistances) {
      const validTripIds = this.getValidTripIdsForStop(stop.id, stopTimes);
      
      if (validTripIds.length > 0) {
        logger.debug('Found valid primary stop', {
          stopId: stop.id,
          stopName: stop.name,
          distance: `${distance.toFixed(0)}m`,
          validTripIds: validTripIds.length
        });

        return {
          stop,
          validTripIds,
          distanceFromUser: distance
        };
      }
    }

    return null;
  }

  /**
   * Find a second stop within radius of the primary stop that also has valid trip_ids
   */
  private async findSecondValidStop(
    primaryStop: ValidatedStop,
    allStops: Station[],
    stopTimes: StopTime[],
    secondStopRadius: number
  ): Promise<ValidatedStop | null> {
    const primaryCoords = primaryStop.stop.coordinates;

    // Find stops within radius of primary stop
    const candidateStops = allStops
      .filter(stop => stop.id !== primaryStop.stop.id) // Exclude primary stop
      .map(stop => ({
        stop,
        distance: calculateDistance(primaryCoords, stop.coordinates)
      }))
      .filter(item => item.distance <= secondStopRadius)
      .sort((a, b) => a.distance - b.distance);

    logger.debug('Evaluating candidate second stops', {
      candidatesInRadius: candidateStops.length,
      secondStopRadius
    });

    // Find the closest candidate with valid trip_ids
    for (const { stop, distance } of candidateStops) {
      const validTripIds = this.getValidTripIdsForStop(stop.id, stopTimes);
      
      if (validTripIds.length > 0) {
        logger.debug('Found valid secondary stop', {
          stopId: stop.id,
          stopName: stop.name,
          distanceFromPrimary: `${distance.toFixed(0)}m`,
          validTripIds: validTripIds.length
        });

        return {
          stop,
          validTripIds,
          distanceFromUser: calculateDistance(primaryStop.stop.coordinates, stop.coordinates)
        };
      }
    }

    logger.debug('No valid secondary stop found within radius');
    return null;
  }

  /**
   * Get valid trip_ids for a stop from stop_times data
   * Validates that trip_id is not null, undefined, or empty
   */
  private getValidTripIdsForStop(stopId: string, stopTimes: StopTime[]): string[] {
    const validTripIds = stopTimes
      .filter(stopTime => 
        stopTime.stopId === stopId &&
        stopTime.tripId &&
        stopTime.tripId.trim() !== '' &&
        stopTime.tripId !== 'null' &&
        stopTime.tripId !== 'undefined'
      )
      .map(stopTime => stopTime.tripId)
      .filter((tripId, index, array) => array.indexOf(tripId) === index); // Remove duplicates

    return validTripIds;
  }

  /**
   * Create transformation context for the VehicleTransformationService
   */
  private createTransformationContext(
    userLocation: Coordinates,
    agencyId: number,
    primaryStop: ValidatedStop,
    secondaryStop: ValidatedStop | null
  ): TransformationContext {
    const context = createDefaultTransformationContext('', agencyId.toString());
    
    // Set user location
    context.userLocation = userLocation;
    
    // Add target stations
    context.targetStations = [
      {
        id: primaryStop.stop.id,
        name: primaryStop.stop.name,
        coordinates: primaryStop.stop.coordinates,
        routeIds: primaryStop.validTripIds,
        isFavorite: primaryStop.stop.isFavorite,
        accessibility: {
          wheelchairAccessible: true,
          bikeRacks: false,
          audioAnnouncements: false
        }
      }
    ];

    if (secondaryStop) {
      context.targetStations.push({
        id: secondaryStop.stop.id,
        name: secondaryStop.stop.name,
        coordinates: secondaryStop.stop.coordinates,
        routeIds: secondaryStop.validTripIds,
        isFavorite: secondaryStop.stop.isFavorite,
        accessibility: {
          wheelchairAccessible: true,
          bikeRacks: false,
          audioAnnouncements: false
        }
      });
    }

    return context;
  }

  /**
   * Convert transformed data to enhanced vehicles format for backward compatibility
   */
  private convertTransformedDataToEnhancedVehicles(
    transformedData: TransformedVehicleData,
    originalVehicles: CoreVehicle[],
    allStops: Station[],
    allStopTimes: StopTime[]
  ): EnhancedVehicleWithStops[] {
    const enhancedVehicles: EnhancedVehicleWithStops[] = [];
    const stopsMap = new Map(allStops.map(stop => [stop.id, stop]));

    for (const [vehicleId, coreVehicle] of transformedData.vehicles) {
      const originalVehicle = originalVehicles.find(v => v.id === vehicleId);
      if (!originalVehicle) continue;

      const schedule = transformedData.schedules.get(vehicleId);
      const direction = transformedData.directions.get(vehicleId);

      // Create stop sequence from trip data
      const tripStopTimes = allStopTimes
        .filter(st => st.tripId === coreVehicle.tripId)
        .sort((a, b) => a.sequence - b.sequence);

      const stopSequence = tripStopTimes.map((stopTime, index) => {
        const station = stopsMap.get(stopTime.stopId);
        return {
          stopId: stopTime.stopId,
          stopName: station?.name || `Stop ${stopTime.stopId}`,
          sequence: stopTime.sequence,
          isCurrent: direction?.isAtStation && direction.stationId === stopTime.stopId,
          isDestination: index === tripStopTimes.length - 1
        };
      });

      enhancedVehicles.push({
        ...originalVehicle,
        stopSequence: stopSequence.length > 0 ? stopSequence : undefined,
        _internalDirection: this.mapDirectionStatus(direction?.direction),
        estimatedMinutes: direction?.estimatedMinutes || schedule?.minutesUntilArrival || 5
      });
    }

    return enhancedVehicles;
  }

  /**
   * Map new direction status to legacy format
   */
  private mapDirectionStatus(direction?: string): 'arriving' | 'departing' | 'unknown' {
    switch (direction) {
      case 'arriving': return 'arriving';
      case 'departing': return 'departing';
      default: return 'unknown';
    }
  }

  // Legacy enhancement method removed - using VehicleTransformationService instead

  /**
   * Create empty result for error cases
   */
  private createEmptyResult(
    totalStops: number,
    stopsWithTrips: number,
    trips: number,
    vehicles: number,
    processingTime: number
  ): GpsFirstDataResult {
    return {
      primaryStop: null,
      secondaryStop: null,
      availableTrips: [],
      availableRoutes: [],
      vehicles: [],
      enhancedVehicles: [],
      stopTimes: [],
      validationMetadata: {
        totalStopsEvaluated: totalStops,
        stopsWithValidTrips: stopsWithTrips,
        tripsFound: trips,
        vehiclesFound: vehicles,
        processingTime
      }
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const gpsFirstDataLoader = new GpsFirstDataLoader();