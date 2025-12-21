/**
 * Presentation Layer Interfaces
 * 
 * This file defines interfaces for the presentation layer that handle UI-specific data,
 * user context, and complete transformation results. These interfaces separate
 * presentation concerns from business logic and core data structures.
 * 
 * Requirements: 3.4, 3.5
 */

import type { 
  CoreVehicle, 
  Coordinates
} from './coreVehicle';
import { 
  ConfidenceLevel, 
  RouteType 
} from './coreVehicle';
import type { 
  VehicleSchedule, 
  VehicleDirection, 
  RouteInfo 
} from './businessLogic';
import type { Route } from './index';

// ============================================================================
// TRANSFORMATION CONTEXT INTERFACE
// ============================================================================

/**
 * User preferences for vehicle transformations
 */
export interface UserPreferences {
  /** Preferred time format (12h or 24h) */
  timeFormat: '12h' | '24h';
  
  /** Preferred distance units */
  distanceUnit: 'metric' | 'imperial';
  
  /** Preferred language for display text */
  language: string;
  
  /** Maximum walking distance to stations in meters */
  maxWalkingDistance: number;
  
  /** Preferred arrival time buffer in minutes */
  arrivalBuffer: number;
  
  /** Whether to show wheelchair accessible vehicles only */
  wheelchairAccessibleOnly: boolean;
  
  /** Whether to show bike accessible vehicles only */
  bikeAccessibleOnly: boolean;
  
  /** Preferred route types to display */
  preferredRouteTypes: RouteType[];
  
  /** Whether to show real-time data when available */
  preferRealTimeData: boolean;
  
  /** Confidence level threshold for displaying data */
  confidenceThreshold: ConfidenceLevel;
}

/**
 * Station information for transformation context
 */
export interface TransformationStation {
  /** Station unique identifier */
  id: string;
  
  /** Station display name */
  name: string;
  
  /** Station coordinates */
  coordinates: Coordinates;
  
  /** Route IDs served by this station */
  routeIds: string[];
  
  /** Whether this station is marked as favorite */
  isFavorite: boolean;
  
  /** Station accessibility features */
  accessibility: {
    wheelchairAccessible: boolean;
    bikeRacks: boolean;
    bikeAccessible?: boolean;
    audioAnnouncements: boolean;
  };
}

/**
 * Transformation context interface for user context
 * Contains all contextual information needed for vehicle data transformations
 */
export interface TransformationContext {
  /** Current user location (optional) */
  userLocation?: Coordinates;
  
  /** User's home location (optional) */
  homeLocation?: Coordinates;
  
  /** User's work location (optional) */
  workLocation?: Coordinates;
  
  /** List of user's favorite route IDs */
  favoriteRoutes: string[];
  
  /** List of target stations for filtering */
  targetStations: TransformationStation[];
  
  /** User preferences for display and filtering */
  preferences: UserPreferences;
  
  /** Current timestamp for calculations */
  timestamp: Date;
  
  /** Current time zone */
  timezone: string;
  
  /** Whether the user is currently at work (for direction analysis) */
  isAtWork?: boolean;
  
  /** Whether the user is currently at home (for direction analysis) */
  isAtHome?: boolean;
  
  /** Current user context for direction analysis */
  userContext: 'work' | 'home' | 'unknown';
  
  /** Maximum number of vehicles to display per route */
  maxVehiclesPerRoute: number;
  
  /** Maximum number of routes to display */
  maxRoutes: number;
  
  /** Whether to include schedule data in transformations */
  includeScheduleData: boolean;
  
  /** Whether to include direction analysis in transformations */
  includeDirectionAnalysis: boolean;
  
  /** Route data for name lookups */
  routeData?: Route[];
  
  /** API configuration */
  apiConfig: {
    /** API key for authentication */
    apiKey: string;
    
    /** Agency ID for filtering */
    agencyId: string;
    
    /** Request timeout in milliseconds */
    timeout: number;
  };
}

// ============================================================================
// VEHICLE DISPLAY DATA INTERFACE
// ============================================================================

/**
 * Vehicle display data interface for UI-specific data
 * Contains all data needed to render vehicle information in the UI
 */
export interface VehicleDisplayData {
  /** Vehicle ID reference */
  vehicleId: string;
  
  /** Display name for the vehicle (route + label) */
  displayName: string;
  
  /** Route display name */
  routeName: string;
  
  /** Route short name (number/code) */
  routeShortName: string;
  
  /** Vehicle label/number */
  vehicleLabel: string;
  
  /** Destination station name */
  destination: string;
  
  /** Formatted arrival time text (e.g., "5 min", "12:30 PM") */
  arrivalText: string;
  
  /** Formatted departure time text (optional) */
  departureText?: string;
  
  /** Status color for UI display (hex color) */
  statusColor: string;
  
  /** Background color for UI display (hex color) */
  backgroundColor: string;
  
  /** Text color for UI display (hex color) */
  textColor: string;
  
  /** Confidence indicator text (e.g., "Real-time", "Scheduled", "Estimated") */
  confidenceIndicator: string;
  
  /** Whether this data is based on real-time information */
  isRealTime: boolean;
  
  /** Whether this data is based on schedule information */
  isScheduled: boolean;
  
  /** Whether this vehicle is currently delayed */
  isDelayed: boolean;
  
  /** Whether this vehicle is currently early */
  isEarly: boolean;
  
  /** Whether this vehicle is wheelchair accessible */
  isWheelchairAccessible: boolean;
  
  /** Whether this vehicle is bike accessible */
  isBikeAccessible: boolean;
  
  /** Distance to user in formatted text (e.g., "0.5 km", "500 m") */
  distanceText?: string;
  
  /** Walking time to station in formatted text (e.g., "5 min walk") */
  walkingTimeText?: string;
  
  /** Direction relative to user (e.g., "Towards work", "Towards home") */
  directionText?: string;
  
  /** Additional status messages for display */
  statusMessages: string[];
  
  /** Warning messages for display */
  warningMessages: string[];
  
  /** Error messages for display */
  errorMessages: string[];
  
  /** Icon name for vehicle type */
  iconName: string;
  
  /** Priority for sorting (higher = more important) */
  displayPriority: number;
  
  /** Whether this vehicle should be highlighted in the UI */
  isHighlighted: boolean;
  
  /** Whether this vehicle is a favorite */
  isFavorite: boolean;
  
  /** Formatted delay text (e.g., "+5 min", "-2 min") */
  delayText?: string;
  
  /** Formatted confidence level text */
  confidenceText: string;
  
  /** Accessibility indicators for display */
  accessibilityIndicators: {
    wheelchair: boolean;
    bike: boolean;
    audio: boolean;
  };
  
  /** Route color information */
  routeColor: {
    primary: string;
    secondary: string;
    text: string;
  };
  
  /** Animation state for UI transitions */
  animationState: 'entering' | 'stable' | 'updating' | 'leaving';
  
  /** Last update timestamp for this display data */
  lastUpdated: Date;
}

// ============================================================================
// TRANSFORMED VEHICLE DATA INTERFACE
// ============================================================================

/**
 * Transformation metadata
 */
export interface TransformationMetadata {
  /** Timestamp when transformation was performed */
  transformedAt: Date;
  
  /** Duration of transformation in milliseconds */
  transformationDuration: number;
  
  /** Number of vehicles processed */
  vehiclesProcessed: number;
  
  /** Number of vehicles successfully transformed */
  vehiclesTransformed: number;
  
  /** Number of vehicles that failed transformation */
  vehiclesFailed: number;
  
  /** Transformation steps that were executed */
  stepsExecuted: string[];
  
  /** Transformation steps that were skipped */
  stepsSkipped: string[];
  
  /** Errors encountered during transformation */
  errors: Array<{
    step: string;
    vehicleId?: string;
    error: string;
    recoverable: boolean;
  }>;
  
  /** Warnings generated during transformation */
  warnings: Array<{
    step: string;
    vehicleId?: string;
    warning: string;
  }>;
  
  /** Performance metrics */
  performance: {
    cacheHits: number;
    cacheMisses: number;
    apiCalls: number;
    averageProcessingTime: number;
  };
  
  /** Data source information */
  dataSources: {
    realTimeVehicles: number;
    scheduledVehicles: number;
    cachedVehicles: number;
  };
  
  /** Transformation context used */
  contextSnapshot: {
    userLocation?: Coordinates;
    favoriteRoutesCount: number;
    targetStationsCount: number;
    timestamp: Date;
  };
}

/**
 * Transformed vehicle data interface for complete results
 * Contains all transformed data organized by type with efficient lookup structures
 */
export interface TransformedVehicleData {
  /** Core vehicle data indexed by vehicle ID */
  vehicles: Map<string, CoreVehicle>;
  
  /** Schedule data indexed by vehicle ID */
  schedules: Map<string, VehicleSchedule>;
  
  /** Direction analysis data indexed by vehicle ID */
  directions: Map<string, VehicleDirection>;
  
  /** UI display data indexed by vehicle ID */
  displayData: Map<string, VehicleDisplayData>;
  
  /** Route information indexed by route ID */
  routeInfo: Map<string, RouteInfo>;
  
  /** Station information indexed by station ID */
  stationInfo: Map<string, TransformationStation>;
  
  /** Transformation metadata */
  metadata: TransformationMetadata;
  
  /** Vehicles grouped by route ID */
  vehiclesByRoute: Map<string, string[]>;
  
  /** Vehicles grouped by station ID */
  vehiclesByStation: Map<string, string[]>;
  
  /** Favorite vehicles (vehicle IDs) */
  favoriteVehicles: Set<string>;
  
  /** Real-time vehicles (vehicle IDs) */
  realTimeVehicles: Set<string>;
  
  /** Scheduled vehicles (vehicle IDs) */
  scheduledVehicles: Set<string>;
  
  /** Vehicles with errors (vehicle IDs) */
  vehiclesWithErrors: Set<string>;
  
  /** Vehicles with warnings (vehicle IDs) */
  vehiclesWithWarnings: Set<string>;
  
  /** Sorted vehicle IDs by arrival time */
  sortedByArrival: string[];
  
  /** Sorted vehicle IDs by distance to user */
  sortedByDistance: string[];
  
  /** Sorted vehicle IDs by display priority */
  sortedByPriority: string[];
  
  /** Cache information */
  cacheInfo: {
    isCached: boolean;
    cacheKey: string;
    cacheExpiry: Date;
    cacheHitRate: number;
  };
  
  /** Data freshness information */
  freshness: {
    isStale: boolean;
    lastRefresh: Date;
    nextRefresh: Date;
    stalenessThreshold: number;
  };
}

// ============================================================================
// PRESENTATION LAYER UTILITIES
// ============================================================================

/**
 * Display formatting options
 */
export interface DisplayFormattingOptions {
  /** Time format preference */
  timeFormat: '12h' | '24h';
  
  /** Distance unit preference */
  distanceUnit: 'metric' | 'imperial';
  
  /** Language for localization */
  language: string;
  
  /** Timezone for time formatting */
  timezone: string;
  
  /** Whether to show seconds in time display */
  showSeconds: boolean;
  
  /** Whether to use relative time (e.g., "5 min ago") */
  useRelativeTime: boolean;
  
  /** Maximum precision for distance display */
  distancePrecision: number;
  
  /** Whether to abbreviate text where possible */
  abbreviateText: boolean;
}

/**
 * UI theme information for presentation
 */
export interface UIThemeInfo {
  /** Current theme mode */
  mode: 'light' | 'dark';
  
  /** Primary color palette */
  primaryColors: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  
  /** Secondary color palette */
  secondaryColors: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  
  /** Status colors */
  statusColors: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  
  /** Background colors */
  backgroundColors: {
    default: string;
    paper: string;
    elevated: string;
  };
  
  /** Text colors */
  textColors: {
    primary: string;
    secondary: string;
    disabled: string;
  };
}

/**
 * Presentation layer configuration
 */
export interface PresentationLayerConfig {
  /** Display formatting options */
  formatting: DisplayFormattingOptions;
  
  /** UI theme information */
  theme: UIThemeInfo;
  
  /** Animation preferences */
  animations: {
    enabled: boolean;
    duration: number;
    easing: string;
  };
  
  /** Accessibility preferences */
  accessibility: {
    highContrast: boolean;
    reducedMotion: boolean;
    screenReader: boolean;
    fontSize: 'small' | 'medium' | 'large';
  };
  
  /** Performance preferences */
  performance: {
    maxVehiclesDisplayed: number;
    updateInterval: number;
    enableVirtualization: boolean;
  };
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to validate TransformationContext objects
 */
export function isTransformationContext(obj: any): obj is TransformationContext {
  return (
    obj &&
    Array.isArray(obj.favoriteRoutes) &&
    Array.isArray(obj.targetStations) &&
    obj.preferences &&
    obj.timestamp instanceof Date &&
    typeof obj.timezone === 'string' &&
    typeof obj.userContext === 'string' &&
    ['work', 'home', 'unknown'].includes(obj.userContext) &&
    typeof obj.maxVehiclesPerRoute === 'number' &&
    typeof obj.maxRoutes === 'number' &&
    obj.apiConfig &&
    typeof obj.apiConfig.apiKey === 'string'
  );
}

/**
 * Type guard to validate VehicleDisplayData objects
 */
export function isVehicleDisplayData(obj: any): obj is VehicleDisplayData {
  return (
    obj &&
    typeof obj.vehicleId === 'string' &&
    typeof obj.displayName === 'string' &&
    typeof obj.routeName === 'string' &&
    typeof obj.destination === 'string' &&
    typeof obj.arrivalText === 'string' &&
    typeof obj.statusColor === 'string' &&
    typeof obj.confidenceIndicator === 'string' &&
    typeof obj.isRealTime === 'boolean' &&
    typeof obj.isScheduled === 'boolean' &&
    Array.isArray(obj.statusMessages) &&
    typeof obj.iconName === 'string' &&
    typeof obj.displayPriority === 'number' &&
    obj.lastUpdated instanceof Date
  );
}

/**
 * Type guard to validate TransformedVehicleData objects
 */
export function isTransformedVehicleData(obj: any): obj is TransformedVehicleData {
  return (
    obj &&
    obj.vehicles instanceof Map &&
    obj.schedules instanceof Map &&
    obj.directions instanceof Map &&
    obj.displayData instanceof Map &&
    obj.routeInfo instanceof Map &&
    obj.stationInfo instanceof Map &&
    obj.metadata &&
    obj.metadata.transformedAt instanceof Date &&
    typeof obj.metadata.vehiclesProcessed === 'number' &&
    obj.vehiclesByRoute instanceof Map &&
    obj.favoriteVehicles instanceof Set &&
    Array.isArray(obj.sortedByArrival)
  );
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Factory function to create default UserPreferences
 */
export function createDefaultUserPreferences(): UserPreferences {
  return {
    timeFormat: '24h',
    distanceUnit: 'metric',
    language: 'en',
    maxWalkingDistance: 1000,
    arrivalBuffer: 5,
    wheelchairAccessibleOnly: false,
    bikeAccessibleOnly: false,
    preferredRouteTypes: Object.values(RouteType),
    preferRealTimeData: true,
    confidenceThreshold: ConfidenceLevel.MEDIUM,
  };
}

/**
 * Factory function to create default TransformationContext
 */
export function createDefaultTransformationContext(
  apiKey: string,
  agencyId: string
): TransformationContext {
  return {
    favoriteRoutes: [],
    targetStations: [],
    preferences: createDefaultUserPreferences(),
    timestamp: new Date(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    userContext: 'unknown',
    maxVehiclesPerRoute: 10,
    maxRoutes: 20,
    includeScheduleData: true,
    includeDirectionAnalysis: true,
    apiConfig: {
      apiKey,
      agencyId,
      timeout: 10000,
    },
  };
}

/**
 * Factory function to create empty TransformedVehicleData
 */
export function createEmptyTransformedVehicleData(): TransformedVehicleData {
  return {
    vehicles: new Map(),
    schedules: new Map(),
    directions: new Map(),
    displayData: new Map(),
    routeInfo: new Map(),
    stationInfo: new Map(),
    metadata: {
      transformedAt: new Date(),
      transformationDuration: 0,
      vehiclesProcessed: 0,
      vehiclesTransformed: 0,
      vehiclesFailed: 0,
      stepsExecuted: [],
      stepsSkipped: [],
      errors: [],
      warnings: [],
      performance: {
        cacheHits: 0,
        cacheMisses: 0,
        apiCalls: 0,
        averageProcessingTime: 0,
      },
      dataSources: {
        realTimeVehicles: 0,
        scheduledVehicles: 0,
        cachedVehicles: 0,
      },
      contextSnapshot: {
        favoriteRoutesCount: 0,
        targetStationsCount: 0,
        timestamp: new Date(),
      },
    },
    vehiclesByRoute: new Map(),
    vehiclesByStation: new Map(),
    favoriteVehicles: new Set(),
    realTimeVehicles: new Set(),
    scheduledVehicles: new Set(),
    vehiclesWithErrors: new Set(),
    vehiclesWithWarnings: new Set(),
    sortedByArrival: [],
    sortedByDistance: [],
    sortedByPriority: [],
    cacheInfo: {
      isCached: false,
      cacheKey: '',
      cacheExpiry: new Date(),
      cacheHitRate: 0,
    },
    freshness: {
      isStale: false,
      lastRefresh: new Date(),
      nextRefresh: new Date(),
      stalenessThreshold: 300000, // 5 minutes
    },
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default values for presentation layer
 */
export const PRESENTATION_LAYER_DEFAULTS = {
  MAX_VEHICLES_PER_ROUTE: 10,
  MAX_ROUTES: 20,
  DEFAULT_TIMEOUT: 10000,
  DEFAULT_WALKING_DISTANCE: 1000,
  DEFAULT_ARRIVAL_BUFFER: 5,
  STALENESS_THRESHOLD: 300000, // 5 minutes
  CACHE_EXPIRY: 600000, // 10 minutes
  UPDATE_INTERVAL: 30000, // 30 seconds
} as const;

/**
 * Status colors for different vehicle states
 */
export const VEHICLE_STATUS_COLORS = {
  REAL_TIME: '#4caf50', // Green
  SCHEDULED: '#2196f3', // Blue
  DELAYED: '#ff9800', // Orange
  EARLY: '#9c27b0', // Purple
  ERROR: '#f44336', // Red
  UNKNOWN: '#757575', // Grey
} as const;

/**
 * Icon names for different vehicle types and states
 */
export const VEHICLE_ICONS = {
  BUS: 'directions_bus',
  TRAM: 'tram',
  METRO: 'subway',
  RAIL: 'train',
  FERRY: 'directions_boat',
  TROLLEYBUS: 'directions_bus',
  WHEELCHAIR: 'accessible',
  BIKE: 'pedal_bike',
  REAL_TIME: 'gps_fixed',
  SCHEDULED: 'schedule',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

/**
 * Animation states for UI transitions
 */
export const ANIMATION_STATES = {
  ENTERING: 'entering',
  STABLE: 'stable',
  UPDATING: 'updating',
  LEAVING: 'leaving',
} as const;