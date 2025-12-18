import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVehicleStoreData } from './useVehicleStoreData';
import { useVehicleStore } from '../../stores/vehicleStore';

// Mock the vehicle store
vi.mock('../../stores/vehicleStore', () => ({
  useVehicleStore: vi.fn()
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }
}));

describe('useVehicleStoreData', () => {
  const mockVehicleStore = {
    getVehicleData: vi.fn(),
    vehicles: [],
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

  it('should provide the same interface as original useVehicleData hook', () => {
    const { result } = renderHook(() => useVehicleStoreData());

    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
    expect(result.current).toHaveProperty('lastUpdated');
  });

  it('should call store getVehicleData method on mount', async () => {
    mockVehicleStore.getVehicleData.mockResolvedValue({
      data: [{ id: 'test-vehicle' }],
      isLoading: false,
      error: null,
      lastUpdated: new Date()
    });

    renderHook(() => useVehicleStoreData({ agencyId: '2' }));

    await waitFor(() => {
      expect(mockVehicleStore.getVehicleData).toHaveBeenCalledWith({
        agencyId: '2',
        routeId: undefined,
        forceRefresh: false,
        cacheMaxAge: 30000,
        autoRefresh: true,
        refreshInterval: 30000
      });
    });
  });

  it('should handle store errors correctly', async () => {
    const mockError = { message: 'Test error' };
    mockVehicleStore.getVehicleData.mockResolvedValue({
      data: null,
      isLoading: false,
      error: mockError,
      lastUpdated: null
    });

    const { result } = renderHook(() => useVehicleStoreData());

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Test error');
      expect(result.current.data).toBeNull();
    });
  });

  it('should provide refetch functionality', async () => {
    mockVehicleStore.getVehicleData.mockResolvedValue({
      data: [{ id: 'test-vehicle' }],
      isLoading: false,
      error: null,
      lastUpdated: new Date()
    });

    const { result } = renderHook(() => useVehicleStoreData());

    await waitFor(() => {
      expect(typeof result.current.refetch).toBe('function');
    });

    // Call refetch
    await result.current.refetch();

    // Should call store method again
    expect(mockVehicleStore.getVehicleData).toHaveBeenCalledTimes(2);
  });

  it('should sync with store state changes', () => {
    const mockVehicles = [{ id: 'store-vehicle' }];
    mockVehicleStore.vehicles = mockVehicles;
    mockVehicleStore.lastUpdate = new Date();

    const { result } = renderHook(() => useVehicleStoreData());

    // Should use store vehicles when available
    expect(result.current.data).toEqual(mockVehicles);
  });
});