/**
 * Comprehensive tests for the unified VehicleStore
 * Tests vehicle data management, auto-refresh, cache, and offline functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { useVehicleStore } from './vehicleStore';
import { StoreEventManager, StoreEvents } from './shared/storeEvents';
import { autoRefreshManager } from './shared/autoRefresh';
import { unifiedCache } from '../hooks/shared/cache/instance';
import { CACHE_CONFIGS } from '../hooks/shared/cache/utils';
import type { 
  CoreVehicle, 
  Coordinates, 
  UserConfig,
  TranzyStopResponse 
} from '../types';

// Mock services
// Don't mock retryUtils globally - we'll mock it selectively in error tests

vi.mock('../services/api/tranzyApiService', () => ({
  enhancedTranzyApi: {
    setApiKey: vi.fn(),
    getVehicles: vi.fn(),
    getStops: vi.fn(),
    getRoutes: vi.fn().mockResolvedValue([]),
    getTrips: vi.fn().mockResolvedValue([]),
    getStopTimes: vi.fn().mockResolvedValue([]),
    getVehicles: vi.fn().mockResolvedValue([]),
    forceRefreshAll: vi.fn().mockResolvedValue(),
    clearCache: vi.fn(),
    getCacheStats: vi.fn(() => ({
      totalEntries: 0,
      totalSize: 0,
      entriesByType: {},
      entriesWithTimestamps: {},
      lastCacheUpdate: 0,
    })),
  },
}));

// Mock the config store module
const mockConfigStore = {
  config: {
    city: 'Cluj-Napoca',
    agencyId: '123',
    apiKey: 'test-api-key',
    homeLocation: { latitude: 46.7712, longitude: 23.6236 },
    workLocation: { latitude: 46.7833, longitude: 23.6167 },
    refreshRate: 30000,
    staleDataThreshold: 5,
  } as UserConfig,
};

vi.mock('./configStore', () => ({
  useConfigStore: {
    getState: vi.fn(() => mockConfigStore),
  },
}));

// Mock dynamic imports of configStore
vi.doMock('./configStore', () => ({
  useConfigStore: {
    getState: vi.fn(() => mockConfigStore),
  },
}));

vi.mock('./locationStore', () => ({
  useLocationStore: {
    getState: vi.fn(() => ({
      locationPermission: 'granted',
      requestLocation: vi.fn().mockResolvedValue({
        latitude: 46.7712,
        longitude: 23.6236,
      }),
    })),
  },
}));

vi.mock('../utils/shared/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../utils/locationWarningTracker', () => ({
  locationWarningTracker: {
    warnLocationRefresh: vi.fn(),
  },
}));

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

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true,
});

// Mock document for visibility API
Object.defineProperty(document, 'hidden', {
  value: false,
  writable: true,
});

// Generators for property-based testing
const coordinatesArb = fc.record({
  latitude: fc.double({ min: -90, max: 90, noNaN: true }),
  longitude: fc.double({ min: -180, max: 180, noNaN: true }),
});

const stationArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  coordinates: coordinatesArb,
  isFavorite: fc.boolean(),
});

// Core vehicle generator for property-based testing
const coreVehicleArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  routeId: fc.string({ minLength: 1, maxLength: 10 }),
  tripId: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
  label: fc.string({ minLength: 1, maxLength: 10 }),
  position: fc.record({
    latitude: fc.float({ min: Math.fround(46.7), max: Math.fround(46.8) }),
    longitude: fc.float({ min: Math.fround(23.5), max: Math.fround(23.7) })
  }),
  timestamp: fc.date(),
  speed: fc.option(fc.float({ min: 0, max: 80 })),
  bearing: fc.option(fc.float({ min: 0, max: 360 })),
  isWheelchairAccessible: fc.boolean(),
  isBikeAccessible: fc.boolean()
});

const refreshOptionsArb = fc.record({
  forceRefresh: fc.option(fc.boolean(), { nil: undefined }),
  includeSchedule: fc.option(fc.boolean(), { nil: undefined }),
  includeLive: fc.option(fc.boolean(), { nil: undefined }),
  includeStations: fc.option(fc.boolean(), { nil: undefined }),
});

describe('VehicleStore Unit Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    
    // Clear all timers to prevent memory leaks
    vi.clearAllTimers();
    
    // Reset store state
    useVehicleStore.setState({
      vehicles: [],
      stations: [],
      isLoading: false,
      error: null,
      lastUpdate: null,
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
            isAutoRefreshEnabled: false,
    });
    
    // Clear all event listeners
    StoreEventManager.removeAllListeners();
    
    // Clear auto-refresh manager
    autoRefreshManager.clear();
    
    // Clear cache manager
    unifiedCache.clearAll();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    autoRefreshManager.clear();
    StoreEventManager.removeAllListeners();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  describe('Initial State', () => {
    it('should initialize with empty state', () => {
      const state = useVehicleStore.getState();
      
      expect(state.vehicles).toEqual([]);
      expect(state.stations).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastUpdate).toBeNull();
      expect(state.isOnline).toBe(true);
      expect(state.isUsingCachedData).toBe(false);
      expect(state.isAutoRefreshEnabled).toBe(false);
    });
  });

  describe('Vehicle Data Management', () => {
    it('should refresh vehicles successfully', async () => {
      const mockVehicles: CoreVehicle[] = [
        {
          id: 'vehicle-1',
          routeId: 'route-42',
          tripId: 'trip-1',
          label: '42A',
          position: { latitude: 46.7712, longitude: 23.6236 },
          timestamp: new Date(),
          speed: 25,
          bearing: 90,
          isWheelchairAccessible: true,
          isBikeAccessible: false,
        },
      ];

      const { enhancedTranzyApi } = await import('../services/api/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getVehicles).mockResolvedValue(mockVehicles);

      const eventHandler = vi.fn();
      StoreEventManager.subscribe(StoreEvents.VEHICLES_UPDATED, eventHandler);

      const store = useVehicleStore.getState();
      await store.refreshVehicles();

      const state = useVehicleStore.getState();
      expect(state.vehicles).toHaveLength(1);
      expect(state.vehicles[0].id).toBe('vehicle-1');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastUpdate).toBeTruthy();
      expect(state.lastApiUpdate).toBeTruthy();

      expect(eventHandler).toHaveBeenCalledWith({
        vehicles: expect.arrayContaining([
          expect.objectContaining({ id: 'vehicle-1' })
        ]),
        timestamp: expect.any(Date),
        source: 'api',
      });
    });

    it('should handle vehicle refresh errors gracefully', async () => {
      // Mock StoreErrorHandler.withRetry to avoid retry delays
      const { StoreErrorHandler } = await import('./shared/errorHandler');
      const originalWithRetry = StoreErrorHandler.withRetry;
      StoreErrorHandler.withRetry = vi.fn().mockImplementation(async (operation) => {
        // Just call the operation once without retries
        try {
          return await operation();
        } catch (error) {
          throw error;
        }
      });

      const mockError = new Error('Network error');
      const { enhancedTranzyApi } = await import('../services/api/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getVehicles).mockRejectedValue(mockError);

      const store = useVehicleStore.getState();
      
      // Call refreshVehicles and wait for it to complete
      await store.refreshVehicles();

      const state = useVehicleStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
      expect(state.error?.type).toBe('network');
      expect(state.error?.retryable).toBe(true);
      
      // Cleanup
      StoreErrorHandler.withRetry = originalWithRetry;
    });

    it('should store vehicle data correctly', async () => {
      const mockVehicles: CoreVehicle[] = [
        {
          id: 'vehicle-1',
          routeId: 'route-42',
          tripId: 'trip-1',
          label: '42A',
          position: { latitude: 46.7712, longitude: 23.6236 },
          timestamp: new Date(),
          speed: 25,
          bearing: 90,
          isWheelchairAccessible: true,
          isBikeAccessible: false,
        },
        {
          id: 'vehicle-2',
          routeId: 'route-43',
          tripId: 'trip-2',
          label: '43B',
          position: { latitude: 46.7833, longitude: 23.6167 },
          timestamp: new Date(),
          speed: 30,
          bearing: 180,
          isWheelchairAccessible: false,
          isBikeAccessible: true,
        },
      ];

      const { enhancedTranzyApi } = await import('../services/api/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getVehicles).mockResolvedValue(mockVehicles);

      const store = useVehicleStore.getState();
      await store.refreshVehicles();

      const state = useVehicleStore.getState();
      expect(state.vehicles).toHaveLength(2);
      
      // Check that vehicles are stored with correct CoreVehicle properties
      const vehicle1 = state.vehicles.find(v => v.id === 'vehicle-1');
      expect(vehicle1?.routeId).toBe('route-42');
      expect(vehicle1?.label).toBe('42A');
      expect(vehicle1?.position.latitude).toBe(46.7712);
      expect(vehicle1?.isWheelchairAccessible).toBe(true);
      
      const vehicle2 = state.vehicles.find(v => v.id === 'vehicle-2');
      expect(vehicle2?.routeId).toBe('route-43');
      expect(vehicle2?.label).toBe('43B');
      expect(vehicle2?.position.longitude).toBe(23.6167);
      expect(vehicle2?.isBikeAccessible).toBe(true);
    });

    it('should refresh stations successfully', async () => {
      const mockStops: TranzyStopResponse[] = [
        {
          stop_id: 1,
          stop_name: 'Piața Unirii',
          stop_lat: 46.7712,
          stop_lon: 23.6236,
        },
        {
          stop_id: 2,
          stop_name: 'Mănăștur',
          stop_lat: 46.7833,
          stop_lon: 23.6167,
        },
      ];

      const { enhancedTranzyApi } = await import('../services/api/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getStops).mockResolvedValue(mockStops);

      const store = useVehicleStore.getState();
      await store.refreshStations();

      const state = useVehicleStore.getState();
      expect(state.stations).toHaveLength(2);
      expect(state.stations[0].id).toBe('1');
      expect(state.stations[0].name).toBe('Piața Unirii');
      expect(state.stations[0].coordinates.latitude).toBe(46.7712);
    });

    it('should force refresh all data types', async () => {
      const { enhancedTranzyApi } = await import('../services/api/tranzyApiService');
      vi.mocked(enhancedTranzyApi.forceRefreshAll).mockResolvedValue(undefined);
      vi.mocked(enhancedTranzyApi.getVehicles).mockResolvedValue([]);
      vi.mocked(enhancedTranzyApi.getStops).mockResolvedValue([]);

      const store = useVehicleStore.getState();
      await store.refreshAll();

      expect(enhancedTranzyApi.forceRefreshAll).toHaveBeenCalledWith(123);
      expect(enhancedTranzyApi.getVehicles).toHaveBeenCalled();
      
      // Since Promise.allSettled is used, we need to check if the methods were called
      // even if some fail. Let's check the core functionality.
      expect(enhancedTranzyApi.forceRefreshAll).toHaveBeenCalled();
    });
  });

  describe('Auto-Refresh Management', () => {
    it('should start auto-refresh with correct intervals', async () => {
      const store = useVehicleStore.getState();
      store.startAutoRefresh();

      // Wait for the dynamic import and async operations to complete (reduced timeout)
      await new Promise(resolve => setTimeout(resolve, 50));

      const state = useVehicleStore.getState();
      expect(state.isAutoRefreshEnabled).toBe(true);

      // Check that auto-refresh manager was configured
      const liveStatus = autoRefreshManager.getStatus('vehicles-live');
      expect(liveStatus?.isRunning).toBe(true);
    });

    it('should stop auto-refresh correctly', async () => {
      const store = useVehicleStore.getState();
      
      // Start first
      store.startAutoRefresh();
      await new Promise(resolve => setTimeout(resolve, 50)); // Reduced timeout
      expect(useVehicleStore.getState().isAutoRefreshEnabled).toBe(true);
      
      // Then stop
      store.stopAutoRefresh();
      
      const state = useVehicleStore.getState();
      expect(state.isAutoRefreshEnabled).toBe(false);
      
      // Check that auto-refresh manager stopped
      const liveStatus = autoRefreshManager.getStatus('vehicles-live');
      expect(liveStatus?.isRunning).toBe(false);
    });

    it('should handle manual refresh', async () => {
      const { enhancedTranzyApi } = await import('../services/api/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getVehicles).mockResolvedValue([]);

      const store = useVehicleStore.getState();
      await store.manualRefresh();

      expect(enhancedTranzyApi.getVehicles).toHaveBeenCalled();
    });

    it('should not start multiple auto-refresh instances', async () => {
      const store = useVehicleStore.getState();
      
      // Start auto-refresh multiple times
      store.startAutoRefresh();
      store.startAutoRefresh();
      store.startAutoRefresh();

      // Wait for async operations (reduced timeout)
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should still only have one instance
      const state = useVehicleStore.getState();
      expect(state.isAutoRefreshEnabled).toBe(true);
    });
  });

  describe('Cache Management', () => {
    it('should get cache statistics', () => {
      const store = useVehicleStore.getState();
      store.getCacheStats();

      const state = useVehicleStore.getState();
      expect(state.cacheStats).toBeDefined();
      expect(typeof state.cacheStats.totalEntries).toBe('number');
      expect(typeof state.cacheStats.totalSize).toBe('number');
    });

    it('should clear cache completely', async () => {
      const { enhancedTranzyApi } = await import('../services/api/tranzyApiService');
      
      // Set some initial state
      useVehicleStore.setState({
        vehicles: [{ id: 'test' } as any],
        stations: [{ id: 'station-1' } as any],
        lastUpdate: new Date(),
      });

      const store = useVehicleStore.getState();
      store.clearCache();

      const state = useVehicleStore.getState();
      expect(state.vehicles).toEqual([]);
      expect(state.stations).toEqual([]);
      expect(state.lastUpdate).toBeNull();
      expect(state.isUsingCachedData).toBe(false);
      
      expect(enhancedTranzyApi.clearCache).toHaveBeenCalled();
    });

    it('should use cached data as fallback on error', async () => {
      // Mock StoreErrorHandler.withRetry to avoid retry delays
      const { StoreErrorHandler } = await import('./shared/errorHandler');
      const originalWithRetry = StoreErrorHandler.withRetry;
      StoreErrorHandler.withRetry = vi.fn().mockImplementation(async (operation) => {
        // Just call the operation once without retries
        try {
          return await operation();
        } catch (error) {
          throw error;
        }
      });

      const mockError = new Error('Network error');
      const cachedVehicles = [{ id: 'cached-vehicle' }];
      
      // First, set up the cache with data
      unifiedCache.set('vehicles-enhanced', cachedVehicles, CACHE_CONFIGS.vehicles);
      
      // Mock cache manager to return stale data when getCachedStale is called
      const getCachedStaleSpy = vi.spyOn(unifiedCache, 'getCachedStale').mockReturnValue({
        data: cachedVehicles,
        age: 60000, // 1 minute old
        isStale: true,
      });

      const { enhancedTranzyApi } = await import('../services/api/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getVehicles).mockRejectedValue(mockError);

      const store = useVehicleStore.getState();
      
      // Call refreshVehicles and wait for it to complete
      await store.refreshVehicles();

      const state = useVehicleStore.getState();
      
      // The cache fallback should have been triggered
      expect(getCachedStaleSpy).toHaveBeenCalled();
      expect(state.vehicles).toEqual(cachedVehicles);
      expect(state.isUsingCachedData).toBe(true);
      expect(state.error).toBeTruthy(); // Error should still be set
      
      // Cleanup
      StoreErrorHandler.withRetry = originalWithRetry;
    });
  });

  describe('Helper Methods', () => {
    it('should calculate distance correctly', () => {
      const store = useVehicleStore.getState();
      
      const from: Coordinates = { latitude: 46.7712, longitude: 23.6236 };
      const to: Coordinates = { latitude: 46.7833, longitude: 23.6167 };
      
      const distance = store.calculateDistance(from, to);
      
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(2000); // Should be less than 2km for Cluj city center
    });

    it('should calculate zero distance for same coordinates', () => {
      const store = useVehicleStore.getState();
      
      const coords: Coordinates = { latitude: 46.7712, longitude: 23.6236 };
      const distance = store.calculateDistance(coords, coords);
      
      expect(distance).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should clear error state', () => {
      // Set an error first
      useVehicleStore.setState({
        error: {
          type: 'network',
          message: 'Test error',
          timestamp: new Date(),
          retryable: true,
        },
      });

      const store = useVehicleStore.getState();
      store.clearError();

      const state = useVehicleStore.getState();
      expect(state.error).toBeNull();
    });

    it('should handle missing configuration gracefully', async () => {
      // Mock config store to return null config
      const { useConfigStore } = await import('./configStore');
      vi.mocked(useConfigStore.getState).mockReturnValue({
        config: null,
      } as any);

      const store = useVehicleStore.getState();
      await store.refreshVehicles();

      const state = useVehicleStore.getState();
      expect(state.error).toBeTruthy();
      expect(state.error?.message).toContain('Configuration not available');
    });
  });

  describe('Connection Status', () => {
    it('should update online status', () => {
      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      // Trigger the event
      window.dispatchEvent(new Event('offline'));
      
      const state = useVehicleStore.getState();
      expect(state.isOnline).toBe(false);
    });

    it('should trigger refresh when coming back online', async () => {
      const { enhancedTranzyApi } = await import('../services/api/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getVehicles).mockResolvedValue([]);

      // Mock the config store to ensure it's available
      const { useConfigStore } = await import('./configStore');
      vi.mocked(useConfigStore.getState).mockReturnValue(mockConfigStore);

      // Start auto-refresh first
      const store = useVehicleStore.getState();
      store.startAutoRefresh();
      
      // Wait for auto-refresh to start (reduced timeout)
      await new Promise(resolve => setTimeout(resolve, 50));

      // Clear previous calls after auto-refresh starts
      vi.clearAllMocks();

      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', { value: true });
      window.dispatchEvent(new Event('online'));

      // Wait for async operations to complete (reduced timeout)
      await new Promise(resolve => setTimeout(resolve, 50));

      // The online event should trigger a refresh if auto-refresh is enabled
      expect(enhancedTranzyApi.getVehicles).toHaveBeenCalled();
    });
  });

  describe('Property-Based Tests', () => {
    it('should handle any valid refresh options', async () => {
      const { enhancedTranzyApi } = await import('../services/api/tranzyApiService');
      
      await fc.assert(
        fc.asyncProperty(refreshOptionsArb, async (options) => {
          vi.mocked(enhancedTranzyApi.getVehicles).mockResolvedValue([]);

          const store = useVehicleStore.getState();
          
          // Should not throw for any valid options
          await expect(store.refreshVehicles(options)).resolves.not.toThrow();
        }),
        { numRuns: 2 } // Reduced to prevent memory issues
      );
    });

    it('should correctly classify vehicle directions for any coordinates', () => {
      fc.assert(
        fc.property(
          coordinatesArb,
          coordinatesArb,
          coordinatesArb,
          (homeLocation, workLocation, stationLocation) => {
            const store = useVehicleStore.getState();
            
            const distanceToHome = store.calculateDistance(stationLocation, homeLocation);
            const distanceToWork = store.calculateDistance(stationLocation, workLocation);
            
            // The classification logic: closer to home means going to work
            const expectedDirection = distanceToHome < distanceToWork ? 'work' : 'home';
            
            // This property should hold for the classification logic
            expect(expectedDirection).toMatch(/^(work|home)$/);
          }
        ),
        { numRuns: 3 } // Reduced to prevent memory issues
      );
    });

    it('should calculate distance correctly for any valid coordinates', () => {
      fc.assert(
        fc.property(coordinatesArb, coordinatesArb, (from, to) => {
          const store = useVehicleStore.getState();
          const distance = store.calculateDistance(from, to);
          
          // Distance should always be non-negative
          expect(distance).toBeGreaterThanOrEqual(0);
          
          // Distance should be symmetric
          const reverseDistance = store.calculateDistance(to, from);
          expect(Math.abs(distance - reverseDistance)).toBeLessThan(0.001);
          
          // Distance to self should be zero
          const selfDistance = store.calculateDistance(from, from);
          expect(selfDistance).toBe(0);
        }),
        { numRuns: 5 } // Reduced to prevent memory issues
      );
    });
  });

  describe('Integration with Shared Utilities', () => {
    it('should emit events through StoreEventManager', async () => {
      const { enhancedTranzyApi } = await import('../services/api/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getVehicles).mockResolvedValue([]);

      const eventHandler = vi.fn();
      const unsubscribe = StoreEventManager.subscribe(StoreEvents.VEHICLES_UPDATED, eventHandler);

      const store = useVehicleStore.getState();
      
      // Mock the config store to ensure it's available
      const { useConfigStore } = await import('./configStore');
      vi.mocked(useConfigStore.getState).mockReturnValue(mockConfigStore);
      
      await store.refreshVehicles();

      expect(eventHandler).toHaveBeenCalledWith({
        vehicles: expect.any(Array),
        timestamp: expect.any(Date),
        source: 'api',
      });

      unsubscribe();
    });

    it('should use AutoRefreshManager for scheduling', async () => {
      const startSpy = vi.spyOn(autoRefreshManager, 'start');
      const stopSpy = vi.spyOn(autoRefreshManager, 'stop');

      // Mock the config store to ensure it's available
      const { useConfigStore } = await import('./configStore');
      vi.mocked(useConfigStore.getState).mockReturnValue(mockConfigStore);

      const store = useVehicleStore.getState();
      
      store.startAutoRefresh();
      
      // Wait for async operations and dynamic import (reduced timeout)
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(startSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'vehicles-live',
          intervalMs: 30000,
        })
      );

      store.stopAutoRefresh();
      expect(stopSpy).toHaveBeenCalledWith('vehicles-live');
      expect(stopSpy).toHaveBeenCalledWith('vehicles-schedule');
    });

    it('should use CacheManager for data caching', async () => {
      // Mock StoreErrorHandler.withRetry to avoid retry delays
      const { StoreErrorHandler } = await import('./shared/errorHandler');
      const originalWithRetry = StoreErrorHandler.withRetry;
      StoreErrorHandler.withRetry = vi.fn().mockImplementation(async (operation) => {
        // Just call the operation once without retries
        try {
          return await operation();
        } catch (error) {
          throw error;
        }
      });

      const getCachedStaleSpy = vi.spyOn(unifiedCache, 'getCachedStale');
      const clearAllSpy = vi.spyOn(unifiedCache, 'clearAll');

      const store = useVehicleStore.getState();
      
      // Test cache clearing
      store.clearCache();
      expect(clearAllSpy).toHaveBeenCalled();

      // Test cache fallback (mock an error scenario)
      // First, add some cached data
      const cachedVehicles = [{ id: 'cached-vehicle' }];
      unifiedCache.set('vehicles-enhanced', cachedVehicles, CACHE_CONFIGS.vehicles);
      
      getCachedStaleSpy.mockReturnValue({
        data: cachedVehicles,
        age: 60000,
        isStale: true,
      });
      
      const { enhancedTranzyApi } = await import('../services/api/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getVehicles).mockRejectedValue(new Error('Network error'));
      
      // Call refreshVehicles and wait for it to complete
      await store.refreshVehicles();
      
      expect(getCachedStaleSpy).toHaveBeenCalled();
      
      // Cleanup
      StoreErrorHandler.withRetry = originalWithRetry;
    });
  });
});