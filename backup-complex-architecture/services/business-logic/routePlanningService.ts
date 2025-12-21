import type { Coordinates, Station, CoreVehicle } from '../../types';
import type { VehicleDisplayData } from '../../types/presentationLayer';
import { enhancedTranzyApi } from '../api/tranzyApiService';
import { agencyService } from '../api/agencyService';
import { logger } from '../../utils/shared/logger';

export interface RouteConnection {
  firstVehicle: CoreVehicle;
  connectionStation: Station;
  secondVehicle: CoreVehicle;
  transferTime: number; // minutes
  totalTravelTime: number; // minutes
  arrivalTime: Date;
}

export interface DirectRoute {
  vehicle: CoreVehicle;
  arrivalTime: Date;
}

export interface RouteOption {
  type: 'direct' | 'connection';
  route: DirectRoute | RouteConnection;
  totalTime: number;
  walkingDistance?: number; // meters
}

export interface RoutePlanResult {
  currentLocation: Coordinates;
  destination: 'work' | 'home';
  directRoutes: DirectRoute[];
  connectionRoutes: RouteConnection[];
  recommendedOptions: RouteOption[];
}

class RoutePlanningService {
  private calculateDistance(from: Coordinates, to: Coordinates): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (from.latitude * Math.PI) / 180;
    const φ2 = (to.latitude * Math.PI) / 180;
    const Δφ = ((to.latitude - from.latitude) * Math.PI) / 180;
    const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private determineDestination(
    currentLocation: Coordinates,
    homeLocation: Coordinates,
    workLocation: Coordinates
  ): 'work' | 'home' {
    const distanceToHome = this.calculateDistance(currentLocation, homeLocation);
    
    // If under 2km from home, assume going to work
    if (distanceToHome < 2000) {
      return 'work';
    }
    
    // Otherwise, assume going home
    return 'home';
  }

  private async getNearbyStations(
    location: Coordinates,
    cityName: string,
    maxDistance: number = 1000
  ): Promise<Station[]> {
    try {
      const agencyId = await agencyService.getAgencyIdForCity(cityName);
      if (!agencyId) {
        logger.warn('No agency found for city', { city: cityName });
        return [];
      }
      
      logger.debug('Getting nearby stations', { agencyId, city: cityName, location, maxDistance });
      const allStations = await enhancedTranzyApi.getStops(agencyId, false);
      
      // Filter by distance
      const nearbyStations = allStations
        .map(station => ({
          ...station,
          distance: this.calculateDistance(location, station.coordinates)
        }))
        .filter(station => station.distance <= maxDistance)
        .sort((a, b) => a.distance - b.distance)
        .map(({ distance, ...station }) => station);
      
      logger.debug('Found nearby stations', { count: nearbyStations.length, agencyId, city: cityName });
      return nearbyStations;
    } catch (error) {
      logger.error('Failed to get nearby stations', { city: cityName, agencyId: await agencyService.getAgencyIdForCity(cityName), error });
      return [];
    }
  }

  private async getBusesAtStations(stations: Station[], cityName: string): Promise<any[]> {
    const allVehicles: any[] = [];
    
    // Get agency ID once for all stations
    const agencyId = await agencyService.getAgencyIdForCity(cityName);
    if (!agencyId) {
      logger.warn('No agency found for city', { city: cityName });
      return [];
    }
    
    logger.debug('Getting buses at stations', { agencyId, city: cityName, stationCount: stations.length });
    
    try {
      // Get all required data
      const [vehicles, trips, routes] = await Promise.all([
        enhancedTranzyApi.getVehicles(agencyId), // getVehicles uses cache by default
        enhancedTranzyApi.getTrips(agencyId, undefined, false),
        enhancedTranzyApi.getRoutes(agencyId, false)
      ]);
      
      logger.debug('Retrieved GTFS data', { 
        vehicles: vehicles.length, 
        trips: trips.length, 
        routes: routes.length,
        agencyId 
      });
      
      // Create lookup maps
      const tripsMap = new Map(trips.map(trip => [trip.id, trip]));
      const routesMap = new Map(routes.map(route => [route.id, route]));
      
      for (const station of stations) {
        // Get stop times for this station to see which trips pass through
        const stopTimes = await enhancedTranzyApi.getStopTimes(agencyId, parseInt(station.id), undefined, false);
        
        // Group stop times by route for better organization
        const stopTimesByRoute = new Map<string, any[]>();
        for (const stopTime of stopTimes) {
          const trip = tripsMap.get(stopTime.tripId);
          if (trip) {
            if (!stopTimesByRoute.has(trip.routeId)) {
              stopTimesByRoute.set(trip.routeId, []);
            }
            stopTimesByRoute.get(trip.routeId)!.push({ stopTime, trip });
          }
        }
        
        // For each route passing through this station
        for (const [routeId, routeStopTimes] of stopTimesByRoute) {
          const route = routesMap.get(routeId);
          if (!route) continue;
          
          // Find live vehicles for this route
          const routeVehicles = vehicles.filter(v => v.routeId?.toString() === routeId);
          
          // Process each trip for this route
          for (const { stopTime, trip } of routeStopTimes) {
            // Check if there's a live vehicle for this specific trip
            let coreVehicle = routeVehicles.find(v => v.tripId === trip.id);
            
            // If no specific trip match, use any vehicle on this route near this station
            if (!coreVehicle && routeVehicles.length > 0) {
              coreVehicle = routeVehicles.find(v => {
                const distance = this.calculateDistance(v.position, station.coordinates);
                return distance <= 1000; // Within 1km
              });
            }
            
            // Calculate estimated arrival time
            const now = new Date();
            let estimatedArrival: Date;
            
            if (coreVehicle) {
              // Use core vehicle position to estimate arrival
              const distance = this.calculateDistance(coreVehicle.position, station.coordinates);
              const estimatedMinutes = Math.max(1, distance / 500); // Rough estimate: 500m per minute
              estimatedArrival = new Date(now.getTime() + estimatedMinutes * 60000);
            } else {
              // Use schedule data
              estimatedArrival = this.parseTimeToDate(stopTime.arrivalTime);
              // If scheduled time is in the past, add a day
              if (estimatedArrival < now) {
                estimatedArrival.setDate(estimatedArrival.getDate() + 1);
              }
            }
            
            const minutesAway = Math.max(0, Math.round((estimatedArrival.getTime() - now.getTime()) / 60000));
            
            // Only include vehicles arriving within the next 60 minutes
            if (minutesAway <= 60) {
              allVehicles.push({
                id: coreVehicle?.id || `schedule-${trip.id}-${station.id}`,
                route: route.routeName || route.id,
                routeId: route.id,
                destination: trip.headsign || route.routeDesc || 'Unknown',
                direction: this.determineDirectionFromTrip(trip, station),

                scheduledArrival: this.parseTimeToDate(stopTime.arrivalTime),
                liveArrival: coreVehicle ? estimatedArrival : undefined,
                estimatedArrival,
                minutesAway,
                isLive: !!coreVehicle,
                isScheduled: true,
                confidence: coreVehicle ? 'high' : 'medium',
                station: {
                  id: station.id,
                  name: station.name,
                  coordinates: station.coordinates,
                  isFavorite: station.isFavorite,
                },
                vehicle: coreVehicle,
                schedule: {
                  stopId: station.id,
                  routeId: route.id,
                  tripId: trip.id,
                  direction: trip.direction,
                  headsign: trip.headsign,
                  scheduledTimes: [{
                    arrival: this.parseTimeToDate(stopTime.arrivalTime),
                    departure: this.parseTimeToDate(stopTime.departureTime),
                  }],
                }
              });
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to get buses for stations', { 
        city: cityName, 
        agencyId, 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
    
    // Sort by arrival time and remove duplicates
    const sortedVehicles = allVehicles
      .sort((a, b) => a.minutesAway - b.minutesAway)
      .slice(0, 20); // Limit to 20 vehicles
    
    logger.debug('Found vehicles at stations', { count: sortedVehicles.length, agencyId, city: cityName });
    return sortedVehicles;
  }

  private convertVehicleToCoreVehicle(vehicle: any, station: Station): CoreVehicle {
    return {
      id: vehicle.id || 'unknown',
      routeId: vehicle.route_id?.toString() || 'unknown',
      tripId: vehicle.trip_id,
      label: vehicle.label || vehicle.id || 'Unknown',
      position: {
        latitude: vehicle.latitude || station.coordinates.latitude,
        longitude: vehicle.longitude || station.coordinates.longitude
      },
      timestamp: new Date(vehicle.timestamp || Date.now()),
      speed: vehicle.speed,
      bearing: vehicle.bearing,
      isWheelchairAccessible: vehicle.wheelchair_accessible === 'WHEELCHAIR_ACCESSIBLE',
      isBikeAccessible: vehicle.bike_accessible === 'BIKE_ACCESSIBLE'
    };
  }

  private determineRouteDirection(
    vehicle: any,
    targetLocation: Coordinates
  ): boolean {
    // This is a simplified version - in reality, you'd need route shape data
    // For now, we'll use a heuristic based on destination name
    const destination = vehicle.destination.toLowerCase();
    
    // Common patterns for work destinations
    const workKeywords = ['centru', 'center', 'piata', 'unirii', 'office', 'business'];
    const homeKeywords = ['cartier', 'residential', 'suburb', 'manastur', 'gheorgheni'];
    
    if (workKeywords.some(keyword => destination.includes(keyword))) {
      return true; // Going towards work-like areas
    }
    
    if (homeKeywords.some(keyword => destination.includes(keyword))) {
      return false; // Going towards residential areas
    }
    
    // Default: assume it's going in the right direction
    return true;
  }

  private determineDirectionFromTrip(trip: any, station: Station): 'work' | 'home' | 'unknown' {
    // Use trip headsign to determine direction
    const headsign = trip.headsign?.toLowerCase() || '';
    
    // Common patterns for work destinations in Cluj
    const workKeywords = ['centru', 'center', 'piata', 'unirii', 'gara', 'universitate'];
    const homeKeywords = ['disp', 'dispensar', 'cartier', 'manastur', 'gheorgheni', 'zorilor'];
    
    if (workKeywords.some(keyword => headsign.includes(keyword))) {
      return 'work';
    }
    
    if (homeKeywords.some(keyword => headsign.includes(keyword))) {
      return 'home';
    }
    
    return 'unknown';
  }

  private parseTimeToDate(timeStr: string): Date {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, seconds || 0, 0);
    
    // Handle times after midnight (e.g., 25:30:00)
    if (hours >= 24) {
      date.setDate(date.getDate() + 1);
      date.setHours(hours - 24, minutes, seconds || 0, 0);
    }
    
    return date;
  }

  private findDirectRoutes(
    vehicles: any[],
    destination: 'work' | 'home',
    targetLocation: Coordinates
  ): DirectRoute[] {
    return vehicles
      .filter(vehicle => {
        // Filter vehicles going in the right direction
        return this.determineRouteDirection(vehicle, targetLocation);
      })
      .slice(0, 3) // Take first 3 vehicles
      .map(vehicle => ({
        vehicle,
        arrivalTime: new Date(vehicle.estimatedArrival.getTime() + 30 * 60000) // Assume 30min travel time
      }));
  }

  private async findConnectionRoutes(
    originVehicles: any[],
    targetLocation: Coordinates,
    destination: 'work' | 'home',
    cityName: string
  ): Promise<RouteConnection[]> {
    const connections: RouteConnection[] = [];
    
    // Get stations near target location
    const targetStations = await this.getNearbyStations(targetLocation, cityName, 1000);
    
    for (const firstBus of originVehicles.slice(0, 3)) {
      // Simulate finding connection stations (in reality, you'd use route data)
      const connectionStations = targetStations.slice(0, 2); // Take first 2 stations
      
      for (const connectionStation of connectionStations) {
        // Get buses at connection station
        const connectionBuses = await this.getBusesAtStations([connectionStation], cityName);
        
        for (const secondBus of connectionBuses.slice(0, 2)) {
          // Check if timing works (1-5 minute gap)
          const firstArrival = new Date(firstBus.estimatedArrival.getTime() + 15 * 60000); // 15min to connection
          const secondDeparture = secondBus.estimatedArrival;
          const transferTime = (secondDeparture.getTime() - firstArrival.getTime()) / 60000;
          
          if (transferTime >= 1 && transferTime <= 5) {
            connections.push({
              firstVehicle: firstBus,
              connectionStation,
              secondVehicle: secondBus,
              transferTime,
              totalTravelTime: 45, // Assume 45min total
              arrivalTime: new Date(secondDeparture.getTime() + 30 * 60000)
            });
          }
        }
      }
    }
    
    return connections.slice(0, 3); // Return top 3 connections
  }

  async planRoute(
    currentLocation: Coordinates,
    homeLocation: Coordinates,
    workLocation: Coordinates,
    cityName: string
  ): Promise<RoutePlanResult> {
    try {
      // Determine destination based on current location
      const destination = this.determineDestination(currentLocation, homeLocation, workLocation);
      const targetLocation = destination === 'work' ? workLocation : homeLocation;
      
      logger.info('Planning route', { 
        destination, 
        currentLocation, 
        targetLocation,
        city: cityName
      });
      
      // Get nearby stations (within 1km)
      const nearbyStations = await this.getNearbyStations(currentLocation, cityName, 1000);
      
      if (nearbyStations.length === 0) {
        logger.warn('No nearby stations found');
        return {
          currentLocation,
          destination,
          directRoutes: [],
          connectionRoutes: [],
          recommendedOptions: []
        };
      }
      
      // Get buses at nearby stations
      const buses = await this.getBusesAtStations(nearbyStations, cityName);
      
      // Find direct routes
      const directRoutes = this.findDirectRoutes(buses, destination, targetLocation);
      
      // Find connection routes
      const connectionRoutes = await this.findConnectionRoutes(buses, targetLocation, destination, cityName);
      
      // Create recommended options
      const recommendedOptions: RouteOption[] = [
        ...directRoutes.map(route => ({
          type: 'direct' as const,
          route,
          totalTime: 30 // Assume 30min for direct routes
        })),
        ...connectionRoutes.map(route => ({
          type: 'connection' as const,
          route,
          totalTime: route.totalTravelTime
        }))
      ].sort((a, b) => a.totalTime - b.totalTime);
      
      return {
        currentLocation,
        destination,
        directRoutes,
        connectionRoutes,
        recommendedOptions: recommendedOptions.slice(0, 5) // Top 5 options
      };
      
    } catch (error) {
      logger.error('Route planning failed', error);
      throw error;
    }
  }
}

export const routePlanningService = new RoutePlanningService();