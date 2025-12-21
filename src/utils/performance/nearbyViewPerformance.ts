/**
 * Performance monitoring and optimization utilities for Nearby View Stabilization
 * 
 * This module provides performance monitoring, optimization utilities, and validation
 * for the nearby view station selection operations.
 * 
 * Requirements: 5.5 - Performance optimization and validation
 */

import { logger } from './logger';
import { performanceMonitor } from './performance';
import type { Coordinates, Station } from '../types';
import type { Route, StopTime, Trip } from '../types/tranzyApi';

// ============================================================================
// PERFORMANCE CONSTANTS AND THRESHOLDS
// ============================================================================

/**
 * Performance requirements and thresholds for nearby view operations
 */
export const PERFORMANCE_THRESHOLDS = {
  // Station selection should complete within 100ms for typical datasets
  STATION_SELECTION_MAX_TIME: 100, // milliseconds
  
  // Distance calculations should be optimized for large datasets
  DISTANCE_CALCULATION_MAX_TIME: 50, // milliseconds
  
  // Route association filtering should be efficient
  ROUTE_FILTERING_MAX_TIME: 30, // milliseconds
  
  // Overall nearby view processing should complete within 200ms
  TOTAL_PROCESSING_MAX_TIME: 200, // milliseconds
  
  // Memory usage thresholds
  MAX_MEMORY_USAGE_MB: 200, // Maximum memory usage for processing (increased for realistic production usage)
  
  // Dataset size thresholds for optimization strategies
  LARGE_STATION_SET_THRESHOLD: 100, // stations
  LARGE_VEHICLE_SET_THRESHOLD: 500, // vehicles
  LARGE_ROUTE_SET_THRESHOLD: 50, // routes
} as const;

/**
 * Performance metrics for nearby view operations
 */
export interface NearbyViewPerformanceMetrics {
  stationSelectionTime: number;
  distanceCalculationTime: number;
  routeFilteringTime: number;
  totalProcessingTime: number;
  memoryUsage?: number;
  datasetSizes: {
    stations: number;
    vehicles: number;
    routes: number;
    stopTimes?: number;
    trips?: number;
  };
  optimizationsApplied: string[];
  performanceWarnings: string[];
}

/**
 * Performance optimization strategies
 */
export interface OptimizationStrategy {
  name: string;
  condition: (metrics: Partial<NearbyViewPerformanceMetrics>) => boolean;
  apply: () => void;
  description: string;
}

// ============================================================================
// PERFORMANCE MONITORING CLASS
// ============================================================================

/**
 * Performance monitor for nearby view operations
 */
export class NearbyViewPerformanceMonitor {
  private metrics: NearbyViewPerformanceMetrics;
  private startTime: number = 0;
  private optimizations: Set<string> = new Set();
  private warnings: Set<string> = new Set();
  
  constructor() {
    this.reset();
  }
  
  /**
   * Start performance monitoring for a nearby view operation
   */
  startMonitoring(): void {
    this.reset();
    this.startTime = performance.now();
    
    // Record memory usage if available
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      this.metrics.memoryUsage = memInfo.usedJSHeapSize / (1024 * 1024); // Convert to MB
    }
    
    logger.debug('Started nearby view performance monitoring', {
      startTime: this.startTime,
      memoryUsage: this.metrics.memoryUsage
    }, 'NearbyViewPerformance');
  }
  
  /**
   * Record station selection performance
   */
  recordStationSelection(duration: number, stationCount: number): void {
    this.metrics.stationSelectionTime = duration;
    this.metrics.datasetSizes.stations = stationCount;
    
    // Check performance threshold
    if (duration > PERFORMANCE_THRESHOLDS.STATION_SELECTION_MAX_TIME) {
      this.addWarning(`Station selection took ${duration.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.STATION_SELECTION_MAX_TIME}ms)`);
    }
    
    // Record global performance metric
    performanceMonitor.recordTiming('nearby_view.station_selection', duration);
    
    logger.debug('Recorded station selection performance', {
      duration,
      stationCount,
      threshold: PERFORMANCE_THRESHOLDS.STATION_SELECTION_MAX_TIME,
      withinThreshold: duration <= PERFORMANCE_THRESHOLDS.STATION_SELECTION_MAX_TIME
    }, 'NearbyViewPerformance');
  }
  
  /**
   * Record distance calculation performance
   */
  recordDistanceCalculation(duration: number, calculationCount: number): void {
    this.metrics.distanceCalculationTime = duration;
    
    // Check performance threshold
    if (duration > PERFORMANCE_THRESHOLDS.DISTANCE_CALCULATION_MAX_TIME) {
      this.addWarning(`Distance calculation took ${duration.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.DISTANCE_CALCULATION_MAX_TIME}ms)`);
    }
    
    // Record global performance metric
    performanceMonitor.recordTiming('nearby_view.distance_calculation', duration);
    performanceMonitor.recordCounter('nearby_view.distance_calculations', calculationCount);
    
    logger.debug('Recorded distance calculation performance', {
      duration,
      calculationCount,
      averagePerCalculation: calculationCount > 0 ? duration / calculationCount : 0,
      threshold: PERFORMANCE_THRESHOLDS.DISTANCE_CALCULATION_MAX_TIME
    }, 'NearbyViewPerformance');
  }
  
  /**
   * Record route filtering performance
   */
  recordRouteFiltering(duration: number, routeCount: number, stopTimesCount?: number, tripsCount?: number): void {
    this.metrics.routeFilteringTime = duration;
    this.metrics.datasetSizes.routes = routeCount;
    this.metrics.datasetSizes.stopTimes = stopTimesCount;
    this.metrics.datasetSizes.trips = tripsCount;
    
    // Check performance threshold
    if (duration > PERFORMANCE_THRESHOLDS.ROUTE_FILTERING_MAX_TIME) {
      this.addWarning(`Route filtering took ${duration.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.ROUTE_FILTERING_MAX_TIME}ms)`);
    }
    
    // Record global performance metric
    performanceMonitor.recordTiming('nearby_view.route_filtering', duration);
    
    logger.debug('Recorded route filtering performance', {
      duration,
      routeCount,
      stopTimesCount,
      tripsCount,
      threshold: PERFORMANCE_THRESHOLDS.ROUTE_FILTERING_MAX_TIME
    }, 'NearbyViewPerformance');
  }
  
  /**
   * Record vehicle processing performance
   */
  recordVehicleProcessing(duration: number, vehicleCount: number): void {
    this.metrics.datasetSizes.vehicles = vehicleCount;
    
    // Record global performance metric
    performanceMonitor.recordTiming('nearby_view.vehicle_processing', duration);
    performanceMonitor.recordCounter('nearby_view.vehicles_processed', vehicleCount);
    
    logger.debug('Recorded vehicle processing performance', {
      duration,
      vehicleCount,
      averagePerVehicle: vehicleCount > 0 ? duration / vehicleCount : 0
    }, 'NearbyViewPerformance');
  }
  
  /**
   * Finish monitoring and calculate total performance
   */
  finishMonitoring(): NearbyViewPerformanceMetrics {
    const endTime = performance.now();
    this.metrics.totalProcessingTime = endTime - this.startTime;
    
    // Check total processing threshold
    if (this.metrics.totalProcessingTime > PERFORMANCE_THRESHOLDS.TOTAL_PROCESSING_MAX_TIME) {
      this.addWarning(`Total processing took ${this.metrics.totalProcessingTime.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.TOTAL_PROCESSING_MAX_TIME}ms)`);
    }
    
    // Record final memory usage if available
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const finalMemory = memInfo.usedJSHeapSize / (1024 * 1024);
      const memoryDelta = finalMemory - (this.metrics.memoryUsage || 0);
      
      if (memoryDelta > PERFORMANCE_THRESHOLDS.MAX_MEMORY_USAGE_MB) {
        this.addWarning(`Memory usage increased by ${memoryDelta.toFixed(2)}MB (threshold: ${PERFORMANCE_THRESHOLDS.MAX_MEMORY_USAGE_MB}MB)`);
      }
    }
    
    // Copy optimizations and warnings to metrics
    this.metrics.optimizationsApplied = Array.from(this.optimizations);
    this.metrics.performanceWarnings = Array.from(this.warnings);
    
    // Record global performance metrics
    performanceMonitor.recordTiming('nearby_view.total_processing', this.metrics.totalProcessingTime);
    performanceMonitor.recordGauge('nearby_view.dataset_size.stations', this.metrics.datasetSizes.stations);
    performanceMonitor.recordGauge('nearby_view.dataset_size.vehicles', this.metrics.datasetSizes.vehicles);
    performanceMonitor.recordGauge('nearby_view.dataset_size.routes', this.metrics.datasetSizes.routes);
    
    logger.debug('Finished nearby view performance monitoring', {
      totalTime: this.metrics.totalProcessingTime,
      optimizations: this.metrics.optimizationsApplied,
      warnings: this.metrics.performanceWarnings,
      datasetSizes: this.metrics.datasetSizes
    }, 'NearbyViewPerformance');
    
    return { ...this.metrics };
  }
  
  /**
   * Add an optimization that was applied
   */
  addOptimization(name: string): void {
    this.optimizations.add(name);
    logger.debug('Applied performance optimization', { optimization: name }, 'NearbyViewPerformance');
  }
  
  /**
   * Add a performance warning
   */
  addWarning(warning: string): void {
    this.warnings.add(warning);
    logger.warn('Performance warning', { warning }, 'NearbyViewPerformance');
  }
  
  /**
   * Reset metrics for new monitoring session
   */
  private reset(): void {
    this.metrics = {
      stationSelectionTime: 0,
      distanceCalculationTime: 0,
      routeFilteringTime: 0,
      totalProcessingTime: 0,
      datasetSizes: {
        stations: 0,
        vehicles: 0,
        routes: 0
      },
      optimizationsApplied: [],
      performanceWarnings: []
    };
    this.optimizations.clear();
    this.warnings.clear();
  }
}

// ============================================================================
// DISTANCE CALCULATION OPTIMIZATIONS
// ============================================================================

/**
 * Optimized distance calculation cache for large station sets
 */
class DistanceCalculationCache {
  private cache = new Map<string, number>();
  private maxCacheSize = 1000;
  
  /**
   * Get cached distance or calculate and cache it
   */
  getDistance(
    from: Coordinates,
    to: Coordinates,
    calculator: (from: Coordinates, to: Coordinates) => number
  ): number {
    const key = this.createCacheKey(from, to);
    
    let distance = this.cache.get(key);
    if (distance === undefined) {
      distance = calculator(from, to);
      this.setDistance(key, distance);
    }
    
    return distance;
  }
  
  /**
   * Create cache key for coordinate pair
   */
  private createCacheKey(from: Coordinates, to: Coordinates): string {
    // Round coordinates to reduce cache key variations for nearby positions
    const fromLat = Math.round(from.latitude * 10000) / 10000;
    const fromLng = Math.round(from.longitude * 10000) / 10000;
    const toLat = Math.round(to.latitude * 10000) / 10000;
    const toLng = Math.round(to.longitude * 10000) / 10000;
    
    return `${fromLat},${fromLng}-${toLat},${toLng}`;
  }
  
  /**
   * Set distance in cache with size management
   */
  private setDistance(key: string, distance: number): void {
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entries (simple FIFO)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, distance);
  }
  
  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize
    };
  }
}

// Global distance cache instance
const distanceCache = new DistanceCalculationCache();

/**
 * Optimized distance calculation with caching for large datasets
 */
export const optimizedDistanceCalculation = (
  userLocation: Coordinates,
  stations: Station[],
  baseCalculator: (from: Coordinates, to: Coordinates) => number,
  monitor: NearbyViewPerformanceMonitor
): Array<{ station: Station; distance: number }> => {
  const startTime = performance.now();
  
  // Apply optimization strategies based on dataset size
  const useCache = stations.length > PERFORMANCE_THRESHOLDS.LARGE_STATION_SET_THRESHOLD;
  const useBatching = stations.length > PERFORMANCE_THRESHOLDS.LARGE_STATION_SET_THRESHOLD * 2;
  
  if (useCache) {
    monitor.addOptimization('distance_calculation_cache');
  }
  
  if (useBatching) {
    monitor.addOptimization('batch_distance_calculation');
  }
  
  const results: Array<{ station: Station; distance: number }> = [];
  
  if (useBatching) {
    // Process stations in batches to avoid blocking the main thread
    const batchSize = 50;
    for (let i = 0; i < stations.length; i += batchSize) {
      const batch = stations.slice(i, i + batchSize);
      
      for (const station of batch) {
        const distance = useCache
          ? distanceCache.getDistance(userLocation, station.coordinates, baseCalculator)
          : baseCalculator(userLocation, station.coordinates);
        
        results.push({ station, distance });
      }
      
      // Yield control to prevent blocking (in a real implementation, this might use setTimeout or requestIdleCallback)
      if (i + batchSize < stations.length) {
        // In a synchronous context, we can't actually yield, but we log the batching
        logger.debug('Processing distance calculation batch', {
          batchStart: i,
          batchEnd: Math.min(i + batchSize, stations.length),
          totalStations: stations.length
        }, 'NearbyViewPerformance');
      }
    }
  } else {
    // Standard processing for smaller datasets
    for (const station of stations) {
      const distance = useCache
        ? distanceCache.getDistance(userLocation, station.coordinates, baseCalculator)
        : baseCalculator(userLocation, station.coordinates);
      
      results.push({ station, distance });
    }
  }
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  monitor.recordDistanceCalculation(duration, stations.length);
  
  // Log cache statistics if cache was used
  if (useCache) {
    const cacheStats = distanceCache.getStats();
    logger.debug('Distance calculation cache statistics', cacheStats, 'NearbyViewPerformance');
  }
  
  return results;
};

// ============================================================================
// ROUTE ASSOCIATION OPTIMIZATIONS
// ============================================================================

/**
 * Optimized route association filtering for large datasets
 */
export const optimizedRouteAssociationFiltering = (
  stations: Station[],
  routes: Route[],
  stopTimes?: StopTime[],
  trips?: Trip[],
  monitor?: NearbyViewPerformanceMonitor
): Map<string, { hasRoutes: boolean; associatedRoutes: Route[]; routeCount: number }> => {
  const startTime = performance.now();
  
  const result = new Map<string, { hasRoutes: boolean; associatedRoutes: Route[]; routeCount: number }>();
  
  // Apply optimizations based on dataset sizes
  const useRouteMap = routes.length > PERFORMANCE_THRESHOLDS.LARGE_ROUTE_SET_THRESHOLD;
  const useStopTimesIndex = stopTimes && stopTimes.length > 1000;
  const useTripsIndex = trips && trips.length > 1000;
  
  if (monitor) {
    if (useRouteMap) monitor.addOptimization('route_map_lookup');
    if (useStopTimesIndex) monitor.addOptimization('stop_times_indexing');
    if (useTripsIndex) monitor.addOptimization('trips_indexing');
  }
  
  // Create optimized lookup structures
  const routeMap = useRouteMap ? new Map(routes.map(route => [route.id, route])) : null;
  
  const stopTimesIndex = useStopTimesIndex && stopTimes
    ? new Map<string, StopTime[]>()
    : null;
  
  if (stopTimesIndex && stopTimes) {
    for (const stopTime of stopTimes) {
      if (!stopTime.stopId) continue;
      
      const stopId = stopTime.stopId.toString();
      if (!stopTimesIndex.has(stopId)) {
        stopTimesIndex.set(stopId, []);
      }
      stopTimesIndex.get(stopId)!.push(stopTime);
    }
  }
  
  const tripToRouteMap = useTripsIndex && trips
    ? new Map(trips.map(trip => [trip.id, trip.routeId]))
    : null;
  
  // Process stations with optimized lookups
  for (const station of stations) {
    let associatedRoutes: Route[] = [];
    
    if (stopTimes && trips && stopTimesIndex && tripToRouteMap) {
      // Use optimized indexed lookups
      const stationStopTimes = stopTimesIndex.get(station.id.toString()) || [];
      const routeIds = new Set<string>();
      
      for (const stopTime of stationStopTimes) {
        if (stopTime.tripId) {
          const routeId = tripToRouteMap.get(stopTime.tripId);
          if (routeId) {
            routeIds.add(routeId);
          }
        }
      }
      
      associatedRoutes = Array.from(routeIds)
        .map(routeId => routeMap ? routeMap.get(routeId) : routes.find(r => r.id === routeId))
        .filter((route): route is Route => route !== undefined);
        
    } else if (stopTimes && trips) {
      // Standard processing without indexes
      const stationStopTimes = stopTimes.filter(st => 
        st && st.stopId && st.stopId.toString() === station.id.toString()
      );
      
      const routeIds = new Set<string>();
      for (const stopTime of stationStopTimes) {
        if (stopTime.tripId) {
          const trip = trips.find(t => t.id === stopTime.tripId);
          if (trip && trip.routeId) {
            routeIds.add(trip.routeId);
          }
        }
      }
      
      associatedRoutes = Array.from(routeIds)
        .map(routeId => routeMap ? routeMap.get(routeId) : routes.find(r => r.id === routeId))
        .filter((route): route is Route => route !== undefined);
        
    } else {
      // Fallback: assume all routes serve all stations
      associatedRoutes = routes;
    }
    
    result.set(station.id, {
      hasRoutes: associatedRoutes.length > 0,
      associatedRoutes,
      routeCount: associatedRoutes.length
    });
  }
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  if (monitor) {
    monitor.recordRouteFiltering(duration, routes.length, stopTimes?.length, trips?.length);
  }
  
  return result;
};

// ============================================================================
// PERFORMANCE VALIDATION
// ============================================================================

/**
 * Validate that nearby view performance meets requirements
 */
export const validateNearbyViewPerformance = (
  metrics: NearbyViewPerformanceMetrics
): { isValid: boolean; violations: string[]; recommendations: string[] } => {
  const violations: string[] = [];
  const recommendations: string[] = [];
  
  // Check individual operation thresholds
  if (metrics.stationSelectionTime > PERFORMANCE_THRESHOLDS.STATION_SELECTION_MAX_TIME) {
    violations.push(`Station selection time (${metrics.stationSelectionTime.toFixed(2)}ms) exceeds threshold (${PERFORMANCE_THRESHOLDS.STATION_SELECTION_MAX_TIME}ms)`);
    recommendations.push('Consider implementing spatial indexing for station lookups');
  }
  
  if (metrics.distanceCalculationTime > PERFORMANCE_THRESHOLDS.DISTANCE_CALCULATION_MAX_TIME) {
    violations.push(`Distance calculation time (${metrics.distanceCalculationTime.toFixed(2)}ms) exceeds threshold (${PERFORMANCE_THRESHOLDS.DISTANCE_CALCULATION_MAX_TIME}ms)`);
    recommendations.push('Enable distance calculation caching for large datasets');
  }
  
  if (metrics.routeFilteringTime > PERFORMANCE_THRESHOLDS.ROUTE_FILTERING_MAX_TIME) {
    violations.push(`Route filtering time (${metrics.routeFilteringTime.toFixed(2)}ms) exceeds threshold (${PERFORMANCE_THRESHOLDS.ROUTE_FILTERING_MAX_TIME}ms)`);
    recommendations.push('Implement indexed lookups for stop times and trips data');
  }
  
  if (metrics.totalProcessingTime > PERFORMANCE_THRESHOLDS.TOTAL_PROCESSING_MAX_TIME) {
    violations.push(`Total processing time (${metrics.totalProcessingTime.toFixed(2)}ms) exceeds threshold (${PERFORMANCE_THRESHOLDS.TOTAL_PROCESSING_MAX_TIME}ms)`);
    recommendations.push('Consider breaking processing into smaller chunks or using web workers');
  }
  
  // Check memory usage if available
  if (metrics.memoryUsage && metrics.memoryUsage > PERFORMANCE_THRESHOLDS.MAX_MEMORY_USAGE_MB) {
    violations.push(`Memory usage (${metrics.memoryUsage.toFixed(2)}MB) exceeds threshold (${PERFORMANCE_THRESHOLDS.MAX_MEMORY_USAGE_MB}MB)`);
    recommendations.push('Implement object pooling or reduce data structure overhead');
  }
  
  // Check dataset size recommendations
  if (metrics.datasetSizes.stations > PERFORMANCE_THRESHOLDS.LARGE_STATION_SET_THRESHOLD) {
    recommendations.push('Large station dataset detected - ensure spatial indexing optimizations are enabled');
  }
  
  if (metrics.datasetSizes.vehicles > PERFORMANCE_THRESHOLDS.LARGE_VEHICLE_SET_THRESHOLD) {
    recommendations.push('Large vehicle dataset detected - consider implementing vehicle filtering optimizations');
  }
  
  const isValid = violations.length === 0;
  
  logger.debug('Performance validation completed', {
    isValid,
    violations,
    recommendations,
    metrics
  }, 'NearbyViewPerformance');
  
  return { isValid, violations, recommendations };
};

// ============================================================================
// EXPORTED UTILITIES
// ============================================================================

/**
 * Create a new performance monitor instance
 */
export const createPerformanceMonitor = (): NearbyViewPerformanceMonitor => {
  return new NearbyViewPerformanceMonitor();
};

/**
 * Clear distance calculation cache (useful for testing or memory management)
 */
export const clearDistanceCache = (): void => {
  distanceCache.clear();
};

/**
 * Get distance cache statistics
 */
export const getDistanceCacheStats = (): { size: number; maxSize: number } => {
  return distanceCache.getStats();
};

/**
 * Check if dataset sizes warrant performance optimizations
 */
export const shouldApplyOptimizations = (
  stationCount: number,
  vehicleCount: number,
  routeCount: number
): { stations: boolean; vehicles: boolean; routes: boolean } => {
  return {
    stations: stationCount > PERFORMANCE_THRESHOLDS.LARGE_STATION_SET_THRESHOLD,
    vehicles: vehicleCount > PERFORMANCE_THRESHOLDS.LARGE_VEHICLE_SET_THRESHOLD,
    routes: routeCount > PERFORMANCE_THRESHOLDS.LARGE_ROUTE_SET_THRESHOLD
  };
};