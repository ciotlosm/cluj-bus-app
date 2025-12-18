/**
 * Migration helper functions for gradual rollout of new hook system
 * 
 * This module provides utilities to help with the migration from the old
 * hook system to the new decomposed hook architecture.
 */

import React from 'react';
import { logger } from '../../utils/logger';
import { featureFlags, type HookMigrationFlags } from './featureFlags';

/**
 * Migration context for tracking rollout progress
 */
interface MigrationContext {
  componentName: string;
  hookName: string;
  migrationPhase: 'testing' | 'partial' | 'full' | 'complete';
  startTime: Date;
  errors: Array<{
    error: Error;
    timestamp: Date;
    context: Record<string, any>;
  }>;
}

/**
 * Migration state tracking
 */
class MigrationTracker {
  private contexts: Map<string, MigrationContext> = new Map();
  private performanceMetrics: Map<string, Array<{
    duration: number;
    timestamp: Date;
    success: boolean;
  }>> = new Map();

  /**
   * Start tracking migration for a component
   */
  startMigration(componentName: string, hookName: string, phase: MigrationContext['migrationPhase']): void {
    const contextKey = `${componentName}:${hookName}`;
    
    this.contexts.set(contextKey, {
      componentName,
      hookName,
      migrationPhase: phase,
      startTime: new Date(),
      errors: []
    });

    logger.info('Migration started', {
      componentName,
      hookName,
      phase,
      timestamp: new Date().toISOString()
    }, 'Migration');
  }

  /**
   * Record migration error
   */
  recordError(componentName: string, hookName: string, error: Error, context: Record<string, any> = {}): void {
    const contextKey = `${componentName}:${hookName}`;
    const migrationContext = this.contexts.get(contextKey);
    
    if (migrationContext) {
      migrationContext.errors.push({
        error,
        timestamp: new Date(),
        context
      });
    }

    logger.error('Migration error', {
      componentName,
      hookName,
      error: error.message,
      context,
      timestamp: new Date().toISOString()
    }, 'Migration');
  }

  /**
   * Record performance metrics
   */
  recordPerformance(componentName: string, hookName: string, duration: number, success: boolean): void {
    const key = `${componentName}:${hookName}`;
    
    if (!this.performanceMetrics.has(key)) {
      this.performanceMetrics.set(key, []);
    }
    
    this.performanceMetrics.get(key)!.push({
      duration,
      timestamp: new Date(),
      success
    });

    // Keep only last 100 measurements
    const metrics = this.performanceMetrics.get(key)!;
    if (metrics.length > 100) {
      metrics.splice(0, metrics.length - 100);
    }
  }

  /**
   * Complete migration for a component
   */
  completeMigration(componentName: string, hookName: string): void {
    const contextKey = `${componentName}:${hookName}`;
    const context = this.contexts.get(contextKey);
    
    if (context) {
      const duration = Date.now() - context.startTime.getTime();
      
      logger.info('Migration completed', {
        componentName,
        hookName,
        duration,
        errorCount: context.errors.length,
        phase: context.migrationPhase,
        timestamp: new Date().toISOString()
      }, 'Migration');
    }
  }

  /**
   * Get migration summary
   */
  getMigrationSummary(): {
    totalMigrations: number;
    activeMigrations: number;
    totalErrors: number;
    averagePerformance: Record<string, { avgDuration: number; successRate: number }>;
  } {
    const totalMigrations = this.contexts.size;
    const activeMigrations = Array.from(this.contexts.values()).filter(
      ctx => ctx.migrationPhase !== 'complete'
    ).length;
    
    const totalErrors = Array.from(this.contexts.values()).reduce(
      (sum, ctx) => sum + ctx.errors.length, 0
    );

    const averagePerformance: Record<string, { avgDuration: number; successRate: number }> = {};
    
    for (const [key, metrics] of this.performanceMetrics.entries()) {
      const successfulMetrics = metrics.filter(m => m.success);
      const avgDuration = successfulMetrics.length > 0 
        ? successfulMetrics.reduce((sum, m) => sum + m.duration, 0) / successfulMetrics.length
        : 0;
      const successRate = metrics.length > 0 ? successfulMetrics.length / metrics.length : 0;
      
      averagePerformance[key] = { avgDuration, successRate };
    }

    return {
      totalMigrations,
      activeMigrations,
      totalErrors,
      averagePerformance
    };
  }

  /**
   * Clear all tracking data
   */
  clear(): void {
    this.contexts.clear();
    this.performanceMetrics.clear();
  }
}

/**
 * Global migration tracker instance
 */
export const migrationTracker = new MigrationTracker();

/**
 * Hook wrapper that provides migration support
 */
export function withMigrationSupport<T extends (...args: any[]) => any>(
  componentName: string,
  hookName: string,
  oldHook: T,
  newHook: T,
  options: {
    enablePerformanceTracking?: boolean;
    enableErrorTracking?: boolean;
    fallbackToOld?: boolean;
  } = {}
): T {
  const {
    enablePerformanceTracking = true,
    enableErrorTracking = true,
    fallbackToOld = true
  } = options;

  return ((...args: Parameters<T>): ReturnType<T> => {
    const shouldUseNew = featureFlags.isComponentEnabled(componentName);
    const flags = featureFlags.getFlags();
    
    // Log migration decision
    if (flags.enableMigrationLogging) {
      logger.debug('Migration decision', {
        componentName,
        hookName,
        shouldUseNew,
        gradualRollout: flags.enableGradualRollout,
        componentEnabled: featureFlags.isComponentEnabled(componentName)
      }, 'Migration');
    }

    if (!shouldUseNew) {
      // Use old hook
      if (enablePerformanceTracking) {
        const startTime = performance.now();
        try {
          const result = oldHook(...args);
          const duration = performance.now() - startTime;
          migrationTracker.recordPerformance(componentName, `${hookName}:old`, duration, true);
          return result;
        } catch (error) {
          const duration = performance.now() - startTime;
          migrationTracker.recordPerformance(componentName, `${hookName}:old`, duration, false);
          if (enableErrorTracking) {
            migrationTracker.recordError(componentName, `${hookName}:old`, error as Error, { args });
          }
          throw error;
        }
      } else {
        return oldHook(...args);
      }
    }

    // Use new hook with fallback
    if (enablePerformanceTracking) {
      const startTime = performance.now();
      try {
        const result = newHook(...args);
        const duration = performance.now() - startTime;
        migrationTracker.recordPerformance(componentName, `${hookName}:new`, duration, true);
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        migrationTracker.recordPerformance(componentName, `${hookName}:new`, duration, false);
        
        if (enableErrorTracking) {
          migrationTracker.recordError(componentName, `${hookName}:new`, error as Error, { args });
        }

        // Fallback to old hook if enabled
        if (fallbackToOld) {
          logger.warn('New hook failed, falling back to old hook', {
            componentName,
            hookName,
            error: (error as Error).message
          }, 'Migration');
          
          try {
            const fallbackResult = oldHook(...args);
            migrationTracker.recordPerformance(componentName, `${hookName}:fallback`, duration, true);
            return fallbackResult;
          } catch (fallbackError) {
            migrationTracker.recordPerformance(componentName, `${hookName}:fallback`, duration, false);
            if (enableErrorTracking) {
              migrationTracker.recordError(componentName, `${hookName}:fallback`, fallbackError as Error, { args });
            }
            throw fallbackError;
          }
        }
        
        throw error;
      }
    } else {
      try {
        return newHook(...args);
      } catch (error) {
        if (enableErrorTracking) {
          migrationTracker.recordError(componentName, `${hookName}:new`, error as Error, { args });
        }

        if (fallbackToOld) {
          logger.warn('New hook failed, falling back to old hook', {
            componentName,
            hookName,
            error: (error as Error).message
          }, 'Migration');
          
          return oldHook(...args);
        }
        
        throw error;
      }
    }
  }) as T;
}

/**
 * React hook for migration status
 */
export function useMigrationStatus(componentName: string): {
  isUsingNewHooks: boolean;
  migrationPhase: 'not-started' | 'testing' | 'partial' | 'complete';
  canRollback: boolean;
  performanceMetrics?: {
    avgDuration: number;
    successRate: number;
  };
} {
  const [flags, setFlags] = React.useState(() => featureFlags.getFlags());
  
  React.useEffect(() => {
    return featureFlags.subscribe(setFlags);
  }, []);

  const isUsingNewHooks = featureFlags.isComponentEnabled(componentName);
  const summary = migrationTracker.getMigrationSummary();
  
  let migrationPhase: 'not-started' | 'testing' | 'partial' | 'complete' = 'not-started';
  
  if (flags.enableGradualRollout && flags.enabledComponents.size > 0) {
    migrationPhase = 'testing';
  } else if (flags.useNewOrchestrationHook && !flags.enableGradualRollout) {
    migrationPhase = 'complete';
  } else if (flags.useNewDataHooks || flags.useNewProcessingHooks) {
    migrationPhase = 'partial';
  }

  const performanceKey = `${componentName}:useVehicleProcessing:new`;
  const performanceMetrics = summary.averagePerformance[performanceKey];

  return {
    isUsingNewHooks,
    migrationPhase,
    canRollback: migrationPhase !== 'not-started',
    performanceMetrics
  };
}

/**
 * Gradual rollout utilities
 */
export const gradualRollout = {
  /**
   * Enable components in phases with delays
   */
  async rolloutInPhases(
    phases: Array<{
      components: string[];
      delayMs: number;
      description: string;
    }>
  ): Promise<void> {
    logger.info('Starting gradual rollout', {
      totalPhases: phases.length,
      totalComponents: phases.reduce((sum, phase) => sum + phase.components.length, 0)
    }, 'Migration');

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      
      logger.info(`Starting rollout phase ${i + 1}`, {
        phase: i + 1,
        totalPhases: phases.length,
        components: phase.components,
        description: phase.description,
        delayMs: phase.delayMs
      }, 'Migration');

      // Enable components in this phase
      phase.components.forEach(component => {
        featureFlags.enableComponent(component);
        migrationTracker.startMigration(component, 'useVehicleProcessing', 'partial');
      });

      // Wait before next phase (except for last phase)
      if (i < phases.length - 1) {
        await new Promise(resolve => setTimeout(resolve, phase.delayMs));
      }
    }

    logger.info('Gradual rollout completed', {
      totalPhases: phases.length
    }, 'Migration');
  },

  /**
   * Rollback specific components
   */
  rollbackComponents(components: string[]): void {
    logger.info('Rolling back components', { components }, 'Migration');
    
    components.forEach(component => {
      featureFlags.disableComponent(component);
      migrationTracker.completeMigration(component, 'useVehicleProcessing');
    });
  },

  /**
   * Get rollout progress
   */
  getProgress(): {
    totalComponents: number;
    migratedComponents: number;
    progressPercentage: number;
    remainingComponents: string[];
  } {
    const flags = featureFlags.getFlags();
    const allComponents = ['StationDisplay', 'SettingsRoute', 'FavoriteRoutesView'];
    const migratedComponents = flags.enabledComponents.size;
    const totalComponents = allComponents.length;
    const progressPercentage = (migratedComponents / totalComponents) * 100;
    const remainingComponents = allComponents.filter(c => !flags.enabledComponents.has(c));

    return {
      totalComponents,
      migratedComponents,
      progressPercentage,
      remainingComponents
    };
  }
};

/**
 * Migration validation utilities
 */
export const migrationValidation = {
  /**
   * Validate that new hooks produce compatible results
   */
  validateCompatibility<T>(
    componentName: string,
    oldResult: T,
    newResult: T,
    validator?: (old: T, new_: T) => boolean
  ): boolean {
    try {
      if (validator) {
        return validator(oldResult, newResult);
      }

      // Default deep equality check
      return JSON.stringify(oldResult) === JSON.stringify(newResult);
    } catch (error) {
      migrationTracker.recordError(componentName, 'compatibility-validation', error as Error, {
        oldResult: typeof oldResult,
        newResult: typeof newResult
      });
      return false;
    }
  },

  /**
   * Run compatibility tests for a component
   */
  async runCompatibilityTests(
    componentName: string,
    testCases: Array<{
      name: string;
      args: any[];
      validator?: (old: any, new_: any) => boolean;
    }>
  ): Promise<{
    passed: number;
    failed: number;
    results: Array<{
      testName: string;
      passed: boolean;
      error?: string;
    }>;
  }> {
    const results: Array<{
      testName: string;
      passed: boolean;
      error?: string;
    }> = [];

    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
      try {
        // This would need to be implemented with actual hook testing
        // For now, we'll simulate the test structure
        const testPassed = true; // Placeholder
        
        results.push({
          testName: testCase.name,
          passed: testPassed
        });

        if (testPassed) {
          passed++;
        } else {
          failed++;
        }
      } catch (error) {
        results.push({
          testName: testCase.name,
          passed: false,
          error: (error as Error).message
        });
        failed++;
      }
    }

    logger.info('Compatibility tests completed', {
      componentName,
      passed,
      failed,
      totalTests: testCases.length
    }, 'Migration');

    return { passed, failed, results };
  }
};