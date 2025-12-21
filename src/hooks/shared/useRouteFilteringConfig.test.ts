/**
 * Route Filtering Configuration Hook Tests
 * Tests the React hook for route filtering configuration management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { DEFAULT_ROUTE_FILTERING_CONFIG } from '../../types/routeFiltering';

// Mock the configuration manager
vi.mock('../../services/RouteFilteringConfigurationManager', () => {
  const mockConfigManager = {
    getRouteFilteringConfig: vi.fn(() => DEFAULT_ROUTE_FILTERING_CONFIG),
    updateConfig: vi.fn(),
    resetToDefaults: vi.fn(),
    validateConfig: vi.fn(() => ({ isValid: true, errors: [] })),
    onConfigChange: vi.fn(() => vi.fn()), // Returns unsubscribe function
  };
  
  return {
    routeFilteringConfigurationManager: mockConfigManager,
  };
});

// Mock logger
vi.mock('../../utils/shared/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocking
import { useRouteFilteringConfig, useRouteFilteringConfigValue } from './useRouteFilteringConfig';
import { routeFilteringConfigurationManager } from '../../services/RouteFilteringConfigurationManager';

describe('useRouteFilteringConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial configuration', () => {
    const { result } = renderHook(() => useRouteFilteringConfig());

    expect(result.current.config).toEqual(DEFAULT_ROUTE_FILTERING_CONFIG);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.validationErrors).toEqual([]);
    expect(result.current.isValid).toBe(true);
  });

  it('should provide update function', () => {
    const { result } = renderHook(() => useRouteFilteringConfig());

    act(() => {
      result.current.updateConfig({ busyRouteThreshold: 10 });
    });

    expect(routeFilteringConfigurationManager.updateConfig).toHaveBeenCalledWith({ busyRouteThreshold: 10 });
  });

  it('should provide reset function', () => {
    const { result } = renderHook(() => useRouteFilteringConfig());

    act(() => {
      result.current.resetToDefaults();
    });

    expect(routeFilteringConfigurationManager.resetToDefaults).toHaveBeenCalled();
  });

  it('should provide validate function', () => {
    const { result } = renderHook(() => useRouteFilteringConfig());

    const testConfig = {
      ...DEFAULT_ROUTE_FILTERING_CONFIG,
      busyRouteThreshold: 8,
    };

    act(() => {
      result.current.validateConfig(testConfig);
    });

    expect(routeFilteringConfigurationManager.validateConfig).toHaveBeenCalledWith(testConfig);
  });

  it('should subscribe to configuration changes', () => {
    renderHook(() => useRouteFilteringConfig());

    expect(routeFilteringConfigurationManager.onConfigChange).toHaveBeenCalled();
  });

  it('should handle validation errors', () => {
    // Mock validation with errors
    vi.mocked(routeFilteringConfigurationManager.validateConfig).mockReturnValue({
      isValid: false,
      errors: ['busyRouteThreshold must be positive'],
    });

    const { result } = renderHook(() => useRouteFilteringConfig());

    expect(result.current.isValid).toBe(false);
    expect(result.current.validationErrors).toEqual(['busyRouteThreshold must be positive']);
  });
});

describe('useRouteFilteringConfigValue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return current configuration value', () => {
    const { result } = renderHook(() => useRouteFilteringConfigValue());

    expect(result.current).toEqual(DEFAULT_ROUTE_FILTERING_CONFIG);
  });

  it('should subscribe to configuration changes', () => {
    renderHook(() => useRouteFilteringConfigValue());

    expect(routeFilteringConfigurationManager.onConfigChange).toHaveBeenCalled();
  });
});