import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { 
  TranzyAgencyResponse,
  TranzyRouteResponse,
  TranzyTripResponse,
  TranzyStopResponse,
  TranzyStopTimeResponse,
  TranzyVehicleResponse,
  Route,
  Trip,
  StopTime,
  LiveVehicle,
  EnhancedBusInfo
} from '../types/tranzyApi';
import type { Agency, Station } from '../types';
import { dataCacheManager, CACHE_CONFIGS } from './dataCache';
import { logger } from '../utils/logger';

export class EnhancedTranzyApiService {
  private axiosInstance: AxiosInstance;
  private apiKey: string | null = null;
  private baseUrl = (typeof window !== 'undefined' && window.location.hostname === 'localhost') ? '/api/tranzy/v1' : 'https://api.tranzy.ai/v1';

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    logger.info('Enhanced Tranzy API Service initialized', { baseUrl: this.baseUrl }, 'API');
  }

  private setupInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        if (this.apiKey) {
          config.headers.Authorization = `Bearer ${this.apiKey}`;
          config.headers['X-API-Key'] = this.apiKey;
          config.headers['X-Agency-Id'] = '2'; // CTP Cluj agency ID
          logger.debug('API request with auth headers', {
            url: config.url,
            hasAuth: !!config.headers.Authorization,
            hasApiKey: !!config.headers['X-API-Key'],
            hasAgencyId: !!config.headers['X-Agency-Id'],
            keyLength: this.apiKey.length
          }, 'API');
        } else {
          logger.warn('API request without authentication', { url: config.url }, 'API');
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('API request failed', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
        }, 'API');
        return Promise.reject(error);
      }
    );
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    logger.debug('API key updated', { hasKey: !!apiKey }, 'API');
  }

  /**
   * Get agencies with caching
   */
  async getAgencies(forceRefresh = false): Promise<Agency[]> {
    const cacheKey = 'agencies:all';
    const fetcher = async () => {
      const response = await this.axiosInstance.get<TranzyAgencyResponse[]>('/opendata/agency');
      return this.transformAgencies(response.data);
    };

    const cached = forceRefresh
      ? await dataCacheManager.forceRefresh(cacheKey, fetcher, CACHE_CONFIGS.agencies)
      : await dataCacheManager.get(cacheKey, fetcher, CACHE_CONFIGS.agencies);

    return cached.data;
  }

  /**
   * Get routes for an agency with caching
   */
  async getRoutes(agencyId: number, forceRefresh = false): Promise<Route[]> {
    const cacheKey = `routes:agency:${agencyId}`;
    const fetcher = async () => {
      const response = await this.axiosInstance.get<TranzyRouteResponse[]>('/opendata/routes', {
        headers: { 'X-Agency-Id': agencyId },
      });
      return this.transformRoutes(response.data);
    };

    const cached = forceRefresh
      ? await dataCacheManager.forceRefresh(cacheKey, fetcher, CACHE_CONFIGS.routes)
      : await dataCacheManager.get(cacheKey, fetcher, CACHE_CONFIGS.routes);

    return cached.data;
  }

  /**
   * Get stops for an agency with caching
   */
  async getStops(agencyId: number, forceRefresh = false): Promise<Station[]> {
    const cacheKey = `stops:agency:${agencyId}`;
    const fetcher = async () => {
      const response = await this.axiosInstance.get<TranzyStopResponse[]>('/opendata/stops', {
        headers: { 'X-Agency-Id': agencyId },
      });
      return this.transformStops(response.data);
    };

    const cached = forceRefresh
      ? await dataCacheManager.forceRefresh(cacheKey, fetcher, CACHE_CONFIGS.stops)
      : await dataCacheManager.get(cacheKey, fetcher, CACHE_CONFIGS.stops);

    return cached.data;
  }

  /**
   * Get trips for a route with caching
   */
  async getTrips(agencyId: number, routeId?: number, forceRefresh = false): Promise<Trip[]> {
    const cacheKey = routeId 
      ? `trips:agency:${agencyId}:route:${routeId}`
      : `trips:agency:${agencyId}`;
    
    const fetcher = async () => {
      const params: any = {};
      if (routeId) params.route_id = routeId;
      
      const response = await this.axiosInstance.get<TranzyTripResponse[]>('/opendata/trips', {
        headers: { 'X-Agency-Id': agencyId },
        params,
      });
      return this.transformTrips(response.data);
    };

    const cached = forceRefresh
      ? await dataCacheManager.forceRefresh(cacheKey, fetcher, CACHE_CONFIGS.schedules)
      : await dataCacheManager.get(cacheKey, fetcher, CACHE_CONFIGS.schedules);

    return cached.data;
  }

  /**
   * Get stop times (schedule) with caching
   */
  async getStopTimes(agencyId: number, stopId?: number, tripId?: string, forceRefresh = false): Promise<StopTime[]> {
    const cacheKey = `stop_times:agency:${agencyId}${stopId ? `:stop:${stopId}` : ''}${tripId ? `:trip:${tripId}` : ''}`;
    
    const fetcher = async () => {
      const params: any = {};
      if (stopId) params.stop_id = stopId;
      if (tripId) params.trip_id = tripId;
      
      const response = await this.axiosInstance.get<TranzyStopTimeResponse[]>('/opendata/stop_times', {
        headers: { 'X-Agency-Id': agencyId },
        params,
      });
      return this.transformStopTimes(response.data);
    };

    const cached = forceRefresh
      ? await dataCacheManager.forceRefresh(cacheKey, fetcher, CACHE_CONFIGS.stopTimes)
      : await dataCacheManager.get(cacheKey, fetcher, CACHE_CONFIGS.stopTimes);

    return cached.data;
  }

  /**
   * Get shapes for route paths with caching
   */
  async getShapes(agencyId: number, shapeId?: string, forceRefresh = false): Promise<any[]> {
    const cacheKey = shapeId 
      ? `shapes:agency:${agencyId}:shape:${shapeId}`
      : `shapes:agency:${agencyId}`;
    
    const fetcher = async () => {
      const params: any = {};
      if (shapeId) params.shape_id = shapeId;
      
      const response = await this.axiosInstance.get<any[]>('/opendata/shapes', {
        headers: { 'X-Agency-Id': agencyId },
        params,
      });
      return this.transformShapes(response.data);
    };

    const cached = await dataCacheManager.get(cacheKey, fetcher, CACHE_CONFIGS.routes);
    return cached.data;
  }

  /**
   * Get live vehicles (always fresh, but cached for offline)
   */
  async getVehicles(agencyId: number, routeId?: number): Promise<LiveVehicle[]> {
    const cacheKey = routeId 
      ? `vehicles:agency:${agencyId}:route:${routeId}`
      : `vehicles:agency:${agencyId}`;
    
    const fetcher = async () => {
      const params: any = {};
      if (routeId) params.route_id = routeId;
      
      const response = await this.axiosInstance.get<TranzyVehicleResponse[]>('/opendata/vehicles', {
        headers: { 'X-Agency-Id': agencyId },
        params,
      });
      return this.transformVehicles(response.data);
    };

    // Always try to get fresh vehicle data, but use cache as fallback
    try {
      const cached = await dataCacheManager.get(cacheKey, fetcher, CACHE_CONFIGS.vehicles);
      return cached.data;
    } catch (error) {
      logger.warn('Failed to get live vehicles, trying cache', { agencyId, routeId, error }, 'API');
      throw error;
    }
  }

  /**
   * Get enhanced bus information combining schedule and live data
   */
  async getEnhancedBusInfo(
    agencyId: number,
    stopId?: number,
    routeId?: number,
    forceRefresh = false
  ): Promise<EnhancedBusInfo[]> {
    try {
      // Get all required data in parallel
      const [stops, routes, vehicles, stopTimes] = await Promise.allSettled([
        this.getStops(agencyId, forceRefresh),
        this.getRoutes(agencyId, forceRefresh),
        this.getVehicles(agencyId, routeId),
        stopId ? this.getStopTimes(agencyId, stopId, undefined, forceRefresh) : Promise.resolve([]),
      ]);

      const stopsData = stops.status === 'fulfilled' ? stops.value : [];
      const routesData = routes.status === 'fulfilled' ? routes.value : [];
      const vehiclesData = vehicles.status === 'fulfilled' ? vehicles.value : [];
      const stopTimesData = stopTimes.status === 'fulfilled' ? stopTimes.value : [];

      // Combine the data
      return this.combineScheduleAndLiveData(
        stopsData,
        routesData,
        vehiclesData,
        stopTimesData,
        stopId,
        routeId
      );
    } catch (error) {
      logger.error('Failed to get enhanced bus info', { agencyId, stopId, routeId, error }, 'API');
      throw error;
    }
  }

  /**
   * Force refresh all cached data
   */
  async forceRefreshAll(agencyId: number): Promise<void> {
    logger.info('Force refreshing all data', { agencyId }, 'API');
    
    try {
      await Promise.allSettled([
        this.getAgencies(true),
        this.getRoutes(agencyId, true),
        this.getStops(agencyId, true),
        this.getTrips(agencyId, undefined, true),
        this.getStopTimes(agencyId, undefined, undefined, true),
      ]);
      
      logger.info('Force refresh completed', { agencyId }, 'API');
    } catch (error) {
      logger.error('Force refresh failed', { agencyId, error }, 'API');
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return dataCacheManager.getStats();
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    dataCacheManager.clearAll();
    logger.info('All cache cleared', {}, 'API');
  }

  // Transformation methods
  private transformAgencies(data: TranzyAgencyResponse[]): Agency[] {
    return data.map(agency => ({
      id: agency.agency_id.toString(),
      name: agency.agency_name,
      country: 'Romania',
      timezone: agency.agency_timezone,
    }));
  }

  private transformRoutes(data: TranzyRouteResponse[]): Route[] {
    return data.map(route => ({
      id: route.route_id.toString(),
      agencyId: route.agency_id.toString(),
      shortName: route.route_short_name,
      longName: route.route_long_name,
      description: route.route_desc,
      type: this.getRouteType(route.route_type),
      color: route.route_color,
      textColor: route.route_text_color,
      url: route.route_url,
    }));
  }

  private transformStops(data: TranzyStopResponse[]): Station[] {
    return data.map(stop => ({
      id: stop.stop_id.toString(),
      name: stop.stop_name,
      coordinates: {
        latitude: stop.stop_lat,
        longitude: stop.stop_lon,
      },
      isFavorite: false,
    }));
  }

  private transformTrips(data: TranzyTripResponse[]): Trip[] {
    return data.map(trip => ({
      id: trip.trip_id,
      routeId: trip.route_id.toString(),
      serviceId: trip.service_id,
      headsign: trip.trip_headsign,
      shortName: trip.trip_short_name,
      direction: trip.direction_id === 0 ? 'inbound' : 'outbound',
      blockId: trip.block_id,
      shapeId: trip.shape_id,
      isWheelchairAccessible: trip.wheelchair_accessible === 1,
      areBikesAllowed: trip.bikes_allowed === 1,
    }));
  }

  private transformStopTimes(data: TranzyStopTimeResponse[]): StopTime[] {
    return data.map(stopTime => ({
      tripId: stopTime.trip_id,
      stopId: stopTime.stop_id.toString(),
      arrivalTime: stopTime.arrival_time,
      departureTime: stopTime.departure_time,
      sequence: stopTime.stop_sequence,
      headsign: stopTime.stop_headsign,
      isPickupAvailable: (stopTime.pickup_type || 0) === 0,
      isDropOffAvailable: (stopTime.drop_off_type || 0) === 0,
    }));
  }

  private transformVehicles(data: TranzyVehicleResponse[]): LiveVehicle[] {
    return data
      .filter(vehicle => 
        vehicle.latitude != null && 
        vehicle.longitude != null &&
        vehicle.route_id != null
      )
      .map(vehicle => ({
        id: vehicle.id,
        routeId: vehicle.route_id.toString(),
        tripId: vehicle.trip_id,
        label: vehicle.label,
        position: {
          latitude: vehicle.latitude,
          longitude: vehicle.longitude,
          bearing: vehicle.bearing,
        },
        timestamp: vehicle.timestamp ? new Date(vehicle.timestamp) : new Date(),
        speed: vehicle.speed,
        occupancy: vehicle.occupancy_status,
        isWheelchairAccessible: vehicle.wheelchair_accessible === 'WHEELCHAIR_ACCESSIBLE',
        isBikeAccessible: vehicle.bike_accessible === 'BIKE_ACCESSIBLE',
      }));
  }

  private transformShapes(data: any[]): any[] {
    return data
      .sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence)
      .map(shape => ({
        id: shape.shape_id,
        latitude: shape.shape_pt_lat,
        longitude: shape.shape_pt_lon,
        sequence: shape.shape_pt_sequence,
        distanceTraveled: shape.shape_dist_traveled,
      }));
  }

  private combineScheduleAndLiveData(
    stops: Station[],
    routes: Route[],
    vehicles: LiveVehicle[],
    stopTimes: StopTime[],
    stopId?: number,
    routeId?: number
  ): EnhancedBusInfo[] {
    const enhancedBuses: EnhancedBusInfo[] = [];
    const now = new Date();

    // Create a map for quick lookups
    const stopsMap = new Map(stops.map(stop => [stop.id, stop]));
    const routesMap = new Map(routes.map(route => [route.id, route]));

    // Process live vehicles
    for (const vehicle of vehicles) {
      if (routeId && vehicle.routeId !== routeId.toString()) continue;

      const route = routesMap.get(vehicle.routeId);
      if (!route) continue;

      // Find the closest stop for this vehicle
      const closestStop = this.findClosestStop(vehicle.position, stops);
      if (!closestStop) continue;

      // Skip if we're filtering by stop and this isn't it
      if (stopId && closestStop.id !== stopId.toString()) continue;

      // Find corresponding schedule data
      const scheduleData = stopTimes.find(st => 
        st.stopId === closestStop.id && 
        st.tripId === vehicle.tripId
      );

      // Calculate arrival estimates
      const estimatedArrival = this.calculateArrivalTime(vehicle, closestStop, scheduleData);
      const minutesAway = Math.max(0, Math.round((estimatedArrival.getTime() - now.getTime()) / 60000));

      enhancedBuses.push({
        vehicle,
        schedule: scheduleData ? {
          stopId: scheduleData.stopId,
          routeId: vehicle.routeId,
          tripId: scheduleData.tripId,
          direction: 'inbound', // This would need more logic to determine
          headsign: scheduleData.headsign || route.longName,
          scheduledTimes: [{
            arrival: this.parseTimeToDate(scheduleData.arrivalTime),
            departure: this.parseTimeToDate(scheduleData.departureTime),
          }],
        } : undefined,
        id: vehicle.id,
        route: route.shortName,
        routeId: vehicle.routeId,
        destination: route.longName,
        direction: this.determineDirection(vehicle, closestStop), // Simplified
        scheduledArrival: scheduleData ? this.parseTimeToDate(scheduleData.arrivalTime) : undefined,
        liveArrival: estimatedArrival,
        estimatedArrival,
        minutesAway,
        delay: scheduleData ? this.calculateDelay(scheduleData, estimatedArrival) : undefined,
        isLive: true,
        isScheduled: !!scheduleData,
        confidence: this.calculateConfidence(vehicle, scheduleData),
        station: {
          id: closestStop.id,
          name: closestStop.name,
          coordinates: closestStop.coordinates,
          isFavorite: closestStop.isFavorite,
        },
      });
    }

    // Add schedule-only data for stops without live vehicles
    if (stopId) {
      const relevantStopTimes = stopTimes.filter(st => st.stopId === stopId.toString());
      
      for (const stopTime of relevantStopTimes) {
        // Skip if we already have live data for this trip
        if (enhancedBuses.some(bus => bus.schedule?.tripId === stopTime.tripId)) continue;

        const route = routesMap.get(stopTime.tripId.split('_')[0]); // Simplified route extraction
        if (!route) continue;

        const stop = stopsMap.get(stopTime.stopId);
        if (!stop) continue;

        const scheduledArrival = this.parseTimeToDate(stopTime.arrivalTime);
        const minutesAway = Math.max(0, Math.round((scheduledArrival.getTime() - now.getTime()) / 60000));

        enhancedBuses.push({
          schedule: {
            stopId: stopTime.stopId,
            routeId: route.id,
            tripId: stopTime.tripId,
            direction: 'inbound',
            headsign: stopTime.headsign || route.longName,
            scheduledTimes: [{
              arrival: scheduledArrival,
              departure: this.parseTimeToDate(stopTime.departureTime),
            }],
          },
          id: `schedule-${stopTime.tripId}-${stopTime.stopId}`,
          route: route.shortName,
          routeId: route.id,
          destination: route.longName,
          direction: 'unknown',
          scheduledArrival,
          estimatedArrival: scheduledArrival,
          minutesAway,
          isLive: false,
          isScheduled: true,
          confidence: 'medium',
          station: {
            id: stop.id,
            name: stop.name,
            coordinates: stop.coordinates,
            isFavorite: stop.isFavorite,
          },
        });
      }
    }

    return enhancedBuses.sort((a, b) => a.minutesAway - b.minutesAway);
  }

  private getRouteType(type: number): Route['type'] {
    switch (type) {
      case 0: return 'tram';
      case 1: return 'metro';
      case 2: return 'rail';
      case 3: return 'bus';
      case 4: return 'ferry';
      case 11: return 'trolleybus';
      default: return 'other';
    }
  }

  private findClosestStop(position: { latitude: number; longitude: number }, stops: Station[]): Station | null {
    let closest: Station | null = null;
    let minDistance = Infinity;

    for (const stop of stops) {
      const distance = this.calculateDistance(position, stop.coordinates);
      if (distance < minDistance) {
        minDistance = distance;
        closest = stop;
      }
    }

    return minDistance < 1000 ? closest : null; // Within 1km
  }

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

  private calculateArrivalTime(
    vehicle: LiveVehicle,
    stop: Station,
    scheduleData?: StopTime
  ): Date {
    const now = new Date();
    
    if (scheduleData) {
      // Use schedule as base and adjust for current time
      const scheduledTime = this.parseTimeToDate(scheduleData.arrivalTime);
      return scheduledTime > now ? scheduledTime : new Date(now.getTime() + 5 * 60000); // 5 min default
    }

    // Estimate based on distance and speed
    const distance = this.calculateDistance(vehicle.position, stop.coordinates);
    const estimatedMinutes = vehicle.speed > 0 
      ? Math.max(1, distance / (vehicle.speed * 16.67)) // speed in m/s
      : Math.random() * 15 + 5; // 5-20 minutes random

    return new Date(now.getTime() + estimatedMinutes * 60000);
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

  private calculateDelay(scheduleData: StopTime, estimatedArrival: Date): number {
    const scheduledTime = this.parseTimeToDate(scheduleData.arrivalTime);
    return Math.round((estimatedArrival.getTime() - scheduledTime.getTime()) / 60000);
  }

  private calculateConfidence(vehicle: LiveVehicle, scheduleData?: StopTime): 'high' | 'medium' | 'low' {
    try {
      const timestamp = vehicle.timestamp instanceof Date ? vehicle.timestamp : new Date(vehicle.timestamp);
      const age = Date.now() - timestamp.getTime();
      
      if (age < 60000 && scheduleData) return 'high'; // Fresh live data + schedule
      if (age < 300000) return 'medium'; // Live data within 5 minutes
      return 'low'; // Old or no live data
    } catch (error) {
      console.warn('Invalid timestamp in vehicle data:', vehicle.timestamp);
      return 'low'; // Default to low confidence if timestamp is invalid
    }
  }

  private determineDirection(_vehicle: LiveVehicle, _stop: Station): 'work' | 'home' | 'unknown' {
    // This is a simplified implementation
    // In reality, you'd use the user's home/work locations and route analysis
    return 'unknown';
  }
}

// Singleton instance
export const enhancedTranzyApi = new EnhancedTranzyApiService();