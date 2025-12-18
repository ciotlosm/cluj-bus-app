/**
 * Compatibility verification tools for hook migration
 * 
 * This module provides utilities to verify that the new hook system
 * maintains exact backward compatibility with the existing API.
 */

import React from 'react';
import { logger } from '../../utils/logger';
import type { 
  VehicleProcessingOptions, 
  VehicleProcessingResult 
} from '../useVehicleProcessingOrchestration';

/**
 * Deep comparison utility for complex objects
 */
function deepEqual(obj1: any, obj2: any, path: string = ''): { isEqual: boolean; differences: string[] } {
  const differences: string[] = [];

  if (obj1 === obj2) {
    return { isEqual: true, differences: [] };
  }

  if (obj1 == null || obj2 == null) {
    differences.push(`${path}: null/undefined mismatch - ${obj1} vs ${obj2}`);
    return { isEqual: false, differences };
  }

  if (typeof obj1 !== typeof obj2) {
    differences.push(`${path}: type mismatch - ${typeof obj1} vs ${typeof obj2}`);
    return { isEqual: false, differences };
  }

  if (obj1 instanceof Date && obj2 instanceof Date) {
    if (Math.abs(obj1.getTime() - obj2.getTime()) > 1000) { // Allow 1 second difference
      differences.push(`${path}: date difference > 1s - ${obj1.toISOString()} vs ${obj2.toISOString()}`);
      return { isEqual: false, differences };
    }
    return { isEqual: true, differences: [] };
  }

  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) {
      differences.push(`${path}: array length mismatch - ${obj1.length} vs ${obj2.length}`);
      return { isEqual: false, differences };
    }

    for (let i = 0; i < obj1.length; i++) {
      const result = deepEqual(obj1[i], obj2[i], `${path}[${i}]`);
      if (!result.isEqual) {
        differences.push(...result.differences);
      }
    }

    return { isEqual: differences.length === 0, differences };
  }

  if (typeof obj1 === 'object' && typeof obj2 === 'object') {
    const keys1 = Object.keys(obj1).sort();
    const keys2 = Object.keys(obj2).sort();

    // Check for missing/extra keys
    const missingInObj2 = keys1.filter(key => !keys2.includes(key));
    const extraInObj2 = keys2.filter(key => !keys1.includes(key));

    if (missingInObj2.length > 0) {
      differences.push(`${path}: missing keys in new result - ${missingInObj2.join(', ')}`);
    }
    if (extraInObj2.length > 0) {
      differences.push(`${path}: extra keys in new result - ${extraInObj2.join(', ')}`);
    }

    // Check common keys
    const commonKeys = keys1.filter(key => keys2.includes(key));
    for (const key of commonKeys) {
      const result = deepEqual(obj1[key], obj2[key], `${path}.${key}`);
      if (!result.isEqual) {
        differences.push(...result.differences);
      }
    }

    return { isEqual: differences.length === 0, differences };
  }

  // Primitive values
  if (obj1 !== obj2) {
    differences.push(`${path}: value mismatch - ${obj1} vs ${obj2}`);
    return { isEqual: false, differences };
  }

  return { isEqual: true, differences: [] };
}

/**
 * Compatibility test result
 */
interface CompatibilityTestResult {
  testName: string;
  passed: boolean;
  executionTime: {
    old: number;
    new: number;
    difference: number;
    percentageDifference: number;
  };
  differences: string[];
  errors: {
    old?: Error;
    new?: Error;
  };
  metadata: {
    timestamp: Date;
    options: VehicleProcessingOptions;
    resultSizes: {
      old: number;
      new: number;
    };
  };
}

/**
 * Compatibility verification suite
 */
export class CompatibilityVerifier {
  private testResults: CompatibilityTestResult[] = [];
  private isRunning: boolean = false;

  /**
   * Run a single compatibility test
   */
  async runSingleTest(
    testName: string,
    options: VehicleProcessingOptions,
    oldHook: (options: VehicleProcessingOptions) => VehicleProcessingResult,
    newHook: (options: VehicleProcessingOptions) => VehicleProcessingResult
  ): Promise<CompatibilityTestResult> {
    logger.info('Running compatibility test', { testName, options }, 'CompatibilityVerifier');

    const result: CompatibilityTestResult = {
      testName,
      passed: false,
      executionTime: {
        old: 0,
        new: 0,
        difference: 0,
        percentageDifference: 0
      },
      differences: [],
      errors: {},
      metadata: {
        timestamp: new Date(),
        options,
        resultSizes: { old: 0, new: 0 }
      }
    };

    // Test old hook
    let oldResult: VehicleProcessingResult | null = null;
    try {
      const startTime = performance.now();
      oldResult = oldHook(options);
      result.executionTime.old = performance.now() - startTime;
      result.metadata.resultSizes.old = JSON.stringify(oldResult).length;
    } catch (error) {
      result.errors.old = error as Error;
      logger.error('Old hook failed in compatibility test', {
        testName,
        error: (error as Error).message
      }, 'CompatibilityVerifier');
    }

    // Test new hook
    let newResult: VehicleProcessingResult | null = null;
    try {
      const startTime = performance.now();
      newResult = newHook(options);
      result.executionTime.new = performance.now() - startTime;
      result.metadata.resultSizes.new = JSON.stringify(newResult).length;
    } catch (error) {
      result.errors.new = error as Error;
      logger.error('New hook failed in compatibility test', {
        testName,
        error: (error as Error).message
      }, 'CompatibilityVerifier');
    }

    // Calculate performance difference
    if (result.executionTime.old > 0 && result.executionTime.new > 0) {
      result.executionTime.difference = result.executionTime.new - result.executionTime.old;
      result.executionTime.percentageDifference = 
        (result.executionTime.difference / result.executionTime.old) * 100;
    }

    // Compare results if both succeeded
    if (oldResult && newResult && !result.errors.old && !result.errors.new) {
      const comparison = deepEqual(oldResult, newResult);
      result.passed = comparison.isEqual;
      result.differences = comparison.differences;

      if (!result.passed) {
        logger.warn('Compatibility test failed - results differ', {
          testName,
          differences: result.differences.slice(0, 10), // Log first 10 differences
          totalDifferences: result.differences.length
        }, 'CompatibilityVerifier');
      }
    } else {
      // Test failed due to errors
      result.passed = false;
      if (result.errors.old && !result.errors.new) {
        result.differences.push('Old hook threw error, new hook succeeded');
      } else if (!result.errors.old && result.errors.new) {
        result.differences.push('New hook threw error, old hook succeeded');
      } else if (result.errors.old && result.errors.new) {
        result.differences.push('Both hooks threw errors');
      }
    }

    this.testResults.push(result);
    
    logger.info('Compatibility test completed', {
      testName,
      passed: result.passed,
      executionTime: result.executionTime,
      differencesCount: result.differences.length
    }, 'CompatibilityVerifier');

    return result;
  }

  /**
   * Run comprehensive compatibility test suite
   */
  async runTestSuite(
    oldHook: (options: VehicleProcessingOptions) => VehicleProcessingResult,
    newHook: (options: VehicleProcessingOptions) => VehicleProcessingResult
  ): Promise<{
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averagePerformanceImprovement: number;
    results: CompatibilityTestResult[];
  }> {
    if (this.isRunning) {
      throw new Error('Test suite is already running');
    }

    this.isRunning = true;
    this.testResults = [];

    logger.info('Starting compatibility test suite', {}, 'CompatibilityVerifier');

    const testCases: Array<{ name: string; options: VehicleProcessingOptions }> = [
      // Default options
      {
        name: 'Default options',
        options: {}
      },
      
      // Station display mode
      {
        name: 'Station display mode',
        options: {
          filterByFavorites: false,
          maxStations: 2,
          maxVehiclesPerStation: 5,
          showAllVehiclesPerRoute: false,
          maxSearchRadius: 5000,
          proximityThreshold: 200
        }
      },
      
      // Favorites mode
      {
        name: 'Favorites mode',
        options: {
          filterByFavorites: true,
          maxStations: 1,
          maxVehiclesPerStation: 10,
          showAllVehiclesPerRoute: true,
          maxSearchRadius: 10000,
          proximityThreshold: 500
        }
      },
      
      // High capacity mode
      {
        name: 'High capacity mode',
        options: {
          filterByFavorites: false,
          maxStations: 5,
          maxVehiclesPerStation: 20,
          showAllVehiclesPerRoute: false,
          maxSearchRadius: 15000,
          maxStationsToCheck: 50,
          proximityThreshold: 100
        }
      },
      
      // Minimal mode
      {
        name: 'Minimal mode',
        options: {
          filterByFavorites: false,
          maxStations: 1,
          maxVehiclesPerStation: 1,
          showAllVehiclesPerRoute: false,
          maxSearchRadius: 1000,
          proximityThreshold: 50
        }
      },
      
      // Edge case: zero limits
      {
        name: 'Zero limits',
        options: {
          filterByFavorites: false,
          maxStations: 0,
          maxVehiclesPerStation: 0,
          showAllVehiclesPerRoute: false,
          maxSearchRadius: 0,
          proximityThreshold: 0
        }
      },
      
      // Edge case: very high limits
      {
        name: 'Very high limits',
        options: {
          filterByFavorites: false,
          maxStations: 1000,
          maxVehiclesPerStation: 1000,
          showAllVehiclesPerRoute: true,
          maxSearchRadius: 100000,
          maxStationsToCheck: 1000,
          proximityThreshold: 10000
        }
      }
    ];

    try {
      // Run all test cases
      for (const testCase of testCases) {
        await this.runSingleTest(testCase.name, testCase.options, oldHook, newHook);
        
        // Small delay between tests to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Calculate summary statistics
      const totalTests = this.testResults.length;
      const passedTests = this.testResults.filter(r => r.passed).length;
      const failedTests = totalTests - passedTests;
      
      const performanceImprovements = this.testResults
        .filter(r => r.executionTime.old > 0 && r.executionTime.new > 0)
        .map(r => r.executionTime.percentageDifference);
      
      const averagePerformanceImprovement = performanceImprovements.length > 0
        ? performanceImprovements.reduce((sum, improvement) => sum + improvement, 0) / performanceImprovements.length
        : 0;

      const summary = {
        totalTests,
        passedTests,
        failedTests,
        averagePerformanceImprovement,
        results: [...this.testResults]
      };

      logger.info('Compatibility test suite completed', summary, 'CompatibilityVerifier');

      return summary;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get test results
   */
  getResults(): CompatibilityTestResult[] {
    return [...this.testResults];
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.testResults = [];
  }

  /**
   * Export test results for analysis
   */
  exportResults(): {
    summary: {
      totalTests: number;
      passedTests: number;
      failedTests: number;
      successRate: number;
      averagePerformanceImprovement: number;
    };
    details: CompatibilityTestResult[];
    timestamp: string;
  } {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    
    const performanceImprovements = this.testResults
      .filter(r => r.executionTime.old > 0 && r.executionTime.new > 0)
      .map(r => r.executionTime.percentageDifference);
    
    const averagePerformanceImprovement = performanceImprovements.length > 0
      ? performanceImprovements.reduce((sum, improvement) => sum + improvement, 0) / performanceImprovements.length
      : 0;

    return {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate,
        averagePerformanceImprovement
      },
      details: [...this.testResults],
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Global compatibility verifier instance
 */
export const compatibilityVerifier = new CompatibilityVerifier();

/**
 * React hook for running compatibility tests
 */
export function useCompatibilityVerification(): {
  isRunning: boolean;
  results: CompatibilityTestResult[];
  runTests: (
    oldHook: (options: VehicleProcessingOptions) => VehicleProcessingResult,
    newHook: (options: VehicleProcessingOptions) => VehicleProcessingResult
  ) => Promise<ReturnType<CompatibilityVerifier['runTestSuite']>>;
  clearResults: () => void;
  exportResults: () => ReturnType<CompatibilityVerifier['exportResults']>;
} {
  const [isRunning, setIsRunning] = React.useState(false);
  const [results, setResults] = React.useState<CompatibilityTestResult[]>([]);

  const runTests = React.useCallback(async (
    oldHook: (options: VehicleProcessingOptions) => VehicleProcessingResult,
    newHook: (options: VehicleProcessingOptions) => VehicleProcessingResult
  ) => {
    setIsRunning(true);
    try {
      const summary = await compatibilityVerifier.runTestSuite(oldHook, newHook);
      setResults(compatibilityVerifier.getResults());
      return summary;
    } finally {
      setIsRunning(false);
    }
  }, []);

  const clearResults = React.useCallback(() => {
    compatibilityVerifier.clearResults();
    setResults([]);
  }, []);

  const exportResults = React.useCallback(() => {
    return compatibilityVerifier.exportResults();
  }, []);

  return {
    isRunning,
    results,
    runTests,
    clearResults,
    exportResults
  };
}

/**
 * Utility function to create a compatibility test wrapper
 */
export function createCompatibilityTestWrapper<T extends (...args: any[]) => any>(
  componentName: string,
  oldHook: T,
  newHook: T
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    const startTime = performance.now();
    
    try {
      // Run both hooks and compare results
      const oldResult = oldHook(...args);
      const newResult = newHook(...args);
      
      const executionTime = performance.now() - startTime;
      
      // Quick compatibility check
      const comparison = deepEqual(oldResult, newResult);
      
      if (!comparison.isEqual) {
        logger.warn('Compatibility issue detected', {
          componentName,
          differences: comparison.differences.slice(0, 5),
          totalDifferences: comparison.differences.length,
          executionTime
        }, 'CompatibilityTestWrapper');
      }
      
      // Return new result (we're testing the new implementation)
      return newResult;
    } catch (error) {
      logger.error('Compatibility test wrapper error', {
        componentName,
        error: (error as Error).message
      }, 'CompatibilityTestWrapper');
      
      // Fallback to old hook on error
      return oldHook(...args);
    }
  }) as T;
}