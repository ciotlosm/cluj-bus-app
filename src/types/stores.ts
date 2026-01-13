/**
 * Store Interface Definitions
 * Centralized TypeScript interfaces for all Zustand stores
 * Exported for type safety in components, hooks, and tests
 */

import type { 
  TranzyVehicleResponse, 
  TranzyRouteResponse, 
  TranzyStopResponse, 
  TranzyTripResponse, 
  TranzyStopTimeResponse 
} from './rawTranzyApi';
import type { RouteShape } from './arrivalTime';
import type { EnhancedVehicleData } from '../utils/vehicle/vehicleEnhancementUtils';
import type { LoadingState } from './common';

/**
 * Vehicle store state interface
 * Manages enhanced vehicle data with position predictions
 */
export interface VehicleStore extends LoadingState {
  /** Array of enhanced vehicle data with predictions and metadata */
  vehicles: EnhancedVehicleData[];
  /** Refresh vehicle data from API */
  refreshVehicles: () => Promise<void>;
  /** Clear all vehicle data */
  clearVehicles: () => void;
}

/**
 * Station store state interface
 * Manages station/stop data from the transit API
 */
export interface StationStore extends LoadingState {
  /** Array of station/stop data */
  stops: TranzyStopResponse[];
  /** Refresh station data from API */
  refreshStops: () => Promise<void>;
  /** Clear all station data */
  clearStops: () => void;
}

/**
 * Route store state interface
 * Manages route definitions and metadata
 */
export interface RouteStore extends LoadingState {
  /** Array of route definitions */
  routes: TranzyRouteResponse[];
  /** Refresh route data from API */
  refreshRoutes: () => Promise<void>;
  /** Clear all route data */
  clearRoutes: () => void;
}

/**
 * Trip store state interface
 * Manages trip definitions with headsigns and directions
 */
export interface TripStore extends LoadingState {
  /** Array of trip definitions */
  trips: TranzyTripResponse[];
  /** Refresh trip data from API */
  refreshTrips: () => Promise<void>;
  /** Clear all trip data */
  clearTrips: () => void;
}

/**
 * Stop time store state interface
 * Manages stop sequences for trips
 */
export interface StopTimeStore extends LoadingState {
  /** Array of stop time sequences */
  stopTimes: TranzyStopTimeResponse[];
  /** Refresh stop time data from API */
  refreshStopTimes: () => Promise<void>;
  /** Clear all stop time data */
  clearStopTimes: () => void;
}

/**
 * Shape store state interface
 * Manages route geometry shapes for map visualization
 */
export interface ShapeStore extends LoadingState {
  /** Route shapes mapped by shape ID */
  shapes: Map<string, RouteShape>;
  /** Refresh shape data from API */
  refreshShapes: () => Promise<void>;
  /** Clear all shape data */
  clearShapes: () => void;
}

/**
 * Location store state interface
 * Manages user's GPS location and preferences
 */
export interface LocationStore {
  /** Current GPS position (null if not available) */
  currentPosition: GeolocationPosition | null;
  /** Previous GPS position for movement tracking */
  previousPosition: GeolocationPosition | null;
  /** Current geolocation permission state */
  permissionState: PermissionState | null;
  /** Timestamp of last successful location update */
  lastUpdated: number | null;
  
  /** Whether location request is in progress */
  loading: boolean;
  /** Location error message (null if no error) */
  error: string | null;
  /** Whether location services are disabled */
  disabled: boolean;
  
  /** User preference: enable automatic location updates */
  enableAutoLocation: boolean;
  /** User preference: location accuracy level */
  locationAccuracy: LocationAccuracyLevel;
  /** Cache timeout for location data in milliseconds */
  cacheTimeout: number;
  /** Distance threshold for proximity filtering in meters */
  distanceThreshold: number;
  
  /** Request current location */
  requestLocation: () => Promise<void>;
  /** Update location preferences */
  updatePreferences: (preferences: Partial<LocationPreferences>) => void;
  /** Clear location data */
  clearLocation: () => void;
}

/**
 * API status tracking interface
 * Monitors overall API health and performance
 */
export interface ApiStatus {
  /** Whether API is currently reachable */
  isOnline: boolean;
  /** Average response time in milliseconds */
  averageResponseTime: number;
  /** Number of successful API calls in current session */
  successfulCalls: number;
  /** Number of failed API calls in current session */
  failedCalls: number;
  /** Timestamp of last successful API call */
  lastSuccessfulCall: number | null;
  /** Current error message (null if no error) */
  currentError: string | null;
}

/**
 * Status store state interface
 * Manages API status and connectivity monitoring
 */
export interface StatusStore {
  /** Current API status */
  apiStatus: ApiStatus;
  /** Update API status based on call result */
  updateApiStatus: (success: boolean, responseTime: number, error?: string) => void;
  /** Reset API status counters */
  resetApiStatus: () => void;
}

/**
 * Favorites store state interface
 * Manages user's favorite routes and stations
 */
export interface FavoritesStore {
  /** Array of favorite route IDs */
  favoriteRouteIds: string[];
  /** Array of favorite station IDs */
  favoriteStationIds: string[];
  
  /** Add route to favorites */
  addFavoriteRoute: (routeId: string) => void;
  /** Remove route from favorites */
  removeFavoriteRoute: (routeId: string) => void;
  /** Check if route is favorited */
  isFavoriteRoute: (routeId: string) => boolean;
  
  /** Add station to favorites */
  addFavoriteStation: (stationId: string) => void;
  /** Remove station from favorites */
  removeFavoriteStation: (stationId: string) => void;
  /** Check if station is favorited */
  isFavoriteStation: (stationId: string) => boolean;
  
  /** Clear all favorites */
  clearFavorites: () => void;
}

/**
 * Configuration store state interface
 * Manages app configuration and API settings
 */
export interface ConfigStore {
  /** Tranzy API key (null if not configured) */
  apiKey: string | null;
  /** API base URL */
  apiBaseUrl: string;
  /** Request timeout in milliseconds */
  requestTimeout: number;
  /** Whether to enable debug mode */
  debugMode: boolean;
  
  /** Update API key */
  setApiKey: (apiKey: string) => void;
  /** Update API base URL */
  setApiBaseUrl: (url: string) => void;
  /** Update request timeout */
  setRequestTimeout: (timeout: number) => void;
  /** Toggle debug mode */
  toggleDebugMode: () => void;
  
  /** Reset configuration to defaults */
  resetConfig: () => void;
}

// Import required types
import type { LocationAccuracyLevel, PermissionState } from '../utils/core/stringConstants';
import type { LocationPreferences } from './location';