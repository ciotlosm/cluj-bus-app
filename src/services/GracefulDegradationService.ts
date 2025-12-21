/**
 * Graceful Degradation Service
 * 
 * Provides comprehensive graceful degradation for missing vehicle data,
 * route data unavailability, and performance issues. Implements fallback
 * behavior and circuit breaker patterns for robust error handling.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import type { CoreVehicle } from '../types/coreVehicle';
import type { RouteActivityInfo } from './RouteActivityAnalyzer';
import type { FilteringResult } from './IntelligentVehicleFilter';
import type { RouteFilteringConfig } from '../types/routeFiltering';
import { DEFAULT_ROUTE_FILTERING_CONFIG } from '../types/routeFiltering';
import { logger } from '../utils/shared/logger';

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

/**
 * Degradation level for different failure scenarios
 */
export enum DegradationLevel {
  NONE = 'none',
  MINIMAL = 'minimal',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  CRITICAL = 'critical'
}

/**
 * Fallback strategy for different types of failures
 */
export enum FallbackStrategy {
  USE_CACHE = 'use_cache',
  USE_DEFAULTS = 'use_defaults',
  SKIP_FILTERING = 'skip_filtering',
  REDUCE_FUNCTIONALITY = 'reduce_functionality',
  EMERGENCY_MODE = 'emergency_mode'
}

/**
 * Circuit breaker state
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

/**
 * Degradation context with failure information
 */
export interface DegradationContext {
  failureType: string;
  failureMessage: string;
  degradationLevel: DegradationLevel;
  fallbackStrategy: FallbackStrategy;
  timestamp: Date;
  affectedComponents: string[];
  recoveryActions: string[];
  estimatedRecoveryTime?: number;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  windowSize: number;
  enabled: boolean;
}

/**
 * Circuit breaker state information
 */
export interface CircuitBreakerInfo {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
  config: CircuitBreakerConfig;
}

/**
 * Fallback vehicle data for missing information
 */
export interface FallbackVehicleData {
  vehicles: CoreVehicle[];
  source: 'cache' | 'defaults' | 'partial';
  confidence: number;
  limitations: string[];
  lastUpdated: Date;
}

/**
 * Fallback route activity for missing route data
 */
export interface FallbackRouteActivity {
  routeActivities: Map<string, RouteActivityInfo>;
  source: 'cache' | 'estimated' | 'defaults';
  confidence: number;
  limitations: string[];
  lastUpdated: Date;
}

/**
 * Performance issue detection result
 */
export interface PerformanceIssue {
  detected: boolean;
  severity: DegradationLevel;
  metrics: {
    responseTime: number;
    memoryUsage: number;
    errorRate: number;
    throughput: number;
  };
  recommendations: string[];
  circuitBreakerTriggered: boolean;
}

// ============================================================================
// GRACEFUL DEGRADATION SERVICE INTERFACE
// ============================================================================

export interface IGracefulDegradationService {
  // Vehicle data fallbacks
  handleMissingVehicleData(context: DegradationContext): Promise<FallbackVehicleData>;
  
  // Route data fallbacks
  handleRouteDataUnavailability(context: DegradationContext): Promise<FallbackRouteActivity>;
  
  // Performance issue handling
  handlePerformanceIssues(issue: PerformanceIssue): Promise<DegradationContext>;
  
  // Configuration fallbacks
  handleInvalidConfiguration(config: Partial<RouteFilteringConfig>): RouteFilteringConfig;
  
  // Circuit breaker management
  getCircuitBreakerInfo(component: string): CircuitBreakerInfo;
  updateCircuitBreaker(component: string, success: boolean): void;
  resetCircuitBreaker(component: string): void;
  
  // Degradation monitoring
  getCurrentDegradationLevel(): DegradationLevel;
  getDegradationHistory(): DegradationContext[];
  clearDegradationHistory(): void;
}

// ============================================================================
// GRACEFUL DEGRADATION SERVICE IMPLEMENTATION
// ============================================================================

/**
 * Comprehensive graceful degradation service implementation
 */
export class GracefulDegradationService implements IGracefulDegradationService {
  private circuitBreakers = new Map<string, CircuitBreakerInfo>();
  private degradationHistory: DegradationContext[] = [];
  private vehicleDataCache = new Map<string, FallbackVehicleData>();
  private routeActivityCache = new Map<string, FallbackRouteActivity>();
  
  private readonly DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 60000, // 1 minute
    windowSize: 300000, // 5 minutes
    enabled: true
  };
  
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_HISTORY_SIZE = 1000;

  constructor() {
    this.initializeCircuitBreakers();
    this.startPeriodicCleanup();
    
    logger.info('GracefulDegradationService initialized', {
      circuitBreakerConfig: this.DEFAULT_CIRCUIT_BREAKER_CONFIG,
      cacheTTL: this.CACHE_TTL
    });
  }

  // ============================================================================
  // VEHICLE DATA FALLBACK HANDLING
  // ============================================================================

  /**
   * Handle missing vehicle data with graceful degradation
   * 
   * Requirements 7.1: Graceful degradation for missing vehicle data
   */
  async handleMissingVehicleData(context: DegradationContext): Promise<FallbackVehicleData> {
    logger.warn('Handling missing vehicle data', {
      failureType: context.failureType,
      degradationLevel: context.degradationLevel,
      fallbackStrategy: context.fallbackStrategy
    });

    // Record degradation event
    this.recordDegradationEvent(context);

    switch (context.fallbackStrategy) {
      case FallbackStrategy.USE_CACHE:
        return await this.getFallbackVehicleDataFromCache();
        
      case FallbackStrategy.USE_DEFAULTS:
        return this.generateDefaultVehicleData();
        
      case FallbackStrategy.EMERGENCY_MODE:
        return this.getEmergencyVehicleData();
        
      default:
        logger.warn('Unknown fallback strategy, using cache', {
          strategy: context.fallbackStrategy
        });
        return await this.getFallbackVehicleDataFromCache();
    }
  }

  /**
   * Get fallback vehicle data from cache
   */
  private async getFallbackVehicleDataFromCache(): Promise<FallbackVehicleData> {
    // Look for recent cached data
    const cacheEntries = Array.from(this.vehicleDataCache.values());
    const validEntries = cacheEntries.filter(entry => 
      Date.now() - entry.lastUpdated.getTime() < this.CACHE_TTL
    );

    if (validEntries.length > 0) {
      // Use the most recent valid entry
      const mostRecent = validEntries.reduce((latest, current) => 
        current.lastUpdated > latest.lastUpdated ? current : latest
      );

      logger.info('Using cached vehicle data as fallback', {
        vehicleCount: mostRecent.vehicles.length,
        age: Date.now() - mostRecent.lastUpdated.getTime(),
        confidence: mostRecent.confidence
      });

      return {
        ...mostRecent,
        source: 'cache',
        limitations: [
          ...mostRecent.limitations,
          'Data may be outdated',
          'Real-time updates unavailable'
        ]
      };
    }

    // No valid cache, use defaults
    return this.generateDefaultVehicleData();
  }

  /**
   * Generate default vehicle data when no cache is available
   */
  private generateDefaultVehicleData(): FallbackVehicleData {
    logger.warn('No cached vehicle data available, using empty defaults');

    return {
      vehicles: [],
      source: 'defaults',
      confidence: 0.1,
      limitations: [
        'No vehicle data available',
        'Service temporarily unavailable',
        'Please try again later'
      ],
      lastUpdated: new Date()
    };
  }

  /**
   * Get emergency vehicle data with minimal functionality
   */
  private getEmergencyVehicleData(): FallbackVehicleData {
    logger.error('Emergency mode activated for vehicle data');

    return {
      vehicles: [],
      source: 'defaults',
      confidence: 0.0,
      limitations: [
        'Emergency mode active',
        'All vehicle tracking temporarily disabled',
        'Service under maintenance'
      ],
      lastUpdated: new Date()
    };
  }

  // ============================================================================
  // ROUTE DATA FALLBACK HANDLING
  // ============================================================================

  /**
   * Handle route data unavailability with fallback behavior
   * 
   * Requirements 7.2: Fallback behavior for route data unavailability
   */
  async handleRouteDataUnavailability(context: DegradationContext): Promise<FallbackRouteActivity> {
    logger.warn('Handling route data unavailability', {
      failureType: context.failureType,
      degradationLevel: context.degradationLevel,
      fallbackStrategy: context.fallbackStrategy
    });

    // Record degradation event
    this.recordDegradationEvent(context);

    switch (context.fallbackStrategy) {
      case FallbackStrategy.USE_CACHE:
        return await this.getFallbackRouteActivityFromCache();
        
      case FallbackStrategy.USE_DEFAULTS:
        return this.generateDefaultRouteActivity();
        
      case FallbackStrategy.SKIP_FILTERING:
        return this.getNoFilteringRouteActivity();
        
      default:
        return await this.getFallbackRouteActivityFromCache();
    }
  }

  /**
   * Get fallback route activity from cache
   */
  private async getFallbackRouteActivityFromCache(): Promise<FallbackRouteActivity> {
    const cacheEntries = Array.from(this.routeActivityCache.values());
    const validEntries = cacheEntries.filter(entry => 
      Date.now() - entry.lastUpdated.getTime() < this.CACHE_TTL
    );

    if (validEntries.length > 0) {
      const mostRecent = validEntries.reduce((latest, current) => 
        current.lastUpdated > latest.lastUpdated ? current : latest
      );

      logger.info('Using cached route activity as fallback', {
        routeCount: mostRecent.routeActivities.size,
        age: Date.now() - mostRecent.lastUpdated.getTime(),
        confidence: mostRecent.confidence
      });

      return {
        ...mostRecent,
        source: 'cache',
        limitations: [
          ...mostRecent.limitations,
          'Route activity data may be outdated',
          'Filtering decisions based on stale data'
        ]
      };
    }

    return this.generateDefaultRouteActivity();
  }

  /**
   * Generate default route activity when no data is available
   */
  private generateDefaultRouteActivity(): FallbackRouteActivity {
    logger.warn('No cached route activity available, using defaults');

    return {
      routeActivities: new Map(),
      source: 'defaults',
      confidence: 0.2,
      limitations: [
        'No route activity data available',
        'All routes treated as quiet',
        'Distance filtering disabled'
      ],
      lastUpdated: new Date()
    };
  }

  /**
   * Get route activity that skips all filtering
   */
  private getNoFilteringRouteActivity(): FallbackRouteActivity {
    logger.info('Skipping route-based filtering due to data unavailability');

    return {
      routeActivities: new Map(),
      source: 'defaults',
      confidence: 0.5,
      limitations: [
        'Route-based filtering disabled',
        'All vehicles shown regardless of activity',
        'Distance filtering may still apply'
      ],
      lastUpdated: new Date()
    };
  }

  // ============================================================================
  // PERFORMANCE ISSUE HANDLING
  // ============================================================================

  /**
   * Handle performance issues with circuit breaker patterns
   * 
   * Requirements 7.3: Circuit breaker pattern for performance issues
   */
  async handlePerformanceIssues(issue: PerformanceIssue): Promise<DegradationContext> {
    logger.warn('Performance issue detected', {
      severity: issue.severity,
      metrics: issue.metrics,
      circuitBreakerTriggered: issue.circuitBreakerTriggered
    });

    // Determine degradation level and strategy based on performance metrics
    const degradationLevel = this.determineDegradationLevel(issue);
    const fallbackStrategy = this.determineFallbackStrategy(issue);

    const context: DegradationContext = {
      failureType: 'performance_degradation',
      failureMessage: `Performance issue detected: ${issue.severity}`,
      degradationLevel,
      fallbackStrategy,
      timestamp: new Date(),
      affectedComponents: ['route-analysis', 'vehicle-filtering', 'data-transformation'],
      recoveryActions: issue.recommendations,
      estimatedRecoveryTime: this.estimateRecoveryTime(issue)
    };

    // Update circuit breakers if needed
    if (issue.circuitBreakerTriggered) {
      this.updateCircuitBreaker('performance-monitor', false);
    }

    // Apply performance optimizations
    await this.applyPerformanceOptimizations(issue);

    this.recordDegradationEvent(context);
    return context;
  }

  /**
   * Determine degradation level based on performance metrics
   */
  private determineDegradationLevel(issue: PerformanceIssue): DegradationLevel {
    const { responseTime, memoryUsage, errorRate, throughput } = issue.metrics;

    // Critical performance issues
    if (responseTime > 10000 || memoryUsage > 0.9 || errorRate > 0.5) {
      return DegradationLevel.CRITICAL;
    }

    // Severe performance issues
    if (responseTime > 5000 || memoryUsage > 0.8 || errorRate > 0.3) {
      return DegradationLevel.SEVERE;
    }

    // Moderate performance issues
    if (responseTime > 2000 || memoryUsage > 0.7 || errorRate > 0.1) {
      return DegradationLevel.MODERATE;
    }

    // Minimal performance issues
    if (responseTime > 1000 || memoryUsage > 0.6 || errorRate > 0.05) {
      return DegradationLevel.MINIMAL;
    }

    return DegradationLevel.NONE;
  }

  /**
   * Determine fallback strategy based on performance issue
   */
  private determineFallbackStrategy(issue: PerformanceIssue): FallbackStrategy {
    switch (issue.severity) {
      case DegradationLevel.CRITICAL:
        return FallbackStrategy.EMERGENCY_MODE;
      case DegradationLevel.SEVERE:
        return FallbackStrategy.REDUCE_FUNCTIONALITY;
      case DegradationLevel.MODERATE:
        return FallbackStrategy.USE_CACHE;
      case DegradationLevel.MINIMAL:
        return FallbackStrategy.USE_DEFAULTS;
      default:
        return FallbackStrategy.USE_CACHE;
    }
  }

  /**
   * Apply performance optimizations based on detected issues
   */
  private async applyPerformanceOptimizations(issue: PerformanceIssue): Promise<void> {
    const { responseTime, memoryUsage, errorRate } = issue.metrics;

    // Reduce cache sizes if memory usage is high
    if (memoryUsage > 0.8) {
      this.reduceCacheSizes();
      logger.info('Reduced cache sizes due to high memory usage');
    }

    // Increase timeouts if response time is high
    if (responseTime > 5000) {
      this.adjustTimeouts(responseTime);
      logger.info('Adjusted timeouts due to slow response times');
    }

    // Enable circuit breakers if error rate is high
    if (errorRate > 0.2) {
      this.enableStrictCircuitBreakers();
      logger.info('Enabled strict circuit breakers due to high error rate');
    }
  }

  /**
   * Estimate recovery time based on performance issue severity
   */
  private estimateRecoveryTime(issue: PerformanceIssue): number {
    switch (issue.severity) {
      case DegradationLevel.CRITICAL:
        return 300000; // 5 minutes
      case DegradationLevel.SEVERE:
        return 180000; // 3 minutes
      case DegradationLevel.MODERATE:
        return 120000; // 2 minutes
      case DegradationLevel.MINIMAL:
        return 60000;  // 1 minute
      default:
        return 30000;  // 30 seconds
    }
  }

  // ============================================================================
  // CONFIGURATION FALLBACK HANDLING
  // ============================================================================

  /**
   * Handle invalid configuration with defaults and warnings
   * 
   * Requirements 7.4: Handle invalid configuration with defaults and warnings
   */
  handleInvalidConfiguration(config: Partial<RouteFilteringConfig>): RouteFilteringConfig {
    logger.warn('Invalid configuration detected, applying fallbacks', {
      providedConfig: config
    });

    const fallbackConfig: RouteFilteringConfig = {
      ...DEFAULT_ROUTE_FILTERING_CONFIG
    };

    // Apply valid values from provided config
    if (config.busyRouteThreshold !== undefined && 
        Number.isInteger(config.busyRouteThreshold) && 
        config.busyRouteThreshold >= 0 && 
        config.busyRouteThreshold <= 50) {
      fallbackConfig.busyRouteThreshold = config.busyRouteThreshold;
    } else if (config.busyRouteThreshold !== undefined) {
      logger.warn('Invalid busyRouteThreshold, using default', {
        provided: config.busyRouteThreshold,
        default: fallbackConfig.busyRouteThreshold
      });
    }

    if (config.distanceFilterThreshold !== undefined && 
        Number.isInteger(config.distanceFilterThreshold) && 
        config.distanceFilterThreshold >= 100 && 
        config.distanceFilterThreshold <= 10000) {
      fallbackConfig.distanceFilterThreshold = config.distanceFilterThreshold;
    } else if (config.distanceFilterThreshold !== undefined) {
      logger.warn('Invalid distanceFilterThreshold, using default', {
        provided: config.distanceFilterThreshold,
        default: fallbackConfig.distanceFilterThreshold
      });
    }

    if (typeof config.enableDebugLogging === 'boolean') {
      fallbackConfig.enableDebugLogging = config.enableDebugLogging;
    } else if (config.enableDebugLogging !== undefined) {
      logger.warn('Invalid enableDebugLogging, using default', {
        provided: config.enableDebugLogging,
        default: fallbackConfig.enableDebugLogging
      });
    }

    if (typeof config.performanceMonitoring === 'boolean') {
      fallbackConfig.performanceMonitoring = config.performanceMonitoring;
    } else if (config.performanceMonitoring !== undefined) {
      logger.warn('Invalid performanceMonitoring, using default', {
        provided: config.performanceMonitoring,
        default: fallbackConfig.performanceMonitoring
      });
    }

    // Record configuration fallback event
    const context: DegradationContext = {
      failureType: 'invalid_configuration',
      failureMessage: 'Invalid configuration values detected',
      degradationLevel: DegradationLevel.MINIMAL,
      fallbackStrategy: FallbackStrategy.USE_DEFAULTS,
      timestamp: new Date(),
      affectedComponents: ['configuration-manager'],
      recoveryActions: [
        'Review configuration values',
        'Check configuration validation rules',
        'Update configuration with valid values'
      ]
    };

    this.recordDegradationEvent(context);

    logger.info('Configuration fallback applied', {
      originalConfig: config,
      fallbackConfig
    });

    return fallbackConfig;
  }

  // ============================================================================
  // CIRCUIT BREAKER MANAGEMENT
  // ============================================================================

  /**
   * Get circuit breaker information for a component
   */
  getCircuitBreakerInfo(component: string): CircuitBreakerInfo {
    return this.circuitBreakers.get(component) || this.createCircuitBreaker(component);
  }

  /**
   * Update circuit breaker state based on operation success/failure
   */
  updateCircuitBreaker(component: string, success: boolean): void {
    let breaker = this.circuitBreakers.get(component);
    if (!breaker) {
      breaker = this.createCircuitBreaker(component);
    }

    if (success) {
      breaker.successCount++;
      breaker.failureCount = Math.max(0, breaker.failureCount - 1);

      // Transition from half-open to closed if enough successes
      if (breaker.state === CircuitBreakerState.HALF_OPEN && 
          breaker.successCount >= breaker.config.successThreshold) {
        breaker.state = CircuitBreakerState.CLOSED;
        breaker.failureCount = 0;
        logger.info('Circuit breaker closed', { component });
      }
    } else {
      breaker.failureCount++;
      breaker.successCount = 0;
      breaker.lastFailureTime = new Date();

      // Transition to open if failure threshold exceeded
      if (breaker.state === CircuitBreakerState.CLOSED && 
          breaker.failureCount >= breaker.config.failureThreshold) {
        breaker.state = CircuitBreakerState.OPEN;
        breaker.nextAttemptTime = new Date(Date.now() + breaker.config.timeout);
        logger.warn('Circuit breaker opened', { component, failureCount: breaker.failureCount });
      }
    }

    // Check if open circuit breaker should transition to half-open
    if (breaker.state === CircuitBreakerState.OPEN && 
        breaker.nextAttemptTime && 
        new Date() >= breaker.nextAttemptTime) {
      breaker.state = CircuitBreakerState.HALF_OPEN;
      breaker.successCount = 0;
      logger.info('Circuit breaker half-opened', { component });
    }

    this.circuitBreakers.set(component, breaker);
  }

  /**
   * Reset circuit breaker to closed state
   */
  resetCircuitBreaker(component: string): void {
    const breaker = this.circuitBreakers.get(component);
    if (breaker) {
      breaker.state = CircuitBreakerState.CLOSED;
      breaker.failureCount = 0;
      breaker.successCount = 0;
      breaker.lastFailureTime = undefined;
      breaker.nextAttemptTime = undefined;
      
      logger.info('Circuit breaker reset', { component });
    }
  }

  // ============================================================================
  // DEGRADATION MONITORING
  // ============================================================================

  /**
   * Get current overall degradation level
   */
  getCurrentDegradationLevel(): DegradationLevel {
    if (this.degradationHistory.length === 0) {
      return DegradationLevel.NONE;
    }

    // Look at recent degradation events (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentEvents = this.degradationHistory.filter(event => 
      event.timestamp > fiveMinutesAgo
    );

    if (recentEvents.length === 0) {
      return DegradationLevel.NONE;
    }

    // Return the highest degradation level from recent events
    const levels = recentEvents.map(event => event.degradationLevel);
    const levelPriority = {
      [DegradationLevel.CRITICAL]: 5,
      [DegradationLevel.SEVERE]: 4,
      [DegradationLevel.MODERATE]: 3,
      [DegradationLevel.MINIMAL]: 2,
      [DegradationLevel.NONE]: 1
    };

    return levels.reduce((highest, current) => 
      levelPriority[current] > levelPriority[highest] ? current : highest
    );
  }

  /**
   * Get degradation history for monitoring
   */
  getDegradationHistory(): DegradationContext[] {
    return [...this.degradationHistory];
  }

  /**
   * Clear degradation history
   */
  clearDegradationHistory(): void {
    this.degradationHistory = [];
    logger.info('Degradation history cleared');
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Initialize circuit breakers for key components
   */
  private initializeCircuitBreakers(): void {
    const components = [
      'route-activity-analyzer',
      'vehicle-filter',
      'configuration-manager',
      'data-validator',
      'performance-monitor'
    ];

    components.forEach(component => {
      this.createCircuitBreaker(component);
    });
  }

  /**
   * Create a new circuit breaker for a component
   */
  private createCircuitBreaker(component: string): CircuitBreakerInfo {
    const breaker: CircuitBreakerInfo = {
      state: CircuitBreakerState.CLOSED,
      failureCount: 0,
      successCount: 0,
      config: { ...this.DEFAULT_CIRCUIT_BREAKER_CONFIG }
    };

    this.circuitBreakers.set(component, breaker);
    return breaker;
  }

  /**
   * Record a degradation event in history
   */
  private recordDegradationEvent(context: DegradationContext): void {
    this.degradationHistory.push(context);

    // Maintain history size limit
    if (this.degradationHistory.length > this.MAX_HISTORY_SIZE) {
      this.degradationHistory = this.degradationHistory.slice(-this.MAX_HISTORY_SIZE);
    }

    logger.info('Degradation event recorded', {
      failureType: context.failureType,
      degradationLevel: context.degradationLevel,
      fallbackStrategy: context.fallbackStrategy
    });
  }

  /**
   * Reduce cache sizes to free memory
   */
  private reduceCacheSizes(): void {
    // Clear old cache entries
    const now = Date.now();
    const reducedTTL = this.CACHE_TTL / 2;

    // Reduce vehicle data cache
    for (const [key, entry] of this.vehicleDataCache.entries()) {
      if (now - entry.lastUpdated.getTime() > reducedTTL) {
        this.vehicleDataCache.delete(key);
      }
    }

    // Reduce route activity cache
    for (const [key, entry] of this.routeActivityCache.entries()) {
      if (now - entry.lastUpdated.getTime() > reducedTTL) {
        this.routeActivityCache.delete(key);
      }
    }
  }

  /**
   * Adjust timeouts based on performance issues
   */
  private adjustTimeouts(responseTime: number): void {
    // Increase circuit breaker timeouts
    for (const breaker of this.circuitBreakers.values()) {
      if (breaker.config.timeout < responseTime * 2) {
        breaker.config.timeout = Math.min(responseTime * 2, 300000); // Max 5 minutes
      }
    }
  }

  /**
   * Enable strict circuit breakers due to high error rates
   */
  private enableStrictCircuitBreakers(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.config.failureThreshold = Math.max(1, breaker.config.failureThreshold / 2);
      breaker.config.successThreshold = breaker.config.successThreshold * 2;
    }
  }

  /**
   * Start periodic cleanup tasks
   */
  private startPeriodicCleanup(): void {
    // Clean up old cache entries every 5 minutes
    setInterval(() => {
      this.cleanupCaches();
    }, 5 * 60 * 1000);

    // Clean up old degradation history every hour
    setInterval(() => {
      this.cleanupDegradationHistory();
    }, 60 * 60 * 1000);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCaches(): void {
    const now = Date.now();

    // Clean vehicle data cache
    for (const [key, entry] of this.vehicleDataCache.entries()) {
      if (now - entry.lastUpdated.getTime() > this.CACHE_TTL) {
        this.vehicleDataCache.delete(key);
      }
    }

    // Clean route activity cache
    for (const [key, entry] of this.routeActivityCache.entries()) {
      if (now - entry.lastUpdated.getTime() > this.CACHE_TTL) {
        this.routeActivityCache.delete(key);
      }
    }
  }

  /**
   * Clean up old degradation history
   */
  private cleanupDegradationHistory(): void {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const initialLength = this.degradationHistory.length;
    
    this.degradationHistory = this.degradationHistory.filter(event => 
      event.timestamp > oneWeekAgo
    );

    const removedCount = initialLength - this.degradationHistory.length;
    if (removedCount > 0) {
      logger.debug('Cleaned up old degradation history', { removedCount });
    }
  }
}

// ============================================================================
// EXPORTED INSTANCE
// ============================================================================

/**
 * Default graceful degradation service instance
 */
export const gracefulDegradationService = new GracefulDegradationService();

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new GracefulDegradationService instance
 */
export function createGracefulDegradationService(): GracefulDegradationService {
  return new GracefulDegradationService();
}