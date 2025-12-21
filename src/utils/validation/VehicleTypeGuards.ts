/**
 * Vehicle Type Guards and Validation Utilities
 * 
 * This module provides comprehensive type guards and validation utilities for all
 * vehicle-related data structures. It ensures type safety at runtime and provides
 * detailed validation with helpful error messages.
 * 
 * Requirements: 6.1, 6.3, 6.4
 * 
 * @module VehicleTypeGuards
 */

import type {
  CoreVehicle,
  Coordinates,
  DirectionStatus,
  ConfidenceLevel,
  RouteType
} from '../types/coreVehicle';
import {
  isCoordinates,
  isCoreVehicle,
  isDirectionStatus,
  isConfidenceLevel,
  isRouteType
} from '../types/coreVehicle';
import type {
  VehicleSchedule,
  VehicleDirection,
  RouteInfo,
  EnhancedVehicleWithBusinessLogic
} from '../types/businessLogic';
import type {
  VehicleDisplayData,
  TransformationContext,
  TransformedVehicleData,
  TransformationStation,
  UserPreferences
} from '../types/presentationLayer';
import {
  isTransformationContext,
  isVehicleDisplayData,
  isTransformedVehicleData
} from '../types/presentationLayer';
import type {
  TransformationValidationResult,
  ValidationError,
  ValidationWarning
} from '../types/transformationPipeline';
import {
  TransformationError,
  isTransformationError,
  isValidationFailure,
  isValidationSuccess
} from '../types/transformationPipeline';

// ============================================================================
// VALIDATION RESULT TYPES
// ============================================================================

/**
 * Detailed validation result with field-level errors
 */
export interface DetailedValidationResult {
  /** Whether the validation passed */
  isValid: boolean;
  
  /** List of validation errors */
  errors: ValidationError[];
  
  /** List of validation warnings */
  warnings: ValidationWarning[];
  
  /** The validated data (if valid) */
  data?: any;
  
  /** Summary of validation results */
  summary: {
    totalFields: number;
    validFields: number;
    errorFields: number;
    warningFields: number;
  };
}

/**
 * Validation options for customizing validation behavior
 */
export interface ValidationOptions {
  /** Whether to include optional field validation */
  validateOptionalFields?: boolean;
  
  /** Whether to perform strict type checking */
  strictMode?: boolean;
  
  /** Whether to collect warnings in addition to errors */
  collectWarnings?: boolean;
  
  /** Custom field validators */
  customValidators?: Record<string, (value: any) => boolean>;
  
  /** Fields to skip during validation */
  skipFields?: string[];
  
  /** Maximum allowed errors before stopping validation */
  maxErrors?: number;
}

/**
 * Default validation options
 */
export const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  validateOptionalFields: true,
  strictMode: false,
  collectWarnings: true,
  customValidators: {},
  skipFields: [],
  maxErrors: 50
};

// ============================================================================
// ENHANCED TYPE GUARDS
// ============================================================================

/**
 * Enhanced type guard for VehicleSchedule with detailed validation
 */
export function isVehicleSchedule(obj: any, options: ValidationOptions = DEFAULT_VALIDATION_OPTIONS): obj is VehicleSchedule {
  if (!obj || typeof obj !== 'object') return false;

  const requiredFields = [
    'vehicleId', 'tripId', 'routeId', 'stationId', 'scheduledArrival',
    'minutesUntilArrival', 'isRealTime', 'isScheduled', 'confidence',
    'stopSequence', 'isFinalStop', 'lastUpdated'
  ];

  return requiredFields.every(field => {
    if (options.skipFields?.includes(field)) return true;
    
    switch (field) {
      case 'vehicleId':
      case 'tripId':
      case 'routeId':
      case 'stationId':
        return typeof obj[field] === 'string' && obj[field].length > 0;
      case 'scheduledArrival':
      case 'lastUpdated':
        return obj[field] instanceof Date && !isNaN(obj[field].getTime());
      case 'minutesUntilArrival':
      case 'stopSequence':
        return typeof obj[field] === 'number' && obj[field] >= 0;
      case 'isRealTime':
      case 'isScheduled':
      case 'isFinalStop':
        return typeof obj[field] === 'boolean';
      case 'confidence':
        return isConfidenceLevel(obj[field]);
      default:
        return true;
    }
  });
}

/**
 * Enhanced type guard for VehicleDirection with detailed validation
 */
export function isVehicleDirection(obj: any, options: ValidationOptions = DEFAULT_VALIDATION_OPTIONS): obj is VehicleDirection {
  if (!obj || typeof obj !== 'object') return false;

  const requiredFields = [
    'vehicleId', 'stationId', 'routeId', 'tripId', 'direction',
    'estimatedMinutes', 'confidence', 'isAtStation', 'analyzedAt'
  ];

  return requiredFields.every(field => {
    if (options.skipFields?.includes(field)) return true;
    
    switch (field) {
      case 'vehicleId':
      case 'stationId':
      case 'routeId':
      case 'tripId':
        return typeof obj[field] === 'string' && obj[field].length > 0;
      case 'direction':
        return isDirectionStatus(obj[field]);
      case 'estimatedMinutes':
        return typeof obj[field] === 'number' && obj[field] >= 0;
      case 'confidence':
        return isConfidenceLevel(obj[field]);
      case 'isAtStation':
        return typeof obj[field] === 'boolean';
      case 'analyzedAt':
        return obj[field] instanceof Date && !isNaN(obj[field].getTime());
      default:
        return true;
    }
  });
}

/**
 * Enhanced type guard for RouteInfo with detailed validation
 */
export function isRouteInfo(obj: any, options: ValidationOptions = DEFAULT_VALIDATION_OPTIONS): obj is RouteInfo {
  if (!obj || typeof obj !== 'object') return false;

  const requiredFields = [
    'routeId', 'agencyId', 'routeName', 'routeDescription', 'routeType',
    'stationIds', 'tripIds', 'directions', 'isActive', 'operatesWeekends',
    'operatesHolidays', 'accessibility', 'lastUpdated'
  ];

  return requiredFields.every(field => {
    if (options.skipFields?.includes(field)) return true;
    
    switch (field) {
      case 'routeId':
      case 'agencyId':
      case 'routeName':
      case 'routeDescription':
        return typeof obj[field] === 'string' && obj[field].length > 0;
      case 'routeType':
        return isRouteType(obj[field]);
      case 'stationIds':
      case 'tripIds':
        return Array.isArray(obj[field]) && obj[field].every((id: any) => typeof id === 'string');
      case 'directions':
        return Array.isArray(obj[field]) && obj[field].every((dir: any) => 
          dir && typeof dir.directionId === 'string' && typeof dir.directionName === 'string'
        );
      case 'isActive':
      case 'operatesWeekends':
      case 'operatesHolidays':
        return typeof obj[field] === 'boolean';
      case 'accessibility':
        return obj[field] && typeof obj[field] === 'object' &&
               typeof obj[field].wheelchairAccessible === 'boolean' &&
               typeof obj[field].bikeAccessible === 'boolean' &&
               typeof obj[field].audioAnnouncements === 'boolean';
      case 'lastUpdated':
        return obj[field] instanceof Date && !isNaN(obj[field].getTime());
      default:
        return true;
    }
  });
}

/**
 * Enhanced type guard for TransformationStation with detailed validation
 */
export function isTransformationStation(obj: any, options: ValidationOptions = DEFAULT_VALIDATION_OPTIONS): obj is TransformationStation {
  if (!obj || typeof obj !== 'object') return false;

  const requiredFields = ['id', 'name', 'coordinates', 'routeIds', 'isFavorite', 'accessibility'];

  return requiredFields.every(field => {
    if (options.skipFields?.includes(field)) return true;
    
    switch (field) {
      case 'id':
      case 'name':
        return typeof obj[field] === 'string' && obj[field].length > 0;
      case 'coordinates':
        return isCoordinates(obj[field]);
      case 'routeIds':
        return Array.isArray(obj[field]) && obj[field].every((id: any) => typeof id === 'string');
      case 'isFavorite':
        return typeof obj[field] === 'boolean';
      case 'accessibility':
        return obj[field] && typeof obj[field] === 'object' &&
               typeof obj[field].wheelchairAccessible === 'boolean' &&
               typeof obj[field].bikeRacks === 'boolean' &&
               typeof obj[field].audioAnnouncements === 'boolean';
      default:
        return true;
    }
  });
}

/**
 * Enhanced type guard for UserPreferences with detailed validation
 */
export function isUserPreferences(obj: any, options: ValidationOptions = DEFAULT_VALIDATION_OPTIONS): obj is UserPreferences {
  if (!obj || typeof obj !== 'object') return false;

  const requiredFields = [
    'timeFormat', 'distanceUnit', 'language', 'maxWalkingDistance',
    'arrivalBuffer', 'wheelchairAccessibleOnly', 'bikeAccessibleOnly',
    'preferredRouteTypes', 'preferRealTimeData', 'confidenceThreshold'
  ];

  return requiredFields.every(field => {
    if (options.skipFields?.includes(field)) return true;
    
    switch (field) {
      case 'timeFormat':
        return obj[field] === '12h' || obj[field] === '24h';
      case 'distanceUnit':
        return obj[field] === 'metric' || obj[field] === 'imperial';
      case 'language':
        return typeof obj[field] === 'string' && obj[field].length > 0;
      case 'maxWalkingDistance':
      case 'arrivalBuffer':
        return typeof obj[field] === 'number' && obj[field] >= 0;
      case 'wheelchairAccessibleOnly':
      case 'bikeAccessibleOnly':
      case 'preferRealTimeData':
        return typeof obj[field] === 'boolean';
      case 'preferredRouteTypes':
        return Array.isArray(obj[field]) && obj[field].every((type: any) => isRouteType(type));
      case 'confidenceThreshold':
        return isConfidenceLevel(obj[field]);
      default:
        return true;
    }
  });
}

// ============================================================================
// DETAILED VALIDATION FUNCTIONS
// ============================================================================

/**
 * Performs detailed validation of CoreVehicle with comprehensive error reporting
 */
export function validateCoreVehicle(obj: any, options: ValidationOptions = DEFAULT_VALIDATION_OPTIONS): DetailedValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  let validFields = 0;
  let totalFields = 0;

  if (!obj || typeof obj !== 'object') {
    errors.push({
      field: 'root',
      message: 'Input must be an object',
      code: 'INVALID_TYPE',
      severity: 'error'
    });
    
    return {
      isValid: false,
      errors,
      warnings,
      summary: { totalFields: 0, validFields: 0, errorFields: 1, warningFields: 0 }
    };
  }

  const fieldValidations = [
    { field: 'id', validator: (v: any) => typeof v === 'string' && v.length > 0, required: true },
    { field: 'routeId', validator: (v: any) => typeof v === 'string' && v.length > 0, required: true },
    { field: 'tripId', validator: (v: any) => v === undefined || (typeof v === 'string' && v.length > 0), required: false },
    { field: 'label', validator: (v: any) => typeof v === 'string' && v.length > 0, required: true },
    { field: 'position', validator: (v: any) => isCoordinates(v), required: true },
    { field: 'timestamp', validator: (v: any) => v instanceof Date && !isNaN(v.getTime()), required: true },
    { field: 'speed', validator: (v: any) => v === undefined || (typeof v === 'number' && v >= 0), required: false },
    { field: 'bearing', validator: (v: any) => v === undefined || (typeof v === 'number' && v >= 0 && v <= 360), required: false },
    { field: 'isWheelchairAccessible', validator: (v: any) => typeof v === 'boolean', required: true },
    { field: 'isBikeAccessible', validator: (v: any) => typeof v === 'boolean', required: true }
  ];

  for (const { field, validator, required } of fieldValidations) {
    if (options.skipFields?.includes(field)) continue;
    
    totalFields++;
    const value = obj[field];
    
    if (required && (value === undefined || value === null)) {
      errors.push({
        field,
        message: `Required field '${field}' is missing`,
        code: 'REQUIRED_FIELD_MISSING',
        severity: 'error'
      });
    } else if (value !== undefined && value !== null) {
      if (validator(value)) {
        validFields++;
        
        // Add warnings for optional fields with questionable values
        if (options.collectWarnings) {
          if (field === 'speed' && typeof value === 'number' && value > 100) {
            warnings.push({
              field,
              message: `Speed value ${value} seems unusually high`,
              code: 'SUSPICIOUS_VALUE',
              suggestion: 'Verify speed is in correct units (km/h)'
            });
          }
          
          if (field === 'timestamp' && value instanceof Date) {
            const ageHours = (Date.now() - value.getTime()) / (1000 * 60 * 60);
            if (ageHours > 24) {
              warnings.push({
                field,
                message: `Timestamp is ${ageHours.toFixed(1)} hours old`,
                code: 'STALE_DATA',
                suggestion: 'Consider refreshing vehicle data'
              });
            }
          }
        }
      } else {
        errors.push({
          field,
          message: `Invalid value for field '${field}'`,
          code: 'INVALID_VALUE',
          severity: 'error',
          metadata: { value, type: typeof value }
        });
      }
    } else if (!required) {
      validFields++; // Optional fields that are undefined are considered valid
    }
    
    if (errors.length >= (options.maxErrors || 50)) break;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    data: errors.length === 0 ? obj : undefined,
    summary: {
      totalFields,
      validFields,
      errorFields: errors.length,
      warningFields: warnings.length
    }
  };
}

/**
 * Performs detailed validation of VehicleSchedule with comprehensive error reporting
 */
export function validateVehicleSchedule(obj: any, options: ValidationOptions = DEFAULT_VALIDATION_OPTIONS): DetailedValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  let validFields = 0;
  let totalFields = 0;

  if (!obj || typeof obj !== 'object') {
    errors.push({
      field: 'root',
      message: 'Input must be an object',
      code: 'INVALID_TYPE',
      severity: 'error'
    });
    
    return {
      isValid: false,
      errors,
      warnings,
      summary: { totalFields: 0, validFields: 0, errorFields: 1, warningFields: 0 }
    };
  }

  const fieldValidations = [
    { field: 'vehicleId', validator: (v: any) => typeof v === 'string' && v.length > 0, required: true },
    { field: 'tripId', validator: (v: any) => typeof v === 'string' && v.length > 0, required: true },
    { field: 'routeId', validator: (v: any) => typeof v === 'string' && v.length > 0, required: true },
    { field: 'stationId', validator: (v: any) => typeof v === 'string' && v.length > 0, required: true },
    { field: 'scheduledArrival', validator: (v: any) => v instanceof Date && !isNaN(v.getTime()), required: true },
    { field: 'scheduledDeparture', validator: (v: any) => v === undefined || (v instanceof Date && !isNaN(v.getTime())), required: false },
    { field: 'estimatedArrival', validator: (v: any) => v === undefined || (v instanceof Date && !isNaN(v.getTime())), required: false },
    { field: 'estimatedDeparture', validator: (v: any) => v === undefined || (v instanceof Date && !isNaN(v.getTime())), required: false },
    { field: 'actualArrival', validator: (v: any) => v === undefined || (v instanceof Date && !isNaN(v.getTime())), required: false },
    { field: 'actualDeparture', validator: (v: any) => v === undefined || (v instanceof Date && !isNaN(v.getTime())), required: false },
    { field: 'minutesUntilArrival', validator: (v: any) => typeof v === 'number', required: true },
    { field: 'isRealTime', validator: (v: any) => typeof v === 'boolean', required: true },
    { field: 'isScheduled', validator: (v: any) => typeof v === 'boolean', required: true },
    { field: 'confidence', validator: (v: any) => isConfidenceLevel(v), required: true },
    { field: 'stopSequence', validator: (v: any) => typeof v === 'number' && v >= 0, required: true },
    { field: 'isFinalStop', validator: (v: any) => typeof v === 'boolean', required: true },
    { field: 'delayMinutes', validator: (v: any) => v === undefined || typeof v === 'number', required: false },
    { field: 'lastUpdated', validator: (v: any) => v instanceof Date && !isNaN(v.getTime()), required: true }
  ];

  for (const { field, validator, required } of fieldValidations) {
    if (options.skipFields?.includes(field)) continue;
    
    totalFields++;
    const value = obj[field];
    
    if (required && (value === undefined || value === null)) {
      errors.push({
        field,
        message: `Required field '${field}' is missing`,
        code: 'REQUIRED_FIELD_MISSING',
        severity: 'error'
      });
    } else if (value !== undefined && value !== null) {
      if (validator(value)) {
        validFields++;
        
        // Add logical validation warnings
        if (options.collectWarnings) {
          if (field === 'minutesUntilArrival' && typeof value === 'number' && value < 0) {
            warnings.push({
              field,
              message: 'Vehicle appears to be late (negative minutes until arrival)',
              code: 'LATE_VEHICLE',
              suggestion: 'Check if this is expected behavior'
            });
          }
          
          if (field === 'delayMinutes' && typeof value === 'number' && Math.abs(value) > 60) {
            warnings.push({
              field,
              message: `Large delay of ${value} minutes detected`,
              code: 'LARGE_DELAY',
              suggestion: 'Verify delay calculation is correct'
            });
          }
        }
      } else {
        errors.push({
          field,
          message: `Invalid value for field '${field}'`,
          code: 'INVALID_VALUE',
          severity: 'error',
          metadata: { value, type: typeof value }
        });
      }
    } else if (!required) {
      validFields++;
    }
    
    if (errors.length >= (options.maxErrors || 50)) break;
  }

  // Cross-field validation
  if (errors.length === 0 && options.strictMode) {
    if (obj.scheduledDeparture && obj.scheduledArrival && obj.scheduledDeparture < obj.scheduledArrival) {
      errors.push({
        field: 'scheduledDeparture',
        message: 'Scheduled departure cannot be before scheduled arrival',
        code: 'INVALID_TIME_SEQUENCE',
        severity: 'error'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    data: errors.length === 0 ? obj : undefined,
    summary: {
      totalFields,
      validFields,
      errorFields: errors.length,
      warningFields: warnings.length
    }
  };
}

/**
 * Performs detailed validation of TransformedVehicleData with comprehensive error reporting
 */
export function validateTransformedVehicleData(obj: any, options: ValidationOptions = DEFAULT_VALIDATION_OPTIONS): DetailedValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  let validFields = 0;
  let totalFields = 0;

  if (!obj || typeof obj !== 'object') {
    errors.push({
      field: 'root',
      message: 'Input must be an object',
      code: 'INVALID_TYPE',
      severity: 'error'
    });
    
    return {
      isValid: false,
      errors,
      warnings,
      summary: { totalFields: 0, validFields: 0, errorFields: 1, warningFields: 0 }
    };
  }

  const requiredMaps = ['vehicles', 'schedules', 'directions', 'displayData', 'routeInfo', 'stationInfo', 'vehiclesByRoute', 'vehiclesByStation'];
  const requiredSets = ['favoriteVehicles', 'realTimeVehicles', 'scheduledVehicles', 'vehiclesWithErrors', 'vehiclesWithWarnings'];
  const requiredArrays = ['sortedByArrival', 'sortedByDistance', 'sortedByPriority'];

  // Validate Map fields
  for (const field of requiredMaps) {
    totalFields++;
    if (!(obj[field] instanceof Map)) {
      errors.push({
        field,
        message: `Field '${field}' must be a Map`,
        code: 'INVALID_TYPE',
        severity: 'error'
      });
    } else {
      validFields++;
    }
  }

  // Validate Set fields
  for (const field of requiredSets) {
    totalFields++;
    if (!(obj[field] instanceof Set)) {
      errors.push({
        field,
        message: `Field '${field}' must be a Set`,
        code: 'INVALID_TYPE',
        severity: 'error'
      });
    } else {
      validFields++;
    }
  }

  // Validate Array fields
  for (const field of requiredArrays) {
    totalFields++;
    if (!Array.isArray(obj[field])) {
      errors.push({
        field,
        message: `Field '${field}' must be an Array`,
        code: 'INVALID_TYPE',
        severity: 'error'
      });
    } else {
      validFields++;
    }
  }

  // Validate metadata
  totalFields++;
  if (!obj.metadata || typeof obj.metadata !== 'object') {
    errors.push({
      field: 'metadata',
      message: 'Metadata object is required',
      code: 'REQUIRED_FIELD_MISSING',
      severity: 'error'
    });
  } else {
    validFields++;
    
    // Validate metadata fields
    if (!(obj.metadata.transformedAt instanceof Date)) {
      errors.push({
        field: 'metadata.transformedAt',
        message: 'transformedAt must be a Date',
        code: 'INVALID_TYPE',
        severity: 'error'
      });
    }
    
    if (typeof obj.metadata.vehiclesProcessed !== 'number') {
      errors.push({
        field: 'metadata.vehiclesProcessed',
        message: 'vehiclesProcessed must be a number',
        code: 'INVALID_TYPE',
        severity: 'error'
      });
    }
  }

  // Cross-validation warnings
  if (options.collectWarnings && errors.length === 0) {
    const vehicleCount = obj.vehicles?.size || 0;
    const displayDataCount = obj.displayData?.size || 0;
    
    if (vehicleCount !== displayDataCount) {
      warnings.push({
        field: 'displayData',
        message: `Vehicle count (${vehicleCount}) doesn't match display data count (${displayDataCount})`,
        code: 'COUNT_MISMATCH',
        suggestion: 'Ensure all vehicles have corresponding display data'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    data: errors.length === 0 ? obj : undefined,
    summary: {
      totalFields,
      validFields,
      errorFields: errors.length,
      warningFields: warnings.length
    }
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates an array of objects using a specific validator
 */
export function validateArray<T>(
  arr: any,
  itemValidator: (item: any, options?: ValidationOptions) => boolean,
  options: ValidationOptions = DEFAULT_VALIDATION_OPTIONS
): DetailedValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  if (!Array.isArray(arr)) {
    return {
      isValid: false,
      errors: [{
        field: 'root',
        message: 'Input must be an array',
        code: 'INVALID_TYPE',
        severity: 'error'
      }],
      warnings: [],
      summary: { totalFields: 1, validFields: 0, errorFields: 1, warningFields: 0 }
    };
  }

  let validItems = 0;
  
  for (let i = 0; i < arr.length; i++) {
    if (itemValidator(arr[i], options)) {
      validItems++;
    } else {
      errors.push({
        field: `[${i}]`,
        message: `Invalid item at index ${i}`,
        code: 'INVALID_ARRAY_ITEM',
        severity: 'error'
      });
    }
    
    if (errors.length >= (options.maxErrors || 50)) break;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    data: errors.length === 0 ? arr : undefined,
    summary: {
      totalFields: arr.length,
      validFields: validItems,
      errorFields: errors.length,
      warningFields: warnings.length
    }
  };
}

/**
 * Creates a validation summary from multiple validation results
 */
export function createValidationSummary(results: DetailedValidationResult[]): {
  overallValid: boolean;
  totalErrors: number;
  totalWarnings: number;
  fieldSummary: {
    totalFields: number;
    validFields: number;
    errorFields: number;
    warningFields: number;
  };
} {
  const totalErrors = results.reduce((sum, result) => sum + result.errors.length, 0);
  const totalWarnings = results.reduce((sum, result) => sum + result.warnings.length, 0);
  
  const fieldSummary = results.reduce(
    (acc, result) => ({
      totalFields: acc.totalFields + result.summary.totalFields,
      validFields: acc.validFields + result.summary.validFields,
      errorFields: acc.errorFields + result.summary.errorFields,
      warningFields: acc.warningFields + result.summary.warningFields
    }),
    { totalFields: 0, validFields: 0, errorFields: 0, warningFields: 0 }
  );

  return {
    overallValid: totalErrors === 0,
    totalErrors,
    totalWarnings,
    fieldSummary
  };
}

/**
 * Formats validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string[] {
  return errors.map(error => {
    let message = `${error.field}: ${error.message}`;
    if (error.metadata) {
      message += ` (${JSON.stringify(error.metadata)})`;
    }
    return message;
  });
}

/**
 * Formats validation warnings for display
 */
export function formatValidationWarnings(warnings: ValidationWarning[]): string[] {
  return warnings.map(warning => {
    let message = `${warning.field}: ${warning.message}`;
    if (warning.suggestion) {
      message += ` Suggestion: ${warning.suggestion}`;
    }
    return message;
  });
}

// ============================================================================
// EXPORTED TYPE GUARD COLLECTIONS
// ============================================================================

/**
 * Collection of all core vehicle type guards
 */
export const coreVehicleTypeGuards = {
  isCoordinates,
  isCoreVehicle,
  isDirectionStatus,
  isConfidenceLevel,
  isRouteType
} as const;

/**
 * Collection of all business logic type guards
 */
export const businessLogicTypeGuards = {
  isVehicleSchedule,
  isVehicleDirection,
  isRouteInfo
} as const;

/**
 * Collection of all presentation layer type guards
 */
export const presentationLayerTypeGuards = {
  isTransformationContext,
  isVehicleDisplayData,
  isTransformedVehicleData,
  isTransformationStation,
  isUserPreferences
} as const;

/**
 * Collection of all transformation pipeline type guards
 */
export const transformationPipelineTypeGuards = {
  isTransformationError,
  isValidationFailure,
  isValidationSuccess
} as const;

/**
 * Collection of all type guards
 */
export const allTypeGuards = {
  ...coreVehicleTypeGuards,
  ...businessLogicTypeGuards,
  ...presentationLayerTypeGuards,
  ...transformationPipelineTypeGuards
} as const;