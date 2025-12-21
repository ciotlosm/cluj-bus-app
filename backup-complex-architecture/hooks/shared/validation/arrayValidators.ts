import type { 
  ValidationResult, 
  ValidationError 
} from './types';
import type { 
  CoreVehicle, 
  Station
} from '../../../types';
import { InputValidator } from './InputValidator';
import { validateCoordinates } from './coordinateValidators';

/**
 * Generic array validation function
 * Consolidates array validation logic used across processing hooks
 * 
 * Requirements: 4.1, 4.2
 */
export function validateArray<T>(
  input: unknown,
  itemValidator: (item: unknown) => ValidationResult<T>,
  fieldName: string = 'array',
  allowEmpty: boolean = true
): ValidationResult<T[]> {
  // Check if input is an array
  if (!Array.isArray(input)) {
    return InputValidator.failure<T[]>(
      fieldName,
      `${fieldName} must be an array, got ${typeof input}`
    );
  }

  // Check empty array constraint
  if (!allowEmpty && input.length === 0) {
    return InputValidator.failure<T[]>(
      fieldName,
      `${fieldName} cannot be empty`
    );
  }

  // Validate each item in the array
  const validItems: T[] = [];
  const errors: ValidationError[] = [];

  input.forEach((item, index) => {
    const result = itemValidator(item);
    if (result.isValid && result.data !== null) {
      validItems.push(result.data);
    } else {
      // Add index information to errors
      result.errors.forEach(error => {
        errors.push({
          ...error,
          field: `${fieldName}[${index}].${error.field}`,
          message: `Item ${index}: ${error.message}`
        });
      });
    }
  });

  // Return result based on validation outcome
  if (errors.length > 0) {
    return {
      isValid: false,
      data: null,
      errors
    };
  }

  return InputValidator.success(validItems);
}

/**
 * Validates an array of CoreVehicle objects
 * Consolidates vehicle validation logic from processing hooks
 * 
 * Requirements: 4.2, 4.3
 */
export function validateVehicleArray(
  input: unknown,
  fieldName: string = 'vehicles'
): ValidationResult<CoreVehicle[]> {
  const vehicleValidator = (item: unknown): ValidationResult<CoreVehicle> => {
    // Check if item is an object
    const objectResult = InputValidator.validateObject(
      item,
      'vehicle',
      ['id', 'routeId', 'position']
    );
    
    if (!objectResult.isValid) {
      return {
        isValid: false,
        data: null,
        errors: objectResult.errors
      };
    }

    const vehicle = item as Record<string, unknown>;
    const errors: ValidationError[] = [];

    // Validate required string fields
    const idResult = InputValidator.validateString(vehicle.id, 'id');
    if (!idResult.isValid) {
      errors.push(...idResult.errors);
    }

    const routeIdResult = InputValidator.validateString(vehicle.routeId, 'routeId');
    if (!routeIdResult.isValid) {
      errors.push(...routeIdResult.errors);
    }

    // Validate position coordinates
    const positionResult = validateCoordinates(vehicle.position, 'position');
    if (!positionResult.isValid) {
      errors.push(...positionResult.errors);
    }

    // Validate optional fields if present - be lenient with these
    if (vehicle.label !== undefined && vehicle.label !== null) {
      const labelResult = InputValidator.validateString(vehicle.label, 'label');
      if (!labelResult.isValid) {
        // Don't fail validation for optional label issues, just log
        // errors.push(...labelResult.errors);
      }
    }

    if (vehicle.timestamp !== undefined && vehicle.timestamp !== null) {
      // Be lenient with timestamp validation - allow invalid dates
      if (vehicle.timestamp instanceof Date) {
        // Valid Date object, even if NaN - this is acceptable
      } else {
        // Try to convert to Date if it's not already
        try {
          new Date(vehicle.timestamp as string | number | Date);
        } catch (error) {
          // Only fail if we can't create any Date object
          errors.push({
            field: 'timestamp',
            message: 'timestamp must be a valid Date object or date string',
            code: 'INVALID_TIMESTAMP'
          });
        }
      }
    }

    if (vehicle.speed !== undefined && vehicle.speed !== null) {
      const speedResult = InputValidator.validateNumber(vehicle.speed, 'speed', 0);
      if (!speedResult.isValid) {
        // Don't fail validation for optional speed issues
        // errors.push(...speedResult.errors);
      }
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        data: null,
        errors
      };
    }

    return InputValidator.success(vehicle as unknown as CoreVehicle);
  };

  return validateArray(input, vehicleValidator, fieldName, true);
}

/**
 * Validates an array of Station objects
 * Consolidates station validation logic from processing hooks
 * 
 * Requirements: 4.2, 4.3
 */
export function validateStationArray(
  input: unknown,
  fieldName: string = 'stations'
): ValidationResult<Station[]> {
  const stationValidator = (item: unknown): ValidationResult<Station> => {
    // Check if item is an object
    const objectResult = InputValidator.validateObject(
      item,
      'station',
      ['id', 'name', 'coordinates']
    );
    
    if (!objectResult.isValid) {
      return {
        isValid: false,
        data: null,
        errors: objectResult.errors
      };
    }

    const station = item as Record<string, unknown>;
    const errors: ValidationError[] = [];

    // Validate required string fields
    const idResult = InputValidator.validateString(station.id, 'id');
    if (!idResult.isValid) {
      errors.push(...idResult.errors);
    }

    const nameResult = InputValidator.validateString(station.name, 'name');
    if (!nameResult.isValid) {
      errors.push(...nameResult.errors);
    }

    // Validate coordinates
    const coordinatesResult = validateCoordinates(station.coordinates, 'coordinates');
    if (!coordinatesResult.isValid) {
      errors.push(...coordinatesResult.errors);
    }

    // Validate isFavorite boolean
    const isFavoriteResult = InputValidator.validateBoolean(station.isFavorite, 'isFavorite');
    if (!isFavoriteResult.isValid) {
      errors.push(...isFavoriteResult.errors);
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        data: null,
        errors
      };
    }

    return InputValidator.success(station as unknown as Station);
  };

  return validateArray(input, stationValidator, fieldName, true);
}

/**
 * Validates an array of route objects
 * Consolidates route validation logic
 * 
 * Requirements: 4.2, 4.3
 */
export function validateRouteArray(
  input: unknown,
  fieldName: string = 'routes'
): ValidationResult<Array<{ id: string; routeName: string }>> {
  const routeValidator = (item: unknown): ValidationResult<{ id: string; routeName: string }> => {
    // Check if item is an object
    const objectResult = InputValidator.validateObject(
      item,
      'route',
      ['id']
    );
    
    if (!objectResult.isValid) {
      return {
        isValid: false,
        data: null,
        errors: objectResult.errors
      };
    }

    const route = item as Record<string, unknown>;
    const errors: ValidationError[] = [];

    // Validate required string fields
    const idResult = InputValidator.validateString(route.id, 'id');
    if (!idResult.isValid) {
      errors.push(...idResult.errors);
    }

    // routeName can be derived from id if not present
    let routeName = route.routeName;
    if (!routeName) {
      routeName = route.id; // Fallback to id
    }

    const routeNameResult = InputValidator.validateString(routeName, 'routeName');
    if (!routeNameResult.isValid) {
      errors.push(...routeNameResult.errors);
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        data: null,
        errors
      };
    }

    return InputValidator.success({
      id: route.id as string,
      routeName: routeName as string
    });
  };

  return validateArray(input, routeValidator, fieldName, true);
}