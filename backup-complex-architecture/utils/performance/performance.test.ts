import { describe, it, expect, vi, beforeEach } from 'vitest';
import { performanceMonitor } from './performance';

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    performanceMonitor.clear();
  });

  it('should record timing metrics', () => {
    performanceMonitor.recordTiming('test-timing', 100);
    
    const metrics = performanceMonitor.getMetrics('test-timing');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe('test-timing');
    expect(metrics[0].value).toBe(100);
    expect(metrics[0].type).toBe('timing');
  });

  it('should record counter metrics', () => {
    performanceMonitor.recordCounter('test-counter', 5);
    
    const metrics = performanceMonitor.getMetrics('test-counter');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe('test-counter');
    expect(metrics[0].value).toBe(5);
    expect(metrics[0].type).toBe('counter');
  });

  it('should record gauge metrics', () => {
    performanceMonitor.recordGauge('test-gauge', 42);
    
    const metrics = performanceMonitor.getMetrics('test-gauge');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe('test-gauge');
    expect(metrics[0].value).toBe(42);
    expect(metrics[0].type).toBe('gauge');
  });

  it('should record component render metrics', () => {
    performanceMonitor.recordComponentRender('TestComponent', 15.5);
    
    const renderMetrics = performanceMonitor.getRenderMetrics('TestComponent');
    expect(renderMetrics).toHaveLength(1);
    expect(renderMetrics[0].componentName).toBe('TestComponent');
    expect(renderMetrics[0].renderTime).toBe(15.5);
  });

  it('should generate performance summary', () => {
    performanceMonitor.recordTiming('api-call', 100);
    performanceMonitor.recordTiming('api-call', 200);
    performanceMonitor.recordTiming('api-call', 150);
    
    const summary = performanceMonitor.getSummary();
    expect(summary['api-call']).toEqual({
      count: 3,
      avg: 150,
      min: 100,
      max: 200,
    });
  });

  it('should filter metrics by name', () => {
    performanceMonitor.recordTiming('metric-1', 100);
    performanceMonitor.recordTiming('metric-2', 200);
    performanceMonitor.recordTiming('metric-1', 150);
    
    const metric1 = performanceMonitor.getMetrics('metric-1');
    const metric2 = performanceMonitor.getMetrics('metric-2');
    
    expect(metric1).toHaveLength(2);
    expect(metric2).toHaveLength(1);
    expect(metric1.every(m => m.name === 'metric-1')).toBe(true);
    expect(metric2.every(m => m.name === 'metric-2')).toBe(true);
  });

  it('should clear all metrics', () => {
    performanceMonitor.recordTiming('test', 100);
    performanceMonitor.recordComponentRender('TestComponent', 50);
    
    expect(performanceMonitor.getMetrics()).toHaveLength(1);
    expect(performanceMonitor.getRenderMetrics()).toHaveLength(1);
    
    performanceMonitor.clear();
    
    expect(performanceMonitor.getMetrics()).toHaveLength(0);
    expect(performanceMonitor.getRenderMetrics()).toHaveLength(0);
  });

  it('should limit stored metrics to prevent memory leaks', () => {
    // Record more than the max limit (1000)
    for (let i = 0; i < 1200; i++) {
      performanceMonitor.recordTiming('test', i);
    }
    
    const metrics = performanceMonitor.getMetrics();
    expect(metrics.length).toBeLessThanOrEqual(1000);
  });
});