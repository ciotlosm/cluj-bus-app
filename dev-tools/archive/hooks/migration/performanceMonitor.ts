/**
 * Performance monitoring utilities for hook migration
 * 
 * This module provides real-time performance monitoring and reporting
 * for the migration from old to new hook implementations.
 */

import { logger } from '../../utils/logger';
import { migrationTracker } from './migrationHelpers';

/**
 * Performance metrics interface
 */
interface PerformanceMetrics {
  executionTime: number;
  memoryUsage?: number;
  apiCalls: number;
  cacheHits: number;
  cacheMisses: number;
  timestamp: Date;
  componentName: string;
  hookName: string;
  options: Record<string, any>;
  success: boolean;
  errorMessage?: string;
}

/**
 * Performance thresholds for alerting
 */
interface PerformanceThresholds {
  maxExecutionTime: number; // milliseconds
  maxMemoryIncrease: number; // bytes
  minCacheHitRate: number; // percentage (0-100)
  maxApiCallsPerMinute: number;
}

/**
 * Performance comparison result
 */
interface PerformanceComparison {
  oldMetrics: PerformanceMetrics[];
  newMetrics: PerformanceMetrics[];
  comparison: {
    executionTimeImprovement: number; // percentage
    memoryUsageChange: number; // percentage
    apiCallReduction: number; // percentage
    cacheEfficiencyImprovement: number; // percentage
  };
  alerts: string[];
  recommendations: string[];
}

/**
 * Performance monitoring class
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private thresholds: PerformanceThresholds;
  private isMonitoring: boolean = false;
  private monitoringInterval?: number;

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = {
      maxExecutionTime: 1000, // 1 second
      maxMemoryIncrease: 50 * 1024 * 1024, // 50MB
      minCacheHitRate: 70, // 70%
      maxApiCallsPerMinute: 60,
      ...thresholds
    };
  }

  /**
   * Record performance metrics
   */
  recordMetrics(metrics: PerformanceMetrics): void {
    const key = `${metrics.componentName}:${metrics.hookName}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const metricsList = this.metrics.get(key)!;
    metricsList.push(metrics);
    
    // Keep only last 100 measurements per key
    if (metricsList.length > 100) {
      metricsList.splice(0, metricsList.length - 100);
    }

    // Check for performance issues
    this.checkPerformanceThresholds(metrics);

    // Log metrics if monitoring is enabled
    if (this.isMonitoring) {
      this.logMetrics(metrics);
    }
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    
    this.monitoringInterval = window.setInterval(() => {
      this.generatePerformanceReport();
    }, intervalMs);

    logger.info('Performance monitoring started', {
      interval: intervalMs,
      thresholds: this.thresholds
    }, 'PerformanceMonitor');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    logger.info('Performance monitoring stopped', {}, 'PerformanceMonitor');
  }

  /**
   * Compare performance between old and new implementations
   */
  comparePerformance(
    componentName: string,
    hookName: string,
    timeWindowMs: number = 300000 // 5 minutes
  ): PerformanceComparison | null {
    const oldKey = `${componentName}:${hookName}:old`;
    const newKey = `${componentName}:${hookName}:new`;
    
    const cutoffTime = new Date(Date.now() - timeWindowMs);
    
    const oldMetrics = (this.metrics.get(oldKey) || [])
      .filter(m => m.timestamp >= cutoffTime);
    const newMetrics = (this.metrics.get(newKey) || [])
      .filter(m => m.timestamp >= cutoffTime);

    if (oldMetrics.length === 0 || newMetrics.length === 0) {
      return null;
    }

    // Calculate averages
    const oldAvgExecution = this.calculateAverage(oldMetrics, 'executionTime');
    const newAvgExecution = this.calculateAverage(newMetrics, 'executionTime');
    
    const oldAvgMemory = this.calculateAverage(oldMetrics, 'memoryUsage');
    const newAvgMemory = this.calculateAverage(newMetrics, 'memoryUsage');
    
    const oldAvgApiCalls = this.calculateAverage(oldMetrics, 'apiCalls');
    const newAvgApiCalls = this.calculateAverage(newMetrics, 'apiCalls');
    
    const oldCacheHitRate = this.calculateCacheHitRate(oldMetrics);
    const newCacheHitRate = this.calculateCacheHitRate(newMetrics);

    // Calculate improvements
    const executionTimeImprovement = oldAvgExecution > 0 
      ? ((oldAvgExecution - newAvgExecution) / oldAvgExecution) * 100 
      : 0;
    
    const memoryUsageChange = oldAvgMemory > 0 
      ? ((newAvgMemory - oldAvgMemory) / oldAvgMemory) * 100 
      : 0;
    
    const apiCallReduction = oldAvgApiCalls > 0 
      ? ((oldAvgApiCalls - newAvgApiCalls) / oldAvgApiCalls) * 100 
      : 0;
    
    const cacheEfficiencyImprovement = newCacheHitRate - oldCacheHitRate;

    // Generate alerts and recommendations
    const alerts: string[] = [];
    const recommendations: string[] = [];

    if (executionTimeImprovement < -50) {
      alerts.push(`Significant performance regression: ${Math.abs(executionTimeImprovement).toFixed(1)}% slower`);
      recommendations.push('Review new implementation for performance bottlenecks');
    }

    if (memoryUsageChange > 50) {
      alerts.push(`High memory usage increase: ${memoryUsageChange.toFixed(1)}%`);
      recommendations.push('Investigate memory leaks in new implementation');
    }

    if (apiCallReduction < 0) {
      alerts.push(`API calls increased by ${Math.abs(apiCallReduction).toFixed(1)}%`);
      recommendations.push('Review caching strategy in new implementation');
    }

    if (newCacheHitRate < this.thresholds.minCacheHitRate) {
      alerts.push(`Low cache hit rate: ${newCacheHitRate.toFixed(1)}%`);
      recommendations.push('Optimize caching configuration');
    }

    // Add positive feedback
    if (executionTimeImprovement > 10) {
      recommendations.push(`Great performance improvement: ${executionTimeImprovement.toFixed(1)}% faster`);
    }

    if (apiCallReduction > 20) {
      recommendations.push(`Excellent API call reduction: ${apiCallReduction.toFixed(1)}% fewer calls`);
    }

    return {
      oldMetrics,
      newMetrics,
      comparison: {
        executionTimeImprovement,
        memoryUsageChange,
        apiCallReduction,
        cacheEfficiencyImprovement
      },
      alerts,
      recommendations
    };
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport(): {
    summary: {
      totalComponents: number;
      totalMeasurements: number;
      averageExecutionTime: number;
      averageCacheHitRate: number;
      alertCount: number;
    };
    componentReports: Array<{
      component: string;
      metrics: PerformanceMetrics[];
      comparison?: PerformanceComparison;
      status: 'good' | 'warning' | 'critical';
    }>;
    globalAlerts: string[];
    recommendations: string[];
  } {
    const componentReports: Array<{
      component: string;
      metrics: PerformanceMetrics[];
      comparison?: PerformanceComparison;
      status: 'good' | 'warning' | 'critical';
    }> = [];

    const globalAlerts: string[] = [];
    const recommendations: string[] = [];
    let totalMeasurements = 0;
    let totalExecutionTime = 0;
    let totalCacheHits = 0;
    let totalCacheAttempts = 0;

    // Analyze each component
    const components = new Set<string>();
    for (const key of this.metrics.keys()) {
      const [componentName] = key.split(':');
      components.add(componentName);
    }

    for (const component of components) {
      const componentMetrics = this.getComponentMetrics(component);
      const comparison = this.comparePerformance(component, 'useVehicleProcessing');
      
      let status: 'good' | 'warning' | 'critical' = 'good';
      
      if (comparison) {
        if (comparison.alerts.length > 0) {
          status = comparison.comparison.executionTimeImprovement < -100 ? 'critical' : 'warning';
          globalAlerts.push(...comparison.alerts);
        }
        recommendations.push(...comparison.recommendations);
      }

      // Calculate component averages
      const avgExecution = this.calculateAverage(componentMetrics, 'executionTime');
      const cacheHitRate = this.calculateCacheHitRate(componentMetrics);

      totalMeasurements += componentMetrics.length;
      totalExecutionTime += avgExecution * componentMetrics.length;
      totalCacheHits += componentMetrics.reduce((sum, m) => sum + m.cacheHits, 0);
      totalCacheAttempts += componentMetrics.reduce((sum, m) => sum + m.cacheHits + m.cacheMisses, 0);

      componentReports.push({
        component,
        metrics: componentMetrics,
        comparison,
        status
      });
    }

    const summary = {
      totalComponents: components.size,
      totalMeasurements,
      averageExecutionTime: totalMeasurements > 0 ? totalExecutionTime / totalMeasurements : 0,
      averageCacheHitRate: totalCacheAttempts > 0 ? (totalCacheHits / totalCacheAttempts) * 100 : 0,
      alertCount: globalAlerts.length
    };

    const report = {
      summary,
      componentReports,
      globalAlerts,
      recommendations: [...new Set(recommendations)] // Remove duplicates
    };

    // Log the report
    logger.info('Performance report generated', {
      summary,
      alertCount: globalAlerts.length,
      recommendationCount: recommendations.length
    }, 'PerformanceMonitor');

    return report;
  }

  /**
   * Get metrics for a specific component
   */
  getComponentMetrics(componentName: string): PerformanceMetrics[] {
    const allMetrics: PerformanceMetrics[] = [];
    
    for (const [key, metrics] of this.metrics.entries()) {
      if (key.startsWith(`${componentName}:`)) {
        allMetrics.push(...metrics);
      }
    }
    
    return allMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    logger.info('Performance metrics cleared', {}, 'PerformanceMonitor');
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): {
    timestamp: string;
    thresholds: PerformanceThresholds;
    metrics: Record<string, PerformanceMetrics[]>;
  } {
    const metricsObj: Record<string, PerformanceMetrics[]> = {};
    
    for (const [key, metrics] of this.metrics.entries()) {
      metricsObj[key] = [...metrics];
    }

    return {
      timestamp: new Date().toISOString(),
      thresholds: { ...this.thresholds },
      metrics: metricsObj
    };
  }

  /**
   * Check performance thresholds and generate alerts
   */
  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    const alerts: string[] = [];

    if (metrics.executionTime > this.thresholds.maxExecutionTime) {
      alerts.push(`Execution time exceeded threshold: ${metrics.executionTime}ms > ${this.thresholds.maxExecutionTime}ms`);
    }

    if (metrics.memoryUsage && metrics.memoryUsage > this.thresholds.maxMemoryIncrease) {
      alerts.push(`Memory usage exceeded threshold: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    }

    const cacheHitRate = (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100;
    if (cacheHitRate < this.thresholds.minCacheHitRate) {
      alerts.push(`Cache hit rate below threshold: ${cacheHitRate.toFixed(1)}% < ${this.thresholds.minCacheHitRate}%`);
    }

    if (alerts.length > 0) {
      logger.warn('Performance threshold violations', {
        component: metrics.componentName,
        hook: metrics.hookName,
        alerts,
        metrics: {
          executionTime: metrics.executionTime,
          memoryUsage: metrics.memoryUsage,
          cacheHitRate
        }
      }, 'PerformanceMonitor');
    }
  }

  /**
   * Log performance metrics
   */
  private logMetrics(metrics: PerformanceMetrics): void {
    const cacheHitRate = (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100;
    
    logger.debug('Performance metrics recorded', {
      component: metrics.componentName,
      hook: metrics.hookName,
      executionTime: metrics.executionTime,
      memoryUsage: metrics.memoryUsage,
      apiCalls: metrics.apiCalls,
      cacheHitRate: cacheHitRate.toFixed(1),
      success: metrics.success
    }, 'PerformanceMonitor');
  }

  /**
   * Calculate average for a numeric property
   */
  private calculateAverage(metrics: PerformanceMetrics[], property: keyof PerformanceMetrics): number {
    const values = metrics
      .map(m => m[property])
      .filter((value): value is number => typeof value === 'number');
    
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(metrics: PerformanceMetrics[]): number {
    const totalHits = metrics.reduce((sum, m) => sum + m.cacheHits, 0);
    const totalAttempts = metrics.reduce((sum, m) => sum + m.cacheHits + m.cacheMisses, 0);
    
    return totalAttempts > 0 ? (totalHits / totalAttempts) * 100 : 0;
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitoring(
  componentName: string,
  hookName: string = 'useVehicleProcessing'
): {
  recordMetrics: (metrics: Omit<PerformanceMetrics, 'componentName' | 'hookName' | 'timestamp'>) => void;
  getMetrics: () => PerformanceMetrics[];
  getComparison: () => PerformanceComparison | null;
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
} {
  const recordMetrics = React.useCallback((
    metrics: Omit<PerformanceMetrics, 'componentName' | 'hookName' | 'timestamp'>
  ) => {
    performanceMonitor.recordMetrics({
      ...metrics,
      componentName,
      hookName,
      timestamp: new Date()
    });
  }, [componentName, hookName]);

  const getMetrics = React.useCallback(() => {
    return performanceMonitor.getComponentMetrics(componentName);
  }, [componentName]);

  const getComparison = React.useCallback(() => {
    return performanceMonitor.comparePerformance(componentName, hookName);
  }, [componentName, hookName]);

  const startMonitoring = React.useCallback(() => {
    performanceMonitor.startMonitoring();
  }, []);

  const stopMonitoring = React.useCallback(() => {
    performanceMonitor.stopMonitoring();
  }, []);

  return {
    recordMetrics,
    getMetrics,
    getComparison,
    isMonitoring: performanceMonitor['isMonitoring'],
    startMonitoring,
    stopMonitoring
  };
}

/**
 * Performance monitoring decorator for hooks
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  componentName: string,
  hookName: string,
  hook: T
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    const startTime = performance.now();
    const initialMemory = typeof (performance as any).memory !== 'undefined' 
      ? (performance as any).memory.usedJSHeapSize 
      : undefined;

    let apiCalls = 0;
    let cacheHits = 0;
    let cacheMisses = 0;

    try {
      const result = hook(...args);
      const endTime = performance.now();
      const finalMemory = typeof (performance as any).memory !== 'undefined' 
        ? (performance as any).memory.usedJSHeapSize 
        : undefined;

      // Record successful execution
      performanceMonitor.recordMetrics({
        executionTime: endTime - startTime,
        memoryUsage: finalMemory && initialMemory ? finalMemory - initialMemory : undefined,
        apiCalls,
        cacheHits,
        cacheMisses,
        timestamp: new Date(),
        componentName,
        hookName,
        options: args[0] || {},
        success: true
      });

      return result;
    } catch (error) {
      const endTime = performance.now();
      
      // Record failed execution
      performanceMonitor.recordMetrics({
        executionTime: endTime - startTime,
        memoryUsage: undefined,
        apiCalls,
        cacheHits,
        cacheMisses,
        timestamp: new Date(),
        componentName,
        hookName,
        options: args[0] || {},
        success: false,
        errorMessage: (error as Error).message
      });

      throw error;
    }
  }) as T;
}