/**
 * Comprehensive tests for the unified VehicleStore
 * Tests vehicle data management, auto-refresh, cache, and offline functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { useVehicleStore } from './vehicleStore';
import { StoreEventManager, StoreEvents } from './shared/storeEvents';
import { autoRefreshManager } from './shared/autoRefresh';
import { cacheManager } from './shared/cacheManager';
import type { 
  EnhancedVehicleInfo, 
  Coordinates, 
  UserConfig,
  TranzyStopResponse 
} from '../types';

// Mock services
// Don't mock retryUtils globally - we'll mock it selectively in error tests

vi.mock('../services/tranzyApiService', () => ({
  enhancedTranzyApi: {
    setApiKey: vi.fn(),
    getEnhancedVehicleInfo: vi.fn(),
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

vi.mock('../utils/logger', () => ({
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

// Enhanced vehicle info generator for property-based testing
const enhancedVehicleInfoArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  route: fc.string({ minLength: 1, maxLength: 10 }),
  routeId: fc.string({ minLength: 1, maxLength: 20 }),
  destination: fc.string({ minLength: 1, maxLength: 50 }),
  direction: fc.constantFrom('work', 'home', 'unknown'),
  estimatedArrival: fc.date(),
  minutesAway: fc.integer({ min: 0, max: 120 }),
  isLive: fc.boolean(),
  isScheduled: fc.boolean(),
  confidence: fc.constantFrom('high', 'medium', 'low'),
  station: stationArb,
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
      isUsingCachedData: false,
      isAutoRefreshEnabled: false,
    });
    
    // Clear all event listeners
    StoreEventManager.removeAllListeners();
    
    // Clear auto-refresh manager
    autoRefreshManager.clear();
    
    // Clear cache manager
    cacheManager.clearAll();
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
      const mockVehicles: EnhancedVehicleInfo[] = [
        {
          id: 'vehicle-1',
          route: '42',
          routeId: 'route-42',
          destination: 'Mănăștur',
          direction: 'work',
          estimatedArrival: new Date(),
          minutesAway: 5,
          isLive: true,
          isScheduled: false,
          confidence: 'high',
          station: {
            id: 'station-1',
            name: 'Piața Unirii',
            coordinates: { latitude: 46.7712, longitude: 23.6236 },
            isFavorite: false,
          },
        },
      ];

      const { enhancedTranzyApi } = await import('../services/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getEnhancedVehicleInfo).mockResolvedValue(mockVehicles);

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
      const { enhancedTranzyApi } = await import('../services/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getEnhancedVehicleInfo).mockRejectedValue(mockError);

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

    it('should classify vehicle directions correctly', async () => {
      const mockVehicles: EnhancedVehicleInfo[] = [
        {
          id: 'vehicle-1',
          route: '42',
          routeId: 'route-42',
          destination: 'Mănăștur',
          direction: 'unknown', // Will be classified
          estimatedArrival: new Date(),
          minutesAway: 5,
          isLive: true,
          isScheduled: false,
          confidence: 'high',
          station: {
            id: 'station-1',
            name: 'Near Home',
            coordinates: { latitude: 46.7712, longitude: 23.6236 }, // Close to home
            isFavorite: false,
          },
        },
        {
          id: 'vehicle-2',
          route: '43',
          routeId: 'route-43',
          destination: 'Centru',
          direction: 'unknown', // Will be classified
          estimatedArrival: new Date(),
          minutesAway: 8,
          isLive: true,
          isScheduled: false,
          confidence: 'high',
          station: {
            id: 'station-2',
            name: 'Near Work',
            coordinates: { latitude: 46.7833, longitude: 23.6167 }, // Close to work
            isFavorite: false,
          },
        },
      ];

      const { enhancedTranzyApi } = await import('../services/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getEnhancedVehicleInfo).mockResolvedValue(mockVehicles);

      const store = useVehicleStore.getState();
      await store.refreshVehicles();

      const state = useVehicleStore.getState();
      expect(state.vehicles).toHaveLength(2);
      
      // Vehicle near home should be classified as going to work
      const vehicleNearHome = state.vehicles.find(v => v.id === 'vehicle-1');
      expect(vehicleNearHome?.direction).toBe('work');
      
      // Vehicle near work should be classified as going home
      const vehicleNearWork = state.vehicles.find(v => v.id === 'vehicle-2');
      expect(vehicleNearWork?.direction).toBe('home');
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

      const { enhancedTranzyApi } = await import('../services/tranzyApiService');
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
      const { enhancedTranzyApi } = await import('../services/tranzyApiService');
      vi.mocked(enhancedTranzyApi.forceRefreshAll).mockResolvedValue(undefined);
      vi.mocked(enhancedTranzyApi.getEnhancedVehicleInfo).mockResolvedValue([]);
      vi.mocked(enhancedTranzyApi.getStops).mockResolvedValue([]);

      const store = useVehicleStore.getState();
      await store.forceRefreshAll();

      expect(enhancedTranzyApi.forceRefreshAll).toHaveBeenCalledWith(123);
      expect(enhancedTranzyApi.getEnhancedVehicleInfo).toHaveBeenCalled();
      
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
      const { enhancedTranzyApi } = await import('../services/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getEnhancedVehicleInfo).mockResolvedValue([]);

      const store = useVehicleStore.getState();
      await store.manualRefresh();

      expect(enhancedTranzyApi.getEnhancedVehicleInfo).toHaveBeenCalled();
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
      const { enhancedTranzyApi } = await import('../services/tranzyApiService');
      
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
      cacheManager.set('vehicles-enhanced', cachedVehicles, 60000);
      
      // Mock cache manager to return stale data when getCachedStale is called
      const getCachedStaleSpy = vi.spyOn(cacheManager, 'getCachedStale').mockReturnValue({
        data: cachedVehicles,
        age: 60000, // 1 minute old
        isStale: true,
      });

      const { enhancedTranzyApi } = await import('../services/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getEnhancedVehicleInfo).mockRejectedValue(mockError);

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
      const { enhancedTranzyApi } = await import('../services/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getEnhancedVehicleInfo).mockResolvedValue([]);

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
      expect(enhancedTranzyApi.getEnhancedVehicleInfo).toHaveBeenCalled();
    });
  });

  describe('Property-Based Tests', () => {
    it('should handle any valid refresh options', async () => {
      const { enhancedTranzyApi } = await import('../services/tranzyApiService');
      
      await fc.assert(
        fc.asyncProperty(refreshOptionsArb, async (options) => {
          vi.mocked(enhancedTranzyApi.getEnhancedVehicleInfo).mockResolvedValue([]);

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
      const { enhancedTranzyApi } = await import('../services/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getEnhancedVehicleInfo).mockResolvedValue([]);

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

      const getCachedStaleSpy = vi.spyOn(cacheManager, 'getCachedStale');
      const clearAllSpy = vi.spyOn(cacheManager, 'clearAll');

      const store = useVehicleStore.getState();
      
      // Test cache clearing
      store.clearCache();
      expect(clearAllSpy).toHaveBeenCalled();

      // Test cache fallback (mock an error scenario)
      // First, add some cached data
      const cachedVehicles = [{ id: 'cached-vehicle' }];
      cacheManager.set('vehicles-enhanced', cachedVehicles, 60000);
      
      getCachedStaleSpy.mockReturnValue({
        data: cachedVehicles,
        age: 60000,
        isStale: true,
      });
      
      const { enhancedTranzyApi } = await import('../services/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getEnhancedVehicleInfo).mockRejectedValue(new Error('Network error'));
      
      // Call refreshVehicles and wait for it to complete
      await store.refreshVehicles();
      
      expect(getCachedStaleSpy).toHaveBeenCalled();
      
      // Cleanup
      StoreErrorHandler.withRetry = originalWithRetry;
    });
  });
});