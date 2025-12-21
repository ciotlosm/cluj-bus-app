/**
 * Vehicle Data Factory Functions
 * 
 * This module provides factory functions for creating common vehicle data structures
 * with sensible defaults, validation, and type safety. These factories simplify
 * the creation of vehicle-related objects throughout the application.
 * 
 * Requirements: 6.1, 6.4
 * 
 * @module VehicleDataFactory
 */

import type {
  CoreVehicle,
  Coordinates
} from '../types/coreVehicle';
import {
  DirectionStatus,
  ConfidenceLevel,
  RouteType,
  createCoreVehicle,
  createCoordinates,
  DEFAULT_COORDINATES
} from '../types/coreVehicle';
import type {
  VehicleSchedule,
  VehicleDirection,
  RouteInfo,
  EnhancedVehicleWithBusinessLogic
} from '../types/businessLogic';
import {
  BUSINESS_LOGIC_DEFAULTS
} from '../types/businessLogic';
import type {
  VehicleDisplayData,
  TransformationContext,
  TransformedVehicleData,
  TransformationStation,
  UserPreferences,
  TransformationMetadata
} from '../types/presentationLayer';
import {
  createDefaultUserPreferences,
  createDefaultTransformationContext,
  createEmptyTransformedVehicleData,
  PRESENTATION_LAYER_DEFAULTS,
  VEHICLE_STATUS_COLORS,
  VEHICLE_ICONS
} from '../types/presentationLayer';
import type {
  TransformationValidationResult
} from '../types/transformationPipeline';
import {
  TransformationError,
  createSuccessValidation,
  createFailureValidation,
  createValidationError,
  createValidationWarning
} from '../types/transformationPipeline';

// ============================================================================
// FACTORY CONFIGURATION
// ============================================================================

/**
 * Configuration options for factory functions
 */
export interface FactoryConfig {
  /** Default agency ID for created objects */
  defaultAgencyId?: string;
  
  /** Default API key for contexts */
  defaultApiKey?: string;
  
  /** Whether to use Cluj-Napoca coordinates by default */
  useClujCoordinates?: boolean;
  
  /** Default timezone for date operations */
  defaultTimezone?: string;
  
  /** Whether to include optional fields by default */
  includeOptionalFields?: boolean;
  
  /** Default confidence level for uncertain data */
  defaultConfidenceLevel?: ConfidenceLevel;
  
  /** Default route type for new routes */
  defaultRouteType?: RouteType;
  
  /** Whether to validate created objects */
  validateCreatedObjects?: boolean;
}

/**
 * Default factory configuration
 */
export const DEFAULT_FACTORY_CONFIG: FactoryConfig = {
  defaultAgencyId: 'cluj-transport',
  defaultApiKey: 'development-key',
  useClujCoordinates: true,
  defaultTimezone: 'Europe/Bucharest',
  includeOptionalFields: true,
  defaultConfidenceLevel: ConfidenceLevel.MEDIUM,
  defaultRouteType: RouteType.BUS,
  validateCreatedObjects: true
};

// ============================================================================
// CORE VEHICLE FACTORIES
// ============================================================================

/**
 * Creates a CoreVehicle with intelligent defaults and validation
 * 
 * @param data - Partial vehicle data to override defaults
 * @param config - Factory configuration options
 * @returns A complete CoreVehicle object
 * 
 * @example
 * ```typescript
 * const vehicle = createVehicle({
 *   id: 'bus-123',
 *   routeId: '42',
 *   label: '42A'
 * });
 * ```
 */
export function createVehicle(
  data: Partial<CoreVehicle> & Pick<CoreVehicle, 'id' | 'routeId' | 'label'>,
  config: FactoryConfig = DEFAULT_FACTORY_CONFIG
): CoreVehicle {
  const defaultPosition = config.useClujCoordinates 
    ? { latitude: 46.7712, longitude: 23.6236, accuracy: 10 }
    : DEFAULT_COORDINATES;

  const vehicle: CoreVehicle = {
    id: data.id,
    routeId: data.routeId,
    tripId: data.tripId,
    label: data.label,
    position: data.position || defaultPosition,
    timestamp: data.timestamp || new Date(),
    speed: config.includeOptionalFields ? (data.speed ?? 0) : data.speed,
    bearing: config.includeOptionalFields ? (data.bearing ?? 0) : data.bearing,
    isWheelchairAccessible: data.isWheelchairAccessible ?? true,
    isBikeAccessible: data.isBikeAccessible ?? false
  };

  if (config.validateCreatedObjects) {
    const validationResult = validateVehicleData(vehicle);
    if (!validationResult.isValid) {
      throw new Error(`Invalid vehicle data: ${validationResult.errors.map(e => e.message).join(', ')}`);
    }
  }

  return vehicle;
}

/**
 * Creates a batch of CoreVehicles with sequential IDs and route assignments
 * 
 * @param count - Number of vehicles to create
 * @param baseData - Base data to apply to all vehicles
 * @param config - Factory configuration options
 * @returns Array of CoreVehicle objects
 */
export function createVehicleBatch(
  count: number,
  baseData: Partial<CoreVehicle> = {},
  config: FactoryConfig = DEFAULT_FACTORY_CONFIG
): CoreVehicle[] {
  const vehicles: CoreVehicle[] = [];
  
  for (let i = 0; i < count; i++) {
    const vehicleData = {
      id: `vehicle-${i + 1}`,
      routeId: baseData.routeId || `route-${Math.floor(i / 3) + 1}`, // 3 vehicles per route
      label: `${baseData.label || 'V'}${i + 1}`,
      ...baseData
    };
    
    vehicles.push(createVehicle(vehicleData, config));
  }
  
  return vehicles;
}

/**
 * Creates coordinates with validation and intelligent defaults
 * 
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @param accuracy - Optional accuracy in meters
 * @param config - Factory configuration options
 * @returns Validated Coordinates object
 */
export function createValidatedCoordinates(
  latitude: number,
  longitude: number,
  accuracy?: number,
  config: FactoryConfig = DEFAULT_FACTORY_CONFIG
): Coordinates {
  if (config.validateCreatedObjects) {
    if (latitude < -90 || latitude > 90) {
      throw new Error(`Invalid latitude: ${latitude}. Must be between -90 and 90.`);
    }
    if (longitude < -180 || longitude > 180) {
      throw new Error(`Invalid longitude: ${longitude}. Must be between -180 and 180.`);
    }
    if (accuracy !== undefined && accuracy < 0) {
      throw new Error(`Invalid accuracy: ${accuracy}. Must be non-negative.`);
    }
  }

  return createCoordinates(latitude, longitude, accuracy);
}

// ============================================================================
// BUSINESS LOGIC FACTORIES
// ============================================================================

/**
 * Creates a VehicleSchedule with intelligent timing calculations
 * 
 * @param data - Partial schedule data
 * @param config - Factory configuration options
 * @returns Complete VehicleSchedule object
 */
export function createVehicleSchedule(
  data: Partial<VehicleSchedule> & Pick<VehicleSchedule, 'vehicleId' | 'tripId' | 'routeId' | 'stationId'>,
  config: FactoryConfig = DEFAULT_FACTORY_CONFIG
): VehicleSchedule {
  const now = new Date();
  const scheduledArrival = data.scheduledArrival || new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now
  const minutesUntilArrival = Math.max(0, Math.floor((scheduledArrival.getTime() - now.getTime()) / (60 * 1000)));

  const schedule: VehicleSchedule = {
    vehicleId: data.vehicleId,
    tripId: data.tripId,
    routeId: data.routeId,
    stationId: data.stationId,
    scheduledArrival,
    scheduledDeparture: data.scheduledDeparture || new Date(scheduledArrival.getTime() + 30 * 1000), // 30 seconds later
    estimatedArrival: data.estimatedArrival,
    estimatedDeparture: data.estimatedDeparture,
    actualArrival: data.actualArrival,
    actualDeparture: data.actualDeparture,
    minutesUntilArrival,
    isRealTime: data.isRealTime ?? (data.estimatedArrival !== undefined),
    isScheduled: data.isScheduled ?? true,
    confidence: data.confidence || config.defaultConfidenceLevel || ConfidenceLevel.MEDIUM,
    stopSequence: data.stopSequence ?? 1,
    isFinalStop: data.isFinalStop ?? false,
    delayMinutes: data.delayMinutes,
    lastUpdated: data.lastUpdated || now
  };

  // Calculate delay if estimated arrival is available
  if (schedule.estimatedArrival && !schedule.delayMinutes) {
    schedule.delayMinutes = Math.floor((schedule.estimatedArrival.getTime() - schedule.scheduledArrival.getTime()) / (60 * 1000));
  }

  return schedule;
}

/**
 * Creates a VehicleDirection with intelligent direction analysis
 * 
 * @param data - Partial direction data
 * @param config - Factory configuration options
 * @returns Complete VehicleDirection object
 */
export function createVehicleDirection(
  data: Partial<VehicleDirection> & Pick<VehicleDirection, 'vehicleId' | 'stationId' | 'routeId' | 'tripId'>,
  config: FactoryConfig = DEFAULT_FACTORY_CONFIG
): VehicleDirection {
  const direction: VehicleDirection = {
    vehicleId: data.vehicleId,
    stationId: data.stationId,
    routeId: data.routeId,
    tripId: data.tripId,
    direction: data.direction || DirectionStatus.ARRIVING,
    estimatedMinutes: data.estimatedMinutes ?? 5,
    confidence: data.confidence || config.defaultConfidenceLevel || ConfidenceLevel.MEDIUM,
    distanceToStation: data.distanceToStation,
    bearing: data.bearing,
    speed: data.speed,
    isAtStation: data.isAtStation ?? false,
    stopSequence: data.stopSequence,
    analyzedAt: data.analyzedAt || new Date(),
    nextStationId: data.nextStationId,
    previousStationId: data.previousStationId
  };

  // Adjust direction based on estimated minutes
  if (!data.direction) {
    if (direction.estimatedMinutes <= 1) {
      direction.direction = DirectionStatus.ARRIVING;
      direction.isAtStation = true;
    } else if (direction.estimatedMinutes < 0) {
      direction.direction = DirectionStatus.DEPARTING;
    }
  }

  return direction;
}

/**
 * Creates a RouteInfo with comprehensive route metadata
 * 
 * @param data - Partial route data
 * @param config - Factory configuration options
 * @returns Complete RouteInfo object
 */
export function createRouteInfo(
  data: Partial<RouteInfo> & Pick<RouteInfo, 'routeId' | 'routeName'>,
  config: FactoryConfig = DEFAULT_FACTORY_CONFIG
): RouteInfo {
  const route: RouteInfo = {
    routeId: data.routeId,
    agencyId: data.agencyId || config.defaultAgencyId || 'default-agency',
    routeName: data.routeName,
    routeDescription: data.routeDescription || `Route ${data.routeName}`,
    routeShortName: data.routeShortName || data.routeName,
    routeType: data.routeType || config.defaultRouteType || RouteType.BUS,
    routeColor: data.routeColor,
    routeTextColor: data.routeTextColor,
    routeUrl: data.routeUrl,
    stationIds: data.stationIds || [],
    tripIds: data.tripIds || [],
    directions: data.directions || [
      {
        directionId: 'inbound',
        directionName: 'Inbound',
        destination: 'City Center',
        stationSequence: data.stationIds || []
      },
      {
        directionId: 'outbound',
        directionName: 'Outbound',
        destination: 'Terminus',
        stationSequence: [...(data.stationIds || [])].reverse()
      }
    ],
    schedule: data.schedule,
    isActive: data.isActive ?? true,
    operatesWeekends: data.operatesWeekends ?? true,
    operatesHolidays: data.operatesHolidays ?? false,
    accessibility: data.accessibility || {
      wheelchairAccessible: true,
      bikeAccessible: false,
      audioAnnouncements: true
    },
    statistics: data.statistics,
    lastUpdated: data.lastUpdated || new Date()
  };

  return route;
}

// ============================================================================
// PRESENTATION LAYER FACTORIES
// ============================================================================

/**
 * Creates VehicleDisplayData with intelligent formatting and styling
 * 
 * @param vehicle - Core vehicle data
 * @param schedule - Optional schedule data for timing
 * @param config - Factory configuration options
 * @returns Complete VehicleDisplayData object
 */
export function createVehicleDisplayData(
  vehicle: CoreVehicle,
  schedule?: VehicleSchedule,
  config: FactoryConfig = DEFAULT_FACTORY_CONFIG
): VehicleDisplayData {
  const isRealTime = schedule?.isRealTime ?? false;
  const isDelayed = schedule?.delayMinutes ? schedule.delayMinutes > 0 : false;
  const isEarly = schedule?.delayMinutes ? schedule.delayMinutes < 0 : false;
  
  // Determine status color based on vehicle state
  let statusColor: string = VEHICLE_STATUS_COLORS.UNKNOWN;
  if (isRealTime) {
    statusColor = isDelayed ? VEHICLE_STATUS_COLORS.DELAYED : 
                  isEarly ? VEHICLE_STATUS_COLORS.EARLY : 
                  VEHICLE_STATUS_COLORS.REAL_TIME;
  } else {
    statusColor = VEHICLE_STATUS_COLORS.SCHEDULED;
  }

  // Format arrival text
  let arrivalText = 'Unknown';
  if (schedule) {
    if (schedule.minutesUntilArrival <= 0) {
      arrivalText = 'Now';
    } else if (schedule.minutesUntilArrival === 1) {
      arrivalText = '1 min';
    } else {
      arrivalText = `${schedule.minutesUntilArrival} min`;
    }
  }

  // Format confidence indicator
  const confidenceIndicator = isRealTime ? 'Real-time' : 
                              schedule?.isScheduled ? 'Scheduled' : 'Estimated';

  const displayData: VehicleDisplayData = {
    vehicleId: vehicle.id,
    displayName: `Route ${vehicle.routeId}`,
    routeName: `Route ${vehicle.routeId}`,
    routeShortName: vehicle.routeId,
    vehicleLabel: vehicle.label,
    destination: 'Destination', // Would be populated from route info
    arrivalText,
    departureText: schedule?.scheduledDeparture ? 
      formatTimeFromDate(schedule.scheduledDeparture) : undefined,
    statusColor,
    backgroundColor: '#ffffff',
    textColor: '#000000',
    confidenceIndicator,
    isRealTime,
    isScheduled: schedule?.isScheduled ?? false,
    isDelayed,
    isEarly,
    isWheelchairAccessible: vehicle.isWheelchairAccessible,
    isBikeAccessible: vehicle.isBikeAccessible,
    distanceText: undefined, // Would be calculated from user location
    walkingTimeText: undefined,
    directionText: undefined,
    statusMessages: [],
    warningMessages: isDelayed ? [`Delayed by ${schedule?.delayMinutes} minutes`] : [],
    errorMessages: [],
    iconName: VEHICLE_ICONS.BUS, // Would be determined by route type
    displayPriority: isRealTime ? 100 : 50,
    isHighlighted: false,
    isFavorite: false,
    delayText: schedule?.delayMinutes ? 
      `${schedule.delayMinutes > 0 ? '+' : ''}${schedule.delayMinutes} min` : undefined,
    confidenceText: `${schedule?.confidence || 'medium'} confidence`,
    accessibilityIndicators: {
      wheelchair: vehicle.isWheelchairAccessible,
      bike: vehicle.isBikeAccessible,
      audio: true // Default assumption
    },
    routeColor: {
      primary: statusColor,
      secondary: lightenColor(statusColor, 0.3),
      text: getContrastColor(statusColor)
    },
    animationState: 'stable',
    lastUpdated: new Date()
  };

  return displayData;
}

/**
 * Creates a TransformationContext with intelligent defaults for the current environment
 * 
 * @param overrides - Partial context data to override defaults
 * @param config - Factory configuration options
 * @returns Complete TransformationContext object
 */
export function createTransformationContextWithDefaults(
  overrides: Partial<TransformationContext> = {},
  config: FactoryConfig = DEFAULT_FACTORY_CONFIG
): TransformationContext {
  const baseContext = createDefaultTransformationContext(
    config.defaultApiKey || 'development-key',
    config.defaultAgencyId || 'default-agency'
  );

  const context: TransformationContext = {
    ...baseContext,
    timezone: config.defaultTimezone || baseContext.timezone,
    preferences: {
      ...baseContext.preferences,
      confidenceThreshold: config.defaultConfidenceLevel || baseContext.preferences.confidenceThreshold
    },
    ...overrides
  };

  // Set intelligent defaults based on configuration
  if (config.useClujCoordinates && !context.userLocation) {
    context.userLocation = createValidatedCoordinates(46.7712, 23.6236, 100);
  }

  return context;
}

/**
 * Creates a complete TransformedVehicleData structure from raw vehicle data
 * 
 * @param vehicles - Array of core vehicles
 * @param context - Transformation context
 * @param config - Factory configuration options
 * @returns Complete TransformedVehicleData object
 */
export function createTransformedVehicleDataFromVehicles(
  vehicles: CoreVehicle[],
  context: TransformationContext,
  config: FactoryConfig = DEFAULT_FACTORY_CONFIG
): TransformedVehicleData {
  const transformedData = createEmptyTransformedVehicleData();
  const startTime = Date.now();

  // Populate vehicles and create related data
  vehicles.forEach(vehicle => {
    // Add core vehicle
    transformedData.vehicles.set(vehicle.id, vehicle);

    // Create and add schedule
    const schedule = createVehicleSchedule({
      vehicleId: vehicle.id,
      tripId: vehicle.tripId || `trip-${vehicle.id}`,
      routeId: vehicle.routeId,
      stationId: context.targetStations[0]?.id || 'default-station'
    }, config);
    transformedData.schedules.set(vehicle.id, schedule);

    // Create and add direction
    const direction = createVehicleDirection({
      vehicleId: vehicle.id,
      stationId: context.targetStations[0]?.id || 'default-station',
      routeId: vehicle.routeId,
      tripId: vehicle.tripId || `trip-${vehicle.id}`
    }, config);
    transformedData.directions.set(vehicle.id, direction);

    // Create and add display data
    const displayData = createVehicleDisplayData(vehicle, schedule, config);
    transformedData.displayData.set(vehicle.id, displayData);

    // Group by route
    if (!transformedData.vehiclesByRoute.has(vehicle.routeId)) {
      transformedData.vehiclesByRoute.set(vehicle.routeId, []);
    }
    transformedData.vehiclesByRoute.get(vehicle.routeId)!.push(vehicle.id);

    // Add to appropriate sets
    if (schedule.isRealTime) {
      transformedData.realTimeVehicles.add(vehicle.id);
    }
    if (schedule.isScheduled) {
      transformedData.scheduledVehicles.add(vehicle.id);
    }
    if (context.favoriteRoutes.includes(vehicle.routeId)) {
      transformedData.favoriteVehicles.add(vehicle.id);
    }
  });

  // Create route info for all routes
  const uniqueRoutes = Array.from(new Set(vehicles.map(v => v.routeId)));
  uniqueRoutes.forEach(routeId => {
    const routeVehicles = vehicles.filter(v => v.routeId === routeId);
    const route = createRouteInfo({
      routeId,
      routeName: routeId,
      stationIds: context.targetStations.map(s => s.id),
      tripIds: routeVehicles.map(v => v.tripId).filter(Boolean) as string[]
    }, config);
    transformedData.routeInfo.set(routeId, route);
  });

  // Add station info
  context.targetStations.forEach(station => {
    transformedData.stationInfo.set(station.id, station);
  });

  // Sort arrays
  transformedData.sortedByArrival = vehicles
    .map(v => ({ id: v.id, minutes: transformedData.schedules.get(v.id)?.minutesUntilArrival || 999 }))
    .sort((a, b) => a.minutes - b.minutes)
    .map(item => item.id);

  transformedData.sortedByPriority = vehicles
    .map(v => ({ id: v.id, priority: transformedData.displayData.get(v.id)?.displayPriority || 0 }))
    .sort((a, b) => b.priority - a.priority)
    .map(item => item.id);

  // Update metadata
  const endTime = Date.now();
  transformedData.metadata = {
    transformedAt: new Date(),
    transformationDuration: endTime - startTime,
    vehiclesProcessed: vehicles.length,
    vehiclesTransformed: vehicles.length,
    vehiclesFailed: 0,
    stepsExecuted: ['normalize', 'enrich', 'analyze', 'display'],
    stepsSkipped: [],
    errors: [],
    warnings: [],
    performance: {
      cacheHits: 0,
      cacheMisses: vehicles.length,
      apiCalls: 1,
      averageProcessingTime: (endTime - startTime) / vehicles.length
    },
    dataSources: {
      realTimeVehicles: transformedData.realTimeVehicles.size,
      scheduledVehicles: transformedData.scheduledVehicles.size,
      cachedVehicles: 0
    },
    contextSnapshot: {
      userLocation: context.userLocation,
      favoriteRoutesCount: context.favoriteRoutes.length,
      targetStationsCount: context.targetStations.length,
      timestamp: new Date()
    }
  };

  return transformedData;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates vehicle data using basic type checking
 */
function validateVehicleData(vehicle: CoreVehicle): { isValid: boolean; errors: Array<{ message: string }> } {
  const errors: Array<{ message: string }> = [];

  if (!vehicle.id || typeof vehicle.id !== 'string') {
    errors.push({ message: 'Vehicle ID is required and must be a string' });
  }

  if (!vehicle.routeId || typeof vehicle.routeId !== 'string') {
    errors.push({ message: 'Route ID is required and must be a string' });
  }

  if (!vehicle.label || typeof vehicle.label !== 'string') {
    errors.push({ message: 'Vehicle label is required and must be a string' });
  }

  if (!vehicle.position || typeof vehicle.position.latitude !== 'number' || typeof vehicle.position.longitude !== 'number') {
    errors.push({ message: 'Valid position coordinates are required' });
  }

  if (!(vehicle.timestamp instanceof Date) || isNaN(vehicle.timestamp.getTime())) {
    errors.push({ message: 'Valid timestamp is required' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Formats a Date object to a time string
 */
function formatTimeFromDate(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Lightens a hex color by a given factor
 */
function lightenColor(color: string, factor: number): string {
  // Simple color lightening - in a real app, you'd use a proper color library
  const hex = color.replace('#', '');
  const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + Math.floor(255 * factor));
  const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + Math.floor(255 * factor));
  const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + Math.floor(255 * factor));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Gets a contrasting color (black or white) for a given background color
 */
function getContrastColor(backgroundColor: string): string {
  // Simple contrast calculation - in a real app, you'd use proper color contrast algorithms
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

// ============================================================================
// BATCH CREATION UTILITIES
// ============================================================================

/**
 * Creates a complete test scenario with vehicles, routes, and stations
 * 
 * @param scenarioConfig - Configuration for the test scenario
 * @returns Complete test scenario data
 */
export function createTestScenario(scenarioConfig: {
  vehicleCount?: number;
  routeCount?: number;
  stationCount?: number;
  includeRealTimeData?: boolean;
  includeDelays?: boolean;
} = {}): {
  vehicles: CoreVehicle[];
  routes: RouteInfo[];
  stations: TransformationStation[];
  schedules: VehicleSchedule[];
  directions: VehicleDirection[];
  displayData: VehicleDisplayData[];
  context: TransformationContext;
  transformedData: TransformedVehicleData;
} {
  const config = {
    vehicleCount: 10,
    routeCount: 3,
    stationCount: 5,
    includeRealTimeData: true,
    includeDelays: true,
    ...scenarioConfig
  };

  // Create stations
  const stations: TransformationStation[] = [];
  for (let i = 0; i < config.stationCount; i++) {
    stations.push({
      id: `station-${i + 1}`,
      name: `Test Station ${i + 1}`,
      coordinates: createValidatedCoordinates(
        46.77 + (i * 0.01), // Spread stations across Cluj
        23.62 + (i * 0.01),
        50
      ),
      routeIds: [`route-${Math.floor(i / 2) + 1}`], // Stations serve multiple routes
      isFavorite: i === 0, // First station is favorite
      accessibility: {
        wheelchairAccessible: true,
        bikeRacks: i % 2 === 0,
        audioAnnouncements: true
      }
    });
  }

  // Create routes
  const routes: RouteInfo[] = [];
  for (let i = 0; i < config.routeCount; i++) {
    routes.push(createRouteInfo({
      routeId: `route-${i + 1}`,
      routeName: `${i + 1}`,
      routeDescription: `Test Route ${i + 1}`,
      stationIds: stations.map(s => s.id),
      routeType: i === 0 ? RouteType.BUS : i === 1 ? RouteType.TRAM : RouteType.TROLLEYBUS
    }));
  }

  // Create vehicles
  const vehicles: CoreVehicle[] = [];
  for (let i = 0; i < config.vehicleCount; i++) {
    const routeIndex = i % config.routeCount;
    vehicles.push(createVehicle({
      id: `vehicle-${i + 1}`,
      routeId: `route-${routeIndex + 1}`,
      label: `${routeIndex + 1}-${Math.floor(i / config.routeCount) + 1}`,
      tripId: `trip-${i + 1}`,
      position: createValidatedCoordinates(
        46.77 + (Math.random() * 0.02),
        23.62 + (Math.random() * 0.02),
        20
      ),
      speed: 20 + Math.random() * 40,
      bearing: Math.random() * 360,
      isWheelchairAccessible: Math.random() > 0.3,
      isBikeAccessible: Math.random() > 0.7
    }));
  }

  // Create schedules
  const schedules: VehicleSchedule[] = vehicles.map((vehicle, index) => {
    const stationIndex = index % stations.length;
    const baseMinutes = 5 + (index * 3); // Stagger arrivals
    const delayMinutes = config.includeDelays && Math.random() > 0.7 ? 
      Math.floor((Math.random() - 0.5) * 10) : undefined; // Random delays

    return createVehicleSchedule({
      vehicleId: vehicle.id,
      tripId: vehicle.tripId!,
      routeId: vehicle.routeId,
      stationId: stations[stationIndex].id,
      scheduledArrival: new Date(Date.now() + baseMinutes * 60 * 1000),
      isRealTime: config.includeRealTimeData && Math.random() > 0.3,
      delayMinutes
    });
  });

  // Create directions
  const directions: VehicleDirection[] = vehicles.map((vehicle, index) => {
    const stationIndex = index % stations.length;
    return createVehicleDirection({
      vehicleId: vehicle.id,
      stationId: stations[stationIndex].id,
      routeId: vehicle.routeId,
      tripId: vehicle.tripId!,
      direction: index % 3 === 0 ? DirectionStatus.ARRIVING : 
                index % 3 === 1 ? DirectionStatus.DEPARTING : DirectionStatus.UNKNOWN,
      estimatedMinutes: 5 + (index * 2)
    });
  });

  // Create display data
  const displayData: VehicleDisplayData[] = vehicles.map((vehicle, index) => 
    createVehicleDisplayData(vehicle, schedules[index])
  );

  // Create context
  const context = createTransformationContextWithDefaults({
    userLocation: createValidatedCoordinates(46.7712, 23.6236, 10),
    favoriteRoutes: ['route-1'],
    targetStations: stations.slice(0, 2) // First two stations as targets
  });

  // Create transformed data
  const transformedData = createTransformedVehicleDataFromVehicles(vehicles, context);

  return {
    vehicles,
    routes,
    stations,
    schedules,
    directions,
    displayData,
    context,
    transformedData
  };
}

// ============================================================================
// EXPORTED FACTORY COLLECTIONS
// ============================================================================

/**
 * Collection of core vehicle factory functions
 */
export const coreVehicleFactories = {
  createVehicle,
  createVehicleBatch,
  createValidatedCoordinates
} as const;

/**
 * Collection of business logic factory functions
 */
export const businessLogicFactories = {
  createVehicleSchedule,
  createVehicleDirection,
  createRouteInfo
} as const;

/**
 * Collection of presentation layer factory functions
 */
export const presentationLayerFactories = {
  createVehicleDisplayData,
  createTransformationContextWithDefaults,
  createTransformedVehicleDataFromVehicles
} as const;

/**
 * Collection of all factory functions
 */
export const allFactories = {
  ...coreVehicleFactories,
  ...businessLogicFactories,
  ...presentationLayerFactories,
  createTestScenario
} as const;