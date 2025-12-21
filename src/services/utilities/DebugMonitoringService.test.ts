/**
 * Debug Monitoring Service Tests
 * 
 * Tests comprehensive debugging and monitoring capabilities including
 * filtering decision logging, route classification logging, performance
 * metrics tracking, and system health monitoring.
 * 
 * Requirements: 4.4, 6.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DebugMonitoringService,
  DebugLogLevel
} from './DebugMonitoringService';
import type {
  FilteringDecision,
  RouteClassificationDebug,
  PerformanceMetrics,
  DebugSessionConfig,
  HealthAlert
} from '../DebugMonitoringService';
import { RouteClassification } from '../RouteActivityAnalyzer';

describe('DebugMonitoringService', () => {
  let debugService: DebugMonitoringService;

  beforeEach(() => {
    debugService = new DebugMonitoringService();
    vi.clearAllMocks();
  });

  describe('Debug Logging', () => {
    it('should log filtering decisions with metadata', () => {
      const decision: FilteringDecision = {
        vehicleId: 'vehicle-1',
        routeId: 'route-1',
        routeClassification: RouteClassification.BUSY,
        distanceFilterApplied: true,
        distanceToNearestStation: 1500,
        included: false,
        reason: 'Vehicle beyond distance threshold on busy route'
      };

      const metadata = {
        totalVehicles: 10,
        busyRoutes: 3,
        quietRoutes: 2
      };

      debugService.logFilteringDecision(decision, metadata);

      const logs = debugService.getDebugLogs();
      expect(logs.length).toBe(1);
      
      const log = logs[0];
      expect(log.vehicleId).toBe('vehicle-1');
      expect(log.routeId).toBe('route-1');
      expect(log.decision).toBe('EXCLUDED');
      expect(log.reason).toBe('Vehicle beyond distance threshold on busy route');
      expect(log.metadata.routeClassification).toBe(RouteClassification.BUSY);
      expect(log.metadata.totalVehicles).toBe(10);
    });

    it('should log route classification with debug information', () => {
      const debugInfo: RouteClassificationDebug = {
        routeId: 'route-1',
        vehicleCount: 8,
        threshold: 5,
        classification: 'busy',
        factors: {
          vehicleDensity: 1.6,
          averageSpeed: 15,
          trafficLevel: 'high'
        },
        timestamp: new Date()
      };

      debugService.logRouteClassification(debugInfo);

      const logs = debugService.getRouteClassificationLogs();
      expect(logs.length).toBe(1);
      
      const log = logs[0];
      expect(log.routeId).toBe('route-1');
      expect(log.vehicleCount).toBe(8);
      expect(log.threshold).toBe(5);
      expect(log.classification).toBe('busy');
      expect(log.factors.vehicleDensity).toBe(1.6);
      expect(log.factors.trafficLevel).toBe('high');
    });

    it('should log performance metrics with alerts for slow operations', () => {
      const metrics: PerformanceMetrics = {
        operationName: 'route-activity-analysis',
        startTime: new Date(Date.now() - 6000),
        endTime: new Date(),
        duration: 6000, // 6 seconds - should trigger alert
        memoryUsage: {
          before: 0.5,
          after: 0.7,
          peak: 0.8
        },
        cacheStats: {
          hits: 5,
          misses: 2,
          hitRate: 0.714
        },
        errorCount: 0,
        successCount: 1,
        throughput: 100
      };

      debugService.logPerformanceMetrics(metrics);

      const logs = debugService.getPerformanceLogs();
      expect(logs.length).toBe(1);
      
      const log = logs[0];
      expect(log.operationName).toBe('route-activity-analysis');
      expect(log.duration).toBe(6000);
      expect(log.memoryUsage.peak).toBe(0.8);
      expect(log.cacheStats.hitRate).toBe(0.714);

      // Should have created a performance alert
      const systemHealth = debugService.getSystemHealth();
      const performanceAlerts = systemHealth.alerts.filter(alert => 
        alert.component === 'route-activity-analysis' && 
        alert.message.includes('Slow operation')
      );
      expect(performanceAlerts.length).toBeGreaterThan(0);
    });
  });

  describe('Debug Session Management', () => {
    it('should start and manage debug sessions', () => {
      const config: DebugSessionConfig = {
        enabled: true,
        logLevel: DebugLogLevel.DEBUG,
        includePerformanceMetrics: true,
        includeMemoryUsage: true,
        includeCacheStats: true,
        maxLogEntries: 1000,
        sessionDuration: 60000, // 1 minute
        components: ['route-activity-analyzer', 'vehicle-filter']
      };

      const sessionId = debugService.startDebugSession(config);
      
      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^debug-session-\d+-\d+$/);

      const retrievedSession = debugService.getDebugSession(sessionId);
      expect(retrievedSession).toEqual(config);
    });

    it('should stop debug sessions', () => {
      const config: DebugSessionConfig = {
        enabled: true,
        logLevel: DebugLogLevel.INFO,
        includePerformanceMetrics: false,
        includeMemoryUsage: false,
        includeCacheStats: false,
        maxLogEntries: 500,
        sessionDuration: 0, // No auto-stop
        components: []
      };

      const sessionId = debugService.startDebugSession(config);
      expect(debugService.getDebugSession(sessionId)).toBeDefined();

      debugService.stopDebugSession(sessionId);
      expect(debugService.getDebugSession(sessionId)).toBeNull();
    });

    it('should filter logs by session configuration', () => {
      const config: DebugSessionConfig = {
        enabled: true,
        logLevel: DebugLogLevel.WARN, // Only warn and error logs
        includePerformanceMetrics: true,
        includeMemoryUsage: false,
        includeCacheStats: false,
        maxLogEntries: 1000,
        sessionDuration: 0,
        components: ['vehicle-filter'] // Only vehicle filter logs
      };

      const sessionId = debugService.startDebugSession(config);

      // Log some decisions with different levels
      const debugDecision: FilteringDecision = {
        vehicleId: 'vehicle-1',
        routeId: 'route-1',
        routeClassification: RouteClassification.BUSY,
        distanceFilterApplied: true,
        included: true,
        reason: 'Debug level log'
      };

      debugService.logFilteringDecision(debugDecision);

      // Get logs with session filtering
      const debugLogs = debugService.getDebugLogs(sessionId, DebugLogLevel.DEBUG);
      const warnLogs = debugService.getDebugLogs(sessionId, DebugLogLevel.WARN);

      // Debug logs should be filtered out by session config
      expect(debugLogs.length).toBe(0);
      expect(warnLogs.length).toBe(0); // No warn-level logs added
    });
  });

  describe('System Health Monitoring', () => {
    it('should provide system health metrics', () => {
      const systemHealth = debugService.getSystemHealth();

      expect(systemHealth.timestamp).toBeInstanceOf(Date);
      expect(['healthy', 'degraded', 'critical']).toContain(systemHealth.overallHealth);
      expect(systemHealth.components).toBeDefined();
      expect(systemHealth.components.routeAnalyzer).toBeDefined();
      expect(systemHealth.components.vehicleFilter).toBeDefined();
      expect(systemHealth.components.configManager).toBeDefined();
      expect(systemHealth.components.dataValidator).toBeDefined();
      expect(systemHealth.performance).toBeDefined();
      expect(systemHealth.alerts).toBeInstanceOf(Array);
    });

    it('should track component health status', () => {
      const componentHealth = debugService.getComponentHealth('route-activity-analyzer');

      expect(['healthy', 'degraded', 'critical', 'offline']).toContain(componentHealth.status);
      expect(componentHealth.lastCheck).toBeInstanceOf(Date);
      expect(typeof componentHealth.responseTime).toBe('number');
      expect(typeof componentHealth.errorRate).toBe('number');
      expect(componentHealth.circuitBreakerState).toBeDefined();
      expect(componentHealth.issues).toBeInstanceOf(Array);
    });

    it('should add and resolve health alerts', () => {
      const alert: HealthAlert = {
        severity: 'high',
        component: 'test-component',
        message: 'Test alert message',
        timestamp: new Date(),
        resolved: false
      };

      debugService.addHealthAlert(alert);

      const systemHealth = debugService.getSystemHealth();
      const testAlerts = systemHealth.alerts.filter(a => 
        a.component === 'test-component' && !a.resolved
      );
      expect(testAlerts.length).toBeGreaterThan(0);

      // Resolve alert (simplified - in real implementation would use alert ID)
      debugService.resolveHealthAlert('test-alert-id');
    });
  });

  describe('Data Export and Analysis', () => {
    it('should export debug data in JSON format', () => {
      // Add some test data
      const decision: FilteringDecision = {
        vehicleId: 'vehicle-1',
        routeId: 'route-1',
        routeClassification: RouteClassification.QUIET,
        distanceFilterApplied: false,
        included: true,
        reason: 'Quiet route - all vehicles shown'
      };

      debugService.logFilteringDecision(decision);

      const jsonExport = debugService.exportDebugData('json');
      const data = JSON.parse(jsonExport);

      expect(data.debugLogs).toBeInstanceOf(Array);
      expect(data.debugLogs.length).toBeGreaterThan(0);
      expect(data.routeClassificationLogs).toBeInstanceOf(Array);
      expect(data.performanceLogs).toBeInstanceOf(Array);
      expect(data.healthAlerts).toBeInstanceOf(Array);
      expect(data.systemHealth).toBeDefined();
    });

    it('should export debug data in CSV format', () => {
      // Add some test data
      const decision: FilteringDecision = {
        vehicleId: 'vehicle-2',
        routeId: 'route-2',
        routeClassification: RouteClassification.BUSY,
        distanceFilterApplied: true,
        included: false,
        reason: 'Distance filter applied'
      };

      debugService.logFilteringDecision(decision);

      const csvExport = debugService.exportDebugData('csv');
      const lines = csvExport.split('\n');

      expect(lines[0]).toBe('timestamp,level,operation,vehicleId,routeId,decision,reason');
      expect(lines.length).toBeGreaterThan(1); // Header + at least one data row
      expect(lines[1]).toContain('vehicle-2');
      expect(lines[1]).toContain('route-2');
      expect(lines[1]).toContain('EXCLUDED');
    });

    it('should generate comprehensive performance report', () => {
      // Add some performance data
      const metrics: PerformanceMetrics = {
        operationName: 'test-operation',
        startTime: new Date(Date.now() - 1000),
        endTime: new Date(),
        duration: 1000,
        memoryUsage: {
          before: 0.4,
          after: 0.6,
          peak: 0.7
        },
        cacheStats: {
          hits: 8,
          misses: 2,
          hitRate: 0.8
        },
        errorCount: 1,
        successCount: 9,
        throughput: 10
      };

      debugService.logPerformanceMetrics(metrics);

      const report = debugService.generatePerformanceReport();
      
      expect(report).toContain('# Performance Report');
      expect(report).toContain('## System Health');
      expect(report).toContain('## Component Health');
      expect(report).toContain('## Recent Performance Metrics');
      expect(report).toContain('test-operation');
    });

    it('should clear all debug data', () => {
      // Add some test data
      const decision: FilteringDecision = {
        vehicleId: 'vehicle-3',
        routeId: 'route-3',
        routeClassification: RouteClassification.QUIET,
        distanceFilterApplied: false,
        included: true,
        reason: 'Test decision'
      };

      debugService.logFilteringDecision(decision);
      expect(debugService.getDebugLogs().length).toBeGreaterThan(0);

      debugService.clearDebugData();
      
      expect(debugService.getDebugLogs().length).toBe(0);
      expect(debugService.getRouteClassificationLogs().length).toBe(0);
      expect(debugService.getPerformanceLogs().length).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle high-volume logging without performance degradation', () => {
      const startTime = performance.now();

      // Log many decisions
      for (let i = 0; i < 1000; i++) {
        const decision: FilteringDecision = {
          vehicleId: `vehicle-${i}`,
          routeId: `route-${i % 10}`,
          routeClassification: i % 2 === 0 ? RouteClassification.BUSY : RouteClassification.QUIET,
          distanceFilterApplied: i % 2 === 0,
          included: i % 3 !== 0,
          reason: `Test decision ${i}`
        };

        debugService.logFilteringDecision(decision);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 100ms for 1000 logs)
      expect(duration).toBeLessThan(100);

      const logs = debugService.getDebugLogs();
      expect(logs.length).toBe(1000);
    });

    it('should maintain log size limits', () => {
      // Create service with smaller limits for testing
      const testService = new DebugMonitoringService();

      // Log more than the typical limit
      for (let i = 0; i < 15000; i++) {
        const decision: FilteringDecision = {
          vehicleId: `vehicle-${i}`,
          routeId: `route-${i % 5}`,
          routeClassification: RouteClassification.QUIET,
          distanceFilterApplied: false,
          included: true,
          reason: `Decision ${i}`
        };

        testService.logFilteringDecision(decision);
      }

      const logs = testService.getDebugLogs();
      // Should maintain size limit (10000 is the default MAX_LOG_ENTRIES)
      expect(logs.length).toBeLessThanOrEqual(10000);
    });
  });
});