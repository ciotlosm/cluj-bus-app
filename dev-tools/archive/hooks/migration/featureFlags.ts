/**
 * Feature flags for hook migration system
 * 
 * This module provides feature flags to enable/disable the new hook system
 * during gradual rollout and migration phases.
 */

export interface HookMigrationFlags {
  /** Enable the new orchestration hook system */
  useNewOrchestrationHook: boolean;
  
  /** Enable individual data layer hooks */
  useNewDataHooks: boolean;
  
  /** Enable individual processing layer hooks */
  useNewProcessingHooks: boolean;
  
  /** Enable performance monitoring for new hooks */
  enablePerformanceMonitoring: boolean;
  
  /** Enable detailed logging for migration debugging */
  enableMigrationLogging: boolean;
  
  /** Enable backward compatibility verification */
  enableCompatibilityVerification: boolean;
  
  /** Enable gradual rollout by component */
  enableGradualRollout: boolean;
  
  /** Components that should use the new hook system */
  enabledComponents: Set<string>;
}

/**
 * Default feature flags configuration
 * Initially conservative - new system disabled by default
 */
const DEFAULT_FLAGS: HookMigrationFlags = {
  useNewOrchestrationHook: false,
  useNewDataHooks: false,
  useNewProcessingHooks: false,
  enablePerformanceMonitoring: true,
  enableMigrationLogging: true,
  enableCompatibilityVerification: true,
  enableGradualRollout: true,
  enabledComponents: new Set<string>()
};

/**
 * Feature flags store with localStorage persistence
 */
class FeatureFlagsStore {
  private flags: HookMigrationFlags;
  private readonly storageKey = 'hook-migration-flags';
  private listeners: Set<(flags: HookMigrationFlags) => void> = new Set();

  constructor() {
    this.flags = this.loadFromStorage();
  }

  /**
   * Load flags from localStorage with fallback to defaults
   */
  private loadFromStorage(): HookMigrationFlags {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_FLAGS,
          ...parsed,
          enabledComponents: new Set(parsed.enabledComponents || [])
        };
      }
    } catch (error) {
      console.warn('Failed to load feature flags from storage:', error);
    }
    return { ...DEFAULT_FLAGS };
  }

  /**
   * Save flags to localStorage
   */
  private saveToStorage(): void {
    try {
      const toSave = {
        ...this.flags,
        enabledComponents: Array.from(this.flags.enabledComponents)
      };
      localStorage.setItem(this.storageKey, JSON.stringify(toSave));
    } catch (error) {
      console.warn('Failed to save feature flags to storage:', error);
    }
  }

  /**
   * Get current flags
   */
  getFlags(): Readonly<HookMigrationFlags> {
    return { ...this.flags };
  }

  /**
   * Update flags and notify listeners
   */
  updateFlags(updates: Partial<HookMigrationFlags>): void {
    this.flags = { ...this.flags, ...updates };
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Enable component for new hook system
   */
  enableComponent(componentName: string): void {
    const newEnabledComponents = new Set(this.flags.enabledComponents);
    newEnabledComponents.add(componentName);
    this.updateFlags({ enabledComponents: newEnabledComponents });
  }

  /**
   * Disable component from new hook system
   */
  disableComponent(componentName: string): void {
    const newEnabledComponents = new Set(this.flags.enabledComponents);
    newEnabledComponents.delete(componentName);
    this.updateFlags({ enabledComponents: newEnabledComponents });
  }

  /**
   * Check if component should use new hook system
   */
  isComponentEnabled(componentName: string): boolean {
    return this.flags.enableGradualRollout 
      ? this.flags.enabledComponents.has(componentName)
      : this.flags.useNewOrchestrationHook;
  }

  /**
   * Enable all new hook features (full migration)
   */
  enableAllFeatures(): void {
    this.updateFlags({
      useNewOrchestrationHook: true,
      useNewDataHooks: true,
      useNewProcessingHooks: true,
      enablePerformanceMonitoring: true,
      enableMigrationLogging: true,
      enableCompatibilityVerification: true,
      enableGradualRollout: false
    });
  }

  /**
   * Disable all new hook features (rollback)
   */
  disableAllFeatures(): void {
    this.updateFlags({
      useNewOrchestrationHook: false,
      useNewDataHooks: false,
      useNewProcessingHooks: false,
      enableGradualRollout: false,
      enabledComponents: new Set<string>()
    });
  }

  /**
   * Reset to default flags
   */
  resetToDefaults(): void {
    this.flags = { ...DEFAULT_FLAGS };
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Subscribe to flag changes
   */
  subscribe(listener: (flags: HookMigrationFlags) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of flag changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getFlags());
      } catch (error) {
        console.error('Error in feature flags listener:', error);
      }
    });
  }

  /**
   * Get migration status summary
   */
  getMigrationStatus(): {
    isFullyMigrated: boolean;
    isPartiallyMigrated: boolean;
    enabledComponentsCount: number;
    totalFlags: number;
    enabledFlags: number;
  } {
    const flags = this.flags;
    const flagValues = [
      flags.useNewOrchestrationHook,
      flags.useNewDataHooks,
      flags.useNewProcessingHooks
    ];
    
    const enabledFlags = flagValues.filter(Boolean).length;
    const totalFlags = flagValues.length;
    
    return {
      isFullyMigrated: enabledFlags === totalFlags && !flags.enableGradualRollout,
      isPartiallyMigrated: enabledFlags > 0 || flags.enabledComponents.size > 0,
      enabledComponentsCount: flags.enabledComponents.size,
      totalFlags,
      enabledFlags
    };
  }
}

/**
 * Global feature flags instance
 */
export const featureFlags = new FeatureFlagsStore();

/**
 * React hook for accessing feature flags
 */
export function useFeatureFlags(): {
  flags: Readonly<HookMigrationFlags>;
  updateFlags: (updates: Partial<HookMigrationFlags>) => void;
  enableComponent: (componentName: string) => void;
  disableComponent: (componentName: string) => void;
  isComponentEnabled: (componentName: string) => boolean;
  enableAllFeatures: () => void;
  disableAllFeatures: () => void;
  resetToDefaults: () => void;
  migrationStatus: ReturnType<FeatureFlagsStore['getMigrationStatus']>;
} {
  const [flags, setFlags] = React.useState(() => featureFlags.getFlags());

  React.useEffect(() => {
    return featureFlags.subscribe(setFlags);
  }, []);

  return {
    flags,
    updateFlags: featureFlags.updateFlags.bind(featureFlags),
    enableComponent: featureFlags.enableComponent.bind(featureFlags),
    disableComponent: featureFlags.disableComponent.bind(featureFlags),
    isComponentEnabled: featureFlags.isComponentEnabled.bind(featureFlags),
    enableAllFeatures: featureFlags.enableAllFeatures.bind(featureFlags),
    disableAllFeatures: featureFlags.disableAllFeatures.bind(featureFlags),
    resetToDefaults: featureFlags.resetToDefaults.bind(featureFlags),
    migrationStatus: featureFlags.getMigrationStatus()
  };
}

/**
 * Utility function to check if new hooks should be used for a component
 */
export function shouldUseNewHooks(componentName: string): boolean {
  return featureFlags.isComponentEnabled(componentName);
}

/**
 * Development utilities for testing migration
 */
export const migrationDevUtils = {
  /**
   * Enable new hooks for specific components (for testing)
   */
  enableForTesting: (components: string[]) => {
    components.forEach(component => featureFlags.enableComponent(component));
  },

  /**
   * Simulate gradual rollout
   */
  simulateGradualRollout: (components: string[], delayMs: number = 1000) => {
    components.forEach((component, index) => {
      setTimeout(() => {
        featureFlags.enableComponent(component);
        console.log(`Migration: Enabled new hooks for ${component}`);
      }, index * delayMs);
    });
  },

  /**
   * Get current migration state for debugging
   */
  getDebugInfo: () => ({
    flags: featureFlags.getFlags(),
    status: featureFlags.getMigrationStatus(),
    timestamp: new Date().toISOString()
  })
};