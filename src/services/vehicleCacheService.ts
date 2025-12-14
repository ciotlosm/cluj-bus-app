import { enhancedTranzyApi } from './enhancedTranzyApi';
import { unifiedCache, CacheKeys } from './unifiedCache';
import { logger } from '../utils/logger';

class VehicleCacheService {

  /**
   * Get vehicles for specific routes, using unified cache
   */
  async getVehiclesForRoutes(
    agencyId: number, 
    routeIds: string[]
  ): Promise<Map<string, any[]>> {
    const cacheKey = CacheKeys.vehicles(agencyId);
    
    const allVehiclesRaw = await unifiedCache.get(
      cacheKey,
      () => this.fetchAllVehicles(agencyId)
    );

    // Ensure we have a Map (convert from plain object if needed)
    const allVehicles = this.ensureMap(allVehiclesRaw);

    // Filter for requested routes
    const result = new Map<string, any[]>();
    for (const routeId of routeIds) {
      const vehicles = allVehicles.get(routeId) || [];
      if (vehicles.length > 0) {
        result.set(routeId, vehicles);
      }
    }

    return result;
  }

  /**
   * Get all vehicles for an agency, grouped by route_id
   */
  async getAllVehicles(agencyId: number): Promise<Map<string, any[]>> {
    const cacheKey = CacheKeys.vehicles(agencyId);
    
    const allVehiclesRaw = await unifiedCache.get(
      cacheKey,
      () => this.fetchAllVehicles(agencyId)
    );

    // Ensure we have a Map (convert from plain object if needed)
    return this.ensureMap(allVehiclesRaw);
  }

  /**
   * Force refresh the vehicle cache
   */
  async refreshCache(agencyId: number): Promise<void> {
    const cacheKey = CacheKeys.vehicles(agencyId);
    
    try {
      const vehiclesByRouteRaw = await unifiedCache.get(
        cacheKey,
        () => this.fetchAllVehicles(agencyId),
        true // Force refresh
      );

      const vehiclesByRoute = this.ensureMap(vehiclesByRouteRaw);

      logger.info('Vehicle cache force refreshed', {
        agencyId,
        routesWithVehicles: vehiclesByRoute.size
      });

    } catch (error) {
      logger.error('Failed to refresh vehicle cache', { agencyId, error });
      throw error;
    }
  }

  /**
   * Fetch and process all vehicles for an agency
   */
  private async fetchAllVehicles(agencyId: number): Promise<Map<string, any[]>> {
    console.log('🚌 FETCHING ALL vehicles for agency cache...');
    const allVehiclesRaw = await enhancedTranzyApi.getVehicles(agencyId);
    
    // Group vehicles by route_id
    const vehiclesByRoute = new Map<string, any[]>();
    let activeVehicleCount = 0;
    
    for (const vehicle of allVehiclesRaw) {
      // Only cache vehicles with active trip_id
      const hasActiveTripId = vehicle.tripId !== null && vehicle.tripId !== undefined;
      if (!hasActiveTripId) {
        continue;
      }

      activeVehicleCount++;
      const routeId = vehicle.routeId?.toString();
      if (routeId) {
        if (!vehiclesByRoute.has(routeId)) {
          vehiclesByRoute.set(routeId, []);
        }
        vehiclesByRoute.get(routeId)!.push(vehicle);
      }
    }

    console.log('✅ PROCESSED vehicle data:', {
      totalVehicles: allVehiclesRaw.length,
      activeVehicles: activeVehicleCount,
      routesWithVehicles: vehiclesByRoute.size
    });

    return vehiclesByRoute;
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): {
    isValid: boolean;
    agencyId?: number;
    lastUpdate?: Date;
    routeCount?: number;
    totalVehicles?: number;
    cacheAge?: number;
  } {
    const stats = unifiedCache.getStats();
    
    return {
      isValid: stats.validEntries > 0,
      agencyId: undefined, // Not tracked in unified cache
      lastUpdate: undefined, // Not directly available
      routeCount: stats.validEntries,
      totalVehicles: undefined, // Would need to calculate
      cacheAge: undefined // Not directly available
    };
  }

  /**
   * Clear the cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    unifiedCache.clearAll();
    logger.debug('Vehicle cache cleared');
  }

  /**
   * Ensure the data is a Map, converting from plain object if necessary
   * This handles the case where Map objects get serialized/deserialized from localStorage
   */
  private ensureMap(data: any): Map<string, any[]> {
    if (data instanceof Map) {
      return data;
    }

    // If it's a plain object (from JSON deserialization), convert to Map
    if (data && typeof data === 'object') {
      const map = new Map<string, any[]>();
      
      // Handle both array format (from Map serialization) and object format
      if (Array.isArray(data)) {
        // Array format: [[key, value], [key, value], ...]
        for (const [key, value] of data) {
          map.set(key, value);
        }
      } else {
        // Object format: { key: value, key: value, ... }
        for (const [key, value] of Object.entries(data)) {
          map.set(key, value);
        }
      }
      
      return map;
    }

    // Fallback: return empty Map
    logger.warn('Failed to convert cached data to Map, returning empty Map', { data });
    return new Map<string, any[]>();
  }
}

export const vehicleCacheService = new VehicleCacheService();