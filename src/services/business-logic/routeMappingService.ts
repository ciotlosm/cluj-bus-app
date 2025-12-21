import { enhancedTranzyApi } from '../api/tranzyApiService';
import { agencyService } from '../api/agencyService';
import { useConfigStore } from '../../stores/configStore';
import { logger } from '../../utils/shared/logger';
import { RouteType } from '../../types';

export interface RouteMapping {
  routeName: string; // What users see: "42", "43B", etc.
  routeId: string;        // Internal API ID: "40", "42", etc.
  routeDesc: string;  // Full name: "P-ta M. Viteazul - Str. Campului"
  routeDescription?: string;
  routeType: RouteType;
}

class RouteMappingService {
  private routeMappingCache = new Map<string, RouteMapping[]>(); // cityName -> mappings
  private cacheExpiry = new Map<string, number>(); // cityName -> timestamp

  /**
   * Get route ID from route name (what users see)
   * Example: "42" -> "40"
   */
  async getRouteIdFromName(routeName: string, cityName: string): Promise<string | null> {
    try {
      const mappings = await this.getRouteMappings(cityName);
      const mapping = mappings.find(m => m.routeName === routeName);
      return mapping?.routeId || null;
    } catch (error) {
      logger.error('Failed to get route ID from route name', { routeName, cityName, error });
      return null;
    }
  }

  /**
   * Get route name from route ID (for display)
   * Example: "40" -> "42"
   */
  async getRouteNameFromId(routeId: string, cityName: string): Promise<string | null> {
    try {
      const mappings = await this.getRouteMappings(cityName);
      const mapping = mappings.find(m => m.routeId === routeId);
      return mapping?.routeName || null;
    } catch (error) {
      logger.error('Failed to get route name from ID', { routeId, cityName, error });
      return null;
    }
  }

  /**
   * Get full route mapping from route name
   * Example: "42" -> { routeName: "42", routeId: "40", routeDesc: "...", ... }
   */
  async getRouteMappingFromName(routeName: string, cityName: string): Promise<RouteMapping | null> {
    try {
      const mappings = await this.getRouteMappings(cityName);
      return mappings.find(m => m.routeName === routeName) || null;
    } catch (error) {
      logger.error('Failed to get route mapping from route name', { routeName, cityName, error });
      return null;
    }
  }

  /**
   * Get full route mapping from route ID
   * Example: "40" -> { routeName: "42", routeId: "40", routeDesc: "...", ... }
   */
  async getRouteMappingFromId(routeId: string, cityName: string): Promise<RouteMapping | null> {
    try {
      const mappings = await this.getRouteMappings(cityName);
      return mappings.find(m => m.routeId === routeId) || null;
    } catch (error) {
      logger.error('Failed to get route mapping from ID', { routeId, cityName, error });
      return null;
    }
  }

  /**
   * Convert array of route names to route IDs for API calls
   * Example: ["42", "43B"] -> ["40", "42"]
   */
  async convertRouteNamesToIds(routeNames: string[], cityName: string): Promise<string[]> {
    try {
      const mappings = await this.getRouteMappings(cityName);
      const routeIds: string[] = [];

      for (const routeName of routeNames) {
        const mapping = mappings.find(m => m.routeName === routeName);
        if (mapping) {
          routeIds.push(mapping.routeId);
        } else {
          logger.warn('No route ID found for route name', { routeName, cityName });
        }
      }

      return routeIds;
    } catch (error) {
      logger.error('Failed to convert route names to IDs', { routeNames, cityName, error });
      return [];
    }
  }

  /**
   * Convert array of route IDs to route names for display
   * Example: ["40", "42"] -> ["42", "43B"]
   */
  async convertIdsToRouteNames(routeIds: string[], cityName: string): Promise<string[]> {
    try {
      const mappings = await this.getRouteMappings(cityName);
      const routeNames: string[] = [];

      for (const routeId of routeIds) {
        const mapping = mappings.find(m => m.routeId === routeId);
        if (mapping) {
          routeNames.push(mapping.routeName);
        } else {
          logger.warn('No route name found for route ID', { routeId, cityName });
        }
      }

      return routeNames;
    } catch (error) {
      logger.error('Failed to convert IDs to route names', { routeIds, cityName, error });
      return [];
    }
  }

  /**
   * Get all available routes for user selection (showing route names)
   */
  async getAvailableRoutesForUser(cityName: string): Promise<{
    id: string;
    routeName: string;
    routeDesc: string;
    description?: string;
    type: 'bus' | 'trolleybus' | 'tram' | 'metro' | 'rail' | 'ferry' | 'other';
  }[]> {
    try {
      const mappings = await this.getRouteMappings(cityName);
      return mappings.map(mapping => ({
        id: mapping.routeId,
        routeName: mapping.routeName,
        routeDesc: mapping.routeDesc,
        description: mapping.routeDescription,
        type: mapping.routeType
      })).sort((a, b) => {
        // Sort numerically if possible, otherwise alphabetically
        const aNum = parseInt(a.routeName);
        const bNum = parseInt(b.routeName);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        return a.routeName.localeCompare(b.routeName);
      });
    } catch (error) {
      logger.error('Failed to get available routes for user', { cityName, error });
      return [];
    }
  }

  /**
   * Get cache duration from user's refresh rate setting
   * Uses 10x the refresh rate since route data changes less frequently than live data
   */
  private getCacheDuration(): number {
    const { config } = useConfigStore.getState();
    const refreshRate = config?.refreshRate || 30000; // Default to 30 seconds if not configured
    return refreshRate * 10; // Cache for 10x longer than refresh rate (e.g., 5 minutes if refresh is 30s)
  }

  /**
   * Get all route mappings for a city (cached)
   */
  private async getRouteMappings(cityName: string): Promise<RouteMapping[]> {
    // Check cache
    const cached = this.routeMappingCache.get(cityName);
    const cacheTime = this.cacheExpiry.get(cityName);
    const cacheDuration = this.getCacheDuration();
    
    if (cached && cacheTime && Date.now() - cacheTime < cacheDuration) {
      return cached;
    }

    // Fetch fresh data
    try {
      const agencyId = await agencyService.getAgencyIdForCity(cityName);
      if (!agencyId) {
        logger.warn('No agency found for city', { cityName });
        return [];
      }

      const routes = await enhancedTranzyApi.getRoutes(agencyId, false);
      const mappings: RouteMapping[] = routes.map(route => ({
        routeName: route.routeName || route.id,
        routeId: route.id,
        routeDesc: route.routeDesc || route.routeName || `Route ${route.id}`,
        routeDescription: route.routeDesc, // Use routeDesc for description
        routeType: route.type || RouteType.BUS
      }));

      // Cache the results
      this.routeMappingCache.set(cityName, mappings);
      this.cacheExpiry.set(cityName, Date.now());

      logger.debug('Cached route mappings', { 
        cityName, 
        count: mappings.length,
        cacheDuration: `${this.getCacheDuration() / 1000}s`,
        sample: mappings.slice(0, 3).map(m => `${m.routeName} -> ${m.routeId}`)
      });

      return mappings;
    } catch (error) {
      logger.error('Failed to fetch route mappings', { cityName, error });
      return [];
    }
  }

  /**
   * Clear cache for a city (useful for testing or when data changes)
   */
  clearCache(cityName?: string): void {
    if (cityName) {
      this.routeMappingCache.delete(cityName);
      this.cacheExpiry.delete(cityName);
    } else {
      this.routeMappingCache.clear();
      this.cacheExpiry.clear();
    }
  }

  /**
   * Update cache duration when user changes refresh rate
   * This ensures cache respects the new user preference
   */
  updateCacheDuration(): void {
    // Clear all caches so they use the new duration on next access
    this.clearCache();
    logger.debug('Route mapping cache cleared due to refresh rate change', {
      newCacheDuration: `${this.getCacheDuration() / 1000}s`
    });
  }

  /**
   * Validate that route names exist
   */
  async validateRouteNames(routeNames: string[], cityName: string): Promise<{
    valid: string[];
    invalid: string[];
  }> {
    try {
      const mappings = await this.getRouteMappings(cityName);
      const validRouteNames = mappings.map(m => m.routeName);
      
      const valid = routeNames.filter(name => validRouteNames.includes(name));
      const invalid = routeNames.filter(name => !validRouteNames.includes(name));

      return { valid, invalid };
    } catch (error) {
      logger.error('Failed to validate route names', { routeNames, cityName, error });
      return { valid: [], invalid: routeNames };
    }
  }
}

export const routeMappingService = new RouteMappingService();