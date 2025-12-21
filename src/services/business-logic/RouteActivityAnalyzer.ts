/**
 * Route Activity Analyzer Service
 * 
 * This service implements intelligent route-based vehicle filtering by analyzing
 * route activity levels and classifying routes as busy or quiet based on vehicle count.
 * It includes data quality validation and caching for performance optimization.
 * 
 * Requirements: 1.1, 1.2, 1.3, 7.5
 */

import type { CoreVehicle } from '../../types/coreVehicle';
import { logger } from '../../utils/shared/logger';
import { gracefulDegradationService, DegradationLevel, FallbackStrategy } from '../utilities/GracefulDegradationService';
import type { DegradationContext } from '../utilities/GracefulDegradationService';
import { debugMonitoringService } from '../utilities/DebugMonitoringService';
import type { RouteClassificationDebug } from '../utilities/DebugMonitoringService';

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

/**
 * Route classification based on vehicle activity
 */
export enum RouteClassification {
  BUSY = 'busy',
  QUIET = 'quiet'
}

/**
 * Route activity information with metadata
 */
export interface RouteActivityInfo {
  routeId: string;
  vehicleCount: number;
  classification: RouteClassification;
  lastUpdated: Date;
  validVehicleCount: number; // Excludes stale/invalid vehicles
}

/**
 * Vehicle data quality assessment
 */
export interface VehicleDataQuality {
  isPositionValid: boolean;
  isTimestampRecent: boolean;
  hasRequiredFields: boolean;
  stalenessScore: number; // 0-1, where 1 is fresh and 0 is stale
}

/**
 * Route activity snapshot for caching and analysis
 */
export interface RouteActivitySnapshot {
  timestamp: Date;
  routeActivities: Map<string, RouteActivityInfo>;
  totalVehicles: number;
  busyRoutes: string[];
  quietRoutes: string[];
}

/**
 * Configuration for route activity analysis
 */
export interface RouteActivityConfig {
  busyRouteThreshold: number; // Default: 5 vehicles
  staleDataThresholdMs: number; // Default: 5 minutes
  positionAccuracyThreshold: number; // Default: 1000 meters
  cacheExpirationMs: number; // Default: 30 seconds
}

/**
 * Performance metrics for route analysis
 */
export interface RouteAnalysisPerformanceMetrics {
  analysisTime: number;
  vehiclesProcessed: number;
  validVehicles: number;
  invalidVehicles: number;
  cacheHitRate: number;
  routesAnalyzed: number;
}

// ============================================================================
// ROUTE ACTIVITY ANALYZER INTERFACE
// ============================================================================

/**
 * Interface for route activity analysis operations
 */
export interface IRouteActivityAnalyzer {
  analyzeRouteActivity(vehicles: CoreVehicle[]): Map<string, RouteActivityInfo>;
  classifyRoute(routeId: string, vehicleCount: number, threshold: number): RouteClassification;
  getRouteVehicleCount(routeId: string, vehicles: CoreVehicle[]): number;
  validateVehicleData(vehicle: CoreVehicle): VehicleDataQuality;
  filterValidVehicles(vehicles: CoreVehicle[]): CoreVehicle[];
  getRouteActivitySnapshot(): RouteActivitySnapshot | null;
  clearCache(): void;
  getPerformanceMetrics(): RouteAnalysisPerformanceMetrics;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default configuration values
 */
export const DEFAULT_ROUTE_ACTIVITY_CONFIG: RouteActivityConfig = {
  busyRouteThreshold: 5,
  staleDataThresholdMs: 5 * 60 * 1000, // 5 minutes
  positionAccuracyThreshold: 1000, // 1000 meters
  cacheExpirationMs: 30 * 1000, // 30 seconds
};

/**
 * Validation constants
 */
const MIN_LATITUDE = -90;
const MAX_LATITUDE = 90;
const MIN_LONGITUDE = -180;
const MAX_LONGITUDE = 180;
const MAX_REASONABLE_SPEED = 200; // km/h
const MAX_REASONABLE_BEARING = 360; // degrees

// ============================================================================
// ROUTE ACTIVITY ANALYZER IMPLEMENTATION
// ============================================================================

/**
 * Route Activity Analyzer Service Implementation
 * 
 * Provides intelligent route activity analysis with caching and data quality validation.
 * Classifies routes as busy or quiet based on configurable thresholds.
 */
export class RouteActivityAnalyzer implements IRouteActivityAnalyzer {
  private config: RouteActivityConfig;
  private cache: Map<string, RouteActivitySnapshot> = new Map();
  private performanceMetrics: RouteAnalysisPerformanceMetrics;
  
  constructor(config: Partial<RouteActivityConfig> = {}) {
    this.config = { ...DEFAULT_ROUTE_ACTIVITY_CONFIG, ...config };
    this.performanceMetrics = this.initializePerformanceMetrics();
    
    logger.debug('RouteActivityAnalyzer initialized', {
      config: this.config
    });
  }
  
  /**
   * Analyze route activity for all vehicles with graceful degradation
   * 
   * @param vehicles - Array of vehicles to analyze
   * @returns Map of route ID to route activity information
   * 
   * Requirements 1.1: Calculate route activity levels based on vehicle count
   * Requirements 7.1, 7.2: Graceful degradation for missing vehicle data
   */
  analyzeRouteActivity(vehicles: CoreVehicle[]): Map<string, RouteActivityInfo> {
    const startTime = performance.now();
    
    logger.debug('Starting route activity analysis', {
      totalVehicles: vehicles.length,
      threshold: this.config.busyRouteThreshold
    });

    // Check for missing or invalid vehicle data
    if (!vehicles || vehicles.length === 0) {
      logger.warn('No vehicle data provided for route activity analysis');
      
      // Handle missing vehicle data with graceful degradation
      const degradationContext: DegradationContext = {
        failureType: 'missing_vehicle_data',
        failureMessage: 'No vehicle data available for route activity analysis',
        degradationLevel: DegradationLevel.MODERATE,
        fallbackStrategy: FallbackStrategy.USE_CACHE,
        timestamp: new Date(),
        affectedComponents: ['route-activity-analyzer'],
        recoveryActions: [
          'Check vehicle data source',
          'Verify API connectivity',
          'Use cached data if available'
        ]
      };

      // Try to get fallback data
      gracefulDegradationService.handleMissingVehicleData(degradationContext)
        .then(fallbackData => {
          if (fallbackData.vehicles.length > 0) {
            logger.info('Using fallback vehicle data for route analysis', {
              vehicleCount: fallbackData.vehicles.length,
              source: fallbackData.source,
              confidence: fallbackData.confidence
            });
          }
        })
        .catch(error => {
          logger.error('Failed to get fallback vehicle data', { error });
        });

      return new Map();
    }
    
    // Check cache first
    const cacheKey = this.generateCacheKey(vehicles);
    const cachedResult = this.getCachedResult(cacheKey);
    if (cachedResult) {
      this.updatePerformanceMetrics(startTime, vehicles.length, 0, 0, 1.0, cachedResult.routeActivities.size);
      logger.debug('Returning cached route activity analysis', {
        routeCount: cachedResult.routeActivities.size,
        cacheHit: true
      });
      return cachedResult.routeActivities;
    }
    
    // Filter valid vehicles first with error handling
    let validVehicles: CoreVehicle[];
    let invalidCount = 0;
    
    try {
      validVehicles = this.filterValidVehicles(vehicles);
      invalidCount = vehicles.length - validVehicles.length;
      
      // Check if too many vehicles are invalid
      const invalidPercentage = invalidCount / vehicles.length;
      if (invalidPercentage > 0.5) {
        logger.warn('High percentage of invalid vehicles detected', {
          totalVehicles: vehicles.length,
          invalidVehicles: invalidCount,
          invalidPercentage: (invalidPercentage * 100).toFixed(1)
        });
        
        // Update circuit breaker for data quality issues
        gracefulDegradationService.updateCircuitBreaker('route-activity-analyzer', false);
        
        // Handle data quality degradation
        const degradationContext: DegradationContext = {
          failureType: 'poor_data_quality',
          failureMessage: `${(invalidPercentage * 100).toFixed(1)}% of vehicle data is invalid`,
          degradationLevel: invalidPercentage > 0.8 ? DegradationLevel.SEVERE : DegradationLevel.MODERATE,
          fallbackStrategy: FallbackStrategy.USE_CACHE,
          timestamp: new Date(),
          affectedComponents: ['route-activity-analyzer', 'data-validator'],
          recoveryActions: [
            'Check data source quality',
            'Review validation rules',
            'Use cached data if available'
          ]
        };
        
        gracefulDegradationService.handleMissingVehicleData(degradationContext);
      } else if (invalidCount > 0) {
        // Update circuit breaker for successful operation with some issues
        gracefulDegradationService.updateCircuitBreaker('route-activity-analyzer', true);
      }
    } catch (error) {
      logger.error('Error filtering valid vehicles', { error });
      
      // Handle validation error with graceful degradation
      const degradationContext: DegradationContext = {
        failureType: 'validation_error',
        failureMessage: `Vehicle validation failed: ${error}`,
        degradationLevel: DegradationLevel.SEVERE,
        fallbackStrategy: FallbackStrategy.USE_CACHE,
        timestamp: new Date(),
        affectedComponents: ['route-activity-analyzer', 'data-validator'],
        recoveryActions: [
          'Check validation logic',
          'Review vehicle data format',
          'Use cached data if available'
        ]
      };
      
      gracefulDegradationService.handleMissingVehicleData(degradationContext);
      return new Map();
    }
    
    // Group vehicles by route
    const routeVehicleMap = new Map<string, CoreVehicle[]>();
    for (const vehicle of validVehicles) {
      if (!routeVehicleMap.has(vehicle.routeId)) {
        routeVehicleMap.set(vehicle.routeId, []);
      }
      routeVehicleMap.get(vehicle.routeId)!.push(vehicle);
    }
    
    // Analyze each route
    const routeActivities = new Map<string, RouteActivityInfo>();
    const busyRoutes: string[] = [];
    const quietRoutes: string[] = [];
    
    for (const [routeId, routeVehicles] of routeVehicleMap) {
      const vehicleCount = routeVehicles.length;
      const classification = this.classifyRoute(routeId, vehicleCount, this.config.busyRouteThreshold);
      
      const activityInfo: RouteActivityInfo = {
        routeId,
        vehicleCount,
        classification,
        lastUpdated: new Date(),
        validVehicleCount: vehicleCount
      };
      
      routeActivities.set(routeId, activityInfo);
      
      if (classification === RouteClassification.BUSY) {
        busyRoutes.push(routeId);
      } else {
        quietRoutes.push(routeId);
      }
    }
    
    // Create and cache snapshot
    const snapshot: RouteActivitySnapshot = {
      timestamp: new Date(),
      routeActivities,
      totalVehicles: validVehicles.length,
      busyRoutes,
      quietRoutes
    };
    
    this.cacheResult(cacheKey, snapshot);
    
    // Update performance metrics and log them
    const endTime = performance.now();
    const analysisTime = endTime - startTime;
    
    // Log performance metrics for monitoring
    debugMonitoringService.logPerformanceMetrics({
      operationName: 'route-activity-analysis',
      startTime: new Date(Date.now() - analysisTime),
      endTime: new Date(),
      duration: analysisTime,
      memoryUsage: {
        before: 0, // Would be measured in real implementation
        after: 0,
        peak: 0
      },
      cacheStats: {
        hits: 0, // Cache miss in this case
        misses: 1,
        hitRate: 0.0
      },
      errorCount: invalidCount > 0 ? 1 : 0,
      successCount: 1,
      throughput: validVehicles.length / (analysisTime / 1000) // vehicles per second
    });
    
    // Check for performance issues
    if (analysisTime > 1000) { // More than 1 second
      logger.warn('Route activity analysis took longer than expected', {
        analysisTime,
        vehicleCount: vehicles.length,
        routeCount: routeActivities.size
      });
      
      // Update circuit breaker for performance issues
      gracefulDegradationService.updateCircuitBreaker('route-activity-analyzer', false);
    } else {
      // Update circuit breaker for successful operation
      gracefulDegradationService.updateCircuitBreaker('route-activity-analyzer', true);
    }
    
    this.updatePerformanceMetrics(
      startTime,
      vehicles.length,
      validVehicles.length,
      invalidCount,
      0.0, // Cache miss
      routeActivities.size
    );
    
    logger.debug('Route activity analysis completed', {
      totalRoutes: routeActivities.size,
      busyRoutes: busyRoutes.length,
      quietRoutes: quietRoutes.length,
      validVehicles: validVehicles.length,
      invalidVehicles: invalidCount,
      analysisTime: analysisTime
    });
    
    return routeActivities;
  }
  
  /**
   * Classify a route as busy or quiet based on vehicle count with debug logging
   * 
   * @param routeId - Route identifier
   * @param vehicleCount - Number of vehicles on the route
   * @param threshold - Threshold for busy classification
   * @returns Route classification
   * 
   * Requirements 1.2, 1.3: Route classification logic
   * Requirements 4.4: Debug logging for route classification decisions
   */
  classifyRoute(routeId: string, vehicleCount: number, threshold: number): RouteClassification {
    const classification = vehicleCount > threshold ? RouteClassification.BUSY : RouteClassification.QUIET;
    
    // Log route classification for debugging
    const debugInfo: RouteClassificationDebug = {
      routeId,
      vehicleCount,
      threshold,
      classification,
      factors: {
        vehicleDensity: vehicleCount / Math.max(threshold, 1),
        trafficLevel: classification === RouteClassification.BUSY ? 'high' : 'low'
      },
      timestamp: new Date()
    };
    
    debugMonitoringService.logRouteClassification(debugInfo);
    
    logger.debug('Route classified', {
      routeId,
      vehicleCount,
      threshold,
      classification
    });
    
    return classification;
  }
  
  /**
   * Get vehicle count for a specific route
   * 
   * @param routeId - Route identifier
   * @param vehicles - Array of vehicles to count
   * @returns Number of vehicles on the route
   * 
   * Requirements 1.1: Vehicle counting per route
   */
  getRouteVehicleCount(routeId: string, vehicles: CoreVehicle[]): number {
    const validVehicles = this.filterValidVehicles(vehicles);
    const count = validVehicles.filter(vehicle => vehicle.routeId === routeId).length;
    
    logger.debug('Route vehicle count calculated', {
      routeId,
      totalVehicles: vehicles.length,
      validVehicles: validVehicles.length,
      routeVehicleCount: count
    });
    
    return count;
  }
  
  /**
   * Validate vehicle data quality
   * 
   * @param vehicle - Vehicle to validate
   * @returns Data quality assessment
   * 
   * Requirements 7.5: Vehicle data validation to exclude stale/invalid position data
   */
  validateVehicleData(vehicle: CoreVehicle): VehicleDataQuality {
    const now = new Date();
    const vehicleTime = new Date(vehicle.timestamp);
    const ageMs = now.getTime() - vehicleTime.getTime();
    
    // Check position validity
    const isPositionValid = this.isValidPosition(vehicle.position);
    
    // Check timestamp recency
    const isTimestampRecent = ageMs <= this.config.staleDataThresholdMs;
    
    // Check required fields
    const hasRequiredFields = this.hasRequiredFields(vehicle);
    
    // Calculate staleness score (1 = fresh, 0 = stale)
    const stalenessScore = isTimestampRecent ? 
      Math.max(0, 1 - (ageMs / this.config.staleDataThresholdMs)) : 0;
    
    const quality: VehicleDataQuality = {
      isPositionValid,
      isTimestampRecent,
      hasRequiredFields,
      stalenessScore
    };
    
    logger.debug('Vehicle data quality assessed', {
      vehicleId: vehicle.id,
      routeId: vehicle.routeId,
      ageMs,
      quality
    });
    
    return quality;
  }
  
  /**
   * Filter vehicles to only include those with valid data
   * 
   * @param vehicles - Array of vehicles to filter
   * @returns Array of valid vehicles
   * 
   * Requirements 7.5: Exclude stale/invalid position data from calculations
   */
  filterValidVehicles(vehicles: CoreVehicle[]): CoreVehicle[] {
    const validVehicles = vehicles.filter(vehicle => {
      const quality = this.validateVehicleData(vehicle);
      return quality.isPositionValid && quality.isTimestampRecent && quality.hasRequiredFields;
    });
    
    const invalidCount = vehicles.length - validVehicles.length;
    
    if (invalidCount > 0) {
      logger.warn('Filtered out invalid vehicles', {
        totalVehicles: vehicles.length,
        validVehicles: validVehicles.length,
        invalidVehicles: invalidCount,
        invalidPercentage: (invalidCount / vehicles.length * 100).toFixed(1)
      });
    }
    
    return validVehicles;
  }
  
  /**
   * Get the current route activity snapshot
   * 
   * @returns Current cached snapshot or null if none exists
   */
  getRouteActivitySnapshot(): RouteActivitySnapshot | null {
    // Return the most recent snapshot from cache
    const snapshots = Array.from(this.cache.values());
    if (snapshots.length === 0) {
      return null;
    }
    
    // Find the most recent snapshot
    return snapshots.reduce((latest, current) => 
      current.timestamp > latest.timestamp ? current : latest
    );
  }
  
  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('Route activity cache cleared');
  }
  
  /**
   * Get current performance metrics
   * 
   * @returns Performance metrics object
   */
  getPerformanceMetrics(): RouteAnalysisPerformanceMetrics {
    return { ...this.performanceMetrics };
  }
  
  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================
  
  /**
   * Validate geographic position
   */
  private isValidPosition(position: { latitude: number; longitude: number; accuracy?: number }): boolean {
    if (typeof position.latitude !== 'number' || typeof position.longitude !== 'number') {
      return false;
    }
    
    if (position.latitude < MIN_LATITUDE || position.latitude > MAX_LATITUDE) {
      return false;
    }
    
    if (position.longitude < MIN_LONGITUDE || position.longitude > MAX_LONGITUDE) {
      return false;
    }
    
    // Check accuracy if provided
    if (position.accuracy !== undefined && position.accuracy > this.config.positionAccuracyThreshold) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Check if vehicle has all required fields
   */
  private hasRequiredFields(vehicle: CoreVehicle): boolean {
    return !!(
      vehicle.id &&
      vehicle.routeId &&
      vehicle.position &&
      vehicle.timestamp &&
      typeof vehicle.isWheelchairAccessible === 'boolean' &&
      typeof vehicle.isBikeAccessible === 'boolean'
    );
  }
  
  /**
   * Generate cache key for vehicles array
   */
  private generateCacheKey(vehicles: CoreVehicle[]): string {
    // Create a simple hash based on vehicle IDs and timestamps
    const vehicleSignature = vehicles
      .map(v => `${v.id}:${v.timestamp.getTime()}`)
      .sort()
      .join('|');
    
    // Use a simple hash function
    let hash = 0;
    for (let i = 0; i < vehicleSignature.length; i++) {
      const char = vehicleSignature.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `route_activity_${hash}`;
  }
  
  /**
   * Get cached result if valid
   */
  private getCachedResult(cacheKey: string): RouteActivitySnapshot | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return null;
    }
    
    const now = new Date();
    const age = now.getTime() - cached.timestamp.getTime();
    
    if (age > this.config.cacheExpirationMs) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return cached;
  }
  
  /**
   * Cache analysis result
   */
  private cacheResult(cacheKey: string, snapshot: RouteActivitySnapshot): void {
    this.cache.set(cacheKey, snapshot);
    
    // Clean up old cache entries if needed
    if (this.cache.size > 10) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }
  }
  
  /**
   * Initialize performance metrics
   */
  private initializePerformanceMetrics(): RouteAnalysisPerformanceMetrics {
    return {
      analysisTime: 0,
      vehiclesProcessed: 0,
      validVehicles: 0,
      invalidVehicles: 0,
      cacheHitRate: 0,
      routesAnalyzed: 0
    };
  }
  
  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(
    startTime: number,
    totalVehicles: number,
    validVehicles: number,
    invalidVehicles: number,
    cacheHitRate: number,
    routesAnalyzed: number
  ): void {
    const endTime = performance.now();
    const analysisTime = endTime - startTime;
    
    // Update cumulative metrics
    this.performanceMetrics.analysisTime = analysisTime;
    this.performanceMetrics.vehiclesProcessed = totalVehicles;
    this.performanceMetrics.validVehicles = validVehicles;
    this.performanceMetrics.invalidVehicles = invalidVehicles;
    this.performanceMetrics.cacheHitRate = cacheHitRate;
    this.performanceMetrics.routesAnalyzed = routesAnalyzed;
  }
}

// ============================================================================
// EXPORTED INSTANCE
// ============================================================================

/**
 * Default route activity analyzer instance with standard configuration
 */
export const routeActivityAnalyzer = new RouteActivityAnalyzer();

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new RouteActivityAnalyzer instance with custom configuration
 * 
 * @param config - Partial configuration to override defaults
 * @returns New RouteActivityAnalyzer instance
 */
export function createRouteActivityAnalyzer(config: Partial<RouteActivityConfig> = {}): RouteActivityAnalyzer {
  return new RouteActivityAnalyzer(config);
}