/**
 * Real-Time Configuration Manager
 * 
 * Manages real-time configuration updates for route-based vehicle filtering.
 * Provides immediate application of configuration changes, route transition handling,
 * and performance monitoring with circuit breaker patterns.
 * 
 * Requirements: 2.5, 3.3, 5.1
 */

import type { RouteFilteringConfig, ConfigChangeEvent } from '../../types/routeFiltering';
import type { CoreVehicle } from '../../types/coreVehicle';
import type { RouteActivityInfo, RouteClassification } from './RouteActivityAnalyzer';
import { RouteClassification as RouteClass } from './RouteActivityAnalyzer';
import { routeFilteringConfigurationManager } from './RouteFilteringConfigurationManager';
import { routeActivityAnalyzer } from './RouteActivityAnalyzer';
import { intelligentVehicleFilter } from '../data-processing/IntelligentVehicleFilter';
import { logger } from '../../utils/shared/logger';

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

/**
 * Route transition event when a route changes classification
 */
export interface RouteTransitionEvent {
  routeId: string;
  previousClassification: RouteClassification;
  newClassification: RouteClassification;
  previousVehicleCount: number;
  newVehicleCount: number;
  timestamp: Date;
  configChange?: Partial<RouteFilteringConfig>;
}

/**
 * Performance metrics for real-time configuration updates
 */
export interface RealTimePerformanceMetrics {
  configUpdateTime: number;
  routeRecalculationTime: number;
  filteringUpdateTime: number;
  totalUpdateTime: number;
  routesRecalculated: number;
  vehiclesReprocessed: number;
  transitionsDetected: number;
  circuitBreakerTriggered: boolean;
  lastUpdateTimestamp: Date;
}

/**
 * Circuit breaker state for performance protection
 */
export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime?: Date;
  nextRetryTime?: Date;
  consecutiveSuccesses: number;
}

/**
 * Configuration update context with current data
 */
export interface ConfigUpdateContext {
  currentVehicles: CoreVehicle[];
  currentRouteActivity: Map<string, RouteActivityInfo>;
  previousConfig: RouteFilteringConfig;
  newConfig: RouteFilteringConfig;
  timestamp: Date;
}

/**
 * Real-time update result
 */
export interface RealTimeUpdateResult {
  success: boolean;
  routeTransitions: RouteTransitionEvent[];
  performanceMetrics: RealTimePerformanceMetrics;
  updatedRouteActivity: Map<string, RouteActivityInfo>;
  error?: Error;
}

/**
 * Interface for real-time configuration management
 */
export interface IRealTimeConfigurationManager {
  applyConfigurationUpdate(
    configChange: Partial<RouteFilteringConfig>,
    currentVehicles: CoreVehicle[]
  ): Promise<RealTimeUpdateResult>;
  
  detectRouteTransitions(
    previousActivity: Map<string, RouteActivityInfo>,
    newActivity: Map<string, RouteActivityInfo>,
    configChange?: Partial<RouteFilteringConfig>
  ): RouteTransitionEvent[];
  
  handleRouteTransition(transition: RouteTransitionEvent): Promise<void>;
  
  getPerformanceMetrics(): RealTimePerformanceMetrics;
  
  getCircuitBreakerState(): CircuitBreakerState;
  
  resetCircuitBreaker(): void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Circuit breaker configuration
 */
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 3,
  recoveryTimeoutMs: 30000, // 30 seconds
  performanceThresholdMs: 100, // 100ms max update time
  maxConsecutiveFailures: 5,
} as const;

/**
 * Performance monitoring thresholds
 */
const PERFORMANCE_THRESHOLDS = {
  configUpdateMaxMs: 10,
  routeRecalculationMaxMs: 50,
  filteringUpdateMaxMs: 30,
  totalUpdateMaxMs: 100,
} as const;

// ============================================================================
// REAL-TIME CONFIGURATION MANAGER IMPLEMENTATION
// ============================================================================

/**
 * Real-Time Configuration Manager Implementation
 * 
 * Provides immediate application of configuration changes with performance
 * monitoring and circuit breaker protection.
 */
export class RealTimeConfigurationManager implements IRealTimeConfigurationManager {
  private circuitBreaker: CircuitBreakerState;
  private performanceMetrics: RealTimePerformanceMetrics;
  private transitionCallbacks: Set<(transition: RouteTransitionEvent) => void> = new Set();
  private updateInProgress = false;

  constructor() {
    this.circuitBreaker = this.initializeCircuitBreaker();
    this.performanceMetrics = this.initializePerformanceMetrics();
    
    // Subscribe to configuration changes
    routeFilteringConfigurationManager.onConfigChange(
      (config) => this.handleConfigurationChange(config)
    );
    
    logger.debug('RealTimeConfigurationManager initialized', {
      circuitBreakerConfig: CIRCUIT_BREAKER_CONFIG,
      performanceThresholds: PERFORMANCE_THRESHOLDS
    });
  }

  /**
   * Apply configuration update with immediate effect on current data
   * 
   * @param configChange - Partial configuration changes
   * @param currentVehicles - Current vehicle data to reprocess
   * @returns Update result with transitions and metrics
   * 
   * Requirements 2.5, 3.3: Immediate application of configuration changes
   */
  async applyConfigurationUpdate(
    configChange: Partial<RouteFilteringConfig>,
    currentVehicles: CoreVehicle[]
  ): Promise<RealTimeUpdateResult> {
    const startTime = performance.now();
    
    // Check circuit breaker
    if (this.circuitBreaker.isOpen) {
      const now = new Date();
      if (this.circuitBreaker.nextRetryTime && now < this.circuitBreaker.nextRetryTime) {
        logger.warn('Circuit breaker is open, rejecting configuration update', {
          nextRetryTime: this.circuitBreaker.nextRetryTime,
          failureCount: this.circuitBreaker.failureCount
        });
        
        return {
          success: false,
          routeTransitions: [],
          performanceMetrics: this.performanceMetrics,
          updatedRouteActivity: new Map(),
          error: new Error('Circuit breaker is open - configuration updates temporarily disabled')
        };
      } else {
        // Try to close circuit breaker
        this.circuitBreaker.isOpen = false;
        logger.info('Circuit breaker attempting to close, retrying configuration update');
      }
    }

    // Prevent concurrent updates
    if (this.updateInProgress) {
      logger.warn('Configuration update already in progress, skipping');
      return {
        success: false,
        routeTransitions: [],
        performanceMetrics: this.performanceMetrics,
        updatedRouteActivity: new Map(),
        error: new Error('Configuration update already in progress')
      };
    }

    this.updateInProgress = true;

    try {
      logger.info('Starting real-time configuration update', {
        configChange,
        vehicleCount: currentVehicles.length
      });

      // Get current state
      const previousConfig = routeFilteringConfigurationManager.getRouteFilteringConfig();
      const previousActivity = routeActivityAnalyzer.analyzeRouteActivity(currentVehicles);

      // Apply configuration change
      const configUpdateStart = performance.now();
      routeFilteringConfigurationManager.updateConfig(configChange);
      const newConfig = routeFilteringConfigurationManager.getRouteFilteringConfig();
      const configUpdateTime = performance.now() - configUpdateStart;

      // Recalculate route activity with new configuration
      const routeRecalcStart = performance.now();
      
      // Update analyzer configuration if thresholds changed
      if (configChange.busyRouteThreshold !== undefined) {
        // Clear cache to force recalculation with new threshold
        routeActivityAnalyzer.clearCache();
      }
      
      const newActivity = routeActivityAnalyzer.analyzeRouteActivity(currentVehicles);
      const routeRecalculationTime = performance.now() - routeRecalcStart;

      // Detect route transitions
      const routeTransitions = this.detectRouteTransitions(
        previousActivity,
        newActivity,
        configChange
      );

      // Handle each transition
      const filteringUpdateStart = performance.now();
      for (const transition of routeTransitions) {
        await this.handleRouteTransition(transition);
      }
      const filteringUpdateTime = performance.now() - filteringUpdateStart;

      // Calculate total time
      const totalUpdateTime = performance.now() - startTime;

      // Update performance metrics
      this.updatePerformanceMetrics({
        configUpdateTime,
        routeRecalculationTime,
        filteringUpdateTime,
        totalUpdateTime,
        routesRecalculated: newActivity.size,
        vehiclesReprocessed: currentVehicles.length,
        transitionsDetected: routeTransitions.length,
        circuitBreakerTriggered: false,
        lastUpdateTimestamp: new Date()
      });

      // Check performance thresholds
      if (totalUpdateTime > PERFORMANCE_THRESHOLDS.totalUpdateMaxMs) {
        this.handlePerformanceViolation(totalUpdateTime);
      } else {
        this.handleSuccessfulUpdate();
      }

      logger.info('Real-time configuration update completed successfully', {
        configChange,
        routeTransitions: routeTransitions.length,
        totalTime: totalUpdateTime,
        routesRecalculated: newActivity.size,
        vehiclesReprocessed: currentVehicles.length
      });

      return {
        success: true,
        routeTransitions,
        performanceMetrics: this.performanceMetrics,
        updatedRouteActivity: newActivity,
      };

    } catch (error) {
      logger.error('Real-time configuration update failed', {
        error,
        configChange,
        vehicleCount: currentVehicles.length
      });

      this.handleUpdateFailure(error as Error);

      return {
        success: false,
        routeTransitions: [],
        performanceMetrics: this.performanceMetrics,
        updatedRouteActivity: new Map(),
        error: error as Error
      };

    } finally {
      this.updateInProgress = false;
    }
  }

  /**
   * Detect route transitions between busy and quiet states
   * 
   * @param previousActivity - Previous route activity map
   * @param newActivity - New route activity map
   * @param configChange - Optional configuration change that triggered recalculation
   * @returns Array of detected route transitions
   * 
   * Requirements 2.5: Route transition handling
   */
  detectRouteTransitions(
    previousActivity: Map<string, RouteActivityInfo>,
    newActivity: Map<string, RouteActivityInfo>,
    configChange?: Partial<RouteFilteringConfig>
  ): RouteTransitionEvent[] {
    const transitions: RouteTransitionEvent[] = [];
    const timestamp = new Date();

    // Check all routes that exist in either previous or new activity
    const allRouteIds = new Set([
      ...previousActivity.keys(),
      ...newActivity.keys()
    ]);

    for (const routeId of allRouteIds) {
      const previous = previousActivity.get(routeId);
      const current = newActivity.get(routeId);

      // Handle new routes (didn't exist before)
      if (!previous && current) {
        logger.debug('New route detected', {
          routeId,
          classification: current.classification,
          vehicleCount: current.vehicleCount
        });
        continue; // Not a transition, just a new route
      }

      // Handle removed routes (existed before but not now)
      if (previous && !current) {
        logger.debug('Route removed', {
          routeId,
          previousClassification: previous.classification,
          previousVehicleCount: previous.vehicleCount
        });
        continue; // Not a transition, route is gone
      }

      // Handle classification changes
      if (previous && current && previous.classification !== current.classification) {
        const transition: RouteTransitionEvent = {
          routeId,
          previousClassification: previous.classification,
          newClassification: current.classification,
          previousVehicleCount: previous.vehicleCount,
          newVehicleCount: current.vehicleCount,
          timestamp,
          configChange
        };

        transitions.push(transition);

        logger.info('Route transition detected', {
          routeId,
          from: previous.classification,
          to: current.classification,
          vehicleCountChange: `${previous.vehicleCount} → ${current.vehicleCount}`,
          configTriggered: !!configChange
        });
      }
    }

    return transitions;
  }

  /**
   * Handle a specific route transition
   * 
   * @param transition - Route transition event to handle
   * 
   * Requirements 2.5: Route transition handling
   */
  async handleRouteTransition(transition: RouteTransitionEvent): Promise<void> {
    logger.debug('Handling route transition', {
      routeId: transition.routeId,
      from: transition.previousClassification,
      to: transition.newClassification,
      vehicleCountChange: `${transition.previousVehicleCount} → ${transition.newVehicleCount}`
    });

    // Notify subscribers about the transition
    this.notifyTransitionCallbacks(transition);

    // Log transition for debugging and monitoring
    if (transition.previousClassification === RouteClass.BUSY && 
        transition.newClassification === RouteClass.QUIET) {
      logger.info('Route transitioned from busy to quiet - distance filtering removed', {
        routeId: transition.routeId,
        vehicleCount: transition.newVehicleCount,
        configTriggered: !!transition.configChange
      });
    } else if (transition.previousClassification === RouteClass.QUIET && 
               transition.newClassification === RouteClass.BUSY) {
      logger.info('Route transitioned from quiet to busy - distance filtering applied', {
        routeId: transition.routeId,
        vehicleCount: transition.newVehicleCount,
        configTriggered: !!transition.configChange
      });
    }
  }

  /**
   * Get current performance metrics
   * 
   * @returns Current performance metrics
   * 
   * Requirements 5.1: Performance monitoring
   */
  getPerformanceMetrics(): RealTimePerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get current circuit breaker state
   * 
   * @returns Current circuit breaker state
   * 
   * Requirements 5.1: Circuit breaker patterns
   */
  getCircuitBreakerState(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }

  /**
   * Reset circuit breaker to closed state
   * 
   * Requirements 5.1: Circuit breaker patterns
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker = this.initializeCircuitBreaker();
    logger.info('Circuit breaker manually reset');
  }

  /**
   * Subscribe to route transition events
   * 
   * @param callback - Callback function to call on transitions
   * @returns Unsubscribe function
   */
  onRouteTransition(callback: (transition: RouteTransitionEvent) => void): () => void {
    this.transitionCallbacks.add(callback);
    
    return () => {
      this.transitionCallbacks.delete(callback);
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Handle configuration change from the configuration manager
   */
  private async handleConfigurationChange(config: RouteFilteringConfig): Promise<void> {
    logger.debug('Configuration change detected by real-time manager', { config });
    
    // The configuration has already been applied by the configuration manager
    // We just need to log this for monitoring purposes
    // The actual real-time updates are triggered by explicit calls to applyConfigurationUpdate
  }

  /**
   * Initialize circuit breaker state
   */
  private initializeCircuitBreaker(): CircuitBreakerState {
    return {
      isOpen: false,
      failureCount: 0,
      consecutiveSuccesses: 0
    };
  }

  /**
   * Initialize performance metrics
   */
  private initializePerformanceMetrics(): RealTimePerformanceMetrics {
    return {
      configUpdateTime: 0,
      routeRecalculationTime: 0,
      filteringUpdateTime: 0,
      totalUpdateTime: 0,
      routesRecalculated: 0,
      vehiclesReprocessed: 0,
      transitionsDetected: 0,
      circuitBreakerTriggered: false,
      lastUpdateTimestamp: new Date()
    };
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(metrics: RealTimePerformanceMetrics): void {
    this.performanceMetrics = { ...metrics };
  }

  /**
   * Handle performance threshold violation
   */
  private handlePerformanceViolation(actualTime: number): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = new Date();
    this.circuitBreaker.consecutiveSuccesses = 0;

    logger.warn('Performance threshold violated', {
      actualTime,
      threshold: PERFORMANCE_THRESHOLDS.totalUpdateMaxMs,
      failureCount: this.circuitBreaker.failureCount
    });

    // Open circuit breaker if too many failures
    if (this.circuitBreaker.failureCount >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
      this.openCircuitBreaker();
    }
  }

  /**
   * Handle successful update
   */
  private handleSuccessfulUpdate(): void {
    this.circuitBreaker.consecutiveSuccesses++;
    
    // Reset failure count after successful operations
    if (this.circuitBreaker.consecutiveSuccesses >= 3) {
      this.circuitBreaker.failureCount = 0;
    }
  }

  /**
   * Handle update failure
   */
  private handleUpdateFailure(error: Error): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = new Date();
    this.circuitBreaker.consecutiveSuccesses = 0;

    logger.error('Configuration update failed', {
      error: error.message,
      failureCount: this.circuitBreaker.failureCount
    });

    // Open circuit breaker if too many failures
    if (this.circuitBreaker.failureCount >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
      this.openCircuitBreaker();
    }
  }

  /**
   * Open circuit breaker
   */
  private openCircuitBreaker(): void {
    this.circuitBreaker.isOpen = true;
    this.circuitBreaker.nextRetryTime = new Date(
      Date.now() + CIRCUIT_BREAKER_CONFIG.recoveryTimeoutMs
    );

    this.performanceMetrics.circuitBreakerTriggered = true;

    logger.error('Circuit breaker opened due to repeated failures', {
      failureCount: this.circuitBreaker.failureCount,
      nextRetryTime: this.circuitBreaker.nextRetryTime
    });
  }

  /**
   * Notify all transition callbacks
   */
  private notifyTransitionCallbacks(transition: RouteTransitionEvent): void {
    this.transitionCallbacks.forEach(callback => {
      try {
        callback(transition);
      } catch (error) {
        logger.error('Error in route transition callback', { error });
      }
    });
  }
}

// ============================================================================
// EXPORTED INSTANCE
// ============================================================================

/**
 * Singleton instance of the real-time configuration manager
 */
export const realTimeConfigurationManager = new RealTimeConfigurationManager();

/**
 * Factory function to create a new real-time configuration manager instance
 */
export function createRealTimeConfigurationManager(): RealTimeConfigurationManager {
  return new RealTimeConfigurationManager();
}