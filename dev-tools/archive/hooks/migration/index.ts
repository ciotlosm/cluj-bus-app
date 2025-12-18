/**
 * Migration utilities for hook refactoring
 * 
 * This module exports all migration-related utilities for the gradual
 * rollout of the new hook system.
 */

// Feature flags
export {
  featureFlags,
  useFeatureFlags,
  shouldUseNewHooks,
  migrationDevUtils,
  type HookMigrationFlags
} from './featureFlags';

// Migration helpers
export {
  migrationTracker,
  withMigrationSupport,
  useMigrationStatus,
  gradualRollout,
  migrationValidation
} from './migrationHelpers';

// Compatibility verification
export {
  compatibilityVerifier,
  useCompatibilityVerification,
  createCompatibilityTestWrapper,
  CompatibilityVerifier
} from './compatibilityVerification';

/**
 * Quick setup utilities for common migration scenarios
 */
export const migrationUtils = {
  /**
   * Enable testing mode for specific components
   */
  enableTestingMode: (components: string[]) => {
    featureFlags.updateFlags({
      enableGradualRollout: true,
      enableMigrationLogging: true,
      enableCompatibilityVerification: true,
      enablePerformanceMonitoring: true
    });
    
    components.forEach(component => {
      featureFlags.enableComponent(component);
    });
  },

  /**
   * Enable full migration (all components)
   */
  enableFullMigration: () => {
    featureFlags.enableAllFeatures();
  },

  /**
   * Rollback to old system
   */
  rollbackToOldSystem: () => {
    featureFlags.disableAllFeatures();
  },

  /**
   * Get migration overview
   */
  getMigrationOverview: () => {
    const flags = featureFlags.getFlags();
    const status = featureFlags.getMigrationStatus();
    const trackerSummary = migrationTracker.getMigrationSummary();
    
    return {
      flags,
      status,
      performance: trackerSummary,
      timestamp: new Date().toISOString()
    };
  }
};

// Performance monitoring
export {
  performanceMonitor,
  usePerformanceMonitoring,
  withPerformanceMonitoring,
  PerformanceMonitor
} from './performanceMonitor';