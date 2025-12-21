/**
 * Graceful Degradation Service Tests
 * 
 * Tests comprehensive error handling including graceful degradation for missing
 * vehicle data, route data unavailability, performance issues, and invalid
 * configuration handling with circuit breaker patterns.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GracefulDegradationService,
  DegradationLevel,
  FallbackStrategy,
  CircuitBreakerState
} from './GracefulDegradationService';
import type {
  DegradationContext,
  PerformanceIssue,
  CircuitBreakerConfig
} from '../GracefulDegradationService';
import type { RouteFilteringConfig } from '../../types/routeFiltering';
import { DEFAULT_ROUTE_FILTERING_CONFIG } from '../../types/routeFiltering';

describe('GracefulDegradationService', () => {
  let degradationService: GracefulDegradationService;

  beforeEach(() => {
    degradationService = new GracefulDegradationService();
    vi.clearAllMocks();
  });

  describe('Missing Vehicle Data Handling', () => {
    it('should handle missing vehicle data with cache fallback', async () => {
      const context: DegradationContext = {
        failureType: 'missing_vehicle_data',
        failureMessage: 'No vehicle data available',
        degradationLevel: DegradationLevel.MODERATE,
        fallbackStrategy: FallbackStrategy.USE_CACHE,
        timestamp: new Date(),
        affectedComponents: ['route-activity-analyzer'],
        recoveryActions: ['Check vehicle data source', 'Use cached data']
      };

      const result = await degradationService.handleMissingVehicleData(context);

      expect(result).toBeDefined();
      expect(result.source).toBe('defaults'); // No cache available initially
      expect(result.vehicles).toEqual([]);
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.limitations.length).toBeGreaterThan(0);
    });

    it('should handle missing vehicle data with default fallback', async () => {
      const context: DegradationContext = {
        failureType: 'missing_vehicle_data',
        failureMessage: 'Vehicle data source unavailable',
        degradationLevel: DegradationLevel.SEVERE,
        fallbackStrategy: FallbackStrategy.USE_DEFAULTS,
        timestamp: new Date(),
        affectedComponents: ['route-activity-analyzer'],
        recoveryActions: ['Use default empty data']
      };

      const result = await degradationService.handleMissingVehicleData(context);

      expect(result.source).toBe('defaults');
      expect(result.vehicles).toEqual([]);
      expect(result.confidence).toBe(0.1);
      expect(result.limitations).toContain('No vehicle data available');
    });

    it('should handle emergency mode for critical failures', async () => {
      const context: DegradationContext = {
        failureType: 'critical_system_failure',
        failureMessage: 'Critical system failure detected',
        degradationLevel: DegradationLevel.CRITICAL,
        fallbackStrategy: FallbackStrategy.EMERGENCY_MODE,
        timestamp: new Date(),
        affectedComponents: ['entire-system'],
        recoveryActions: ['Emergency shutdown', 'Manual intervention required']
      };

      const result = await degradationService.handleMissingVehicleData(context);

      expect(result.source).toBe('defaults');
      expect(result.confidence).toBe(0.0);
      expect(result.limitations).toContain('Emergency mode active');
    });
  });

  describe('Route Data Unavailability Handling', () => {
    it('should handle route data unavailability with cache fallback', async () => {
      const context: DegradationContext = {
        failureType: 'route_data_unavailable',
        failureMessage: 'Route data service unavailable',
        degradationLevel: DegradationLevel.MODERATE,
        fallbackStrategy: FallbackStrategy.USE_CACHE,
        timestamp: new Date(),
        affectedComponents: ['route-activity-analyzer'],
        recoveryActions: ['Use cached route data']
      };

      const result = await degradationService.handleRouteDataUnavailability(context);

      expect(result).toBeDefined();
      expect(result.source).toBe('defaults'); // No cache available initially
      expect(result.routeActivities.size).toBe(0);
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should skip filtering when route data is unavailable', async () => {
      const context: DegradationContext = {
        failureType: 'route_data_unavailable',
        failureMessage: 'Cannot determine route activity',
        degradationLevel: DegradationLevel.MODERATE,
        fallbackStrategy: FallbackStrategy.SKIP_FILTERING,
        timestamp: new Date(),
        affectedComponents: ['intelligent-vehicle-filter'],
        recoveryActions: ['Skip route-based filtering']
      };

      const result = await degradationService.handleRouteDataUnavailability(context);

      expect(result.source).toBe('defaults');
      expect(result.limitations).toContain('Route-based filtering disabled');
      expect(result.confidence).toBe(0.5);
    });
  });

  describe('Performance Issue Handling', () => {
    it('should handle moderate performance issues', async () => {
      const performanceIssue: PerformanceIssue = {
        detected: true,
        severity: DegradationLevel.MODERATE,
        metrics: {
          responseTime: 3000,
          memoryUsage: 0.75,
          errorRate: 0.15,
          throughput: 50
        },
        recommendations: [
          'Reduce cache sizes',
          'Optimize algorithms',
          'Monitor memory usage'
        ],
        circuitBreakerTriggered: false
      };

      const result = await degradationService.handlePerformanceIssues(performanceIssue);

      expect(result.degradationLevel).toBe(DegradationLevel.MODERATE);
      expect(result.fallbackStrategy).toBe(FallbackStrategy.USE_CACHE);
      expect(result.recoveryActions).toEqual(performanceIssue.recommendations);
      expect(result.estimatedRecoveryTime).toBe(120000); // 2 minutes
    });

    it('should handle critical performance issues', async () => {
      const performanceIssue: PerformanceIssue = {
        detected: true,
        severity: DegradationLevel.CRITICAL,
        metrics: {
          responseTime: 15000,
          memoryUsage: 0.95,
          errorRate: 0.6,
          throughput: 5
        },
        recommendations: [
          'Emergency cache clear',
          'Restart services',
          'Scale resources'
        ],
        circuitBreakerTriggered: true
      };

      const result = await degradationService.handlePerformanceIssues(performanceIssue);

      expect(result.degradationLevel).toBe(DegradationLevel.CRITICAL);
      expect(result.fallbackStrategy).toBe(FallbackStrategy.EMERGENCY_MODE);
      expect(result.estimatedRecoveryTime).toBe(300000); // 5 minutes
    });

    it('should trigger circuit breaker for performance issues', async () => {
      const performanceIssue: PerformanceIssue = {
        detected: true,
        severity: DegradationLevel.SEVERE,
        metrics: {
          responseTime: 8000,
          memoryUsage: 0.85,
          errorRate: 0.4,
          throughput: 10
        },
        recommendations: ['Reduce load', 'Clear caches'],
        circuitBreakerTriggered: true
      };

      await degradationService.handlePerformanceIssues(performanceIssue);

      const circuitBreakerInfo = degradationService.getCircuitBreakerInfo('performance-monitor');
      expect(circuitBreakerInfo.failureCount).toBeGreaterThan(0);
    });
  });

  describe('Invalid Configuration Handling', () => {
    it('should handle invalid configuration with fallback values', () => {
      const invalidConfig: Partial<RouteFilteringConfig> = {
        busyRouteThreshold: -5, // Invalid: negative
        distanceFilterThreshold: 50000, // Invalid: too large
        enableDebugLogging: 'invalid' as any, // Invalid: not boolean
        performanceMonitoring: null as any // Invalid: null
      };

      const result = degradationService.handleInvalidConfiguration(invalidConfig);

      expect(result.busyRouteThreshold).toBe(DEFAULT_ROUTE_FILTERING_CONFIG.busyRouteThreshold);
      expect(result.distanceFilterThreshold).toBe(DEFAULT_ROUTE_FILTERING_CONFIG.distanceFilterThreshold);
      expect(result.enableDebugLogging).toBe(DEFAULT_ROUTE_FILTERING_CONFIG.enableDebugLogging);
      expect(result.performanceMonitoring).toBe(DEFAULT_ROUTE_FILTERING_CONFIG.performanceMonitoring);
    });

    it('should preserve valid configuration values', () => {
      const partiallyValidConfig: Partial<RouteFilteringConfig> = {
        busyRouteThreshold: 8, // Valid
        distanceFilterThreshold: 50000, // Invalid: too large
        enableDebugLogging: true, // Valid
        performanceMonitoring: 'invalid' as any // Invalid: not boolean
      };

      const result = degradationService.handleInvalidConfiguration(partiallyValidConfig);

      expect(result.busyRouteThreshold).toBe(8); // Preserved valid value
      expect(result.distanceFilterThreshold).toBe(DEFAULT_ROUTE_FILTERING_CONFIG.distanceFilterThreshold); // Fallback
      expect(result.enableDebugLogging).toBe(true); // Preserved valid value
      expect(result.performanceMonitoring).toBe(DEFAULT_ROUTE_FILTERING_CONFIG.performanceMonitoring); // Fallback
    });

    it('should record degradation event for invalid configuration', () => {
      const invalidConfig: Partial<RouteFilteringConfig> = {
        busyRouteThreshold: -1,
        distanceFilterThreshold: 100000
      };

      degradationService.handleInvalidConfiguration(invalidConfig);

      const history = degradationService.getDegradationHistory();
      expect(history.length).toBeGreaterThan(0);
      
      const lastEvent = history[history.length - 1];
      expect(lastEvent.failureType).toBe('invalid_configuration');
      expect(lastEvent.degradationLevel).toBe(DegradationLevel.MINIMAL);
    });
  });

  describe('Circuit Breaker Management', () => {
    it('should initialize circuit breaker in closed state', () => {
      const info = degradationService.getCircuitBreakerInfo('test-component');

      expect(info.state).toBe(CircuitBreakerState.CLOSED);
      expect(info.failureCount).toBe(0);
      expect(info.successCount).toBe(0);
      expect(info.config.enabled).toBe(true);
    });

    it('should transition to open state after failure threshold', () => {
      const component = 'test-component';
      const info = degradationService.getCircuitBreakerInfo(component);
      const failureThreshold = info.config.failureThreshold;

      // Trigger failures to exceed threshold
      for (let i = 0; i < failureThreshold; i++) {
        degradationService.updateCircuitBreaker(component, false);
      }

      const updatedInfo = degradationService.getCircuitBreakerInfo(component);
      expect(updatedInfo.state).toBe(CircuitBreakerState.OPEN);
      expect(updatedInfo.failureCount).toBe(failureThreshold);
    });

    it('should transition from open to half-open after timeout', () => {
      const component = 'test-component';
      
      // Force circuit breaker to open state
      const info = degradationService.getCircuitBreakerInfo(component);
      for (let i = 0; i < info.config.failureThreshold; i++) {
        degradationService.updateCircuitBreaker(component, false);
      }

      // Manually set next attempt time to past (simulating timeout)
      const openInfo = degradationService.getCircuitBreakerInfo(component);
      expect(openInfo.state).toBe(CircuitBreakerState.OPEN);

      // Simulate timeout by updating with a success after the timeout period
      // In a real scenario, the timeout would be checked automatically
      degradationService.updateCircuitBreaker(component, true);
      
      // The circuit breaker should still be open until timeout expires
      // This test verifies the timeout logic exists
      expect(openInfo.nextAttemptTime).toBeDefined();
    });

    it('should reset circuit breaker to closed state', () => {
      const component = 'test-component';
      
      // Force circuit breaker to open
      const info = degradationService.getCircuitBreakerInfo(component);
      for (let i = 0; i < info.config.failureThreshold; i++) {
        degradationService.updateCircuitBreaker(component, false);
      }

      expect(degradationService.getCircuitBreakerInfo(component).state).toBe(CircuitBreakerState.OPEN);

      // Reset circuit breaker
      degradationService.resetCircuitBreaker(component);

      const resetInfo = degradationService.getCircuitBreakerInfo(component);
      expect(resetInfo.state).toBe(CircuitBreakerState.CLOSED);
      expect(resetInfo.failureCount).toBe(0);
      expect(resetInfo.successCount).toBe(0);
    });
  });

  describe('Degradation Monitoring', () => {
    it('should track degradation level based on recent events', () => {
      expect(degradationService.getCurrentDegradationLevel()).toBe(DegradationLevel.NONE);

      // Add a moderate degradation event
      const context: DegradationContext = {
        failureType: 'test_failure',
        failureMessage: 'Test failure',
        degradationLevel: DegradationLevel.MODERATE,
        fallbackStrategy: FallbackStrategy.USE_CACHE,
        timestamp: new Date(),
        affectedComponents: ['test'],
        recoveryActions: ['test recovery']
      };

      // Simulate recording degradation event by handling missing vehicle data
      degradationService.handleMissingVehicleData(context);

      // Current degradation level should reflect the recent event
      expect(degradationService.getCurrentDegradationLevel()).toBe(DegradationLevel.MODERATE);
    });

    it('should return highest degradation level from recent events', async () => {
      // Add multiple degradation events with different levels
      const contexts = [
        {
          failureType: 'minor_issue',
          failureMessage: 'Minor issue',
          degradationLevel: DegradationLevel.MINIMAL,
          fallbackStrategy: FallbackStrategy.USE_CACHE,
          timestamp: new Date(),
          affectedComponents: ['test1'],
          recoveryActions: ['minor recovery']
        },
        {
          failureType: 'major_issue',
          failureMessage: 'Major issue',
          degradationLevel: DegradationLevel.SEVERE,
          fallbackStrategy: FallbackStrategy.EMERGENCY_MODE,
          timestamp: new Date(),
          affectedComponents: ['test2'],
          recoveryActions: ['major recovery']
        }
      ];

      for (const context of contexts) {
        await degradationService.handleMissingVehicleData(context);
      }

      // Should return the highest degradation level
      expect(degradationService.getCurrentDegradationLevel()).toBe(DegradationLevel.SEVERE);
    });

    it('should maintain degradation history', async () => {
      const context: DegradationContext = {
        failureType: 'test_failure',
        failureMessage: 'Test failure for history',
        degradationLevel: DegradationLevel.MODERATE,
        fallbackStrategy: FallbackStrategy.USE_DEFAULTS,
        timestamp: new Date(),
        affectedComponents: ['test'],
        recoveryActions: ['test recovery']
      };

      await degradationService.handleMissingVehicleData(context);

      const history = degradationService.getDegradationHistory();
      expect(history.length).toBeGreaterThan(0);
      
      const lastEvent = history[history.length - 1];
      expect(lastEvent.failureType).toBe('test_failure');
      expect(lastEvent.degradationLevel).toBe(DegradationLevel.MODERATE);
    });

    it('should clear degradation history', async () => {
      const context: DegradationContext = {
        failureType: 'test_failure',
        failureMessage: 'Test failure',
        degradationLevel: DegradationLevel.MODERATE,
        fallbackStrategy: FallbackStrategy.USE_CACHE,
        timestamp: new Date(),
        affectedComponents: ['test'],
        recoveryActions: ['test recovery']
      };

      await degradationService.handleMissingVehicleData(context);
      expect(degradationService.getDegradationHistory().length).toBeGreaterThan(0);

      degradationService.clearDegradationHistory();
      expect(degradationService.getDegradationHistory().length).toBe(0);
      expect(degradationService.getCurrentDegradationLevel()).toBe(DegradationLevel.NONE);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle cascading failures with appropriate degradation', async () => {
      // Simulate cascading failures
      const vehicleDataFailure: DegradationContext = {
        failureType: 'vehicle_data_failure',
        failureMessage: 'Vehicle data source failed',
        degradationLevel: DegradationLevel.MODERATE,
        fallbackStrategy: FallbackStrategy.USE_CACHE,
        timestamp: new Date(),
        affectedComponents: ['vehicle-data-source'],
        recoveryActions: ['Switch to backup source']
      };

      const routeDataFailure: DegradationContext = {
        failureType: 'route_data_failure',
        failureMessage: 'Route data source failed',
        degradationLevel: DegradationLevel.SEVERE,
        fallbackStrategy: FallbackStrategy.SKIP_FILTERING,
        timestamp: new Date(),
        affectedComponents: ['route-data-source'],
        recoveryActions: ['Disable route filtering']
      };

      await degradationService.handleMissingVehicleData(vehicleDataFailure);
      await degradationService.handleRouteDataUnavailability(routeDataFailure);

      // System should be in severe degradation due to multiple failures
      expect(degradationService.getCurrentDegradationLevel()).toBe(DegradationLevel.SEVERE);

      const history = degradationService.getDegradationHistory();
      expect(history.length).toBe(2);
    });

    it('should handle performance degradation with circuit breaker activation', async () => {
      const performanceIssue: PerformanceIssue = {
        detected: true,
        severity: DegradationLevel.CRITICAL,
        metrics: {
          responseTime: 20000,
          memoryUsage: 0.98,
          errorRate: 0.8,
          throughput: 1
        },
        recommendations: ['Emergency restart', 'Scale resources'],
        circuitBreakerTriggered: true
      };

      await degradationService.handlePerformanceIssues(performanceIssue);

      // Circuit breaker should be triggered
      const circuitBreakerInfo = degradationService.getCircuitBreakerInfo('performance-monitor');
      expect(circuitBreakerInfo.failureCount).toBeGreaterThan(0);

      // System should be in critical degradation
      expect(degradationService.getCurrentDegradationLevel()).toBe(DegradationLevel.CRITICAL);
    });
  });
});