import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useConfigStore, useVehicleStore, useLocationStore } from '../../stores';

// Mock localStorage for testing
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

// Mock btoa/atob for encryption
Object.defineProperty(window, 'btoa', {
  value: vi.fn((str: string) => Buffer.from(str).toString('base64')),
});

Object.defineProperty(window, 'atob', {
  value: vi.fn((str: string) => Buffer.from(str, 'base64').toString()),
});

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
};

Object.defineProperty(navigator, 'geolocation', {
  value: mockGeolocation,
});

describe('Store Integration Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Reset all stores
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

  it('should export all stores correctly', () => {
    expect(useConfigStore).toBeDefined();
    expect(useVehicleStore).toBeDefined();
    expect(useLocationStore).toBeDefined();
  });

  it('should allow stores to work together', () => {
    // Test configuration store
    const configStore = useConfigStore.getState();
    configStore.updateConfig({
      city: 'Cluj-Napoca',
      homeLocation: { latitude: 46.7712, longitude: 23.6236 },
      workLocation: { latitude: 46.7833, longitude: 23.6167 },
      apiKey: 'test-api-key',
      refreshRate: 30000,
    });

    expect(useConfigStore.getState().isConfigured).toBe(true);

    // Test favorites management in config store
    configStore.addFavoriteRoute({
      id: '24',
      shortName: '24',
      longName: 'Zorilor',
      direction: 'work',
    });
    configStore.addFavoriteStation('station-1');

    expect(configStore.getFavoriteRoutes().some(route => route.id === '24')).toBe(true);
    expect(configStore.getFavoriteStations()).toContain('station-1');

    // Test location store
    const locationStore = useLocationStore.getState();
    const distance = locationStore.calculateDistance(
      { latitude: 46.7712, longitude: 23.6236 },
      { latitude: 46.7833, longitude: 23.6167 }
    );

    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(10); // Should be less than 10km for Cluj
  });
});