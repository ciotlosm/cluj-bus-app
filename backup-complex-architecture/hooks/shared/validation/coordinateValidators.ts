import type { 
  ValidationResult, 
  CoordinateBounds 
} from './types';
import type { Coordinates } from '../../../types';
import { InputValidator } from './InputValidator';

/**
 * Default coordinate bounds for Earth
 */
export const DEFAULT_COORDINATE_BOUNDS: CoordinateBounds = {
  minLatitude: -90,
  maxLatitude: 90,
  minLongitude: -180,
  maxLongitude: 180
};

/**
 * Validates coordinate objects
 * Consolidates coordinate validation logic used across processing hooks
 * 
 * Requirements: 4.3, 4.4
 */
export function validateCoordinates(
  input: unknown,
  fieldName: string = 'coordinates',
  bounds: CoordinateBounds = DEFAULT_COORDINATE_BOUNDS
): ValidationResult<Coordinates> {
  // Check if input is an object
  const objectResult = InputValidator.validateObject(
    input,
    fieldName,
    ['latitude', 'longitude']
  );
  
  if (!objectResult.isValid) {
    return {
      isValid: false,
      data: null,
      errors: objectResult.errors
    };
  }

  const coords = input as Record<string, unknown>;

  // Validate latitude
  const latResult = InputValidator.validateNumber(
    coords.latitude,
    'latitude',
    bounds.minLatitude,
    bounds.maxLatitude
  );
  
  if (!latResult.isValid) {
    return {
      isValid: false,
      data: null,
      errors: latResult.errors.map(error => ({
        ...error,
        field: `${fieldName}.${error.field}`
      }))
    };
  }

  // Validate longitude
  const lngResult = InputValidator.validateNumber(
    coords.longitude,
    'longitude',
    bounds.minLongitude,
    bounds.maxLongitude
  );
  
  if (!lngResult.isValid) {
    return {
      isValid: false,
      data: null,
      errors: lngResult.errors.map(error => ({
        ...error,
        field: `${fieldName}.${error.field}`
      }))
    };
  }

  // Validate optional accuracy field (allow null)
  if (coords.accuracy !== undefined && coords.accuracy !== null) {
    const accuracyResult = InputValidator.validateNumber(
      coords.accuracy,
      'accuracy',
      0 // Accuracy must be non-negative
    );
    
    if (!accuracyResult.isValid) {
      return {
        isValid: false,
        data: null,
        errors: accuracyResult.errors.map(error => ({
          ...error,
          field: `${fieldName}.${error.field}`
        }))
      };
    }
  }

  return InputValidator.success({
    latitude: coords.latitude as number,
    longitude: coords.longitude as number,
    ...(coords.accuracy !== undefined && { accuracy: coords.accuracy as number })
  });
}

/**
 * Validates coordinate bounds object
 * 
 * Requirements: 4.4
 */
export function validateBounds(
  input: unknown,
  fieldName: string = 'bounds'
): ValidationResult<CoordinateBounds> {
  // Check if input is an object
  const objectResult = InputValidator.validateObject(
    input,
    fieldName,
    ['minLatitude', 'maxLatitude', 'minLongitude', 'maxLongitude']
  );
  
  if (!objectResult.isValid) {
    return {
      isValid: false,
      data: null,
      errors: objectResult.errors
    };
  }

  const bounds = input as Record<string, unknown>;

  // Validate all bound values
  const minLatResult = InputValidator.validateNumber(bounds.minLatitude, 'minLatitude', -90, 90);
  const maxLatResult = InputValidator.validateNumber(bounds.maxLatitude, 'maxLatitude', -90, 90);
  const minLngResult = InputValidator.validateNumber(bounds.minLongitude, 'minLongitude', -180, 180);
  const maxLngResult = InputValidator.validateNumber(bounds.maxLongitude, 'maxLongitude', -180, 180);

  // Collect all validation errors
  const errors = [
    ...minLatResult.errors,
    ...maxLatResult.errors,
    ...minLngResult.errors,
    ...maxLngResult.errors
  ].map(error => ({
    ...error,
    field: `${fieldName}.${error.field}`
  }));

  if (errors.length > 0) {
    return {
      isValid: false,
      data: null,
      errors
    };
  }

  // Validate logical constraints
  const minLat = bounds.minLatitude as number;
  const maxLat = bounds.maxLatitude as number;
  const minLng = bounds.minLongitude as number;
  const maxLng = bounds.maxLongitude as number;

  if (minLat >= maxLat) {
    return InputValidator.failure<CoordinateBounds>(
      `${fieldName}.minLatitude`,
      'minLatitude must be less than maxLatitude'
    );
  }

  if (minLng >= maxLng) {
    return InputValidator.failure<CoordinateBounds>(
      `${fieldName}.minLongitude`,
      'minLongitude must be less than maxLongitude'
    );
  }

  return InputValidator.success({
    minLatitude: minLat,
    maxLatitude: maxLat,
    minLongitude: minLng,
    maxLongitude: maxLng
  });
}

/**
 * Validates that coordinates are within specified bounds
 * 
 * Requirements: 4.4
 */
export function validateCoordinatesWithinBounds(
  coordinates: Coordinates,
  bounds: CoordinateBounds,
  fieldName: string = 'coordinates'
): ValidationResult<Coordinates> {
  const { latitude, longitude } = coordinates;
  const { minLatitude, maxLatitude, minLongitude, maxLongitude } = bounds;

  if (latitude < minLatitude || latitude > maxLatitude) {
    return InputValidator.failure<Coordinates>(
      `${fieldName}.latitude`,
      `Latitude ${latitude} is outside bounds [${minLatitude}, ${maxLatitude}]`
    );
  }

  if (longitude < minLongitude || longitude > maxLongitude) {
    return InputValidator.failure<Coordinates>(
      `${fieldName}.longitude`,
      `Longitude ${longitude} is outside bounds [${minLongitude}, ${maxLongitude}]`
    );
  }

  return InputValidator.success(coordinates);
}

/**
 * Creates coordinate bounds for a specific region
 * Useful for validating coordinates within city or country bounds
 * 
 * Requirements: 4.4
 */
export function createRegionalBounds(
  centerLat: number,
  centerLng: number,
  radiusKm: number
): CoordinateBounds {
  // Approximate conversion: 1 degree latitude ≈ 111 km
  // 1 degree longitude ≈ 111 km * cos(latitude)
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180));

  return {
    minLatitude: Math.max(-90, centerLat - latDelta),
    maxLatitude: Math.min(90, centerLat + latDelta),
    minLongitude: Math.max(-180, centerLng - lngDelta),
    maxLongitude: Math.min(180, centerLng + lngDelta)
  };
}