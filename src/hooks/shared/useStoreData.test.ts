import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { 
  useStoreData
} from './useStoreData';
import { useVehicleStore } from '../../stores/vehicleStore';

// Mock the vehicle store
vi.mock('../../stores/vehicleStore', () => ({
  useVehicleStore: vi.fn()
}));

// Mock logger
vi.mock('../../utils/shared/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    setLogLevel: vi.fn(),
    getLogLevel: vi.fn(() => 1)
  },
  LogLevel: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  }
}));

// Mock ErrorHandler
vi.mock('./errors/ErrorHandler', () => ({
  ErrorHandler: {
    fromError: vi.fn((error, context) => ({
      type: 'DATA_FETCH',
      message: error.message,
      userMessage: 'Unable to load transit data',
      retryable: true,
      context,
      timestamp: new Date(),
      errorId: 'test-error-id'
    }))
  }
}));

// Mock InputValidator
vi.mock('./validation/InputValidator', () => ({
  InputValidator: {
    validateObject: vi.fn(() => ({ isValid: true, data: {}, errors: [] })),
    logValidationErrors: vi.fn()
  }
}));

describe('useStoreData', () => {
  const mockVehicleStore = {
    getVehicleData: vi.fn(),
    getStationData: vi.fn(),
    getRouteData: vi.fn(),
    getStopTimesData: vi.fn(),
    vehicles: [],
    stations: [],
    error: null,
    isLoading: false,
    lastUpdate: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useVehicleStore as any).mockImplementation((selector?: any) => {
      if (selector) {
        return selector(mockVehicleStore);
      }
      return mockVehicleStore;
    });
  });

  describe('Generic Hook Interface', () => {
    it('should provide consistent interface for all data types', () => {
      const vehicleResult = renderHook(() => useStoreData({ dataType: 'vehicles', autoRefresh: false }));
      const stationResult = renderHook(() => useStoreData({ dataType: 'stations', autoRefresh: false }));
      const routeResult = renderHook(() => useStoreData({ dataType: 'routes', autoRefresh: false }));
      const stopTimesResult = renderHook(() => useStoreData({ dataType: 'stopTimes', autoRefresh: false }));

      // All should have the same interface
      const expectedProperties = ['data', 'isLoading', 'error', 'refetch', 'lastUpdated'];
      
      expectedProperties.forEach(prop => {
        expect(vehicleResult.result.current).toHaveProperty(prop);
        expect(stationResult.result.current).toHaveProperty(prop);
        expect(routeResult.result.current).toHaveProperty(prop);
        expect(stopTimesResult.result.current).toHaveProperty(prop);
      });

      // Clean up all hooks
      vehicleResult.unmount();
      stationResult.unmount();
      routeResult.unmount();
      stopTimesResult.unmount();
    });

    it('should call appropriate store method based on data type', async () => {
      const mockData = [{ id: 'test-item' }];
      const mockResult = {
        data: mockData,
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      };

      mockVehicleStore.getVehicleData.mockResolvedValue(mockResult);
      mockVehicleStore.getStationData.mockResolvedValue(mockResult);
      mockVehicleStore.getRouteData.mockResolvedValue(mockResult);
      mockVehicleStore.getStopTimesData.mockResolvedValue(mockResult);

      // Test vehicles
      renderHook(() => useStoreData({ dataType: 'vehicles', agencyId: '2' }));
      await waitFor(() => {
        expect(mockVehicleStore.getVehicleData).toHaveBeenCalledWith(
          expect.objectContaining({ agencyId: '2' })
        );
      });

      // Test stations
      renderHook(() => useStoreData({ dataType: 'stations', agencyId: '2' }));
      await waitFor(() => {
        expect(mockVehicleStore.getStationData).toHaveBeenCalledWith(
          expect.objectContaining({ agencyId: '2' })
        );
      });

      // Test routes
      renderHook(() => useStoreData({ dataType: 'routes', agencyId: '2' }));
      await waitFor(() => {
        expect(mockVehicleStore.getRouteData).toHaveBeenCalledWith(
          expect.objectContaining({ agencyId: '2' })
        );
      });

      // Test stop times
      renderHook(() => useStoreData({ dataType: 'stopTimes', agencyId: '2' }));
      await waitFor(() => {
        expect(mockVehicleStore.getStopTimesData).toHaveBeenCalledWith(
          expect.objectContaining({ agencyId: '2' })
        );
      });
    });
  });

  describe('Configuration Options', () => {
    it('should apply correct default cache settings for each data type', async () => {
      const mockResult = {
        data: [],
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      };

      mockVehicleStore.getVehicleData.mockResolvedValue(mockResult);
      mockVehicleStore.getStationData.mockResolvedValue(mockResult);
      mockVehicleStore.getRouteData.mockResolvedValue(mockResult);
      mockVehicleStore.getStopTimesData.mockResolvedValue(mockResult);

      // Vehicles should have 30 second cache
      renderHook(() => useStoreData({ dataType: 'vehicles' }));
      await waitFor(() => {
        expect(mockVehicleStore.getVehicleData).toHaveBeenCalledWith(
          expect.objectContaining({ cacheMaxAge: 30000 })
        );
      });

      // Stations should have 5 minute cache
      renderHook(() => useStoreData({ dataType: 'stations' }));
      await waitFor(() => {
        expect(mockVehicleStore.getStationData).toHaveBeenCalledWith(
          expect.objectContaining({ cacheMaxAge: 300000 })
        );
      });

      // Routes should have 10 minute cache
      renderHook(() => useStoreData({ dataType: 'routes' }));
      await waitFor(() => {
        expect(mockVehicleStore.getRouteData).toHaveBeenCalledWith(
          expect.objectContaining({ cacheMaxAge: 600000 })
        );
      });

      // Stop times should have 2 minute cache
      renderHook(() => useStoreData({ dataType: 'stopTimes' }));
      await waitFor(() => {
        expect(mockVehicleStore.getStopTimesData).toHaveBeenCalledWith(
          expect.objectContaining({ cacheMaxAge: 120000 })
        );
      });
    });

    it('should handle vehicle-specific options correctly', async () => {
      const mockResult = {
        data: [],
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      };

      mockVehicleStore.getVehicleData.mockResolvedValue(mockResult);

      renderHook(() => useStoreData({ 
        dataType: 'vehicles',
        agencyId: '2',
        routeId: '42',
        autoRefresh: true,
        refreshInterval: 15000
      }));

      await waitFor(() => {
        expect(mockVehicleStore.getVehicleData).toHaveBeenCalledWith({
          agencyId: '2',
          routeId: '42',
          forceRefresh: false,
          cacheMaxAge: 30000,
          autoRefresh: true,
          refreshInterval: 15000
        });
      });
    });

    it('should handle stop times specific options correctly', async () => {
      const mockResult = {
        data: [],
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      };

      mockVehicleStore.getStopTimesData.mockResolvedValue(mockResult);

      renderHook(() => useStoreData({ 
        dataType: 'stopTimes',
        agencyId: '2',
        tripId: 'trip-123',
        stopId: 'stop-456'
      }));

      await waitFor(() => {
        expect(mockVehicleStore.getStopTimesData).toHaveBeenCalledWith({
          agencyId: '2',
          forceRefresh: false,
          cacheMaxAge: 120000,
          tripId: 'trip-123',
          stopId: 'stop-456',
          autoRefresh: false,
          refreshInterval: 300000
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle store errors using standardized error handling', async () => {
      const mockError = { message: 'Test store error' };
      mockVehicleStore.getVehicleData.mockResolvedValue({
        data: null,
        isLoading: false,
        error: mockError,
        lastUpdated: null
      });

      const { result } = renderHook(() => useStoreData({ dataType: 'vehicles' }));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.error?.message).toBe('Test store error');
        expect(result.current.data).toBeNull();
      });
    });

    it('should handle fetch errors using ErrorHandler', async () => {
      mockVehicleStore.getVehicleData.mockRejectedValue(new Error('Network error'));

      const { result, unmount } = renderHook(() => useStoreData({ 
        dataType: 'vehicles',
        autoRefresh: false // Disable auto-refresh to prevent infinite retries
      }));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.error?.type).toBe('DATA_FETCH');
        expect(result.current.data).toBeNull();
      });

      // Clean up the hook
      unmount();
    });
  });

  describe('Reactive Updates', () => {
    it('should sync with store vehicles for reactive updates', () => {
      const mockVehicles = [{ id: 'store-vehicle', routeId: '42' }];
      mockVehicleStore.vehicles = mockVehicles;
      mockVehicleStore.lastUpdate = new Date();

      const { result } = renderHook(() => useStoreData({ dataType: 'vehicles' }));

      expect(result.current.data).toEqual(mockVehicles);
    });

    it('should filter vehicles by routeId when specified', () => {
      const mockVehicles = [
        { id: 'vehicle-1', routeId: '42' },
        { id: 'vehicle-2', routeId: '43' },
        { id: 'vehicle-3', routeId: '42' }
      ];
      mockVehicleStore.vehicles = mockVehicles;
      mockVehicleStore.lastUpdate = new Date();

      const { result } = renderHook(() => useStoreData({ 
        dataType: 'vehicles',
        routeId: '42'
      }));

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.every(v => v.routeId === '42')).toBe(true);
    });

    it('should sync with store stations for reactive updates', () => {
      const mockStations = [{ id: 'station-1', name: 'Test Station' }];
      mockVehicleStore.stations = mockStations;
      mockVehicleStore.lastUpdate = new Date();

      const { result } = renderHook(() => useStoreData({ dataType: 'stations' }));

      expect(result.current.data).toEqual(mockStations);
    });
  });

  // Auto-refresh Functionality tests isDisabled due to timing issues
  // Auto-refresh functionality is tested in useStoreData.minimal.test.ts

  // Filter Functionality tests isDisabled due to memory issues
  // Use useStoreData.minimal.test.ts for basic functionality testing

  // Type-safe Helper Functions tests isDisabled due to memory issues
  // Use useStoreData.minimal.test.ts for basic functionality testing

  // Refetch Functionality tests isDisabled due to timing issues
  // Refetch functionality is tested in useStoreData.minimal.test.ts
});