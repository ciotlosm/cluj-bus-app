/**
 * Unified Core Vehicle Type System
 * 
 * This file defines the single source of truth for all vehicle data structures,
 * eliminating type system fragmentation and establishing clean separation of concerns.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * Geographic coordinates interface
 * 
 * Single definition for all position data across the application.
 * Provides standardized coordinate representation with optional accuracy.
 * 
 * @interface Coordinates
 * @example
 * ```typescript
 * const clujCenter: Coordinates = {
 *   latitude: 46.7712,
 *   longitude: 23.6236,
 *   accuracy: 10
 * };
 * ```
 */
export interface Coordinates {
  /** 
   * Latitude coordinate in decimal degrees
   * @minimum -90
   * @maximum 90
   */
  latitude: number;
  
  /** 
   * Longitude coordinate in decimal degrees
   * @minimum -180
   * @maximum 180
   */
  longitude: number;
  
  /** 
   * Position accuracy in meters (optional)
   * @minimum 0
   */
  accuracy?: number;
}

/**
 * Core Vehicle interface - Single source of truth for vehicle data
 * 
 * Contains only immutable properties that define a vehicle's identity and state.
 * This interface serves as the foundation for all vehicle-related operations
 * and ensures consistency across the application.
 * 
 * @interface CoreVehicle
 * @example
 * ```typescript
 * const vehicle: CoreVehicle = {
 *   id: 'bus-123',
 *   routeId: '42',
 *   tripId: 'trip-456',
 *   label: '42A',
 *   position: { latitude: 46.7712, longitude: 23.6236 },
 *   timestamp: new Date(),
 *   speed: 35,
 *   bearing: 90,
 *   isWheelchairAccessible: true,
 *   isBikeAccessible: false
 * };
 * ```
 */
export interface CoreVehicle {
  /** 
   * Unique vehicle identifier
   * Must be unique across all vehicles in the system
   * @example "bus-123", "tram-456"
   */
  id: string;
  
  /** 
   * Route identifier this vehicle is serving
   * References a route in the route management system
   * @example "42", "1A", "metro-red"
   */
  routeId: string;
  
  /** 
   * Human-readable route name for display
   * The actual route name shown to users (e.g., "Line 42", "Express A")
   * Falls back to routeId if not available
   * @example "Line 42", "Express A", "Metro Red Line"
   */
  routeName?: string;
  
  /** 
   * Trip identifier (optional, for schedule correlation)
   * Links vehicle to specific scheduled trip for timing calculations
   * @example "trip-789", "morning-rush-01"
   */
  tripId?: string;
  
  /** 
   * Vehicle label/number displayed to users
   * Human-readable identifier shown in the UI
   * @example "42A", "1234", "M1"
   */
  label: string;
  
  /** 
   * Current vehicle position
   * Real-time GPS coordinates with optional accuracy
   */
  position: Coordinates;
  
  /** 
   * Timestamp of last position update
   * Indicates when the position data was last received
   */
  timestamp: Date;
  
  /** 
   * Current speed in km/h (optional)
   * Vehicle's current speed if available from GPS data
   * @minimum 0
   * @maximum 200
   */
  speed?: number;
  
  /** 
   * Vehicle bearing/heading in degrees (optional)
   * Direction of travel in degrees from north (0-360)
   * @minimum 0
   * @maximum 360
   */
  bearing?: number;
  
  /** 
   * Wheelchair accessibility
   * Indicates if the vehicle is equipped for wheelchair access
   */
  isWheelchairAccessible: boolean;
  
  /** 
   * Bicycle accessibility
   * Indicates if the vehicle allows bicycles on board
   */
  isBikeAccessible: boolean;
}

// ============================================================================
// SUPPORTING ENUMS
// ============================================================================

/**
 * Direction status for vehicle movement relative to a station
 */
export enum DirectionStatus {
  ARRIVING = 'arriving',
  DEPARTING = 'departing', 
  UNKNOWN = 'unknown'
}

/**
 * Confidence level for data reliability and calculations
 */
export enum ConfidenceLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

/**
 * Route type enumeration based on GTFS specification
 */
export enum RouteType {
  TRAM = 'tram',
  METRO = 'metro', 
  RAIL = 'rail',
  BUS = 'bus',
  FERRY = 'ferry',
  TROLLEYBUS = 'trolleybus',
  OTHER = 'other'
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to validate CoreVehicle objects
 */
export function isCoreVehicle(obj: any): obj is CoreVehicle {
  return !!(
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.routeId === 'string' &&
    typeof obj.label === 'string' &&
    obj.position &&
    typeof obj.position.latitude === 'number' &&
    typeof obj.position.longitude === 'number' &&
    obj.timestamp instanceof Date &&
    typeof obj.isWheelchairAccessible === 'boolean' &&
    typeof obj.isBikeAccessible === 'boolean'
  );
}

/**
 * Type guard to validate Coordinates objects
 */
export function isCoordinates(obj: any): obj is Coordinates {
  return (
    obj &&
    typeof obj.latitude === 'number' &&
    typeof obj.longitude === 'number' &&
    obj.latitude >= -90 &&
    obj.latitude <= 90 &&
    obj.longitude >= -180 &&
    obj.longitude <= 180
  );
}

/**
 * Type guard to validate DirectionStatus values
 */
export function isDirectionStatus(value: any): value is DirectionStatus {
  return Object.values(DirectionStatus).includes(value);
}

/**
 * Type guard to validate ConfidenceLevel values
 */
export function isConfidenceLevel(value: any): value is ConfidenceLevel {
  return Object.values(ConfidenceLevel).includes(value);
}

/**
 * Type guard to validate RouteType values
 */
export function isRouteType(value: any): value is RouteType {
  return Object.values(RouteType).includes(value);
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Utility type for creating partial CoreVehicle objects (useful for updates)
 */
export type PartialCoreVehicle = Partial<CoreVehicle> & Pick<CoreVehicle, 'id'>;

/**
 * Utility type for CoreVehicle without computed fields (for API responses)
 */
export type RawVehicleData = Omit<CoreVehicle, 'timestamp'> & {
  timestamp: string; // API returns string timestamps
};

/**
 * Union type for all direction status values
 */
export type DirectionStatusValue = `${DirectionStatus}`;

/**
 * Union type for all confidence level values  
 */
export type ConfidenceLevelValue = `${ConfidenceLevel}`;

/**
 * Union type for all route type values
 */
export type RouteTypeValue = `${RouteType}`;

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Array of all valid direction status values
 */
export const DIRECTION_STATUS_VALUES = Object.values(DirectionStatus) as DirectionStatus[];

/**
 * Array of all valid confidence level values
 */
export const CONFIDENCE_LEVEL_VALUES = Object.values(ConfidenceLevel) as ConfidenceLevel[];

/**
 * Array of all valid route type values
 */
export const ROUTE_TYPE_VALUES = Object.values(RouteType) as RouteType[];

/**
 * Default coordinates (Cluj-Napoca city center)
 */
export const DEFAULT_COORDINATES: Coordinates = {
  latitude: 46.7712,
  longitude: 23.6236,
  accuracy: 1000
};

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Factory function to create a CoreVehicle with validation
 */
export function createCoreVehicle(data: {
  id: string;
  routeId: string;
  label: string;
  position: Coordinates;
  timestamp?: Date;
  tripId?: string;
  speed?: number;
  bearing?: number;
  isWheelchairAccessible?: boolean;
  isBikeAccessible?: boolean;
}): CoreVehicle {
  if (!isCoordinates(data.position)) {
    throw new Error(`Invalid coordinates for vehicle ${data.id}`);
  }

  return {
    id: data.id,
    routeId: data.routeId,
    tripId: data.tripId,
    label: data.label,
    position: data.position,
    timestamp: data.timestamp || new Date(),
    speed: data.speed,
    bearing: data.bearing,
    isWheelchairAccessible: data.isWheelchairAccessible ?? false,
    isBikeAccessible: data.isBikeAccessible ?? false,
  };
}

/**
 * Factory function to create Coordinates with validation
 */
export function createCoordinates(
  latitude: number,
  longitude: number,
  accuracy?: number
): Coordinates {
  if (latitude < -90 || latitude > 90) {
    throw new Error(`Invalid latitude: ${latitude}. Must be between -90 and 90.`);
  }
  
  if (longitude < -180 || longitude > 180) {
    throw new Error(`Invalid longitude: ${longitude}. Must be between -180 and 180.`);
  }

  return {
    latitude,
    longitude,
    accuracy,
  };
}