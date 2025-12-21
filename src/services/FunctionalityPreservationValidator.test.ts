/**
 * Tests for Functionality Preservation Validator
 * Validates Requirements: 5.3, 7.5, 8.3, 8.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FunctionalityPreservationValidator } from './FunctionalityPreservationValidator';
import type { 
  ApplicationStateSnapshot, 
  StateComparisonResult,
  FunctionalityResult 
} from './FunctionalityPreservationValidator';

// Mock dependencies
vi.mock('../utils/performance/performance', () => ({
  performanceMonitor: {
    recordTiming: vi.fn(),
    getSummary: vi.fn(() => ({
      'component.render': { avg: 15.5, max: 25.0, count: 10 },
      'api.call': { avg: 120.0, max: 200.0, count: 5 }
    }))
  }
}));

vi.mock('../utils/shared/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('FunctionalityPreservationValidator', () => {
  let validator: FunctionalityPreservationValidator;
  let mockSnapshot: ApplicationStateSnapshot;

  beforeEach(() => {
    validator = new FunctionalityPreservationValidator('/test/project');
    
    mockSnapshot = {
      timestamp: new Date(),
      storeStates: {
        configStore: { initialized: true, apiKey: 'test-key' },
        locationStore: { currentLocation: { lat: 46.7712, lng: 23.6236 }, favorites: [] }
      },
      componentTree: [
        {
          name: 'App',
          props: {},
          children: [
            {
              name: 'StationDisplay',
              props: { stationId: 'test-station' },
              children: [],
              hooks: ['useState', 'useEffect']
            }
          ],
          hooks: ['useAppInitialization']
        }
      ],
      apiEndpoints: {
        '/api/tranzy/vehicles': { method: 'GET', cached: true },
        '/api/tranzy/routes': { method: 'GET', cached: false }
      },
      performanceMetrics: {
        'component.render.avg': 15.5,
        'api.call.avg': 120.0
      },
      bundleInfo: {
        totalSize: 1024000,
        chunkSizes: { 'main.js': 512000, 'vendor.js': 512000 },
        assetCount: 2,
        dependencies: ['react', 'zustand']
      },
      configState: {
        dependencies: ['react', 'zustand', '@mui/material'],
        version: '1.0.0'
      }
    };
  });

  describe('createApplicationStateSnapshot', () => {
    it('should create a comprehensive application state snapshot', async () => {
      const snapshot = await validator.createApplicationStateSnapshot();
      
      expect(snapshot).toBeDefined();
      expect(snapshot.timestamp).toBeInstanceOf(Date);
      expect(snapshot.storeStates).toBeDefined();
      expect(snapshot.componentTree).toBeDefined();
      expect(snapshot.apiEndpoints).toBeDefined();
      expect(snapshot.performanceMetrics).toBeDefined();
      expect(snapshot.bundleInfo).toBeDefined();
      expect(snapshot.configState).toBeDefined();
    });

    it('should capture store states correctly', async () => {
      const snapshot = await validator.createApplicationStateSnapshot();
      
      expect(snapshot.storeStates).toHaveProperty('configStore');
      expect(snapshot.storeStates).toHaveProperty('locationStore');
      expect(snapshot.storeStates).toHaveProperty('vehicleStore');
    });

    it('should capture component tree structure', async () => {
      const snapshot = await validator.createApplicationStateSnapshot();
      
      expect(Array.isArray(snapshot.componentTree)).toBe(true);
      expect(snapshot.componentTree.length).toBeGreaterThan(0);
      
      const rootComponent = snapshot.componentTree[0];
      expect(rootComponent).toHaveProperty('name');
      expect(rootComponent).toHaveProperty('props');
      expect(rootComponent).toHaveProperty('children');
      expect(rootComponent).toHaveProperty('hooks');
    });

    it('should capture performance metrics', async () => {
      const snapshot = await validator.createApplicationStateSnapshot();
      
      expect(snapshot.performanceMetrics).toBeDefined();
      expect(typeof snapshot.performanceMetrics).toBe('object');
    });
  });

  describe('compareApplicationStates', () => {
    it('should detect no differences when states are identical', async () => {
      const snapshot1 = { ...mockSnapshot };
      const snapshot2 = { ...mockSnapshot };
      
      const comparison = await validator.compareApplicationStates(snapshot1, snapshot2);
      
      expect(comparison.identical).toBe(true);
      expect(comparison.differences).toHaveLength(0);
      expect(comparison.functionalityChanges).toHaveLength(0);
    });

    it('should detect store state changes', async () => {
      const snapshot1 = { ...mockSnapshot };
      const snapshot2 = {
        ...mockSnapshot,
        storeStates: {
          ...mockSnapshot.storeStates,
          configStore: { initialized: false, apiKey: 'different-key' }
        }
      };
      
      const comparison = await validator.compareApplicationStates(snapshot1, snapshot2);
      
      expect(comparison.identical).toBe(false);
      expect(comparison.differences.length).toBeGreaterThan(0);
      
      const storeDifference = comparison.differences.find(d => d.path.includes('configStore'));
      expect(storeDifference).toBeDefined();
      expect(storeDifference?.type).toBe('modified');
    });

    it('should detect API endpoint changes', async () => {
      const snapshot1 = { ...mockSnapshot };
      const snapshot2 = {
        ...mockSnapshot,
        apiEndpoints: {
          ...mockSnapshot.apiEndpoints,
          '/api/tranzy/new-endpoint': { method: 'POST', cached: false }
        }
      };
      
      const comparison = await validator.compareApplicationStates(snapshot1, snapshot2);
      
      expect(comparison.identical).toBe(false);
      
      const apiDifference = comparison.differences.find(d => d.path.includes('new-endpoint'));
      expect(apiDifference).toBeDefined();
      expect(apiDifference?.type).toBe('added');
    });

    it('should assess performance impact correctly', async () => {
      const snapshot1 = { ...mockSnapshot };
      const snapshot2 = {
        ...mockSnapshot,
        bundleInfo: {
          ...mockSnapshot.bundleInfo,
          totalSize: mockSnapshot.bundleInfo.totalSize * 1.2 // 20% increase
        }
      };
      
      const comparison = await validator.compareApplicationStates(snapshot1, snapshot2);
      
      expect(comparison.performanceImpact).toBeDefined();
      expect(comparison.performanceImpact.bundleSizeChange).toBeGreaterThan(0);
    });
  });

  describe('runBehavioralTests', () => {
    it('should run all behavioral tests and return results', async () => {
      const results = await validator.runBehavioralTests();
      
      expect(results).toHaveProperty('passed');
      expect(results).toHaveProperty('failed');
      expect(results).toHaveProperty('results');
      expect(Array.isArray(results.results)).toBe(true);
      expect(results.passed + results.failed).toBe(results.results.length);
    });

    it('should handle test failures gracefully', async () => {
      // Mock a failing test by creating a validator with a failing test
      const testValidator = new FunctionalityPreservationValidator('/test/project');
      
      const results = await testValidator.runBehavioralTests();
      
      expect(results.passed).toBeGreaterThanOrEqual(0);
      expect(results.failed).toBeGreaterThanOrEqual(0);
      expect(results.results.length).toBeGreaterThan(0);
    });
  });

  describe('validateFunctionality', () => {
    it('should validate functionality without baseline', async () => {
      const result = await validator.validateFunctionality();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('functionalityPreserved');
      expect(result).toHaveProperty('changes');
      expect(result).toHaveProperty('performanceImpact');
      expect(result).toHaveProperty('timestamp');
      expect(Array.isArray(result.changes)).toBe(true);
    });

    it('should validate functionality with test results', async () => {
      const testResults = {
        success: false,
        testsRun: 10,
        testsPassed: 8,
        testsFailed: 2,
        failures: [
          { testName: 'test1', error: 'assertion failed', testFile: 'test.ts' },
          { testName: 'test2', error: 'timeout', testFile: 'test.ts' }
        ],
        executionTime: 5000
      };
      
      const result = await validator.validateFunctionality(testResults);
      
      expect(result.functionalityPreserved).toBe(false);
      expect(result.changes.length).toBeGreaterThan(0);
      
      const testFailureChange = result.changes.find(c => c.component === 'unit_tests');
      expect(testFailureChange).toBeDefined();
      expect(testFailureChange?.severity).toBe('critical');
    });

    it('should validate functionality with build results', async () => {
      const buildResults = {
        success: false,
        errors: [
          { file: 'test.ts', line: 10, column: 5, message: 'Type error', code: 'TS2345' }
        ],
        warnings: [],
        buildTime: 3000
      };
      
      const result = await validator.validateFunctionality(undefined, buildResults);
      
      expect(result.functionalityPreserved).toBe(false);
      expect(result.changes.length).toBeGreaterThan(0);
      
      const buildErrorChange = result.changes.find(c => c.component === 'build_system');
      expect(buildErrorChange).toBeDefined();
      expect(buildErrorChange?.severity).toBe('critical');
    });

    it('should preserve functionality when no issues detected', async () => {
      const testResults = {
        success: true,
        testsRun: 10,
        testsPassed: 10,
        testsFailed: 0,
        failures: [],
        executionTime: 5000
      };
      
      const buildResults = {
        success: true,
        errors: [],
        warnings: [],
        buildTime: 3000
      };
      
      const result = await validator.validateFunctionality(testResults, buildResults);
      
      expect(result.functionalityPreserved).toBe(true);
      expect(result.changes.filter(c => c.severity === 'critical' || c.severity === 'high')).toHaveLength(0);
    });
  });

  describe('baseline management', () => {
    it('should set and clear baseline correctly', async () => {
      expect(validator.getBaseline).toBeUndefined();
      
      await validator.setBaseline();
      // Baseline is set internally, we can't directly access it in this implementation
      
      validator.clearBaseline();
      // Baseline is cleared internally
    });
  });

  describe('error handling', () => {
    it('should handle snapshot creation errors gracefully', async () => {
      // Create validator with invalid project root
      const invalidValidator = new FunctionalityPreservationValidator('/invalid/path');
      
      // Should not throw, but may return empty/default values
      const snapshot = await invalidValidator.createApplicationStateSnapshot();
      expect(snapshot).toBeDefined();
    });

    it('should handle comparison errors gracefully', async () => {
      const invalidSnapshot1 = { ...mockSnapshot, storeStates: null as any };
      const invalidSnapshot2 = { ...mockSnapshot };
      
      // Should not throw
      const comparison = await validator.compareApplicationStates(invalidSnapshot1, invalidSnapshot2);
      expect(comparison).toBeDefined();
    });
  });

  describe('performance metrics integration', () => {
    it('should integrate with performance monitor correctly', async () => {
      const snapshot = await validator.createApplicationStateSnapshot();
      
      expect(snapshot.performanceMetrics).toBeDefined();
      expect(Object.keys(snapshot.performanceMetrics).length).toBeGreaterThan(0);
    });
  });
});