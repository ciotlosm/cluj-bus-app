/**
 * Debug Monitoring Service
 * 
 * Provides comprehensive debugging and monitoring capabilities for filtering
 * decisions, route classification, and performance metrics tracking.
 * 
 * Requirements: 4.4, 6.4
 */

import type { CoreVehicle } from '../types/coreVehicle';
import type { RouteActivityInfo } from './RouteActivityAnalyzer';
import type { FilteringResult, FilteringDecision } from './IntelligentVehicleFilter';
import type { RouteFilteringConfig } from '../types/routeFiltering';
import { logger } from '../utils/shared/logger';

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

/**
 * Debug log levels for filtering decisions
 */
export enum DebugLogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Debug log entry for filtering decisions
 */
export interface FilteringDebugLog {
  timestamp: Date;
  level: DebugLogLevel;
  operation: string;
  vehicleId?: string;
  routeId?: string;
  decision: string;
  reason: string;
  metadata: Record<string, any>;
  performanceMetrics?: {
    duration: number;
    memoryUsage?: number;
    cacheHit?: boolean;
  };
}

/**
 * Route classification debug information
 */
export interface RouteClassificationDebug {
  routeId: string;
  vehicleCount: number;
  threshold: number;
  classification: string;
  activityScore?: number;
  factors: {
    vehicleDensity: number;
    averageSpeed?: number;
    trafficLevel?: string;
  };
  timestamp: Date;
}

/**
 * Performance metrics for monitoring
 */
export interface PerformanceMetrics {
  operationName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  memoryUsage: {
    before: number;
    after: number;
    peak: number;
  };
  cacheStats: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  errorCount: number;
  successCount: number;
  throughput: number; // operations per second
}

/**
 * System health metrics
 */
export interface SystemHealthMetrics {
  timestamp: Date;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  components: {
    routeAnalyzer: ComponentHealth;
    vehicleFilter: ComponentHealth;
    configManager: ComponentHealth;
    dataValidator: ComponentHealth;
  };
  performance: {
    averageResponseTime: number;
    memoryUsage: number;
    errorRate: number;
    throughput: number;
  };
  alerts: HealthAlert[];
}

/**
 * Individual component health status
 */
export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  circuitBreakerState: string;
  issues: string[];
}

/**
 * Health alert for monitoring
 */
export interface HealthAlert {
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

/**
 * Debug session configuration
 */
export interface DebugSessionConfig {
  enabled: boolean;
  logLevel: DebugLogLevel;
  includePerformanceMetrics: boolean;
  includeMemoryUsage: boolean;
  includeCacheStats: boolean;
  maxLogEntries: number;
  sessionDuration: number; // in milliseconds
  components: string[]; // Components to debug
}

// ============================================================================
// DEBUG MONITORING SERVICE INTERFACE
// ============================================================================

export interface IDebugMonitoringService {
  // Debug logging
  logFilteringDecision(decision: FilteringDecision, metadata?: Record<string, any>): void;
  logRouteClassification(debug: RouteClassificationDebug): void;
  logPerformanceMetrics(metrics: PerformanceMetrics): void;
  
  // Debug session management
  startDebugSession(config: DebugSessionConfig): string;
  stopDebugSession(sessionId: string): void;
  getDebugSession(sessionId: string): DebugSessionConfig | null;
  
  // Log retrieval
  getDebugLogs(sessionId?: string, level?: DebugLogLevel): FilteringDebugLog[];
  getRouteClassificationLogs(routeId?: string): RouteClassificationDebug[];
  getPerformanceLogs(operationName?: string): PerformanceMetrics[];
  
  // System monitoring
  getSystemHealth(): SystemHealthMetrics;
  getComponentHealth(component: string): ComponentHealth;
  addHealthAlert(alert: HealthAlert): void;
  resolveHealthAlert(alertId: string): void;
  
  // Export and analysis
  exportDebugData(format: 'json' | 'csv'): string;
  generatePerformanceReport(): string;
  clearDebugData(): void;
}

// ============================================================================
// DEBUG MONITORING SERVICE IMPLEMENTATION
// ============================================================================

/**
 * Comprehensive debug monitoring service implementation
 */
export class DebugMonitoringService implements IDebugMonitoringService {
  private debugLogs: FilteringDebugLog[] = [];
  private routeClassificationLogs: RouteClassificationDebug[] = [];
  private performanceLogs: PerformanceMetrics[] = [];
  private healthAlerts: HealthAlert[] = [];
  private debugSessions = new Map<string, DebugSessionConfig>();
  private componentHealthCache = new Map<string, ComponentHealth>();
  
  private readonly MAX_LOG_ENTRIES = 10000;
  private readonly MAX_PERFORMANCE_ENTRIES = 1000;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  
  private sessionIdCounter = 0;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor() {
    this.startHealthMonitoring();
    
    logger.info('DebugMonitoringService initialized', {
      maxLogEntries: this.MAX_LOG_ENTRIES,
      maxPerformanceEntries: this.MAX_PERFORMANCE_ENTRIES,
      healthCheckInterval: this.HEALTH_CHECK_INTERVAL
    });
  }

  // ============================================================================
  // DEBUG LOGGING METHODS
  // ============================================================================

  /**
   * Log filtering decision with debug information
   * 
   * Requirements 4.4: Debug logging for filtering decisions
   */
  logFilteringDecision(decision: FilteringDecision, metadata: Record<string, any> = {}): void {
    const debugLog: FilteringDebugLog = {
      timestamp: new Date(),
      level: DebugLogLevel.DEBUG,
      operation: 'vehicle_filtering',
      vehicleId: decision.vehicleId,
      routeId: decision.routeId,
      decision: decision.included ? 'INCLUDED' : 'EXCLUDED',
      reason: decision.reason,
      metadata: {
        routeClassification: decision.routeClassification,
        distanceFilterApplied: decision.distanceFilterApplied,
        distanceToNearestStation: decision.distanceToNearestStation,
        ...metadata
      }
    };

    this.addDebugLog(debugLog);

    // Log to console if any debug session is active
    if (this.hasActiveDebugSessions()) {
      logger.debug('Filtering decision', {
        vehicleId: decision.vehicleId,
        routeId: decision.routeId,
        included: decision.included,
        reason: decision.reason,
        classification: decision.routeClassification
      }, 'DEBUG_MONITOR');
    }
  }

  /**
   * Log route classification decision with debug information
   * 
   * Requirements 4.4: Route classification and filtering decision logs
   */
  logRouteClassification(debug: RouteClassificationDebug): void {
    this.routeClassificationLogs.push(debug);

    // Maintain log size limit
    if (this.routeClassificationLogs.length > this.MAX_LOG_ENTRIES) {
      this.routeClassificationLogs = this.routeClassificationLogs.slice(-this.MAX_LOG_ENTRIES);
    }

    // Log to console if debugging is enabled
    if (this.hasActiveDebugSessions()) {
      logger.debug('Route classification', {
        routeId: debug.routeId,
        vehicleCount: debug.vehicleCount,
        threshold: debug.threshold,
        classification: debug.classification,
        factors: debug.factors
      }, 'DEBUG_MONITOR');
    }
  }

  /**
   * Log performance metrics for monitoring
   * 
   * Requirements 4.4: Performance metrics tracking
   */
  logPerformanceMetrics(metrics: PerformanceMetrics): void {
    this.performanceLogs.push(metrics);

    // Maintain log size limit
    if (this.performanceLogs.length > this.MAX_PERFORMANCE_ENTRIES) {
      this.performanceLogs = this.performanceLogs.slice(-this.MAX_PERFORMANCE_ENTRIES);
    }

    // Check for performance issues and create alerts
    this.checkPerformanceAlerts(metrics);

    // Log performance issues
    if (metrics.duration > 1000) { // More than 1 second
      logger.warn('Slow operation detected', {
        operation: metrics.operationName,
        duration: metrics.duration,
        memoryUsage: metrics.memoryUsage,
        errorCount: metrics.errorCount
      }, 'DEBUG_MONITOR');
    }
  }

  // ============================================================================
  // DEBUG SESSION MANAGEMENT
  // ============================================================================

  /**
   * Start a new debug session with specified configuration
   */
  startDebugSession(config: DebugSessionConfig): string {
    const sessionId = `debug-session-${++this.sessionIdCounter}-${Date.now()}`;
    
    this.debugSessions.set(sessionId, {
      ...config,
      enabled: true
    });

    // Auto-stop session after specified duration
    if (config.sessionDuration > 0) {
      setTimeout(() => {
        this.stopDebugSession(sessionId);
      }, config.sessionDuration);
    }

    logger.info('Debug session started', {
      sessionId,
      config,
      duration: config.sessionDuration
    }, 'DEBUG_MONITOR');

    return sessionId;
  }

  /**
   * Stop an active debug session
   */
  stopDebugSession(sessionId: string): void {
    const session = this.debugSessions.get(sessionId);
    if (session) {
      session.enabled = false;
      this.debugSessions.delete(sessionId);
      
      logger.info('Debug session stopped', { sessionId }, 'DEBUG_MONITOR');
    }
  }

  /**
   * Get debug session configuration
   */
  getDebugSession(sessionId: string): DebugSessionConfig | null {
    return this.debugSessions.get(sessionId) || null;
  }

  // ============================================================================
  // LOG RETRIEVAL METHODS
  // ============================================================================

  /**
   * Get debug logs with optional filtering
   */
  getDebugLogs(sessionId?: string, level?: DebugLogLevel): FilteringDebugLog[] {
    let logs = [...this.debugLogs];

    if (level) {
      const levelPriority = {
        [DebugLogLevel.TRACE]: 0,
        [DebugLogLevel.DEBUG]: 1,
        [DebugLogLevel.INFO]: 2,
        [DebugLogLevel.WARN]: 3,
        [DebugLogLevel.ERROR]: 4
      };

      const minPriority = levelPriority[level];
      logs = logs.filter(log => levelPriority[log.level] >= minPriority);
    }

    // If sessionId is provided, filter by session timeframe
    if (sessionId) {
      const session = this.debugSessions.get(sessionId);
      if (session) {
        // This is a simplified implementation - in practice, you'd track session start/end times
        logs = logs.slice(-1000); // Return recent logs for the session
      }
    }

    return logs;
  }

  /**
   * Get route classification logs with optional route filtering
   */
  getRouteClassificationLogs(routeId?: string): RouteClassificationDebug[] {
    if (routeId) {
      return this.routeClassificationLogs.filter(log => log.routeId === routeId);
    }
    return [...this.routeClassificationLogs];
  }

  /**
   * Get performance logs with optional operation filtering
   */
  getPerformanceLogs(operationName?: string): PerformanceMetrics[] {
    if (operationName) {
      return this.performanceLogs.filter(log => log.operationName === operationName);
    }
    return [...this.performanceLogs];
  }

  // ============================================================================
  // SYSTEM MONITORING METHODS
  // ============================================================================

  /**
   * Get current system health metrics
   * 
   * Requirements 6.4: Generate detailed user feedback when debugging enabled
   */
  getSystemHealth(): SystemHealthMetrics {
    const now = new Date();
    
    // Calculate overall performance metrics
    const recentPerformanceLogs = this.performanceLogs.filter(log => 
      now.getTime() - log.endTime.getTime() < 300000 // Last 5 minutes
    );

    const averageResponseTime = recentPerformanceLogs.length > 0
      ? recentPerformanceLogs.reduce((sum, log) => sum + log.duration, 0) / recentPerformanceLogs.length
      : 0;

    const totalErrors = recentPerformanceLogs.reduce((sum, log) => sum + log.errorCount, 0);
    const totalOperations = recentPerformanceLogs.reduce((sum, log) => sum + log.successCount + log.errorCount, 0);
    const errorRate = totalOperations > 0 ? totalErrors / totalOperations : 0;

    const throughput = recentPerformanceLogs.length > 0
      ? recentPerformanceLogs.reduce((sum, log) => sum + log.throughput, 0) / recentPerformanceLogs.length
      : 0;

    // Get component health
    const components = {
      routeAnalyzer: this.getComponentHealth('route-activity-analyzer'),
      vehicleFilter: this.getComponentHealth('intelligent-vehicle-filter'),
      configManager: this.getComponentHealth('configuration-manager'),
      dataValidator: this.getComponentHealth('data-validator')
    };

    // Determine overall health
    const componentStatuses = Object.values(components).map(c => c.status);
    let overallHealth: 'healthy' | 'degraded' | 'critical';

    if (componentStatuses.includes('critical') || componentStatuses.includes('offline')) {
      overallHealth = 'critical';
    } else if (componentStatuses.includes('degraded')) {
      overallHealth = 'degraded';
    } else {
      overallHealth = 'healthy';
    }

    // Get active alerts
    const activeAlerts = this.healthAlerts.filter(alert => !alert.resolved);

    return {
      timestamp: now,
      overallHealth,
      components,
      performance: {
        averageResponseTime,
        memoryUsage: this.getCurrentMemoryUsage(),
        errorRate,
        throughput
      },
      alerts: activeAlerts
    };
  }

  /**
   * Get health status for a specific component
   */
  getComponentHealth(component: string): ComponentHealth {
    const cached = this.componentHealthCache.get(component);
    if (cached && Date.now() - cached.lastCheck.getTime() < this.HEALTH_CHECK_INTERVAL) {
      return cached;
    }

    // Calculate component health based on recent performance and errors
    const recentLogs = this.performanceLogs.filter(log => 
      log.operationName.includes(component) &&
      Date.now() - log.endTime.getTime() < 300000 // Last 5 minutes
    );

    const averageResponseTime = recentLogs.length > 0
      ? recentLogs.reduce((sum, log) => sum + log.duration, 0) / recentLogs.length
      : 0;

    const totalErrors = recentLogs.reduce((sum, log) => sum + log.errorCount, 0);
    const totalOperations = recentLogs.reduce((sum, log) => sum + log.successCount + log.errorCount, 0);
    const errorRate = totalOperations > 0 ? totalErrors / totalOperations : 0;

    // Determine component status
    let status: ComponentHealth['status'];
    const issues: string[] = [];

    if (errorRate > 0.5) {
      status = 'critical';
      issues.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
    } else if (errorRate > 0.2 || averageResponseTime > 2000) {
      status = 'degraded';
      if (errorRate > 0.2) issues.push(`Elevated error rate: ${(errorRate * 100).toFixed(1)}%`);
      if (averageResponseTime > 2000) issues.push(`Slow response time: ${averageResponseTime.toFixed(0)}ms`);
    } else if (recentLogs.length === 0) {
      status = 'offline';
      issues.push('No recent activity detected');
    } else {
      status = 'healthy';
    }

    const health: ComponentHealth = {
      status,
      lastCheck: new Date(),
      responseTime: averageResponseTime,
      errorRate,
      circuitBreakerState: 'closed', // Would be retrieved from actual circuit breaker
      issues
    };

    this.componentHealthCache.set(component, health);
    return health;
  }

  /**
   * Add a health alert for monitoring
   */
  addHealthAlert(alert: HealthAlert): void {
    this.healthAlerts.push(alert);

    // Log the alert
    const logLevel = alert.severity === 'critical' ? 'error' : 
                    alert.severity === 'high' ? 'warn' : 'info';
    
    logger[logLevel]('Health alert added', {
      severity: alert.severity,
      component: alert.component,
      message: alert.message
    }, 'DEBUG_MONITOR');

    // Maintain alert history size
    if (this.healthAlerts.length > 1000) {
      this.healthAlerts = this.healthAlerts.slice(-1000);
    }
  }

  /**
   * Resolve a health alert
   */
  resolveHealthAlert(alertId: string): void {
    // In a real implementation, alerts would have IDs
    // For now, we'll resolve the most recent matching alert
    const alert = this.healthAlerts.find(a => !a.resolved);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      
      logger.info('Health alert resolved', {
        component: alert.component,
        message: alert.message,
        resolvedAt: alert.resolvedAt
      }, 'DEBUG_MONITOR');
    }
  }

  // ============================================================================
  // EXPORT AND ANALYSIS METHODS
  // ============================================================================

  /**
   * Export debug data in specified format
   */
  exportDebugData(format: 'json' | 'csv'): string {
    const data = {
      debugLogs: this.debugLogs,
      routeClassificationLogs: this.routeClassificationLogs,
      performanceLogs: this.performanceLogs,
      healthAlerts: this.healthAlerts,
      systemHealth: this.getSystemHealth()
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      // Simple CSV export for debug logs
      const csvLines = ['timestamp,level,operation,vehicleId,routeId,decision,reason'];
      
      for (const log of this.debugLogs) {
        csvLines.push([
          log.timestamp.toISOString(),
          log.level,
          log.operation,
          log.vehicleId || '',
          log.routeId || '',
          log.decision,
          log.reason.replace(/,/g, ';') // Escape commas
        ].join(','));
      }
      
      return csvLines.join('\n');
    }
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport(): string {
    const systemHealth = this.getSystemHealth();
    const recentLogs = this.performanceLogs.slice(-100); // Last 100 operations
    
    const report = [
      '# Performance Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## System Health',
      `Overall Status: ${systemHealth.overallHealth}`,
      `Average Response Time: ${systemHealth.performance.averageResponseTime.toFixed(2)}ms`,
      `Memory Usage: ${(systemHealth.performance.memoryUsage * 100).toFixed(1)}%`,
      `Error Rate: ${(systemHealth.performance.errorRate * 100).toFixed(2)}%`,
      `Throughput: ${systemHealth.performance.throughput.toFixed(1)} ops/sec`,
      '',
      '## Component Health',
      ...Object.entries(systemHealth.components).map(([name, health]) => 
        `- ${name}: ${health.status} (${health.responseTime.toFixed(0)}ms, ${(health.errorRate * 100).toFixed(1)}% errors)`
      ),
      '',
      '## Recent Performance Metrics',
      ...recentLogs.slice(-10).map(log => 
        `- ${log.operationName}: ${log.duration.toFixed(0)}ms (${log.successCount} success, ${log.errorCount} errors)`
      ),
      '',
      '## Active Alerts',
      ...systemHealth.alerts.map(alert => 
        `- [${alert.severity.toUpperCase()}] ${alert.component}: ${alert.message}`
      )
    ];

    return report.join('\n');
  }

  /**
   * Clear all debug data
   */
  clearDebugData(): void {
    this.debugLogs = [];
    this.routeClassificationLogs = [];
    this.performanceLogs = [];
    this.healthAlerts = [];
    this.componentHealthCache.clear();
    
    logger.info('Debug data cleared', {}, 'DEBUG_MONITOR');
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Add debug log entry with session filtering
   */
  private addDebugLog(log: FilteringDebugLog): void {
    // Check if any active debug session should capture this log
    let shouldLog = false;
    
    for (const session of this.debugSessions.values()) {
      if (session.enabled && this.shouldLogForSession(log, session)) {
        shouldLog = true;
        break;
      }
    }

    if (shouldLog || this.debugSessions.size === 0) {
      this.debugLogs.push(log);
      
      // Maintain log size limit
      if (this.debugLogs.length > this.MAX_LOG_ENTRIES) {
        this.debugLogs = this.debugLogs.slice(-this.MAX_LOG_ENTRIES);
      }
    }
  }

  /**
   * Check if log should be captured for a specific session
   */
  private shouldLogForSession(log: FilteringDebugLog, session: DebugSessionConfig): boolean {
    // Check log level
    const levelPriority = {
      [DebugLogLevel.TRACE]: 0,
      [DebugLogLevel.DEBUG]: 1,
      [DebugLogLevel.INFO]: 2,
      [DebugLogLevel.WARN]: 3,
      [DebugLogLevel.ERROR]: 4
    };

    if (levelPriority[log.level] < levelPriority[session.logLevel]) {
      return false;
    }

    // Check components filter
    if (session.components.length > 0) {
      const logComponent = log.operation.replace('_', '-');
      if (!session.components.some(comp => logComponent.includes(comp))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if any debug sessions are currently active
   */
  private hasActiveDebugSessions(): boolean {
    return Array.from(this.debugSessions.values()).some(session => session.enabled);
  }

  /**
   * Check performance metrics for alerts
   */
  private checkPerformanceAlerts(metrics: PerformanceMetrics): void {
    // Check for slow operations
    if (metrics.duration > 5000) {
      this.addHealthAlert({
        severity: 'high',
        component: metrics.operationName,
        message: `Slow operation detected: ${metrics.duration.toFixed(0)}ms`,
        timestamp: new Date(),
        resolved: false
      });
    }

    // Check for high error rates
    const totalOps = metrics.successCount + metrics.errorCount;
    if (totalOps > 0 && metrics.errorCount / totalOps > 0.3) {
      this.addHealthAlert({
        severity: 'medium',
        component: metrics.operationName,
        message: `High error rate: ${((metrics.errorCount / totalOps) * 100).toFixed(1)}%`,
        timestamp: new Date(),
        resolved: false
      });
    }

    // Check for memory issues
    if (metrics.memoryUsage.peak > 0.9) {
      this.addHealthAlert({
        severity: 'critical',
        component: metrics.operationName,
        message: `High memory usage: ${(metrics.memoryUsage.peak * 100).toFixed(1)}%`,
        timestamp: new Date(),
        resolved: false
      });
    }
  }

  /**
   * Get current memory usage (simplified implementation)
   */
  private getCurrentMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return usage.heapUsed / usage.heapTotal;
    }
    return 0.5; // Default fallback
  }

  /**
   * Start health monitoring timer
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(() => {
      // Clear expired component health cache
      const now = Date.now();
      for (const [component, health] of this.componentHealthCache.entries()) {
        if (now - health.lastCheck.getTime() > this.HEALTH_CHECK_INTERVAL * 2) {
          this.componentHealthCache.delete(component);
        }
      }

      // Auto-resolve old alerts
      const oneHourAgo = new Date(now - 60 * 60 * 1000);
      for (const alert of this.healthAlerts) {
        if (!alert.resolved && alert.timestamp < oneHourAgo) {
          alert.resolved = true;
          alert.resolvedAt = new Date();
        }
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
  }
}

// ============================================================================
// EXPORTED INSTANCE
// ============================================================================

/**
 * Default debug monitoring service instance
 */
export const debugMonitoringService = new DebugMonitoringService();

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new DebugMonitoringService instance
 */
export function createDebugMonitoringService(): DebugMonitoringService {
  return new DebugMonitoringService();
}