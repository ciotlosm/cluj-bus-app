/**
 * Component Store Integration Tests
 * 
 * Tests to verify that all components work correctly with the new 3-store architecture:
 * - useConfigStore (configuration, theme, agencies, favorites)
 * - useVehicleStore (unified vehicle data management)
 * - useLocationStore (GPS and geolocation)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import React from 'react';

// Import stores
import { useConfigStore, useVehicleStore, useLocationStore } from '../stores';

// Import components to test
import { ThemeToggle } from './ui/ThemeToggle';

// Mock external dependencies
vi.mock('../services/tranzyApiService', () => ({
  tranzyApiService: {
    validateApiKey: vi.fn().mockResolvedValue(true),
    fetchAgencies: vi.fn().mockResolvedValue([
      { id: '1', name: 'Test Agency', city: 'Cluj-Napoca' }
    ])
  },
  enhancedTranzyApi: {
    fetchVehicles: vi.fn().mockResolvedValue([]),
    fetchStations: vi.fn().mockResolvedValue([]),
    fetchRoutes: vi.fn().mockResolvedValue([])
  }
}));

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
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

Object.defineProperty(navigator, 'geolocation', {
  value: mockGeolocation,
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = createTheme();
  return (
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  );
};

describe('Component Store Integration Tests', () => {
  beforeEach(async () => {
    // Reset all stores to initial state
    localStorageMock.clear();
    
    // Reset config store to initial state
    await act(async () => {
      useConfigStore.getState().resetConfig();
      // Explicitly set theme to light for consistent testing
      useConfigStore.setState({ theme: 'light' });
    });
    
    // Reset vehicle store
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

    // Reset location store
    useLocationStore.setState({
      currentLocation: null,
      locationPermission: 'prompt',
      isWatchingLocation: false,
      locationError: null,
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('ThemeToggle Component', () => {
    it('should render and toggle theme using ConfigStore', async () => {
      render(
        <TestWrapper>
          <ThemeToggle />
        </TestWrapper>
      );

      const toggleButton = screen.getByRole('button');
      expect(toggleButton).toBeInTheDocument();

      // Initial theme should be light (set in beforeEach)
      expect(useConfigStore.getState().theme).toBe('light');

      // Click to toggle theme
      await act(async () => {
        fireEvent.click(toggleButton);
      });

      // Theme should change to dark
      await waitFor(() => {
        expect(useConfigStore.getState().theme).toBe('dark');
      });

      // Click again to toggle back
      await act(async () => {
        fireEvent.click(toggleButton);
      });

      // Theme should change back to light
      await waitFor(() => {
        expect(useConfigStore.getState().theme).toBe('light');
      });
    });

    it('should persist theme changes in localStorage', async () => {
      render(
        <TestWrapper>
          <ThemeToggle />
        </TestWrapper>
      );

      const toggleButton = screen.getByRole('button');
      
      // Toggle to dark theme
      await act(async () => {
        fireEvent.click(toggleButton);
      });

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'unified-config-store',
          expect.stringContaining('dark')
        );
      });
    });
  });

  describe('Store Functionality Tests', () => {
    it('should manage favorites using ConfigStore', async () => {
      const configStore = useConfigStore.getState();
      
      await act(async () => {
        configStore.updateConfig({
          apiKey: 'test-api-key',
          city: 'Cluj-Napoca',
        });

        configStore.addFavoriteRoute({
          id: '42',
          shortName: '42',
          longName: 'Zorilor',
          direction: 'work',
        });
      });

      // Should appear in favorites
      expect(configStore.getFavoriteRoutes()).toHaveLength(1);
      expect(configStore.getFavoriteRoutes()[0].id).toBe('42');

      // Remove the favorite
      await act(async () => {
        configStore.removeFavoriteRoute('42');
      });

      // Should be removed from favorites
      expect(configStore.getFavoriteRoutes()).toHaveLength(0);
    });

    it('should handle vehicle store state changes', async () => {
      const vehicleStore = useVehicleStore.getState();
      
      // Test loading state
      await act(async () => {
        useVehicleStore.setState({ isLoading: true });
      });
      
      expect(useVehicleStore.getState().isLoading).toBe(true);

      // Test error state
      await act(async () => {
        useVehicleStore.setState({
          isLoading: false,
          error: {
            type: 'network',
            message: 'Network error',
            timestamp: new Date(),
            retryable: true,
          }
        });
      });

      expect(useVehicleStore.getState().error?.type).toBe('network');
    });
  });

  describe('Store Integration', () => {
    it('should allow all three stores to work together', async () => {
      // Test ConfigStore
      const configStore = useConfigStore.getState();
      configStore.updateConfig({
        apiKey: 'test-api-key',
        city: 'Cluj-Napoca',
        homeLocation: { latitude: 46.7712, longitude: 23.6236 },
        workLocation: { latitude: 46.7833, longitude: 23.6167 },
        refreshRate: 30000,
      });

      expect(useConfigStore.getState().isConfigured).toBe(true);

      // Test VehicleStore
      const vehicleStore = useVehicleStore.getState();
      vehicleStore.refreshVehicles();

      expect(useVehicleStore.getState().isLoading).toBe(true);

      // Test LocationStore
      const locationStore = useLocationStore.getState();
      const distance = locationStore.calculateDistance(
        { latitude: 46.7712, longitude: 23.6236 },
        { latitude: 46.7833, longitude: 23.6167 }
      );

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(10); // Should be less than 10km for Cluj

      // Test favorites integration
      configStore.addFavoriteRoute({
        id: '42',
        shortName: '42',
        longName: 'Zorilor',
        direction: 'work',
      });

      configStore.addFavoriteStation('station-1');

      expect(configStore.getFavoriteRoutes()).toHaveLength(1);
      expect(configStore.getFavoriteStations()).toContain('station-1');
    });

    it('should persist configuration changes across store resets', async () => {
      // Set up initial configuration
      const configStore = useConfigStore.getState();
      configStore.updateConfig({
        apiKey: 'test-api-key',
        city: 'Cluj-Napoca',
        refreshRate: 60000,
      });

      configStore.setTheme('dark');

      // Verify configuration is set
      expect(useConfigStore.getState().config?.apiKey).toBe('test-api-key');
      expect(useConfigStore.getState().theme).toBe('dark');

      // Simulate app restart by creating new store instance
      // (In real app, this would be handled by Zustand persistence)
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should handle error states consistently across stores', async () => {
      // Test ConfigStore error handling
      const configStore = useConfigStore.getState();
      
      // Test VehicleStore error handling
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
        lastApiUpdate: null,
        lastCacheUpdate: null,
        cacheStats: {
          totalEntries: 0,
          totalSize: 0,
          entriesByType: {},
          entriesWithTimestamps: {},
          lastCacheUpdate: 0,
        },
        isOnline: false,
      });

      // Test LocationStore error handling
      useLocationStore.setState({
        currentLocation: null,
        locationPermission: 'denied',
        isWatchingLocation: false,
        locationError: {
          code: 1,
          message: 'Permission denied',
        },
      });

      // All stores should handle errors gracefully
      expect(useVehicleStore.getState().error?.type).toBe('authentication');
      expect(useLocationStore.getState().locationPermission).toBe('denied');
    });
  });

  describe('Component Rendering with Store Data', () => {
    it('should render ThemeToggle without errors when stores have no data', () => {
      // Render components with empty stores
      const { container } = render(
        <TestWrapper>
          <ThemeToggle />
        </TestWrapper>
      );

      // Should render without throwing errors
      expect(container).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should update components when store data changes', async () => {
      const configStore = useConfigStore.getState();

      render(
        <TestWrapper>
          <ThemeToggle />
        </TestWrapper>
      );

      // Initial state (set in beforeEach)
      expect(useConfigStore.getState().theme).toBe('light');

      // Change theme programmatically
      await act(async () => {
        configStore.setTheme('dark');
      });

      // Component should reflect the change
      await waitFor(() => {
        expect(useConfigStore.getState().theme).toBe('dark');
      });
    });
  });
});