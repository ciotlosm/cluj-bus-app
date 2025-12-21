/**
 * Performance Benchmarking for Data Hooks to Store Migration
 * 
 * This module provides comprehensive performance benchmarking to measure
 * the improvements achieved by migrating from data hooks to store-based architecture.
 * 
 * Requirements: 10.2, 10.3 - Performance measurement and documentation
 */

import { logger } from './logger';
import { performanceMonitor } from './performance';

// ============================================================================
// BENCHMARK METRICS TYPES
// ============================================================================

/**
 * API call metrics for measuring reduction in duplicate calls
 */
export interface ApiCallMetrics {
  totalCalls: number;
  uniqueEndpoints: Set<string>;
  duplicateCalls: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTime: number;
  callsByEndpoint: Map<string, number>;
}

/**
 * Rendering performance metrics
 */
export interface RenderingMetrics {
  componentRenderCount: number;
  averageRenderTime: number;
  totalRenderTime: number;
  slowestRenders: Array<{ component: string; time: number }>;
  rendersByComponent: Map<string, { count: number; totalTime: number; avgTime: number }>;
}

/**
 * Memory usage metrics
 */
export interface MemoryMetrics {
  initialMemory: number;
  peakMemory: number;
  finalMemory: number;
  memoryDelta: number;
  heapSize: number;
  heapLimit: number;
}

/**
 * Complete benchmark results
 */
export interface BenchmarkResults {
  timestamp: Date;
  duration: number;
  apiCalls: ApiCallMetrics;
  rendering: RenderingMetrics;
  memory: MemoryMetrics;
  summary: {
    apiCallReduction: number; // Percentage
    renderTimeImprovement: number; // Percentage
    memoryReduction: number; // Percentage
  };
}

/**
 * Comparison between before and after migration
 */
export interface MigrationComparison {
  before: BenchmarkResults;
  after: BenchmarkResults;
  improvements: {
    apiCallReduction: number;
    apiCallReductionPercent: number;
    renderTimeImprovement: number;
    renderTimeImprovementPercent: number;
    memoryReduction: number;
    memoryReductionPercent: number;
    cacheHitRateImprovement: number;
  };
  verdict: 'success' | 'partial' | 'regression';
  recommendations: string[];
}

// ============================================================================
// PERFORMANCE BENCHMARK CLASS
// ============================================================================

/**
 * Performance benchmark tracker for migration validation
 */
export class MigrationPerformanceBenchmark {
  private startTime: number = 0;
  private initialMemory: number = 0;
  private peakMemory: number = 0;
  
  // API call tracking
  private apiCalls: Array<{ endpoint: string; timestamp: number; duration: number; cached: boolean }> = [];
  
  // Rendering tracking
  private renders: Array<{ component: string; timestamp: number; duration: number }> = [];
  
  // Memory sampling
  private memorySamples: number[] = [];
  private memoryInterval: number | null = null;
  
  constructor() {
    this.reset();
  }
  
  /**
   * Start benchmarking session
   */
  start(): void {
    this.reset();
    this.startTime = performance.now();
    
    // Record initial memory
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      this.initialMemory = memInfo.usedJSHeapSize / (1024 * 1024); // MB
      this.peakMemory = this.initialMemory;
    }
    
    // Start memory sampling (every 100ms)
    this.memoryInterval = window.setInterval(() => {
      this.sampleMemory();
    }, 100);
    
    logger.info('Performance benchmark started', {
      startTime: this.startTime,
      initialMemory: this.initialMemory
    }, 'BENCHMARK');
  }
  
  /**
   * Record an API call
   */
  recordApiCall(endpoint: string, duration: number, cached: boolean = false): void {
    this.apiCalls.push({
      endpoint,
      timestamp: performance.now(),
      duration,
      cached
    });
    
    performanceMonitor.recordTiming(`api.${endpoint}`, duration);
    if (cached) {
      performanceMonitor.recordCounter('api.cache_hit');
    } else {
      performanceMonitor.recordCounter('api.cache_miss');
    }
  }
  
  /**
   * Record a component render
   */
  recordRender(component: string, duration: number): void {
    this.renders.push({
      component,
      timestamp: performance.now(),
      duration
    });
    
    performanceMonitor.recordComponentRender(component, duration);
  }
  
  /**
   * Sample current memory usage
   */
  private sampleMemory(): void {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const currentMemory = memInfo.usedJSHeapSize / (1024 * 1024); // MB
      this.memorySamples.push(currentMemory);
      this.peakMemory = Math.max(this.peakMemory, currentMemory);
    }
  }
  
  /**
   * Stop benchmarking and generate results
   */
  stop(): BenchmarkResults {
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    
    // Stop memory sampling
    if (this.memoryInterval !== null) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }
    
    // Final memory sample
    this.sampleMemory();
    
    // Calculate API call metrics
    const apiMetrics = this.calculateApiMetrics();
    
    // Calculate rendering metrics
    const renderMetrics = this.calculateRenderMetrics();
    
    // Calculate memory metrics
    const memoryMetrics = this.calculateMemoryMetrics();
    
    // Calculate summary
    const summary = {
      apiCallReduction: 0, // Will be calculated in comparison
      renderTimeImprovement: 0, // Will be calculated in comparison
      memoryReduction: 0 // Will be calculated in comparison
    };
    
    const results: BenchmarkResults = {
      timestamp: new Date(),
      duration,
      apiCalls: apiMetrics,
      rendering: renderMetrics,
      memory: memoryMetrics,
      summary
    };
    
    logger.info('Performance benchmark completed', {
      duration,
      apiCalls: apiMetrics.totalCalls,
      renders: renderMetrics.componentRenderCount,
      memoryDelta: memoryMetrics.memoryDelta
    }, 'BENCHMARK');
    
    return results;
  }
  
  /**
   * Calculate API call metrics
   */
  private calculateApiMetrics(): ApiCallMetrics {
    const uniqueEndpoints = new Set(this.apiCalls.map(call => call.endpoint));
    const callsByEndpoint = new Map<string, number>();
    
    let totalDuration = 0;
    let cacheHits = 0;
    let cacheMisses = 0;
    
    for (const call of this.apiCalls) {
      totalDuration += call.duration;
      
      if (call.cached) {
        cacheHits++;
      } else {
        cacheMisses++;
      }
      
      const count = callsByEndpoint.get(call.endpoint) || 0;
      callsByEndpoint.set(call.endpoint, count + 1);
    }
    
    // Calculate duplicate calls (calls to same endpoint)
    let duplicateCalls = 0;
    for (const count of callsByEndpoint.values()) {
      if (count > 1) {
        duplicateCalls += count - 1;
      }
    }
    
    return {
      totalCalls: this.apiCalls.length,
      uniqueEndpoints,
      duplicateCalls,
      cacheHits,
      cacheMisses,
      averageResponseTime: this.apiCalls.length > 0 ? totalDuration / this.apiCalls.length : 0,
      callsByEndpoint
    };
  }
  
  /**
   * Calculate rendering metrics
   */
  private calculateRenderMetrics(): RenderingMetrics {
    const rendersByComponent = new Map<string, { count: number; totalTime: number; avgTime: number }>();
    let totalRenderTime = 0;
    
    for (const render of this.renders) {
      totalRenderTime += render.duration;
      
      const existing = rendersByComponent.get(render.component) || { count: 0, totalTime: 0, avgTime: 0 };
      existing.count++;
      existing.totalTime += render.duration;
      existing.avgTime = existing.totalTime / existing.count;
      rendersByComponent.set(render.component, existing);
    }
    
    // Find slowest renders
    const slowestRenders = [...this.renders]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
      .map(render => ({ component: render.component, time: render.duration }));
    
    return {
      componentRenderCount: this.renders.length,
      averageRenderTime: this.renders.length > 0 ? totalRenderTime / this.renders.length : 0,
      totalRenderTime,
      slowestRenders,
      rendersByComponent
    };
  }
  
  /**
   * Calculate memory metrics
   */
  private calculateMemoryMetrics(): MemoryMetrics {
    let finalMemory = this.initialMemory;
    let heapSize = 0;
    let heapLimit = 0;
    
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      finalMemory = memInfo.usedJSHeapSize / (1024 * 1024); // MB
      heapSize = memInfo.totalJSHeapSize / (1024 * 1024); // MB
      heapLimit = memInfo.jsHeapSizeLimit / (1024 * 1024); // MB
    }
    
    return {
      initialMemory: this.initialMemory,
      peakMemory: this.peakMemory,
      finalMemory,
      memoryDelta: finalMemory - this.initialMemory,
      heapSize,
      heapLimit
    };
  }
  
  /**
   * Reset benchmark state
   */
  private reset(): void {
    this.startTime = 0;
    this.initialMemory = 0;
    this.peakMemory = 0;
    this.apiCalls = [];
    this.renders = [];
    this.memorySamples = [];
    
    if (this.memoryInterval !== null) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }
  }
}

// ============================================================================
// COMPARISON AND ANALYSIS
// ============================================================================

/**
 * Compare before and after migration results
 */
export function compareMigrationResults(
  before: BenchmarkResults,
  after: BenchmarkResults
): MigrationComparison {
  // Calculate improvements
  const apiCallReduction = before.apiCalls.totalCalls - after.apiCalls.totalCalls;
  const apiCallReductionPercent = before.apiCalls.totalCalls > 0
    ? (apiCallReduction / before.apiCalls.totalCalls) * 100
    : 0;
  
  const renderTimeImprovement = before.rendering.averageRenderTime - after.rendering.averageRenderTime;
  const renderTimeImprovementPercent = before.rendering.averageRenderTime > 0
    ? (renderTimeImprovement / before.rendering.averageRenderTime) * 100
    : 0;
  
  const memoryReduction = before.memory.memoryDelta - after.memory.memoryDelta;
  const memoryReductionPercent = before.memory.memoryDelta > 0
    ? (memoryReduction / before.memory.memoryDelta) * 100
    : 0;
  
  const beforeCacheHitRate = before.apiCalls.totalCalls > 0
    ? (before.apiCalls.cacheHits / before.apiCalls.totalCalls) * 100
    : 0;
  
  const afterCacheHitRate = after.apiCalls.totalCalls > 0
    ? (after.apiCalls.cacheHits / after.apiCalls.totalCalls) * 100
    : 0;
  
  const cacheHitRateImprovement = afterCacheHitRate - beforeCacheHitRate;
  
  // Determine verdict
  let verdict: 'success' | 'partial' | 'regression' = 'success';
  if (apiCallReductionPercent < 0 || renderTimeImprovementPercent < 0 || memoryReductionPercent < 0) {
    verdict = 'regression';
  } else if (apiCallReductionPercent < 20 && renderTimeImprovementPercent < 10) {
    verdict = 'partial';
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (apiCallReductionPercent < 30) {
    recommendations.push('Consider implementing more aggressive caching strategies');
  }
  
  if (after.apiCalls.duplicateCalls > 0) {
    recommendations.push(`Eliminate ${after.apiCalls.duplicateCalls} duplicate API calls through better request deduplication`);
  }
  
  if (renderTimeImprovementPercent < 10) {
    recommendations.push('Optimize component memoization to reduce unnecessary re-renders');
  }
  
  if (afterCacheHitRate < 70) {
    recommendations.push('Improve cache hit rate by increasing cache TTL or implementing smarter invalidation');
  }
  
  if (memoryReductionPercent < 0) {
    recommendations.push('Investigate memory leaks or inefficient data structures');
  }
  
  if (after.rendering.slowestRenders.length > 0) {
    const slowest = after.rendering.slowestRenders[0];
    if (slowest.time > 100) {
      recommendations.push(`Optimize ${slowest.component} component (${slowest.time.toFixed(2)}ms render time)`);
    }
  }
  
  return {
    before,
    after,
    improvements: {
      apiCallReduction,
      apiCallReductionPercent,
      renderTimeImprovement,
      renderTimeImprovementPercent,
      memoryReduction,
      memoryReductionPercent,
      cacheHitRateImprovement
    },
    verdict,
    recommendations
  };
}

/**
 * Generate a human-readable performance report
 */
export function generatePerformanceReport(comparison: MigrationComparison): string {
  const { before, after, improvements, verdict, recommendations } = comparison;
  
  const lines: string[] = [];
  
  lines.push('='.repeat(80));
  lines.push('DATA HOOKS TO STORE MIGRATION - PERFORMANCE REPORT');
  lines.push('='.repeat(80));
  lines.push('');
  
  // Verdict
  lines.push(`VERDICT: ${verdict.toUpperCase()}`);
  lines.push('');
  
  // API Call Metrics
  lines.push('API CALL METRICS:');
  lines.push('-'.repeat(80));
  lines.push(`  Before: ${before.apiCalls.totalCalls} total calls (${before.apiCalls.duplicateCalls} duplicates)`);
  lines.push(`  After:  ${after.apiCalls.totalCalls} total calls (${after.apiCalls.duplicateCalls} duplicates)`);
  lines.push(`  Reduction: ${improvements.apiCallReduction} calls (${improvements.apiCallReductionPercent.toFixed(1)}%)`);
  lines.push('');
  lines.push(`  Cache Hit Rate:`);
  lines.push(`    Before: ${((before.apiCalls.cacheHits / before.apiCalls.totalCalls) * 100).toFixed(1)}%`);
  lines.push(`    After:  ${((after.apiCalls.cacheHits / after.apiCalls.totalCalls) * 100).toFixed(1)}%`);
  lines.push(`    Improvement: ${improvements.cacheHitRateImprovement.toFixed(1)}%`);
  lines.push('');
  
  // Rendering Metrics
  lines.push('RENDERING PERFORMANCE:');
  lines.push('-'.repeat(80));
  lines.push(`  Before: ${before.rendering.componentRenderCount} renders, avg ${before.rendering.averageRenderTime.toFixed(2)}ms`);
  lines.push(`  After:  ${after.rendering.componentRenderCount} renders, avg ${after.rendering.averageRenderTime.toFixed(2)}ms`);
  lines.push(`  Improvement: ${improvements.renderTimeImprovement.toFixed(2)}ms (${improvements.renderTimeImprovementPercent.toFixed(1)}%)`);
  lines.push('');
  
  // Memory Metrics
  lines.push('MEMORY USAGE:');
  lines.push('-'.repeat(80));
  lines.push(`  Before: ${before.memory.initialMemory.toFixed(2)}MB → ${before.memory.finalMemory.toFixed(2)}MB (Δ ${before.memory.memoryDelta.toFixed(2)}MB)`);
  lines.push(`  After:  ${after.memory.initialMemory.toFixed(2)}MB → ${after.memory.finalMemory.toFixed(2)}MB (Δ ${after.memory.memoryDelta.toFixed(2)}MB)`);
  lines.push(`  Reduction: ${improvements.memoryReduction.toFixed(2)}MB (${improvements.memoryReductionPercent.toFixed(1)}%)`);
  lines.push('');
  
  // Recommendations
  if (recommendations.length > 0) {
    lines.push('RECOMMENDATIONS:');
    lines.push('-'.repeat(80));
    recommendations.forEach((rec, index) => {
      lines.push(`  ${index + 1}. ${rec}`);
    });
    lines.push('');
  }
  
  lines.push('='.repeat(80));
  
  return lines.join('\n');
}

/**
 * Export results to JSON for documentation
 */
export function exportResultsToJson(comparison: MigrationComparison): string {
  return JSON.stringify(comparison, (key, value) => {
    // Convert Sets and Maps to arrays for JSON serialization
    if (value instanceof Set) {
      return Array.from(value);
    }
    if (value instanceof Map) {
      return Object.fromEntries(value);
    }
    return value;
  }, 2);
}

// ============================================================================
// GLOBAL BENCHMARK INSTANCE
// ============================================================================

export const migrationBenchmark = new MigrationPerformanceBenchmark();

/**
 * Convenience function to start benchmarking
 */
export function startBenchmark(): void {
  migrationBenchmark.start();
}

/**
 * Convenience function to stop benchmarking and get results
 */
export function stopBenchmark(): BenchmarkResults {
  return migrationBenchmark.stop();
}

/**
 * Record API call for benchmarking
 */
export function recordApiCall(endpoint: string, duration: number, cached: boolean = false): void {
  migrationBenchmark.recordApiCall(endpoint, duration, cached);
}

/**
 * Record component render for benchmarking
 */
export function recordRender(component: string, duration: number): void {
  migrationBenchmark.recordRender(component, duration);
}
