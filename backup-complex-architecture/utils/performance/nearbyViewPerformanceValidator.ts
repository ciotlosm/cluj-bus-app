/**
 * Production performance validation utilities for Nearby View
 * 
 * This module provides runtime performance validation and monitoring
 * that can be used in production to ensure the nearby view system
 * continues to meet performance requirements.
 * 
 * Requirements: 5.5 - Performance optimization and validation
 */

import { logger } from '../shared/logger';
import { performanceMonitor } from '../performance/performance';
import {
  PERFORMANCE_THRESHOLDS,
  validateNearbyViewPerformance,
  type NearbyViewPerformanceMetrics
} from './nearbyViewPerformance';

// ============================================================================
// PERFORMANCE VALIDATION CONFIGURATION
// ============================================================================

/**
 * Configuration for production performance monitoring
 */
export interface PerformanceValidationConfig {
  enableValidation: boolean;
  enableMetricsCollection: boolean;
  enablePerformanceWarnings: boolean;
  enablePerformanceRecommendations: boolean;
  validationSampleRate: number; // 0.0 to 1.0 - fraction of operations to validate
  metricsRetentionDays: number;
  alertThresholds: {
    violationRate: number; // Alert if violation rate exceeds this (0.0 to 1.0)
    averageProcessingTime: number; // Alert if average exceeds this (ms)
    memoryUsageIncrease: number; // Alert if memory increase exceeds this (MB)
  };
}

/**
 * Default production configuration
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceValidationConfig = {
  enableValidation: true,
  enableMetricsCollection: true,
  enablePerformanceWarnings: true,
  enablePerformanceRecommendations: false, // Disable recommendations in production
  validationSampleRate: 0.1, // Validate 10% of operations
  metricsRetentionDays: 7,
  alertThresholds: {
    violationRate: 0.2, // Alert if 20% of operations violate thresholds
    averageProcessingTime: PERFORMANCE_THRESHOLDS.TOTAL_PROCESSING_MAX_TIME * 1.5,
    memoryUsageIncrease: 300 // Increased to 300MB for realistic production usage with safety margin
  }
};

// ============================================================================
// PERFORMANCE METRICS AGGREGATOR
// ============================================================================

/**
 * Aggregated performance statistics
 */
export interface PerformanceStatistics {
  totalOperations: number;
  validatedOperations: number;
  violationCount: number;
  violationRate: number;
  averageProcessingTime: number;
  averageStationSelectionTime: number;
  averageDistanceCalculationTime: number;
  averageRouteFilteringTime: number;
  averageMemoryUsage: number;
  commonOptimizations: string[];
  commonViolations: string[];
  lastUpdated: Date;
}

/**
 * Performance metrics aggregator for production monitoring
 */
class PerformanceMetricsAggregator {
  private config: PerformanceValidationConfig;
  private statistics: PerformanceStatistics;
  private recentMetrics: NearbyViewPerformanceMetrics[] = [];
  private maxRecentMetrics = 1000;
  
  constructor(config: PerformanceValidationConfig = DEFAULT_PERFORMANCE_CONFIG) {
    this.config = config;
    this.statistics = this.initializeStatistics();
  }
  
  /**
   * Process performance metrics from a nearby view operation
   */
  processMetrics(metrics: NearbyViewPerformanceMetrics): void {
    if (!this.config.enableMetricsCollection) {
      return;
    }
    
    this.statistics.totalOperations++;
    
    // Sample validation based on configured rate
    const shouldValidate = Math.random() < this.config.validationSampleRate;
    
    if (shouldValidate && this.config.enableValidation) {
      this.validateAndRecord(metrics);
    }
    
    // Always collect basic metrics for aggregation
    this.updateAggregatedMetrics(metrics);
    
    // Store recent metrics for trend analysis
    this.storeRecentMetrics(metrics);
    
    // Check alert thresholds
    this.checkAlertThresholds();
    
    this.statistics.lastUpdated = new Date();
  }
  
  /**
   * Validate metrics and record results
   */
  private validateAndRecord(metrics: NearbyViewPerformanceMetrics): void {
    this.statistics.validatedOperations++;
    
    const validation = validateNearbyViewPerformance(metrics);
    
    if (!validation.isValid) {
      this.statistics.violationCount++;
      
      // Record common violations
      validation.violations.forEach(violation => {
        if (!this.statistics.commonViolations.includes(violation)) {
          this.statistics.commonViolations.push(violation);
        }
      });
      
      if (this.config.enablePerformanceWarnings) {
        logger.warn('Performance validation failed in production', {
          violations: validation.violations,
          metrics: {
            totalProcessingTime: metrics.totalProcessingTime,
            stationSelectionTime: metrics.stationSelectionTime,
            distanceCalculationTime: metrics.distanceCalculationTime,
            routeFilteringTime: metrics.routeFilteringTime,
            datasetSizes: metrics.datasetSizes
          }
        }, 'NearbyViewPerformanceValidator');
      }
    }
    
    // Record optimizations
    metrics.optimizationsApplied.forEach(optimization => {
      if (!this.statistics.commonOptimizations.includes(optimization)) {
        this.statistics.commonOptimizations.push(optimization);
      }
    });
    
    // Log recommendations if enabled
    if (this.config.enablePerformanceRecommendations && validation.recommendations.length > 0) {
      logger.info('Performance recommendations available', {
        recommendations: validation.recommendations
      }, 'NearbyViewPerformanceValidator');
    }
    
    // Update violation rate
    this.statistics.violationRate = this.statistics.violationCount / this.statistics.validatedOperations;
  }
  
  /**
   * Update aggregated metrics
   */
  private updateAggregatedMetrics(metrics: NearbyViewPerformanceMetrics): void {
    const totalOps = this.statistics.totalOperations;
    
    // Update running averages
    this.statistics.averageProcessingTime = this.updateRunningAverage(
      this.statistics.averageProcessingTime,
      metrics.totalProcessingTime,
      totalOps
    );
    
    this.statistics.averageStationSelectionTime = this.updateRunningAverage(
      this.statistics.averageStationSelectionTime,
      metrics.stationSelectionTime,
      totalOps
    );
    
    this.statistics.averageDistanceCalculationTime = this.updateRunningAverage(
      this.statistics.averageDistanceCalculationTime,
      metrics.distanceCalculationTime,
      totalOps
    );
    
    this.statistics.averageRouteFilteringTime = this.updateRunningAverage(
      this.statistics.averageRouteFilteringTime,
      metrics.routeFilteringTime,
      totalOps
    );
    
    if (metrics.memoryUsage !== undefined) {
      this.statistics.averageMemoryUsage = this.updateRunningAverage(
        this.statistics.averageMemoryUsage,
        metrics.memoryUsage,
        totalOps
      );
    }
  }
  
  /**
   * Update running average
   */
  private updateRunningAverage(currentAverage: number, newValue: number, count: number): number {
    return (currentAverage * (count - 1) + newValue) / count;
  }
  
  /**
   * Store recent metrics for trend analysis
   */
  private storeRecentMetrics(metrics: NearbyViewPerformanceMetrics): void {
    this.recentMetrics.push(metrics);
    
    // Limit stored metrics to prevent memory growth
    if (this.recentMetrics.length > this.maxRecentMetrics) {
      this.recentMetrics = this.recentMetrics.slice(-this.maxRecentMetrics / 2);
    }
  }
  
  /**
   * Check alert thresholds and log alerts
   */
  private checkAlertThresholds(): void {
    const thresholds = this.config.alertThresholds;
    
    // Check violation rate
    if (this.statistics.violationRate > thresholds.violationRate && this.statistics.validatedOperations > 10) {
      logger.warn('Performance violation rate alert', {
        violationRate: this.statistics.violationRate,
        threshold: thresholds.violationRate,
        violationCount: this.statistics.violationCount,
        validatedOperations: this.statistics.validatedOperations
      }, 'NearbyViewPerformanceValidator');
    }
    
    // Check average processing time
    if (this.statistics.averageProcessingTime > thresholds.averageProcessingTime && this.statistics.totalOperations > 10) {
      logger.warn('Average processing time alert', {
        averageProcessingTime: this.statistics.averageProcessingTime,
        threshold: thresholds.averageProcessingTime,
        totalOperations: this.statistics.totalOperations
      }, 'NearbyViewPerformanceValidator');
    }
    
    // Check memory usage increase
    if (this.statistics.averageMemoryUsage > thresholds.memoryUsageIncrease && this.statistics.totalOperations > 10) {
      logger.warn('Memory usage increase alert', {
        averageMemoryUsage: this.statistics.averageMemoryUsage,
        threshold: thresholds.memoryUsageIncrease,
        totalOperations: this.statistics.totalOperations
      }, 'NearbyViewPerformanceValidator');
    }
  }
  
  /**
   * Get current performance statistics
   */
  getStatistics(): PerformanceStatistics {
    return { ...this.statistics };
  }
  
  /**
   * Get recent performance trends
   */
  getRecentTrends(windowSize: number = 100): {
    processingTimeTrend: number[];
    violationTrend: boolean[];
    optimizationUsage: Record<string, number>;
  } {
    const recentWindow = this.recentMetrics.slice(-windowSize);
    
    const processingTimeTrend = recentWindow.map(m => m.totalProcessingTime);
    const violationTrend = recentWindow.map(m => m.performanceWarnings.length > 0);
    
    const optimizationUsage: Record<string, number> = {};
    recentWindow.forEach(metrics => {
      metrics.optimizationsApplied.forEach(opt => {
        optimizationUsage[opt] = (optimizationUsage[opt] || 0) + 1;
      });
    });
    
    return {
      processingTimeTrend,
      violationTrend,
      optimizationUsage
    };
  }
  
  /**
   * Reset statistics (useful for testing or periodic resets)
   */
  reset(): void {
    this.statistics = this.initializeStatistics();
    this.recentMetrics = [];
  }
  
  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PerformanceValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
  
  /**
   * Initialize statistics structure
   */
  private initializeStatistics(): PerformanceStatistics {
    return {
      totalOperations: 0,
      validatedOperations: 0,
      violationCount: 0,
      violationRate: 0,
      averageProcessingTime: 0,
      averageStationSelectionTime: 0,
      averageDistanceCalculationTime: 0,
      averageRouteFilteringTime: 0,
      averageMemoryUsage: 0,
      commonOptimizations: [],
      commonViolations: [],
      lastUpdated: new Date()
    };
  }
}

// ============================================================================
// GLOBAL PERFORMANCE VALIDATOR
// ============================================================================

/**
 * Global performance validator instance
 */
let globalValidator: PerformanceMetricsAggregator | null = null;

/**
 * Initialize global performance validator
 */
export const initializePerformanceValidator = (
  config: PerformanceValidationConfig = DEFAULT_PERFORMANCE_CONFIG
): void => {
  globalValidator = new PerformanceMetricsAggregator(config);
  
  logger.info('Performance validator initialized', {
    config: {
      enableValidation: config.enableValidation,
      enableMetricsCollection: config.enableMetricsCollection,
      validationSampleRate: config.validationSampleRate
    }
  }, 'NearbyViewPerformanceValidator');
};

/**
 * Process performance metrics through global validator
 */
export const validatePerformanceMetrics = (metrics: NearbyViewPerformanceMetrics): void => {
  if (!globalValidator) {
    // Auto-initialize with default config if not already initialized
    initializePerformanceValidator();
  }
  
  globalValidator!.processMetrics(metrics);
};

/**
 * Get global performance statistics
 */
export const getGlobalPerformanceStatistics = (): PerformanceStatistics | null => {
  return globalValidator ? globalValidator.getStatistics() : null;
};

/**
 * Get global performance trends
 */
export const getGlobalPerformanceTrends = (windowSize?: number) => {
  return globalValidator ? globalValidator.getRecentTrends(windowSize) : null;
};

/**
 * Update global validator configuration
 */
export const updateGlobalValidatorConfig = (config: Partial<PerformanceValidationConfig>): void => {
  if (globalValidator) {
    globalValidator.updateConfig(config);
  }
};

/**
 * Reset global performance statistics
 */
export const resetGlobalPerformanceStatistics = (): void => {
  if (globalValidator) {
    globalValidator.reset();
  }
};

// ============================================================================
// PERFORMANCE MONITORING HOOK
// ============================================================================

/**
 * React hook for performance monitoring in components
 */
export const useNearbyViewPerformanceMonitoring = () => {
  const recordMetrics = (metrics: NearbyViewPerformanceMetrics) => {
    validatePerformanceMetrics(metrics);
    
    // Also record in global performance monitor for debugging
    performanceMonitor.recordTiming('nearby_view.total_processing', metrics.totalProcessingTime);
    performanceMonitor.recordTiming('nearby_view.station_selection', metrics.stationSelectionTime);
    performanceMonitor.recordTiming('nearby_view.distance_calculation', metrics.distanceCalculationTime);
    performanceMonitor.recordTiming('nearby_view.route_filtering', metrics.routeFilteringTime);
    
    if (metrics.memoryUsage !== undefined) {
      performanceMonitor.recordGauge('nearby_view.memory_usage', metrics.memoryUsage);
    }
  };
  
  const getStatistics = () => getGlobalPerformanceStatistics();
  const getTrends = (windowSize?: number) => getGlobalPerformanceTrends(windowSize);
  
  return {
    recordMetrics,
    getStatistics,
    getTrends
  };
};

// ============================================================================
// DEVELOPMENT UTILITIES
// ============================================================================

/**
 * Development-only performance debugging utilities
 */
export const developmentPerformanceUtils = {
  /**
   * Log detailed performance breakdown
   */
  logPerformanceBreakdown: (metrics: NearbyViewPerformanceMetrics) => {
    // Performance logging removed for production
  },
  
  /**
   * Compare performance against thresholds
   */
  compareAgainstThresholds: (metrics: NearbyViewPerformanceMetrics) => {
    if (import.meta.env.DEV) {
      const validation = validateNearbyViewPerformance(metrics);
      
      // Performance threshold logging removed for production
    }
  }
};