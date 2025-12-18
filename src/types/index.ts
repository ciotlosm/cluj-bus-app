// Core data interfaces for the Bus Tracker application

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number; // GPS accuracy in meters
}

export interface Station {
  id: string;
  name: string;
  coordinates: Coordinates;
  isFavorite: boolean;
}

// Vehicle information (live vehicle instance with computed data)
export interface VehicleInfo {
  id: string;
  route: string; // Display name (route_short_name like "42", "43B") 
  destination: string; // From trip_headsign or route_long_name
  arrivalTime: Date;
  isLive: boolean;
  minutesAway: number;
  station: Station;
  direction: 'work' | 'home' | 'unknown';
}

// Legacy alias for backward compatibility (will be removed)
export type BusInfo = VehicleInfo;

export interface Agency {
  id: string;
  name: string;
  country?: string;
  region?: string;
  timezone?: string;
}

export interface FavoriteRoute {
  id: string; // API route ID for queries
  routeName: string; // route_short_name ("42", "43B", "100")
  longName: string; // route_long_name (e.g., "Piața Unirii - Mănăștur") - kept for backward compatibility
  type: 'bus' | 'trolleybus' | 'tram' | 'metro' | 'rail' | 'ferry' | 'other';
}

export interface UserConfig {
  city: string;
  agencyId: string; // Store the agency ID for consistent API calls
  homeLocation: Coordinates;
  workLocation: Coordinates;
  apiKey: string;
  refreshRate: number; // milliseconds
  staleDataThreshold: number; // minutes - when to consider vehicle data as stale
  defaultLocation?: Coordinates; // Default fallback location for direction detection
  favoriteBuses?: FavoriteRoute[]; // Array of complete route objects (1-3 buses)
  favoriteStations?: string[]; // Array of favorite station IDs
  logLevel?: number; // Log level: 0=DEBUG, 1=INFO, 2=WARN, 3=ERROR
  maxVehiclesPerStation?: number; // Maximum vehicles to show per station (default: 5)
}

export interface Favorites {
  buses: FavoriteRoute[]; // Complete route objects with both id and shortName
  stations: string[]; // station IDs
}

export interface ErrorState {
  type: 'network' | 'parsing' | 'noData' | 'partial' | 'authentication';
  message: string;
  timestamp: Date;
  retryable: boolean;
}

// API Service Interface
export interface TranzyApiService {
  getAgencies(): Promise<Agency[]>;
  getBusesForCity(city: string): Promise<BusInfo[]>;
  getStationsForCity(city: string): Promise<Station[]>;
  getBusesAtStation(stationId: string): Promise<BusInfo[]>;
  validateApiKey(key: string): Promise<boolean>;
}

// New Clean Store Interfaces (4-Store Architecture)

export type ThemeMode = 'light' | 'dark';

export interface ConfigStore {
  // Configuration
  config: UserConfig | null;
  isConfigured: boolean;
  isFullyConfigured: boolean;
  
  // Theme (integrated from themeStore)
  theme: ThemeMode;
  
  // Agencies (integrated from agencyStore)
  agencies: Agency[];
  isAgenciesLoading: boolean;
  agenciesError: ErrorState | null;
  isApiValidated: boolean;
  
  // Actions - Configuration
  updateConfig: (updates: Partial<UserConfig>) => void;
  resetConfig: () => void;
  validateConfig: () => boolean;
  
  // Actions - Theme
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  
  // Actions - Agencies
  fetchAgencies: () => Promise<void>;
  validateApiKey: (apiKey: string) => Promise<boolean>;
  clearAgenciesError: () => void;
  
  // Actions - Favorites (integrated from removed FavoritesStore)
  addFavoriteRoute: (route: FavoriteRoute) => void;
  removeFavoriteRoute: (routeId: string) => void;
  addFavoriteStation: (stationId: string) => void;
  removeFavoriteStation: (stationId: string) => void;
  getFavoriteRoutes: () => FavoriteRoute[];
  getFavoriteStations: () => string[];
}

export interface RefreshOptions {
  forceRefresh?: boolean;
  includeSchedule?: boolean;
  includeLive?: boolean;
  includeStations?: boolean;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  entriesByType: Record<string, number>;
  entriesWithTimestamps: Record<string, { 
    createdAt: number; 
    updatedAt: number; 
    age: number;
    accessCount: number;
  }>;
  lastCacheUpdate: number;
  hitRate?: number;
  missRate?: number;
}

export interface VehicleStore {
  // Unified Data (using EnhancedVehicleInfo as primary model)
  vehicles: any[]; // Will be properly typed as EnhancedVehicleInfo[]
  stations: Station[];
  
  // State Management
  isLoading: boolean;
  error: ErrorState | null;
  lastUpdate: Date | null;
  lastApiUpdate: Date | null;
  lastCacheUpdate: Date | null;
  
  // Cache and Offline (integrated from offlineStore)
  cacheStats: CacheStats;
  isOnline: boolean;
  isUsingCachedData: boolean;
  
  // Actions - Data Management
  refreshVehicles: (options?: RefreshOptions) => Promise<void>;
  refreshStations: (forceRefresh?: boolean) => Promise<void>;
  refreshScheduleData: () => Promise<void>;
  refreshLiveData: () => Promise<void>;
  forceRefreshAll: () => Promise<void>;
  
  // Actions - Auto Refresh
  isAutoRefreshEnabled: boolean;
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
  manualRefresh: () => Promise<void>;
  
  // Actions - Cache Management
  getCacheStats: () => void;
  clearCache: () => void;
  clearError: () => void;
  
  // Helper Methods
  calculateDistance: (from: Coordinates, to: Coordinates) => number;
}

// Favorites Store removed - functionality integrated into ConfigStore

export interface LocationStore {
  currentLocation: Coordinates | null;
  locationPermission: 'granted' | 'denied' | 'prompt';
  requestLocation: () => Promise<Coordinates>;
  calculateDistance: (from: Coordinates, to: Coordinates) => number;
  validateCoordinates: (coords: Coordinates) => boolean;
  watchLocation: (
    callback: (coordinates: Coordinates) => void,
    errorCallback?: (error: Error) => void
  ) => Promise<number>;
  clearLocationWatch: (watchId: number) => void;
  checkLocationPermission: () => Promise<'granted' | 'denied' | 'prompt'>;
}



// Shared Utility Types
export interface StoreEventData {
  [key: string]: any;
}

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size in bytes
  staleWhileRevalidate?: boolean; // Serve stale data while fetching fresh
  maxEntries?: number; // Maximum number of entries
}

export interface RefreshConfig {
  key: string;
  callback: () => Promise<void>;
  intervalMs: number;
  immediate?: boolean;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

export interface ErrorContext {
  storeName: string;
  operation: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Export Tranzy API types
export * from './tranzyApi';