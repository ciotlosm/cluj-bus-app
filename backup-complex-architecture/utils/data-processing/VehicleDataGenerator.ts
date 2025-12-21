/**
 * Vehicle Data Generator for Test Data Creation
 * 
 * This utility provides comprehensive test data generation for all vehicle-related
 * data structures. It supports both deterministic and randomized data generation
 * for testing purposes.
 * 
 * Requirements: 6.2, 6.3
 * 
 * @module VehicleDataGenerator
 */

import * as fc from 'fast-check';
import {
  createCoreVehicle,
  createCoordinates,
  DEFAULT_COORDINATES,
  DirectionStatus,
  ConfidenceLevel,
  RouteType
} from '../../types/coreVehicle';
import {
  createDefaultUserPreferences,
  createDefaultTransformationContext,
  createEmptyTransformedVehicleData
} from '../../types/presentationLayer';
import { TransformationError } from '../../types/transformationPipeline';

import type {
  CoreVehicle,
  Coordinates,
  DirectionStatusValue,
  ConfidenceLevelValue,
  RouteTypeValue
} from '../../types/coreVehicle';
import type {
  VehicleSchedule,
  VehicleDirection,
  RouteInfo,
  EnhancedVehicleWithBusinessLogic
} from '../../types/businessLogic';
import type {
  VehicleDisplayData,
  TransformationContext,
  TransformedVehicleData,
  TransformationStation,
  UserPreferences
} from '../../types/presentationLayer';

// ============================================================================
// GENERATOR CONFIGURATION
// ============================================================================

/**
 * Configuration options for data generation
 */
export interface GeneratorConfig {
  /** Use Cluj-Napoca area coordinates for realistic testing */
  useClujCoordinates?: boolean;
  
  /** Seed for deterministic generation */
  seed?: number;
  
  /** Default agency ID for generated data */
  defaultAgencyId?: string;
  
  /** Default API key for generated contexts */
  defaultApiKey?: string;
  
  /** Time range for generated timestamps (hours from now) */
  timeRangeHours?: number;
  
  /** Maximum number of items in generated arrays */
  maxArraySize?: number;
  
  /** Whether to include optional fields */
  includeOptionalFields?: boolean;
}

/**
 * Default generator configuration
 */
export const DEFAULT_GENERATOR_CONFIG: GeneratorConfig = {
  useClujCoordinates: true,
  defaultAgencyId: 'cluj-transport',
  defaultApiKey: 'test-api-key',
  timeRangeHours: 24,
  maxArraySize: 20,
  includeOptionalFields: true,
};

// ============================================================================
// FAST-CHECK ARBITRARIES
// ============================================================================

/**
 * Generates valid coordinates within Cluj-Napoca area
 */
export const clujCoordinatesArb = fc.record({
  latitude: fc.double({ min: 46.7, max: 46.8, noNaN: true }),
  longitude: fc.double({ min: 23.5, max: 23.7, noNaN: true }),
  accuracy: fc.option(fc.double({ min: 1, max: 100, noNaN: true }))
});

/**
 * Generates global coordinates
 */
export const globalCoordinatesArb = fc.record({
  latitude: fc.double({ min: -90, max: 90, noNaN: true }),
  longitude: fc.double({ min: -180, max: 180, noNaN: true }),
  accuracy: fc.option(fc.double({ min: 1, max: 1000, noNaN: true }))
});

/**
 * Generates vehicle IDs
 */
export const vehicleIdArb = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => s.trim().length > 0)
  .map(s => `vehicle-${s}`);

/**
 * Generates route IDs
 */
export const routeIdArb = fc.oneof(
  fc.integer({ min: 1, max: 999 }).map(n => n.toString()),
  fc.string({ minLength: 1, maxLength: 5 }).map(s => s.toUpperCase())
);

/**
 * Generates trip IDs
 */
export const tripIdArb = fc.string({ minLength: 5, maxLength: 30 })
  .map(s => `trip-${s}`);

/**
 * Generates station IDs
 */
export const stationIdArb = fc.string({ minLength: 1, maxLength: 20 })
  .map(s => `station-${s}`);

/**
 * Generates vehicle labels
 */
export const vehicleLabelArb = fc.oneof(
  fc.integer({ min: 1, max: 9999 }).map(n => n.toString()),
  fc.string({ minLength: 1, maxLength: 8 }).filter(s => s.trim().length > 0).map(s => s.toUpperCase())
);

/**
 * Generates recent timestamps
 */
export const recentTimestampArb = fc.integer({ min: -3600000, max: 0 })
  .map(offset => new Date(Date.now() + offset));

/**
 * Generates future timestamps
 */
export const futureTimestampArb = fc.integer({ min: 0, max: 7200000 })
  .map(offset => new Date(Date.now() + offset));

/**
 * Generates CoreVehicle objects
 */
export const coreVehicleArb = (config: GeneratorConfig = DEFAULT_GENERATOR_CONFIG) =>
  fc.record({
    id: vehicleIdArb,
    routeId: routeIdArb,
    tripId: config.includeOptionalFields ? fc.option(tripIdArb) : fc.constant(undefined),
    label: vehicleLabelArb,
    position: config.useClujCoordinates ? clujCoordinatesArb : globalCoordinatesArb,
    timestamp: recentTimestampArb,
    speed: config.includeOptionalFields ? fc.option(fc.float({ min: 0, max: 80, noNaN: true })) : fc.constant(undefined),
    bearing: config.includeOptionalFields ? fc.option(fc.float({ min: 0, max: 360, noNaN: true })) : fc.constant(undefined),
    isWheelchairAccessible: fc.boolean(),
    isBikeAccessible: fc.boolean()
  });

/**
 * Generates VehicleSchedule objects
 */
export const vehicleScheduleArb = fc.record({
  vehicleId: vehicleIdArb,
  tripId: tripIdArb,
  routeId: routeIdArb,
  stationId: stationIdArb,
  scheduledArrival: futureTimestampArb,
  scheduledDeparture: fc.option(futureTimestampArb),
  estimatedArrival: fc.option(futureTimestampArb),
  estimatedDeparture: fc.option(futureTimestampArb),
  actualArrival: fc.option(recentTimestampArb),
  actualDeparture: fc.option(recentTimestampArb),
  minutesUntilArrival: fc.integer({ min: 0, max: 120 }),
  isRealTime: fc.boolean(),
  isScheduled: fc.boolean(),
  confidence: fc.constantFrom(...Object.values(ConfidenceLevel)),
  stopSequence: fc.integer({ min: 1, max: 50 }),
  isFinalStop: fc.boolean(),
  delayMinutes: fc.option(fc.integer({ min: -10, max: 30 })),
  lastUpdated: recentTimestampArb
});

/**
 * Generates VehicleDirection objects
 */
export const vehicleDirectionArb = fc.record({
  vehicleId: vehicleIdArb,
  stationId: stationIdArb,
  routeId: routeIdArb,
  tripId: tripIdArb,
  direction: fc.constantFrom(...Object.values(DirectionStatus)),
  estimatedMinutes: fc.integer({ min: 0, max: 60 }),
  confidence: fc.constantFrom(...Object.values(ConfidenceLevel)),
  distanceToStation: fc.option(fc.float({ min: 0, max: 5000, noNaN: true })),
  bearing: fc.option(fc.float({ min: 0, max: 360, noNaN: true })),
  speed: fc.option(fc.float({ min: 0, max: 80, noNaN: true })),
  isAtStation: fc.boolean(),
  stopSequence: fc.option(fc.array(fc.record({
    stopId: stationIdArb,
    stopName: fc.string({ minLength: 5, maxLength: 50 }),
    sequence: fc.integer({ min: 1, max: 50 }),
    isCurrent: fc.boolean(),
    isDestination: fc.boolean(),
    estimatedArrival: fc.option(futureTimestampArb)
  }), { maxLength: 10 })),
  analyzedAt: recentTimestampArb,
  nextStationId: fc.option(stationIdArb),
  previousStationId: fc.option(stationIdArb)
});

/**
 * Generates RouteInfo objects
 */
export const routeInfoArb = (config: GeneratorConfig = DEFAULT_GENERATOR_CONFIG) =>
  fc.record({
    routeId: routeIdArb,
    agencyId: fc.constant(config.defaultAgencyId || 'test-agency'),
    routeName: fc.string({ minLength: 1, maxLength: 10 }),
    routeDescription: fc.string({ minLength: 10, maxLength: 100 }),
    routeShortName: fc.option(fc.string({ minLength: 1, maxLength: 5 })),
    routeType: fc.constantFrom(...Object.values(RouteType)),
    routeColor: fc.option(fc.constantFrom('#FF0000', '#00FF00', '#0000FF', '#FFFF00')),
    routeTextColor: fc.option(fc.constantFrom('#FFFFFF', '#000000')),
    routeUrl: fc.option(fc.webUrl()),
    stationIds: fc.array(stationIdArb, { minLength: 2, maxLength: 20 }),
    tripIds: fc.array(tripIdArb, { minLength: 1, maxLength: 10 }),
    directions: fc.array(fc.record({
      directionId: fc.string({ minLength: 1, maxLength: 10 }),
      directionName: fc.constantFrom('Inbound', 'Outbound', 'Clockwise', 'Counter-clockwise'),
      destination: fc.string({ minLength: 5, maxLength: 50 }),
      stationSequence: fc.array(stationIdArb, { minLength: 2, maxLength: 15 })
    }), { minLength: 1, maxLength: 2 }),
    schedule: fc.option(fc.record({
      operatingDays: fc.array(fc.constantFrom('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'), { minLength: 1, maxLength: 7 }),
      firstDeparture: fc.string().map(() => '05:30:00'),
      lastDeparture: fc.string().map(() => '23:30:00'),
      frequencyMinutes: fc.option(fc.integer({ min: 5, max: 60 }))
    })),
    isActive: fc.boolean(),
    operatesWeekends: fc.boolean(),
    operatesHolidays: fc.boolean(),
    accessibility: fc.record({
      wheelchairAccessible: fc.boolean(),
      bikeAccessible: fc.boolean(),
      audioAnnouncements: fc.boolean()
    }),
    statistics: fc.option(fc.record({
      totalLength: fc.float({ min: 1, max: 50, noNaN: true }),
      averageTripDuration: fc.integer({ min: 15, max: 120 }),
      stopCount: fc.integer({ min: 5, max: 50 }),
      dailyTripCount: fc.integer({ min: 10, max: 200 })
    })),
    lastUpdated: recentTimestampArb
  });

// ============================================================================
// VEHICLE DATA GENERATOR CLASS
// ============================================================================

/**
 * Comprehensive vehicle data generator for testing
 * 
 * Provides both deterministic and randomized data generation for all
 * vehicle-related data structures in the application.
 */
export class VehicleDataGenerator {
  private config: GeneratorConfig;

  constructor(config: Partial<GeneratorConfig> = {}) {
    this.config = { ...DEFAULT_GENERATOR_CONFIG, ...config };
  }

  // ========================================================================
  // CORE VEHICLE DATA GENERATION
  // ========================================================================

  /**
   * Generates a single CoreVehicle with optional overrides
   */
  generateCoreVehicle(overrides: Partial<CoreVehicle> = {}): CoreVehicle {
    const base: CoreVehicle = {
      id: `vehicle-${Math.random().toString(36).substr(2, 9)}`,
      routeId: Math.floor(Math.random() * 100).toString(),
      tripId: this.config.includeOptionalFields ? `trip-${Math.random().toString(36).substr(2, 9)}` : undefined,
      label: Math.floor(Math.random() * 9999).toString(),
      position: this.generateCoordinates(),
      timestamp: new Date(Date.now() - Math.random() * 3600000),
      speed: this.config.includeOptionalFields ? Math.random() * 60 : undefined,
      bearing: this.config.includeOptionalFields ? Math.random() * 360 : undefined,
      isWheelchairAccessible: Math.random() > 0.5,
      isBikeAccessible: Math.random() > 0.7
    };

    return { ...base, ...overrides };
  }

  /**
   * Generates an array of CoreVehicle objects
   */
  generateCoreVehicles(count: number = 5): CoreVehicle[] {
    return Array.from({ length: count }, () => this.generateCoreVehicle());
  }

  /**
   * Generates coordinates based on configuration
   */
  generateCoordinates(overrides: Partial<Coordinates> = {}): Coordinates {
    const base = this.config.useClujCoordinates
      ? {
          latitude: 46.7 + Math.random() * 0.1,
          longitude: 23.5 + Math.random() * 0.2,
          accuracy: this.config.includeOptionalFields ? Math.random() * 100 : undefined
        }
      : {
          latitude: (Math.random() - 0.5) * 180,
          longitude: (Math.random() - 0.5) * 360,
          accuracy: this.config.includeOptionalFields ? Math.random() * 1000 : undefined
        };

    return { ...base, ...overrides };
  }

  // ========================================================================
  // BUSINESS LOGIC DATA GENERATION
  // ========================================================================

  /**
   * Generates a VehicleSchedule with optional overrides
   */
  generateVehicleSchedule(overrides: Partial<VehicleSchedule> = {}): VehicleSchedule {
    const now = new Date();
    const scheduledArrival = new Date(now.getTime() + Math.random() * 7200000); // 0-2 hours from now
    
    const base: VehicleSchedule = {
      vehicleId: `vehicle-${Math.random().toString(36).substr(2, 9)}`,
      tripId: `trip-${Math.random().toString(36).substr(2, 9)}`,
      routeId: Math.floor(Math.random() * 100).toString(),
      stationId: `station-${Math.random().toString(36).substr(2, 9)}`,
      scheduledArrival,
      scheduledDeparture: new Date(scheduledArrival.getTime() + 30000), // 30 seconds later
      estimatedArrival: Math.random() > 0.3 ? new Date(scheduledArrival.getTime() + (Math.random() - 0.5) * 600000) : undefined,
      estimatedDeparture: undefined,
      actualArrival: undefined,
      actualDeparture: undefined,
      minutesUntilArrival: Math.floor((scheduledArrival.getTime() - now.getTime()) / 60000),
      isRealTime: Math.random() > 0.4,
      isScheduled: true,
      confidence: Object.values(ConfidenceLevel)[Math.floor(Math.random() * Object.values(ConfidenceLevel).length)],
      stopSequence: Math.floor(Math.random() * 30) + 1,
      isFinalStop: Math.random() > 0.8,
      delayMinutes: Math.random() > 0.6 ? Math.floor((Math.random() - 0.5) * 20) : undefined,
      lastUpdated: new Date(now.getTime() - Math.random() * 300000) // 0-5 minutes ago
    };

    return { ...base, ...overrides };
  }

  /**
   * Generates a VehicleDirection with optional overrides
   */
  generateVehicleDirection(overrides: Partial<VehicleDirection> = {}): VehicleDirection {
    const base: VehicleDirection = {
      vehicleId: `vehicle-${Math.random().toString(36).substr(2, 9)}`,
      stationId: `station-${Math.random().toString(36).substr(2, 9)}`,
      routeId: Math.floor(Math.random() * 100).toString(),
      tripId: `trip-${Math.random().toString(36).substr(2, 9)}`,
      direction: Object.values(DirectionStatus)[Math.floor(Math.random() * Object.values(DirectionStatus).length)],
      estimatedMinutes: Math.floor(Math.random() * 60),
      confidence: Object.values(ConfidenceLevel)[Math.floor(Math.random() * Object.values(ConfidenceLevel).length)],
      distanceToStation: this.config.includeOptionalFields ? Math.random() * 2000 : undefined,
      bearing: this.config.includeOptionalFields ? Math.random() * 360 : undefined,
      speed: this.config.includeOptionalFields ? Math.random() * 60 : undefined,
      isAtStation: Math.random() > 0.8,
      stopSequence: this.config.includeOptionalFields ? this.generateStopSequence() : undefined,
      analyzedAt: new Date(),
      nextStationId: this.config.includeOptionalFields ? `station-${Math.random().toString(36).substr(2, 9)}` : undefined,
      previousStationId: this.config.includeOptionalFields ? `station-${Math.random().toString(36).substr(2, 9)}` : undefined
    };

    return { ...base, ...overrides };
  }

  /**
   * Generates a RouteInfo with optional overrides
   */
  generateRouteInfo(overrides: Partial<RouteInfo> = {}): RouteInfo {
    const routeId = Math.floor(Math.random() * 100).toString();
    
    const base: RouteInfo = {
      routeId,
      agencyId: this.config.defaultAgencyId || 'test-agency',
      routeName: routeId,
      routeDescription: `Route ${routeId} - Test Route`,
      routeShortName: routeId,
      routeType: Object.values(RouteType)[Math.floor(Math.random() * Object.values(RouteType).length)],
      routeColor: this.config.includeOptionalFields ? '#FF0000' : undefined,
      routeTextColor: this.config.includeOptionalFields ? '#FFFFFF' : undefined,
      routeUrl: this.config.includeOptionalFields ? `https://example.com/route/${routeId}` : undefined,
      stationIds: Array.from({ length: Math.floor(Math.random() * 15) + 5 }, () => 
        `station-${Math.random().toString(36).substr(2, 9)}`
      ),
      tripIds: Array.from({ length: Math.floor(Math.random() * 8) + 2 }, () => 
        `trip-${Math.random().toString(36).substr(2, 9)}`
      ),
      directions: [
        {
          directionId: 'inbound',
          directionName: 'Inbound',
          destination: 'City Center',
          stationSequence: Array.from({ length: 10 }, () => `station-${Math.random().toString(36).substr(2, 9)}`)
        },
        {
          directionId: 'outbound',
          directionName: 'Outbound',
          destination: 'Suburbs',
          stationSequence: Array.from({ length: 10 }, () => `station-${Math.random().toString(36).substr(2, 9)}`)
        }
      ],
      schedule: this.config.includeOptionalFields ? {
        operatingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        firstDeparture: '05:30:00',
        lastDeparture: '23:30:00',
        frequencyMinutes: 15
      } : undefined,
      isActive: Math.random() > 0.1, // 90% chance of being active
      operatesWeekends: Math.random() > 0.3,
      operatesHolidays: Math.random() > 0.7,
      accessibility: {
        wheelchairAccessible: Math.random() > 0.2,
        bikeAccessible: Math.random() > 0.5,
        audioAnnouncements: Math.random() > 0.4
      },
      statistics: this.config.includeOptionalFields ? {
        totalLength: Math.random() * 30 + 5,
        averageTripDuration: Math.floor(Math.random() * 60) + 30,
        stopCount: Math.floor(Math.random() * 30) + 10,
        dailyTripCount: Math.floor(Math.random() * 100) + 50
      } : undefined,
      lastUpdated: new Date()
    };

    return { ...base, ...overrides };
  }

  // ========================================================================
  // PRESENTATION LAYER DATA GENERATION
  // ========================================================================

  /**
   * Generates a VehicleDisplayData with optional overrides
   */
  generateVehicleDisplayData(overrides: Partial<VehicleDisplayData> = {}): VehicleDisplayData {
    const vehicleId = `vehicle-${Math.random().toString(36).substr(2, 9)}`;
    const routeName = Math.floor(Math.random() * 100).toString();
    const minutesAway = Math.floor(Math.random() * 60);
    
    const base: VehicleDisplayData = {
      vehicleId,
      displayName: `Route ${routeName}`,
      routeName: `Route ${routeName}`,
      routeShortName: routeName,
      vehicleLabel: Math.floor(Math.random() * 9999).toString(),
      destination: 'Test Destination',
      arrivalText: minutesAway === 0 ? 'Now' : `${minutesAway} min`,
      departureText: this.config.includeOptionalFields ? `${minutesAway + 1} min` : undefined,
      statusColor: '#4caf50',
      backgroundColor: '#ffffff',
      textColor: '#000000',
      confidenceIndicator: Math.random() > 0.5 ? 'Real-time' : 'Scheduled',
      isRealTime: Math.random() > 0.4,
      isScheduled: true,
      isDelayed: Math.random() > 0.7,
      isEarly: Math.random() > 0.9,
      isWheelchairAccessible: Math.random() > 0.3,
      isBikeAccessible: Math.random() > 0.6,
      distanceText: this.config.includeOptionalFields ? `${(Math.random() * 2).toFixed(1)} km` : undefined,
      walkingTimeText: this.config.includeOptionalFields ? `${Math.floor(Math.random() * 15) + 1} min walk` : undefined,
      directionText: this.config.includeOptionalFields ? 'Towards city center' : undefined,
      statusMessages: [],
      warningMessages: [],
      errorMessages: [],
      iconName: 'directions_bus',
      displayPriority: Math.floor(Math.random() * 100),
      isHighlighted: Math.random() > 0.8,
      isFavorite: Math.random() > 0.7,
      delayText: this.config.includeOptionalFields && Math.random() > 0.6 ? `+${Math.floor(Math.random() * 10)} min` : undefined,
      confidenceText: Math.random() > 0.5 ? 'High confidence' : 'Medium confidence',
      accessibilityIndicators: {
        wheelchair: Math.random() > 0.3,
        bike: Math.random() > 0.6,
        audio: Math.random() > 0.5
      },
      routeColor: {
        primary: '#FF0000',
        secondary: '#FFCCCC',
        text: '#FFFFFF'
      },
      animationState: 'stable' as const,
      lastUpdated: new Date()
    };

    return { ...base, ...overrides };
  }

  /**
   * Generates a TransformationContext with optional overrides
   */
  generateTransformationContext(overrides: Partial<TransformationContext> = {}): TransformationContext {
    const base = createDefaultTransformationContext(
      this.config.defaultApiKey || 'test-api-key',
      this.config.defaultAgencyId || 'test-agency'
    );

    const enhanced: TransformationContext = {
      ...base,
      userLocation: this.config.includeOptionalFields ? this.generateCoordinates() : undefined,
      homeLocation: this.config.includeOptionalFields ? this.generateCoordinates() : undefined,
      workLocation: this.config.includeOptionalFields ? this.generateCoordinates() : undefined,
      favoriteRoutes: Array.from({ length: Math.floor(Math.random() * 5) }, () => 
        Math.floor(Math.random() * 100).toString()
      ),
      targetStations: Array.from({ length: Math.floor(Math.random() * 3) }, () => 
        this.generateTransformationStation()
      ),
      ...overrides
    };

    return enhanced;
  }

  /**
   * Generates a TransformedVehicleData with optional overrides
   */
  generateTransformedVehicleData(vehicleCount: number = 5): TransformedVehicleData {
    const vehicles = this.generateCoreVehicles(vehicleCount);
    const result = createEmptyTransformedVehicleData();

    // Populate with generated data
    vehicles.forEach(vehicle => {
      result.vehicles.set(vehicle.id, vehicle);
      result.schedules.set(vehicle.id, this.generateVehicleSchedule({ vehicleId: vehicle.id }));
      result.directions.set(vehicle.id, this.generateVehicleDirection({ vehicleId: vehicle.id }));
      result.displayData.set(vehicle.id, this.generateVehicleDisplayData({ vehicleId: vehicle.id }));
      
      // Group by route
      if (!result.vehiclesByRoute.has(vehicle.routeId)) {
        result.vehiclesByRoute.set(vehicle.routeId, []);
      }
      result.vehiclesByRoute.get(vehicle.routeId)!.push(vehicle.id);
      
      // Add to sets
      if (Math.random() > 0.6) result.realTimeVehicles.add(vehicle.id);
      if (Math.random() > 0.8) result.favoriteVehicles.add(vehicle.id);
    });

    // Update metadata
    result.metadata.vehiclesProcessed = vehicleCount;
    result.metadata.vehiclesTransformed = vehicleCount;
    result.metadata.transformationDuration = Math.random() * 1000;

    return result;
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  /**
   * Generates a stop sequence for vehicle directions
   */
  private generateStopSequence() {
    const count = Math.floor(Math.random() * 8) + 2;
    return Array.from({ length: count }, (_, index) => ({
      stopId: `station-${Math.random().toString(36).substr(2, 9)}`,
      stopName: `Stop ${index + 1}`,
      sequence: index + 1,
      isCurrent: index === Math.floor(count / 2),
      isDestination: index === count - 1,
      estimatedArrival: new Date(Date.now() + (index + 1) * 300000) // 5 minutes apart
    }));
  }

  /**
   * Generates a TransformationStation
   */
  private generateTransformationStation(): TransformationStation {
    return {
      id: `station-${Math.random().toString(36).substr(2, 9)}`,
      name: `Test Station ${Math.floor(Math.random() * 100)}`,
      coordinates: this.generateCoordinates(),
      routeIds: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, () => 
        Math.floor(Math.random() * 100).toString()
      ),
      isFavorite: Math.random() > 0.7,
      accessibility: {
        wheelchairAccessible: Math.random() > 0.3,
        bikeRacks: Math.random() > 0.5,
        audioAnnouncements: Math.random() > 0.4
      }
    };
  }

  // ========================================================================
  // FAST-CHECK INTEGRATION
  // ========================================================================

  /**
   * Returns fast-check arbitrary for CoreVehicle
   */
  getCoreVehicleArbitrary() {
    return coreVehicleArb(this.config);
  }

  /**
   * Returns fast-check arbitrary for VehicleSchedule
   */
  getVehicleScheduleArbitrary() {
    return vehicleScheduleArb;
  }

  /**
   * Returns fast-check arbitrary for VehicleDirection
   */
  getVehicleDirectionArbitrary() {
    return vehicleDirectionArb;
  }

  /**
   * Returns fast-check arbitrary for RouteInfo
   */
  getRouteInfoArbitrary() {
    return routeInfoArb(this.config);
  }

  /**
   * Generates test data using fast-check
   */
  generateWithFastCheck<T>(arbitrary: fc.Arbitrary<T>, count: number = 1): T[] {
    return fc.sample(arbitrary, count);
  }

  // ========================================================================
  // ERROR GENERATION
  // ========================================================================

  /**
   * Generates TransformationError for testing error handling
   */
  generateTransformationError(overrides: Partial<{
    message: string;
    step: string;
    vehicleId: string;
    recoverable: boolean;
    context: Record<string, any>;
  }> = {}): TransformationError {
    const base = {
      message: 'Test transformation error',
      step: 'test-step',
      vehicleId: `vehicle-${Math.random().toString(36).substr(2, 9)}`,
      recoverable: Math.random() > 0.5,
      context: { testData: true }
    };

    const config = { ...base, ...overrides };
    
    return new TransformationError(
      config.message,
      config.step,
      {
        vehicleId: config.vehicleId,
        recoverable: config.recoverable,
        context: config.context
      }
    );
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Creates a default VehicleDataGenerator instance
 */
export function createVehicleDataGenerator(config?: Partial<GeneratorConfig>): VehicleDataGenerator {
  return new VehicleDataGenerator(config);
}

/**
 * Generates a single CoreVehicle with default configuration
 */
export function generateCoreVehicle(overrides?: Partial<CoreVehicle>): CoreVehicle {
  const generator = new VehicleDataGenerator();
  return generator.generateCoreVehicle(overrides);
}

/**
 * Generates multiple CoreVehicles with default configuration
 */
export function generateCoreVehicles(count: number = 5): CoreVehicle[] {
  const generator = new VehicleDataGenerator();
  return generator.generateCoreVehicles(count);
}

/**
 * Generates a complete test dataset for integration testing
 */
export function generateCompleteTestDataset(vehicleCount: number = 10): {
  vehicles: CoreVehicle[];
  schedules: VehicleSchedule[];
  directions: VehicleDirection[];
  routes: RouteInfo[];
  displayData: VehicleDisplayData[];
  context: TransformationContext;
  transformedData: TransformedVehicleData;
} {
  const generator = new VehicleDataGenerator();
  
  const vehicles = generator.generateCoreVehicles(vehicleCount);
  const schedules = vehicles.map(v => generator.generateVehicleSchedule({ vehicleId: v.id }));
  const directions = vehicles.map(v => generator.generateVehicleDirection({ vehicleId: v.id }));
  const routes = Array.from(new Set(vehicles.map(v => v.routeId)))
    .map(routeId => generator.generateRouteInfo({ routeId }));
  const displayData = vehicles.map(v => generator.generateVehicleDisplayData({ vehicleId: v.id }));
  const context = generator.generateTransformationContext();
  const transformedData = generator.generateTransformedVehicleData(vehicleCount);

  return {
    vehicles,
    schedules,
    directions,
    routes,
    displayData,
    context,
    transformedData
  };
}