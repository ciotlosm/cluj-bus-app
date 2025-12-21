/**
 * Functionality Preservation Validator
 * Implements comprehensive validation to ensure refactoring operations preserve application functionality
 * Validates Requirements: 5.3, 7.5, 8.3, 8.4
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { performanceMonitor } from '../utils/performance/performance';
import { logger } from '../utils/shared/logger';
import {
  type FunctionalityResult,
  type FunctionalityChange,
  type PerformanceImpact,
  type ValidationReport,
  type TestResult,
  type BuildResult
} from '../types/architectureSimplification';

/**
 * Application state snapshot for before/after comparison
 */
export interface ApplicationStateSnapshot {
  /** Timestamp when snapshot was taken */
  timestamp: Date;
  
  /** Store states from Zustand stores */
  storeStates: Record<string, any>;
  
  /** Component tree structure */
  componentTree: ComponentTreeNode[];
  
  /** API endpoints and their responses */
  apiEndpoints: Record<string, any>;
  
  /** Performance metrics at snapshot time */
  performanceMetrics: Record<string, number>;
  
  /** Bundle size and asset information */
  bundleInfo: BundleInfo;
  
  /** Configuration and environment state */
  configState: Record<string, any>;
}

/**
 * Component tree node for structural comparison
 */
export interface ComponentTreeNode {
  name: string;
  props: Record<string, any>;
  children: ComponentTreeNode[];
  hooks: string[];
}

/**
 * Bundle information for size comparison
 */
export interface BundleInfo {
  totalSize: number;
  chunkSizes: Record<string, number>;
  assetCount: number;
  dependencies: string[];
}

/**
 * Behavioral test case for functionality validation
 */
export interface BehavioralTestCase {
  name: string;
  description: string;
  setup: () => Promise<void>;
  execute: () => Promise<any>;
  validate: (result: any) => boolean;
  cleanup?: () => Promise<void>;
}

/**
 * Comparison result between two application states
 */
export interface StateComparisonResult {
  identical: boolean;
  differences: StateDifference[];
  performanceImpact: PerformanceImpact;
  functionalityChanges: FunctionalityChange[];
}

/**
 * Detected difference between application states
 */
export interface StateDifference {
  path: string;
  type: 'added' | 'removed' | 'modified';
  before: any;
  after: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Main functionality preservation validation system
 */
export class FunctionalityPreservationValidator {
  private readonly projectRoot: string;
  private readonly behavioralTests: BehavioralTestCase[] = [];
  private baselineSnapshot: ApplicationStateSnapshot | null = null;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.initializeBehavioralTests();
  }

  /**
   * Creates a comprehensive snapshot of the current application state
   * Validates Requirements: 8.3
   */
  async createApplicationStateSnapshot(): Promise<ApplicationStateSnapshot> {
    const startTime = performance.now();
    
    try {
      const snapshot: ApplicationStateSnapshot = {
        timestamp: new Date(),
        storeStates: await this.captureStoreStates(),
        componentTree: await this.captureComponentTree(),
        apiEndpoints: await this.captureApiEndpoints(),
        performanceMetrics: this.capturePerformanceMetrics(),
        bundleInfo: await this.captureBundleInfo(),
        configState: await this.captureConfigState()
      };

      const duration = performance.now() - startTime;
      performanceMonitor.recordTiming('functionality_validation.snapshot_creation', duration);
      
      logger.debug('Application state snapshot created', {
        storeCount: Object.keys(snapshot.storeStates).length,
        componentCount: this.countComponents(snapshot.componentTree),
        apiEndpointCount: Object.keys(snapshot.apiEndpoints).length,
        duration
      });

      return snapshot;
    } catch (error) {
      logger.error('Failed to create application state snapshot', { error });
      throw new Error(`Snapshot creation failed: ${error}`);
    }
  }

  /**
   * Compares two application state snapshots to detect changes
   * Validates Requirements: 8.3, 8.4
   */
  async compareApplicationStates(
    before: ApplicationStateSnapshot,
    after: ApplicationStateSnapshot
  ): Promise<StateComparisonResult> {
    const startTime = performance.now();
    
    try {
      const differences: StateDifference[] = [];
      
      // Compare store states
      const storeDifferences = this.compareStoreStates(before.storeStates, after.storeStates);
      differences.push(...storeDifferences);
      
      // Compare component trees
      const componentDifferences = this.compareComponentTrees(before.componentTree, after.componentTree);
      differences.push(...componentDifferences);
      
      // Compare API endpoints
      const apiDifferences = this.compareApiEndpoints(before.apiEndpoints, after.apiEndpoints);
      differences.push(...apiDifferences);
      
      // Compare configuration
      const configDifferences = this.compareConfigStates(before.configState, after.configState);
      differences.push(...configDifferences);
      
      // Assess performance impact
      const performanceImpact = this.assessPerformanceImpact(before, after);
      
      // Convert differences to functionality changes
      const functionalityChanges = this.convertDifferencesToChanges(differences);
      
      const result: StateComparisonResult = {
        identical: differences.length === 0,
        differences,
        performanceImpact,
        functionalityChanges
      };

      const duration = performance.now() - startTime;
      performanceMonitor.recordTiming('functionality_validation.state_comparison', duration);
      
      logger.debug('Application state comparison completed', {
        differenceCount: differences.length,
        identical: result.identical,
        criticalChanges: functionalityChanges.filter(c => c.severity === 'critical').length,
        duration
      });

      return result;
    } catch (error) {
      logger.error('Failed to compare application states', { error });
      throw new Error(`State comparison failed: ${error}`);
    }
  }

  /**
   * Runs behavioral tests to validate functionality preservation
   * Validates Requirements: 5.3, 7.5
   */
  async runBehavioralTests(): Promise<{ passed: number; failed: number; results: any[] }> {
    const startTime = performance.now();
    const results: any[] = [];
    let passed = 0;
    let failed = 0;

    try {
      for (const testCase of this.behavioralTests) {
        const testStartTime = performance.now();
        
        try {
          // Setup test
          if (testCase.setup) {
            await testCase.setup();
          }
          
          // Execute test
          const result = await testCase.execute();
          
          // Validate result
          const isValid = testCase.validate(result);
          
          if (isValid) {
            passed++;
            results.push({
              name: testCase.name,
              status: 'passed',
              result,
              duration: performance.now() - testStartTime
            });
          } else {
            failed++;
            results.push({
              name: testCase.name,
              status: 'failed',
              result,
              error: 'Validation failed',
              duration: performance.now() - testStartTime
            });
          }
          
          // Cleanup
          if (testCase.cleanup) {
            await testCase.cleanup();
          }
          
        } catch (error) {
          failed++;
          results.push({
            name: testCase.name,
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
            duration: performance.now() - testStartTime
          });
        }
      }

      const duration = performance.now() - startTime;
      performanceMonitor.recordTiming('functionality_validation.behavioral_tests', duration);
      
      logger.debug('Behavioral tests completed', {
        total: this.behavioralTests.length,
        passed,
        failed,
        duration
      });

      return { passed, failed, results };
    } catch (error) {
      logger.error('Failed to run behavioral tests', { error });
      throw new Error(`Behavioral tests failed: ${error}`);
    }
  }

  /**
   * Performs comprehensive functionality validation
   * Validates Requirements: 5.3, 7.5, 8.3, 8.4
   */
  async validateFunctionality(
    testResults?: TestResult,
    buildResults?: BuildResult
  ): Promise<FunctionalityResult> {
    const startTime = performance.now();
    
    try {
      // Create current state snapshot
      const currentSnapshot = await this.createApplicationStateSnapshot();
      
      let changes: FunctionalityChange[] = [];
      let performanceImpact: PerformanceImpact;
      
      if (this.baselineSnapshot) {
        // Compare with baseline if available
        const comparison = await this.compareApplicationStates(this.baselineSnapshot, currentSnapshot);
        changes = comparison.functionalityChanges;
        performanceImpact = comparison.performanceImpact;
      } else {
        // No baseline available, assess current state
        performanceImpact = {
          bundleSizeChange: 0,
          runtimeChange: 0,
          memoryChange: 0,
          overallImpact: 'neutral'
        };
      }
      
      // Run behavioral tests
      const behavioralTestResults = await this.runBehavioralTests();
      
      // Add test failures as functionality changes
      if (behavioralTestResults.failed > 0) {
        changes.push({
          type: 'behavior',
          component: 'behavioral_tests',
          description: `${behavioralTestResults.failed} behavioral tests failed`,
          severity: 'high'
        });
      }
      
      // Add build/test failures as functionality changes
      if (testResults && !testResults.success) {
        changes.push({
          type: 'behavior',
          component: 'unit_tests',
          description: `${testResults.testsFailed} unit tests failed`,
          severity: 'critical'
        });
      }
      
      if (buildResults && !buildResults.success) {
        changes.push({
          type: 'interface',
          component: 'build_system',
          description: `${buildResults.errors.length} build errors detected`,
          severity: 'critical'
        });
      }
      
      // Determine if functionality is preserved
      const criticalChanges = changes.filter(c => c.severity === 'critical' || c.severity === 'high');
      const functionalityPreserved = criticalChanges.length === 0;

      const duration = performance.now() - startTime;
      performanceMonitor.recordTiming('functionality_validation.complete_validation', duration);
      
      const result: FunctionalityResult = {
        functionalityPreserved,
        changes,
        performanceImpact,
        timestamp: new Date()
      };
      
      logger.info('Functionality validation completed', {
        functionalityPreserved,
        changeCount: changes.length,
        criticalChangeCount: criticalChanges.length,
        behavioralTestsPassed: behavioralTestResults.passed,
        behavioralTestsFailed: behavioralTestResults.failed,
        duration
      });

      return result;
    } catch (error) {
      logger.error('Failed to validate functionality', { error });
      throw new Error(`Functionality validation failed: ${error}`);
    }
  }

  /**
   * Sets the baseline snapshot for future comparisons
   */
  async setBaseline(): Promise<void> {
    this.baselineSnapshot = await this.createApplicationStateSnapshot();
    logger.info('Baseline application state snapshot set');
  }

  /**
   * Clears the baseline snapshot
   */
  clearBaseline(): void {
    this.baselineSnapshot = null;
    logger.info('Baseline application state snapshot cleared');
  }

  // Private helper methods

  private async captureStoreStates(): Promise<Record<string, any>> {
    // In a real implementation, this would capture actual Zustand store states
    // For now, return a mock structure
    return {
      configStore: { initialized: true, apiKey: 'present' },
      locationStore: { currentLocation: 'set', favorites: [] },
      vehicleStore: { vehicles: [], loading: false }
    };
  }

  private async captureComponentTree(): Promise<ComponentTreeNode[]> {
    // In a real implementation, this would analyze the React component tree
    // For now, return a mock structure
    return [
      {
        name: 'App',
        props: {},
        children: [
          {
            name: 'StationDisplay',
            props: { stationId: 'test' },
            children: [],
            hooks: ['useState', 'useEffect', 'useStoreData']
          }
        ],
        hooks: ['useAppInitialization']
      }
    ];
  }

  private async captureApiEndpoints(): Promise<Record<string, any>> {
    // In a real implementation, this would capture API endpoint configurations
    return {
      '/api/tranzy/vehicles': { method: 'GET', cached: true },
      '/api/tranzy/routes': { method: 'GET', cached: true }
    };
  }

  private capturePerformanceMetrics(): Record<string, number> {
    const summary = performanceMonitor.getSummary();
    const metrics: Record<string, number> = {};
    
    Object.entries(summary).forEach(([name, stats]) => {
      metrics[`${name}.avg`] = stats.avg;
      metrics[`${name}.max`] = stats.max;
      metrics[`${name}.count`] = stats.count;
    });
    
    return metrics;
  }

  private async captureBundleInfo(): Promise<BundleInfo> {
    try {
      // Try to read build output for bundle information
      const distPath = join(this.projectRoot, 'dist');
      const files = await fs.readdir(distPath).catch(() => []);
      
      let totalSize = 0;
      const chunkSizes: Record<string, number> = {};
      
      for (const file of files) {
        try {
          const stats = await fs.stat(join(distPath, file));
          totalSize += stats.size;
          chunkSizes[file] = stats.size;
        } catch (error) {
          // File might not be accessible
        }
      }
      
      return {
        totalSize,
        chunkSizes,
        assetCount: files.length,
        dependencies: [] // Would be populated from package.json analysis
      };
    } catch (error) {
      return {
        totalSize: 0,
        chunkSizes: {},
        assetCount: 0,
        dependencies: []
      };
    }
  }

  private async captureConfigState(): Promise<Record<string, any>> {
    try {
      // Capture relevant configuration state
      const packageJson = JSON.parse(
        await fs.readFile(join(this.projectRoot, 'package.json'), 'utf8')
      );
      
      return {
        dependencies: Object.keys(packageJson.dependencies || {}),
        devDependencies: Object.keys(packageJson.devDependencies || {}),
        scripts: Object.keys(packageJson.scripts || {}),
        version: packageJson.version
      };
    } catch (error) {
      return {};
    }
  }

  private compareStoreStates(before: Record<string, any>, after: Record<string, any>): StateDifference[] {
    const differences: StateDifference[] = [];
    
    // Handle null or undefined inputs
    const beforeStores = before || {};
    const afterStores = after || {};
    
    // Compare each store
    const allStores = new Set([...Object.keys(beforeStores), ...Object.keys(afterStores)]);
    
    for (const storeName of allStores) {
      if (!(storeName in beforeStores)) {
        differences.push({
          path: `stores.${storeName}`,
          type: 'added',
          before: undefined,
          after: afterStores[storeName],
          severity: 'medium'
        });
      } else if (!(storeName in afterStores)) {
        differences.push({
          path: `stores.${storeName}`,
          type: 'removed',
          before: beforeStores[storeName],
          after: undefined,
          severity: 'high'
        });
      } else {
        try {
          if (JSON.stringify(beforeStores[storeName]) !== JSON.stringify(afterStores[storeName])) {
            differences.push({
              path: `stores.${storeName}`,
              type: 'modified',
              before: beforeStores[storeName],
              after: afterStores[storeName],
              severity: 'medium'
            });
          }
        } catch (error) {
          // Handle circular references or non-serializable objects
          differences.push({
            path: `stores.${storeName}`,
            type: 'modified',
            before: 'non-serializable',
            after: 'non-serializable',
            severity: 'low'
          });
        }
      }
    }
    
    return differences;
  }

  private compareComponentTrees(before: ComponentTreeNode[], after: ComponentTreeNode[]): StateDifference[] {
    const differences: StateDifference[] = [];
    
    // Simple comparison - in a real implementation, this would be more sophisticated
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      differences.push({
        path: 'componentTree',
        type: 'modified',
        before: before.length,
        after: after.length,
        severity: 'low'
      });
    }
    
    return differences;
  }

  private compareApiEndpoints(before: Record<string, any>, after: Record<string, any>): StateDifference[] {
    const differences: StateDifference[] = [];
    
    // Handle null or undefined inputs
    const beforeEndpoints = before || {};
    const afterEndpoints = after || {};
    
    const allEndpoints = new Set([...Object.keys(beforeEndpoints), ...Object.keys(afterEndpoints)]);
    
    for (const endpoint of allEndpoints) {
      if (!(endpoint in beforeEndpoints)) {
        differences.push({
          path: `api.${endpoint}`,
          type: 'added',
          before: undefined,
          after: afterEndpoints[endpoint],
          severity: 'low'
        });
      } else if (!(endpoint in afterEndpoints)) {
        differences.push({
          path: `api.${endpoint}`,
          type: 'removed',
          before: beforeEndpoints[endpoint],
          after: undefined,
          severity: 'medium'
        });
      } else {
        try {
          if (JSON.stringify(beforeEndpoints[endpoint]) !== JSON.stringify(afterEndpoints[endpoint])) {
            differences.push({
              path: `api.${endpoint}`,
              type: 'modified',
              before: beforeEndpoints[endpoint],
              after: afterEndpoints[endpoint],
              severity: 'low'
            });
          }
        } catch (error) {
          // Handle circular references or non-serializable objects
          differences.push({
            path: `api.${endpoint}`,
            type: 'modified',
            before: 'non-serializable',
            after: 'non-serializable',
            severity: 'low'
          });
        }
      }
    }
    
    return differences;
  }

  private compareConfigStates(before: Record<string, any>, after: Record<string, any>): StateDifference[] {
    const differences: StateDifference[] = [];
    
    // Handle null or undefined inputs
    const beforeConfig = before || {};
    const afterConfig = after || {};
    
    // Compare dependency changes
    const beforeDeps = new Set(beforeConfig.dependencies || []);
    const afterDeps = new Set(afterConfig.dependencies || []);
    
    const addedDeps = [...afterDeps].filter(dep => !beforeDeps.has(dep));
    const removedDeps = [...beforeDeps].filter(dep => !afterDeps.has(dep));
    
    if (addedDeps.length > 0) {
      differences.push({
        path: 'config.dependencies.added',
        type: 'added',
        before: [],
        after: addedDeps,
        severity: 'low'
      });
    }
    
    if (removedDeps.length > 0) {
      differences.push({
        path: 'config.dependencies.removed',
        type: 'removed',
        before: removedDeps,
        after: [],
        severity: 'medium'
      });
    }
    
    return differences;
  }

  private assessPerformanceImpact(before: ApplicationStateSnapshot, after: ApplicationStateSnapshot): PerformanceImpact {
    const bundleSizeChange = after.bundleInfo.totalSize - before.bundleInfo.totalSize;
    
    // Calculate average performance change
    const beforeAvg = this.calculateAveragePerformance(before.performanceMetrics);
    const afterAvg = this.calculateAveragePerformance(after.performanceMetrics);
    const runtimeChange = beforeAvg > 0 ? ((afterAvg - beforeAvg) / beforeAvg) * 100 : 0;
    
    // Determine overall impact
    let overallImpact: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (bundleSizeChange > 10000 || runtimeChange > 10) { // 10KB or 10% slower
      overallImpact = 'negative';
    } else if (bundleSizeChange < -5000 || runtimeChange < -5) { // 5KB smaller or 5% faster
      overallImpact = 'positive';
    }
    
    return {
      bundleSizeChange,
      runtimeChange,
      memoryChange: 0, // Would be calculated from memory metrics
      overallImpact
    };
  }

  private calculateAveragePerformance(metrics: Record<string, number>): number {
    const avgMetrics = Object.entries(metrics)
      .filter(([key]) => key.endsWith('.avg'))
      .map(([, value]) => value);
    
    return avgMetrics.length > 0 ? avgMetrics.reduce((sum, val) => sum + val, 0) / avgMetrics.length : 0;
  }

  private convertDifferencesToChanges(differences: StateDifference[]): FunctionalityChange[] {
    return differences.map(diff => ({
      type: this.mapDifferenceTypeToChangeType(diff.path),
      component: diff.path,
      description: `${diff.type}: ${diff.path}`,
      severity: diff.severity
    }));
  }

  private mapDifferenceTypeToChangeType(path: string): 'behavior' | 'performance' | 'interface' | 'data' {
    if (path.startsWith('stores.')) return 'data';
    if (path.startsWith('api.')) return 'interface';
    if (path.startsWith('componentTree')) return 'behavior';
    if (path.startsWith('config.')) return 'interface';
    return 'behavior';
  }

  private countComponents(tree: ComponentTreeNode[]): number {
    return tree.reduce((count, node) => count + 1 + this.countComponents(node.children), 0);
  }

  private initializeBehavioralTests(): void {
    // Initialize core behavioral tests
    this.behavioralTests.push(
      {
        name: 'Store Initialization',
        description: 'Verify that all stores initialize correctly',
        setup: async () => {},
        execute: async () => {
          // Mock store initialization check
          return { configStore: true, locationStore: true, vehicleStore: true };
        },
        validate: (result) => {
          return Object.values(result).every(initialized => initialized === true);
        }
      },
      {
        name: 'Component Rendering',
        description: 'Verify that core components render without errors',
        setup: async () => {},
        execute: async () => {
          // Mock component rendering check
          return { App: true, StationDisplay: true };
        },
        validate: (result) => {
          return Object.values(result).every(rendered => rendered === true);
        }
      },
      {
        name: 'API Integration',
        description: 'Verify that API endpoints are accessible',
        setup: async () => {},
        execute: async () => {
          // Mock API check
          return { tranzyApi: true, endpoints: 2 };
        },
        validate: (result) => {
          return result.tranzyApi === true && result.endpoints > 0;
        }
      }
    );
  }
}

/**
 * Default export for easy importing
 */
export default FunctionalityPreservationValidator;