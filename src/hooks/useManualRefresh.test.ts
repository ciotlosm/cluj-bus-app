// useManualRefresh Hook Tests
// Tests for React hook that provides manual refresh functionality

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useManualRefresh } from './useManualRefresh';
import { manualRefreshService } from '../services/manualRefreshService';

// Mock dependencies
vi.mock('../services/manualRefreshService');
vi.mock('../stores/statusStore', () => ({
  useStatusStore: vi.fn((selector) => {
    const mockState = {
      networkOnline: true,
      apiStatus: 'online'
    };
    return selector ? selector(mockState) : mockState;
  })
}));

describe('useManualRefresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock service methods
    vi.mocked(manualRefreshService.isRefreshInProgress).mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should provide refresh functions', () => {
      const { result } = renderHook(() => useManualRefresh());

      expect(typeof result.current.refreshAll).toBe('function');
      expect(typeof result.current.refreshVehicles).toBe('function');
    });

    it('should call manualRefreshService.refreshAllStores', async () => {
      const mockResult = {
        success: true,
        errors: [],
        refreshedStores: ['vehicles', 'stations'],
        skippedStores: []
      };

      vi.mocked(manualRefreshService.refreshAllStores).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useManualRefresh());

      let refreshResult;
      await act(async () => {
        refreshResult = await result.current.refreshAll();
      });

      expect(manualRefreshService.refreshAllStores).toHaveBeenCalledWith(undefined);
      expect(refreshResult).toEqual(mockResult);
    });

    it('should call manualRefreshService.refreshVehicleData', async () => {
      const mockResult = {
        success: true,
        errors: [],
        refreshedStores: ['vehicles'],
        skippedStores: []
      };

      vi.mocked(manualRefreshService.refreshVehicleData).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useManualRefresh());

      let refreshResult;
      await act(async () => {
        refreshResult = await result.current.refreshVehicles();
      });

      expect(manualRefreshService.refreshVehicleData).toHaveBeenCalled();
      expect(refreshResult).toEqual(mockResult);
    });

    it('should handle refresh errors gracefully', async () => {
      const mockErrorResult = {
        success: false,
        errors: ['Network error'],
        refreshedStores: [],
        skippedStores: []
      };
      vi.mocked(manualRefreshService.refreshAllStores).mockResolvedValue(mockErrorResult);

      const { result } = renderHook(() => useManualRefresh());

      let refreshResult;
      await act(async () => {
        refreshResult = await result.current.refreshAll();
      });

      expect(refreshResult).toEqual(mockErrorResult);
    });

    it('should pass options to refreshAllStores', async () => {
      const mockResult = {
        success: true,
        errors: [],
        refreshedStores: ['vehicles'],
        skippedStores: ['stations']
      };

      vi.mocked(manualRefreshService.refreshAllStores).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useManualRefresh());

      const options = { skipIfFresh: true };

      await act(async () => {
        await result.current.refreshAll(options);
      });

      expect(manualRefreshService.refreshAllStores).toHaveBeenCalledWith(options);
    });
  });
});