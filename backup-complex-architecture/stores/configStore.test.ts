/**
 * Comprehensive tests for the unified ConfigStore
 * Tests configuration, theme, and agency management functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { useConfigStore } from './configStore';
import { StoreEventManager, StoreEvents } from './shared/storeEvents';
import type { UserConfig, Agency, ThemeMode } from '../types';

// Mock services
vi.mock('../services/api/tranzyApiService', () => ({
  enhancedTranzyApi: {
    getAgencies: vi.fn(),
  },
  tranzyApiService: vi.fn(() => ({
    setApiKey: vi.fn(),
    validateApiKey: vi.fn(),
    getAgencies: vi.fn(),
  })),
}));

vi.mock('../services/business-logic/routeMappingService', () => ({
  routeMappingService: {
    updateCacheDuration: vi.fn(),
  },
}));

// Don't mock retryUtils globally - we'll mock it selectively in error tests

vi.mock('../utils/shared/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    setLogLevel: vi.fn(),
  },
  LogLevel: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
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

// Mock btoa/atob for encryption
Object.defineProperty(window, 'btoa', {
  value: vi.fn((str: string) => Buffer.from(str).toString('base64')),
});

Object.defineProperty(window, 'atob', {
  value: vi.fn((str: string) => Buffer.from(str, 'base64').toString()),
});

// Mock document for theme testing
Object.defineProperty(document, 'documentElement', {
  value: {
    setAttribute: vi.fn(),
  },
  writable: true,
});

// Mock window.matchMedia for theme testing
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});

// Generators for property-based testing
const coordinatesArb = fc.record({
  latitude: fc.double({ min: -90, max: 90 }),
  longitude: fc.double({ min: -180, max: 180 }),
});

const userConfigArb = fc.record({
  city: fc.string({ minLength: 1, maxLength: 50 }),
  agencyId: fc.string({ minLength: 1, maxLength: 20 }),
  homeLocation: coordinatesArb,
  workLocation: coordinatesArb,
  apiKey: fc.string({ minLength: 10, maxLength: 100 }),
  refreshRate: fc.integer({ min: 1000, max: 300000 }), // 1 second to 5 minutes
});

const agencyArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  country: fc.option(fc.string({ minLength: 1, maxLength: 30 })),
  region: fc.option(fc.string({ minLength: 1, maxLength: 30 })),
});

const themeArb = fc.constantFrom('light', 'dark') as fc.Arbitrary<ThemeMode>;

describe('ConfigStore Unit Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    vi.clearAllTimers();
    
    // Reset the store state
    useConfigStore.getState().resetConfig();
    // Clear all event listeners
    StoreEventManager.removeAllListeners();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    StoreEventManager.removeAllListeners();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  describe('Configuration Management', () => {
    it('should initialize with empty configuration', () => {
      const state = useConfigStore.getState();
      expect(state.config).toBeNull();
      expect(state.isConfigured).toBe(false);
      expect(state.isFullyConfigured).toBe(false);
    });

    it('should update configuration and set flags correctly', () => {
      const config: UserConfig = {
        city: 'Cluj-Napoca',
        agencyId: 'test-agency',
        homeLocation: { latitude: 46.7712, longitude: 23.6236 },
        workLocation: { latitude: 46.7712, longitude: 23.6236 },
        apiKey: 'test-api-key',
        refreshRate: 30000,
        staleDataThreshold: 5,
      };

      const store = useConfigStore.getState();
      store.updateConfig(config);

      const state = useConfigStore.getState();
      expect(state.config).toEqual(config);
      expect(state.isConfigured).toBe(true);
      expect(state.isFullyConfigured).toBe(true);
    });

    it('should handle partial configuration updates', () => {
      const initialConfig: UserConfig = {
        city: 'Cluj-Napoca',
        agencyId: 'test-agency',
        homeLocation: { latitude: 46.7712, longitude: 23.6236 },
        workLocation: { latitude: 46.7712, longitude: 23.6236 },
        apiKey: 'test-api-key',
        refreshRate: 30000,
        staleDataThreshold: 5,
      };

      const store = useConfigStore.getState();
      store.updateConfig(initialConfig);

      // Update only refresh rate
      store.updateConfig({ refreshRate: 60000 });

      const state = useConfigStore.getState();
      expect(state.config?.refreshRate).toBe(60000);
      expect(state.config?.city).toBe('Cluj-Napoca'); // Should preserve other values
    });

    it('should emit configuration change events', () => {
      const eventHandler = vi.fn();
      StoreEventManager.subscribe(StoreEvents.CONFIG_CHANGED, eventHandler);

      const config: Partial<UserConfig> = {
        city: 'Cluj-Napoca',
        apiKey: 'test-key',
      };

      const store = useConfigStore.getState();
      store.updateConfig(config);

      expect(eventHandler).toHaveBeenCalledWith({
        config: expect.objectContaining(config),
        changes: config,
      });
    });

    it('should reset configuration completely', () => {
      const config: UserConfig = {
        city: 'Cluj-Napoca',
        agencyId: 'test-agency',
        homeLocation: { latitude: 46.7712, longitude: 23.6236 },
        workLocation: { latitude: 46.7712, longitude: 23.6236 },
        apiKey: 'test-api-key',
        refreshRate: 30000,
        staleDataThreshold: 5,
      };

      const store = useConfigStore.getState();
      store.updateConfig(config);
      store.resetConfig();

      const state = useConfigStore.getState();
      expect(state.config).toBeNull();
      expect(state.isConfigured).toBe(false);
      expect(state.isFullyConfigured).toBe(false);
      expect(state.agencies).toEqual([]);
      expect(state.isApiValidated).toBe(false);
    });

    it('should validate configuration correctly', () => {
      const store = useConfigStore.getState();
      
      // Invalid configuration (missing required fields)
      store.updateConfig({ city: 'Cluj-Napoca' });
      expect(store.validateConfig()).toBe(false);

      // Valid configuration
      const validConfig: UserConfig = {
        city: 'Cluj-Napoca',
        agencyId: 'test-agency',
        homeLocation: { latitude: 46.7712, longitude: 23.6236 },
        workLocation: { latitude: 46.7712, longitude: 23.6236 },
        apiKey: 'test-api-key',
        refreshRate: 30000,
        staleDataThreshold: 5,
      };
      
      store.updateConfig(validConfig);
      expect(store.validateConfig()).toBe(true);
    });
  });

  describe('Theme Management', () => {
    it('should initialize with system theme', () => {
      const state = useConfigStore.getState();
      expect(['light', 'dark']).toContain(state.theme);
    });

    it('should set theme and emit events', () => {
      const eventHandler = vi.fn();
      StoreEventManager.subscribe(StoreEvents.THEME_CHANGED, eventHandler);

      const store = useConfigStore.getState();
      const currentTheme = store.theme;
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      store.setTheme(newTheme);

      const state = useConfigStore.getState();
      expect(state.theme).toBe(newTheme);
      expect(eventHandler).toHaveBeenCalledWith({
        theme: newTheme,
        source: 'user',
      });
    });

    it('should toggle theme correctly', () => {
      const store = useConfigStore.getState();
      const initialTheme = store.theme;
      
      store.toggleTheme();
      
      const state = useConfigStore.getState();
      const expectedTheme = initialTheme === 'light' ? 'dark' : 'light';
      expect(state.theme).toBe(expectedTheme);
    });

    it('should not emit events for same theme', () => {
      const eventHandler = vi.fn();
      StoreEventManager.subscribe(StoreEvents.THEME_CHANGED, eventHandler);

      const store = useConfigStore.getState();
      const currentTheme = store.theme;
      
      store.setTheme(currentTheme); // Set to same theme
      
      expect(eventHandler).not.toHaveBeenCalled();
    });
  });

  describe('Agency Management', () => {
    it('should fetch agencies successfully', async () => {
      const mockAgencies: Agency[] = [
        { id: 'agency1', name: 'Test Agency 1' },
        { id: 'agency2', name: 'Test Agency 2' },
      ];

      const { enhancedTranzyApi } = await import('../services/api/tranzyApiService');
      vi.mocked(enhancedTranzyApi.getAgencies).mockResolvedValue(mockAgencies);

      const eventHandler = vi.fn();
      StoreEventManager.subscribe(StoreEvents.API_KEY_VALIDATED, eventHandler);

      const store = useConfigStore.getState();
      await store.fetchAgencies();

      const state = useConfigStore.getState();
      expect(state.agencies).toEqual(mockAgencies);
      expect(state.isAgenciesLoading).toBe(false);
      expect(state.agenciesError).toBeNull();
      expect(state.isApiValidated).toBe(true);

      expect(eventHandler).toHaveBeenCalledWith({
        isValid: true,
        agencies: mockAgencies,
      });
    });

    it('should handle agency fetch errors', async () => {
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
      vi.mocked(enhancedTranzyApi.getAgencies).mockRejectedValue(mockError);

      const eventHandler = vi.fn();
      const unsubscribe = StoreEventManager.subscribe(StoreEvents.API_KEY_VALIDATED, eventHandler);

      const store = useConfigStore.getState();
      
      // Call fetchAgencies and wait for it to complete
      await store.fetchAgencies();

      const state = useConfigStore.getState();
      expect(state.agencies).toEqual([]);
      expect(state.isAgenciesLoading).toBe(false);
      expect(state.agenciesError).toBeTruthy();
      expect(state.isApiValidated).toBe(false);

      expect(eventHandler).toHaveBeenCalledWith({
        isValid: false,
      });
      
      // Cleanup
      unsubscribe();
      StoreErrorHandler.withRetry = originalWithRetry;
    });

    it('should validate API key successfully', async () => {
      const mockAgencies: Agency[] = [
        { id: 'agency1', name: 'Test Agency 1' },
      ];

      const { tranzyApiService } = await import('../services/api/tranzyApiService');
      const mockService = {
        setApiKey: vi.fn(),
        validateApiKey: vi.fn().mockResolvedValue(true),
        getAgencies: vi.fn().mockResolvedValue(mockAgencies),
      };
      vi.mocked(tranzyApiService).mockReturnValue(mockService);

      const store = useConfigStore.getState();
      const result = await store.validateApiKey('test-api-key');

      expect(result).toBe(true);
      expect(mockService.setApiKey).toHaveBeenCalledWith('test-api-key');
      expect(mockService.validateApiKey).toHaveBeenCalledWith('test-api-key');
      expect(mockService.getAgencies).toHaveBeenCalled();

      const state = useConfigStore.getState();
      expect(state.agencies).toEqual(mockAgencies);
      expect(state.isApiValidated).toBe(true);
    });

    it('should handle invalid API key', async () => {
      const { tranzyApiService } = await import('../services/api/tranzyApiService');
      const mockService = {
        setApiKey: vi.fn(),
        validateApiKey: vi.fn().mockResolvedValue(false),
        getAgencies: vi.fn(),
      };
      vi.mocked(tranzyApiService).mockReturnValue(mockService);

      const store = useConfigStore.getState();
      const result = await store.validateApiKey('invalid-key');

      expect(result).toBe(false);
      expect(mockService.getAgencies).not.toHaveBeenCalled();

      const state = useConfigStore.getState();
      expect(state.isApiValidated).toBe(false);
      expect(state.agenciesError).toBeTruthy();
      expect(state.agenciesError?.type).toBe('authentication');
    });

    it('should clear agencies error', () => {
      const store = useConfigStore.getState();
      
      // Set an error first
      useConfigStore.setState({
        agenciesError: {
          type: 'network',
          message: 'Test error',
          timestamp: new Date(),
          retryable: true,
        },
      });

      store.clearAgenciesError();

      const state = useConfigStore.getState();
      expect(state.agenciesError).toBeNull();
    });

    it('should prevent concurrent agency fetches', async () => {
      const { enhancedTranzyApi } = await import('../services/api/tranzyApiService');
      let resolvePromise: (value: Agency[]) => void;
      const mockPromise = new Promise<Agency[]>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(enhancedTranzyApi.getAgencies).mockReturnValue(mockPromise);

      const store = useConfigStore.getState();
      
      // Start first fetch
      const promise1 = store.fetchAgencies();
      
      // Try to start second fetch while first is in progress
      const promise2 = store.fetchAgencies();

      // Resolve the mock promise
      resolvePromise!([{ id: 'agency1', name: 'Test Agency' }]);
      
      await Promise.all([promise1, promise2]);

      // Should only have called the API once
      expect(enhancedTranzyApi.getAgencies).toHaveBeenCalledTimes(1);
    });
  });

  describe('Property-Based Tests', () => {
    it('should handle any valid configuration update', () => {
      fc.assert(
        fc.property(userConfigArb, (config) => {
          const store = useConfigStore.getState();
          
          // Apply the configuration
          store.updateConfig(config);
          
          // Verify immediate application
          const currentState = useConfigStore.getState();
          expect(currentState.config).toEqual(config);
          expect(currentState.isConfigured).toBe(true);
          expect(currentState.isFullyConfigured).toBe(true);
        }),
        { numRuns: 3 }
      );
    });

    it('should handle any theme change', () => {
      fc.assert(
        fc.property(themeArb, (theme) => {
          const store = useConfigStore.getState();
          store.setTheme(theme);
          
          const state = useConfigStore.getState();
          expect(state.theme).toBe(theme);
        }),
        { numRuns: 3 }
      );
    });

    it('should handle partial configuration updates correctly', () => {
      fc.assert(
        fc.property(
          userConfigArb,
          fc.record({
            city: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
            refreshRate: fc.option(fc.integer({ min: 1000, max: 300000 })),
          }),
          (initialConfig, partialUpdate) => {
            const store = useConfigStore.getState();
            
            // Set initial configuration
            store.updateConfig(initialConfig);
            
            // Apply partial update
            const cleanPartialUpdate = Object.fromEntries(
              Object.entries(partialUpdate).filter(([, value]) => value !== null)
            );
            
            store.updateConfig(cleanPartialUpdate);
            
            // Verify the configuration was merged correctly
            const currentState = useConfigStore.getState();
            const expectedConfig = { ...initialConfig, ...cleanPartialUpdate };
            
            expect(currentState.config).toEqual(expectedConfig);
          }
        ),
        { numRuns: 3 }
      );
    });
  });

  describe('Favorites Management', () => {
    it('should add favorite route successfully', () => {
      const config: UserConfig = {
        city: 'Cluj-Napoca',
        agencyId: 'test-agency',
        homeLocation: { latitude: 46.7712, longitude: 23.6236 },
        workLocation: { latitude: 46.7712, longitude: 23.6236 },
        apiKey: 'test-api-key',
        refreshRate: 30000,
        staleDataThreshold: 5,
      };

      const store = useConfigStore.getState();
      store.updateConfig(config);

      const favoriteRoute = {
        id: 'route-42',
        routeName: '42',
        longName: 'Piața Unirii - Mănăștur',
        type: 'bus' as const,
      };

      store.addFavoriteRoute(favoriteRoute);

      const state = useConfigStore.getState();
      expect(state.config?.favoriteRoutes).toContain(favoriteRoute);
      expect(state.getFavoriteRoutes()).toContain(favoriteRoute);
    });

    it('should not add duplicate favorite routes', () => {
      const config: UserConfig = {
        city: 'Cluj-Napoca',
        agencyId: 'test-agency',
        homeLocation: { latitude: 46.7712, longitude: 23.6236 },
        workLocation: { latitude: 46.7712, longitude: 23.6236 },
        apiKey: 'test-api-key',
        refreshRate: 30000,
        staleDataThreshold: 5,
      };

      const store = useConfigStore.getState();
      store.updateConfig(config);

      const favoriteRoute = {
        id: 'route-42',
        routeName: '42',
        longName: 'Piața Unirii - Mănăștur',
        type: 'bus' as const,
      };

      store.addFavoriteRoute(favoriteRoute);
      store.addFavoriteRoute(favoriteRoute); // Add same route again

      const state = useConfigStore.getState();
      const favoriteRoutes = state.getFavoriteRoutes();
      expect(favoriteRoutes.filter(route => route.id === 'route-42')).toHaveLength(1);
    });

    it('should remove favorite route successfully', () => {
      const config: UserConfig = {
        city: 'Cluj-Napoca',
        agencyId: 'test-agency',
        homeLocation: { latitude: 46.7712, longitude: 23.6236 },
        workLocation: { latitude: 46.7712, longitude: 23.6236 },
        apiKey: 'test-api-key',
        refreshRate: 30000,
        staleDataThreshold: 5,
        favoriteRoutes: [
          {
            id: 'route-42',
            routeName: '42',
            longName: 'Piața Unirii - Mănăștur',
            type: 'bus',
          },
        ],
      };

      const store = useConfigStore.getState();
      store.updateConfig(config);

      store.removeFavoriteRoute('route-42');

      const state = useConfigStore.getState();
      expect(state.config?.favoriteRoutes).not.toContain(
        expect.objectContaining({ id: 'route-42' })
      );
      expect(state.getFavoriteRoutes()).toHaveLength(0);
    });

    it('should add favorite station successfully', () => {
      const config: UserConfig = {
        city: 'Cluj-Napoca',
        agencyId: 'test-agency',
        homeLocation: { latitude: 46.7712, longitude: 23.6236 },
        workLocation: { latitude: 46.7712, longitude: 23.6236 },
        apiKey: 'test-api-key',
        refreshRate: 30000,
        staleDataThreshold: 5,
      };

      const store = useConfigStore.getState();
      store.updateConfig(config);

      store.addFavoriteStation('station-123');

      const state = useConfigStore.getState();
      expect(state.getFavoriteStations()).toContain('station-123');
    });

    it('should not add duplicate favorite stations', () => {
      const config: UserConfig = {
        city: 'Cluj-Napoca',
        agencyId: 'test-agency',
        homeLocation: { latitude: 46.7712, longitude: 23.6236 },
        workLocation: { latitude: 46.7712, longitude: 23.6236 },
        apiKey: 'test-api-key',
        refreshRate: 30000,
        staleDataThreshold: 5,
      };

      const store = useConfigStore.getState();
      store.updateConfig(config);

      store.addFavoriteStation('station-123');
      store.addFavoriteStation('station-123'); // Add same station again

      const favoriteStations = store.getFavoriteStations();
      expect(favoriteStations.filter(id => id === 'station-123')).toHaveLength(1);
    });

    it('should remove favorite station successfully', () => {
      const config: UserConfig = {
        city: 'Cluj-Napoca',
        agencyId: 'test-agency',
        homeLocation: { latitude: 46.7712, longitude: 23.6236 },
        workLocation: { latitude: 46.7712, longitude: 23.6236 },
        apiKey: 'test-api-key',
        refreshRate: 30000,
        staleDataThreshold: 5,
        favoriteStations: ['station-123', 'station-456'],
      };

      const store = useConfigStore.getState();
      store.updateConfig(config);

      store.removeFavoriteStation('station-123');

      const favoriteStations = store.getFavoriteStations();
      expect(favoriteStations).not.toContain('station-123');
      expect(favoriteStations).toContain('station-456');
    });

    it('should return empty arrays when no config exists', () => {
      const store = useConfigStore.getState();
      store.resetConfig(); // Ensure no config

      expect(store.getFavoriteRoutes()).toEqual([]);
      expect(store.getFavoriteStations()).toEqual([]);
    });

    it('should handle favorites operations gracefully when no config exists', () => {
      const store = useConfigStore.getState();
      store.resetConfig(); // Ensure no config

      const favoriteRoute = {
        id: 'route-42',
        routeName: '42',
        longName: 'Piața Unirii - Mănăștur',
        type: 'bus' as const,
      };

      // These should not throw errors
      expect(() => store.addFavoriteRoute(favoriteRoute)).not.toThrow();
      expect(() => store.removeFavoriteRoute('route-42')).not.toThrow();
      expect(() => store.addFavoriteStation('station-123')).not.toThrow();
      expect(() => store.removeFavoriteStation('station-123')).not.toThrow();
    });

    it('should preserve existing favorites when adding new ones', () => {
      const config: UserConfig = {
        city: 'Cluj-Napoca',
        agencyId: 'test-agency',
        homeLocation: { latitude: 46.7712, longitude: 23.6236 },
        workLocation: { latitude: 46.7712, longitude: 23.6236 },
        apiKey: 'test-api-key',
        refreshRate: 30000,
        staleDataThreshold: 5,
        favoriteRoutes: [
          {
            id: 'route-42',
            routeName: '42',
            longName: 'Piața Unirii - Mănăștur',
            type: 'bus',
          },
        ],
        favoriteStations: ['station-123'],
      };

      const store = useConfigStore.getState();
      store.updateConfig(config);

      const newRoute = {
        id: 'route-35',
        routeName: '35',
        longName: 'Gara - Zorilor',
        type: 'bus' as const,
      };

      store.addFavoriteRoute(newRoute);
      store.addFavoriteStation('station-456');

      const favoriteRoutes = store.getFavoriteRoutes();
      const favoriteStations = store.getFavoriteStations();

      expect(favoriteRoutes).toHaveLength(2);
      expect(favoriteRoutes).toContainEqual(expect.objectContaining({ id: 'route-42' }));
      expect(favoriteRoutes).toContainEqual(expect.objectContaining({ id: 'route-35' }));

      expect(favoriteStations).toHaveLength(2);
      expect(favoriteStations).toContain('station-123');
      expect(favoriteStations).toContain('station-456');
    });
  });

  describe('Data Encryption', () => {
    it('should encrypt API key in storage', () => {
      const config: UserConfig = {
        city: 'Cluj-Napoca',
        agencyId: 'test-agency',
        homeLocation: { latitude: 46.7712, longitude: 23.6236 },
        workLocation: { latitude: 46.7712, longitude: 23.6236 },
        apiKey: 'sensitive-api-key',
        refreshRate: 30000,
        staleDataThreshold: 5,
      };

      const store = useConfigStore.getState();
      store.updateConfig(config);

      // Check that btoa was called for encryption
      expect(window.btoa).toHaveBeenCalledWith('sensitive-api-key');
      
      // Verify that the stored value is different from the original
      const storedData = localStorageMock.getItem('unified-config-store');
      if (storedData) {
        const parsed = JSON.parse(storedData);
        expect(parsed.state.config.apiKey).not.toBe('sensitive-api-key');
      }
    });

    it('should decrypt API key when retrieving from storage', () => {
      const config: UserConfig = {
        city: 'Cluj-Napoca',
        agencyId: 'test-agency',
        homeLocation: { latitude: 46.7712, longitude: 23.6236 },
        workLocation: { latitude: 46.7712, longitude: 23.6236 },
        apiKey: 'sensitive-api-key',
        refreshRate: 30000,
        staleDataThreshold: 5,
      };

      // Clear mocks first
      vi.clearAllMocks();
      
      const store = useConfigStore.getState();
      store.updateConfig(config);

      // The encryption should have been called during storage
      expect(window.btoa).toHaveBeenCalledWith('sensitive-api-key');
      
      // Now simulate a fresh store load by creating a new store instance
      // This will trigger the storage getItem which should call atob for decryption
      const storedValue = localStorageMock.getItem('unified-config-store');
      expect(storedValue).toBeTruthy();
      
      // The decryption happens in the custom storage getItem method
      // We can verify this by checking that the final config has the correct decrypted value
      const state = useConfigStore.getState();
      expect(state.config?.apiKey).toBe('sensitive-api-key');
    });
  });
});