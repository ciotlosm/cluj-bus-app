/**
 * Store and Configuration Types
 * 
 * This file defines interfaces for Zustand stores and user configuration
 * that are used throughout the application.
 */

import type { Coordinates, CoreVehicle } from './coreVehicle';
import type { TransformationStation } from './presentationLayer';

// ============================================================================
// USER CONFIGURATION TYPES
// ============================================================================

/**
 * Theme mode options
 */
export type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * Error state interface for error handling
 */
export interface ErrorState {
  /** Whether there is an active error */
  hasError: boolean;
  
  /** Error message */
  message: string;
  
  /** Error code (optional) */
  code?: string;
  
  /** Error details (optional) */
  details?: string;
  
  /** Whether the error is recoverable */
  isRecoverable: boolean;
  
  /** Whether the error is retryable */
  retryable?: boolean;
  
  /** Timestamp when error occurred */
  timestamp: Date;
  
  /** Error source/context */
  source?: string;
  
  /** Error type */
  type?: 'network' | 'validation' | 'authentication' | 'permission' | 'unknown' | 'parsing' | 'partial' | 'noData';
}

/**
 * Favorite route configuration
 */
export interface FavoriteRoute {
  /** Route ID */
  id?: string; // Optional for backward compatibility
  routeId: string;
  
  /** Route name for display */
  routeName: string;
  
  /** Route description */
  routeDescription?: string;
  
  /** User-defined alias for the route */
  alias?: string;
  
  /** Route direction */
  direction?: string;
  
  /** Whether to show notifications for this route */
  notifications: boolean;
  
  /** Preferred stations for this route */
  preferredStations: string[];
  
  /** When this favorite was added */
  addedAt: Date;
  
  /** Last time this favorite was used */
  lastUsed?: Date;
}

/**
 * User configuration interface (matches actual usage)
 */
export interface UserConfig {
  /** API configuration */
  apiKey: string;
  agencyId: string;
  
  /** City configuration */
  city?: string;
  
  /** Location preferences */
  homeLocation?: Coordinates;
  workLocation?: Coordinates;
  currentLocation?: Coordinates;
  defaultLocation?: Coordinates;
  
  /** Favorite routes */
  favoriteRoutes: FavoriteRoute[];
  
  /** Preferred stations */
  favoriteStations: string[];
  
  /** Display preferences */
  theme: ThemeMode;
  timeFormat: '12h' | '24h';
  distanceUnit: 'metric' | 'imperial';
  language: string;
  
  /** Performance preferences */
  refreshRate?: number;
  staleDataThreshold?: number;
  maxVehiclesPerStation?: number;
  
  /** Logging preferences */
  logLevel?: string | number;
  
  /** Notification preferences */
  notifications: {
    enabled: boolean;
    arrivalAlerts: boolean;
    delayAlerts: boolean;
    routeUpdates: boolean;
  };
  
  /** Accessibility preferences */
  accessibility: {
    wheelchairAccessibleOnly: boolean;
    bikeAccessibleOnly: boolean;
    highContrast: boolean;
    reducedMotion: boolean;
  };
  
  /** Performance preferences */
  performance: {
    maxVehiclesDisplayed: number;
    updateInterval: number;
    cacheEnabled: boolean;
  };
  
  /** Privacy preferences */
  privacy: {
    shareLocation: boolean;
    analytics: boolean;
  };
  
  /** When configuration was last updated */
  lastUpdated: Date;
}

/**
 * Legacy BusInfo type for backward compatibility
 */
export interface BusInfo {
  id: string;
  routeId: string;
  routeName: string;
  label: string;
  position: Coordinates;
  timestamp: Date;
  speed?: number;
  bearing?: number;
  station?: {
    id: string;
    name: string;
    coordinates: Coordinates;
  };
}

/**
 * Legacy Favorites type for backward compatibility
 */
export interface Favorites {
  routes: FavoriteRoute[];
  stations: string[];
}

// ============================================================================
// STORE INTERFACES
// ============================================================================

/**
 * Configuration store interface (matches actual implementation)
 */
export interface ConfigStore {
  /** Current user configuration */
  config: UserConfig | null;
  
  /** Whether basic configuration is complete */
  isConfigured: boolean;
  
  /** Whether full configuration is complete */
  isFullyConfigured: boolean;
  
  /** Current theme mode */
  theme: ThemeMode;
  
  /** Available agencies */
  agencies: any[];
  
  /** Whether agencies are isLoading */
  isAgenciesLoading: boolean;
  
  /** Agencies isLoading error */
  agenciesError: any;
  
  /** Whether API key is validated */
  isApiValidated: boolean;
  
  /** Actions */
  updateConfig: (updates: Partial<UserConfig>) => void;
  resetConfig: () => void;
  setTheme: (mode: ThemeMode) => void;
  getSystemTheme: () => ThemeMode;
  toggleTheme: () => void;
  loadAgencies: () => Promise<void>;
  fetchAgencies: () => Promise<void>;
  clearAgenciesError: () => void;
  validateApiKey: (apiKey: string) => Promise<void>;
  addFavoriteRoute: (route: FavoriteRoute) => void;
  removeFavoriteRoute: (routeId: string) => void;
  getFavoriteRoutes: () => FavoriteRoute[];
  addFavoriteStation: (stationId: string) => void;
  removeFavoriteStation: (stationId: string) => void;
  getFavoriteStations: () => string[];
}

/**
 * Location store interface (matches actual implementation)
 */
export interface LocationStore {
  /** Current user location */
  currentLocation: Coordinates | null;
  
  /** Location permission status */
  locationPermission: 'granted' | 'denied' | 'prompt';
  
  /** Actions */
  requestLocation: () => Promise<Coordinates>;
  calculateDistance: (from: Coordinates, to: Coordinates) => number;
  validateCoordinates: (coords: Coordinates) => boolean;
  watchLocation: (callback: (coordinates: Coordinates) => void, errorCallback?: (error: Error) => void) => number;
  clearWatch: (watchId: number) => void;
  checkLocationPermission: () => Promise<'granted' | 'denied' | 'prompt'>;
}

/**
 * Refresh options for vehicle store (matches actual usage)
 */
export interface RefreshOptions {
  /** Force refresh even if data is fresh */
  forceRefresh?: boolean;
  
  /** Include live data in refresh */
  includeLive?: boolean;
  
  /** Include schedule data in refresh */
  includeSchedule?: boolean;
  
  /** Include direction analysis in refresh */
  includeDirection?: boolean;
  
  /** Timeout for refresh operation */
  timeout?: number;
  
  /** Whether to show isLoading indicator */
  showLoading?: boolean;
}

/**
 * Vehicle store interface (matches actual implementation)
 */
export interface VehicleStore {
  /** Current vehicles data */
  vehicles: CoreVehicle[];
  
  /** Current stations data */
  stations: any[];
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error state */
  error: any;
  
  /** Last update timestamp */
  lastUpdate: Date | null;
  
  /** Last API update timestamp */
  lastApiUpdate: Date | null;
  
  /** Last cache update timestamp */
  lastCacheUpdate: Date | null;
  
  /** Cache statistics */
  cacheStats: {
    totalEntries: number;
    totalSize: number;
    entriesByType: Record<string, any>;
    entriesWithTimestamps: Record<string, any>;
    lastCacheUpdate: number;
  };
  
  /** Whether auto-refresh is enabled */
  isAutoRefreshEnabled: boolean;
  
  /** Actions */
  refreshVehicles: (options?: RefreshOptions) => Promise<void>;
  refreshStations: (forceRefresh?: boolean) => Promise<void>;
  refreshScheduleData: () => Promise<void>;
  refreshLiveData: () => Promise<void>;
  refreshAll: () => Promise<void>;
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
  getCacheStats: () => void;
  clearCache: () => void;
  calculateDistance: (from: Coordinates, to: Coordinates) => number;
  
  /** Data fetching methods */
  getVehicleData: (options?: {
    agencyId?: string;
    routeId?: string;
    forceRefresh?: boolean;
    cacheMaxAge?: number;
    autoRefresh?: boolean;
    refreshInterval?: number;
  }) => Promise<{ data: CoreVehicle[] | null; error: any; lastUpdate: Date | null }>;
  
  getStationData: (options?: {
    agencyId?: string;
    forceRefresh?: boolean;
    cacheMaxAge?: number;
  }) => Promise<{ data: any[] | null; error: any; lastUpdate: Date | null }>;
  
  getRouteData: (options?: {
    agencyId?: string;
    forceRefresh?: boolean;
    cacheMaxAge?: number;
  }) => Promise<{ data: any[] | null; error: any; lastUpdate: Date | null }>;
  
  getStopTimesData: (options?: {
    agencyId?: string;
    tripId?: string;
    stopId?: string;
    forceRefresh?: boolean;
    cacheMaxAge?: number;
    refreshInterval?: number;
  }) => Promise<{ data: any[] | null; error: any; lastUpdate: Date | null }>;
}

// ============================================================================
// LEGACY ALIASES
// ============================================================================

/**
 * Legacy Station type - use TransformationStation from presentationLayer instead
 */
export type Station = TransformationStation;

/**
 * Legacy Agency type - use TranzyAgencyResponse from tranzyApi instead
 */
export interface Agency {
  id: string;
  name: string;
  url?: string;
  timezone?: string;
  language?: string;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for ErrorState
 */
export function isErrorState(obj: any): obj is ErrorState {
  return (
    obj &&
    typeof obj.hasError === 'boolean' &&
    typeof obj.message === 'string' &&
    typeof obj.isRecoverable === 'boolean' &&
    obj.timestamp instanceof Date
  );
}

/**
 * Type guard for UserConfig
 */
export function isUserConfig(obj: any): obj is UserConfig {
  return (
    obj &&
    typeof obj.apiKey === 'string' &&
    typeof obj.agencyId === 'string' &&
    Array.isArray(obj.favoriteRoutes) &&
    Array.isArray(obj.favoriteStations) &&
    typeof obj.theme === 'string' &&
    obj.lastUpdated instanceof Date
  );
}

/**
 * Type guard for FavoriteRoute
 */
export function isFavoriteRoute(obj: any): obj is FavoriteRoute {
  return (
    obj &&
    typeof obj.routeId === 'string' &&
    typeof obj.routeName === 'string' &&
    typeof obj.notifications === 'boolean' &&
    Array.isArray(obj.preferredStations) &&
    obj.addedAt instanceof Date
  );
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create default UserConfig
 */
export function createDefaultUserConfig(): UserConfig {
  return {
    apiKey: '',
    agencyId: '',
    favoriteRoutes: [],
    favoriteStations: [],
    theme: 'auto',
    timeFormat: '24h',
    distanceUnit: 'metric',
    language: 'en',
    notifications: {
      enabled: true,
      arrivalAlerts: true,
      delayAlerts: true,
      routeUpdates: false,
    },
    accessibility: {
      wheelchairAccessibleOnly: false,
      bikeAccessibleOnly: false,
      highContrast: false,
      reducedMotion: false,
    },
    performance: {
      maxVehiclesDisplayed: 50,
      updateInterval: 30000,
      cacheEnabled: true,
    },
    privacy: {
      shareLocation: true,
      analytics: false,
    },
    lastUpdated: new Date(),
  };
}

/**
 * Create default ErrorState
 */
export function createErrorState(
  message: string,
  isRecoverable: boolean = true,
  code?: string,
  source?: string
): ErrorState {
  return {
    hasError: true,
    message,
    code,
    isRecoverable,
    timestamp: new Date(),
    source,
  };
}

/**
 * Create empty ErrorState
 */
export function createEmptyErrorState(): ErrorState {
  return {
    hasError: false,
    message: '',
    isRecoverable: true,
    timestamp: new Date(),
  };
}