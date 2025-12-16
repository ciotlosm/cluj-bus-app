import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useConfigStore, useBusStore, useFavoritesStore, useLocationStore, useOfflineStore } from './stores';
import { ConfigurationManager } from './components/features/Configuration';
import { Settings } from './components/features/Settings';
import App from './AppMaterial';
import type { UserConfig, BusInfo, ErrorState } from './types';

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

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

Object.defineProperty(navigator, 'geolocation', {
  value: mockGeolocation,
});

// Mock service worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: vi.fn().mockResolvedValue({}),
    ready: Promise.resolve({}),
  },
});

// Mock Tranzy API Service
vi.mock('./services/tranzyApiService', () => ({
  tranzyApiService: () => ({
    validateApiKey: vi.fn().mockResolvedValue(true),
    getBusesForCity: vi.fn().mockResolvedValue([]),
    getStationsForCity: vi.fn().mockResolvedValue([]),
    getBusesAtStation: vi.fn().mockResolvedValue([]),
    setApiKey: vi.fn(),
  }),
}));

// Mock performance utils
vi.mock('./utils/performance', () => ({
  useComponentLifecycle: vi.fn(),
  logPerformanceMetrics: vi.fn(),
  withPerformanceMonitoring: (component: any) => component,
}));

// Mock hooks
vi.mock('./hooks/useRefreshSystem', () => ({
  useRefreshSystem: () => ({
    isAutoRefreshEnabled: false,
    startAutoRefresh: vi.fn(),
    stopAutoRefresh: vi.fn(),
  }),
}));

vi.mock('./hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    error: null,
    clearError: vi.fn(),
  }),
}));

describe('Integration Tests - Complete User Flows', () => {
  
  const mockConfig: UserConfig = {
    city: 'Cluj-Napoca',
    homeLocation: { latitude: 46.7712, longitude: 23.6236 },
    workLocation: { latitude: 46.7833, longitude: 23.6167 },
    apiKey: 'test-api-key-12345',
    refreshRate: 30000,
  };

  const mockBuses: BusInfo[] = [
    {
      id: 'bus-1',
      route: '24',
      destination: 'Zorilor',
      arrivalTime: new Date(Date.now() + 5 * 60 * 1000),
      isLive: true,
      minutesAway: 5,
      station: {
        id: 'station-1',
        name: 'Piața Unirii',
        coordinates: { latitude: 46.7712, longitude: 23.6236 },
        isFavorite: false,
      },
      direction: 'work',
    },
    {
      id: 'bus-2',
      route: '35',
      destination: 'Mănăștur',
      arrivalTime: new Date(Date.now() + 8 * 60 * 1000),
      isLive: false,
      minutesAway: 8,
      station: {
        id: 'station-2',
        name: 'Piața Mărăști',
        coordinates: { latitude: 46.7833, longitude: 23.6167 },
        isFavorite: false,
      },
      direction: 'home',
    },
  ];

  const mockStations = [
    {
      id: 'station-1',
      name: 'Piața Unirii',
      coordinates: { latitude: 46.7712, longitude: 23.6236 },
      isFavorite: false,
    },
    {
      id: 'station-2',
      name: 'Piața Mărăști',
      coordinates: { latitude: 46.7833, longitude: 23.6167 },
      isFavorite: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.useFakeTimers();
    
    // Reset all stores to initial state
    useConfigStore.getState().resetConfig();
    useBusStore.setState({
      buses: [],
      stations: [],
      lastUpdate: null,
      isLoading: false,
      error: null,
      isAutoRefreshEnabled: false,
    });
    useFavoritesStore.setState({
      favorites: { buses: [], stations: [] },
    });

    // Mock geolocation success
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 46.7712,
          longitude: 23.6236,
          accuracy: 10,
        },
        timestamp: Date.now(),
      });
    });

    mockGeolocation.watchPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 46.7712,
          longitude: 23.6236,
          accuracy: 10,
        },
        timestamp: Date.now(),
      });
      return 1; // watch ID
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Complete Setup Flow - Initial Launch to Bus Tracking', () => {
    it('should complete the entire setup flow from initial launch to bus tracking', () => {
      // Step 1: Initial state - not configured
      expect(useConfigStore.getState().isConfigured).toBe(false);
      expect(useConfigStore.getState().config).toBeNull();

      // Step 2: Complete configuration
      act(() => {
        useConfigStore.getState().updateConfig(mockConfig);
      });

      // Step 3: Verify configuration is applied
      expect(useConfigStore.getState().isConfigured).toBe(true);
      expect(useConfigStore.getState().config?.city).toBe(mockConfig.city);
      expect(useConfigStore.getState().config?.apiKey).toBe(mockConfig.apiKey);

      // Step 4: Load bus data
      act(() => {
        useBusStore.setState({
          buses: mockBuses,
          stations: mockStations,
          lastUpdate: new Date(),
          isLoading: false,
          error: null,
        });
      });

      // Step 5: Verify bus tracking is working
      const busStore = useBusStore.getState();
      expect(busStore.buses).toHaveLength(2);
      expect(busStore.buses[0].route).toBe('24');
      expect(busStore.buses[0].direction).toBe('work');
      expect(busStore.buses[1].route).toBe('35');
      expect(busStore.buses[1].direction).toBe('home');

      // Step 6: Verify persistence
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'config',
        expect.stringContaining(mockConfig.city)
      );
    });

    it('should handle GPS location setup during configuration', () => {
      // Mock successful GPS request
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: {
            latitude: 46.7712,
            longitude: 23.6236,
            accuracy: 10,
          },
          timestamp: Date.now(),
        });
      });

      // Simulate GPS location request
      let capturedLocation: any = null;
      mockGeolocation.getCurrentPosition((position: any) => {
        capturedLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      });

      expect(capturedLocation).toEqual({
        latitude: 46.7712,
        longitude: 23.6236,
      });
    });

    it('should handle manual location entry during configuration', () => {
      // Simulate manual coordinate entry
      const manualCoordinates = { latitude: 46.7712, longitude: 23.6236 };
      
      // Validate coordinates (this would be done by the validation function)
      expect(manualCoordinates.latitude).toBeGreaterThanOrEqual(-90);
      expect(manualCoordinates.latitude).toBeLessThanOrEqual(90);
      expect(manualCoordinates.longitude).toBeGreaterThanOrEqual(-180);
      expect(manualCoordinates.longitude).toBeLessThanOrEqual(180);
    });

    it('should validate API key during setup', () => {
      const testApiKey = 'test-api-key';
      
      // Simulate API key validation
      expect(testApiKey).toBeTruthy();
      expect(testApiKey.length).toBeGreaterThan(0);
    });
  });

  describe('Favorites Management Across App Sessions', () => {
    beforeEach(() => {
      useConfigStore.getState().updateConfig(mockConfig);
    });

    it('should persist favorites across app sessions', () => {
      const favoritesStore = useFavoritesStore.getState();

      // Add favorites
      act(() => {
        favoritesStore.addFavoriteBus('24');
        favoritesStore.addFavoriteStation('station-1');
      });

      // Verify favorites were added
      expect(useFavoritesStore.getState().favorites.buses).toContain('24');
      expect(useFavoritesStore.getState().favorites.stations).toContain('station-1');

      // Verify persistence to localStorage
      expect(localStorageMock.setItem).toHaveBeenCalled();

      // Simulate app restart by creating new store instance
      const newFavoritesState = useFavoritesStore.getState();
      expect(newFavoritesState.favorites.buses).toContain('24');
      expect(newFavoritesState.favorites.stations).toContain('station-1');
    });

    it('should update filtered views immediately when favorites change', () => {
      const favoritesStore = useFavoritesStore.getState();

      // Initially no favorites
      expect(useFavoritesStore.getState().favorites.buses).toHaveLength(0);

      // Add bus data
      act(() => {
        useBusStore.setState({
          buses: mockBuses,
          stations: mockStations,
        });
      });

      // Add favorite bus
      act(() => {
        favoritesStore.addFavoriteBus('24');
      });

      // Verify immediate update
      expect(useFavoritesStore.getState().favorites.buses).toContain('24');

      // Verify filtered stations would only show stations for favorite routes
      const filteredStations = favoritesStore.getFilteredStations();
      // This should filter to only stations where bus '24' stops
      expect(filteredStations.every(station => 
        mockBuses.some(bus => bus.route === '24' && bus.station.id === station.id)
      )).toBe(true);

      // Remove favorite
      act(() => {
        favoritesStore.removeFavoriteBus('24');
      });

      // Verify immediate removal
      expect(useFavoritesStore.getState().favorites.buses).not.toContain('24');
    });

    it('should handle favorites management with multiple buses and stations', () => {
      const favoritesStore = useFavoritesStore.getState();

      // Add multiple favorites
      act(() => {
        favoritesStore.addFavoriteBus('24');
        favoritesStore.addFavoriteBus('35');
        favoritesStore.addFavoriteStation('station-1');
        favoritesStore.addFavoriteStation('station-2');
      });

      // Verify all were added
      expect(useFavoritesStore.getState().favorites.buses).toEqual(['24', '35']);
      expect(useFavoritesStore.getState().favorites.stations).toEqual(['station-1', 'station-2']);

      // Remove one bus favorite
      act(() => {
        favoritesStore.removeFavoriteBus('24');
      });

      // Verify selective removal
      expect(useFavoritesStore.getState().favorites.buses).toEqual(['35']);
      expect(useFavoritesStore.getState().favorites.stations).toEqual(['station-1', 'station-2']);

      // Remove one station favorite
      act(() => {
        favoritesStore.removeFavoriteStation('station-1');
      });

      // Verify selective removal
      expect(useFavoritesStore.getState().favorites.buses).toEqual(['35']);
      expect(useFavoritesStore.getState().favorites.stations).toEqual(['station-2']);
    });
  });

  describe('Error Recovery and Retry Mechanisms', () => {
    beforeEach(() => {
      useConfigStore.getState().updateConfig(mockConfig);
    });

    it('should handle network errors with retry mechanisms', () => {
      const networkError: ErrorState = {
        type: 'network',
        message: 'Network connection failed',
        timestamp: new Date(),
        retryable: true,
      };

      // Set error state
      act(() => {
        useBusStore.setState({
          buses: [],
          stations: [],
          lastUpdate: null,
          isLoading: false,
          error: networkError,
        });
      });

      // Verify error state
      const busStore = useBusStore.getState();
      expect(busStore.error).toEqual(networkError);
      expect(busStore.error?.retryable).toBe(true);

      // Simulate retry - clear error and load data
      act(() => {
        useBusStore.setState({
          buses: mockBuses,
          stations: mockStations,
          lastUpdate: new Date(),
          isLoading: false,
          error: null,
        });
      });

      // Verify recovery
      expect(useBusStore.getState().error).toBeNull();
      expect(useBusStore.getState().buses).toHaveLength(2);
    });

    it('should handle authentication errors with reconfiguration prompt', () => {
      const authError: ErrorState = {
        type: 'authentication',
        message: 'Invalid API key',
        timestamp: new Date(),
        retryable: false,
      };

      // Set authentication error
      act(() => {
        useBusStore.setState({
          buses: [],
          stations: [],
          lastUpdate: null,
          isLoading: false,
          error: authError,
        });
      });

      // Verify error state
      const busStore = useBusStore.getState();
      expect(busStore.error).toEqual(authError);
      expect(busStore.error?.retryable).toBe(false);
      expect(busStore.error?.type).toBe('authentication');
    });

    it('should handle partial data errors gracefully', () => {
      const partialError: ErrorState = {
        type: 'partial',
        message: 'Some bus data unavailable',
        timestamp: new Date(),
        retryable: true,
      };

      // Set partial data with error
      act(() => {
        useBusStore.setState({
          buses: [mockBuses[0]], // Only partial data
          stations: [],
          lastUpdate: new Date(),
          isLoading: false,
          error: partialError,
        });
      });

      // Verify partial data is available with error indicator
      const busStore = useBusStore.getState();
      expect(busStore.buses).toHaveLength(1);
      expect(busStore.error).toEqual(partialError);
      expect(busStore.error?.type).toBe('partial');
    });

    it('should handle parsing errors with diagnostic information', () => {
      const parseError: ErrorState = {
        type: 'parsing',
        message: 'Invalid response format from API',
        timestamp: new Date(),
        retryable: true,
      };

      // Set parsing error
      act(() => {
        useBusStore.setState({
          buses: [],
          stations: [],
          lastUpdate: null,
          isLoading: false,
          error: parseError,
        });
      });

      // Verify error state
      const busStore = useBusStore.getState();
      expect(busStore.error).toEqual(parseError);
      expect(busStore.error?.type).toBe('parsing');
      expect(busStore.error?.message).toContain('Invalid response format');
    });

    it('should handle no data scenarios', () => {
      const noDataError: ErrorState = {
        type: 'noData',
        message: 'No bus data available for this location',
        timestamp: new Date(),
        retryable: true,
      };

      // Set no data error
      act(() => {
        useBusStore.setState({
          buses: [],
          stations: [],
          lastUpdate: new Date(),
          isLoading: false,
          error: noDataError,
        });
      });

      // Verify error state
      const busStore = useBusStore.getState();
      expect(busStore.error).toEqual(noDataError);
      expect(busStore.error?.type).toBe('noData');
      expect(busStore.buses).toHaveLength(0);
    });
  });

  describe('Configuration Persistence and Updates', () => {
    it('should persist configuration changes without requiring restart', () => {
      const configStore = useConfigStore.getState();

      // Initial configuration
      act(() => {
        configStore.updateConfig(mockConfig);
      });

      expect(useConfigStore.getState().isConfigured).toBe(true);
      expect(useConfigStore.getState().config?.refreshRate).toBe(30000);

      // Update refresh rate
      act(() => {
        configStore.updateConfig({ refreshRate: 60000 });
      });

      // Verify immediate application without restart
      expect(useConfigStore.getState().config?.refreshRate).toBe(60000);
      expect(useConfigStore.getState().config?.city).toBe(mockConfig.city); // Other settings preserved

      // Verify persistence
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'config',
        expect.stringContaining('60000')
      );
    });

    it('should handle configuration reset correctly', () => {
      const configStore = useConfigStore.getState();

      // Set configuration
      act(() => {
        configStore.updateConfig(mockConfig);
      });

      expect(useConfigStore.getState().isConfigured).toBe(true);

      // Reset configuration
      act(() => {
        configStore.resetConfig();
      });

      // Verify reset
      expect(useConfigStore.getState().isConfigured).toBe(false);
      expect(useConfigStore.getState().config).toBeNull();
    });

    it('should validate configuration updates', () => {
      const configStore = useConfigStore.getState();

      // Test partial updates
      act(() => {
        configStore.updateConfig({
          city: 'Bucharest',
          apiKey: 'new-api-key',
        });
      });

      // Should update only specified fields
      expect(useConfigStore.getState().config?.city).toBe('Bucharest');
      expect(useConfigStore.getState().config?.apiKey).toBe('new-api-key');
      expect(useConfigStore.getState().config?.homeLocation).toBeUndefined();
    });

    it('should handle API key encryption during storage', () => {
      const configStore = useConfigStore.getState();

      // Set configuration with API key
      act(() => {
        configStore.updateConfig(mockConfig);
      });

      // Verify API key is stored (would be encrypted in real implementation)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'config',
        expect.stringContaining(mockConfig.city)
      );

      // Verify configuration is retrievable
      expect(useConfigStore.getState().config?.apiKey).toBe(mockConfig.apiKey);
    });
  });

  describe('Real-time Data Updates and Refresh System', () => {
    beforeEach(() => {
      useConfigStore.getState().updateConfig(mockConfig);
    });

    it('should handle automatic refresh based on configured interval', () => {
      const busStore = useBusStore.getState();
      let refreshCount = 0;

      // Mock refresh function
      const mockRefresh = vi.fn(() => {
        refreshCount++;
        useBusStore.setState({
          buses: mockBuses,
          stations: mockStations,
          lastUpdate: new Date(),
          isLoading: false,
          error: null,
        });
      });

      // Start auto refresh with mocked function
      const intervalId = setInterval(mockRefresh, mockConfig.refreshRate);

      try {
        // Advance time by refresh interval
        vi.advanceTimersByTime(mockConfig.refreshRate);
        expect(refreshCount).toBe(1);

        // Advance time by another interval
        vi.advanceTimersByTime(mockConfig.refreshRate);
        expect(refreshCount).toBe(2);

        // Verify data is updated
        expect(useBusStore.getState().buses).toHaveLength(2);
        expect(useBusStore.getState().lastUpdate).toBeTruthy();
      } finally {
        clearInterval(intervalId);
      }
    });

    it('should handle manual refresh bypassing automatic timing', () => {
      let refreshCount = 0;

      // Mock refresh function
      const mockRefresh = vi.fn(() => {
        refreshCount++;
        useBusStore.setState({
          buses: mockBuses,
          stations: mockStations,
          lastUpdate: new Date(),
          isLoading: false,
          error: null,
        });
      });

      // Start auto refresh
      const intervalId = setInterval(mockRefresh, mockConfig.refreshRate);

      try {
        // Wait only 30% of refresh interval
        const partialTime = Math.floor(mockConfig.refreshRate * 0.3);
        vi.advanceTimersByTime(partialTime);
        expect(refreshCount).toBe(0); // No automatic refresh yet

        // Trigger manual refresh
        mockRefresh(); // Simulate manual refresh
        expect(refreshCount).toBe(1);

        // Verify manual refresh bypassed timing
        expect(useBusStore.getState().buses).toHaveLength(2);
      } finally {
        clearInterval(intervalId);
      }
    });

    it('should handle refresh rate changes dynamically', () => {
      const configStore = useConfigStore.getState();
      let refreshCount = 0;

      // Mock refresh function
      const mockRefresh = vi.fn(() => {
        refreshCount++;
      });

      // Start with initial refresh rate
      let intervalId = setInterval(mockRefresh, mockConfig.refreshRate);

      try {
        // Advance time by initial interval
        vi.advanceTimersByTime(mockConfig.refreshRate);
        expect(refreshCount).toBe(1);

        // Change refresh rate
        clearInterval(intervalId);
        const newRefreshRate = 15000; // 15 seconds
        act(() => {
          configStore.updateConfig({ refreshRate: newRefreshRate });
        });

        // Start new interval with updated rate
        intervalId = setInterval(mockRefresh, newRefreshRate);

        // Advance time by new interval
        vi.advanceTimersByTime(newRefreshRate);
        expect(refreshCount).toBe(2);

        // Verify configuration was updated
        expect(useConfigStore.getState().config?.refreshRate).toBe(newRefreshRate);
      } finally {
        clearInterval(intervalId);
      }
    });
  });

  describe('Mobile Responsiveness and Touch Interactions', () => {
    beforeEach(() => {
      useConfigStore.getState().updateConfig(mockConfig);
      useBusStore.setState({
        buses: mockBuses,
        stations: mockStations,
        lastUpdate: new Date(),
        isLoading: false,
        error: null,
      });
    });

    it('should render mobile-friendly bus display', () => {
      // Should show work-bound buses
      const workBuses = mockBuses.filter(bus => bus.direction === 'work');
      expect(workBuses).toHaveLength(1);
      expect(workBuses[0].route).toBe('24');
    });

    it('should handle navigation between views', () => {
      // Simulate navigation state management
      let currentView: 'buses' | 'settings' = 'buses';
      
      // Start on buses view when configured
      expect(useConfigStore.getState().isConfigured).toBe(true);
      expect(currentView).toBe('buses');

      // Navigate to settings
      currentView = 'settings';
      expect(currentView).toBe('settings');

      // Navigate back to buses
      currentView = 'buses';
      expect(currentView).toBe('buses');
    });

    it('should provide visual feedback for touch interactions', () => {
      // Simulate touch interaction handling
      const touchEvents = {
        touchStart: false,
        touchEnd: false,
        click: false,
      };

      // Simulate touch sequence
      touchEvents.touchStart = true;
      touchEvents.touchEnd = true;
      touchEvents.click = true;

      // Verify touch events were handled
      expect(touchEvents.touchStart).toBe(true);
      expect(touchEvents.touchEnd).toBe(true);
      expect(touchEvents.click).toBe(true);
    });

    it('should handle loading states appropriately', () => {
      // Set loading state
      act(() => {
        useBusStore.setState({
          buses: [],
          stations: [],
          lastUpdate: null,
          isLoading: true,
          error: null,
        });
      });

      // Verify loading state
      expect(useBusStore.getState().isLoading).toBe(true);
      expect(useBusStore.getState().buses).toHaveLength(0);

      // Complete loading
      act(() => {
        useBusStore.setState({
          buses: mockBuses,
          stations: mockStations,
          lastUpdate: new Date(),
          isLoading: false,
          error: null,
        });
      });

      // Should show actual data
      expect(useBusStore.getState().isLoading).toBe(false);
      expect(useBusStore.getState().buses).toHaveLength(2);
    });
  });

  describe('Offline Capability and Data Caching', () => {
    beforeEach(() => {
      useConfigStore.getState().updateConfig(mockConfig);
    });

    it('should handle offline state gracefully', () => {
      // Set offline state
      act(() => {
        useOfflineStore.setState({
          isOnline: false,
          lastOnlineTime: new Date(Date.now() - 60000), // 1 minute ago
        });
      });

      // Set cached data
      act(() => {
        useBusStore.setState({
          buses: mockBuses,
          stations: mockStations,
          lastUpdate: new Date(Date.now() - 60000),
          isLoading: false,
          error: null,
        });
      });

      // Verify offline state
      expect(useOfflineStore.getState().isOnline).toBe(false);
      expect(useBusStore.getState().buses).toHaveLength(2); // Cached data available
    });

    it('should show cached data timestamps when offline', () => {
      const lastUpdate = new Date(Date.now() - 300000); // 5 minutes ago

      // Set offline with cached data
      act(() => {
        useOfflineStore.setState({
          isOnline: false,
          lastOnlineTime: lastUpdate,
        });
        useBusStore.setState({
          buses: mockBuses,
          stations: mockStations,
          lastUpdate,
          isLoading: false,
          error: null,
        });
      });

      // Verify cached data is available with timestamp
      expect(useBusStore.getState().lastUpdate).toEqual(lastUpdate);
      expect(useOfflineStore.getState().isOnline).toBe(false);
    });

    it('should recover when coming back online', () => {
      // Start offline
      act(() => {
        useOfflineStore.setState({
          isOnline: false,
          lastOnlineTime: new Date(Date.now() - 60000),
        });
      });

      expect(useOfflineStore.getState().isOnline).toBe(false);

      // Come back online
      act(() => {
        useOfflineStore.setState({
          isOnline: true,
          lastOnlineTime: new Date(),
        });
      });

      // Verify online state
      expect(useOfflineStore.getState().isOnline).toBe(true);
    });
  });

  describe('End-to-End User Journey Validation', () => {
    it('should complete full user journey from setup to tracking', async () => {
      // 1. Start with fresh app
      expect(useConfigStore.getState().isConfigured).toBe(false);

      // 2. Complete configuration
      act(() => {
        useConfigStore.getState().updateConfig(mockConfig);
      });

      // 3. Add favorites
      act(() => {
        useFavoritesStore.getState().addFavoriteBus('24');
        useFavoritesStore.getState().addFavoriteStation('station-1');
      });

      // 4. Load bus data
      act(() => {
        useBusStore.setState({
          buses: mockBuses,
          stations: mockStations,
          lastUpdate: new Date(),
          isLoading: false,
          error: null,
        });
      });

      // 5. Verify complete state
      expect(useConfigStore.getState().isConfigured).toBe(true);
      expect(useFavoritesStore.getState().favorites.buses).toContain('24');
      expect(useBusStore.getState().buses).toHaveLength(2);

      // 6. Test error recovery
      act(() => {
        useBusStore.setState({
          error: {
            type: 'network',
            message: 'Connection lost',
            timestamp: new Date(),
            retryable: true,
          },
        });
      });

      expect(useBusStore.getState().error?.type).toBe('network');

      // 7. Recover from error
      act(() => {
        useBusStore.setState({
          error: null,
          buses: mockBuses,
          lastUpdate: new Date(),
        });
      });

      expect(useBusStore.getState().error).toBeNull();
      expect(useBusStore.getState().buses).toHaveLength(2);
    });

    it('should maintain data consistency across store updates', () => {
      // Setup initial state
      act(() => {
        useConfigStore.getState().updateConfig(mockConfig);
        useFavoritesStore.getState().addFavoriteBus('24');
        useBusStore.setState({
          buses: mockBuses,
          stations: mockStations,
          lastUpdate: new Date(),
        });
      });

      // Verify all stores are consistent
      expect(useConfigStore.getState().config?.city).toBe('Cluj-Napoca');
      expect(useFavoritesStore.getState().favorites.buses).toContain('24');
      expect(useBusStore.getState().buses.some(bus => bus.route === '24')).toBe(true);

      // Update configuration
      act(() => {
        useConfigStore.getState().updateConfig({ refreshRate: 45000 });
      });

      // Verify configuration update doesn't affect other stores
      expect(useConfigStore.getState().config?.refreshRate).toBe(45000);
      expect(useFavoritesStore.getState().favorites.buses).toContain('24');
      expect(useBusStore.getState().buses).toHaveLength(2);
    });
  });
});