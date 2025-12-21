/**
 * Route Filtering Configuration Manager Tests
 * Tests configuration validation, persistence, and change notifications
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RouteFilteringConfigurationManager } from './RouteFilteringConfigurationManager';
import type { RouteFilteringConfig } from '../../types/routeFiltering';
import { DEFAULT_ROUTE_FILTERING_CONFIG } from '../types/routeFiltering';

// Mock the config store
vi.mock('../stores/configStore', () => ({
  useConfigStore: {
    getState: vi.fn(() => ({
      config: null,
      updateConfig: vi.fn(),
    })),
  },
}));

// Mock logger
vi.mock('../utils/shared/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('RouteFilteringConfigurationManager', () => {
  let configManager: RouteFilteringConfigurationManager;

  beforeEach(() => {
    configManager = new RouteFilteringConfigurationManager();
  });

  describe('getRouteFilteringConfig', () => {
    it('should return default configuration initially', () => {
      const config = configManager.getRouteFilteringConfig();
      expect(config).toEqual(DEFAULT_ROUTE_FILTERING_CONFIG);
    });

    it('should return a copy of the configuration', () => {
      const config1 = configManager.getRouteFilteringConfig();
      const config2 = configManager.getRouteFilteringConfig();
      
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different objects
    });
  });

  describe('validateConfig', () => {
    it('should validate a correct configuration', () => {
      const validConfig: RouteFilteringConfig = {
        busyRouteThreshold: 5,
        distanceFilterThreshold: 2000,
        enableDebugLogging: false,
        performanceMonitoring: true,
      };

      const result = configManager.validateConfig(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedConfig).toBeUndefined();
    });

    it('should reject invalid busyRouteThreshold', () => {
      const invalidConfig: RouteFilteringConfig = {
        busyRouteThreshold: -1,
        distanceFilterThreshold: 2000,
        enableDebugLogging: false,
        performanceMonitoring: true,
      };

      const result = configManager.validateConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('busyRouteThreshold must be a non-negative integer');
      expect(result.sanitizedConfig).toBeDefined();
      expect(result.sanitizedConfig!.busyRouteThreshold).toBe(5); // Default value
    });

    it('should reject invalid distanceFilterThreshold', () => {
      const invalidConfig: RouteFilteringConfig = {
        busyRouteThreshold: 5,
        distanceFilterThreshold: 50, // Below minimum
        enableDebugLogging: false,
        performanceMonitoring: true,
      };

      const result = configManager.validateConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('distanceFilterThreshold must be between 100 and 10000');
      expect(result.sanitizedConfig).toBeDefined();
      expect(result.sanitizedConfig!.distanceFilterThreshold).toBe(2000); // Default value
    });

    it('should reject non-boolean values for boolean fields', () => {
      const invalidConfig = {
        busyRouteThreshold: 5,
        distanceFilterThreshold: 2000,
        enableDebugLogging: 'true' as any, // Invalid type
        performanceMonitoring: 1 as any, // Invalid type
      };

      const result = configManager.validateConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('enableDebugLogging must be a boolean');
      expect(result.errors).toContain('performanceMonitoring must be a boolean');
    });

    it('should handle boundary values correctly', () => {
      const boundaryConfig: RouteFilteringConfig = {
        busyRouteThreshold: 1, // Minimum valid value
        distanceFilterThreshold: 100, // Minimum valid value
        enableDebugLogging: true,
        performanceMonitoring: false,
      };

      const result = configManager.validateConfig(boundaryConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration with valid values', () => {
      const updates = {
        busyRouteThreshold: 10,
        enableDebugLogging: true,
      };

      configManager.updateConfig(updates);
      
      const config = configManager.getRouteFilteringConfig();
      expect(config.busyRouteThreshold).toBe(10);
      expect(config.enableDebugLogging).toBe(true);
      expect(config.distanceFilterThreshold).toBe(DEFAULT_ROUTE_FILTERING_CONFIG.distanceFilterThreshold);
      expect(config.performanceMonitoring).toBe(DEFAULT_ROUTE_FILTERING_CONFIG.performanceMonitoring);
    });

    it('should reject invalid updates and keep current config', () => {
      const initialConfig = configManager.getRouteFilteringConfig();
      
      const invalidUpdates = {
        busyRouteThreshold: -5,
        distanceFilterThreshold: 50000, // Above maximum
      };

      configManager.updateConfig(invalidUpdates);
      
      // Configuration should remain unchanged for invalid updates
      const config = configManager.getRouteFilteringConfig();
      expect(config.busyRouteThreshold).toBe(initialConfig.busyRouteThreshold);
      expect(config.distanceFilterThreshold).toBe(initialConfig.distanceFilterThreshold);
    });
  });

  describe('resetToDefaults', () => {
    it('should reset configuration to default values', () => {
      // First update to non-default values
      configManager.updateConfig({
        busyRouteThreshold: 15,
        enableDebugLogging: true,
      });

      // Then reset
      configManager.resetToDefaults();
      
      const config = configManager.getRouteFilteringConfig();
      expect(config).toEqual(DEFAULT_ROUTE_FILTERING_CONFIG);
    });
  });

  describe('onConfigChange', () => {
    it('should notify subscribers of configuration changes', () => {
      const callback = vi.fn();
      const unsubscribe = configManager.onConfigChange(callback);

      configManager.updateConfig({ busyRouteThreshold: 8 });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ busyRouteThreshold: 8 })
      );

      // Test unsubscribe
      unsubscribe();
      configManager.updateConfig({ busyRouteThreshold: 12 });
      
      // Callback should not be called again after unsubscribe
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      configManager.onConfigChange(callback1);
      configManager.onConfigChange(callback2);

      configManager.updateConfig({ enableDebugLogging: true });

      expect(callback1).toHaveBeenCalledWith(
        expect.objectContaining({ enableDebugLogging: true })
      );
      expect(callback2).toHaveBeenCalledWith(
        expect.objectContaining({ enableDebugLogging: true })
      );
    });
  });
});