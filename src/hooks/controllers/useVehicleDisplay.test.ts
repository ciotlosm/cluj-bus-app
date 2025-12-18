import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVehicleDisplay } from './useVehicleDisplay';
import type { UseVehicleDisplayOptions } from './useVehicleDisplay';

// Mock the stores
vi.mock('../../stores/locationStore', () => ({
  useLocationStore: () => ({
    currentLocation: { latitude: 46.7712, longitude: 23.6236 } // Cluj-Napoca
  })
}));

vi.mock('../../stores/configStore', () => ({
  useConfigStore: () => ({
    config: {
      agencyId: 'test-agency',
      apiKey: 'test-key',
      city: 'Cluj-Napoca'
    },
    getFavoriteRoutes: () => []
  })
}));

// Mock the store-based data hooks (replacing data hooks)
vi.mock('../shared/useStationStoreData', () => ({
  useStationStoreData: () => ({
    data: [
      {
        id: 'station-1',
        name: 'Test Station 1',
        coordinates: { latitude: 46.7712, longitude: 23.6236 }
      }
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    lastUpdated: new Date()
  })
}));

vi.mock('../shared/useVehicleStoreData', () => ({
  useVehicleStoreData: () => ({
    data: [
      {
        id: 'vehicle-1',
        routeId: 'route-1',
        tripId: 'trip-1',
        label: 'Bus 101',
        position: { latitude: 46.7712, longitude: 23.6236 },
        timestamp: new Date()
      }
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    lastUpdated: new Date()
  })
}));

vi.mock('../shared/useRouteStoreData', () => ({
  useRouteStoreData: () => ({
    data: [
      {
        id: 'route-1',
        routeName: 'Route 1',
        routeDesc: 'Test Route Description'
      }
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    lastUpdated: new Date()
  })
}));

vi.mock('../shared/useStopTimesStoreData', () => ({
  useStopTimesStoreData: () => ({
    data: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    lastUpdated: new Date()
  })
}));

// Mock the processing hooks
vi.mock('../processing/useVehicleFiltering', () => ({
  useVehicleFiltering: (vehicles: any[]) => ({
    filteredVehicles: vehicles,
    filterStats: { total: vehicles.length, filtered: vehicles.length }
  })
}));

vi.mock('../processing/useVehicleGrouping', () => ({
  useVehicleGrouping: (vehicles: any[], stations: any[]) => ({
    stationGroups: stations.map(station => ({
      station: { station, distance: 100 },
      vehicles: vehicles,
      allRoutes: [{ routeId: 'route-1', routeName: 'Route 1', vehicleCount: 1 }]
    })),
    groupingStats: { stationsWithVehicles: 1, totalVehicles: vehicles.length }
  })
}));

describe('useVehicleDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the expected structure', () => {
    const options: UseVehicleDisplayOptions = {
      maxStations: 2,
      maxVehiclesPerStation: 5
    };

    const { result } = renderHook(() => useVehicleDisplay(options));

    expect(result.current).toHaveProperty('stationVehicleGroups');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('isLoadingStations');
    expect(result.current).toHaveProperty('isLoadingVehicles');
    expect(result.current).toHaveProperty('isProcessingVehicles');
    expect(result.current).toHaveProperty('effectiveLocationForDisplay');
    expect(result.current).toHaveProperty('favoriteRoutes');
    expect(result.current).toHaveProperty('allStations');
    expect(result.current).toHaveProperty('vehicles');
    expect(result.current).toHaveProperty('error');
  });

  it('should compose data from multiple hooks', () => {
    const { result } = renderHook(() => useVehicleDisplay());

    expect(result.current.allStations).toHaveLength(1);
    expect(result.current.vehicles).toHaveLength(1);
    expect(result.current.stationVehicleGroups).toHaveLength(1);
  });

  it('should handle loading states correctly', () => {
    const { result } = renderHook(() => useVehicleDisplay());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isLoadingStations).toBe(false);
    expect(result.current.isLoadingVehicles).toBe(false);
  });

  it('should return empty groups when not configured', () => {
    // Mock unconfigured state
    vi.mocked(vi.importActual('../../stores/configStore')).useConfigStore = () => ({
      config: null,
      getFavoriteRoutes: () => []
    });

    const { result } = renderHook(() => useVehicleDisplay());

    expect(result.current.stationVehicleGroups).toHaveLength(0);
  });

  it('should handle favorites mode correctly', () => {
    const options: UseVehicleDisplayOptions = {
      filterByFavorites: true
    };

    const { result } = renderHook(() => useVehicleDisplay(options));

    expect(result.current.favoriteRoutes).toEqual([]);
    expect(result.current.stationVehicleGroups).toHaveLength(0); // No favorites configured
  });

  it('should maintain API compatibility with orchestration hook', () => {
    const { result } = renderHook(() => useVehicleDisplay());

    // Check that the result structure matches the orchestration hook exactly
    const expectedKeys = [
      'stationVehicleGroups',
      'isLoading',
      'isLoadingStations', 
      'isLoadingVehicles',
      'isProcessingVehicles',
      'effectiveLocationForDisplay',
      'favoriteRoutes',
      'allStations',
      'vehicles',
      'error'
    ];

    expectedKeys.forEach(key => {
      expect(result.current).toHaveProperty(key);
    });

    // Check station vehicle group structure
    if (result.current.stationVehicleGroups.length > 0) {
      const group = result.current.stationVehicleGroups[0];
      expect(group).toHaveProperty('station');
      expect(group).toHaveProperty('vehicles');
      expect(group).toHaveProperty('allRoutes');
      expect(group.station).toHaveProperty('station');
      expect(group.station).toHaveProperty('distance');
    }
  });
});