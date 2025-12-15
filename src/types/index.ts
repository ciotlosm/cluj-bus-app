// Core data interfaces for the Bus Tracker application

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Station {
  id: string;
  name: string;
  coordinates: Coordinates;
  isFavorite: boolean;
}

export interface BusInfo {
  id: string;
  route: string;
  destination: string;
  arrivalTime: Date;
  isLive: boolean;
  minutesAway: number;
  station: Station;
  direction: 'work' | 'home' | 'unknown';
}

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
  longName: string; // route_long_name (e.g., "Piața Unirii - Mănăștur")
  type: 'bus' | 'trolleybus' | 'tram' | 'metro' | 'rail' | 'ferry' | 'other';
}

export interface UserConfig {
  city: string;
  agencyId: string; // Store the agency ID for consistent API calls
  homeLocation: Coordinates;
  workLocation: Coordinates;
  apiKey: string;
  googleMapsApiKey?: string; // Optional Google Maps API key for enhanced ETA calculations
  refreshRate: number; // milliseconds
  staleDataThreshold: number; // minutes - when to consider vehicle data as stale
  defaultLocation?: Coordinates; // Default fallback location for direction detection
  favoriteBuses?: FavoriteRoute[]; // Array of complete route objects (1-3 buses)
  logLevel?: number; // Log level: 0=DEBUG, 1=INFO, 2=WARN, 3=ERROR
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

// Store interfaces
export interface ConfigStore {
  config: UserConfig | null;
  isConfigured: boolean;
  isFullyConfigured: boolean;
  updateConfig: (config: Partial<UserConfig>) => void;
  resetConfig: () => void;
}

export interface BusStore {
  buses: BusInfo[];
  stations: Station[];
  lastUpdate: Date | null;
  lastApiUpdate: Date | null; // When we last received fresh data from API
  lastCacheUpdate: Date | null; // When we last updated cache
  isLoading: boolean;
  error: ErrorState | null;
  refreshBuses: () => Promise<void>;
  clearError: () => void;
  // Real-time refresh system
  isAutoRefreshEnabled: boolean;
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
  manualRefresh: () => Promise<void>;
}

export interface FavoritesStore {
  favorites: Favorites;
  addFavoriteBus: (routeShortName: string) => void;
  removeFavoriteBus: (routeShortName: string) => void;
  addFavoriteStation: (stationId: string) => void;
  removeFavoriteStation: (stationId: string) => void;
  getFilteredStations: () => Station[];
}

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

export interface AgencyStore {
  agencies: Agency[];
  isLoading: boolean;
  error: ErrorState | null;
  isApiValidated: boolean;
  fetchAgencies: () => Promise<void>;
  validateAndFetchAgencies: (apiKey: string) => Promise<boolean>;
  clearError: () => void;
  resetStore: () => void;
  checkAndFixCorruptedData: () => boolean;
}

// Export Tranzy API types
export * from './tranzyApi';