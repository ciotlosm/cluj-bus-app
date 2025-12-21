import type { 
  SafeDefaultsConfig 
} from './types';
import type { 
  Coordinates, 
  Station, 
  CoreVehicle
} from '../../../types';
import { logger } from '../../../utils/shared/logger';

/**
 * Default configuration for safe defaults
 */
const DEFAULT_CONFIG: SafeDefaultsConfig = {
  useEmptyArrays: true,
  useZeroCoordinates: false, // Cluj-Napoca coordinates by default
  logWarnings: true
};

/**
 * Cluj-Napoca city center coordinates as safe default
 */
const CLUJ_CENTER_COORDINATES: Coordinates = {
  latitude: 46.7712,
  longitude: 23.6236
};

/**
 * Creates safe default values for various data types
 * Consolidates safe default creation logic used across processing hooks
 * 
 * Requirements: 4.5
 */
export function createSafeDefaults<T>(
  type: string,
  config: SafeDefaultsConfig = DEFAULT_CONFIG
): T {
  const logWarning = (message: string, context?: Record<string, unknown>) => {
    if (config.logWarnings) {
      logger.warn(`Safe defaults: ${message}`, context);
    }
  };

  switch (type.toLowerCase()) {
    case 'coordinates':
      if (config.useZeroCoordinates) {
        logWarning('Using zero coordinates as safe default');
        return { latitude: 0, longitude: 0 } as T;
      } else {
        logWarning('Using Cluj-Napoca center coordinates as safe default');
        return CLUJ_CENTER_COORDINATES as T;
      }

    case 'station':
      logWarning('Creating safe default station');
      return {
        id: 'default-station',
        name: 'Unknown Station',
        coordinates: config.useZeroCoordinates 
          ? { latitude: 0, longitude: 0 }
          : CLUJ_CENTER_COORDINATES,
        isFavorite: false
      } as T;

    case 'corevehicle':
    case 'vehicle':
      logWarning('Creating safe default vehicle');
      return {
        id: 'default-vehicle',
        routeId: 'unknown',
        label: 'Unknown',
        position: config.useZeroCoordinates 
          ? { latitude: 0, longitude: 0 }
          : CLUJ_CENTER_COORDINATES,
        timestamp: new Date(),
        speed: 0,
        isWheelchairAccessible: false,
        isBikeAccessible: false
      } as T;

    case 'array':
    case 'vehicles':
    case 'stations':
    case 'routes':
      if (config.useEmptyArrays) {
        logWarning(`Creating empty array for ${type}`);
        return [] as T;
      } else {
        logWarning(`Creating null for ${type} (empty arrays disabled)`);
        return null as T;
      }

    case 'errorstate':
    case 'error':
      logWarning('Creating safe default error state');
      return {
        type: 'validation',
        message: 'Invalid input data provided',
        timestamp: new Date(),
        retryable: false
      } as T;

    case 'string':
      logWarning('Creating empty string as safe default');
      return '' as T;

    case 'number':
      logWarning('Creating zero as safe default number');
      return 0 as T;

    case 'boolean':
      logWarning('Creating false as safe default boolean');
      return false as T;

    case 'date':
      logWarning('Creating current date as safe default');
      return new Date() as T;

    case 'object':
      logWarning('Creating empty object as safe default');
      return {} as T;

    default:
      logWarning(`Unknown type '${type}', creating null as safe default`);
      return null as T;
  }
}

/**
 * Creates safe defaults for vehicle arrays with validation context
 * 
 * Requirements: 4.5
 */
export function createSafeVehicleArray(
  originalInput: unknown,
  validationErrors: string[] = [],
  config: SafeDefaultsConfig = DEFAULT_CONFIG
): CoreVehicle[] {
  if (config.logWarnings) {
    logger.warn('Creating safe default vehicle array due to validation failure', {
      originalInputType: typeof originalInput,
      validationErrors,
      isArray: Array.isArray(originalInput),
      arrayLength: Array.isArray(originalInput) ? originalInput.length : 'N/A'
    });
  }

  return config.useEmptyArrays ? [] : createSafeDefaults<CoreVehicle[]>('vehicles', config);
}

/**
 * Creates safe defaults for station arrays with validation context
 * 
 * Requirements: 4.5
 */
export function createSafeStationArray(
  originalInput: unknown,
  validationErrors: string[] = [],
  config: SafeDefaultsConfig = DEFAULT_CONFIG
): Station[] {
  if (config.logWarnings) {
    logger.warn('Creating safe default station array due to validation failure', {
      originalInputType: typeof originalInput,
      validationErrors,
      isArray: Array.isArray(originalInput),
      arrayLength: Array.isArray(originalInput) ? originalInput.length : 'N/A'
    });
  }

  return config.useEmptyArrays ? [] : createSafeDefaults<Station[]>('stations', config);
}

/**
 * Creates safe coordinates with validation context
 * 
 * Requirements: 4.5
 */
export function createSafeCoordinates(
  originalInput: unknown,
  validationErrors: string[] = [],
  config: SafeDefaultsConfig = DEFAULT_CONFIG
): Coordinates {
  if (config.logWarnings) {
    logger.warn('Creating safe default coordinates due to validation failure', {
      originalInput,
      validationErrors
    });
  }

  return createSafeDefaults<Coordinates>('coordinates', config);
}

/**
 * Factory function for creating type-safe default creators
 * 
 * Requirements: 4.5
 */
export function createSafeDefaultFactory<T>(
  type: string,
  config: SafeDefaultsConfig = DEFAULT_CONFIG
): (originalInput?: unknown, validationErrors?: string[]) => T {
  return (originalInput?: unknown, validationErrors: string[] = []) => {
    if (config.logWarnings && originalInput !== undefined) {
      logger.warn(`Creating safe default ${type} due to validation failure`, {
        originalInputType: typeof originalInput,
        validationErrors
      });
    }

    return createSafeDefaults<T>(type, config);
  };
}

/**
 * Validates input and returns safe defaults on failure
 * Combines validation with safe default creation
 * 
 * Requirements: 4.5
 */
export function validateOrDefault<T>(
  input: unknown,
  validator: (value: unknown) => boolean,
  defaultType: string,
  config: SafeDefaultsConfig = DEFAULT_CONFIG
): T {
  try {
    if (validator(input)) {
      return input as T;
    }
  } catch (error) {
    if (config.logWarnings) {
      logger.warn('Validation threw error, using safe default', {
        error: error instanceof Error ? error.message : String(error),
        inputType: typeof input,
        defaultType
      });
    }
  }

  return createSafeDefaults<T>(defaultType, config);
}