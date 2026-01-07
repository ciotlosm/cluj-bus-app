// Manual Refresh Service Tests
// Tests for coordinated refresh across all stores with network connectivity checks

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { manualRefreshService } from './manualRefreshService';
import { useStatusStore } from '../stores/statusStore';
import { useVehicleStore } from '../stores/vehicleStore';
import { useStationStore } from '../stores/stationStore';
import { useRouteStore } from '../stores/routeStore';
import { useShapeStore } from '../stores/shapeStore';
import { useStopTimeStore } from '../stores/stopTimeStore';
import { useTripStore } from '../stores/tripStore';

// Mock all stores
vi.mock('../stores/statusStore');
vi.mock('../stores/vehicleStore');
vi.mock('../stores/stationStore');
vi.mock('../stores/routeStore');
vi.mock('../stores/shapeStore');
vi.mock('../stores/stopTimeStore');
vi.mock('../stores/tripStore');

describe('ManualRefreshService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset service state
    (manualRefreshService as any).isRefreshing = false;
    (manualRefreshService as any).refreshPromise = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Network Connectivity Checks', () => {
    it('should check network availability before refresh', async () => {
      // Mock network offline
      const mockStatusStore = {
        networkOnline: false,
        apiStatus: 'offline'
      };
      vi.mocked(useStatusStore.getState).mockReturnValue(mockStatusStore as any);

      const result = await manualRefreshService.refreshAllStores();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Network connectivity unavailable');
      expect(result.refreshedStores).toHaveLength(0);
    });

    it('should proceed with refresh when network is available', async () => {
      // Mock network online
      const mockStatusStore = {
        networkOnline: true,
        apiStatus: 'online'
      };
      vi.mocked(useStatusStore.getState).mockReturnValue(mockStatusStore as any);

      // Mock successful store refreshes
      const mockRefreshData = vi.fn().mockResolvedValue(undefined);
      const mockStoreState = {
        refreshData: mockRefreshData,
        isDataFresh: vi.fn().mockReturnValue(false)
      };

      vi.mocked(useVehicleStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useStationStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useRouteStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useShapeStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useStopTimeStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useTripStore.getState).mockReturnValue(mockStoreState as any);

      const result = await manualRefreshService.refreshAllStores();

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.refreshedStores.length).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Execution Prevention', () => {
    it('should prevent concurrent refresh operations', async () => {
      // Mock network online
      const mockStatusStore = {
        networkOnline: true,
        apiStatus: 'online'
      };
      vi.mocked(useStatusStore.getState).mockReturnValue(mockStatusStore as any);

      // Mock slow refresh operation
      const mockRefreshData = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      const mockStoreState = {
        refreshData: mockRefreshData,
        isDataFresh: vi.fn().mockReturnValue(false)
      };

      vi.mocked(useVehicleStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useStationStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useRouteStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useShapeStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useStopTimeStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useTripStore.getState).mockReturnValue(mockStoreState as any);

      // Start first refresh
      const firstRefresh = manualRefreshService.refreshAllStores();
      
      // Start second refresh immediately
      const secondRefresh = manualRefreshService.refreshAllStores();

      // Both should resolve to the same promise
      const [firstResult, secondResult] = await Promise.all([firstRefresh, secondRefresh]);
      
      expect(firstResult).toBe(secondResult);
      expect(manualRefreshService.isRefreshInProgress()).toBe(false);
    });

    it('should track refresh state correctly', async () => {
      // Mock network online
      const mockStatusStore = {
        networkOnline: true,
        apiStatus: 'online'
      };
      vi.mocked(useStatusStore.getState).mockReturnValue(mockStatusStore as any);

      expect(manualRefreshService.isRefreshInProgress()).toBe(false);

      // Mock slow refresh
      const mockRefreshData = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 50))
      );
      const mockStoreState = {
        refreshData: mockRefreshData,
        isDataFresh: vi.fn().mockReturnValue(false)
      };

      vi.mocked(useVehicleStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useStationStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useRouteStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useShapeStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useStopTimeStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useTripStore.getState).mockReturnValue(mockStoreState as any);

      const refreshPromise = manualRefreshService.refreshAllStores();
      
      // Should be in progress during refresh
      expect(manualRefreshService.isRefreshInProgress()).toBe(true);

      await refreshPromise;

      // Should not be in progress after completion
      expect(manualRefreshService.isRefreshInProgress()).toBe(false);
    });
  });

  describe('Store Coordination', () => {
    it('should refresh all stores when all are available', async () => {
      // Mock network online
      const mockStatusStore = {
        networkOnline: true,
        apiStatus: 'online'
      };
      vi.mocked(useStatusStore.getState).mockReturnValue(mockStatusStore as any);

      // Mock successful store refreshes
      const mockRefreshData = vi.fn().mockResolvedValue(undefined);
      const mockStoreState = {
        refreshData: mockRefreshData,
        isDataFresh: vi.fn().mockReturnValue(false)
      };

      vi.mocked(useVehicleStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useStationStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useRouteStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useShapeStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useStopTimeStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useTripStore.getState).mockReturnValue(mockStoreState as any);

      const result = await manualRefreshService.refreshAllStores();

      expect(result.success).toBe(true);
      expect(result.refreshedStores).toContain('vehicles');
      expect(result.refreshedStores).toContain('stations');
      expect(result.refreshedStores).toContain('routes');
      expect(result.refreshedStores).toContain('shapes');
      expect(result.refreshedStores).toContain('stopTimes');
      expect(result.refreshedStores).toContain('trips');
      expect(mockRefreshData).toHaveBeenCalledTimes(6);
    });

    it('should handle individual store failures gracefully', async () => {
      // Mock network online
      const mockStatusStore = {
        networkOnline: true,
        apiStatus: 'online'
      };
      vi.mocked(useStatusStore.getState).mockReturnValue(mockStatusStore as any);

      // Mock mixed success/failure
      const mockSuccessRefresh = vi.fn().mockResolvedValue(undefined);
      const mockFailRefresh = vi.fn().mockRejectedValue(new Error('API Error'));
      
      const mockSuccessState = {
        refreshData: mockSuccessRefresh,
        isDataFresh: vi.fn().mockReturnValue(false)
      };
      const mockFailState = {
        refreshData: mockFailRefresh,
        isDataFresh: vi.fn().mockReturnValue(false)
      };

      vi.mocked(useVehicleStore.getState).mockReturnValue(mockSuccessState as any);
      vi.mocked(useStationStore.getState).mockReturnValue(mockFailState as any);
      vi.mocked(useRouteStore.getState).mockReturnValue(mockSuccessState as any);
      vi.mocked(useShapeStore.getState).mockReturnValue(mockSuccessState as any);
      vi.mocked(useStopTimeStore.getState).mockReturnValue(mockSuccessState as any);
      vi.mocked(useTripStore.getState).mockReturnValue(mockSuccessState as any);

      const result = await manualRefreshService.refreshAllStores();

      expect(result.success).toBe(false);
      expect(result.refreshedStores).toContain('vehicles');
      expect(result.refreshedStores).toContain('routes');
      expect(result.errors.some(error => error.includes('stations'))).toBe(true);
    });

    it('should handle refresh options correctly', async () => {
      // Mock network online
      const mockStatusStore = {
        networkOnline: true,
        apiStatus: 'online'
      };
      vi.mocked(useStatusStore.getState).mockReturnValue(mockStatusStore as any);

      const refreshOrder: string[] = [];
      const mockRefreshData = vi.fn().mockImplementation(async () => {
        // Track the order of refresh calls by checking which store is being called
        const stack = new Error().stack || '';
        if (stack.includes('useVehicleStore')) refreshOrder.push('vehicles');
        else if (stack.includes('useStationStore')) refreshOrder.push('stations');
        else if (stack.includes('useRouteStore')) refreshOrder.push('routes');
        // Add small delay to ensure sequential execution
        await new Promise(resolve => setTimeout(resolve, 1));
      });

      const mockStoreState = {
        refreshData: mockRefreshData,
        isDataFresh: vi.fn().mockReturnValue(false)
      };

      vi.mocked(useVehicleStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useStationStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useRouteStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useShapeStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useStopTimeStore.getState).mockReturnValue(mockStoreState as any);
      vi.mocked(useTripStore.getState).mockReturnValue(mockStoreState as any);

      const result = await manualRefreshService.refreshAllStores({ skipIfFresh: true });

      expect(result.success).toBe(true);
      // Vehicle store should be refreshed first when prioritization is enabled
      expect(result.refreshedStores[0]).toBe('vehicles');
    });
  });

  describe('Vehicle-Only Refresh', () => {
    it('should refresh only vehicle data', async () => {
      // Mock network online
      const mockStatusStore = {
        networkOnline: true,
        apiStatus: 'online'
      };
      vi.mocked(useStatusStore.getState).mockReturnValue(mockStatusStore as any);

      const mockVehicleRefresh = vi.fn().mockResolvedValue(undefined);
      const mockVehicleState = {
        refreshData: mockVehicleRefresh,
        isDataFresh: vi.fn().mockReturnValue(false)
      };

      vi.mocked(useVehicleStore.getState).mockReturnValue(mockVehicleState as any);

      const result = await manualRefreshService.refreshVehicleData();

      expect(result.success).toBe(true);
      expect(result.refreshedStores).toEqual(['vehicles']);
      expect(mockVehicleRefresh).toHaveBeenCalledTimes(1);
    });

    it('should handle vehicle refresh failure', async () => {
      // Mock network online
      const mockStatusStore = {
        networkOnline: true,
        apiStatus: 'online'
      };
      vi.mocked(useStatusStore.getState).mockReturnValue(mockStatusStore as any);

      const mockVehicleRefresh = vi.fn().mockRejectedValue(new Error('Vehicle API Error'));
      const mockVehicleState = {
        refreshData: mockVehicleRefresh,
        isDataFresh: vi.fn().mockReturnValue(false)
      };

      vi.mocked(useVehicleStore.getState).mockReturnValue(mockVehicleState as any);

      const result = await manualRefreshService.refreshVehicleData();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to refresh vehicles: Vehicle API Error');
      expect(result.refreshedStores).toHaveLength(0);
    });
  });

  describe('Skip Fresh Data Option', () => {
    it('should skip stores with fresh data when skipIfFresh is enabled', async () => {
      // Mock network online
      const mockStatusStore = {
        networkOnline: true,
        apiStatus: 'online'
      };
      vi.mocked(useStatusStore.getState).mockReturnValue(mockStatusStore as any);

      const mockRefreshData = vi.fn().mockResolvedValue(undefined);
      const mockFreshState = {
        refreshData: mockRefreshData,
        isDataFresh: vi.fn().mockReturnValue(true) // Fresh data
      };
      const mockStaleState = {
        refreshData: mockRefreshData,
        isDataFresh: vi.fn().mockReturnValue(false) // Stale data
      };

      vi.mocked(useVehicleStore.getState).mockReturnValue(mockFreshState as any);
      vi.mocked(useStationStore.getState).mockReturnValue(mockStaleState as any);
      vi.mocked(useRouteStore.getState).mockReturnValue(mockFreshState as any);
      vi.mocked(useShapeStore.getState).mockReturnValue(mockStaleState as any);
      vi.mocked(useStopTimeStore.getState).mockReturnValue(mockFreshState as any);
      vi.mocked(useTripStore.getState).mockReturnValue(mockStaleState as any);

      const result = await manualRefreshService.refreshAllStores({ skipIfFresh: true });

      expect(result.success).toBe(true);
      expect(result.skippedStores).toContain('vehicles');
      expect(result.skippedStores).toContain('routes');
      expect(result.skippedStores).toContain('stopTimes');
      expect(result.refreshedStores).toContain('stations');
      expect(result.refreshedStores).toContain('shapes');
      expect(result.refreshedStores).toContain('trips');
    });
  });
});