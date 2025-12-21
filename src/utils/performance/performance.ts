import React from 'react';
import { logger } from './logger';

/**
 * Performance monitoring and metrics utilities
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'timing' | 'counter' | 'gauge';
}

interface ComponentRenderMetric {
  componentName: string;
  renderTime: number;
  timestamp: number;
  props?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private renderMetrics: ComponentRenderMetric[] = [];
  private maxMetrics = 1000; // Limit stored metrics to prevent memory leaks

  /**
   * Record a timing metric
   */
  recordTiming(name: string, duration: number): void {
    this.addMetric({
      name,
      value: duration,
      timestamp: Date.now(),
      type: 'timing',
    });

    // Log timing metrics only in debug mode
    if (import.meta.env.DEV && logger.getLogLevel() === 0) { // LogLevel.DEBUG = 0
      logger.debug(`Performance timing: ${name} took ${duration.toFixed(2)}ms`, { name, duration }, 'PERFORMANCE');
    }
  }

  /**
   * Record a counter metric
   */
  recordCounter(name: string, count: number = 1): void {
    this.addMetric({
      name,
      value: count,
      timestamp: Date.now(),
      type: 'counter',
    });
  }

  /**
   * Record a gauge metric (current value)
   */
  recordGauge(name: string, value: number): void {
    this.addMetric({
      name,
      value,
      timestamp: Date.now(),
      type: 'gauge',
    });
  }

  /**
   * Record component render performance
   */
  recordComponentRender(componentName: string, renderTime: number, props?: Record<string, any>): void {
    this.renderMetrics.push({
      componentName,
      renderTime,
      timestamp: Date.now(),
      props: import.meta.env.DEV ? props : undefined, // Only store props in development
    });

    // Log performance metrics only in debug mode
    if (import.meta.env.DEV && logger.getLogLevel() === 0) { // LogLevel.DEBUG = 0
      logger.debug(`Component render: ${componentName} took ${renderTime.toFixed(2)}ms`, { renderTime, props }, 'PERFORMANCE');
    }

    // Limit stored render metrics
    if (this.renderMetrics.length > this.maxMetrics) {
      this.renderMetrics = this.renderMetrics.slice(-this.maxMetrics / 2);
    }
  }

  /**
   * Get performance metrics for a specific name
   */
  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(metric => metric.name === name);
    }
    return [...this.metrics];
  }

  /**
   * Get component render metrics
   */
  getRenderMetrics(componentName?: string): ComponentRenderMetric[] {
    if (componentName) {
      return this.renderMetrics.filter(metric => metric.componentName === componentName);
    }
    return [...this.renderMetrics];
  }

  /**
   * Get performance summary
   */
  getSummary(): Record<string, { count: number; avg: number; min: number; max: number }> {
    const summary: Record<string, { count: number; avg: number; min: number; max: number }> = {};

    this.metrics.forEach(metric => {
      if (!summary[metric.name]) {
        summary[metric.name] = {
          count: 0,
          avg: 0,
          min: Infinity,
          max: -Infinity,
        };
      }

      const s = summary[metric.name];
      s.count++;
      s.min = Math.min(s.min, metric.value);
      s.max = Math.max(s.max, metric.value);
      s.avg = (s.avg * (s.count - 1) + metric.value) / s.count;
    });

    return summary;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.renderMetrics = [];
  }

  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Limit stored metrics to prevent memory leaks
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics / 2);
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Higher-order component to measure render performance
 */
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const PerformanceWrappedComponent = React.memo((props: P) => {
    const renderStartTime = React.useRef<number>(0);

    // Record render start time
    renderStartTime.current = performance.now();

    // Use effect to record render completion
    React.useEffect(() => {
      const renderTime = performance.now() - renderStartTime.current;
      performanceMonitor.recordComponentRender(displayName, renderTime, props as Record<string, any>);
    });

    return React.createElement(WrappedComponent, props);
  });

  PerformanceWrappedComponent.displayName = `withPerformanceMonitoring(${displayName})`;

  return PerformanceWrappedComponent;
}

/**
 * Hook to measure function execution time
 */
export function usePerformanceMeasure() {
  const measure = React.useCallback((name: string, fn: () => void | Promise<void>) => {
    const startTime = performance.now();
    
    const result = fn();
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - startTime;
        performanceMonitor.recordTiming(name, duration);
      });
    } else {
      const duration = performance.now() - startTime;
      performanceMonitor.recordTiming(name, duration);
      return result;
    }
  }, []);

  return { measure };
}

/**
 * Hook to track component mount/unmount
 */
export function useComponentLifecycle(componentName: string) {
  React.useEffect(() => {
    performanceMonitor.recordCounter(`${componentName}.mount`);
    
    return () => {
      performanceMonitor.recordCounter(`${componentName}.unmount`);
    };
  }, [componentName]);
}

/**
 * Development-only performance logger - only shows when logger is in debug mode
 */
export function logPerformanceMetrics(): void {
  if (import.meta.env.DEV && logger.getLogLevel() === 0) { // LogLevel.DEBUG = 0
    const summary = performanceMonitor.getSummary();
    // Performance metrics logging removed for production
  }
}

/**
 * Web Vitals measurement (if available)
 */
export function measureWebVitals(): void {
  if (import.meta.env.DEV && logger.getLogLevel() === 0 && 'web-vitals' in window) { // Only in debug mode
    // This would integrate with web-vitals library if installed
    logger.debug('Web Vitals measurement would be implemented here');
  }
}