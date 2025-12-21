/**
 * Developer Experience Utilities Tests
 * 
 * Comprehensive tests for all developer experience utilities including
 * data generation, type guards, validation, and factory functions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  // Generator
  VehicleDataGenerator,
  createVehicleDataGenerator,
  generateCoreVehicle,
  generateCoreVehicles,
  generateCompleteTestDataset,
  // Type Guards
  isVehicleSchedule,
  isVehicleDirection,
  isRouteInfo,
  validateCoreVehicle,
  validateVehicleSchedule,
  validateTransformedVehicleData,
  // Factories
  createVehicle,
  createVehicleSchedule,
  createVehicleDirection,
  createRouteInfo,
  createVehicleDisplayData,
  createTestScenario,
  // Convenience utilities
  quickValidate,
  assertType,
  safeGet,
  filterWithValidation,
  mapWithValidation,
  validateAndTransform,
  // Type guards from core types
  isCoreVehicle,
  isCoordinates,
  isTransformationContext
} from './developerExperience';
import {
  CoreVehicle,
  DirectionStatus,
  ConfidenceLevel,
  RouteType
} from '../types/coreVehicle';
import {
  VehicleSchedule,
  VehicleDirection,
  RouteInfo
} from '../types/businessLogic';
import {
  TransformedVehicleData
} from '../types/presentationLayer';

describe('VehicleDataGenerator', () => {
  let generator: VehicleDataGenerator;

  beforeEach(() => {
    generator = new VehicleDataGenerator({
      useClujCoordinates: true,
      includeOptionalFields: true
    });
  });

  describe('Core Vehicle Generation', () => {
    it('should generate a valid CoreVehicle', () => {
      const vehicle = generator.generateCoreVehicle();
      
      expect(vehicle).toBeDefined();
      expect(typeof vehicle.id).toBe('string');
      expect(typeof vehicle.routeId).toBe('string');
      expect(typeof vehicle.label).toBe('string');
      expect(vehicle.position).toBeDefined();
      expect(vehicle.timestamp).toBeInstanceOf(Date);
      expect(typeof vehicle.isWheelchairAccessible).toBe('boolean');
      expect(typeof vehicle.isBikeAccessible).toBe('boolean');
      
      // Validate using type guard
      expect(isCoreVehicle(vehicle)).toBe(true);
    });

    it('should generate multiple vehicles', () => {
      const vehicles = generator.generateCoreVehicles(5);
      
      expect(vehicles).toHaveLength(5);
      vehicles.forEach(vehicle => {
        expect(isCoreVehicle(vehicle)).toBe(true);
      });
    });

    it('should respect overrides', () => {
      const vehicle = generator.generateCoreVehicle({
        id: 'test-vehicle',
        routeId: 'test-route'
      });
      
      expect(vehicle.id).toBe('test-vehicle');
      expect(vehicle.routeId).toBe('test-route');
    });

    it('should generate Cluj coordinates when configured', () => {
      const vehicle = generator.generateCoreVehicle();
      
      expect(vehicle.position.latitude).toBeGreaterThanOrEqual(46.7);
      expect(vehicle.position.latitude).toBeLessThanOrEqual(46.8);
      expect(vehicle.position.longitude).toBeGreaterThanOrEqual(23.5);
      expect(vehicle.position.longitude).toBeLessThanOrEqual(23.7);
    });
  });

  describe('Business Logic Generation', () => {
    it('should generate a valid VehicleSchedule', () => {
      const schedule = generator.generateVehicleSchedule();
      
      expect(isVehicleSchedule(schedule)).toBe(true);
      expect(typeof schedule.vehicleId).toBe('string');
      expect(typeof schedule.tripId).toBe('string');
      expect(typeof schedule.routeId).toBe('string');
      expect(typeof schedule.stationId).toBe('string');
      expect(schedule.scheduledArrival).toBeInstanceOf(Date);
      expect(typeof schedule.minutesUntilArrival).toBe('number');
    });

    it('should generate a valid VehicleDirection', () => {
      const direction = generator.generateVehicleDirection();
      
      expect(isVehicleDirection(direction)).toBe(true);
      expect(typeof direction.vehicleId).toBe('string');
      expect(typeof direction.stationId).toBe('string');
      expect(Object.values(DirectionStatus)).toContain(direction.direction);
      expect(Object.values(ConfidenceLevel)).toContain(direction.confidence);
    });

    it('should generate a valid RouteInfo', () => {
      const route = generator.generateRouteInfo();
      
      expect(isRouteInfo(route)).toBe(true);
      expect(typeof route.routeId).toBe('string');
      expect(typeof route.agencyId).toBe('string');
      expect(typeof route.routeName).toBe('string');
      expect(Object.values(RouteType)).toContain(route.routeType);
    });
  });

  describe('Complete Dataset Generation', () => {
    it('should generate a complete test dataset', () => {
      const dataset = generateCompleteTestDataset(5);
      
      expect(dataset.vehicles).toHaveLength(5);
      expect(dataset.schedules).toHaveLength(5);
      expect(dataset.directions).toHaveLength(5);
      expect(dataset.displayData).toHaveLength(5);
      expect(dataset.context).toBeDefined();
      expect(dataset.transformedData).toBeDefined();
      
      // Validate all vehicles
      dataset.vehicles.forEach(vehicle => {
        expect(isCoreVehicle(vehicle)).toBe(true);
      });
    });
  });

  describe('Fast-check Integration', () => {
    it('should work with fast-check property testing', () => {
      fc.assert(
        fc.property(generator.getCoreVehicleArbitrary(), (vehicle) => {
          return isCoreVehicle(vehicle);
        }),
        { numRuns: 50 }
      );
    });
  });
});

describe('Type Guards and Validation', () => {
  describe('Basic Type Guards', () => {
    it('should validate CoreVehicle correctly', () => {
      const validVehicle: CoreVehicle = {
        id: 'test-vehicle',
        routeId: 'test-route',
        label: 'Test',
        position: { latitude: 46.77, longitude: 23.62 },
        timestamp: new Date(),
        isWheelchairAccessible: true,
        isBikeAccessible: false
      };
      
      expect(isCoreVehicle(validVehicle)).toBe(true);
      expect(isCoreVehicle({})).toBe(false);
      expect(isCoreVehicle(null)).toBe(false);
      expect(isCoreVehicle('not an object')).toBe(false);
    });

    it('should validate coordinates correctly', () => {
      expect(isCoordinates({ latitude: 46.77, longitude: 23.62 })).toBe(true);
      expect(isCoordinates({ latitude: 91, longitude: 23.62 })).toBe(false);
      expect(isCoordinates({ latitude: 46.77, longitude: 181 })).toBe(false);
      expect(isCoordinates({})).toBe(false);
    });
  });

  describe('Detailed Validation', () => {
    it('should provide detailed validation results', () => {
      const validVehicle: CoreVehicle = {
        id: 'test-vehicle',
        routeId: 'test-route',
        label: 'Test',
        position: { latitude: 46.77, longitude: 23.62 },
        timestamp: new Date(),
        isWheelchairAccessible: true,
        isBikeAccessible: false
      };
      
      const result = validateCoreVehicle(validVehicle);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data).toEqual(validVehicle);
      expect(result.summary.validFields).toBeGreaterThan(0);
    });

    it('should detect validation errors', () => {
      const invalidVehicle = {
        id: '', // Invalid: empty string
        routeId: 'test-route',
        // Missing required fields
        position: { latitude: 91, longitude: 23.62 }, // Invalid coordinates
        timestamp: 'not a date', // Invalid type
        isWheelchairAccessible: 'not a boolean' // Invalid type
      };
      
      const result = validateCoreVehicle(invalidVehicle);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.data).toBeUndefined();
    });

    it('should collect warnings for suspicious values', () => {
      const vehicleWithWarnings: CoreVehicle = {
        id: 'test-vehicle',
        routeId: 'test-route',
        label: 'Test',
        position: { latitude: 46.77, longitude: 23.62 },
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        speed: 150, // Suspiciously high speed
        isWheelchairAccessible: true,
        isBikeAccessible: false
      };
      
      const result = validateCoreVehicle(vehicleWithWarnings, {
        collectWarnings: true
      });
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});

describe('Factory Functions', () => {
  describe('Core Vehicle Factory', () => {
    it('should create a valid vehicle with minimal data', () => {
      const vehicle = createVehicle({
        id: 'test-vehicle',
        routeId: 'test-route',
        label: 'Test'
      });
      
      expect(isCoreVehicle(vehicle)).toBe(true);
      expect(vehicle.id).toBe('test-vehicle');
      expect(vehicle.routeId).toBe('test-route');
      expect(vehicle.label).toBe('Test');
      expect(vehicle.position).toBeDefined();
      expect(vehicle.timestamp).toBeInstanceOf(Date);
    });

    it('should respect provided overrides', () => {
      const customPosition = { latitude: 40.7128, longitude: -74.0060 };
      const customTimestamp = new Date('2023-01-01');
      
      const vehicle = createVehicle({
        id: 'test-vehicle',
        routeId: 'test-route',
        label: 'Test',
        position: customPosition,
        timestamp: customTimestamp,
        speed: 25,
        isWheelchairAccessible: false
      });
      
      expect(vehicle.position).toEqual(customPosition);
      expect(vehicle.timestamp).toEqual(customTimestamp);
      expect(vehicle.speed).toBe(25);
      expect(vehicle.isWheelchairAccessible).toBe(false);
    });

    it('should throw error for invalid data when validation is enabled', () => {
      expect(() => {
        createVehicle({
          id: '', // Invalid
          routeId: 'test-route',
          label: 'Test'
        }, { validateCreatedObjects: true });
      }).toThrow();
    });
  });

  describe('Business Logic Factories', () => {
    it('should create a valid vehicle schedule', () => {
      const schedule = createVehicleSchedule({
        vehicleId: 'test-vehicle',
        tripId: 'test-trip',
        routeId: 'test-route',
        stationId: 'test-station'
      });
      
      expect(isVehicleSchedule(schedule)).toBe(true);
      expect(schedule.vehicleId).toBe('test-vehicle');
      expect(schedule.tripId).toBe('test-trip');
      expect(schedule.routeId).toBe('test-route');
      expect(schedule.stationId).toBe('test-station');
    });

    it('should create a valid vehicle direction', () => {
      const direction = createVehicleDirection({
        vehicleId: 'test-vehicle',
        stationId: 'test-station',
        routeId: 'test-route',
        tripId: 'test-trip'
      });
      
      expect(isVehicleDirection(direction)).toBe(true);
      expect(direction.vehicleId).toBe('test-vehicle');
      expect(direction.stationId).toBe('test-station');
    });

    it('should create a valid route info', () => {
      const route = createRouteInfo({
        routeId: 'test-route',
        routeName: 'Test Route'
      });
      
      expect(isRouteInfo(route)).toBe(true);
      expect(route.routeId).toBe('test-route');
      expect(route.routeName).toBe('Test Route');
    });
  });

  describe('Test Scenario Factory', () => {
    it('should create a complete test scenario', () => {
      const scenario = createTestScenario({
        vehicleCount: 5,
        routeCount: 2,
        stationCount: 3
      });
      
      expect(scenario.vehicles).toHaveLength(5);
      expect(scenario.routes).toHaveLength(2);
      expect(scenario.stations).toHaveLength(3);
      expect(scenario.schedules).toHaveLength(5);
      expect(scenario.directions).toHaveLength(5);
      expect(scenario.displayData).toHaveLength(5);
      expect(isTransformationContext(scenario.context)).toBe(true);
      
      // Validate all generated data
      scenario.vehicles.forEach(vehicle => {
        expect(isCoreVehicle(vehicle)).toBe(true);
      });
      
      scenario.schedules.forEach(schedule => {
        expect(isVehicleSchedule(schedule)).toBe(true);
      });
    });
  });
});

describe('Convenience Utilities', () => {
  describe('quickValidate', () => {
    it('should return boolean validation result', () => {
      const validVehicle = generateCoreVehicle();
      const invalidData = { not: 'a vehicle' };
      
      expect(quickValidate(validVehicle, isCoreVehicle)).toBe(true);
      expect(quickValidate(invalidData, isCoreVehicle)).toBe(false);
    });

    it('should handle validation errors gracefully', () => {
      const throwingValidator = () => {
        throw new Error('Validation error');
      };
      
      expect(quickValidate({}, throwingValidator)).toBe(false);
    });
  });

  describe('assertType', () => {
    it('should return validated data for valid input', () => {
      const vehicle = generateCoreVehicle();
      const result = assertType(vehicle, isCoreVehicle);
      
      expect(result).toEqual(vehicle);
    });

    it('should throw error for invalid input', () => {
      const invalidData = { not: 'a vehicle' };
      
      expect(() => {
        assertType(invalidData, isCoreVehicle);
      }).toThrow();
    });

    it('should use custom error message', () => {
      const invalidData = { not: 'a vehicle' };
      const customMessage = 'Custom validation error';
      
      expect(() => {
        assertType(invalidData, isCoreVehicle, customMessage);
      }).toThrow(customMessage);
    });
  });

  describe('safeGet', () => {
    it('should return validated value from map', () => {
      const vehicle = generateCoreVehicle();
      const map = new Map([['test-key', vehicle]]);
      
      const result = safeGet(map, 'test-key', isCoreVehicle);
      
      expect(result).toEqual(vehicle);
    });

    it('should return undefined for invalid value', () => {
      const map = new Map([['test-key', { not: 'a vehicle' }]]);
      
      const result = safeGet(map, 'test-key', isCoreVehicle);
      
      expect(result).toBeUndefined();
    });

    it('should return undefined for missing key', () => {
      const map = new Map();
      
      const result = safeGet(map, 'missing-key', isCoreVehicle);
      
      expect(result).toBeUndefined();
    });
  });

  describe('filterWithValidation', () => {
    it('should filter array with type validation', () => {
      const validVehicle = generateCoreVehicle();
      const invalidData = { not: 'a vehicle' };
      const mixedArray = [validVehicle, invalidData, validVehicle];
      
      const result = filterWithValidation(mixedArray, isCoreVehicle);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(validVehicle);
      expect(result[1]).toEqual(validVehicle);
    });
  });

  describe('mapWithValidation', () => {
    it('should map and validate results', () => {
      const vehicles = generateCoreVehicles(3);
      
      const result = mapWithValidation(
        vehicles,
        vehicle => createVehicleDisplayData(vehicle),
        (data) => data && typeof data.vehicleId === 'string' // Simple validation
      );
      
      expect(result).toHaveLength(3);
      result.forEach(displayData => {
        expect(typeof displayData.vehicleId).toBe('string');
      });
    });
  });

  describe('validateAndTransform', () => {
    it('should validate and transform valid data', () => {
      const vehicle = generateCoreVehicle();
      
      const result = validateAndTransform(
        vehicle,
        isCoreVehicle,
        v => v.routeId
      );
      
      expect(result).toBe(vehicle.routeId);
    });

    it('should return undefined for invalid data', () => {
      const invalidData = { not: 'a vehicle' };
      
      const result = validateAndTransform(
        invalidData,
        isCoreVehicle,
        v => v.routeId
      );
      
      expect(result).toBeUndefined();
    });
  });
});

describe('Integration Tests', () => {
  it('should work together in a complete workflow', () => {
    // Generate test data
    const generator = new VehicleDataGenerator();
    const vehicles = generator.generateCoreVehicles(5);
    
    // Validate all vehicles
    const validationResults = vehicles.map(v => validateCoreVehicle(v));
    validationResults.forEach(result => {
      expect(result.isValid).toBe(true);
    });
    
    // Create schedules using factory
    const schedules = vehicles.map(vehicle => 
      createVehicleSchedule({
        vehicleId: vehicle.id,
        tripId: vehicle.tripId || `trip-${vehicle.id}`,
        routeId: vehicle.routeId,
        stationId: 'test-station'
      })
    );
    
    // Validate schedules
    schedules.forEach(schedule => {
      expect(isVehicleSchedule(schedule)).toBe(true);
    });
    
    // Create display data
    const displayData = vehicles.map((vehicle, index) => 
      createVehicleDisplayData(vehicle, schedules[index])
    );
    
    // Validate display data
    displayData.forEach(data => {
      expect(typeof data.vehicleId).toBe('string');
      expect(typeof data.displayName).toBe('string');
    });
    
    // Use convenience utilities
    const validVehicles = filterWithValidation(vehicles, isCoreVehicle);
    expect(validVehicles).toHaveLength(5);
    
    const routeIds = mapWithValidation(
      vehicles,
      v => v.routeId,
      (id): id is string => typeof id === 'string'
    );
    expect(routeIds).toHaveLength(5);
  });

  it('should handle property-based testing workflow', () => {
    const generator = new VehicleDataGenerator();
    
    // Property: All generated vehicles should be valid
    fc.assert(
      fc.property(generator.getCoreVehicleArbitrary(), (vehicle) => {
        const validationResult = validateCoreVehicle(vehicle);
        return validationResult.isValid;
      }),
      { numRuns: 20 }
    );
    
    // Property: Factory-created vehicles should be valid
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1 }),
          routeId: fc.string({ minLength: 1 }),
          label: fc.string({ minLength: 1 })
        }),
        (data) => {
          try {
            const vehicle = createVehicle(data, { validateCreatedObjects: false });
            return isCoreVehicle(vehicle);
          } catch {
            return false;
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});