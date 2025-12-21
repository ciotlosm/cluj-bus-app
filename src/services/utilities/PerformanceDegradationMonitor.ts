/**
 * Performance Degradation Monitor
 * Monitors application performance to detect degradation during refactoring
 * Validates Requirements: 7.5, 8.4
 */

import { performanceMonitor } from '../../utils/performance/performance';
import { logger } from '../../utils/shared/logger';
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Performance baseline for comparison
 */
export interface PerformanceBaseline {
  /** Timestamp when baseline was created */
  timestamp: Date;
  
  /** Bundle size metrics */
  bundleMetrics: BundleMetrics;
  
  /** Runtime performance metrics */
  runtimeMetrics: RuntimeMetrics;
  
  /** Memory usage metrics */
  memoryMetrics: MemoryMetrics;
  
  /** Build performance metrics */
  buildMetrics: BuildMetrics;
  
  /** Test execution metrics */
  testMetrics: TestMetrics;
}

/**
 * Bundle size and composition metrics
 */
export interface BundleMetrics {
  /** Total bundle size in bytes */
  totalSize: number;
  
  /** Individual chunk sizes */
  chunkSizes: Record<string, number>;
  
  /** Gzipped bundle size */
  gzippedSize: number;
  
  /** Number of chunks */
  chunkCount: number;
  
  /** Vendor bundle size */
  vendorSize: number;
  
  /** Application code size */
  appSize: number;
}

/**
 * Runtime performance metrics
 */
export interface RuntimeMetrics {
  /** Average component render time */
  avgRenderTime: number;
  
  /** API call response times */
  apiResponseTimes: Record<string, number>;
  
  /** Store operation times */
  storeOperationTimes: Record<string, number>;
  
  /** Page load time */
  pageLoadTime: number;
  
  /** Time to interactive */
  timeToInteractive: number;
}

/**
 * Memory usage metrics
 */
export interface MemoryMetrics {
  /** Heap size used */
  heapUsed: number;
  
  /** Heap size total */
  heapTotal: number;
  
  /** External memory */
  external: number;
  
  /** Array buffers */
  arrayBuffers: number;
}

/**
 * Build performance metrics
 */
export interface BuildMetrics {
  /** Total build time */
  buildTime: number;
  
  /** TypeScript compilation time */
  tscTime: number;
  
  /** Bundling time */
  bundlingTime: number;
  
  /** Asset optimization time */
  optimizationTime: number;
}

/**
 * Test execution metrics
 */
export interface TestMetrics {
  /** Total test execution time */
  totalTime: number;
  
  /** Average test time */
  avgTestTime: number;
  
  /** Slowest test time */
  slowestTestTime: number;
  
  /** Number of tests */
  testCount: number;
}

/**
 * Performance degradation analysis result
 */
export interface PerformanceDegradationAnalysis {
  /** Whether degradation was detected */
  degradationDetected: boolean;
  
  /** Degraded metrics */
  degradedMetrics: DegradedMetric[];
  
  /** Overall performance impact */
  overallImpact: 'positive' | 'neutral' | 'negative' | 'severe';
  
  /** Performance score (0-100) */
  performanceScore: number;
  
  /** Recommendations for improvement */
  recommendations: string[];
  
  /** Analysis timestamp */
  timestamp: Date;
}

/**
 * Individual degraded metric
 */
export interface DegradedMetric {
  /** Metric name */
  name: string;
  
  /** Metric category */
  category: 'bundle' | 'runtime' | 'memory' | 'build' | 'test';
  
  /** Baseline value */
  baseline: number;
  
  /** Current value */
  current: number;
  
  /** Percentage change */
  percentageChange: number;
  
  /** Severity of degradation */
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  
  /** Impact description */
  impact: string;
}

/**
 * Performance degradation thresholds
 */
export interface PerformanceThresholds {
  /** Bundle size increase threshold (%) */
  bundleSizeThreshold: number;
  
  /** Runtime performance degradation threshold (%) */
  runtimeThreshold: number;
  
  /** Memory usage increase threshold (%) */
  memoryThreshold: number;
  
  /** Build time increase threshold (%) */
  buildTimeThreshold: number;
  
  /** Test execution time increase threshold (%) */
  testTimeThreshold: number;
}

/**
 * Main performance degradation monitoring system
 */
export class PerformanceDegradationMonitor {
  private readonly projectRoot: string;
  private baseline: PerformanceBaseline | null = null;
  private readonly thresholds: PerformanceThresholds;

  constructor(
    projectRoot: string = process.cwd(),
    thresholds: Partial<PerformanceThresholds> = {}
  ) {
    this.projectRoot = projectRoot;
    this.thresholds = {
      bundleSizeThreshold: 10, // 10% increase
      runtimeThreshold: 15, // 15% slower
      memoryThreshold: 20, // 20% more memory
      buildTimeThreshold: 25, // 25% longer build
      testTimeThreshold: 30, // 30% longer tests
      ...thresholds
    };
  }

  /**
   * Creates a performance baseline for future comparisons
   * Validates Requirements: 8.4
   */
  async createBaseline(): Promise<PerformanceBaseline> {
    const startTime = performance.now();
    
    logger.info('Creating performance baseline...');
    
    try {
      const baseline: PerformanceBaseline = {
        timestamp: new Date(),
        bundleMetrics: await this.measureBundleMetrics(),
        runtimeMetrics: await this.measureRuntimeMetrics(),
        memoryMetrics: this.measureMemoryMetrics(),
        buildMetrics: await this.measureBuildMetrics(),
        testMetrics: await this.measureTestMetrics()
      };
      
      this.baseline = baseline;
      
      const duration = performance.now() - startTime;
      performanceMonitor.recordTiming('performance_monitoring.baseline_creation', duration);
      
      logger.info('Performance baseline created', {
        bundleSize: baseline.bundleMetrics.totalSize,
        avgRenderTime: baseline.runtimeMetrics.avgRenderTime,
        buildTime: baseline.buildMetrics.buildTime,
        duration
      });
      
      return baseline;
    } catch (error) {
      logger.error('Failed to create performance baseline', { error });
      throw new Error(`Baseline creation failed: ${error}`);
    }
  }

  /**
   * Analyzes current performance against baseline to detect degradation
   * Validates Requirements: 7.5, 8.4
   */
  async analyzePerformanceDegradation(): Promise<PerformanceDegradationAnalysis> {
    if (!this.baseline) {
      throw new Error('No performance baseline available. Create baseline first.');
    }
    
    const startTime = performance.now();
    
    logger.info('Analyzing performance degradation...');
    
    try {
      // Measure current performance
      const current: PerformanceBaseline = {
        timestamp: new Date(),
        bundleMetrics: await this.measureBundleMetrics(),
        runtimeMetrics: await this.measureRuntimeMetrics(),
        memoryMetrics: this.measureMemoryMetrics(),
        buildMetrics: await this.measureBuildMetrics(),
        testMetrics: await this.measureTestMetrics()
      };
      
      // Compare metrics
      const degradedMetrics: DegradedMetric[] = [];
      
      // Analyze bundle metrics
      degradedMetrics.push(...this.analyzeBundleMetrics(this.baseline.bundleMetrics, current.bundleMetrics));
      
      // Analyze runtime metrics
      degradedMetrics.push(...this.analyzeRuntimeMetrics(this.baseline.runtimeMetrics, current.runtimeMetrics));
      
      // Analyze memory metrics
      degradedMetrics.push(...this.analyzeMemoryMetrics(this.baseline.memoryMetrics, current.memoryMetrics));
      
      // Analyze build metrics
      degradedMetrics.push(...this.analyzeBuildMetrics(this.baseline.buildMetrics, current.buildMetrics));
      
      // Analyze test metrics
      degradedMetrics.push(...this.analyzeTestMetrics(this.baseline.testMetrics, current.testMetrics));
      
      // Determine overall impact
      const overallImpact = this.determineOverallImpact(degradedMetrics);
      
      // Calculate performance score
      const performanceScore = this.calculatePerformanceScore(degradedMetrics);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(degradedMetrics);
      
      const analysis: PerformanceDegradationAnalysis = {
        degradationDetected: degradedMetrics.length > 0,
        degradedMetrics,
        overallImpact,
        performanceScore,
        recommendations,
        timestamp: new Date()
      };
      
      const duration = performance.now() - startTime;
      performanceMonitor.recordTiming('performance_monitoring.degradation_analysis', duration);
      
      logger.info('Performance degradation analysis completed', {
        degradationDetected: analysis.degradationDetected,
        degradedMetricCount: degradedMetrics.length,
        overallImpact,
        performanceScore,
        duration
      });
      
      return analysis;
    } catch (error) {
      logger.error('Failed to analyze performance degradation', { error });
      throw new Error(`Performance analysis failed: ${error}`);
    }
  }

  /**
   * Monitors performance continuously during refactoring operations
   * Validates Requirements: 7.5, 8.4
   */
  async monitorPerformanceDuringRefactoring(
    operation: () => Promise<void>,
    operationName: string
  ): Promise<PerformanceDegradationAnalysis> {
    logger.info(`Starting performance monitoring for: ${operationName}`);
    
    // Create baseline if not exists
    if (!this.baseline) {
      await this.createBaseline();
    }
    
    // Execute operation
    const operationStartTime = performance.now();
    await operation();
    const operationDuration = performance.now() - operationStartTime;
    
    performanceMonitor.recordTiming(`refactoring_operation.${operationName}`, operationDuration);
    
    // Analyze performance after operation
    const analysis = await this.analyzePerformanceDegradation();
    
    logger.info(`Performance monitoring completed for: ${operationName}`, {
      operationDuration,
      degradationDetected: analysis.degradationDetected,
      performanceScore: analysis.performanceScore
    });
    
    return analysis;
  }

  /**
   * Clears the performance baseline
   */
  clearBaseline(): void {
    this.baseline = null;
    logger.info('Performance baseline cleared');
  }

  /**
   * Gets the current performance baseline
   */
  getBaseline(): PerformanceBaseline | null {
    return this.baseline;
  }

  // Private measurement methods

  private async measureBundleMetrics(): Promise<BundleMetrics> {
    try {
      const distPath = join(this.projectRoot, 'dist');
      
      // Try to build if dist doesn't exist
      try {
        await fs.access(distPath);
      } catch {
        // Build the project
        execSync('npm run build', { cwd: this.projectRoot, stdio: 'pipe' });
      }
      
      const files = await fs.readdir(distPath);
      let totalSize = 0;
      const chunkSizes: Record<string, number> = {};
      let vendorSize = 0;
      let appSize = 0;
      
      for (const file of files) {
        try {
          const stats = await fs.stat(join(distPath, file));
          const size = stats.size;
          totalSize += size;
          chunkSizes[file] = size;
          
          if (file.includes('vendor') || file.includes('node_modules')) {
            vendorSize += size;
          } else if (file.endsWith('.js') || file.endsWith('.ts')) {
            appSize += size;
          }
        } catch (error) {
          // File might not be accessible
        }
      }
      
      return {
        totalSize,
        chunkSizes,
        gzippedSize: totalSize * 0.3, // Estimate gzipped size
        chunkCount: files.filter(f => f.endsWith('.js')).length,
        vendorSize,
        appSize
      };
    } catch (error) {
      logger.warn('Failed to measure bundle metrics', { error });
      return {
        totalSize: 0,
        chunkSizes: {},
        gzippedSize: 0,
        chunkCount: 0,
        vendorSize: 0,
        appSize: 0
      };
    }
  }

  private async measureRuntimeMetrics(): Promise<RuntimeMetrics> {
    const summary = performanceMonitor.getSummary();
    
    // Extract relevant metrics from performance monitor
    const renderMetrics = Object.entries(summary)
      .filter(([name]) => name.includes('render'))
      .map(([, stats]) => stats.avg);
    
    const apiMetrics = Object.entries(summary)
      .filter(([name]) => name.includes('api'))
      .reduce((acc, [name, stats]) => {
        acc[name] = stats.avg;
        return acc;
      }, {} as Record<string, number>);
    
    const storeMetrics = Object.entries(summary)
      .filter(([name]) => name.includes('store'))
      .reduce((acc, [name, stats]) => {
        acc[name] = stats.avg;
        return acc;
      }, {} as Record<string, number>);
    
    return {
      avgRenderTime: renderMetrics.length > 0 ? renderMetrics.reduce((sum, val) => sum + val, 0) / renderMetrics.length : 0,
      apiResponseTimes: apiMetrics,
      storeOperationTimes: storeMetrics,
      pageLoadTime: summary['page_load']?.avg || 0,
      timeToInteractive: summary['time_to_interactive']?.avg || 0
    };
  }

  private measureMemoryMetrics(): MemoryMetrics {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      return {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers || 0
      };
    }
    
    return {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0
    };
  }

  private async measureBuildMetrics(): Promise<BuildMetrics> {
    try {
      const startTime = performance.now();
      
      // Measure TypeScript compilation
      const tscStartTime = performance.now();
      execSync('npx tsc --noEmit', { cwd: this.projectRoot, stdio: 'pipe' });
      const tscTime = performance.now() - tscStartTime;
      
      // Measure full build
      const buildStartTime = performance.now();
      execSync('npm run build', { cwd: this.projectRoot, stdio: 'pipe' });
      const buildTime = performance.now() - buildStartTime;
      
      return {
        buildTime,
        tscTime,
        bundlingTime: buildTime - tscTime,
        optimizationTime: buildTime * 0.2 // Estimate
      };
    } catch (error) {
      logger.warn('Failed to measure build metrics', { error });
      return {
        buildTime: 0,
        tscTime: 0,
        bundlingTime: 0,
        optimizationTime: 0
      };
    }
  }

  private async measureTestMetrics(): Promise<TestMetrics> {
    try {
      const startTime = performance.now();
      
      // Run tests and capture output
      const output = execSync('npm test', { 
        cwd: this.projectRoot, 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const totalTime = performance.now() - startTime;
      
      // Parse test output for metrics
      const testCount = this.parseTestCount(output);
      const avgTestTime = testCount > 0 ? totalTime / testCount : 0;
      
      return {
        totalTime,
        avgTestTime,
        slowestTestTime: avgTestTime * 2, // Estimate
        testCount
      };
    } catch (error) {
      logger.warn('Failed to measure test metrics', { error });
      return {
        totalTime: 0,
        avgTestTime: 0,
        slowestTestTime: 0,
        testCount: 0
      };
    }
  }

  // Private analysis methods

  private analyzeBundleMetrics(baseline: BundleMetrics, current: BundleMetrics): DegradedMetric[] {
    const metrics: DegradedMetric[] = [];
    
    const sizeChange = this.calculatePercentageChange(baseline.totalSize, current.totalSize);
    if (sizeChange > this.thresholds.bundleSizeThreshold) {
      metrics.push({
        name: 'Bundle Size',
        category: 'bundle',
        baseline: baseline.totalSize,
        current: current.totalSize,
        percentageChange: sizeChange,
        severity: this.determineSeverity(sizeChange, this.thresholds.bundleSizeThreshold),
        impact: `Bundle size increased by ${sizeChange.toFixed(1)}%`
      });
    }
    
    return metrics;
  }

  private analyzeRuntimeMetrics(baseline: RuntimeMetrics, current: RuntimeMetrics): DegradedMetric[] {
    const metrics: DegradedMetric[] = [];
    
    const renderTimeChange = this.calculatePercentageChange(baseline.avgRenderTime, current.avgRenderTime);
    if (renderTimeChange > this.thresholds.runtimeThreshold) {
      metrics.push({
        name: 'Average Render Time',
        category: 'runtime',
        baseline: baseline.avgRenderTime,
        current: current.avgRenderTime,
        percentageChange: renderTimeChange,
        severity: this.determineSeverity(renderTimeChange, this.thresholds.runtimeThreshold),
        impact: `Component rendering is ${renderTimeChange.toFixed(1)}% slower`
      });
    }
    
    return metrics;
  }

  private analyzeMemoryMetrics(baseline: MemoryMetrics, current: MemoryMetrics): DegradedMetric[] {
    const metrics: DegradedMetric[] = [];
    
    const heapChange = this.calculatePercentageChange(baseline.heapUsed, current.heapUsed);
    if (heapChange > this.thresholds.memoryThreshold) {
      metrics.push({
        name: 'Heap Memory Usage',
        category: 'memory',
        baseline: baseline.heapUsed,
        current: current.heapUsed,
        percentageChange: heapChange,
        severity: this.determineSeverity(heapChange, this.thresholds.memoryThreshold),
        impact: `Memory usage increased by ${heapChange.toFixed(1)}%`
      });
    }
    
    return metrics;
  }

  private analyzeBuildMetrics(baseline: BuildMetrics, current: BuildMetrics): DegradedMetric[] {
    const metrics: DegradedMetric[] = [];
    
    const buildTimeChange = this.calculatePercentageChange(baseline.buildTime, current.buildTime);
    if (buildTimeChange > this.thresholds.buildTimeThreshold) {
      metrics.push({
        name: 'Build Time',
        category: 'build',
        baseline: baseline.buildTime,
        current: current.buildTime,
        percentageChange: buildTimeChange,
        severity: this.determineSeverity(buildTimeChange, this.thresholds.buildTimeThreshold),
        impact: `Build time increased by ${buildTimeChange.toFixed(1)}%`
      });
    }
    
    return metrics;
  }

  private analyzeTestMetrics(baseline: TestMetrics, current: TestMetrics): DegradedMetric[] {
    const metrics: DegradedMetric[] = [];
    
    const testTimeChange = this.calculatePercentageChange(baseline.totalTime, current.totalTime);
    if (testTimeChange > this.thresholds.testTimeThreshold) {
      metrics.push({
        name: 'Test Execution Time',
        category: 'test',
        baseline: baseline.totalTime,
        current: current.totalTime,
        percentageChange: testTimeChange,
        severity: this.determineSeverity(testTimeChange, this.thresholds.testTimeThreshold),
        impact: `Test execution is ${testTimeChange.toFixed(1)}% slower`
      });
    }
    
    return metrics;
  }

  private calculatePercentageChange(baseline: number, current: number): number {
    if (baseline === 0) return current > 0 ? 100 : 0;
    return ((current - baseline) / baseline) * 100;
  }

  private determineSeverity(change: number, threshold: number): 'minor' | 'moderate' | 'major' | 'critical' {
    if (change < threshold * 1.5) return 'minor';
    if (change < threshold * 2) return 'moderate';
    if (change < threshold * 3) return 'major';
    return 'critical';
  }

  private determineOverallImpact(metrics: DegradedMetric[]): 'positive' | 'neutral' | 'negative' | 'severe' {
    if (metrics.length === 0) return 'neutral';
    
    const criticalCount = metrics.filter(m => m.severity === 'critical').length;
    const majorCount = metrics.filter(m => m.severity === 'major').length;
    
    if (criticalCount > 0) return 'severe';
    if (majorCount > 1) return 'severe';
    if (majorCount > 0 || metrics.length > 3) return 'negative';
    
    return 'negative';
  }

  private calculatePerformanceScore(metrics: DegradedMetric[]): number {
    if (metrics.length === 0) return 100;
    
    let score = 100;
    
    for (const metric of metrics) {
      switch (metric.severity) {
        case 'minor':
          score -= 5;
          break;
        case 'moderate':
          score -= 10;
          break;
        case 'major':
          score -= 20;
          break;
        case 'critical':
          score -= 30;
          break;
      }
    }
    
    return Math.max(0, score);
  }

  private generateRecommendations(metrics: DegradedMetric[]): string[] {
    const recommendations: string[] = [];
    
    const bundleMetrics = metrics.filter(m => m.category === 'bundle');
    const runtimeMetrics = metrics.filter(m => m.category === 'runtime');
    const memoryMetrics = metrics.filter(m => m.category === 'memory');
    const buildMetrics = metrics.filter(m => m.category === 'build');
    const testMetrics = metrics.filter(m => m.category === 'test');
    
    if (bundleMetrics.length > 0) {
      recommendations.push('Consider code splitting and tree shaking to reduce bundle size');
    }
    
    if (runtimeMetrics.length > 0) {
      recommendations.push('Review component rendering performance and consider memoization');
    }
    
    if (memoryMetrics.length > 0) {
      recommendations.push('Check for memory leaks and optimize data structures');
    }
    
    if (buildMetrics.length > 0) {
      recommendations.push('Optimize build configuration and consider incremental compilation');
    }
    
    if (testMetrics.length > 0) {
      recommendations.push('Review test performance and consider parallel execution');
    }
    
    return recommendations;
  }

  private parseTestCount(output: string): number {
    // Parse test count from output
    const match = output.match(/(\d+)\s+(?:tests?|specs?)/i);
    return match ? parseInt(match[1], 10) : 0;
  }
}

/**
 * Default export for easy importing
 */
export default PerformanceDegradationMonitor;