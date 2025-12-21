/**
 * Developer Experience Utilities - Main Export
 * 
 * This module provides a comprehensive suite of developer experience utilities
 * for working with vehicle data throughout the application. It includes:
 * 
 * - VehicleDataGenerator: Test data generation with fast-check integration
 * - VehicleTypeGuards: Runtime type checking and validation
 * - VehicleDataFactory: Factory functions for creating data structures
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 * 
 * @module developerExperience
 * 
 * @example
 * ```typescript
 * import { 
 *   VehicleDataGenerator,
 *   createVehicle,
 *   isVehicleSchedule,
 *   validateCoreVehicle
 * } from './utils/developerExperience';
 * 
 * // Generate test data
 * const generator = new VehicleDataGenerator();
 * const testVehicles = generator.generateCoreVehicles(10);
 * 
 * // Create production data
 * const vehicle = createVehicle({
 *   id: 'bus-123',
 *   routeId: '42',
 *   label: '42A'
 * });
 * 
 * // Validate data
 * const validationResult = validateCoreVehicle(vehicle);
 * if (!validationResult.isValid) {
 *   console.error('Validation errors:', validationResult.errors);
 * }
 * 
 * // Type guard
 * if (isVehicleSchedule(data)) {
 *   // TypeScript knows data is VehicleSchedule here
 *   console.log(data.minutesUntilArrival);
 * }
 * ```
 */

// ============================================================================
// VEHICLE DATA GENERATOR EXPORTS
// ============================================================================

export {
  VehicleDataGenerator,
  createVehicleDataGenerator,
  generateCoreVehicle,
  generateCoreVehicles,
  generateCompleteTestDataset,
  // Arbitraries
  clujCoordinatesArb,
  globalCoordinatesArb,
  vehicleIdArb,
  routeIdArb,
  tripIdArb,
  stationIdArb,
  vehicleLabelArb,
  recentTimestampArb,
  futureTimestampArb,
  coreVehicleArb,
  vehicleScheduleArb,
  vehicleDirectionArb,
  routeInfoArb,
  // Types
  type GeneratorConfig,
  DEFAULT_GENERATOR_CONFIG
} from '../data-processing/VehicleDataGenerator';

// ============================================================================
// TYPE GUARDS EXPORTS
// ============================================================================

export {
  // Enhanced type guards
  isVehicleSchedule,
  isVehicleDirection,
  isRouteInfo,
  isTransformationStation,
  isUserPreferences,
  // Detailed validation functions
  validateCoreVehicle,
  validateVehicleSchedule,
  validateTransformedVehicleData,
  // Utility functions
  validateArray,
  createValidationSummary,
  formatValidationErrors,
  formatValidationWarnings,
  // Type guard collections
  coreVehicleTypeGuards,
  businessLogicTypeGuards,
  presentationLayerTypeGuards,
  transformationPipelineTypeGuards,
  allTypeGuards,
  // Types
  type DetailedValidationResult,
  type ValidationOptions,
  DEFAULT_VALIDATION_OPTIONS
} from '../validation/VehicleTypeGuards';

// ============================================================================
// FACTORY FUNCTIONS EXPORTS
// ============================================================================

export {
  // Core vehicle factories
  createVehicle,
  createVehicleBatch,
  createValidatedCoordinates,
  // Business logic factories
  createVehicleSchedule,
  createVehicleDirection,
  createRouteInfo,
  // Presentation layer factories
  createVehicleDisplayData,
  createTransformationContextWithDefaults,
  createTransformedVehicleDataFromVehicles,
  // Batch creation utilities
  createTestScenario,
  // Factory collections
  coreVehicleFactories,
  businessLogicFactories,
  presentationLayerFactories,
  allFactories,
  // Types
  type FactoryConfig,
  DEFAULT_FACTORY_CONFIG
} from '../data-processing/VehicleDataFactory';

// ============================================================================
// RE-EXPORT CORE TYPE GUARDS FROM TYPE FILES
// ============================================================================

export {
  // Core vehicle type guards
  isCoreVehicle,
  isCoordinates,
  isDirectionStatus,
  isConfidenceLevel,
  isRouteType,
  // Presentation layer type guards
  isTransformationContext,
  isVehicleDisplayData,
  isTransformedVehicleData,
  // Transformation pipeline type guards
  isTransformationError,
  isValidationFailure,
  isValidationSuccess
} from '../../types';

// ============================================================================
// RE-EXPORT FACTORY FUNCTIONS FROM TYPE FILES
// ============================================================================

export {
  // Core vehicle factories
  createCoreVehicle,
  createCoordinates,
  // Presentation layer factories
  createDefaultUserPreferences,
  createDefaultTransformationContext,
  createEmptyTransformedVehicleData,
  // Transformation pipeline factories
  createSuccessValidation,
  createFailureValidation,
  createValidationError,
  createValidationWarning
} from '../../types';

// ============================================================================
// CONVENIENCE UTILITIES
// ============================================================================

/**
 * Quick validation helper that returns a boolean
 * 
 * @param data - Data to validate
 * @param validator - Validation function
 * @returns True if valid, false otherwise
 * 
 * @example
 * ```typescript
 * if (quickValidate(vehicle, isCoreVehicle)) {
 *   // vehicle is valid
 * }
 * ```
 */
export function quickValidate<T>(
  data: any,
  validator: (data: any) => data is T
): boolean {
  try {
    return validator(data);
  } catch {
    return false;
  }
}

/**
 * Safe type assertion with validation
 * 
 * @param data - Data to assert
 * @param validator - Validation function
 * @param errorMessage - Custom error message
 * @returns Validated data
 * @throws Error if validation fails
 * 
 * @example
 * ```typescript
 * const vehicle = assertType(data, isCoreVehicle, 'Invalid vehicle data');
 * // vehicle is guaranteed to be CoreVehicle here
 * ```
 */
export function assertType<T>(
  data: any,
  validator: (data: any) => data is T,
  errorMessage: string = 'Type assertion failed'
): T {
  if (!validator(data)) {
    throw new Error(errorMessage);
  }
  return data;
}

/**
 * Creates a type-safe getter with validation
 * 
 * @param map - Map to get from
 * @param key - Key to retrieve
 * @param validator - Validation function
 * @returns Validated value or undefined
 * 
 * @example
 * ```typescript
 * const schedule = safeGet(
 *   transformedData.schedules,
 *   vehicleId,
 *   isVehicleSchedule
 * );
 * ```
 */
export function safeGet<K, V>(
  map: Map<K, any>,
  key: K,
  validator: (data: any) => data is V
): V | undefined {
  const value = map.get(key);
  if (value === undefined) return undefined;
  return validator(value) ? value : undefined;
}

/**
 * Filters an array with type guard validation
 * 
 * @param array - Array to filter
 * @param validator - Validation function
 * @returns Filtered array with validated types
 * 
 * @example
 * ```typescript
 * const validVehicles = filterWithValidation(
 *   mixedData,
 *   isCoreVehicle
 * );
 * // validVehicles is CoreVehicle[]
 * ```
 */
export function filterWithValidation<T>(
  array: any[],
  validator: (data: any) => data is T
): T[] {
  return array.filter(validator);
}

/**
 * Maps an array with validation, skipping invalid items
 * 
 * @param array - Array to map
 * @param mapper - Mapping function
 * @param validator - Validation function for mapped values
 * @returns Array of validated mapped values
 * 
 * @example
 * ```typescript
 * const displayData = mapWithValidation(
 *   vehicles,
 *   v => createVehicleDisplayData(v),
 *   isVehicleDisplayData
 * );
 * ```
 */
export function mapWithValidation<T, U>(
  array: T[],
  mapper: (item: T) => U,
  validator: (data: any) => data is U
): U[] {
  return array
    .map(mapper)
    .filter(validator);
}

/**
 * Validates and transforms data in one operation
 * 
 * @param data - Data to validate and transform
 * @param validator - Validation function
 * @param transformer - Transformation function
 * @returns Transformed data or undefined if validation fails
 * 
 * @example
 * ```typescript
 * const displayData = validateAndTransform(
 *   vehicle,
 *   isCoreVehicle,
 *   v => createVehicleDisplayData(v)
 * );
 * ```
 */
export function validateAndTransform<T, U>(
  data: any,
  validator: (data: any) => data is T,
  transformer: (data: T) => U
): U | undefined {
  if (!validator(data)) return undefined;
  return transformer(data);
}

// ============================================================================
// DEVELOPER DOCUMENTATION
// ============================================================================

/**
 * Developer Experience Utilities Documentation
 * 
 * This module provides comprehensive utilities for working with vehicle data:
 * 
 * ## Test Data Generation
 * 
 * Use VehicleDataGenerator for creating test data:
 * 
 * ```typescript
 * const generator = new VehicleDataGenerator({
 *   useClujCoordinates: true,
 *   includeOptionalFields: true
 * });
 * 
 * // Generate single vehicle
 * const vehicle = generator.generateCoreVehicle();
 * 
 * // Generate multiple vehicles
 * const vehicles = generator.generateCoreVehicles(10);
 * 
 * // Generate complete dataset
 * const dataset = generateCompleteTestDataset(20);
 * ```
 * 
 * ## Type Guards and Validation
 * 
 * Use type guards for runtime type checking:
 * 
 * ```typescript
 * // Simple type guard
 * if (isCoreVehicle(data)) {
 *   // TypeScript knows data is CoreVehicle
 *   console.log(data.routeId);
 * }
 * 
 * // Detailed validation
 * const result = validateCoreVehicle(data);
 * if (!result.isValid) {
 *   console.error('Errors:', result.errors);
 *   console.warn('Warnings:', result.warnings);
 * }
 * ```
 * 
 * ## Factory Functions
 * 
 * Use factories for creating production data:
 * 
 * ```typescript
 * // Create vehicle with defaults
 * const vehicle = createVehicle({
 *   id: 'bus-123',
 *   routeId: '42',
 *   label: '42A'
 * });
 * 
 * // Create schedule
 * const schedule = createVehicleSchedule({
 *   vehicleId: vehicle.id,
 *   tripId: 'trip-456',
 *   routeId: vehicle.routeId,
 *   stationId: 'station-789'
 * });
 * 
 * // Create complete test scenario
 * const scenario = createTestScenario({
 *   vehicleCount: 10,
 *   routeCount: 3,
 *   includeRealTimeData: true
 * });
 * ```
 * 
 * ## Best Practices
 * 
 * 1. Always validate external data before processing
 * 2. Use type guards for runtime type safety
 * 3. Use factories for consistent object creation
 * 4. Use generators for test data
 * 5. Check validation results before using data
 * 6. Use detailed validation for debugging
 * 7. Use quick validation for production checks
 * 
 * ## Performance Considerations
 * 
 * - Type guards are fast (simple property checks)
 * - Detailed validation is slower (comprehensive checks)
 * - Use quick validation in hot paths
 * - Use detailed validation during development
 * - Cache validation results when possible
 * - Batch validate arrays for better performance
 */
export const DEVELOPER_DOCS = {
  version: '1.0.0',
  lastUpdated: '2024-12-19',
  modules: {
    generator: 'VehicleDataGenerator - Test data generation',
    typeGuards: 'VehicleTypeGuards - Runtime type checking',
    factories: 'VehicleDataFactory - Object creation'
  },
  examples: {
    testData: 'See VehicleDataGenerator examples',
    validation: 'See VehicleTypeGuards examples',
    creation: 'See VehicleDataFactory examples'
  }
} as const;