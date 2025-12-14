import axios, { AxiosError } from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import type { BusInfo, Station, Agency, TranzyApiService, ErrorState } from '../types';
import { useOfflineStore } from '../stores/offlineStore';
import { logger } from '../utils/logger';


// Tranzy API response interfaces based on GTFS specification
interface TranzyAgencyResponse {
  agency_id: number;
  agency_name: string;
  agency_url?: string;
  agency_timezone?: string;
  agency_lang?: string;
  agency_urls?: string[];
}

interface TranzyVehicleResponse {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  vehicle_type: number;
  bike_accessible: 'BIKE_INACCESSIBLE' | 'BIKE_ACCESSIBLE' | 'UNKNOWN';
  wheelchair_accessible: 'NO_VALUE' | 'UNKNOWN' | 'WHEELCHAIR_ACCESSIBLE' | 'WHEELCHAIR_INACCESSIBLE';
  speed: number;
  route_id: number;
  trip_id?: string;
}

interface TranzyStopResponse {
  stop_id: number;
  stop_name: string;
  stop_desc?: string;
  stop_lat: number;
  stop_lon: number;
  location_type?: number;
  stop_code?: string;
}

// Removed unused TranzyRouteResponse interface

export class TranzyApiServiceImpl implements TranzyApiService {
  private axiosInstance: AxiosInstance;
  private apiKey: string | null = null;
  private baseUrl = import.meta.env.DEV ? '/api/tranzy/v1' : 'https://api.tranzy.ai/v1';
  
  // Request tracking to prevent excessive calls
  private lastRequestTimes: Map<string, number> = new Map();
  private readonly REQUEST_DEBOUNCE_MS = 500;

  constructor(customAxiosInstance?: AxiosInstance) {
    if (customAxiosInstance) {
      this.axiosInstance = customAxiosInstance;
    } else {
      // Use proxy in development, direct API in production
      const baseURL = import.meta.env.DEV ? '/api/tranzy/v1' : 'https://api.tranzy.ai/v1';
      
      this.axiosInstance = axios.create({
        baseURL,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('🔧 API Service initialized with baseURL:', baseURL);
    }

    this.setupInterceptors();
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
    // Safety check for testing
    if (!this.axiosInstance || !this.axiosInstance.interceptors) {
      return;
    }
    
    // Request interceptor for authentication
    this.axiosInstance.interceptors.request.use(
      (config) => {
        logger.apiRequest(config.url || 'unknown', config.method?.toUpperCase() || 'GET', {
          hasApiKey: !!this.apiKey,
          timeout: config.timeout,
        });
        
        if (this.apiKey) {
          config.headers.Authorization = `Bearer ${this.apiKey}`;
          config.headers['X-API-Key'] = this.apiKey;
          config.headers['X-Agency-Id'] = '2'; // CTP Cluj agency ID
        }
        return config;
      },
      (error) => {
        logger.apiError('request-setup', error);
        return Promise.reject(this.createErrorState('network', 'Request setup failed', error));
      }
    );

    // Response interceptor for error handling and offline detection
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        logger.apiResponse(response.config.url || 'unknown', response.status, {
          fromCache: response.headers['sw-from-cache'] === 'true',
          cachedAt: response.headers['sw-cached-at'],
          dataSize: JSON.stringify(response.data).length,
        });
        
        // Check if response came from service worker cache
        const fromCache = response.headers['sw-from-cache'] === 'true';
        const cachedAt = response.headers['sw-cached-at'];
        
        if (fromCache && cachedAt) {
          logger.info('Using cached API response', { url: response.config.url, cachedAt }, 'API');
          // Update offline store to indicate we're using cached data
          const offlineStore = useOfflineStore.getState();
          offlineStore.setUsingCachedData(true, new Date(cachedAt));
        } else {
          logger.debug('Fresh API response received', { url: response.config.url }, 'API');
          // Fresh data received, clear cached data flag
          const offlineStore = useOfflineStore.getState();
          offlineStore.setUsingCachedData(false);
        }
        
        return response;
      },
      (error: AxiosError) => {
        const url = error.config?.url || 'unknown';
        const status = error.response?.status || 0;
        
        logger.apiResponse(url, status, {
          error: error.message,
          code: error.code,
          responseData: error.response?.data,
        });
        
        if (error.response?.status === 401 || error.response?.status === 403) {
          logger.warn('API authentication failed', { url, status }, 'API');
          throw this.createErrorState('authentication', 'Invalid API key or unauthorized access', error);
        }
        
        if (error.response?.status === 429) {
          logger.warn('API rate limit exceeded', { url, status }, 'API');
          throw this.createErrorState('network', 'Rate limit exceeded. Please try again later.', error);
        }
        
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          logger.warn('API request timeout', { url, timeout: error.config?.timeout }, 'API');
          throw this.createErrorState('network', 'Request timeout. Please check your connection.', error);
        }
        
        if (!error.response) {
          logger.error('Network error - no response', { url, error: error.message }, 'API');
          throw this.createErrorState('network', 'Network error. Please check your internet connection.', error);
        }
        
        logger.error('API request failed', { url, status, error: error.message }, 'API');
        throw this.createErrorState('network', `API request failed: ${error.response.status}`, error);
      }
    );
  }

  private createErrorState(type: ErrorState['type'], message: string, _originalError?: any): ErrorState {
    return {
      type,
      message,
      timestamp: new Date(),
      retryable: type === 'network' || type === 'authentication',
    };
  }

  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  async validateApiKey(key: string): Promise<boolean> {
    logger.info('Validating API key', { keyLength: key.length }, 'API');
    
    try {
      const tempInstance = axios.create({
        baseURL: this.baseUrl,
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${key}`,
          'X-API-Key': key,
          'X-Agency-Id': '2', // Required for CTP Cluj
          'Content-Type': 'application/json',
        },
      });

      // Use the opendata/agency endpoint to validate the key
      const response = await tempInstance.get('/opendata/agency');
      
      // Check if we got a valid response with agencies
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        logger.info('API key validation successful', { agencyCount: response.data.length }, 'API');
        return true;
      } else {
        logger.warn('API key validation failed - no agencies returned', undefined, 'API');
        return false;
      }
    } catch (error) {
      logger.error('API key validation failed', { 
        error: error instanceof Error ? error.message : String(error),
        status: error instanceof AxiosError ? error.response?.status : 'unknown'
      }, 'API');
      
      if (error instanceof AxiosError) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          logger.warn('API key is invalid or expired', { status: error.response.status }, 'API');
          return false;
        }
      }
      // If it's not an auth error, assume the key might be valid but there's another issue
      return false;
    }
  }

  async getAgencies(): Promise<Agency[]> {
    const requestKey = 'agencies';
    logger.info('Fetching agencies', { requestKey }, 'API');
    
    if (!this.shouldAllowRequest(requestKey)) {
      logger.warn('Request rate limited', { requestKey }, 'API');
      throw this.createErrorState('network', 'Request rate limited. Please wait before making another request.');
    }
    
    try {
      if (!this.apiKey) {
        logger.error('API key not configured for getAgencies', undefined, 'API');
        throw this.createErrorState('authentication', 'API key not configured');
      }

      const response = await this.axiosInstance.get<TranzyAgencyResponse[]>('/opendata/agency');
      
      logger.info('Raw API response', { 
        data: response.data, 
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        length: Array.isArray(response.data) ? response.data.length : 'N/A',
        firstItem: Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : null
      }, 'API');
      
      if (!response.data || !Array.isArray(response.data)) {
        logger.error('Invalid API response format', { responseType: typeof response.data }, 'API');
        throw this.createErrorState('parsing', 'Invalid response format from API');
      }

      const agencies = this.transformAgencyData(response.data);
      logger.info('Successfully fetched agencies', { 
        agencyCount: agencies.length,
        sampleAgency: agencies[0] || null,
        rawSample: response.data[0] || null,
        allAgencies: agencies
      }, 'API');
      return agencies;
    } catch (error) {
      if (error && typeof error === 'object' && 'type' in error && 'message' in error && 'timestamp' in error) {
        throw error;
      }
      logger.error('Failed to fetch agencies', error, 'API');
      throw this.createErrorState('network', 'Failed to fetch agencies', error);
    }
  }

  async getBusesForCity(city: string): Promise<BusInfo[]> {
    const requestKey = `vehicles-${city}`;
    logger.info('Fetching vehicles for city', { city, requestKey }, 'API');
    
    if (!this.shouldAllowRequest(requestKey)) {
      logger.warn('Request rate limited', { requestKey }, 'API');
      throw this.createErrorState('network', 'Request rate limited. Please wait before making another request.');
    }
    
    try {
      if (!this.apiKey) {
        logger.error('API key not configured for getBusesForCity', { city }, 'API');
        throw this.createErrorState('authentication', 'API key not configured');
      }

      // First, get all agencies to find the one matching the city
      const agencies = await this.getAgencies();
      const agency = agencies.find(a => a.name === city);
      
      if (!agency) {
        logger.error('Agency not found for city', { city, availableAgencies: agencies.map(a => a.name) }, 'API');
        throw this.createErrorState('parsing', `No agency found for city: ${city}`);
      }

      // Get vehicles for this agency
      const response = await this.axiosInstance.get<TranzyVehicleResponse[]>('/opendata/vehicles', {
        headers: {
          'X-Agency-Id': parseInt(agency.id), // Convert string ID back to number for API
        },
      });
      
      if (!response.data || !Array.isArray(response.data)) {
        logger.error('Invalid API response format', { city, responseType: typeof response.data }, 'API');
        throw this.createErrorState('parsing', 'Invalid response format from API');
      }

      console.log('Raw vehicle data:', { 
        responseLength: response.data.length, 
        firstVehicle: response.data[0],
        sampleVehicles: response.data.slice(0, 3)
      });
      
      const buses = this.transformVehicleData(response.data);
      console.log('Transformed buses:', { 
        originalCount: response.data.length, 
        transformedCount: buses.length,
        firstBus: buses[0]
      });
      
      logger.info('Successfully fetched vehicles', { city, agencyId: agency.id, vehicleCount: buses.length }, 'API');
      return buses;
    } catch (error) {
      if (error && typeof error === 'object' && 'type' in error && 'message' in error && 'timestamp' in error) {
        throw error;
      }
      logger.error('Failed to fetch vehicles for city', error, 'API');
      throw this.createErrorState('network', 'Failed to fetch vehicles for city', error);
    }
  }

  async getStationsForCity(city: string): Promise<Station[]> {
    const requestKey = `stops-${city}`;
    logger.info('Fetching stops for city', { city, requestKey }, 'API');
    
    if (!this.shouldAllowRequest(requestKey)) {
      logger.warn('Request rate limited', { requestKey }, 'API');
      throw this.createErrorState('network', 'Request rate limited. Please wait before making another request.');
    }
    
    try {
      if (!this.apiKey) {
        logger.error('API key not configured for getStationsForCity', { city }, 'API');
        throw this.createErrorState('authentication', 'API key not configured');
      }

      // First, get all agencies to find the one matching the city
      const agencies = await this.getAgencies();
      const agency = agencies.find(a => a.name === city);
      
      if (!agency) {
        logger.error('Agency not found for city', { city, availableAgencies: agencies.map(a => a.name) }, 'API');
        throw this.createErrorState('parsing', `No agency found for city: ${city}`);
      }

      // Get stops for this agency
      const response = await this.axiosInstance.get<TranzyStopResponse[]>('/opendata/stops', {
        headers: {
          'X-Agency-Id': parseInt(agency.id), // Convert string ID back to number for API
        },
      });
      
      if (!response.data || !Array.isArray(response.data)) {
        logger.error('Invalid API response format', { city, responseType: typeof response.data }, 'API');
        throw this.createErrorState('parsing', 'Invalid response format from API');
      }

      const stations = this.transformStopData(response.data);
      logger.info('Successfully fetched stops', { city, agencyId: agency.id, stopCount: stations.length }, 'API');
      return stations;
    } catch (error) {
      if (error && typeof error === 'object' && 'type' in error && 'message' in error && 'timestamp' in error) {
        throw error;
      }
      logger.error('Failed to fetch stops for city', error, 'API');
      throw this.createErrorState('network', 'Failed to fetch stops for city', error);
    }
  }

  async getBusesAtStation(stationId: string): Promise<BusInfo[]> {
    const requestKey = `station-vehicles-${stationId}`;
    
    if (!this.shouldAllowRequest(requestKey)) {
      throw this.createErrorState('network', 'Request rate limited. Please wait before making another request.');
    }
    
    try {
      if (!this.apiKey) {
        throw this.createErrorState('authentication', 'API key not configured');
      }

      // For now, we'll return vehicles near the station
      // In a real implementation, we'd need to calculate which vehicles are near this stop
      // This is a simplified version that returns empty array
      logger.info('Getting vehicles at station', { stationId }, 'API');
      
      // TODO: Implement proper logic to find vehicles near a specific station
      // This would require getting all vehicles and filtering by proximity to the station
      return [];
    } catch (error) {
      if (error && typeof error === 'object' && 'type' in error && 'message' in error && 'timestamp' in error) {
        throw error;
      }
      throw this.createErrorState('network', 'Failed to fetch vehicles at station', error);
    }
  }

  private transformVehicleData(data: TranzyVehicleResponse[]): BusInfo[] {
    console.log('Filtering vehicles:', {
      totalVehicles: data.length,
      validCoords: data.filter(v => v.latitude != null && v.longitude != null).length,
      hasRouteId: data.filter(v => v.route_id != null).length,
      hasLabel: data.filter(v => v.label).length
    });
    
    return data
      .filter(vehicle => {
        const isValid = vehicle.latitude != null && 
                        vehicle.longitude != null &&
                        vehicle.route_id != null &&
                        vehicle.label;
        
        if (!isValid) {
          console.log('Filtered out vehicle:', {
            id: vehicle.id,
            hasLat: vehicle.latitude != null,
            hasLon: vehicle.longitude != null,
            hasRoute: vehicle.route_id != null,
            hasLabel: !!vehicle.label
          });
        }
        
        return isValid;
      })
      .map((vehicle, index) => {
        // Calculate estimated arrival time based on vehicle speed and timestamp
        const now = new Date();
        const lastUpdate = new Date(vehicle.timestamp);
        const timeSinceUpdate = (now.getTime() - lastUpdate.getTime()) / 1000 / 60; // minutes
        
        // Estimate arrival time based on speed and recent activity
        let estimatedMinutesAway: number;
        if (vehicle.speed > 0) {
          // Moving vehicle - estimate 5-25 minutes based on speed
          estimatedMinutesAway = Math.max(5, Math.min(25, Math.floor(30 - vehicle.speed / 2)));
        } else if (timeSinceUpdate < 10) {
          // Stationary but recently updated - likely at a stop
          estimatedMinutesAway = Math.floor(Math.random() * 10) + 2; // 2-12 minutes
        } else {
          // Old data - longer estimate
          estimatedMinutesAway = Math.floor(Math.random() * 20) + 10; // 10-30 minutes
        }
        
        const arrivalTime = new Date(now.getTime() + estimatedMinutesAway * 60000);
        
        // Determine vehicle type description
        const getVehicleTypeDescription = (type: number): string => {
          switch (type) {
            case 0: return 'Tram';
            case 1: return 'Metro';
            case 2: return 'Rail';
            case 3: return 'Bus';
            case 4: return 'Ferry';
            case 11: return 'Trolleybus';
            default: return 'Transit';
          }
        };
        
        const vehicleType = getVehicleTypeDescription(vehicle.vehicle_type);
        
        // Simple direction assignment for testing - alternate between work and home
        const direction = index % 2 === 0 ? 'work' : 'home';
        
        return {
          id: vehicle.id,
          route: vehicle.label,
          destination: `${vehicleType} ${vehicle.label} - Route ${vehicle.route_id}`,
          arrivalTime,
          isLive: timeSinceUpdate < 15, // Consider live if updated within 15 minutes
          minutesAway: estimatedMinutesAway,
          station: {
            id: `route-${vehicle.route_id}`,
            name: `${vehicleType} Route ${vehicle.route_id}`,
            coordinates: { 
              latitude: vehicle.latitude, 
              longitude: vehicle.longitude 
            },
            isFavorite: false,
          },
          direction: direction as 'work' | 'home' | 'unknown',
        };
      })
      .sort((a, b) => a.minutesAway - b.minutesAway); // Sort by arrival time
  }

  private transformStopData(data: TranzyStopResponse[]): Station[] {
    return data.map(stop => ({
      id: stop.stop_id.toString(),
      name: stop.stop_name,
      coordinates: {
        latitude: stop.stop_lat,
        longitude: stop.stop_lon,
      },
      isFavorite: false, // Will be set by favorites store
    }));
  }

  private transformAgencyData(data: TranzyAgencyResponse[]): Agency[] {
    logger.info('Transforming agency data', { 
      inputData: data,
      inputLength: data.length,
      firstItem: data[0] || null
    }, 'API');
    
    const transformed = data.map(agency => {
      const result: Agency = {
        id: agency.agency_id.toString(), // Keep as string for UI consistency
        name: agency.agency_name,
        country: 'Romania', // All agencies appear to be Romanian based on timezone
        timezone: agency.agency_timezone,
      };
      
      // Only add region if it exists (avoid undefined fields that might cause serialization issues)
      // Currently not provided in API response, so we skip it
      
      logger.debug('Transformed agency', { 
        input: agency, 
        output: result 
      }, 'API');
      
      return result;
    });
    
    logger.info('Agency transformation complete', { 
      outputLength: transformed.length,
      outputData: transformed
    }, 'API');
    
    return transformed;
  }
}

// Factory function to create service instance
export const createTranzyApiService = (): TranzyApiServiceImpl => {
  return new TranzyApiServiceImpl();
};

// Export singleton instance (lazy initialization)
let _instance: TranzyApiServiceImpl | null = null;
export const tranzyApiService = (): TranzyApiServiceImpl => {
  if (!_instance) {
    _instance = new TranzyApiServiceImpl();
  }
  return _instance;
};