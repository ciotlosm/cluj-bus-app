import { useMemo } from 'react';
import type { Coordinates } from '../../types';
import { calculateDistance } from '../../utils/data-processing/distanceUtils';
import { logger } from '../../utils/shared/logger';
import { validateCoordinates } from '../shared/validation/coordinateValidators';
import { ErrorHandler } from '../shared/errors/ErrorHandler';
import { ErrorType } from '../shared/errors/types';

/**
 * Result of proximity calculation
 */
export interface ProximityResult {
  distance: number; // Distance in meters
  withinRadius: boolean; // Whether the distance is within the specified radius
}

/**
 * Hook for calculating distances between coordinates
 * 
 * This is a pure processing hook that takes two coordinate pairs and calculates
 * the distance between them. It handles:
 * - Haversine distance calculations between coordinates
 * - Radius checking for proximity detection
 * - Input validation for coordinate ranges
 * - Safe defaults for invalid inputs
 * 
 * Useful for station-to-station proximity checks.
 * 
 * @param from Starting coordinates
 * @param to Destination coordinates
 * @param maxRadius Optional maximum radius in meters for withinRadius check
 * @returns Proximity calculation result with distance and radius check
 */
export const useProximityCalculation = (
  from: Coordinates | null,
  to: Coordinates | null,
  maxRadius?: number
): ProximityResult => {
  return useMemo(() => {
    const safeDefaults = {
      distance: Infinity,
      withinRadius: false
    };

    // Input validation using shared validation library
    const fromValidation = validateCoordinates(from, 'from');
    if (!fromValidation.isValid) {
      const error = ErrorHandler.createError(
        ErrorType.VALIDATION,
        'Invalid "from" coordinates provided for proximity calculation',
        { 
          from,
          validationErrors: fromValidation.errors
        }
      );
      
      logger.debug(error.message, ErrorHandler.createErrorReport(error), 'useProximityCalculation');
      return safeDefaults;
    }

    const toValidation = validateCoordinates(to, 'to');
    if (!toValidation.isValid) {
      const error = ErrorHandler.createError(
        ErrorType.VALIDATION,
        'Invalid "to" coordinates provided for proximity calculation',
        { 
          to,
          validationErrors: toValidation.errors
        }
      );
      
      logger.debug(error.message, ErrorHandler.createErrorReport(error), 'useProximityCalculation');
      return safeDefaults;
    }

    try {
      // Use validated coordinates
      const validFrom = fromValidation.data!;
      const validTo = toValidation.data!;

      // Calculate distance using the haversine formula
      const distance = calculateDistance(validFrom, validTo);

      // Check if within radius
      const withinRadius = maxRadius !== undefined ? distance <= maxRadius : true;

      const result: ProximityResult = {
        distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
        withinRadius
      };

      logger.debug('Proximity calculation completed', {
        from: validFrom,
        to: validTo,
        result,
        maxRadius
      }, 'useProximityCalculation');

      return result;

    } catch (error) {
      const calcError = ErrorHandler.createError(
        ErrorType.PROCESSING,
        'Proximity calculation failed',
        {
          from: fromValidation.data,
          to: toValidation.data,
          maxRadius,
          originalError: error instanceof Error ? error : new Error(String(error))
        }
      );

      logger.warn(calcError.message, ErrorHandler.createErrorReport(calcError), 'useProximityCalculation');
      return safeDefaults;
    }
  }, [from, to, maxRadius]);
};

