/**
 * Intelligent Vehicle Filter Service
 * 
 * This service implements intelligent route-based vehicle filtering that adapts
 * to route activity levels. It applies distance filtering only to busy routes
 * while showing all vehicles for quiet routes, providing better user experience
 * and transparent filtering decisions.
 * 
 * Requirements: 2.1, 2.2, 2.4, 6.1, 6.2, 6.3, 6.5
 */

import type { CoreVehicle, Coordinates } from '../../types/coreVehicle';
import type { TransformationStation, TransformationContext } from '../../types/presentationLayer';
import type { RouteActivityInfo, RouteClassification } from '../business-logic/RouteActivityAnalyzer';
import { RouteClassification as RouteClass } from '../business-logic/RouteActivityAnalyzer';
import { logger } from '../../utils/shared/logger';
import { debugMonitoringService } from '../utilities/DebugMonitoringService';
import type { RouteClassificationDebug } from '../utilities/DebugMonitoringService';

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

/**
 * Context for filtering operations
 */
export interface FilteringContext {
  targetStations: TransformationStation[];
  busyRouteThreshold: number;
  distanceFilterThreshold: number;
  debugMode: boolean;
  transformationContext: TransformationContext;
}

/**
 * Result of filtering operation
 */
export interface FilteringResult {
  filteredVehicles: CoreVehicle[];
  metadata: FilteringMetadata;
  userFeedback: UserFeedbackInfo;
}

/**
 * Metadata about filtering decisions
 */
export interface FilteringMetadata {
  routeActivitySnapshot: RouteActivitySnapshot;
  filteringDecisions: Map<string, FilteringDecision>;
  performanceMetrics: FilteringPerformanceMetrics;
}

/**
 * Snapshot of route activity at filtering time
 */
export interface RouteActivitySnapshot {
  timestamp: Date;
  routeActivities: Map<string, RouteActivityInfo>;
  totalVehicles: number;
  busyRoutes: string[];
  quietRoutes: string[];
}

/**
 * Individual filtering decision for a vehicle
 */
export interface FilteringDecision {
  vehicleId: string;
  routeId: string;
  routeClassification: RouteClassification;
  distanceFilterApplied: boolean;
  distanceToNearestStation?: number;
  included: boolean;
  reason: string;
}

/**
 * Performance metrics for filtering operations
 */
export interface FilteringPerformanceMetrics {
  routeAnalysisTime: number;
  filteringTime: number;
  totalVehiclesProcessed: number;
  vehiclesFiltered: number;
  cacheHitRate: number;
}

/**
 * User feedback information
 */
export interface UserFeedbackInfo {
  totalRoutes: number;
  busyRoutes: number;
  quietRoutes: number;
  distanceFilteredVehicles: number;
  emptyStateMessage?: string;
  routeStatusMessages: Map<string, string>;
}

/**
 * Interface for intelligent vehicle filtering operations
 */
export interface IIntelligentVehicleFilter {
  filterVehicles(
    vehicles: CoreVehicle[],
    routeActivity: Map<string, RouteActivityInfo>,
    context: FilteringContext
  ): FilteringResult;
  
  shouldApplyDistanceFilter(
    routeId: string,
    routeActivity: Map<string, RouteActivityInfo>
  ): boolean;
  
  filterByDistance(
    vehicles: CoreVehicle[],
    stations: TransformationStation[],
    maxDistance: number
  ): CoreVehicle[];
  
  generateUserFeedback(
    routeActivity: Map<string, RouteActivityInfo>,
    filteredVehicles: CoreVehicle[],
    originalVehicles: CoreVehicle[]
  ): UserFeedbackInfo;
  
  // Caching and performance methods
  getCacheStats(): FilteringCacheStats;
  clearCache(): void;
  invalidateCacheForVehicles(vehicleIds: string[]): void;
}

// ============================================================================
// INTELLIGENT VEHICLE FILTER IMPLEMENTATION
// ============================================================================

// ============================================================================
// CACHING INTERFACES AND TYPES
// ============================================================================

/**
 * Cache entry for filtering results
 */
interface FilteringCacheEntry {
  result: FilteringResult;
  timestamp: Date;
  vehicleSignature: string;
  contextSignature: string;
}

/**
 * Cache entry for distance calculations
 */
interface DistanceCacheEntry {
  distance: number;
  timestamp: Date;
}

/**
 * Cache statistics for monitoring
 */
interface FilteringCacheStats {
  size: number;
  hitRate: number;
  missRate: number;
  averageAge: number;
}

// ============================================================================
// INTELLIGENT VEHICLE FILTER IMPLEMENTATION
// ============================================================================

/**
 * Intelligent Vehicle Filter Service Implementation
 * 
 * Provides route-based filtering with intelligent decision-making and
 * transparent user feedback about filtering behavior.
 * 
 * Features caching for performance optimization:
 * - Route activity classification caching
 * - Distance calculation caching
 * - Selective cache invalidation
 */
export class IntelligentVehicleFilter implements IIntelligentVehicleFilter {
  // Caching infrastructure
  private filteringCache = new Map<string, FilteringCacheEntry>();
  private distanceCache = new Map<string, DistanceCacheEntry>();
  private readonly CACHE_TTL_MS = 30 * 1000; // 30 seconds
  private readonly MAX_CACHE_ENTRIES = 100;
  private readonly DISTANCE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  
  // Performance tracking
  private cacheHits = 0;
  private cacheMisses = 0;
  /**
   * Filter vehicles based on route activity and distance
   * 
   * @param vehicles - Array of vehicles to filter
   * @param routeActivity - Map of route activity information
   * @param context - Filtering context with configuration
   * @returns Filtering result with metadata and user feedback
   * 
   * Requirements 2.1, 2.2: Apply distance filtering only to busy routes
   * Requirements 5.2, 5.3, 5.4: Caching and performance optimization
   */
  filterVehicles(
    vehicles: CoreVehicle[],
    routeActivity: Map<string, RouteActivityInfo>,
    context: FilteringContext
  ): FilteringResult {
    const startTime = performance.now();
    
    // Check cache first
    const cacheKey = this.generateFilteringCacheKey(vehicles, routeActivity, context);
    const cachedResult = this.getCachedFilteringResult(cacheKey);
    
    if (cachedResult) {
      this.cacheHits++;
      logger.debug('Returning cached filtering result', {
        cacheKey,
        vehicleCount: cachedResult.filteredVehicles.length,
        cacheHit: true
      });
      
      // Update cache hit rate in performance metrics
      const updatedMetrics = {
        ...cachedResult.metadata.performanceMetrics,
        cacheHitRate: this.getCacheHitRate()
      };
      
      return {
        ...cachedResult,
        metadata: {
          ...cachedResult.metadata,
          performanceMetrics: updatedMetrics
        }
      };
    }
    
    this.cacheMisses++;
    
    logger.debug('Starting intelligent vehicle filtering', {
      totalVehicles: vehicles.length,
      totalRoutes: routeActivity.size,
      busyThreshold: context.busyRouteThreshold,
      distanceThreshold: context.distanceFilterThreshold,
      debugMode: context.debugMode,
      cacheKey
    });
    
    // Create snapshot of route activity
    const snapshot = this.createRouteActivitySnapshot(routeActivity, vehicles);
    
    // Process each vehicle and make filtering decisions
    const filteringDecisions = new Map<string, FilteringDecision>();
    const filteredVehicles: CoreVehicle[] = [];
    
    for (const vehicle of vehicles) {
      const decision = this.makeFilteringDecision(
        vehicle,
        routeActivity,
        context
      );
      
      filteringDecisions.set(vehicle.id, decision);
      
      // Log filtering decision for debugging
      debugMonitoringService.logFilteringDecision(decision, {
        totalVehicles: vehicles.length,
        busyRoutes: snapshot.busyRoutes.length,
        quietRoutes: snapshot.quietRoutes.length,
        debugMode: context.debugMode
      });
      
      if (decision.included) {
        filteredVehicles.push(vehicle);
      }
      
      // Log decision if debug mode is enabled
      if (context.debugMode) {
        logger.debug('Filtering decision made', {
          vehicleId: vehicle.id,
          routeId: vehicle.routeId,
          classification: decision.routeClassification,
          distanceFilterApplied: decision.distanceFilterApplied,
          included: decision.included,
          reason: decision.reason
        });
      }
    }
    
    // Calculate performance metrics
    const endTime = performance.now();
    const performanceMetrics: FilteringPerformanceMetrics = {
      routeAnalysisTime: 0, // Provided by RouteActivityAnalyzer
      filteringTime: endTime - startTime,
      totalVehiclesProcessed: vehicles.length,
      vehiclesFiltered: vehicles.length - filteredVehicles.length,
      cacheHitRate: this.getCacheHitRate()
    };
    
    // Generate user feedback
    const userFeedback = this.generateUserFeedback(
      routeActivity,
      filteredVehicles,
      vehicles
    );
    
    // Build metadata
    const metadata: FilteringMetadata = {
      routeActivitySnapshot: snapshot,
      filteringDecisions,
      performanceMetrics
    };
    
    const result: FilteringResult = {
      filteredVehicles,
      metadata,
      userFeedback
    };
    
    // Cache the result
    this.cacheFilteringResult(cacheKey, result, vehicles, context);
    
    logger.info('Intelligent vehicle filtering completed', {
      originalVehicles: vehicles.length,
      filteredVehicles: filteredVehicles.length,
      vehiclesRemoved: vehicles.length - filteredVehicles.length,
      busyRoutes: snapshot.busyRoutes.length,
      quietRoutes: snapshot.quietRoutes.length,
      filteringTime: performanceMetrics.filteringTime,
      cacheHitRate: performanceMetrics.cacheHitRate
    });
    
    return result;
  }
  
  /**
   * Determine if distance filtering should be applied to a route
   * 
   * @param routeId - Route identifier
   * @param routeActivity - Map of route activity information
   * @returns True if distance filtering should be applied
   * 
   * Requirements 2.1, 2.2: Distance filtering only for busy routes
   */
  shouldApplyDistanceFilter(
    routeId: string,
    routeActivity: Map<string, RouteActivityInfo>
  ): boolean {
    const activity = routeActivity.get(routeId);
    
    if (!activity) {
      // No activity data - don't apply distance filter
      logger.debug('No activity data for route, skipping distance filter', {
        routeId
      });
      return false;
    }
    
    // Apply distance filter only to busy routes
    const shouldFilter = activity.classification === RouteClass.BUSY;
    
    logger.debug('Distance filter decision', {
      routeId,
      classification: activity.classification,
      vehicleCount: activity.vehicleCount,
      shouldFilter
    });
    
    return shouldFilter;
  }
  
  /**
   * Filter vehicles by distance to stations
   * 
   * @param vehicles - Array of vehicles to filter
   * @param stations - Array of target stations
   * @param maxDistance - Maximum distance in meters
   * @returns Filtered array of vehicles within distance threshold
   * 
   * Requirements 2.1: Apply distance filtering to busy routes
   * Requirements 5.2, 5.4: Optimize distance calculations reuse
   */
  filterByDistance(
    vehicles: CoreVehicle[],
    stations: TransformationStation[],
    maxDistance: number
  ): CoreVehicle[] {
    if (stations.length === 0) {
      logger.warn('No stations provided for distance filtering, returning all vehicles');
      return vehicles;
    }
    
    const filtered = vehicles.filter(vehicle => {
      const minDistance = this.calculateMinDistanceToStationsWithCache(
        vehicle.position,
        stations
      );
      
      return minDistance <= maxDistance;
    });
    
    logger.debug('Distance filtering applied', {
      originalCount: vehicles.length,
      filteredCount: filtered.length,
      removedCount: vehicles.length - filtered.length,
      maxDistance
    });
    
    return filtered;
  }
  
  /**
   * Generate user feedback about filtering behavior
   * 
   * @param routeActivity - Map of route activity information
   * @param filteredVehicles - Vehicles after filtering
   * @param originalVehicles - Vehicles before filtering
   * @returns User feedback information
   * 
   * Requirements 6.1, 6.2, 6.3, 6.5: Transparent user feedback
   */
  generateUserFeedback(
    routeActivity: Map<string, RouteActivityInfo>,
    filteredVehicles: CoreVehicle[],
    originalVehicles: CoreVehicle[]
  ): UserFeedbackInfo {
    // Count route classifications
    let busyRoutes = 0;
    let quietRoutes = 0;
    
    for (const activity of routeActivity.values()) {
      if (activity.classification === RouteClass.BUSY) {
        busyRoutes++;
      } else {
        quietRoutes++;
      }
    }
    
    // Calculate vehicles filtered by distance
    const distanceFilteredVehicles = originalVehicles.length - filteredVehicles.length;
    
    // Generate route status messages
    const routeStatusMessages = new Map<string, string>();
    
    for (const [routeId, activity] of routeActivity.entries()) {
      if (activity.classification === RouteClass.BUSY) {
        // Requirement 6.1: Indicate distance filtering for busy routes
        routeStatusMessages.set(
          routeId,
          `Route ${routeId}: Busy (${activity.vehicleCount} vehicles) - Distance filtering applied`
        );
      } else {
        // Requirement 6.2: Indicate all vehicles shown for quiet routes
        routeStatusMessages.set(
          routeId,
          `Route ${routeId}: Quiet (${activity.vehicleCount} vehicles) - All vehicles shown`
        );
      }
    }
    
    // Generate empty state message if no vehicles
    let emptyStateMessage: string | undefined;
    
    if (filteredVehicles.length === 0) {
      // Requirement 6.3, 6.5: Intelligent empty state messaging
      if (originalVehicles.length === 0) {
        emptyStateMessage = 'No vehicles are currently active on any routes.';
      } else if (busyRoutes > 0 && distanceFilteredVehicles > 0) {
        emptyStateMessage = `${distanceFilteredVehicles} vehicles were filtered due to distance on busy routes. Try adjusting your distance threshold or location.`;
      } else {
        emptyStateMessage = 'No vehicles match the current filtering criteria.';
      }
    }
    
    const feedback: UserFeedbackInfo = {
      totalRoutes: routeActivity.size,
      busyRoutes,
      quietRoutes,
      distanceFilteredVehicles,
      emptyStateMessage,
      routeStatusMessages
    };
    
    logger.debug('User feedback generated', {
      totalRoutes: feedback.totalRoutes,
      busyRoutes: feedback.busyRoutes,
      quietRoutes: feedback.quietRoutes,
      distanceFilteredVehicles: feedback.distanceFilteredVehicles,
      hasEmptyStateMessage: !!feedback.emptyStateMessage
    });
    
    return feedback;
  }
  
  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================
  
  /**
   * Make filtering decision for a single vehicle
   */
  private makeFilteringDecision(
    vehicle: CoreVehicle,
    routeActivity: Map<string, RouteActivityInfo>,
    context: FilteringContext
  ): FilteringDecision {
    const activity = routeActivity.get(vehicle.routeId);
    
    // CRITICAL FIX: Check if vehicle's route serves any target station
    // This ensures we only show vehicles for routes that actually pass through the selected stations
    if (context.targetStations && context.targetStations.length > 0 && vehicle.routeId) {
      const vehicleRouteServesTargetStations = context.targetStations.some(station => 
        station.routeIds.includes(vehicle.routeId!)
      );
      
      if (!vehicleRouteServesTargetStations) {
        if (context.debugMode) {
          logger.debug('Vehicle filtered out - route does not serve target stations', {
            vehicleId: vehicle.id,
            routeId: vehicle.routeId,
            targetStations: context.targetStations.map(s => ({ id: s.id, name: s.name, routeIds: s.routeIds })),
            reason: 'Route association filtering'
          });
        }
        
        return {
          vehicleId: vehicle.id,
          routeId: vehicle.routeId,
          routeClassification: activity?.classification || RouteClass.QUIET,
          distanceFilterApplied: false,
          included: false,
          reason: `Vehicle route ${vehicle.routeId} does not serve any target stations`
        };
      } else if (context.debugMode) {
        logger.debug('Vehicle passed route association check', {
          vehicleId: vehicle.id,
          routeId: vehicle.routeId,
          targetStations: context.targetStations.map(s => ({ id: s.id, name: s.name, routeIds: s.routeIds })),
          reason: 'Route serves at least one target station'
        });
      }
    }
    
    // If no activity data, include the vehicle (fail open)
    if (!activity) {
      return {
        vehicleId: vehicle.id,
        routeId: vehicle.routeId,
        routeClassification: RouteClass.QUIET, // Default to quiet
        distanceFilterApplied: false,
        included: true,
        reason: 'No route activity data available - including vehicle'
      };
    }
    
    // Requirement 2.4: Don't apply distance filtering to routes with 0-1 vehicles
    if (activity.vehicleCount <= 1) {
      return {
        vehicleId: vehicle.id,
        routeId: vehicle.routeId,
        routeClassification: activity.classification,
        distanceFilterApplied: false,
        included: true,
        reason: 'Route has 0-1 vehicles - showing all vehicles'
      };
    }
    
    // Check if distance filtering should be applied
    const shouldFilter = this.shouldApplyDistanceFilter(vehicle.routeId, routeActivity);
    
    if (!shouldFilter) {
      // Quiet route - show all vehicles
      return {
        vehicleId: vehicle.id,
        routeId: vehicle.routeId,
        routeClassification: activity.classification,
        distanceFilterApplied: false,
        included: true,
        reason: 'Quiet route - showing all vehicles regardless of distance'
      };
    }
    
    // Busy route - apply distance filtering
    const minDistance = this.calculateMinDistanceToStationsWithCache(
      vehicle.position,
      context.targetStations
    );
    
    const withinDistance = minDistance <= context.distanceFilterThreshold;
    
    return {
      vehicleId: vehicle.id,
      routeId: vehicle.routeId,
      routeClassification: activity.classification,
      distanceFilterApplied: true,
      distanceToNearestStation: minDistance,
      included: withinDistance,
      reason: withinDistance
        ? `Busy route - vehicle within ${context.distanceFilterThreshold}m threshold (${Math.round(minDistance)}m)`
        : `Busy route - vehicle beyond ${context.distanceFilterThreshold}m threshold (${Math.round(minDistance)}m)`
    };
  }
  
  /**
   * Create snapshot of route activity
   */
  private createRouteActivitySnapshot(
    routeActivity: Map<string, RouteActivityInfo>,
    vehicles: CoreVehicle[]
  ): RouteActivitySnapshot {
    const busyRoutes: string[] = [];
    const quietRoutes: string[] = [];
    
    for (const [routeId, activity] of routeActivity.entries()) {
      if (activity.classification === RouteClass.BUSY) {
        busyRoutes.push(routeId);
      } else {
        quietRoutes.push(routeId);
      }
    }
    
    return {
      timestamp: new Date(),
      routeActivities: new Map(routeActivity),
      totalVehicles: vehicles.length,
      busyRoutes,
      quietRoutes
    };
  }
  
  /**
   * Calculate minimum distance from vehicle to any station
   */
  private calculateMinDistanceToStations(
    vehiclePosition: Coordinates,
    stations: TransformationStation[]
  ): number {
    if (stations.length === 0) {
      return Infinity;
    }
    
    let minDistance = Infinity;
    
    for (const station of stations) {
      const distance = this.calculateDistance(vehiclePosition, station.coordinates);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }
    
    return minDistance;
  }
  
  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(pos1: Coordinates, pos2: Coordinates): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = pos1.latitude * Math.PI / 180;
    const φ2 = pos2.latitude * Math.PI / 180;
    const Δφ = (pos2.latitude - pos1.latitude) * Math.PI / 180;
    const Δλ = (pos2.longitude - pos1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }
  
  // ============================================================================
  // CACHING METHODS
  // ============================================================================
  
  /**
   * Calculate minimum distance with caching for performance optimization
   * 
   * Requirements 5.4: Optimize distance calculations reuse
   */
  private calculateMinDistanceToStationsWithCache(
    vehiclePosition: Coordinates,
    stations: TransformationStation[]
  ): number {
    if (stations.length === 0) {
      return Infinity;
    }
    
    // Create cache key based on position and stations
    const cacheKey = this.generateDistanceCacheKey(vehiclePosition, stations);
    const cachedDistance = this.getCachedDistance(cacheKey);
    
    if (cachedDistance !== null) {
      return cachedDistance;
    }
    
    // Calculate distance and cache result
    const distance = this.calculateMinDistanceToStations(vehiclePosition, stations);
    this.cacheDistance(cacheKey, distance);
    
    return distance;
  }
  
  /**
   * Generate cache key for filtering operation
   */
  private generateFilteringCacheKey(
    vehicles: CoreVehicle[],
    routeActivity: Map<string, RouteActivityInfo>,
    context: FilteringContext
  ): string {
    // Create signature based on vehicles, route activity, and context
    const vehicleSignature = vehicles
      .map(v => `${v.id}:${v.routeId}:${v.position.latitude.toFixed(4)}:${v.position.longitude.toFixed(4)}`)
      .sort()
      .join('|');
    
    const routeActivitySignature = Array.from(routeActivity.entries())
      .map(([routeId, info]) => `${routeId}:${info.classification}:${info.vehicleCount}`)
      .sort()
      .join('|');
    
    const contextSignature = `${context.busyRouteThreshold}:${context.distanceFilterThreshold}:${context.debugMode}`;
    
    return `filter:${this.hashString(vehicleSignature)}:${this.hashString(routeActivitySignature)}:${this.hashString(contextSignature)}`;
  }
  
  /**
   * Generate cache key for distance calculation
   */
  private generateDistanceCacheKey(
    position: Coordinates,
    stations: TransformationStation[]
  ): string {
    const positionKey = `${position.latitude.toFixed(4)}:${position.longitude.toFixed(4)}`;
    const stationsKey = stations
      .map(s => `${s.coordinates.latitude.toFixed(4)}:${s.coordinates.longitude.toFixed(4)}`)
      .sort()
      .join('|');
    
    return `distance:${this.hashString(positionKey)}:${this.hashString(stationsKey)}`;
  }
  
  /**
   * Simple string hash function for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  /**
   * Get cached filtering result if valid
   */
  private getCachedFilteringResult(cacheKey: string): FilteringResult | null {
    const cached = this.filteringCache.get(cacheKey);
    
    if (!cached) {
      return null;
    }
    
    const now = new Date();
    const age = now.getTime() - cached.timestamp.getTime();
    
    if (age > this.CACHE_TTL_MS) {
      this.filteringCache.delete(cacheKey);
      return null;
    }
    
    return cached.result;
  }
  
  /**
   * Cache filtering result
   */
  private cacheFilteringResult(
    cacheKey: string,
    result: FilteringResult,
    vehicles: CoreVehicle[],
    context: FilteringContext
  ): void {
    // Clean up old entries if cache is too large
    if (this.filteringCache.size >= this.MAX_CACHE_ENTRIES) {
      this.evictOldestFilteringCacheEntries();
    }
    
    const vehicleSignature = vehicles.map(v => v.id).sort().join(',');
    const contextSignature = `${context.busyRouteThreshold}:${context.distanceFilterThreshold}`;
    
    const entry: FilteringCacheEntry = {
      result,
      timestamp: new Date(),
      vehicleSignature,
      contextSignature
    };
    
    this.filteringCache.set(cacheKey, entry);
  }
  
  /**
   * Get cached distance if valid
   */
  private getCachedDistance(cacheKey: string): number | null {
    const cached = this.distanceCache.get(cacheKey);
    
    if (!cached) {
      return null;
    }
    
    const now = new Date();
    const age = now.getTime() - cached.timestamp.getTime();
    
    if (age > this.DISTANCE_CACHE_TTL_MS) {
      this.distanceCache.delete(cacheKey);
      return null;
    }
    
    return cached.distance;
  }
  
  /**
   * Cache distance calculation
   */
  private cacheDistance(cacheKey: string, distance: number): void {
    // Clean up old entries if cache is too large
    if (this.distanceCache.size >= this.MAX_CACHE_ENTRIES) {
      this.evictOldestDistanceCacheEntries();
    }
    
    const entry: DistanceCacheEntry = {
      distance,
      timestamp: new Date()
    };
    
    this.distanceCache.set(cacheKey, entry);
  }
  
  /**
   * Evict oldest filtering cache entries
   */
  private evictOldestFilteringCacheEntries(): void {
    const entries = Array.from(this.filteringCache.entries());
    entries.sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());
    
    // Remove oldest 25% of entries
    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      this.filteringCache.delete(entries[i][0]);
    }
  }
  
  /**
   * Evict oldest distance cache entries
   */
  private evictOldestDistanceCacheEntries(): void {
    const entries = Array.from(this.distanceCache.entries());
    entries.sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());
    
    // Remove oldest 25% of entries
    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      this.distanceCache.delete(entries[i][0]);
    }
  }
  
  /**
   * Get cache hit rate
   */
  private getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? this.cacheHits / total : 0;
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): FilteringCacheStats {
    const total = this.cacheHits + this.cacheMisses;
    const filteringEntries = Array.from(this.filteringCache.values());
    const averageAge = filteringEntries.length > 0 
      ? filteringEntries.reduce((sum, entry) => sum + (Date.now() - entry.timestamp.getTime()), 0) / filteringEntries.length
      : 0;
    
    return {
      size: this.filteringCache.size,
      hitRate: total > 0 ? this.cacheHits / total : 0,
      missRate: total > 0 ? this.cacheMisses / total : 0,
      averageAge
    };
  }
  
  /**
   * Clear all caches
   */
  clearCache(): void {
    this.filteringCache.clear();
    this.distanceCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    logger.debug('IntelligentVehicleFilter caches cleared');
  }
  
  /**
   * Selective cache invalidation for vehicle data updates
   * 
   * Requirements 5.3: Add selective cache invalidation for vehicle data updates
   */
  invalidateCacheForVehicles(vehicleIds: string[]): void {
    const vehicleIdSet = new Set(vehicleIds);
    const keysToRemove: string[] = [];
    
    // Check filtering cache
    for (const [key, entry] of this.filteringCache.entries()) {
      const vehicleIdsInEntry = entry.vehicleSignature.split(',');
      const hasAffectedVehicle = vehicleIdsInEntry.some(id => vehicleIdSet.has(id));
      
      if (hasAffectedVehicle) {
        keysToRemove.push(key);
      }
    }
    
    // Remove affected entries
    for (const key of keysToRemove) {
      this.filteringCache.delete(key);
    }
    
    logger.debug('Selective cache invalidation completed', {
      affectedVehicles: vehicleIds.length,
      removedEntries: keysToRemove.length
    });
  }
}

// ============================================================================
// EXPORTED INSTANCE
// ============================================================================

/**
 * Default intelligent vehicle filter instance
 */
export const intelligentVehicleFilter = new IntelligentVehicleFilter();

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new IntelligentVehicleFilter instance
 * 
 * @returns New IntelligentVehicleFilter instance
 */
export function createIntelligentVehicleFilter(): IntelligentVehicleFilter {
  return new IntelligentVehicleFilter();
}
