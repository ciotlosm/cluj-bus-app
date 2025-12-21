/**
 * Data Validator for Vehicle Transformation Service
 * 
 * Provides comprehensive input validation for all vehicle data transformations.
 * Implements graceful degradation and detailed error reporting for malformed data.
 * 
 * Requirements: 5.1, 5.3, 5.4
 * 
 * @module DataValidator
 */

import type { 
  CoreVehicle, 
  Coordinates 
} from '../types/coreVehicle';
import type { 
  TransformationContext,
  TransformationStation
} from '../types/presentationLayer';
import type { 
  TranzyVehicleResponse 
} from '../types/tranzyApi';
import type { 
  TransformationValidationResult,
  ValidationError,
  ValidationWarning
} from '../types/transformationPipeline';
import {
  createSuccessValidation,
  createFailureValidation,
  createValidationError,
  createValidationWarning
} from '../types/transformationPipeline';
import { logger } from '../utils/shared/logger';

// ============================================================================
// VALIDATION RESULT TYPES
// ============================================================================

/**
 * Detailed validation result with recovery suggestions
 */
export interface DetailedValidationResult extends TransformationValidationResult {
  /** Validation passed with warnings */
  hasWarnings: boolean;
  /** Number of items that passed validation */
  validCount: number;
  /** Number of items that failed validation */
  invalidCount: number;
  /** Recovery suggestions for failed validations */
  recoverySuggestions: string[];
  /** Fallback values that can be used */
  fallbackValues: Record<string, any>;
}

/**
 * Validation statistics for monitoring
 */
export interface ValidationStats {
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  warningCount: number;
  errorCount: number;
  averageValidationTime: number;
  lastValidationTime: Date;
  commonErrors: Map<string, number>;
  commonWarnings: Map<string, number>;
}

// ============================================================================
// DATA VALIDATOR CLASS
// ============================================================================

/**
 * Comprehensive data validator with graceful degradation support
 * 
 * Validates all input data for the vehicle transformation pipeline and provides
 * detailed error reporting, fallback values, and recovery suggestions for
 * malformed data.
 */
export class DataValidator {
  private stats: ValidationStats = {
    totalValidations: 0,
    successfulValidations: 0,
    failedValidations: 0,
    warningCount: 0,
    errorCount: 0,
    averageValidationTime: 0,
    lastValidationTime: new Date(),
    commonErrors: new Map(),
    commonWarnings: new Map()
  };

  // ============================================================================
  // API RESPONSE VALIDATION
  // ============================================================================

  /**
   * Validate Tranzy API response with detailed error reporting
   */
  validateApiResponse(data: TranzyVehicleResponse[]): DetailedValidationResult {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const recoverySuggestions: string[] = [];
    const fallbackValues: Record<string, any> = {};

    let validCount = 0;
    let invalidCount = 0;

    // Basic structure validation
    if (!Array.isArray(data)) {
      errors.push(createValidationError(
        'root',
        'API response must be an array',
        'INVALID_STRUCTURE',
        { actualType: typeof data }
      ));
      
      recoverySuggestions.push('Check API endpoint configuration');
      fallbackValues.vehicles = [];
      
      return this.buildDetailedResult(false, errors, warnings, 0, 1, recoverySuggestions, fallbackValues, startTime);
    }

    if (data.length === 0) {
      warnings.push(createValidationWarning(
        'root',
        'API response contains no vehicles',
        'EMPTY_RESPONSE',
        'This may be normal during off-peak hours'
      ));
    }

    // Track invalid vehicles for summary reporting instead of individual errors
    const invalidVehicleIndices: number[] = [];
    const invalidVehicleReasons: string[] = [];

    // Validate each vehicle in the response
    for (let i = 0; i < data.length; i++) {
      const vehicle = data[i];
      const vehicleErrors: ValidationError[] = [];
      const vehicleWarnings: ValidationWarning[] = [];

      // Required field validation - collect issues but don't create individual errors yet
      let hasRequiredFieldIssues = false;
      
      if (!vehicle.id || typeof vehicle.id !== 'string') {
        hasRequiredFieldIssues = true;
        invalidVehicleReasons.push(`Vehicle at index ${i}: missing or invalid ID`);
      }

      if (!vehicle.route_id) {
        hasRequiredFieldIssues = true;
        invalidVehicleReasons.push(`Vehicle at index ${i}: missing route_id`);
      }

      // Coordinate validation with detailed error reporting
      const coordValidation = this.validateCoordinates(
        { latitude: vehicle.latitude, longitude: vehicle.longitude },
        `[${i}].position`
      );
      
      if (coordValidation.errors.length > 0) {
        hasRequiredFieldIssues = true;
        invalidVehicleReasons.push(`Vehicle at index ${i}: invalid coordinates`);
      }
      
      vehicleWarnings.push(...coordValidation.warnings);

      // Optional field validation with warnings
      if (vehicle.speed !== undefined && (typeof vehicle.speed !== 'number' || vehicle.speed < 0)) {
        vehicleWarnings.push(createValidationWarning(
          `[${i}].speed`,
          'Invalid speed value, will use default',
          'INVALID_OPTIONAL_FIELD',
          'Speed should be a non-negative number',
          { actualValue: vehicle.speed }
        ));
        
        fallbackValues[`vehicle_${i}_speed`] = 0;
      }

      if (vehicle.bearing !== undefined && (typeof vehicle.bearing !== 'number' || vehicle.bearing < 0 || vehicle.bearing >= 360)) {
        vehicleWarnings.push(createValidationWarning(
          `[${i}].bearing`,
          'Invalid bearing value, will use undefined',
          'INVALID_OPTIONAL_FIELD',
          'Bearing should be between 0 and 359 degrees',
          { actualValue: vehicle.bearing }
        ));
        
        fallbackValues[`vehicle_${i}_bearing`] = undefined;
      }

      // Timestamp validation
      if (vehicle.timestamp) {
        const timestamp = new Date(vehicle.timestamp);
        if (isNaN(timestamp.getTime())) {
          vehicleWarnings.push(createValidationWarning(
            `[${i}].timestamp`,
            'Invalid timestamp format, will use current time',
            'INVALID_TIMESTAMP',
            'Timestamp should be in ISO format',
            { actualValue: vehicle.timestamp }
          ));
          
          fallbackValues[`vehicle_${i}_timestamp`] = new Date();
        } else {
          // Check if timestamp is too old or in the future
          const now = new Date();
          const age = now.getTime() - timestamp.getTime();
          
          if (age > 24 * 60 * 60 * 1000) { // Older than 24 hours
            vehicleWarnings.push(createValidationWarning(
              `[${i}].timestamp`,
              'Vehicle data is very old',
              'STALE_DATA',
              'Data may not reflect current vehicle position',
              { age: Math.round(age / (60 * 60 * 1000)) + ' hours' }
            ));
          } else if (age < -5 * 60 * 1000) { // More than 5 minutes in the future
            vehicleWarnings.push(createValidationWarning(
              `[${i}].timestamp`,
              'Vehicle timestamp is in the future',
              'FUTURE_TIMESTAMP',
              'Check system clock synchronization',
              { futureBy: Math.round(-age / (60 * 1000)) + ' minutes' }
            ));
          }
        }
      }

      // Accessibility field validation
      if (vehicle.wheelchair_accessible && !['WHEELCHAIR_ACCESSIBLE', 'WHEELCHAIR_INACCESSIBLE', 'NO_VALUE'].includes(vehicle.wheelchair_accessible)) {
        vehicleWarnings.push(createValidationWarning(
          `[${i}].wheelchair_accessible`,
          'Invalid wheelchair accessibility value',
          'INVALID_ENUM_VALUE',
          'Will default to NO_VALUE',
          { actualValue: vehicle.wheelchair_accessible }
        ));
        
        fallbackValues[`vehicle_${i}_wheelchair_accessible`] = 'NO_VALUE';
      }

      if (vehicle.bike_accessible && !['BIKE_ACCESSIBLE', 'BIKE_INACCESSIBLE', 'NO_VALUE'].includes(vehicle.bike_accessible)) {
        vehicleWarnings.push(createValidationWarning(
          `[${i}].bike_accessible`,
          'Invalid bike accessibility value',
          'INVALID_ENUM_VALUE',
          'Will default to NO_VALUE',
          { actualValue: vehicle.bike_accessible }
        ));
        
        fallbackValues[`vehicle_${i}_bike_accessible`] = 'NO_VALUE';
      }

      // Determine if this vehicle is valid
      if (hasRequiredFieldIssues) {
        invalidCount++;
        invalidVehicleIndices.push(i);
      } else {
        validCount++;
      }
      
      warnings.push(...vehicleWarnings);
    }

    // Create summary errors instead of individual vehicle errors for better performance and readability
    if (invalidCount > 0) {
      // Check if we have serious validation issues (coordinates, required fields)
      const hasSeriousIssues = invalidVehicleReasons.some(reason => 
        reason.includes('coordinates') || reason.includes('ID') || reason.includes('route_id')
      );
      
      // If more than 50% of vehicles are invalid, or we have serious issues, it's an error
      if (invalidCount / data.length > 0.5 || hasSeriousIssues) {
        errors.push(createValidationError(
          'vehicles',
          `Invalid vehicles detected: ${invalidCount}/${data.length} vehicles have validation issues`,
          hasSeriousIssues ? 'SERIOUS_VALIDATION_ISSUES' : 'SYSTEMIC_DATA_ISSUE',
          { 
            invalidCount, 
            totalCount: data.length, 
            invalidPercentage: Math.round((invalidCount / data.length) * 100),
            sampleReasons: invalidVehicleReasons.slice(0, 5) // Show first 5 examples
          }
        ));
      } else {
        // For smaller numbers of invalid vehicles with minor issues, create a summary warning
        warnings.push(createValidationWarning(
          'vehicles',
          `Some vehicles have minor validation issues and will be filtered out: ${invalidCount}/${data.length} vehicles`,
          'PARTIAL_INVALID_DATA',
          'Invalid vehicles will be automatically filtered out during processing',
          { 
            invalidCount, 
            totalCount: data.length,
            sampleReasons: invalidVehicleReasons.slice(0, 3) // Show first 3 examples
          }
        ));
      }
    }

    // Generate recovery suggestions based on validation results
    if (invalidCount > 0) {
      if (invalidVehicleReasons.some(reason => reason.includes('coordinates'))) {
        recoverySuggestions.push('Check GPS data quality and coordinate format');
      }
      
      if (invalidVehicleReasons.some(reason => reason.includes('ID') || reason.includes('route_id'))) {
        recoverySuggestions.push('Verify API response format and required fields');
      }
      
      if (invalidCount / data.length > 0.5) {
        recoverySuggestions.push('High failure rate detected - check API endpoint and data source');
      } else {
        recoverySuggestions.push('Invalid vehicles will be automatically filtered out');
      }
    }

    const isValid = errors.length === 0;
    const duration = Date.now() - startTime;
    
    this.updateStats(isValid, errors.length, warnings.length, duration);
    
    return this.buildDetailedResult(isValid, errors, warnings, validCount, invalidCount, recoverySuggestions, fallbackValues, startTime);
  }

  /**
   * Validate coordinates with detailed error reporting
   */
  validateCoordinates(coords: Partial<Coordinates>, fieldPath: string = 'coordinates'): DetailedValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const recoverySuggestions: string[] = [];
    const fallbackValues: Record<string, any> = {};

    if (coords.latitude === undefined || coords.latitude === null) {
      errors.push(createValidationError(
        `${fieldPath}.latitude`,
        'Latitude is required',
        'MISSING_REQUIRED_FIELD'
      ));
    } else if (typeof coords.latitude !== 'number') {
      errors.push(createValidationError(
        `${fieldPath}.latitude`,
        'Latitude must be a number',
        'INVALID_TYPE',
        { actualType: typeof coords.latitude, actualValue: coords.latitude }
      ));
    } else if (coords.latitude < -90 || coords.latitude > 90) {
      errors.push(createValidationError(
        `${fieldPath}.latitude`,
        'Latitude must be between -90 and 90 degrees',
        'INVALID_COORDINATES',
        { actualValue: coords.latitude }
      ));
    } else if (coords.latitude === 0) {
      warnings.push(createValidationWarning(
        `${fieldPath}.latitude`,
        'Latitude is exactly 0, verify this is correct',
        'SUSPICIOUS_COORDINATE',
        'This may indicate missing or default GPS data'
      ));
    }

    if (coords.longitude === undefined || coords.longitude === null) {
      errors.push(createValidationError(
        `${fieldPath}.longitude`,
        'Longitude is required',
        'MISSING_REQUIRED_FIELD'
      ));
    } else if (typeof coords.longitude !== 'number') {
      errors.push(createValidationError(
        `${fieldPath}.longitude`,
        'Longitude must be a number',
        'INVALID_TYPE',
        { actualType: typeof coords.longitude, actualValue: coords.longitude }
      ));
    } else if (coords.longitude < -180 || coords.longitude > 180) {
      errors.push(createValidationError(
        `${fieldPath}.longitude`,
        'Longitude must be between -180 and 180 degrees',
        'INVALID_COORDINATES',
        { actualValue: coords.longitude }
      ));
    } else if (coords.longitude === 0) {
      warnings.push(createValidationWarning(
        `${fieldPath}.longitude`,
        'Longitude is exactly 0, verify this is correct',
        'SUSPICIOUS_COORDINATE',
        'This may indicate missing or default GPS data'
      ));
    }

    // Check for Cluj-Napoca area (rough bounds check)
    if (typeof coords.latitude === 'number' && typeof coords.longitude === 'number' && 
        errors.length === 0) {
      const clujBounds = {
        minLat: 46.7, maxLat: 46.8,
        minLng: 23.5, maxLng: 23.7
      };
      
      if (coords.latitude < clujBounds.minLat || coords.latitude > clujBounds.maxLat ||
          coords.longitude < clujBounds.minLng || coords.longitude > clujBounds.maxLng) {
        warnings.push(createValidationWarning(
          fieldPath,
          'Coordinates are outside Cluj-Napoca area',
          'UNEXPECTED_LOCATION',
          'Verify this vehicle is operating in the expected service area',
          { 
            latitude: coords.latitude, 
            longitude: coords.longitude,
            expectedArea: 'Cluj-Napoca, Romania'
          }
        ));
      }
    }

    // Accuracy validation
    if (coords.accuracy !== undefined) {
      if (typeof coords.accuracy !== 'number' || coords.accuracy < 0) {
        warnings.push(createValidationWarning(
          `${fieldPath}.accuracy`,
          'Invalid accuracy value',
          'INVALID_OPTIONAL_FIELD',
          'Accuracy should be a non-negative number in meters',
          { actualValue: coords.accuracy }
        ));
        
        fallbackValues.accuracy = undefined;
      } else if (coords.accuracy > 1000) {
        warnings.push(createValidationWarning(
          `${fieldPath}.accuracy`,
          'GPS accuracy is very low',
          'LOW_ACCURACY',
          'Position data may be unreliable',
          { accuracy: coords.accuracy + ' meters' }
        ));
      }
    }

    if (errors.length > 0) {
      recoverySuggestions.push('Check GPS data source and coordinate format');
      recoverySuggestions.push('Verify vehicle is within expected service area');
    }

    const isValid = errors.length === 0;
    return this.buildDetailedResult(isValid, errors, warnings, isValid ? 1 : 0, isValid ? 0 : 1, recoverySuggestions, fallbackValues, Date.now());
  }

  // ============================================================================
  // CORE VEHICLE VALIDATION
  // ============================================================================

  /**
   * Validate CoreVehicle object with detailed error reporting
   */
  validateCoreVehicle(vehicle: CoreVehicle): DetailedValidationResult {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const recoverySuggestions: string[] = [];
    const fallbackValues: Record<string, any> = {};

    // Required field validation
    if (!vehicle.id || typeof vehicle.id !== 'string') {
      errors.push(createValidationError(
        'id',
        'Vehicle ID is required and must be a string',
        'MISSING_REQUIRED_FIELD',
        { actualValue: vehicle.id }
      ));
    }

    if (!vehicle.routeId || typeof vehicle.routeId !== 'string') {
      errors.push(createValidationError(
        'routeId',
        'Route ID is required and must be a string',
        'MISSING_REQUIRED_FIELD',
        { actualValue: vehicle.routeId }
      ));
    }

    if (!vehicle.label || typeof vehicle.label !== 'string') {
      errors.push(createValidationError(
        'label',
        'Vehicle label is required and must be a string',
        'MISSING_REQUIRED_FIELD',
        { actualValue: vehicle.label }
      ));
    }

    // Position validation
    if (!vehicle.position) {
      errors.push(createValidationError(
        'position',
        'Vehicle position is required',
        'MISSING_REQUIRED_FIELD'
      ));
    } else {
      const positionValidation = this.validateCoordinates(vehicle.position, 'position');
      errors.push(...positionValidation.errors);
      warnings.push(...positionValidation.warnings);
    }

    // Timestamp validation
    if (!vehicle.timestamp) {
      errors.push(createValidationError(
        'timestamp',
        'Vehicle timestamp is required',
        'MISSING_REQUIRED_FIELD'
      ));
    } else if (!(vehicle.timestamp instanceof Date)) {
      errors.push(createValidationError(
        'timestamp',
        'Vehicle timestamp must be a Date object',
        'INVALID_TYPE',
        { actualType: typeof vehicle.timestamp }
      ));
    } else if (isNaN(vehicle.timestamp.getTime())) {
      errors.push(createValidationError(
        'timestamp',
        'Vehicle timestamp is invalid',
        'INVALID_TIMESTAMP',
        { actualValue: vehicle.timestamp }
      ));
    }

    // Optional field validation
    if (vehicle.speed !== undefined && (typeof vehicle.speed !== 'number' || vehicle.speed < 0)) {
      warnings.push(createValidationWarning(
        'speed',
        'Invalid speed value',
        'INVALID_OPTIONAL_FIELD',
        'Speed should be a non-negative number',
        { actualValue: vehicle.speed }
      ));
      
      fallbackValues.speed = undefined;
    }

    if (vehicle.bearing !== undefined && (typeof vehicle.bearing !== 'number' || vehicle.bearing < 0 || vehicle.bearing >= 360)) {
      warnings.push(createValidationWarning(
        'bearing',
        'Invalid bearing value',
        'INVALID_OPTIONAL_FIELD',
        'Bearing should be between 0 and 359 degrees',
        { actualValue: vehicle.bearing }
      ));
      
      fallbackValues.bearing = undefined;
    }

    // Boolean field validation
    if (typeof vehicle.isWheelchairAccessible !== 'boolean') {
      warnings.push(createValidationWarning(
        'isWheelchairAccessible',
        'Wheelchair accessibility should be a boolean',
        'INVALID_TYPE',
        'Will default to false',
        { actualValue: vehicle.isWheelchairAccessible }
      ));
      
      fallbackValues.isWheelchairAccessible = false;
    }

    if (typeof vehicle.isBikeAccessible !== 'boolean') {
      warnings.push(createValidationWarning(
        'isBikeAccessible',
        'Bike accessibility should be a boolean',
        'INVALID_TYPE',
        'Will default to false',
        { actualValue: vehicle.isBikeAccessible }
      ));
      
      fallbackValues.isBikeAccessible = false;
    }

    // Generate recovery suggestions
    if (errors.length > 0) {
      recoverySuggestions.push('Verify vehicle data structure and required fields');
      
      if (errors.some(e => e.field.includes('position'))) {
        recoverySuggestions.push('Check GPS data quality and coordinate validation');
      }
      
      if (errors.some(e => e.field === 'timestamp')) {
        recoverySuggestions.push('Ensure timestamp is properly formatted Date object');
      }
    }

    const isValid = errors.length === 0;
    const duration = Date.now() - startTime;
    
    this.updateStats(isValid, errors.length, warnings.length, duration);
    
    return this.buildDetailedResult(isValid, errors, warnings, isValid ? 1 : 0, isValid ? 0 : 1, recoverySuggestions, fallbackValues, startTime);
  }

  // ============================================================================
  // TRANSFORMATION CONTEXT VALIDATION
  // ============================================================================

  /**
   * Validate transformation context with detailed error reporting
   */
  validateTransformationContext(context: TransformationContext): DetailedValidationResult {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const recoverySuggestions: string[] = [];
    const fallbackValues: Record<string, any> = {};

    // Required fields validation
    if (!Array.isArray(context.favoriteRoutes)) {
      errors.push(createValidationError(
        'favoriteRoutes',
        'Favorite routes must be an array',
        'INVALID_TYPE',
        { actualType: typeof context.favoriteRoutes }
      ));
      
      fallbackValues.favoriteRoutes = [];
    }

    if (!Array.isArray(context.targetStations)) {
      errors.push(createValidationError(
        'targetStations',
        'Target stations must be an array',
        'INVALID_TYPE',
        { actualType: typeof context.targetStations }
      ));
      
      fallbackValues.targetStations = [];
    } else {
      // Validate each target station
      for (let i = 0; i < context.targetStations.length; i++) {
        const station = context.targetStations[i];
        
        if (!station.id || typeof station.id !== 'string') {
          errors.push(createValidationError(
            `targetStations[${i}].id`,
            'Station ID is required and must be a string',
            'MISSING_REQUIRED_FIELD',
            { actualValue: station.id }
          ));
        }

        if (!station.coordinates) {
          errors.push(createValidationError(
            `targetStations[${i}].coordinates`,
            'Station coordinates are required',
            'MISSING_REQUIRED_FIELD'
          ));
        } else {
          const coordValidation = this.validateCoordinates(station.coordinates, `targetStations[${i}].coordinates`);
          errors.push(...coordValidation.errors);
          warnings.push(...coordValidation.warnings);
        }
      }
    }

    if (!context.preferences) {
      errors.push(createValidationError(
        'preferences',
        'Preferences object is required',
        'MISSING_REQUIRED_FIELD'
      ));
      
      fallbackValues.preferences = {};
    }

    if (!context.timestamp) {
      errors.push(createValidationError(
        'timestamp',
        'Timestamp is required',
        'MISSING_REQUIRED_FIELD'
      ));
      
      fallbackValues.timestamp = new Date();
    } else if (!(context.timestamp instanceof Date)) {
      errors.push(createValidationError(
        'timestamp',
        'Timestamp must be a Date object',
        'INVALID_TYPE',
        { actualType: typeof context.timestamp }
      ));
      
      fallbackValues.timestamp = new Date();
    }

    if (!context.timezone || typeof context.timezone !== 'string') {
      warnings.push(createValidationWarning(
        'timezone',
        'Timezone should be specified',
        'MISSING_OPTIONAL_FIELD',
        'Will default to Europe/Bucharest',
        { actualValue: context.timezone }
      ));
      
      fallbackValues.timezone = 'Europe/Bucharest';
    }

    if (!context.apiConfig) {
      errors.push(createValidationError(
        'apiConfig',
        'API configuration is required',
        'MISSING_REQUIRED_FIELD'
      ));
      
      fallbackValues.apiConfig = { apiKey: '' };
    } else if (!context.apiConfig.apiKey || typeof context.apiConfig.apiKey !== 'string') {
      errors.push(createValidationError(
        'apiConfig.apiKey',
        'API key is required and must be a string',
        'MISSING_REQUIRED_FIELD',
        { actualValue: context.apiConfig.apiKey }
      ));
    }

    // Optional field validation
    if (context.userLocation) {
      const locationValidation = this.validateCoordinates(context.userLocation, 'userLocation');
      warnings.push(...locationValidation.warnings);
      // Don't add errors for optional user location
    }

    // Generate recovery suggestions
    if (errors.length > 0) {
      recoverySuggestions.push('Verify transformation context structure and required fields');
      
      if (errors.some(e => e.field.includes('apiConfig'))) {
        recoverySuggestions.push('Check API configuration and authentication setup');
      }
      
      if (errors.some(e => e.field.includes('targetStations'))) {
        recoverySuggestions.push('Verify station data and coordinate format');
      }
    }

    const isValid = errors.length === 0;
    const duration = Date.now() - startTime;
    
    this.updateStats(isValid, errors.length, warnings.length, duration);
    
    return this.buildDetailedResult(isValid, errors, warnings, isValid ? 1 : 0, isValid ? 0 : 1, recoverySuggestions, fallbackValues, startTime);
  }

  // ============================================================================
  // GRACEFUL DEGRADATION HELPERS
  // ============================================================================

  /**
   * Apply fallback values to malformed API response
   */
  applyFallbackValues(data: TranzyVehicleResponse[], fallbackValues: Record<string, any>): TranzyVehicleResponse[] {
    return data.map((vehicle, index) => {
      const correctedVehicle = { ...vehicle };

      // Apply fallback values for this vehicle
      Object.keys(fallbackValues).forEach(key => {
        if (key.startsWith(`vehicle_${index}_`)) {
          const fieldName = key.replace(`vehicle_${index}_`, '');
          if (fieldName in correctedVehicle) {
            (correctedVehicle as any)[fieldName] = fallbackValues[key];
          }
        }
      });

      return correctedVehicle;
    });
  }

  /**
   * Filter out invalid vehicles while preserving valid ones
   */
  filterValidVehicles(data: TranzyVehicleResponse[]): TranzyVehicleResponse[] {
    return data.filter(vehicle => {
      // Basic validation for filtering
      return vehicle.id && 
             vehicle.route_id && 
             typeof vehicle.latitude === 'number' && 
             typeof vehicle.longitude === 'number' &&
             vehicle.latitude >= -90 && vehicle.latitude <= 90 &&
             vehicle.longitude >= -180 && vehicle.longitude <= 180;
    });
  }

  // ============================================================================
  // STATISTICS AND MONITORING
  // ============================================================================

  /**
   * Get validation statistics for monitoring
   */
  getValidationStats(): ValidationStats {
    return { ...this.stats };
  }

  /**
   * Reset validation statistics
   */
  resetStats(): void {
    this.stats = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      warningCount: 0,
      errorCount: 0,
      averageValidationTime: 0,
      lastValidationTime: new Date(),
      commonErrors: new Map(),
      commonWarnings: new Map()
    };
  }

  /**
   * Get most common validation issues
   */
  getCommonIssues(): { errors: Array<[string, number]>; warnings: Array<[string, number]> } {
    return {
      errors: Array.from(this.stats.commonErrors.entries()).sort((a, b) => b[1] - a[1]),
      warnings: Array.from(this.stats.commonWarnings.entries()).sort((a, b) => b[1] - a[1])
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private buildDetailedResult(
    isValid: boolean,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    validCount: number,
    invalidCount: number,
    recoverySuggestions: string[],
    fallbackValues: Record<string, any>,
    startTime: number
  ): DetailedValidationResult {
    return {
      isValid,
      errors,
      warnings,
      hasWarnings: warnings.length > 0,
      validCount,
      invalidCount,
      recoverySuggestions,
      fallbackValues
    };
  }

  private updateStats(isValid: boolean, errorCount: number, warningCount: number, duration: number): void {
    this.stats.totalValidations++;
    this.stats.lastValidationTime = new Date();
    
    if (isValid) {
      this.stats.successfulValidations++;
    } else {
      this.stats.failedValidations++;
    }
    
    this.stats.errorCount += errorCount;
    this.stats.warningCount += warningCount;
    
    // Update average validation time
    const totalTime = this.stats.averageValidationTime * (this.stats.totalValidations - 1) + duration;
    this.stats.averageValidationTime = totalTime / this.stats.totalValidations;
  }
}

/**
 * Default data validator instance
 */
export const dataValidator = new DataValidator();