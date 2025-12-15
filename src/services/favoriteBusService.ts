import { enhancedTranzyApi } from './tranzyApiService';
import { agencyService } from './agencyService';
import { routeMappingService } from './routeMappingService';
import { liveVehicleService } from './liveVehicleService';
import { logger } from '../utils/logger';

export interface BusStopInfo {
  id: string;
  name: string;
  sequence: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  arrivalTime?: string; // Scheduled arrival time (HH:MM:SS)
  departureTime?: string; // Scheduled departure time (HH:MM:SS)
  isCurrent?: boolean; // True if this is the current/next station in the route path
  isClosestToUser?: boolean; // True if this is the closest stop to the user's current location
  distanceToUser?: number; // Distance from user's location in meters
  distanceFromBus?: number; // Distance from bus to this station in meters
}

export interface FavoriteBusInfo {
  routeName: string; // route_short_name (e.g., "100", "101", "43B")
  routeDesc?: string; // route_long_name (e.g., "Piața Unirii - Mănăștur")
  routeType: 'bus' | 'trolleybus' | 'tram' | 'metro' | 'rail' | 'ferry' | 'other';
  vehicleId: string; // Live vehicle ID
  tripId: string; // Active trip ID (indicates direction: "40_0", "40_1", etc.)
  label?: string; // Vehicle label from API (e.g., "CJ-01-ABC")
  destination?: string; // Where the bus is going (from trip_headsign)
  latitude: number; // Current vehicle position
  longitude: number;
  speed?: number; // Vehicle speed if available
  bearing?: number; // Vehicle direction if available
  lastUpdate: Date; // When this vehicle data was last updated
  currentStation: {
    id: string;
    name: string;
    distance: number; // Distance in meters
    isAtStation: boolean; // True if bus is considered "at" the station (< 100m and speed = 0)
  } | null;
  stopSequence?: BusStopInfo[]; // Ordered list of stops for this trip
  direction?: 'inbound' | 'outbound'; // Trip direction
  distanceFromUser?: number; // Distance from user along the route shape in meters
}

export interface FavoriteBusResult {
  favoriteBuses: FavoriteBusInfo[];
  lastUpdate: Date;
}

class FavoriteBusService {

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(
    pos1: { latitude: number; longitude: number },
    pos2: { latitude: number; longitude: number }
  ): number {
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

  /**
   * Calculate distance from user to bus along the route shape
   * Uses trip_id to find shape_id, then calculates progressive distance along shape points
   */
  private async calculateDistanceAlongRoute(
    userLocation: { latitude: number; longitude: number },
    busLocation: { latitude: number; longitude: number },
    tripId: string,
    agencyId: number
  ): Promise<number | null> {
    try {
      // Get trip data to find shape_id
      const trips = await enhancedTranzyApi.getTrips(agencyId);
      const trip = trips.find(t => t.id === tripId);
      
      if (!trip || !trip.shapeId) {
        logger.debug('No shape_id found for trip', { tripId });
        return null;
      }

      // Get shape points for this trip
      const shapePoints = await enhancedTranzyApi.getShapes(agencyId, trip.shapeId);
      
      if (!shapePoints || shapePoints.length === 0) {
        logger.warn('No shape points found for shape', { shapeId: trip.shapeId });
        return null;
      }

      // Sort shape points by sequence to ensure correct order
      const sortedShapePoints = shapePoints.sort((a, b) => a.sequence - b.sequence);

      // Find closest shape point to user location
      let userShapeIndex = -1;
      let minUserDistance = Infinity;
      
      for (let i = 0; i < sortedShapePoints.length; i++) {
        const shapePoint = sortedShapePoints[i];
        const distance = this.calculateDistance(userLocation, {
          latitude: shapePoint.latitude,
          longitude: shapePoint.longitude
        });
        
        if (distance < minUserDistance) {
          minUserDistance = distance;
          userShapeIndex = i;
        }
      }

      // Find closest shape point to bus location
      let busShapeIndex = -1;
      let minBusDistance = Infinity;
      
      for (let i = 0; i < sortedShapePoints.length; i++) {
        const shapePoint = sortedShapePoints[i];
        const distance = this.calculateDistance(busLocation, {
          latitude: shapePoint.latitude,
          longitude: shapePoint.longitude
        });
        
        if (distance < minBusDistance) {
          minBusDistance = distance;
          busShapeIndex = i;
        }
      }

      if (userShapeIndex === -1 || busShapeIndex === -1) {
        logger.warn('Could not find closest shape points', { 
          userShapeIndex, 
          busShapeIndex, 
          tripId 
        });
        return null;
      }

      // Calculate progressive distance along shape between user and bus
      let totalDistance = 0;
      const startIndex = Math.min(userShapeIndex, busShapeIndex);
      const endIndex = Math.max(userShapeIndex, busShapeIndex);

      for (let i = startIndex; i < endIndex; i++) {
        const currentPoint = sortedShapePoints[i];
        const nextPoint = sortedShapePoints[i + 1];
        
        if (currentPoint && nextPoint) {
          const segmentDistance = this.calculateDistance(
            { latitude: currentPoint.latitude, longitude: currentPoint.longitude },
            { latitude: nextPoint.latitude, longitude: nextPoint.longitude }
          );
          totalDistance += segmentDistance;
        }
      }

      logger.debug('Calculated distance along route', {
        tripId,
        shapeId: trip.shapeId,
        userShapeIndex,
        busShapeIndex,
        totalDistance: Math.round(totalDistance),
        shapePointsCount: sortedShapePoints.length
      });

      return totalDistance;

    } catch (error) {
      logger.error('Failed to calculate distance along route', { 
        tripId, 
        agencyId, 
        error: error instanceof Error ? error.message : error 
      });
      return null;
    }
  }

  /**
   * Find the current/next station in the route path based on bus position and direction
   */
  private findCurrentStation(
    vehiclePosition: { latitude: number; longitude: number },
    speed: number | undefined,
    stopTimes: any[],
    stations: any[]
  ): { id: string; name: string; distance: number; isAtStation: boolean } | null {
    if (!stopTimes || stopTimes.length === 0 || !stations || stations.length === 0) return null;

    // Create a map for quick station lookup
    const stationsMap = new Map(stations.map(station => [station.id, station]));
    
    // Sort stop times by sequence to ensure correct order
    const sortedStopTimes = stopTimes.sort((a, b) => a.sequence - b.sequence);
    
    // Find distances to all route stops
    const stopDistances = sortedStopTimes.map(stopTime => {
      const station = stationsMap.get(stopTime.stopId);
      if (!station?.coordinates) return null;
      
      const distance = this.calculateDistance(vehiclePosition, station.coordinates);
      return {
        stopId: stopTime.stopId,
        name: station.name,
        sequence: stopTime.sequence,
        distance: Math.round(distance),
        coordinates: station.coordinates
      };
    }).filter(Boolean);

    if (stopDistances.length === 0) return null;

    // Find the closest stop
    const closestStop = stopDistances.reduce((closest, current) => 
      current!.distance < closest!.distance ? current : closest
    );

    if (!closestStop) return null;

    // Check if bus is "at" the station (< 100m and speed = 0)
    const isAtStation = closestStop.distance < 100 && (speed === undefined || speed === 0);

    // Always return the closest stop - this is the most accurate representation
    // of where the bus actually is, not where we think it should be going
    return {
      id: closestStop.stopId,
      name: closestStop.name,
      distance: closestStop.distance,
      isAtStation
    };
  }

  /**
   * Build stop sequence for a trip with current station highlighted
   */
  private buildStopSequence(
    tripId: string,
    stopTimes: any[],
    stations: any[],
    vehiclePosition: { latitude: number; longitude: number },
    currentStation: { id: string; name: string; distance: number; isAtStation: boolean } | null,
    userLocation?: { latitude: number; longitude: number } | null,
    speed?: number
  ): BusStopInfo[] {
    if (!stopTimes || stopTimes.length === 0) return [];

    // Create a map for quick station lookup
    const stationsMap = new Map(stations.map(station => [station.id, station]));

    // Build stop sequence
    const stopSequence: BusStopInfo[] = stopTimes.map(stopTime => {
      const station = stationsMap.get(stopTime.stopId);
      const isCurrent = currentStation?.id === stopTime.stopId;
      
      // Calculate distance to user location if available
      let distanceToUser: number | undefined;
      if (userLocation && station?.coordinates && station.coordinates.latitude !== 0 && station.coordinates.longitude !== 0) {
        distanceToUser = this.calculateDistance(userLocation, station.coordinates);
      }

      // Calculate distance from bus to this station
      let distanceFromBus: number | undefined;
      if (station?.coordinates && station.coordinates.latitude !== 0 && station.coordinates.longitude !== 0) {
        distanceFromBus = this.calculateDistance(vehiclePosition, station.coordinates);
      }

      return {
        id: stopTime.stopId,
        name: station?.name || `Stop ${stopTime.stopId}`,
        sequence: stopTime.sequence,
        coordinates: station?.coordinates || { latitude: 0, longitude: 0 },
        arrivalTime: stopTime.arrivalTime,
        departureTime: stopTime.departureTime,
        isCurrent,
        isClosestToUser: false,
        distanceToUser,
        distanceFromBus
      };
    });

    // Sort by sequence (should already be sorted, but ensure it)
    stopSequence.sort((a, b) => a.sequence - b.sequence);

    // Find the closest stop to user location
    if (userLocation) {
      let closestToUser: BusStopInfo | null = null;
      let minUserDistance = Infinity;

      for (const stop of stopSequence) {
        if (stop.distanceToUser !== undefined && stop.distanceToUser < minUserDistance) {
          minUserDistance = stop.distanceToUser;
          closestToUser = stop;
        }
      }

      // Mark the closest stop to user
      if (closestToUser) {
        closestToUser.isClosestToUser = true;
      }
    }

    logger.debug('Built stop sequence', {
      tripId,
      stopCount: stopSequence.length,
      currentStation: currentStation?.name,
      currentStationDistance: currentStation?.distance,
      isAtStation: currentStation?.isAtStation
    });

    return stopSequence;
  }

  async getFavoriteBusInfo(
    favoriteRoutes: Array<{id: string, routeName: string, routeDesc?: string}>,
    cityName: string,
    userLocation?: { latitude: number; longitude: number } | null
  ): Promise<FavoriteBusResult> {
    try {
      logger.info('Getting live vehicles for favorite routes', {
        favoriteRoutes,
        cityName
      });
      
      // Debug: Log the actual favorite routes structure
      logger.debug('Favorite routes received', { favoriteRoutes, count: favoriteRoutes.length });
      
      if (favoriteRoutes.length === 0) {
        logger.warn('No favorite routes provided - this will show no vehicles');
        return {
          favoriteBuses: [],
          lastUpdate: new Date()
        };
      }
      
      favoriteRoutes.forEach((route, index) => {
        logger.debug(`Route ${index}`, {
          id: route.id,
          shortName: route.routeName,
          idType: typeof route.id,
          parsedId: parseInt(route.id),
          isValidNumber: !isNaN(parseInt(route.id))
        });
      });
      
      const favoriteBuses: FavoriteBusInfo[] = [];
      
      if (favoriteRoutes.length === 0) {
        logger.warn('No favorite routes provided', { cityName });
        return {
          favoriteBuses: [],
          lastUpdate: new Date()
        };
      }

      // Get agency ID for the city
      const agencyId = await agencyService.getAgencyIdForCity(cityName);
      logger.info('🔍 DEBUGGING: Agency lookup', { cityName, agencyId });
      if (!agencyId) {
        logger.warn('❌ No agency found for city', { cityName });
        return {
          favoriteBuses: [],
          lastUpdate: new Date()
        };
      }

      // Handle Tranzy API vehicle lookup: vehicles use internal route IDs in their route_id field
      // We need to map from user's route short names to internal route IDs for vehicle lookup
      const routeMappings = new Map<string, any>();
      const correctedFavoriteRoutes: Array<{id: string, routeName: string, routeDesc?: string}> = [];
      
      for (const favoriteRoute of favoriteRoutes) {
        const mapping = await routeMappingService.getRouteMappingFromName(favoriteRoute.routeName, cityName);
        if (mapping) {
          // CORRECT: Vehicles API uses internal route_id field (e.g., "40")
          // User sees route short name (e.g., "42"), but we need internal ID for vehicle lookup
          const correctedRoute = {
            id: mapping.routeId, // Use internal route ID for vehicle lookup (e.g., "40")
            routeName: mapping.routeName, // Use route name for display (e.g., "42")
            routeDesc: mapping.routeDesc // Use mapping's route description for display
          };
          correctedFavoriteRoutes.push(correctedRoute);
          routeMappings.set(mapping.routeId, mapping); // Key by internal route ID for consistency
          
          logger.info('🗺️ DEBUGGING: Route mapping found', {
            userRouteName: favoriteRoute.routeName,
            configRouteId: favoriteRoute.id,
            apiInternalRouteId: mapping.routeId,
            vehicleLookupId: mapping.routeId,
            explanation: "Vehicles API uses internal route_id field, not route_name"
          });
        } else {
          logger.warn('❌ DEBUGGING: No route mapping found for favorite route', { 
            routeName: favoriteRoute.routeName, 
            configId: favoriteRoute.id 
          });
          // Keep original if no mapping found
          correctedFavoriteRoutes.push(favoriteRoute);
        }
      }
      
      logger.info('🔄 DEBUGGING: Route correction summary', {
        original: favoriteRoutes,
        corrected: correctedFavoriteRoutes,
        mappingCount: routeMappings.size,
        explanation: "Using internal route_id for vehicle lookup (vehicles API uses numeric route IDs)"
      });

      // Get stations for finding nearest stations to vehicles
      let stations: any[] = [];
      try {
        logger.debug('Fetching stations for nearest station lookup');
        stations = await enhancedTranzyApi.getStops(agencyId);
        logger.debug('Retrieved stations', { stationCount: stations.length });
        logger.info('Retrieved stations for nearest station lookup', { stationCount: stations.length });
      } catch (error) {
        logger.warn('Failed to get stations', { error });
        logger.error('Failed to get stations for nearest station lookup', { agencyId, error });
        // Continue without station data - will show coordinates instead
      }

      // Get trips data for destination information
      let tripsMap = new Map<string, any>();
      try {
        logger.debug('Fetching trips for destination lookup');
        const trips = await enhancedTranzyApi.getTrips(agencyId);
        trips.forEach(trip => {
          tripsMap.set(trip.id, trip);
        });
        logger.debug('Retrieved trips', { tripCount: trips.length });
        logger.info('Retrieved trips for destination lookup', { tripCount: trips.length });
      } catch (error) {
        logger.warn('Failed to get trips', { error });
        logger.error('Failed to get trips for destination lookup', { agencyId, error });
        // Continue without trip data - will show direction numbers instead
      }

      // Get stop times for building stop sequences
      let stopTimesMap = new Map<string, any[]>();
      try {
        logger.debug('Fetching stop times for stop sequences');
        const stopTimes = await enhancedTranzyApi.getStopTimes(agencyId);
        // Group stop times by trip_id
        stopTimes.forEach(stopTime => {
          if (!stopTimesMap.has(stopTime.tripId)) {
            stopTimesMap.set(stopTime.tripId, []);
          }
          stopTimesMap.get(stopTime.tripId)!.push(stopTime);
        });
        // Sort each trip's stop times by sequence
        stopTimesMap.forEach(tripStopTimes => {
          tripStopTimes.sort((a, b) => a.sequence - b.sequence);
        });
        logger.debug('Retrieved stop times', { tripCount: stopTimesMap.size });
        logger.info('Retrieved stop times for stop sequences', { tripCount: stopTimesMap.size });
      } catch (error) {
        logger.warn('Failed to get stop times', { error });
        logger.error('Failed to get stop times for stop sequences', { agencyId, error });
        // Continue without stop times - will not show stop sequences
      }

      // Get vehicles using the caching service
      const favoriteRouteIds = correctedFavoriteRoutes.map(route => route.id);
      let vehiclesByRoute: Map<string, any[]>;
      
      try {
        vehiclesByRoute = await liveVehicleService.getVehiclesForRoutes(agencyId, favoriteRouteIds);
        
        const cacheStats = liveVehicleService.getCacheStats();
        logger.debug('Vehicle cache stats', cacheStats);
        
        logger.info('🚌 DEBUGGING: Vehicle cache lookup results', {
          requestedRoutes: favoriteRouteIds,
          routesWithVehicles: Array.from(vehiclesByRoute.keys()),
          vehicleBreakdown: Array.from(vehiclesByRoute.entries()).map(([routeId, vehicles]) => ({
            routeId,
            vehicleCount: vehicles.length,
            sampleVehicle: vehicles[0] ? {
              id: vehicles[0].id,
              tripId: vehicles[0].tripId,
              routeId: vehicles[0].routeId,
              hasPosition: !!vehicles[0].position
            } : null
          }))
        });
        
      } catch (error) {
        logger.error('Failed to get cached vehicles', { error });
        logger.error('Failed to get cached vehicles', { agencyId, favoriteRouteIds, error });
        return {
          favoriteBuses: [],
          lastUpdate: new Date()
        };
      }

      // Process favorite routes using cached vehicles
      for (const favoriteRoute of correctedFavoriteRoutes) {
        const routeShortName = favoriteRoute.routeName; // Keep for logging and identification
        const routeId = favoriteRoute.id;
        
        try {
          logger.debug('Processing cached vehicles for route', { routeShortName, routeId });
          
          // Get vehicles for this route from cache
          const routeVehicles = vehiclesByRoute.get(routeId) || [];
          
          logger.debug('Cache lookup for route', { 
            routeShortName, 
            routeId, 
            cachedVehicleCount: routeVehicles.length
          });
          
          if (routeVehicles.length === 0) {
            logger.info('No cached vehicles for route', { routeShortName, routeId });
            continue;
          }

          // Get route mapping for display info
          const routeMapping = routeMappings.get(routeId);
          
          // Convert each cached vehicle to FavoriteBusInfo
          for (const vehicle of routeVehicles) {
            logger.debug('Processing vehicle', { 
              vehicleId: vehicle.id,
              hasPosition: !!vehicle.position,
              latitude: vehicle.position?.latitude,
              longitude: vehicle.position?.longitude,
              speed: vehicle.speed
            });

            // Get destination from trip data
            const tripData = tripsMap.get(vehicle.tripId);
            const destination = tripData?.headsign || routeMapping?.routeDesc || undefined;
            const direction = tripData?.direction || undefined;

            // Get stop sequence for this trip
            const tripStopTimes = stopTimesMap.get(vehicle.tripId) || [];
            
            // Find current/next station in route path
            const currentStation = this.findCurrentStation(
              { latitude: vehicle.position.latitude, longitude: vehicle.position.longitude },
              vehicle.speed,
              tripStopTimes,
              stations
            );
            
            if (currentStation) {
              logger.debug('Found current station for vehicle', {
                vehicleId: vehicle.id,
                stationName: currentStation.name,
                distance: currentStation.distance,
                isAtStation: currentStation.isAtStation,
                speed: vehicle.speed
              });
            }

            const stopSequence = this.buildStopSequence(
              vehicle.tripId,
              tripStopTimes,
              stations,
              { latitude: vehicle.position.latitude, longitude: vehicle.position.longitude },
              currentStation,
              userLocation,
              vehicle.speed
            );

            // Calculate distance from user along route shape if user location is available
            let distanceFromUser: number | undefined;
            if (userLocation) {
              const routeDistance = await this.calculateDistanceAlongRoute(
                userLocation,
                { latitude: vehicle.position.latitude, longitude: vehicle.position.longitude },
                vehicle.tripId,
                agencyId
              );
              distanceFromUser = routeDistance || undefined;
            }

            // Use the actual timestamp from the vehicle data, fallback to current time if not available
            const vehicleTimestamp = vehicle.timestamp instanceof Date 
              ? vehicle.timestamp 
              : (vehicle.timestamp ? new Date(vehicle.timestamp) : new Date());

            const favoriteBus: FavoriteBusInfo = {
              routeName: routeShortName, // route_short_name (e.g., "100", "101")
              routeDesc: favoriteRoute.routeDesc || routeMapping?.routeDesc, // route_long_name (e.g., "Piața Unirii - Mănăștur")
              routeType: routeMapping?.routeType || 'bus',
              vehicleId: vehicle.id,
              tripId: vehicle.tripId, // Valid tripId guaranteed by filtering
              label: vehicle.label, // Vehicle label from API
              destination,
              latitude: vehicle.position.latitude,
              longitude: vehicle.position.longitude,
              speed: vehicle.speed,
              bearing: vehicle.position.bearing,
              lastUpdate: vehicleTimestamp,
              currentStation,
              stopSequence,
              direction,
              distanceFromUser
            };
            
            logger.debug('Created favorite bus info', {
              vehicleId: favoriteBus.vehicleId,
              latitude: favoriteBus.latitude,
              longitude: favoriteBus.longitude
            });
            
            // Debug vehicle data
            logger.debug('Processing vehicle data', {
              id: vehicle.id,
              tripId: vehicle.tripId,
              direction: vehicle.tripId?.split('_')[1] || 'unknown',
              position: vehicle.position,
              timestamp: vehicle.timestamp,
              parsedTimestamp: vehicleTimestamp,
              finalCoords: { lat: favoriteBus.latitude, lng: favoriteBus.longitude }
            });
            
            favoriteBuses.push(favoriteBus);
          }
          
          logger.debug('Processed cached vehicles for route', { 
            routeShortName, 
            routeId, 
            vehicleCount: routeVehicles.length 
          });
          
        } catch (error) {
          logger.error(`Failed to get live vehicles for route ${routeShortName} (ID: ${routeId})`, { 
            routeShortName,
            routeId, 
            error: error instanceof Error ? error.message : error 
          });
        }
      }
      
      logger.info('Retrieved live vehicles for favorite routes', {
        totalVehicles: favoriteBuses.length,
        routeCount: favoriteRoutes.length
      });
      
      // Filter out buses with updates older than 11 minutes
      const now = new Date();
      const filteredBuses = favoriteBuses.filter(bus => {
        const timeSinceUpdate = (now.getTime() - bus.lastUpdate.getTime()) / 1000 / 60; // Convert to minutes
        return timeSinceUpdate <= 11;
      });
      
      // Sort buses by arrival time (shortest to longest) for arriving buses
      const sortedBuses = filteredBuses.sort((a, b) => {
        // Helper function to calculate arrival time based on stop sequence
        const getArrivalTimeMinutes = (bus: FavoriteBusInfo): number => {
          if (!bus.stopSequence || bus.stopSequence.length === 0) {
            return Infinity; // Put buses without route info at the end
          }
          
          const userStop = bus.stopSequence.find(stop => stop.isClosestToUser);
          const currentStop = bus.stopSequence.find(stop => stop.isCurrent);
          
          if (!userStop || !currentStop) {
            return Infinity; // Put buses without location info at the end
          }
          
          const userStopIndex = bus.stopSequence.findIndex(stop => stop.isClosestToUser);
          const currentStopIndex = bus.stopSequence.findIndex(stop => stop.isCurrent);
          
          if (currentStopIndex > userStopIndex) {
            return Infinity; // Bus has passed user's stop - put at end
          } else if (currentStopIndex === userStopIndex) {
            return 0; // Bus is at user's stop - highest priority
          } else {
            // Bus is approaching - estimate time based on stops remaining
            const stopsRemaining = userStopIndex - currentStopIndex;
            return stopsRemaining * 1; // Rough estimate: 1 minute per stop
          }
        };
        
        const aTime = getArrivalTimeMinutes(a);
        const bTime = getArrivalTimeMinutes(b);
        
        return aTime - bTime;
      });
      
      logger.info('Filtered and sorted buses', {
        originalCount: favoriteBuses.length,
        filteredCount: filteredBuses.length,
        finalCount: sortedBuses.length
      });
      
      return {
        favoriteBuses: sortedBuses,
        lastUpdate: new Date()
      };

    } catch (error) {
      logger.error('Failed to get favorite bus info', error);
      throw error;
    }
  }


}

export const favoriteBusService = new FavoriteBusService();