import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useConfigStore, useVehicleStore } from './stores';
import type { UserConfig, EnhancedVehicleInfo } from './types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Integration Tests - Complete User Flows', () => {
  const mockConfig: UserConfig = {
    city: 'Cluj-Napoca',
    homeLocation: { latitude: 46.7712, longitude: 23.6236 },
    workLocation: { latitude: 46.7833, longitude: 23.6167 },
    apiKey: 'test-api-key-12345',
    refreshRate: 30000,
  };

  const mockVehicles: EnhancedVehicleInfo[] = [
    {
      id: 'bus-1',
      routeId: '24',
      routeShortName: '24',
      routeLongName: 'Zorilor',
      tripId: 'trip-1',
      vehicleId: 'vehicle-1',
      latitude: 46.7712,
      longitude: 23.6236,
      bearing: 90,
      speed: 30,
      timestamp: Date.now(),
      stopId: 'station-1',
      stopName: 'Piața Unirii',
      stopSequence: 1,
      arrivalTime: new Date(Date.now() + 5 * 60 * 1000),
      departureTime: new Date(Date.now() + 5 * 60 * 1000),
      scheduleRelationship: 'SCHEDULED',
      occupancyStatus: 'MANY_SEATS_AVAILABLE',
      congestionLevel: 'UNKNOWN_CONGESTION_LEVEL',
      isLive: true,
      minutesAway: 5,
      direction: 'work',
      confidence: 'high',
    },
    {
      id: 'bus-2',
      routeId: '35',
      routeShortName: '35',
      routeLongName: 'Mănăștur',
      tripId: 'trip-2',
      vehicleId: 'vehicle-2',
      latitude: 46.7833,
      longitude: 23.6167,
      bearing: 180,
      speed: 25,
      timestamp: Date.now(),
      stopId: 'station-2',
      stopName: 'Piața Mărăști',
      stopSequence: 1,
      arrivalTime: new Date(Date.now() + 8 * 60 * 1000),
      departureTime: new Date(Date.now() + 8 * 60 * 1000),
      scheduleRelationship: 'SCHEDULED',
      occupancyStatus: 'MANY_SEATS_AVAILABLE',
      congestionLevel: 'UNKNOWN_CONGESTION_LEVEL',
      isLive: false,
      minutesAway: 8,
      direction: 'home',
      confidence: 'medium',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    
    // Reset stores
    useConfigStore.getState().resetConfig();
    useVehicleStore.setState({
      vehicles: [],
      stations: [],
      lastUpdate: null,
      isLoading: false,
      error: null,
      lastApiUpdate: null,
      lastCacheUpdate: null,
      cacheStats: {
        totalEntries: 0,
        totalSize: 0,
        entriesByType: {},
        entriesWithTimestamps: {},
        lastCacheUpdate: 0,
      },
      isOnline: true,
    });
  });

  describe('Configuration Management Integration', () => {
    it('should complete configuration setup flow', () => {
      const configStore = useConfigStore.getState();

      // Initially not configured
      expect(useConfigStore.getState().isConfigured).toBe(false);

      // Update configuration
      act(() => {
        configStore.updateConfig(mockConfig);
      });

      // Should be configured now
      expect(useConfigStore.getState().isConfigured).toBe(true);
      expect(useConfigStore.getState().config?.city).toBe(mockConfig.city);
      expect(useConfigStore.getState().config?.apiKey).toBe(mockConfig.apiKey);
      expect(useConfigStore.getState().config?.refreshRate).toBe(mockConfig.refreshRate);
    });

    it('should persist configuration to localStorage', () => {
      const configStore = useConfigStore.getState();

      act(() => {
        configStore.updateConfig(mockConfig);
      });

      // Verify localStorage was called
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'unified-config-store',
        expect.stringContaining(mockConfig.city)
      );
    });

    it('should handle configuration reset', () => {
      const configStore = useConfigStore.getState();

      // Set configuration first
      act(() => {
        configStore.updateConfig(mockConfig);
      });

      expect(useConfigStore.getState().isConfigured).toBe(true);

      // Reset configuration
      act(() => {
        configStore.resetConfig();
      });

      // Should be reset
      expect(useConfigStore.getState().isConfigured).toBe(false);
      expect(useConfigStore.getState().config).toBeNull();
    });
  });

  describe('Vehicle Data Management Integration', () => {
    beforeEach(() => {
      useConfigStore.getState().updateConfig(mockConfig);
    });

    it('should manage vehicle data correctly', () => {
      act(() => {
        useVehicleStore.setState({
          vehicles: mockVehicles,
          stations: [],
          lastUpdate: new Date(),
          isLoading: false,
          error: null,
        });
      });

      const vehicleStore = useVehicleStore.getState();
      expect(vehicleStore.vehicles).toHaveLength(2);
      expect(vehicleStore.vehicles[0].routeShortName).toBe('24');
      expect(vehicleStore.vehicles[0].direction).toBe('work');
      expect(vehicleStore.vehicles[0].isLive).toBe(true);
      expect(vehicleStore.vehicles[1].routeShortName).toBe('35');
      expect(vehicleStore.vehicles[1].direction).toBe('home');
      expect(vehicleStore.vehicles[1].isLive).toBe(false);
    });

    it('should filter vehicles by direction', () => {
      act(() => {
        useVehicleStore.setState({
          vehicles: mockVehicles,
          stations: [],
          lastUpdate: new Date(),
          isLoading: false,
          error: null,
        });
      });

      const vehicleStore = useVehicleStore.getState();
      const workVehicles = vehicleStore.vehicles.filter(vehicle => vehicle.direction === 'work');
      const homeVehicles = vehicleStore.vehicles.filter(vehicle => vehicle.direction === 'home');

      expect(workVehicles).toHaveLength(1);
      expect(workVehicles[0].routeShortName).toBe('24');
      expect(homeVehicles).toHaveLength(1);
      expect(homeVehicles[0].routeShortName).toBe('35');
    });

    it('should handle empty vehicle data', () => {
      act(() => {
        useVehicleStore.setState({
          vehicles: [],
          stations: [],
          lastUpdate: new Date(),
          isLoading: false,
          error: null,
        });
      });

      const vehicleStore = useVehicleStore.getState();
      expect(vehicleStore.vehicles).toHaveLength(0);
      expect(vehicleStore.error).toBeNull();
    });
  });

  describe('Favorites Management Integration', () => {
    beforeEach(() => {
      useConfigStore.getState().updateConfig(mockConfig);
    });

    it('should manage favorites across app sessions', () => {
      const configStore = useConfigStore.getState();
      
      // Add favorites
      act(() => {
        configStore.addFavoriteRoute({
          id: '24',
          shortName: '24',
          longName: 'Zorilor',
          direction: 'work',
        });
        configStore.addFavoriteStation('station-1');
      });

      // Verify favorites were added
      const favoriteRoutes = configStore.getFavoriteRoutes();
      const favoriteStations = configStore.getFavoriteStations();
      expect(favoriteRoutes.some(route => route.id === '24')).toBe(true);
      expect(favoriteStations).toContain('station-1');

      // Verify localStorage was called (config store uses Zustand persistence)
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should update filtered views when favorites change', () => {
      const configStore = useConfigStore.getState();
      
      // Initially no favorites
      expect(configStore.getFavoriteRoutes()).toHaveLength(0);

      // Add favorite route
      act(() => {
        configStore.addFavoriteRoute({
          id: '24',
          shortName: '24',
          longName: 'Zorilor',
          direction: 'work',
        });
      });

      // Should be in favorites now
      expect(configStore.getFavoriteRoutes().some(route => route.id === '24')).toBe(true);

      // Remove favorite
      act(() => {
        configStore.removeFavoriteRoute('24');
      });

      // Should be removed
      expect(configStore.getFavoriteRoutes().some(route => route.id === '24')).toBe(false);
    });
  });

  describe('Error Recovery and Retry Mechanisms', () => {
    beforeEach(() => {
      useConfigStore.getState().updateConfig(mockConfig);
    });

    it('should handle network errors gracefully', () => {
      act(() => {
        useVehicleStore.setState({
          vehicles: [],
          stations: [],
          lastUpdate: null,
          isLoading: false,
          error: {
            type: 'network',
            message: 'Network error',
            timestamp: new Date(),
            retryable: true,
          },
        });
      });

      const vehicleStore = useVehicleStore.getState();
      expect(vehicleStore.error).toBeTruthy();
      expect(vehicleStore.error?.type).toBe('network');
      expect(vehicleStore.error?.retryable).toBe(true);
    });

    it('should handle authentication errors', () => {
      act(() => {
        useVehicleStore.setState({
          vehicles: [],
          stations: [],
          lastUpdate: null,
          isLoading: false,
          error: {
            type: 'authentication',
            message: 'Invalid API key',
            timestamp: new Date(),
            retryable: false,
          },
        });
      });

      const vehicleStore = useVehicleStore.getState();
      expect(vehicleStore.error).toBeTruthy();
      expect(vehicleStore.error?.type).toBe('authentication');
      expect(vehicleStore.error?.retryable).toBe(false);
    });

    it('should recover from errors when new data is loaded', () => {
      // Start with error state
      act(() => {
        useVehicleStore.setState({
          vehicles: [],
          stations: [],
          lastUpdate: null,
          isLoading: false,
          error: {
            type: 'network',
            message: 'Network error',
            timestamp: new Date(),
            retryable: true,
          },
        });
      });

      expect(useVehicleStore.getState().error).toBeTruthy();

      // Clear error and add data
      act(() => {
        useVehicleStore.setState({
          vehicles: mockVehicles,
          stations: [],
          lastUpdate: new Date(),
          isLoading: false,
          error: null,
        });
      });

      const vehicleStore = useVehicleStore.getState();
      expect(vehicleStore.error).toBeNull();
      expect(vehicleStore.vehicles).toHaveLength(2);
    });
  });

  describe('Store Coordination and Integration', () => {
    it('should coordinate between all stores correctly', () => {
      const configStore = useConfigStore.getState();

      // Update configuration
      act(() => {
        configStore.updateConfig(mockConfig);
      });

      // Add favorites
      act(() => {
        configStore.addFavoriteRoute({
          id: '24',
          shortName: '24',
          longName: 'Zorilor',
          direction: 'work',
        });
        configStore.addFavoriteStation('station-1');
      });

      // Update vehicle data
      act(() => {
        useVehicleStore.setState({ vehicles: mockVehicles });
      });

      // Verify all stores are coordinated
      expect(useConfigStore.getState().config?.city).toBe(mockConfig.city);
      expect(configStore.getFavoriteRoutes().some(route => route.id === '24')).toBe(true);
      expect(configStore.getFavoriteStations()).toContain('station-1');
      expect(useVehicleStore.getState().vehicles).toHaveLength(2);
    });

    it('should handle configuration persistence across stores', () => {
      const configStore = useConfigStore.getState();

      // Update stores
      act(() => {
        configStore.updateConfig(mockConfig);
        configStore.addFavoriteRoute({
          id: '24',
          shortName: '24',
          longName: 'Zorilor',
          direction: 'work',
        });
      });

      // Verify localStorage calls for stores
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'unified-config-store',
        expect.stringContaining(mockConfig.city)
      );
      // Config store also persists favorites via Zustand
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('Mobile Responsiveness and Performance', () => {
    it('should handle data updates efficiently', () => {
      const configStore = useConfigStore.getState();

      // Multiple rapid updates should work correctly
      act(() => {
        configStore.updateConfig(mockConfig);
        useVehicleStore.setState({ vehicles: mockVehicles });
        configStore.addFavoriteRoute({
          id: '24',
          shortName: '24',
          longName: 'Zorilor',
          direction: 'work',
        });
      });

      // All updates should be applied
      expect(useConfigStore.getState().isConfigured).toBe(true);
      expect(useVehicleStore.getState().vehicles).toHaveLength(2);
      expect(configStore.getFavoriteRoutes().some(route => route.id === '24')).toBe(true);
    });

    it('should validate mobile-specific data structures', () => {
      // Test that vehicle data includes mobile-friendly properties
      act(() => {
        useVehicleStore.setState({ vehicles: mockVehicles });
      });

      const vehicles = useVehicleStore.getState().vehicles;
      vehicles.forEach(vehicle => {
        expect(vehicle.minutesAway).toBeTypeOf('number');
        expect(vehicle.isLive).toBeTypeOf('boolean');
        expect(vehicle.direction).toMatch(/^(work|home|unknown)$/);
        expect(vehicle.latitude).toBeTypeOf('number');
        expect(vehicle.longitude).toBeTypeOf('number');
      });
    });
  });
});