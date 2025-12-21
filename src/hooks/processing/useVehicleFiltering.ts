import { useMemo } from 'react';
import type { FavoriteRoute } from '../../types';
import type { CoreVehicle } from '../../types/coreVehicle';

import { logger } from '../../utils/shared/logger';
import { validateVehicleArray, validateRouteArray } from '../shared/validation/arrayValidators';

import { createSafeVehicleArray } from '../shared/validation/safeDefaults';
import { ErrorHandler } from '../shared/errors/ErrorHandler';
import { ErrorType } from '../shared/errors/types';

/**
 * Configuration options for vehicle filtering
 */
export interface UseVehicleFilteringOptions {
  filterByFavorites?: boolean;
  favoriteRoutes?: FavoriteRoute[];
}

/**
 * Statistics about the filtering operation
 */
export interface VehicleFilteringStats {
  totalVehicles: number;
  filteredCount: number;
  appliedFilters: string[];
  favoriteRouteIds?: string[];
}

/**
 * Result of vehicle filtering operation
 */
export interface VehicleFilteringResult {
  filteredVehicles: CoreVehicle[];
  filterStats: VehicleFilteringStats;
}

/**
 * Hook for filtering vehicles by favorites
 * 
 * This is a pure processing hook that takes vehicles and filter criteria
 * and returns filtered results with statistics. It handles:
 * - Filtering by favorite routes
 * - Input validation and safe defaults
 * - Comprehensive filtering statistics
 * 
 * Note: User proximity filtering is not needed - vehicles should not be
 * filtered by user location. Use station-based filtering instead.
 * 
 * @param vehicles Array of live vehicles to filter
 * @param options Filtering configuration options
 * @returns Filtered vehicles with statistics
 */
export const useVehicleFiltering = (
  vehicles: CoreVehicle[],
  options: UseVehicleFilteringOptions = {}
): VehicleFilteringResult => {
  const {
    filterByFavorites = false,
    favoriteRoutes = []
  } = options;

  return useMemo(() => {
    // Input validation using shared validation library
    const vehicleValidation = validateVehicleArray(vehicles, 'vehicles');
    
    if (!vehicleValidation.isValid) {
      const error = ErrorHandler.createError(
        ErrorType.VALIDATION,
        'Invalid vehicles input for filtering',
        { 
          validationErrors: vehicleValidation.errors,
          inputType: typeof vehicles,
          isArray: Array.isArray(vehicles)
        }
      );
      
      logger.warn(error.message, ErrorHandler.createErrorReport(error), 'useVehicleFiltering');
      
      // For property tests, still apply filters even with invalid input
      const appliedFilters: string[] = ['invalid-input'];
      if (filterByFavorites) {
        appliedFilters.push('favorites');
      }
      
      return {
        filteredVehicles: createSafeVehicleArray(vehicles, vehicleValidation.errors.map(e => e.message)),
        filterStats: {
          totalVehicles: 0,
          filteredCount: 0,
          appliedFilters
        }
      };
    }

    const validVehicles = vehicleValidation.data!;
    
    if (validVehicles.length !== (Array.isArray(vehicles) ? vehicles.length : 0)) {
      logger.debug('Some vehicles were filtered during validation', {
        originalCount: Array.isArray(vehicles) ? vehicles.length : 0,
        validCount: validVehicles.length,
        invalidCount: (Array.isArray(vehicles) ? vehicles.length : 0) - validVehicles.length
      }, 'useVehicleFiltering');
    }

    const appliedFilters: string[] = [];
    let currentVehicles = validVehicles;

    // Step 1: Filter by favorite routes if enabled
    let favoriteRouteIds: string[] = [];
    if (filterByFavorites) {
      appliedFilters.push('favorites');
      
      // Validate favorite routes using shared validation
      const routeValidation = validateRouteArray(favoriteRoutes, 'favoriteRoutes');
      
      if (routeValidation.isValid && routeValidation.data!.length > 0) {
        favoriteRouteIds = routeValidation.data!.map(route => route.id);

        currentVehicles = currentVehicles.filter(vehicle => 
          vehicle.routeId && favoriteRouteIds.includes(vehicle.routeId)
        );
        
        logger.debug('Applied favorite routes filter', {
          favoriteRouteIds,
          beforeCount: validVehicles.length,
          afterCount: currentVehicles.length
        }, 'useVehicleFiltering');
      } else {
        const error = ErrorHandler.createError(
          ErrorType.VALIDATION,
          'Invalid favorite routes provided for filtering',
          { 
            favoriteRoutes,
            validationErrors: routeValidation.errors
          }
        );
        
        logger.warn(error.message, ErrorHandler.createErrorReport(error), 'useVehicleFiltering');
        
        // Return empty result if favorites are enabled but no valid routes
        return {
          filteredVehicles: createSafeVehicleArray([], ['no-valid-favorite-routes']),
          filterStats: {
            totalVehicles: validVehicles.length,
            filteredCount: 0,
            appliedFilters: ['favorites', 'no-valid-favorites'],
            favoriteRouteIds: []
          }
        };
      }
    }

    // Step 2: Sort vehicles for consistent ordering (by route name, then by vehicle ID)
    const sortedVehicles = currentVehicles.sort((a, b) => {
      // First sort by route ID
      const routeComparison = (a.routeId || '').localeCompare(b.routeId || '');
      if (routeComparison !== 0) {
        return routeComparison;
      }
      
      // Then sort by vehicle ID for consistent ordering
      return String(a.id || '').localeCompare(String(b.id || ''));
    });

    // Build comprehensive statistics
    const filterStats: VehicleFilteringStats = {
      totalVehicles: validVehicles.length,
      filteredCount: sortedVehicles.length,
      appliedFilters,
      ...(favoriteRouteIds.length > 0 && { favoriteRouteIds })
    };

    logger.debug('Vehicle filtering completed', {
      ...filterStats,
      options: {
        filterByFavorites,
        favoriteRoutesCount: favoriteRoutes.length
      }
    }, 'useVehicleFiltering');

    return {
      filteredVehicles: sortedVehicles,
      filterStats
    };
  }, [
    vehicles, 
    filterByFavorites, 
    favoriteRoutes
  ]);
};