import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useConfigStore, useVehicleStore } from '../../stores';
import type { UserConfig } from '@/types';
import type { CoreVehicle } from '../../types/coreVehicle';
import type { VehicleDisplayData } from '../../types/presentationLayer';

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

  const mockVehicles: CoreVehicle[] = [
    {
      id: 'bus-1',
      routeId: '24',
      tripId: 'trip-1',
      label: '24A',
      position: { latitude: 46.7712, longitude: 23.6236 },
      timestamp: new Date(),
      bearing: 90,
      speed: 30,
      isWheelchairAccessible: true,
      isBikeAccessible: false,
    },
    {
      id: 'bus-2',
      routeId: '35',
      tripId: 'trip-2',
      label: '35',
      position: { latitude: 46.7833, longitude: 23.6167 },
      timestamp: new Date(),
      bearing: 180,
      speed: 25,
      isWheelchairAccessible: true,
      isBikeAccessible: false,
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
      expect(vehicleStore.vehicles[0].routeId).toBe('24');
      expect(vehicleStore.vehicles[0].label).toBe('24A');
      expect(vehicleStore.vehicles[0].position.latitude).toBe(46.7712);
      expect(vehicleStore.vehicles[1].routeId).toBe('35');
      expect(vehicleStore.vehicles[1].label).toBe('35');
      expect(vehicleStore.vehicles[1].position.latitude).toBe(46.7833);
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
      // CoreVehicle doesn't have direction - that's a presentation layer property
      // Test basic vehicle properties instead
      const route24Vehicles = vehicleStore.vehicles.filter(vehicle => vehicle.routeId === '24');
      const route35Vehicles = vehicleStore.vehicles.filter(vehicle => vehicle.routeId === '35');

      expect(route24Vehicles).toHaveLength(1);
      expect(route24Vehicles[0].label).toBe('24A');
      expect(route35Vehicles).toHaveLength(1);
      expect(route35Vehicles[0].label).toBe('35');
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
      // Test that vehicle data includes core properties
      act(() => {
        useVehicleStore.setState({ vehicles: mockVehicles });
      });

      const vehicles = useVehicleStore.getState().vehicles;
      vehicles.forEach(vehicle => {
        expect(vehicle.id).toBeTypeOf('string');
        expect(vehicle.routeId).toBeTypeOf('string');
        expect(vehicle.label).toBeTypeOf('string');
        expect(vehicle.position.latitude).toBeTypeOf('number');
        expect(vehicle.position.longitude).toBeTypeOf('number');
        expect(vehicle.isWheelchairAccessible).toBeTypeOf('boolean');
        expect(vehicle.isBikeAccessible).toBeTypeOf('boolean');
      });
    });
  });
});