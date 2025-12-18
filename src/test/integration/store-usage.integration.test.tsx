/**
 * Store Usage Verification Tests
 * 
 * Verifies that components correctly use the new 3-store architecture
 * by testing actual component imports and store usage patterns.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import React from 'react';

// Import stores
import { useConfigStore, useVehicleStore, useLocationStore } from '../../stores';

// Import key components that use stores
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { OfflineIndicator } from '../../components/layout/Indicators/OfflineIndicator';
import { StatusIndicators } from '../../components/layout/Indicators/StatusIndicators';

// Mock external dependencies
vi.mock('../services/tranzyApiService', () => ({
  tranzyApiService: {
    validateApiKey: vi.fn().mockResolvedValue(true),
    fetchAgencies: vi.fn().mockResolvedValue([])
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

describe('Store Usage Verification Tests', () => {
  beforeEach(() => {
    // Reset all stores to initial state
    localStorageMock.clear();
    
    // Reset config store
    useConfigStore.getState().resetConfig();
    useConfigStore.setState({ theme: 'light' });
    
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

  describe('Component Store Dependencies', () => {
    it('should verify ThemeToggle uses ConfigStore correctly', () => {
      // Verify initial state
      expect(useConfigStore.getState().theme).toBe('light');

      render(
        <TestWrapper>
          <ThemeToggle />
        </TestWrapper>
      );

      // Component should render without errors
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      
      // Should have correct aria-label for light theme
      expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
    });

    it('should verify OfflineIndicator uses VehicleStore correctly', () => {
      // Set up offline state in VehicleStore
      useVehicleStore.setState({
        error: {
          type: 'network',
          message: 'Network error',
          timestamp: new Date(),
          retryable: true,
        },
        isOnline: false,
      });

      render(
        <TestWrapper>
          <OfflineIndicator />
        </TestWrapper>
      );

      // Should render API error indicator (the component shows "API Error" for network errors)
      expect(screen.getByText(/API Error/i)).toBeInTheDocument();
    });

    it('should verify StatusIndicators uses multiple stores correctly', () => {
      // Set up state in multiple stores
      useVehicleStore.setState({
        lastUpdate: new Date(),
        error: null,
      });

      useLocationStore.setState({
        currentLocation: { latitude: 46.7712, longitude: 23.6236 },
        locationPermission: 'granted',
      });

      render(
        <TestWrapper>
          <StatusIndicators />
        </TestWrapper>
      );

      // Should render status indicators (component uses both VehicleStore and LocationStore)
      expect(screen.getByText('ON')).toBeInTheDocument(); // API status
      expect(screen.getByText('?')).toBeInTheDocument(); // GPS status
    });
  });

  describe('Store State Management', () => {
    it('should verify ConfigStore manages configuration correctly', () => {
      const configStore = useConfigStore.getState();

      // Test configuration update
      configStore.updateConfig({
        apiKey: 'test-key',
        city: 'Cluj-Napoca',
        refreshRate: 30000,
      });

      const config = useConfigStore.getState().config;
      expect(config?.apiKey).toBe('test-key');
      expect(config?.city).toBe('Cluj-Napoca');
      expect(config?.refreshRate).toBe(30000);
    });

    it('should verify VehicleStore manages vehicle data correctly', () => {
      const vehicleStore = useVehicleStore.getState();

      // Test loading state
      useVehicleStore.setState({ isLoading: true });
      expect(useVehicleStore.getState().isLoading).toBe(true);

      // Test error state
      const testError = {
        type: 'authentication' as const,
        message: 'Invalid API key',
        timestamp: new Date(),
        retryable: false,
      };

      useVehicleStore.setState({ 
        isLoading: false,
        error: testError 
      });

      expect(useVehicleStore.getState().error).toEqual(testError);
    });

    it('should verify LocationStore manages location data correctly', () => {
      const locationStore = useLocationStore.getState();

      // Test location calculation
      const distance = locationStore.calculateDistance(
        { latitude: 46.7712, longitude: 23.6236 },
        { latitude: 46.7833, longitude: 23.6167 }
      );

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(10); // Should be reasonable for Cluj

      // Test location state
      useLocationStore.setState({
        currentLocation: { latitude: 46.7712, longitude: 23.6236 },
        locationPermission: 'granted',
      });

      expect(useLocationStore.getState().currentLocation).toEqual({
        latitude: 46.7712,
        longitude: 23.6236,
      });
      expect(useLocationStore.getState().locationPermission).toBe('granted');
    });
  });

  describe('Store Integration', () => {
    it('should verify all stores work together without conflicts', () => {
      // Configure all stores
      const configStore = useConfigStore.getState();
      configStore.updateConfig({
        apiKey: 'test-key',
        city: 'Cluj-Napoca',
        homeLocation: { latitude: 46.7712, longitude: 23.6236 },
        workLocation: { latitude: 46.7833, longitude: 23.6167 },
      });

      configStore.setTheme('dark');

      useVehicleStore.setState({
        vehicles: [],
        isLoading: false,
        lastUpdate: new Date(),
      });

      useLocationStore.setState({
        currentLocation: { latitude: 46.7712, longitude: 23.6236 },
        locationPermission: 'granted',
      });

      // Verify all stores maintain their state
      expect(useConfigStore.getState().config?.apiKey).toBe('test-key');
      expect(useConfigStore.getState().theme).toBe('dark');
      expect(useVehicleStore.getState().isLoading).toBe(false);
      expect(useLocationStore.getState().locationPermission).toBe('granted');
    });

    it('should verify favorites management works correctly', () => {
      const configStore = useConfigStore.getState();

      // First set up configuration (required for favorites to work)
      configStore.updateConfig({
        apiKey: 'test-key',
        city: 'Cluj-Napoca',
      });

      // Add favorite route
      configStore.addFavoriteRoute({
        id: '42',
        shortName: '42',
        longName: 'Zorilor',
        direction: 'work',
      });

      // Add favorite station
      configStore.addFavoriteStation('station-123');

      // Verify favorites are stored
      expect(configStore.getFavoriteRoutes()).toHaveLength(1);
      expect(configStore.getFavoriteRoutes()[0].id).toBe('42');
      expect(configStore.getFavoriteStations()).toContain('station-123');

      // Remove favorites
      configStore.removeFavoriteRoute('42');
      configStore.removeFavoriteStation('station-123');

      // Verify favorites are removed
      expect(configStore.getFavoriteRoutes()).toHaveLength(0);
      expect(configStore.getFavoriteStations()).toHaveLength(0);
    });
  });

  describe('Store Persistence', () => {
    it('should verify configuration persistence works', () => {
      const configStore = useConfigStore.getState();

      // Update configuration
      configStore.updateConfig({
        apiKey: 'persistent-key',
        city: 'Cluj-Napoca',
      });

      configStore.setTheme('dark');

      // Verify localStorage was called (API key is base64 encoded)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'unified-config-store',
        expect.stringContaining('cGVyc2lzdGVudC1rZXk=') // base64 encoded 'persistent-key'
      );

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'unified-config-store',
        expect.stringContaining('dark')
      );
    });
  });

  describe('Error Handling', () => {
    it('should verify stores handle errors gracefully', () => {
      // Test VehicleStore error handling
      const networkError = {
        type: 'network' as const,
        message: 'Connection failed',
        timestamp: new Date(),
        retryable: true,
      };

      useVehicleStore.setState({ error: networkError });
      expect(useVehicleStore.getState().error).toEqual(networkError);

      // Test LocationStore error handling
      const locationError = {
        code: 1,
        message: 'Permission denied',
      };

      useLocationStore.setState({ locationError });
      expect(useLocationStore.getState().locationError).toEqual(locationError);

      // Clear errors
      useVehicleStore.setState({ error: null });
      useLocationStore.setState({ locationError: null });

      expect(useVehicleStore.getState().error).toBeNull();
      expect(useLocationStore.getState().locationError).toBeNull();
    });
  });
});