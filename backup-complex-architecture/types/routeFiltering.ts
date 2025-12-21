/**
 * Route-Based Vehicle Filtering Configuration Types
 * Defines interfaces and types for intelligent route filtering configuration
 * Requirements: 3.1, 3.2, 3.4, 3.5
 */

/**
 * Configuration interface for route-based vehicle filtering
 */
export interface RouteFilteringConfig {
  /** Threshold for classifying routes as busy (default: 5 vehicles) */
  busyRouteThreshold: number;
  
  /** Distance threshold for filtering vehicles on busy routes (default: 2000 meters) */
  distanceFilterThreshold: number;
  
  /** Enable debug logging for filtering decisions (default: false) */
  enableDebugLogging: boolean;
  
  /** Enable performance monitoring (default: true) */
  performanceMonitoring: boolean;
}

/**
 * Validation result for configuration values
 */
export interface ValidationResult {
  /** Whether the configuration is valid */
  isValid: boolean;
  
  /** List of validation errors */
  errors: string[];
  
  /** Sanitized configuration with corrected values (if applicable) */
  sanitizedConfig?: RouteFilteringConfig;
}

/**
 * Configuration manager interface for route filtering settings
 */
export interface IConfigurationManager {
  /** Get current route filtering configuration */
  getRouteFilteringConfig(): RouteFilteringConfig;
  
  /** Update configuration with partial updates */
  updateConfig(updates: Partial<RouteFilteringConfig>): void;
  
  /** Validate configuration values */
  validateConfig(config: RouteFilteringConfig): ValidationResult;
  
  /** Persist configuration to storage */
  persistConfig(config: RouteFilteringConfig): Promise<void>;
  
  /** Load persisted configuration from storage */
  loadPersistedConfig(): Promise<RouteFilteringConfig>;
  
  /** Reset configuration to defaults */
  resetToDefaults(): void;
  
  /** Subscribe to configuration changes */
  onConfigChange(callback: (config: RouteFilteringConfig) => void): () => void;
}

/**
 * Default configuration values
 */
export const DEFAULT_ROUTE_FILTERING_CONFIG: RouteFilteringConfig = {
  busyRouteThreshold: 5,
  distanceFilterThreshold: 2000,
  enableDebugLogging: false,
  performanceMonitoring: true,
};

/**
 * Configuration validation constraints
 */
export const CONFIG_VALIDATION_CONSTRAINTS = {
  busyRouteThreshold: {
    min: 1,
    max: 50,
    default: 5,
  },
  distanceFilterThreshold: {
    min: 100,
    max: 10000,
    default: 2000,
  },
} as const;

/**
 * Configuration change event data
 */
export interface ConfigChangeEvent {
  /** Previous configuration */
  previous: RouteFilteringConfig;
  
  /** New configuration */
  current: RouteFilteringConfig;
  
  /** Changed fields */
  changes: Partial<RouteFilteringConfig>;
  
  /** Timestamp of change */
  timestamp: Date;
}

/**
 * Type guard to check if an object is a valid RouteFilteringConfig
 */
export function isRouteFilteringConfig(obj: any): obj is RouteFilteringConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.busyRouteThreshold === 'number' &&
    typeof obj.distanceFilterThreshold === 'number' &&
    typeof obj.enableDebugLogging === 'boolean' &&
    typeof obj.performanceMonitoring === 'boolean'
  );
}

/**
 * Create a default configuration object
 */
export function createDefaultRouteFilteringConfig(): RouteFilteringConfig {
  return { ...DEFAULT_ROUTE_FILTERING_CONFIG };
}

/**
 * Merge partial configuration updates with existing configuration
 */
export function mergeRouteFilteringConfig(
  current: RouteFilteringConfig,
  updates: Partial<RouteFilteringConfig>
): RouteFilteringConfig {
  return {
    ...current,
    ...updates,
  };
}