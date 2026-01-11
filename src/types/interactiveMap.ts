/**
 * Interactive Transit Map TypeScript interfaces and types
 * Core interfaces for map component, display modes, and visual configuration
 * Follows established patterns from existing codebase
 */

import type { Coordinates } from '../utils/location/distanceUtils';
import type { 
  TranzyVehicleResponse, 
  TranzyRouteResponse, 
  TranzyStopResponse, 
  TranzyTripResponse, 
  TranzyStopTimeResponse 
} from './rawTranzyApi';
import type { RouteShape, ProjectionResult, DistanceResult } from './arrivalTime';
import type { EnhancedVehicleData } from '../utils/vehicle/vehicleEnhancementUtils';

// Re-export commonly used types
export type { Coordinates, RouteShape };

// ============================================================================
// Map Display Modes
// ============================================================================

export enum MapMode {
  VEHICLE_TRACKING = 'vehicle_tracking',
  ROUTE_OVERVIEW = 'route_overview', 
  STATION_CENTERED = 'station_centered'
}

// ============================================================================
// Visual Configuration
// ============================================================================

export enum VehicleColorStrategy {
  BY_ROUTE = 'by_route',           // Vehicle color matches its route color
  BY_CONFIDENCE = 'by_confidence', // Vehicle color indicates arrival confidence
  UNIFORM = 'uniform'              // All vehicles use same color
}

export enum StationSymbolType {
  DEFAULT = 'default',
  USER_LOCATION = 'user_location',
  TERMINUS = 'terminus',
  NEARBY = 'nearby'
}

export interface MapColorScheme {
  routes: Map<number, string>; // Route ID to color mapping
  vehicles: {
    default: string;
    selected: string;
    lowConfidence: string;
    byRoute: Map<number, string>; // Vehicle color matches its route
  };
  stations: {
    default: string;
    userLocation: string;
    terminus: string;
    nearby: string;
  };
  debug: {
    distanceLine: string;
    projectionLine: string;
    routeShape: string;
  };
}

// ============================================================================
// Debug Visualization
// ============================================================================

export interface DebugVisualizationData {
  vehiclePosition: Coordinates;
  targetStationPosition: Coordinates;
  nextStationPosition?: Coordinates; // NEW: Position of the vehicle's next stop
  vehicleProjection: ProjectionResult;
  stationProjection: ProjectionResult;
  nextStationProjection?: ProjectionResult; // NEW: Projection of next stop onto route
  routeShape: RouteShape;
  distanceCalculation: DistanceResult;
  nextStationInfo?: { // NEW: Information about the next station
    stop_id: number;
    stop_name: string;
    isTargetStation: boolean; // true if next station is the same as target station
  };
}

// ============================================================================
// Map State Management
// ============================================================================

export interface MapState {
  mode: MapMode;
  center: Coordinates;
  zoom: number;
  bounds?: [number, number, number, number]; // [south, west, north, east]
  
  // Layer visibility
  showVehicles: boolean;
  showRouteShapes: boolean;
  showStations: boolean;
  showUserLocation: boolean;
  showDebugInfo: boolean;
  
  // Selection state
  selectedVehicleId?: number;
  selectedRouteId?: number;
  selectedStationId?: number;
}

// ============================================================================
// Performance Configuration
// ============================================================================

export interface MapPerformanceConfig {
  maxVehicleMarkers: number;
  maxRouteShapes: number;
  clusteringThreshold: number;
  updateThrottleMs: number;
  renderDistance: number; // Only render items within viewport + buffer
}

export const DEFAULT_MAP_PERFORMANCE: MapPerformanceConfig = {
  maxVehicleMarkers: 100,
  maxRouteShapes: 20,
  clusteringThreshold: 50,
  updateThrottleMs: 1000,
  renderDistance: 5000 // 5km buffer around viewport
};

// ============================================================================
// Default Loading States
// ============================================================================

export const DEFAULT_LOADING_STATE: MapLoadingState = {
  vehicles: false,
  routes: false,
  stations: false,
  routeShapes: false,
  userLocation: false,
  overall: false,
};

// ============================================================================
// Loading States
// ============================================================================

export interface MapLoadingState {
  vehicles: boolean;
  routes: boolean;
  stations: boolean;
  routeShapes: boolean;
  userLocation: boolean;
  overall: boolean;
}

export interface MapDataStatus {
  loading: MapLoadingState;
  errors: Partial<Record<keyof MapLoadingState, string>>;
  lastUpdated: Partial<Record<keyof MapLoadingState, number>>;
}

// ============================================================================
// Component Props Interfaces
// ============================================================================

export interface InteractiveTransitMapProps {
  // Display mode configuration
  mode: MapMode;
  
  // Data props based on mode
  vehicles?: EnhancedVehicleData[];
  routes?: TranzyRouteResponse[];
  stations?: TranzyStopResponse[];
  routeShapes?: Map<string, RouteShape>;
  trips?: TranzyTripResponse[];
  stopTimes?: TranzyStopTimeResponse[];
  
  // Target entities for specific modes
  targetVehicleId?: number;
  targetRouteId?: number;
  targetStationId?: number;
  
  // Debug configuration
  debugMode?: boolean;
  debugData?: DebugVisualizationData;
  
  // Visual configuration
  vehicleColorStrategy?: VehicleColorStrategy;
  colorScheme?: Partial<MapColorScheme>;
  
  // Map configuration
  initialCenter?: Coordinates;
  initialZoom?: number;
  showUserLocation?: boolean;
  performanceConfig?: Partial<MapPerformanceConfig>;
  
  // Loading states
  loadingState?: Partial<MapLoadingState>;
  onLoadingChange?: (loading: MapLoadingState) => void;
  
  // Event handlers
  onVehicleClick?: (vehicle: EnhancedVehicleData) => void;
  onStationClick?: (station: TranzyStopResponse) => void;
  onRouteClick?: (route: TranzyRouteResponse) => void;
}

// ============================================================================
// Layer Component Props
// ============================================================================

export interface VehicleLayerProps {
  vehicles: EnhancedVehicleData[];
  routes: Map<number, TranzyRouteResponse>;
  onVehicleClick?: (vehicle: EnhancedVehicleData) => void;
  highlightedVehicleId?: number;
  colorStrategy?: VehicleColorStrategy;
  colorScheme: MapColorScheme;
  performanceConfig?: MapPerformanceConfig;
  loading?: boolean;
}

export interface RouteShapeLayerProps {
  routeShapes: Map<string, RouteShape>;
  routes: Map<number, TranzyRouteResponse>;
  highlightedRouteIds?: number[];
  showDirectionArrows?: boolean;
  colorScheme: MapColorScheme;
  onRouteClick?: (route: TranzyRouteResponse) => void;
  performanceConfig?: MapPerformanceConfig;
  loading?: boolean;
}

export interface StationLayerProps {
  stations: TranzyStopResponse[];
  stationTypes?: Map<number, StationSymbolType>;
  onStationClick?: (station: TranzyStopResponse) => void;
  highlightedStationId?: number;
  targetStationId?: number; // Target station to highlight
  nextStationId?: number; // Next station to animate with pulsing
  colorScheme: MapColorScheme;
  performanceConfig?: MapPerformanceConfig;
  loading?: boolean;
}

export interface DebugLayerProps {
  debugData: DebugVisualizationData;
  visible: boolean;
  colorScheme: MapColorScheme;
  // Vehicle prediction debug data
  vehicles?: EnhancedVehicleData[];
}

export interface UserLocationLayerProps {
  position?: GeolocationPosition;
  showAccuracyCircle?: boolean;
  colorScheme: MapColorScheme;
}

export interface MapControlsProps {
  mode: MapMode;
  onModeChange: (mode: MapMode) => void;
  debugMode: boolean;
  onDebugToggle: (enabled: boolean) => void;
  showUserLocation: boolean;
  onUserLocationToggle: (enabled: boolean) => void;
  // Layer visibility controls
  showVehicles: boolean;
  onVehiclesToggle: (enabled: boolean) => void;
  showRouteShapes: boolean;
  onRouteShapesToggle: (enabled: boolean) => void;
  showStations: boolean;
  onStationsToggle: (enabled: boolean) => void;
}

// ============================================================================
// Default Color Schemes
// ============================================================================

export const DEFAULT_MAP_COLORS: MapColorScheme = {
  routes: new Map([
    [1, '#1E40AF'], // Dark blue - consistent for all routes
    [2, '#1E40AF'], // Dark blue - consistent for all routes
    [3, '#1E40AF'], // Dark blue - consistent for all routes
    [4, '#1E40AF'], // Dark blue - consistent for all routes
    [5, '#1E40AF'], // Dark blue - consistent for all routes
    [6, '#1E40AF'], // Dark blue - consistent for all routes
    [7, '#1E40AF'], // Dark blue - consistent for all routes
    [8, '#1E40AF'], // Dark blue - consistent for all routes
  ]),
  vehicles: {
    default: '#3182CE', // Station bubble blue (was #2196F3)
    selected: '#FF9800',
    lowConfidence: '#F44336',
    byRoute: new Map(), // Will be populated from routes map
  },
  stations: {
    default: '#757575',
    userLocation: '#4CAF50',
    terminus: '#9C27B0',
    nearby: '#FF5722',
  },
  debug: {
    distanceLine: '#E91E63',
    projectionLine: '#9C27B0',
    routeShape: '#607D8B',
  },
};

// Initialize vehicle byRoute colors to use station blue instead of route colors
DEFAULT_MAP_COLORS.routes.forEach((color, routeId) => {
  DEFAULT_MAP_COLORS.vehicles.byRoute.set(routeId, '#3182CE'); // Station blue for all vehicles
});

/**
 * Create a color scheme with vehicle colors matching station blue and consistent route colors
 * Useful when you have dynamic route data
 */
export const createColorScheme = (routes: Map<number, string>): MapColorScheme => {
  const colorScheme: MapColorScheme = {
    routes: new Map(),
    vehicles: {
      default: DEFAULT_MAP_COLORS.vehicles.default,
      selected: DEFAULT_MAP_COLORS.vehicles.selected,
      lowConfidence: DEFAULT_MAP_COLORS.vehicles.lowConfidence,
      byRoute: new Map(),
    },
    stations: { ...DEFAULT_MAP_COLORS.stations },
    debug: { ...DEFAULT_MAP_COLORS.debug },
  };

  // Set all routes to consistent dark blue and vehicles to station blue
  routes.forEach((_, routeId) => {
    colorScheme.routes.set(routeId, '#1E40AF'); // Dark blue for routes
    colorScheme.vehicles.byRoute.set(routeId, '#3182CE'); // Station blue for vehicles
  });

  return colorScheme;
};

// ============================================================================
// Map Configuration Constants
// ============================================================================

export const MAP_DEFAULTS = {
  CENTER: { lat: 46.7712, lon: 23.6236 } as Coordinates,
  ZOOM: 13,
  MIN_ZOOM: 10,
  MAX_ZOOM: 18,
  TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
} as const;