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
  StopTime
} from '../types/tranzyApi';
import { RouteType } from '../types';
import type { Agency, Station, TranzyApiService as ITranzyApiService } from '../types';
import type { CoreVehicle } from '../types/coreVehicle';
import { unifiedCache } from '../hooks/shared/cache/instance';
import { CACHE_CONFIGS } from '../hooks/shared/cache/utils';
import { logger } from '../utils/shared/logger';
import { vehicleTransformationService } from './VehicleTransformationService';
import { createDefaultTransformationContext } from '../types/presentationLayer';
import type { TransformationContext, VehicleDisplayData } from '../types/presentationLayer';

export class TranzyApiService {
  private axiosInstance: AxiosInstance;
  private apiKey: string | null = null;
  private baseUrl = import.meta.env.DEV ? '/api/tranzy/v1' : 'https://api.tranzy.ai/v1';
  
  // Request debouncing from legacy service
  private lastRequestTimes: Map<string, number> = new Map();
  private readonly REQUEST_DEBOUNCE_MS = 500;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    logger.info('Tranzy API Service initialized', { baseUrl: this.baseUrl }, 'API');
  }

  private shouldAllowRequest(key: string): boolean {
    const now = Date.now();
    const lastRequest = this.lastRequestTimes.get(key);
    
    if (!lastRequest || now - lastRequest >= this.REQUEST_DEBOUNCE_MS) {
      this.lastRequestTimes.set(key, now);
      return true;
    }
    
    return false;
  }

  private setupInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        if (this.apiKey) {
          config.headers.Authorization = `Bearer ${this.apiKey}`;
          config.headers['X-API-Key'] = this.apiKey;
          
          // Get configured agency ID instead of hardcoded value
          const agencyId = await this.getConfiguredAgencyId();
          config.headers['X-Agency-Id'] = agencyId.toString();
          
          logger.debug('API request with auth headers', {
            url: config.url,
            hasAuth: !!config.headers.Authorization,
            hasApiKey: !!config.headers['X-API-Key'],
            agencyId: agencyId,
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
      (response) => {
        // Update API status to online on successful response
        this.updateApiStatus(true);
        return response;
      },
      (error) => {
        // Update API status to offline on error
        this.updateApiStatus(false, error);
        
        logger.error('API request failed', error, 'API');
        return Promise.reject(error);
      }
    );
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    logger.debug('API key updated', { hasKey: !!apiKey }, 'API');
  }

  private updateApiStatus(isOnline: boolean, error?: any): void {
    // Dynamically import to avoid circular dependency
    import('../stores/vehicleStore').then(({ useVehicleStore }) => {
      // Offline functionality is now integrated into vehicleStore
      // The vehicleStore handles API status through its error handling
      if (!isOnline && error) {
        // Update the store state directly since there's no setError method
        const store = useVehicleStore.getState();
        // The store will handle offline status through its refresh methods
      }
    }).catch(() => {
      // Ignore import errors in case store is not available
    });
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

    const data = forceRefresh
      ? await unifiedCache.forceRefresh(cacheKey, fetcher, CACHE_CONFIGS.agencies)
      : await unifiedCache.get(cacheKey, fetcher, CACHE_CONFIGS.agencies);

    return data;
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

    const data = forceRefresh
      ? await unifiedCache.forceRefresh(cacheKey, fetcher, CACHE_CONFIGS.routes)
      : await unifiedCache.get(cacheKey, fetcher, CACHE_CONFIGS.routes);

    return data;
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

    const data = forceRefresh
      ? await unifiedCache.forceRefresh(cacheKey, fetcher, CACHE_CONFIGS.stops)
      : await unifiedCache.get(cacheKey, fetcher, CACHE_CONFIGS.stops);

    return data;
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

    const data = forceRefresh
      ? await unifiedCache.forceRefresh(cacheKey, fetcher, CACHE_CONFIGS.schedules)
      : await unifiedCache.get(cacheKey, fetcher, CACHE_CONFIGS.schedules);

    return data;
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

    const data = forceRefresh
      ? await unifiedCache.forceRefresh(cacheKey, fetcher, CACHE_CONFIGS.stopTimes)
      : await unifiedCache.get(cacheKey, fetcher, CACHE_CONFIGS.stopTimes);

    return data;
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

    const data = await unifiedCache.get(cacheKey, fetcher, CACHE_CONFIGS.routes);
    return data;
  }

  /**
   * Get live vehicles (always fresh, but cached for offline)
   */
  async getVehicles(agencyId: number, routeId?: number): Promise<CoreVehicle[]> {
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
      
      // Create transformation context with route data for proper route name lookup
      const context = createDefaultTransformationContext(this.apiKey || '', agencyId.toString());
      
      // Try to get route data for route name lookups
      try {
        const routes = await this.getRoutes(agencyId);
        context.routeData = routes;
      } catch (error) {
        logger.warn('Failed to get route data for vehicle transformation', { agencyId, error }, 'API');
        // Continue without route data - will fall back to route IDs
      }
      
      return await vehicleTransformationService.normalizeApiData(response.data, context);
    };

    // Always try to get fresh vehicle data, but use cache as fallback
    try {
      const data = await unifiedCache.get(cacheKey, fetcher, CACHE_CONFIGS.vehicles);
      return data;
    } catch (error) {
      logger.warn('Failed to get live vehicles, trying cache', { agencyId, routeId, error }, 'API');
      throw error;
    }
  }

  // EnhancedVehicleInfo methods removed - use CoreVehicle and VehicleTransformationService directly

  /**
   * Create transformation context for the new transformation service
   */
  private createTransformationContext(
    agencyId: number,
    stops: Station[],
    targetStopId?: number
  ): TransformationContext {
    // Create base context with API configuration
    const context = createDefaultTransformationContext(
      this.apiKey || '',
      agencyId.toString()
    );

    // Add target stations if specified
    if (targetStopId) {
      const targetStop = stops.find(stop => stop.id === targetStopId.toString());
      if (targetStop) {
        context.targetStations = [{
          id: targetStop.id,
          name: targetStop.name,
          coordinates: targetStop.coordinates,
          routeIds: [], // Would be populated from route data in a full implementation
          isFavorite: targetStop.isFavorite,
          accessibility: {
            wheelchairAccessible: true, // Default values
            bikeRacks: false,
            audioAnnouncements: false
          }
        }];
      }
    } else {
      // Use all stops as potential targets
      context.targetStations = stops.slice(0, 10).map(stop => ({
        id: stop.id,
        name: stop.name,
        coordinates: stop.coordinates,
        routeIds: [],
        isFavorite: stop.isFavorite,
        accessibility: {
          wheelchairAccessible: true,
          bikeRacks: false,
          audioAnnouncements: false
        }
      }));
    }

    return context;
  }

  // Legacy EnhancedVehicleInfo conversion methods removed - use VehicleTransformationService directly

  // Legacy getEnhancedVehicleInfoLegacy method removed - use CoreVehicle and VehicleTransformationService

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
    return unifiedCache.getStats();
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    unifiedCache.clearAll();
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
      routeName: route.route_short_name,
      routeDesc: route.route_long_name,
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

  // Legacy transformVehicles method removed - use VehicleTransformationService instead

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

  // Legacy combineScheduleAndLiveData method removed - use VehicleTransformationService

  private getRouteType(type: number): RouteType {
    switch (type) {
      case 0: return RouteType.TRAM;
      case 1: return RouteType.METRO;
      case 2: return RouteType.RAIL;
      case 3: return RouteType.BUS;
      case 4: return RouteType.FERRY;
      case 11: return RouteType.TROLLEYBUS;
      default: return RouteType.OTHER;
    }
  }

  private findClosestStop(
    position: { latitude: number; longitude: number }, 
    stops: Station[], 
    vehicle?: CoreVehicle,
    stopTimes?: StopTime[]
  ): Station | null {
    // If we have trip information, use intelligent stop sequence logic
    if (vehicle?.tripId && stopTimes) {
      return this.findNextStopInSequence(position, vehicle.tripId, stops, stopTimes);
    }

    // Fallback to simple distance-based logic
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

  /**
   * Finds the next stop in the trip sequence based on vehicle position and direction of travel
   * This method implements intelligent stop detection by:
   * 1. Getting the stop sequence for the vehicle's trip_id
   * 2. Finding the two closest stops to the vehicle
   * 3. Determining which stop is next based on sequence and direction
   */
  private findNextStopInSequence(
    vehiclePosition: { latitude: number; longitude: number },
    tripId: string,
    allStops: Station[],
    stopTimes: StopTime[]
  ): Station | null {
    // Get stop times for this specific trip, sorted by sequence
    const tripStopTimes = stopTimes
      .filter(st => st.tripId === tripId)
      .sort((a, b) => a.sequence - b.sequence);

    if (tripStopTimes.length === 0) {
      logger.debugConsolidated('No stop times found for trip', { tripId });
      return null;
    }

    logger.debug('Finding next stop in sequence', { 
      tripId, 
      stopCount: tripStopTimes.length,
      vehiclePosition 
    });

    // Create a map for quick stop lookup
    const stopsMap = new Map(allStops.map(stop => [stop.id, stop]));

    // Get coordinates for stops in this trip sequence
    const tripStopsWithCoords = tripStopTimes
      .map(stopTime => {
        const stop = stopsMap.get(stopTime.stopId);
        return stop ? {
          stopTime,
          stop,
          distance: this.calculateDistance(vehiclePosition, stop.coordinates)
        } : null;
      })
      .filter(item => item !== null);

    if (tripStopsWithCoords.length === 0) {
      return null;
    }

    // Find the two closest stops
    const sortedByDistance = [...tripStopsWithCoords].sort((a, b) => a.distance - b.distance);
    
    if (sortedByDistance.length === 1) {
      return sortedByDistance[0].distance < 1000 ? sortedByDistance[0].stop : null;
    }

    const closestTwo = sortedByDistance.slice(0, 2);
    const [first, second] = closestTwo;

    // If both stops are too far, return null
    if (first.distance > 1000) {
      return null;
    }

    // Determine which stop is next in the sequence
    const firstSequence = first.stopTime.sequence;
    const secondSequence = second.stopTime.sequence;

    // If the vehicle is between two stops, choose the one with higher sequence (next stop)
    if (Math.abs(firstSequence - secondSequence) === 1) {
      // Adjacent stops - choose the one with higher sequence number (next in route)
      return firstSequence > secondSequence ? first.stop : second.stop;
    }

    // If stops are not adjacent, use additional logic
    return this.determineNextStopByDirection(vehiclePosition, closestTwo, tripStopsWithCoords);
  }

  /**
   * Determines the next stop by analyzing vehicle movement direction
   */
  private determineNextStopByDirection(
    vehiclePosition: { latitude: number; longitude: number },
    closestTwo: Array<{ stopTime: StopTime; stop: Station; distance: number }>,
    allTripStops: Array<{ stopTime: StopTime; stop: Station; distance: number }>
  ): Station {
    const [first, second] = closestTwo;

    // If one stop is significantly closer, prefer it
    if (first.distance < second.distance * 0.5) {
      return first.stop;
    }

    // Look at the sequence numbers to determine direction
    const firstSequence = first.stopTime.sequence;
    const secondSequence = second.stopTime.sequence;

    // Find the vehicle's approximate position in the sequence
    const avgSequence = (firstSequence + secondSequence) / 2;
    
    // Get stops before and after to understand the route direction
    const stopsBefore = allTripStops.filter(s => s.stopTime.sequence < avgSequence);
    const stopsAfter = allTripStops.filter(s => s.stopTime.sequence > avgSequence);

    // If we have stops in both directions, calculate which direction the vehicle is likely heading
    if (stopsBefore.length > 0 && stopsAfter.length > 0) {
      const avgDistanceBefore = stopsBefore.reduce((sum, s) => sum + s.distance, 0) / stopsBefore.length;
      const avgDistanceAfter = stopsAfter.reduce((sum, s) => sum + s.distance, 0) / stopsAfter.length;

      // If the vehicle is closer to stops ahead in sequence, it's likely moving forward
      if (avgDistanceAfter < avgDistanceBefore) {
        return firstSequence > secondSequence ? first.stop : second.stop;
      }
    }

    // Default to the stop with higher sequence (next in route)
    const nextStop = firstSequence > secondSequence ? first.stop : second.stop;
    logger.debug('Selected next stop by sequence', { 
      selectedStop: nextStop.name,
      sequence: firstSequence > secondSequence ? firstSequence : secondSequence
    });
    return nextStop;
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
    vehicle: CoreVehicle,
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
      : Math.max(2, distance / (15 * 16.67)); // Assume 15 km/h average city speed when no speed data

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

  private calculateConfidence(vehicle: CoreVehicle, scheduleData?: StopTime): 'high' | 'medium' | 'low' {
    try {
      const timestamp = vehicle.timestamp instanceof Date ? vehicle.timestamp : new Date(vehicle.timestamp);
      const age = Date.now() - timestamp.getTime();
      
      if (age < 60000 && scheduleData) return 'high'; // Fresh live data + schedule
      if (age < 300000) return 'medium'; // Live data within 5 minutes
      return 'low'; // Old or no live data
    } catch (error) {
      logger.warn('Invalid timestamp in vehicle data', { timestamp: vehicle.timestamp }, 'API');
      return 'low'; // Default to low confidence if timestamp is invalid
    }
  }

  private determineDirection(_vehicle: CoreVehicle, _stop: Station): 'work' | 'home' | 'unknown' {
    // This is a simplified implementation
    // In reality, you'd use the user's home/work locations and route analysis
    return 'unknown';
  }

  // Legacy interface compatibility methods
  
  /**
   * Get agency ID from configuration store
   * Falls back to CTP Cluj (ID: 2) if not configured
   */
  private async getConfiguredAgencyId(): Promise<number> {
    try {
      // Dynamic import to avoid circular dependencies
      const { useConfigStore } = await import('../stores/configStore');
      const config = useConfigStore.getState().config;
      
      if (config?.agencyId) {
        const agencyId = parseInt(config.agencyId);
        logger.debug('Using configured agency ID', { agencyId }, 'API');
        return agencyId;
      }
    } catch (error) {
      logger.debug('Could not get agency ID from config store', { error }, 'API');
    }
    
    // Fallback to CTP Cluj agency ID (only when no configuration is available)
    const fallbackAgencyId = 2; // CTP Cluj-Napoca
    logger.debug('Using fallback agency ID for CTP Cluj', { agencyId: fallbackAgencyId }, 'API');
    return fallbackAgencyId;
  }

  async validateApiKey(key: string): Promise<boolean> {
    const requestKey = 'validate-api-key';
    if (!this.shouldAllowRequest(requestKey)) {
      logger.debug('API key validation request debounced', { keyLength: key.length }, 'API');
      return false;
    }

    logger.info('Validating API key', { keyLength: key.length }, 'API');
    
    try {
      const agencyId = await this.getConfiguredAgencyId();
      
      const tempInstance = axios.create({
        baseURL: this.baseUrl,
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${key}`,
          'X-API-Key': key,
          'X-Agency-Id': agencyId.toString(),
          'Content-Type': 'application/json',
        },
      });

      // Use the opendata/agency endpoint to validate the key
      const response = await tempInstance.get('/opendata/agency');
      
      // Check if we got a valid response with agencies
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        logger.info('API key validation successful', { 
          agencyCount: response.data.length, 
          agencyId 
        }, 'API');
        return true;
      } else {
        logger.warn('API key validation failed - no agencies returned', { agencyId }, 'API');
        return false;
      }
    } catch (error) {
      const errorToLog = error instanceof Error ? error : new Error(String(error));
      logger.error('API key validation failed', errorToLog, 'API');
      logger.info('API validation context', { 
        status: error instanceof axios.AxiosError ? error.response?.status : 'unknown'
      }, 'API');
      
      if (error instanceof axios.AxiosError) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          logger.warn('API key is invalid or expired', { status: error.response.status }, 'API');
          return false;
        }
      }
      return false;
    }
  }

  async getBusesForCity(city: string): Promise<CoreVehicle[]> {
    const requestKey = `vehicles-${city}`;
    if (!this.shouldAllowRequest(requestKey)) {
      logger.debug('Vehicles request debounced', { city }, 'API');
      return [];
    }

    logger.info('Fetching vehicles for city', { city }, 'API');
    
    try {
      const agencyId = await this.getConfiguredAgencyId();
      const vehicles = await this.getVehicles(agencyId);
      return vehicles;
    } catch (error) {
      logger.error('Failed to fetch vehicles for city', { city, error }, 'API');
      return [];
    }
  }

  async getStationsForCity(city: string): Promise<Station[]> {
    const requestKey = `stops-${city}`;
    if (!this.shouldAllowRequest(requestKey)) {
      logger.debug('Stops request debounced', { city }, 'API');
      return [];
    }

    logger.info('Fetching stops for city', { city }, 'API');
    
    try {
      const agencyId = await this.getConfiguredAgencyId();
      const stops = await this.getStops(agencyId);
      return stops; // Already in Station format
    } catch (error) {
      logger.error('Failed to fetch stops for city', { city, error }, 'API');
      return [];
    }
  }

  async getBusesAtStation(stationId: string): Promise<CoreVehicle[]> {
    const requestKey = `station-vehicles-${stationId}`;
    if (!this.shouldAllowRequest(requestKey)) {
      logger.debug('Station vehicles request debounced', { stationId }, 'API');
      return [];
    }

    logger.info('Fetching vehicles at station', { stationId }, 'API');
    
    try {
      const agencyId = await this.getConfiguredAgencyId();
      
      // Get all vehicles and filter by proximity to station
      const vehicles = await this.getVehicles(agencyId);
      const stops = await this.getStops(agencyId);
      
      const station = stops.find(stop => stop.id === stationId);
      if (!station) {
        logger.warn('Station not found', { stationId, agencyId }, 'API');
        return [];
      }

      // Filter vehicles within reasonable distance of the station
      const nearbyVehicles = vehicles.filter(vehicle => {
        const distance = this.calculateDistance(
          { latitude: vehicle.position.latitude, longitude: vehicle.position.longitude },
          station.coordinates
        );
        return distance <= 0.5; // Within 500 meters
      });

      return nearbyVehicles;
    } catch (error) {
      logger.error('Failed to fetch vehicles at station', { stationId, error }, 'API');
      return [];
    }
  }

  // Legacy transformation methods removed - use VehicleTransformationService instead


}

// Singleton instance and factory function for compatibility
export const tranzyApiService = (): TranzyApiService => {
  if (!_instance) {
    _instance = new TranzyApiService();
  }
  return _instance;
};

export const createTranzyApiService = (): TranzyApiService => {
  return new TranzyApiService();
};

// Enhanced API singleton (for services that were using enhancedTranzyApi)
export const enhancedTranzyApi = new TranzyApiService();

// Private singleton instance
let _instance: TranzyApiService | null = null;