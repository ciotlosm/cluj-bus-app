/**
 * Route Filtering Configuration Manager
 * Manages configuration for intelligent route-based vehicle filtering
 * Requirements: 3.1, 3.2, 3.4, 3.5
 */

import { logger } from '../utils/shared/logger';
import { gracefulDegradationService } from './GracefulDegradationService';
import type {
  RouteFilteringConfig,
  IConfigurationManager,
  ValidationResult,
  ConfigChangeEvent,
} from '../types/routeFiltering';
import {
  DEFAULT_ROUTE_FILTERING_CONFIG,
  CONFIG_VALIDATION_CONSTRAINTS,
  createDefaultRouteFilteringConfig,
  mergeRouteFilteringConfig,
  isRouteFilteringConfig,
} from '../types/routeFiltering';

/**
 * Configuration Manager for Route Filtering
 * Handles validation, persistence, and change notifications
 */
export class RouteFilteringConfigurationManager implements IConfigurationManager {
  private currentConfig: RouteFilteringConfig;
  private changeCallbacks: Set<(config: RouteFilteringConfig) => void> = new Set();
  private readonly storageKey = 'routeFilteringConfig';
  private isInitialized = false;

  constructor() {
    this.currentConfig = createDefaultRouteFilteringConfig();
    // Don't load initial config in constructor to avoid circular dependency
    // It will be loaded lazily on first access
  }

  /**
   * Get current route filtering configuration
   * Lazily initializes configuration on first access
   */
  getRouteFilteringConfig(): RouteFilteringConfig {
    if (!this.isInitialized) {
      this.initializeConfig();
    }
    return { ...this.currentConfig };
  }

  /**
   * Update configuration with partial updates and graceful degradation
   */
  updateConfig(updates: Partial<RouteFilteringConfig>): void {
    const previous = { ...this.currentConfig };
    
    try {
      const merged = mergeRouteFilteringConfig(this.currentConfig, updates);
      
      // Validate the merged configuration
      const validation = this.validateConfig(merged);
      
      if (!validation.isValid) {
        logger.warn('Invalid configuration update attempted', {
          updates,
          errors: validation.errors,
        });
        
        // Use graceful degradation service for invalid configuration
        const fallbackConfig = gracefulDegradationService.handleInvalidConfiguration(merged);
        this.currentConfig = fallbackConfig;
        
        logger.info('Applied graceful degradation for invalid configuration', {
          original: merged,
          fallback: fallbackConfig,
        });
      } else {
        // Apply valid configuration
        this.currentConfig = merged;
        
        // Update circuit breaker for successful configuration update
        gracefulDegradationService.updateCircuitBreaker('configuration-manager', true);
      }
      
      // Persist to storage
      this.persistConfig(this.currentConfig).catch(error => {
        logger.error('Failed to persist configuration', { error });
        
        // Update circuit breaker for persistence failure
        gracefulDegradationService.updateCircuitBreaker('configuration-manager', false);
      });

      // Notify subscribers
      const changeEvent: ConfigChangeEvent = {
        previous,
        current: this.currentConfig,
        changes: updates,
        timestamp: new Date(),
      };

      this.notifyConfigChange(changeEvent);

      logger.info('Configuration updated', {
        changes: updates,
        newConfig: this.currentConfig,
      });
      
    } catch (error) {
      logger.error('Error updating configuration', { error, updates });
      
      // Use graceful degradation for configuration errors
      const fallbackConfig = gracefulDegradationService.handleInvalidConfiguration(updates);
      this.currentConfig = { ...this.currentConfig, ...fallbackConfig };
      
      // Update circuit breaker for configuration error
      gracefulDegradationService.updateCircuitBreaker('configuration-manager', false);
      
      logger.warn('Applied fallback configuration due to update error', {
        error: error.message,
        fallbackConfig: this.currentConfig
      });
    }
  }

  /**
   * Validate configuration values
   */
  validateConfig(config: RouteFilteringConfig): ValidationResult {
    const errors: string[] = [];
    let sanitizedConfig: RouteFilteringConfig | undefined;

    // Validate busyRouteThreshold
    if (!Number.isInteger(config.busyRouteThreshold) || config.busyRouteThreshold < 0) {
      errors.push('busyRouteThreshold must be a non-negative integer');
    } else if (
      config.busyRouteThreshold < CONFIG_VALIDATION_CONSTRAINTS.busyRouteThreshold.min ||
      config.busyRouteThreshold > CONFIG_VALIDATION_CONSTRAINTS.busyRouteThreshold.max
    ) {
      errors.push(
        `busyRouteThreshold must be between ${CONFIG_VALIDATION_CONSTRAINTS.busyRouteThreshold.min} and ${CONFIG_VALIDATION_CONSTRAINTS.busyRouteThreshold.max}`
      );
    }

    // Validate distanceFilterThreshold
    if (!Number.isInteger(config.distanceFilterThreshold) || config.distanceFilterThreshold < 0) {
      errors.push('distanceFilterThreshold must be a non-negative integer');
    } else if (
      config.distanceFilterThreshold < CONFIG_VALIDATION_CONSTRAINTS.distanceFilterThreshold.min ||
      config.distanceFilterThreshold > CONFIG_VALIDATION_CONSTRAINTS.distanceFilterThreshold.max
    ) {
      errors.push(
        `distanceFilterThreshold must be between ${CONFIG_VALIDATION_CONSTRAINTS.distanceFilterThreshold.min} and ${CONFIG_VALIDATION_CONSTRAINTS.distanceFilterThreshold.max}`
      );
    }

    // Validate boolean fields
    if (typeof config.enableDebugLogging !== 'boolean') {
      errors.push('enableDebugLogging must be a boolean');
    }

    if (typeof config.performanceMonitoring !== 'boolean') {
      errors.push('performanceMonitoring must be a boolean');
    }

    // Create sanitized config if there are validation errors
    if (errors.length > 0) {
      sanitizedConfig = this.sanitizeConfig(config);
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedConfig,
    };
  }

  /**
   * Persist configuration to storage
   */
  async persistConfig(config: RouteFilteringConfig): Promise<void> {
    try {
      // Use a safer approach to access the store
      const { useConfigStore } = await import('../stores/configStore');
      const configStore = useConfigStore.getState();
      const currentUserConfig = configStore.config || {};
      
      // Add route filtering config to user config
      const updatedUserConfig = {
        ...currentUserConfig,
        routeFilteringConfig: config,
      };

      configStore.updateConfig(updatedUserConfig);
      
      logger.debug('Configuration persisted successfully', { config });
    } catch (error) {
      logger.error('Failed to persist configuration', { error, config });
      throw new Error(`Configuration persistence failed: ${error}`);
    }
  }

  /**
   * Load persisted configuration from storage
   */
  async loadPersistedConfig(): Promise<RouteFilteringConfig> {
    try {
      // Use a safer approach to access the store
      const { useConfigStore } = await import('../stores/configStore');
      const configStore = useConfigStore.getState();
      const userConfig = configStore.config;
      
      if (userConfig && (userConfig as any).routeFilteringConfig) {
        const storedConfig = (userConfig as any).routeFilteringConfig;
        
        // Validate stored configuration
        if (isRouteFilteringConfig(storedConfig)) {
          const validation = this.validateConfig(storedConfig);
          
          if (validation.isValid) {
            logger.debug('Loaded valid configuration from storage', { config: storedConfig });
            return storedConfig;
          } else {
            logger.warn('Stored configuration is invalid, using sanitized version', {
              errors: validation.errors,
              sanitized: validation.sanitizedConfig,
            });
            return validation.sanitizedConfig || createDefaultRouteFilteringConfig();
          }
        }
      }
      
      logger.debug('No valid stored configuration found, using defaults');
      return createDefaultRouteFilteringConfig();
    } catch (error) {
      logger.error('Failed to load persisted configuration', { error });
      return createDefaultRouteFilteringConfig();
    }
  }

  /**
   * Reset configuration to defaults
   */
  resetToDefaults(): void {
    const previous = { ...this.currentConfig };
    this.currentConfig = createDefaultRouteFilteringConfig();
    
    // Persist defaults
    this.persistConfig(this.currentConfig).catch(error => {
      logger.error('Failed to persist default configuration', { error });
    });

    // Notify subscribers
    const changeEvent: ConfigChangeEvent = {
      previous,
      current: this.currentConfig,
      changes: this.currentConfig,
      timestamp: new Date(),
    };

    this.notifyConfigChange(changeEvent);

    logger.info('Configuration reset to defaults', { config: this.currentConfig });
  }

  /**
   * Subscribe to configuration changes
   */
  onConfigChange(callback: (config: RouteFilteringConfig) => void): () => void {
    this.changeCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.changeCallbacks.delete(callback);
    };
  }

  /**
   * Load initial configuration on startup
   */
  private async loadInitialConfig(): Promise<void> {
    try {
      this.currentConfig = await this.loadPersistedConfig();
      logger.info('Initial configuration loaded', { config: this.currentConfig });
    } catch (error) {
      logger.error('Failed to load initial configuration, using defaults', { error });
      this.currentConfig = createDefaultRouteFilteringConfig();
    }
  }

  /**
   * Initialize configuration lazily to avoid circular dependencies
   */
  private initializeConfig(): void {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;
    
    // Load configuration asynchronously without blocking
    this.loadInitialConfig().catch(error => {
      logger.error('Failed to initialize configuration', { error });
    });
  }

  /**
   * Sanitize invalid configuration by applying defaults
   */
  private sanitizeConfig(config: RouteFilteringConfig): RouteFilteringConfig {
    const sanitized = { ...config };

    // Sanitize busyRouteThreshold
    if (
      !Number.isInteger(config.busyRouteThreshold) ||
      config.busyRouteThreshold < CONFIG_VALIDATION_CONSTRAINTS.busyRouteThreshold.min ||
      config.busyRouteThreshold > CONFIG_VALIDATION_CONSTRAINTS.busyRouteThreshold.max
    ) {
      sanitized.busyRouteThreshold = CONFIG_VALIDATION_CONSTRAINTS.busyRouteThreshold.default;
    }

    // Sanitize distanceFilterThreshold
    if (
      !Number.isInteger(config.distanceFilterThreshold) ||
      config.distanceFilterThreshold < CONFIG_VALIDATION_CONSTRAINTS.distanceFilterThreshold.min ||
      config.distanceFilterThreshold > CONFIG_VALIDATION_CONSTRAINTS.distanceFilterThreshold.max
    ) {
      sanitized.distanceFilterThreshold = CONFIG_VALIDATION_CONSTRAINTS.distanceFilterThreshold.default;
    }

    // Sanitize boolean fields
    if (typeof config.enableDebugLogging !== 'boolean') {
      sanitized.enableDebugLogging = DEFAULT_ROUTE_FILTERING_CONFIG.enableDebugLogging;
    }

    if (typeof config.performanceMonitoring !== 'boolean') {
      sanitized.performanceMonitoring = DEFAULT_ROUTE_FILTERING_CONFIG.performanceMonitoring;
    }

    return sanitized;
  }

  /**
   * Notify all subscribers of configuration changes
   */
  private notifyConfigChange(changeEvent: ConfigChangeEvent): void {
    this.changeCallbacks.forEach(callback => {
      try {
        callback(changeEvent.current);
      } catch (error) {
        logger.error('Error in configuration change callback', { error });
      }
    });
  }
}

/**
 * Singleton instance of the configuration manager
 */
export const routeFilteringConfigurationManager = new RouteFilteringConfigurationManager();

/**
 * Factory function to create a new configuration manager instance
 */
export function createRouteFilteringConfigurationManager(): RouteFilteringConfigurationManager {
  return new RouteFilteringConfigurationManager();
}