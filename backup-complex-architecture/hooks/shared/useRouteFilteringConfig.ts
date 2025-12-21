/**
 * Route Filtering Configuration Hook
 * React hook for managing route filtering configuration
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { useState, useEffect, useCallback } from 'react';
import { routeFilteringConfigurationManager } from '../../services/business-logic/RouteFilteringConfigurationManager';
import type { RouteFilteringConfig, ValidationResult } from '../../types/routeFiltering';
import { logger } from '../../utils/shared/logger';

/**
 * Hook return type
 */
export interface UseRouteFilteringConfigReturn {
  /** Current configuration */
  config: RouteFilteringConfig;
  
  /** Whether configuration is isLoading */
  isLoading: boolean;
  
  /** Configuration validation errors */
  validationErrors: string[];
  
  /** Update configuration */
  updateConfig: (updates: Partial<RouteFilteringConfig>) => void;
  
  /** Reset to default configuration */
  resetToDefaults: () => void;
  
  /** Validate a configuration object */
  validateConfig: (config: RouteFilteringConfig) => ValidationResult;
  
  /** Whether the current configuration is valid */
  isValid: boolean;
}

/**
 * React hook for route filtering configuration management
 * 
 * @returns Configuration state and management functions
 */
export function useRouteFilteringConfig(): UseRouteFilteringConfigReturn {
  const [config, setConfig] = useState<RouteFilteringConfig>(
    routeFilteringConfigurationManager.getRouteFilteringConfig()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Subscribe to configuration changes
  useEffect(() => {
    const unsubscribe = routeFilteringConfigurationManager.onConfigChange((newConfig) => {
      setConfig(newConfig);
      
      // Validate the new configuration
      const validation = routeFilteringConfigurationManager.validateConfig(newConfig);
      setValidationErrors(validation.errors);
      
      logger.debug('Configuration updated via hook', { 
        config: newConfig, 
        isValid: validation.isValid 
      });
    });

    // Initial validation
    const initialValidation = routeFilteringConfigurationManager.validateConfig(config);
    setValidationErrors(initialValidation.errors);

    return unsubscribe;
  }, [config]);

  /**
   * Update configuration with partial updates
   */
  const updateConfig = useCallback((updates: Partial<RouteFilteringConfig>) => {
    setIsLoading(true);
    
    try {
      routeFilteringConfigurationManager.updateConfig(updates);
      logger.info('Configuration updated via hook', { updates });
    } catch (error) {
      logger.error('Failed to update configuration via hook', { error, updates });
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Reset configuration to defaults
   */
  const resetToDefaults = useCallback(() => {
    setIsLoading(true);
    
    try {
      routeFilteringConfigurationManager.resetToDefaults();
      logger.info('Configuration reset to defaults via hook');
    } catch (error) {
      logger.error('Failed to reset configuration via hook', { error });
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Validate a configuration object
   */
  const validateConfig = useCallback((configToValidate: RouteFilteringConfig): ValidationResult => {
    return routeFilteringConfigurationManager.validateConfig(configToValidate);
  }, []);

  /**
   * Check if current configuration is valid
   */
  const isValid = validationErrors.length === 0;

  return {
    config,
    isLoading,
    validationErrors,
    updateConfig,
    resetToDefaults,
    validateConfig,
    isValid,
  };
}

/**
 * Hook for accessing only the current configuration (read-only)
 * Useful when you only need to read the configuration without updating it
 */
export function useRouteFilteringConfigValue(): RouteFilteringConfig {
  const [config, setConfig] = useState<RouteFilteringConfig>(
    routeFilteringConfigurationManager.getRouteFilteringConfig()
  );

  useEffect(() => {
    const unsubscribe = routeFilteringConfigurationManager.onConfigChange(setConfig);
    return unsubscribe;
  }, []);

  return config;
}