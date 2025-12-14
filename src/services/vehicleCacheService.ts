import { enhancedTranzyApi } from './enhancedTranzyApi';
import { logger } from '../utils/logger';

interface CachedVehicleData {
  vehicles: Map<string, any[]>; // route_id -> vehicles[]
  lastUpdate: Date;
  agencyId: number;
}

class VehicleCacheService {
  private cache: CachedVehicleData | null = null;
  private readonly CACHE_DURATION = 30 * 1000; // 30 seconds cache

  /**
   * Get vehicles for specific routes, using cache when possible
   */
  async getVehiclesForRoutes(
    agencyId: number, 
    routeIds: string[]
  ): Promise<Map<string, any[]>> {
    // Check if cache is valid
    if (this.isCacheValid(agencyId)) {
      logger.debug('Using cached vehicle data', { 
        agencyId, 
        cacheAge: Date.now() - this.cache!.lastUpdate.getTime() 
      });
      return this.filterCacheForRoutes(routeIds);
    }

    // Cache is invalid or missing, fetch fresh data
    logger.info('Fetching fresh vehicle data', { agencyId });
    await this.refreshCache(agencyId);
    
    return this.filterCacheForRoutes(routeIds);
  }

  /**
   * Get all vehicles for an agency, grouped by route_id
   */
  async getAllVehicles(agencyId: number): Promise<Map<string, any[]>> {
    if (this.isCacheValid(agencyId)) {
      logger.debug('Using cached vehicle data for all vehicles', { 
        agencyId, 
        cacheAge: Date.now() - this.cache!.lastUpdate.getTime() 
      });
      return new Map(this.cache!.vehicles);
    }

    await this.refreshCache(agencyId);
    return new Map(this.cache!.vehicles);
  }

  /**
   * Force refresh the vehicle cache
   */
  async refreshCache(agencyId: number): Promise<void> {
    try {
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

      // Update cache
      this.cache = {
        vehicles: vehiclesByRoute,
        lastUpdate: new Date(),
        agencyId
      };

      console.log('✅ CACHED vehicle data:', {
        totalVehicles: allVehiclesRaw.length,
        activeVehicles: activeVehicleCount,
        routesWithVehicles: vehiclesByRoute.size,
        cacheTimestamp: this.cache.lastUpdate.toISOString()
      });

      logger.info('Vehicle cache refreshed', {
        agencyId,
        totalVehicles: allVehiclesRaw.length,
        activeVehicles: activeVehicleCount,
        routesWithVehicles: vehiclesByRoute.size
      });

    } catch (error) {
      logger.error('Failed to refresh vehicle cache', { agencyId, error });
      throw error;
    }
  }

  /**
   * Check if current cache is valid
   */
  private isCacheValid(agencyId: number): boolean {
    if (!this.cache) {
      return false;
    }

    if (this.cache.agencyId !== agencyId) {
      return false;
    }

    const cacheAge = Date.now() - this.cache.lastUpdate.getTime();
    return cacheAge < this.CACHE_DURATION;
  }

  /**
   * Filter cached vehicles for specific routes
   */
  private filterCacheForRoutes(routeIds: string[]): Map<string, any[]> {
    if (!this.cache) {
      return new Map();
    }

    const result = new Map<string, any[]>();
    for (const routeId of routeIds) {
      const vehicles = this.cache.vehicles.get(routeId) || [];
      if (vehicles.length > 0) {
        result.set(routeId, vehicles);
      }
    }

    return result;
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
    if (!this.cache) {
      return { isValid: false };
    }

    const totalVehicles = Array.from(this.cache.vehicles.values())
      .reduce((sum, vehicles) => sum + vehicles.length, 0);

    return {
      isValid: this.isCacheValid(this.cache.agencyId),
      agencyId: this.cache.agencyId,
      lastUpdate: this.cache.lastUpdate,
      routeCount: this.cache.vehicles.size,
      totalVehicles,
      cacheAge: Date.now() - this.cache.lastUpdate.getTime()
    };
  }

  /**
   * Clear the cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache = null;
    logger.debug('Vehicle cache cleared');
  }
}

export const vehicleCacheService = new VehicleCacheService();