import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as fc from 'fast-check';
import { 
  createDependencyTracker
} from './dependencyTracker';

/**
 * **Feature: hook-refactoring, Property 12: Selective Re-execution**
 * **Validates: Requirements 4.3**
 * 
 * Property: For any dependency change in the hook system, only the processing steps 
 * that depend on the changed data should re-execute
 */

describe('Dependency Tracker Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 12: Selective Re-execution', () => {
    it('should only re-execute when dependencies actually change', () => {
      fc.assert(
        fc.property(
          // Generate arrays of primitive values as dependencies
          fc.array(fc.oneof(fc.string(), fc.integer(), fc.boolean()), { minLength: 1, maxLength: 10 }),
          fc.array(fc.oneof(fc.string(), fc.integer(), fc.boolean()), { minLength: 1, maxLength: 10 }),
          fc.string({ minLength: 1, maxLength: 20 }), // key
          (initialDeps, newDeps, key) => {
            const tracker = createDependencyTracker();
            let executionCount = 0;
            
            // Mock expensive computation
            const expensiveComputation = vi.fn(() => {
              executionCount++;
              return `result-${executionCount}`;
            });

            // First call - should always execute
            const hasChanged1 = tracker.hasChanged(key, initialDeps);
            expect(hasChanged1).toBe(true); // First call always returns true
            
            const result1 = expensiveComputation();
            tracker.updateDependencies(key, initialDeps);

            // Second call with same dependencies - should not execute
            const hasChanged2 = tracker.hasChanged(key, initialDeps);
            expect(hasChanged2).toBe(false); // Same dependencies
            
            let result2 = result1; // Simulate not calling expensive computation
            if (hasChanged2) {
              result2 = expensiveComputation();
              tracker.updateDependencies(key, initialDeps);
            }

            // Third call with different dependencies - should execute only if actually different
            const actuallyDifferent = JSON.stringify(initialDeps) !== JSON.stringify(newDeps);
            const hasChanged3 = tracker.hasChanged(key, newDeps);
            
            expect(hasChanged3).toBe(actuallyDifferent);
            
            let result3 = result2; // Simulate not calling expensive computation
            if (hasChanged3) {
              result3 = expensiveComputation();
              tracker.updateDependencies(key, newDeps);
            }

            // Verify execution count matches expectation
            const expectedExecutions = actuallyDifferent ? 2 : 1;
            expect(executionCount).toBe(expectedExecutions);

            // Verify results are consistent
            if (!actuallyDifferent) {
              expect(result1).toBe(result2);
              expect(result2).toBe(result3);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle complex object dependencies correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string(),
            count: fc.integer(),
            nested: fc.record({
              value: fc.string(),
              flag: fc.boolean()
            })
          }),
          fc.record({
            id: fc.string(),
            count: fc.integer(),
            nested: fc.record({
              value: fc.string(),
              flag: fc.boolean()
            })
          }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (obj1, obj2, key) => {
            const tracker = createDependencyTracker();
            let executionCount = 0;

            const computation = () => {
              executionCount++;
              return `computed-${executionCount}`;
            };

            // First execution
            expect(tracker.hasChanged(key, [obj1])).toBe(true);
            computation();
            tracker.updateDependencies(key, [obj1]);

            // Second execution with same object
            expect(tracker.hasChanged(key, [obj1])).toBe(false);

            // Third execution with potentially different object
            const actuallyDifferent = JSON.stringify(obj1) !== JSON.stringify(obj2);
            expect(tracker.hasChanged(key, [obj2])).toBe(actuallyDifferent);

            if (actuallyDifferent) {
              computation();
              tracker.updateDependencies(key, [obj2]);
            }

            const expectedExecutions = actuallyDifferent ? 2 : 1;
            expect(executionCount).toBe(expectedExecutions);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should track multiple keys independently', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 2, maxLength: 5 }), // keys
          fc.array(fc.array(fc.integer(), { minLength: 1, maxLength: 5 }), { minLength: 2, maxLength: 5 }), // dependencies per key
          (keys, depArrays) => {
            // Remove duplicates to ensure independent tracking
            const uniqueKeys = [...new Set(keys)];
            if (uniqueKeys.length < 2) {
              // Skip test if we don't have at least 2 unique keys
              return true;
            }

            // Ensure we have matching arrays
            const minLength = Math.min(uniqueKeys.length, depArrays.length);
            const testKeys = uniqueKeys.slice(0, minLength);
            const testDeps = depArrays.slice(0, minLength);

            const tracker = createDependencyTracker();
            const executionCounts = new Map<string, number>();

            // Initialize all keys
            testKeys.forEach((key, index) => {
              executionCounts.set(key, 0);
              expect(tracker.hasChanged(key, testDeps[index])).toBe(true);
              executionCounts.set(key, 1);
              tracker.updateDependencies(key, testDeps[index]);
            });

            // Test that changing one key doesn't affect others
            if (testKeys.length > 1) {
              const keyToChange = testKeys[0];
              const unchangedKeys = testKeys.slice(1);
              const newDeps = [...testDeps[0], 999]; // Add element to make it different

              // Change first key
              expect(tracker.hasChanged(keyToChange, newDeps)).toBe(true);
              executionCounts.set(keyToChange, 2);
              tracker.updateDependencies(keyToChange, newDeps);

              // Verify other keys are unchanged
              unchangedKeys.forEach((key, index) => {
                const originalDeps = testDeps[index + 1];
                expect(tracker.hasChanged(key, originalDeps)).toBe(false);
                // Execution count should remain 1
                expect(executionCounts.get(key)).toBe(1);
              });
            }

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // Removed useSelectiveMemo tests - function was deleted as part of cleanup

  // Removed useSelectiveCallback and Performance Monitor tests - functions were deleted as part of cleanup

  describe('Dependency Tracker Statistics', () => {
    it('should provide accurate statistics', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 10 }),
              dependencies: fc.array(fc.integer(), { minLength: 1, maxLength: 5 }),
              checkCount: fc.integer({ min: 1, max: 10 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (operations) => {
            const tracker = createDependencyTracker();
            let totalExpectedChecks = 0;
            let totalExpectedChanges = 0;

            operations.forEach(({ key, dependencies, checkCount }) => {
              // First check is always a change
              tracker.hasChanged(key, dependencies);
              tracker.updateDependencies(key, dependencies);
              totalExpectedChecks++;
              totalExpectedChanges++;

              // Additional checks with same dependencies (no changes)
              for (let i = 1; i < checkCount; i++) {
                tracker.hasChanged(key, dependencies);
                totalExpectedChecks++;
              }
            });

            const stats = tracker.getStats();
            
            expect(stats.totalKeys).toBe(new Set(operations.map(op => op.key)).size);
            expect(stats.totalChecks).toBe(totalExpectedChecks);
            expect(stats.totalChanges).toBe(totalExpectedChanges);
            expect(stats.changeRate).toBeCloseTo(totalExpectedChanges / totalExpectedChecks, 2);

            return true;
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});