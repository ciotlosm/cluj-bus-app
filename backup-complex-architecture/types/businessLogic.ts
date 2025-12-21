/**
 * Business Logic Layer Interfaces
 * 
 * This file defines interfaces for business logic operations that build upon
 * the core vehicle type system. These interfaces handle timing, direction analysis,
 * and route metadata while maintaining reference-based relationships using IDs.
 * 
 * Requirements: 3.1, 3.2, 3.3
 */

import { DirectionStatus, ConfidenceLevel, RouteType } from './coreVehicle';

// ============================================================================
// VEHICLE SCHEDULE INTERFACE
// ============================================================================

/**
 * Vehicle schedule interface for timing data
 * Handles all timing-related information for vehicles including scheduled and real-time data
 */
export interface VehicleSchedule {
  /** Vehicle ID reference */
  vehicleId: string;
  
  /** Trip ID reference for schedule correlation */
  tripId: string;
  
  /** Route ID reference */
  routeId: string;
  
  /** Station ID reference */
  stationId: string;
  
  /** Scheduled arrival time */
  scheduledArrival: Date;
  
  /** Scheduled departure time (optional) */
  scheduledDeparture?: Date;
  
  /** Estimated arrival time based on real-time data */
  estimatedArrival?: Date;
  
  /** Estimated departure time based on real-time data */
  estimatedDeparture?: Date;
  
  /** Actual arrival time (when vehicle arrives) */
  actualArrival?: Date;
  
  /** Actual departure time (when vehicle departs) */
  actualDeparture?: Date;
  
  /** Minutes until arrival (calculated field) */
  minutesUntilArrival: number;
  
  /** Whether this timing data is based on real-time information */
  isRealTime: boolean;
  
  /** Whether this timing data is based on schedule information */
  isScheduled: boolean;
  
  /** Confidence level of the timing data */
  confidence: ConfidenceLevel;
  
  /** Stop sequence number in the trip */
  stopSequence: number;
  
  /** Whether this is the final stop of the trip */
  isFinalStop: boolean;
  
  /** Delay in minutes compared to schedule (positive = late, negative = early) */
  delayMinutes?: number;
  
  /** Timestamp when this schedule data was last updated */
  lastUpdated: Date;
}

// ============================================================================
// VEHICLE DIRECTION INTERFACE
// ============================================================================

/**
 * Vehicle direction interface for direction analysis
 * Handles direction analysis and movement patterns relative to stations
 */
export interface VehicleDirection {
  /** Vehicle ID reference */
  vehicleId: string;
  
  /** Station ID reference for direction analysis */
  stationId: string;
  
  /** Route ID reference */
  routeId: string;
  
  /** Trip ID reference */
  tripId: string;
  
  /** Direction status relative to the station */
  direction: DirectionStatus;
  
  /** Estimated minutes until arrival or since departure */
  estimatedMinutes: number;
  
  /** Confidence level of the direction analysis */
  confidence: ConfidenceLevel;
  
  /** Distance to station in meters (optional) */
  distanceToStation?: number;
  
  /** Vehicle bearing/heading in degrees (optional) */
  bearing?: number;
  
  /** Vehicle speed in km/h (optional) */
  speed?: number;
  
  /** Whether the vehicle is currently at the station */
  isAtStation: boolean;
  
  /** Stop sequence information for the trip */
  stopSequence?: Array<{
    /** Stop ID */
    stopId: string;
    
    /** Stop name */
    stopName: string;
    
    /** Sequence number in trip */
    sequence: number;
    
    /** Whether this is the current stop */
    isCurrent: boolean;
    
    /** Whether this is the destination stop */
    isDestination: boolean;
    
    /** Estimated arrival time at this stop */
    estimatedArrival?: Date;
  }>;
  
  /** Timestamp when this direction analysis was performed */
  analyzedAt: Date;
  
  /** Next station ID in the route (optional) */
  nextStationId?: string;
  
  /** Previous station ID in the route (optional) */
  previousStationId?: string;
}

// ============================================================================
// ROUTE INFO INTERFACE
// ============================================================================

/**
 * Route information interface for route metadata
 * Handles comprehensive route information and relationships
 */
export interface RouteInfo {
  /** Route ID (primary identifier) */
  routeId: string;
  
  /** Agency ID reference */
  agencyId: string;
  
  /** Route name/number displayed to users */
  routeName: string;
  
  /** Route description (full name) */
  routeDescription: string;
  
  /** Short route description */
  routeShortName?: string;
  
  /** Route type (bus, tram, etc.) */
  routeType: RouteType;
  
  /** Route color for display (hex color) */
  routeColor?: string;
  
  /** Route text color for display (hex color) */
  routeTextColor?: string;
  
  /** Route URL for more information */
  routeUrl?: string;
  
  /** List of station IDs served by this route */
  stationIds: string[];
  
  /** List of trip IDs for this route */
  tripIds: string[];
  
  /** Route direction variants */
  directions: Array<{
    /** Direction ID */
    directionId: string;
    
    /** Direction name (e.g., "Inbound", "Outbound") */
    directionName: string;
    
    /** Destination station name */
    destination: string;
    
    /** Station IDs in order for this direction */
    stationSequence: string[];
  }>;
  
  /** Operating schedule information */
  schedule?: {
    /** Days of operation */
    operatingDays: string[];
    
    /** First departure time */
    firstDeparture: string;
    
    /** Last departure time */
    lastDeparture: string;
    
    /** Service frequency in minutes */
    frequencyMinutes?: number;
  };
  
  /** Whether this route is currently active */
  isActive: boolean;
  
  /** Whether this route operates on weekends */
  operatesWeekends: boolean;
  
  /** Whether this route operates on holidays */
  operatesHolidays: boolean;
  
  /** Accessibility features */
  accessibility: {
    /** Wheelchair accessible */
    wheelchairAccessible: boolean;
    
    /** Bicycle accessible */
    bikeAccessible: boolean;
    
    /** Audio announcements available */
    audioAnnouncements: boolean;
  };
  
  /** Route statistics */
  statistics?: {
    /** Total route length in kilometers */
    totalLength: number;
    
    /** Average trip duration in minutes */
    averageTripDuration: number;
    
    /** Number of stops */
    stopCount: number;
    
    /** Daily trip count */
    dailyTripCount: number;
  };
  
  /** Timestamp when this route info was last updated */
  lastUpdated: Date;
}

// ============================================================================
// RELATIONSHIP INTERFACES
// ============================================================================

/**
 * Vehicle-Schedule relationship
 * Links vehicles to their schedule information
 */
export interface VehicleScheduleRelation {
  vehicleId: string;
  scheduleId: string;
  relationshipType: 'current' | 'next' | 'previous';
  createdAt: Date;
}

/**
 * Vehicle-Direction relationship
 * Links vehicles to their direction analysis
 */
export interface VehicleDirectionRelation {
  vehicleId: string;
  directionId: string;
  stationId: string;
  relationshipType: 'approaching' | 'at_station' | 'departing';
  createdAt: Date;
}

/**
 * Route-Station relationship
 * Links routes to stations with sequence information
 */
export interface RouteStationRelation {
  routeId: string;
  stationId: string;
  directionId: string;
  sequence: number;
  isTerminal: boolean;
  createdAt: Date;
}

// ============================================================================
// COMPOSITE INTERFACES
// ============================================================================

/**
 * Enhanced vehicle with business logic data
 * Combines core vehicle data with business logic information
 */
export interface EnhancedVehicleWithBusinessLogic {
  /** Vehicle ID reference */
  vehicleId: string;
  
  /** Schedule information */
  schedule?: VehicleSchedule;
  
  /** Direction analysis */
  direction?: VehicleDirection;
  
  /** Route information */
  route?: RouteInfo;
  
  /** Combined confidence level */
  overallConfidence: ConfidenceLevel;
  
  /** Whether all business logic data is available */
  isComplete: boolean;
  
  /** Timestamp when this enhanced data was created */
  enhancedAt: Date;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Reference-based ID types for type safety
 */
export type VehicleId = string & { readonly __brand: 'VehicleId' };
export type StationId = string & { readonly __brand: 'StationId' };
export type RouteId = string & { readonly __brand: 'RouteId' };
export type TripId = string & { readonly __brand: 'TripId' };
export type AgencyId = string & { readonly __brand: 'AgencyId' };

/**
 * Create branded ID types
 */
export const createVehicleId = (id: string): VehicleId => id as VehicleId;
export const createStationId = (id: string): StationId => id as StationId;
export const createRouteId = (id: string): RouteId => id as RouteId;
export const createTripId = (id: string): TripId => id as TripId;
export const createAgencyId = (id: string): AgencyId => id as AgencyId;

/**
 * Extract string from branded ID types
 */
export const extractId = <T extends string>(brandedId: T): string => brandedId as string;

// ============================================================================
// VALIDATION INTERFACES
// ============================================================================

/**
 * Business logic validation result
 */
export interface BusinessLogicValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingReferences: string[];
}

/**
 * Business logic validator interface
 */
export interface BusinessLogicValidator {
  validateSchedule(schedule: VehicleSchedule): BusinessLogicValidationResult;
  validateDirection(direction: VehicleDirection): BusinessLogicValidationResult;
  validateRoute(route: RouteInfo): BusinessLogicValidationResult;
  validateReferences(data: EnhancedVehicleWithBusinessLogic): BusinessLogicValidationResult;
}

// ============================================================================
// FACTORY INTERFACES
// ============================================================================

/**
 * Business logic factory interface
 */
export interface BusinessLogicFactory {
  createSchedule(vehicleId: string, tripId: string, routeId: string, stationId: string): VehicleSchedule;
  createDirection(vehicleId: string, stationId: string, routeId: string, tripId: string): VehicleDirection;
  createRoute(routeId: string, agencyId: string, routeName: string): RouteInfo;
  enhanceVehicle(vehicleId: string): Promise<EnhancedVehicleWithBusinessLogic>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default values for business logic interfaces
 */
export const BUSINESS_LOGIC_DEFAULTS = {
  CONFIDENCE_THRESHOLD: ConfidenceLevel.MEDIUM,
  MAX_DELAY_MINUTES: 60,
  MIN_FREQUENCY_MINUTES: 5,
  MAX_FREQUENCY_MINUTES: 120,
  DEFAULT_STOP_SEQUENCE: 0,
  MAX_DISTANCE_METERS: 10000,
} as const;

/**
 * Business logic error messages
 */
export const BUSINESS_LOGIC_ERRORS = {
  INVALID_VEHICLE_ID: 'Invalid vehicle ID provided',
  INVALID_STATION_ID: 'Invalid station ID provided',
  INVALID_ROUTE_ID: 'Invalid route ID provided',
  INVALID_TRIP_ID: 'Invalid trip ID provided',
  MISSING_SCHEDULE_DATA: 'Schedule data is missing or invalid',
  MISSING_DIRECTION_DATA: 'Direction data is missing or invalid',
  MISSING_ROUTE_DATA: 'Route data is missing or invalid',
  INVALID_TIMING_DATA: 'Timing data is inconsistent or invalid',
  REFERENCE_NOT_FOUND: 'Referenced entity not found',
} as const;