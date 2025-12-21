/**
 * Tests for new data fetching methods in VehicleStore
 * These methods replace the data hooks functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useVehicleStore } from './vehicleStore';
import { useConfigStore } from './configStore';

// Mock the enhanced API service
vi.mock('../services/api/tranzyApiService', () => ({
  enhancedTranzyApi: {
    setApiKey: vi.fn(),
    getStops: vi.fn(),
    getVehicles: vi.fn(),
    getRoutes: vi.fn(),
    getStopTimes: vi.fn(),
  }
}));

// Mock the config store
vi.mock('./configStore', () => ({
  useConfigStore: {
    getState: vi.fn(() => ({
      config: {
        agencyId: '2',
        apiKey: 'test-api-key',
        city: 'Cluj-Napoca'
      }
    }))
  }
}));

// Mock StoreErrorHandler to avoid retry delays in tests
vi.mock('./shared/errorHandler', () => ({
  StoreErrorHandler: {
    withRetry: vi.fn().mockImplementation(async (operation) => {
      // Execute operation once without retries for fast tests
      return await operation();
    }),
    createError: vi.fn().mockImplementation((error) => ({
      type: 'network',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
      retryable: true,
    })),
    createContext: vi.fn().mockImplementation((storeName, operation, metadata) => ({
      storeName,
      operation,
      timestamp: new Date(),
      metadata,
    })),
  },
}));

describe('VehicleStore Data Fetching Methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state completely
    useVehicleStore.setState({
      vehicles: [],
      stations: [],
      routes: [],
      stopTimes: [],
      isLoading: false,
      error: null,
      lastUpdated: null,
      refreshInterval: null
    });
    // Clear localStorage to prevent persistence issues
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  describe('getStationData', () => {
    it('should fetch station data successfully', async () => {
      const mockStations = [
        {
          id: '1',
          name: 'Test Station',
          coordinates: { latitude: 46.7712, longitude: 23.6236 },
          isFavorite: false
        }
      ];

      const { enhancedTranzyApi } = await import('../services/api/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getStops).mockResolvedValue(mockStations);

      const store = useVehicleStore.getState();
      const result = await store.getStationData();

      expect(result.data).toEqual(mockStations);
      expect(result.isLoading).toBe(false);
      expect(result.error).toBe(null);
      expect(result.lastUpdated).toBeInstanceOf(Date);
      expect(enhancedTranzyApi.setApiKey).toHaveBeenCalledWith('test-api-key');
      expect(enhancedTranzyApi.getStops).toHaveBeenCalledWith(2, undefined);
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('API Error');
      const { enhancedTranzyApi } = await import('../services/api/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getStops).mockRejectedValue(mockError);

      const store = useVehicleStore.getState();
      const result = await store.getStationData();

      expect(result.data).toBe(null);
      expect(result.isLoading).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.lastUpdated).toBe(null);
    }, 2000); // Reduced timeout for faster failure

    it('should support custom options', async () => {
      const mockStations = [];
      const { enhancedTranzyApi } = await import('../services/api/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getStops).mockResolvedValue(mockStations);

      const store = useVehicleStore.getState();
      await store.getStationData({
        agencyId: '5',
        forceRefresh: true
      });

      expect(enhancedTranzyApi.getStops).toHaveBeenCalledWith(5, true);
    });
  });

  describe('getVehicleData', () => {
    it('should fetch vehicle data successfully', async () => {
      const mockVehicles = [
        {
          id: 'vehicle-1',
          routeId: '1',
          label: 'Bus 42',
          position: { latitude: 46.7712, longitude: 23.6236 },
          timestamp: new Date(),
          speed: 30,
          isWheelchairAccessible: true,
          isBikeAccessible: false
        }
      ];

      const { enhancedTranzyApi } = await import('../services/api/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getVehicles).mockResolvedValue(mockVehicles);

      const store = useVehicleStore.getState();
      const result = await store.getVehicleData();

      expect(result.data).toEqual(mockVehicles);
      expect(result.isLoading).toBe(false);
      expect(result.error).toBe(null);
      expect(result.lastUpdated).toBeInstanceOf(Date);
      expect(enhancedTranzyApi.getVehicles).toHaveBeenCalledWith(2, undefined);
    });

    it('should support route filtering', async () => {
      const mockVehicles = [];
      const { enhancedTranzyApi } = await import('../services/api/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getVehicles).mockResolvedValue(mockVehicles);

      const store = useVehicleStore.getState();
      await store.getVehicleData({
        routeId: '42'
      });

      expect(enhancedTranzyApi.getVehicles).toHaveBeenCalledWith(2, 42);
    });
  });

  describe('getRouteData', () => {
    it('should fetch route data successfully', async () => {
      const mockRoutes = [
        {
          id: '1',
          agencyId: '2',
          routeName: '42',
          routeDesc: 'Mănăștur - Centru',
          type: 'bus' as const
        }
      ];

      const { enhancedTranzyApi } = await import('../services/api/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getRoutes).mockResolvedValue(mockRoutes);

      const store = useVehicleStore.getState();
      const result = await store.getRouteData();

      expect(result.data).toEqual(mockRoutes);
      expect(result.isLoading).toBe(false);
      expect(result.error).toBe(null);
      expect(result.lastUpdated).toBeInstanceOf(Date);
      expect(enhancedTranzyApi.getRoutes).toHaveBeenCalledWith(2, undefined);
    });
  });

  describe('getStopTimesData', () => {
    it('should fetch stop times data successfully', async () => {
      const mockStopTimes = [
        {
          tripId: 'trip-1',
          stopId: '1',
          arrivalTime: '08:30:00',
          departureTime: '08:30:00',
          sequence: 1,
          isPickupAvailable: true,
          isDropOffAvailable: true
        }
      ];

      const { enhancedTranzyApi } = await import('../services/api/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getStopTimes).mockResolvedValue(mockStopTimes);

      const store = useVehicleStore.getState();
      const result = await store.getStopTimesData();

      expect(result.data).toEqual(mockStopTimes);
      expect(result.isLoading).toBe(false);
      expect(result.error).toBe(null);
      expect(result.lastUpdated).toBeInstanceOf(Date);
      expect(enhancedTranzyApi.getStopTimes).toHaveBeenCalledWith(2, undefined, undefined, undefined);
    });

    it('should support filtering by stop and trip', async () => {
      const mockStopTimes = [];
      const { enhancedTranzyApi } = await import('../services/api/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getStopTimes).mockResolvedValue(mockStopTimes);

      const store = useVehicleStore.getState();
      await store.getStopTimesData({
        stopId: '123',
        tripId: 'trip-456'
      });

      expect(enhancedTranzyApi.getStopTimes).toHaveBeenCalledWith(2, 123, 'trip-456', undefined);
    });
  });

  describe('Configuration handling', () => {
    it('should handle missing configuration', async () => {
      // Mock config store to return null config
      const { useConfigStore } = await import('./configStore');
      vi.mocked(useConfigStore.getState).mockReturnValue({
        config: null
      } as any);

      const store = useVehicleStore.getState();
      const result = await store.getStationData();

      expect(result.data).toBe(null);
      expect(result.error).toBeTruthy();
    });

    it('should handle missing API key', async () => {
      // Mock config store to return config without API key
      const { useConfigStore } = await import('./configStore');
      vi.mocked(useConfigStore.getState).mockReturnValue({
        config: {
          agencyId: '2',
          apiKey: null,
          city: 'Cluj-Napoca'
        }
      } as any);

      const store = useVehicleStore.getState();
      const result = await store.getVehicleData();

      expect(result.data).toBe(null);
      expect(result.error).toBeTruthy();
    });
  });
});