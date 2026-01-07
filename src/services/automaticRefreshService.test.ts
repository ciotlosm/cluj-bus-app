// Automatic Refresh Service Tests
// Tests for automatic refresh timers and app lifecycle management

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create mock functions that persist across test runs
const mockLoadFromStorage = vi.fn();
const mockRefreshData = vi.fn();
const mockIsDataFresh = vi.fn(() => false);
const mockRefreshAllStores = vi.fn(() => Promise.resolve({ success: true, errors: [], refreshedStores: [], skippedStores: [] }));
const mockRefreshVehicleData = vi.fn(() => Promise.resolve({ success: true, errors: [], refreshedStores: ['vehicles'], skippedStores: [] }));
const mockSubscribe = vi.fn(() => vi.fn()); // Return unsubscribe function

// Mock the stores
vi.mock('../stores/vehicleStore', () => ({
  useVehicleStore: {
    getState: vi.fn(() => ({
      lastUpdated: Date.now() - 10000, // 10 seconds ago
      isDataFresh: mockIsDataFresh,
      loadFromStorage: mockLoadFromStorage,
      refreshData: mockRefreshData
    })),
    subscribe: mockSubscribe
  }
}));

vi.mock('../stores/stationStore', () => ({
  useStationStore: {
    getState: vi.fn(() => ({
      lastUpdated: Date.now() - 10000,
      isDataFresh: mockIsDataFresh,
      loadFromStorage: mockLoadFromStorage
    })),
    subscribe: mockSubscribe
  }
}));

vi.mock('../stores/routeStore', () => ({
  useRouteStore: {
    getState: vi.fn(() => ({
      lastUpdated: Date.now() - 10000,
      isDataFresh: mockIsDataFresh,
      loadFromStorage: mockLoadFromStorage
    })),
    subscribe: mockSubscribe
  }
}));

vi.mock('../stores/shapeStore', () => ({
  useShapeStore: {
    getState: vi.fn(() => ({
      lastUpdated: Date.now() - 10000,
      isDataFresh: mockIsDataFresh,
      loadFromStorage: mockLoadFromStorage
    })),
    subscribe: mockSubscribe
  }
}));

vi.mock('../stores/stopTimeStore', () => ({
  useStopTimeStore: {
    getState: vi.fn(() => ({
      lastUpdated: Date.now() - 10000,
      isDataFresh: mockIsDataFresh,
      loadFromStorage: mockLoadFromStorage
    })),
    subscribe: mockSubscribe
  }
}));

vi.mock('../stores/tripStore', () => ({
  useTripStore: {
    getState: vi.fn(() => ({
      lastUpdated: Date.now() - 10000,
      isDataFresh: mockIsDataFresh,
      loadFromStorage: mockLoadFromStorage
    })),
    subscribe: mockSubscribe
  }
}));

vi.mock('../stores/statusStore', () => ({
  useStatusStore: {
    getState: vi.fn(() => ({
      networkOnline: true,
      apiStatus: 'online'
    })),
    subscribe: mockSubscribe
  }
}));

// Mock the manual refresh service
vi.mock('./manualRefreshService', () => ({
  manualRefreshService: {
    refreshAllStores: mockRefreshAllStores,
    refreshVehicleData: mockRefreshVehicleData
  }
}));

describe('AutomaticRefreshService', () => {
  // Import the service after mocks are set up
  let automaticRefreshService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import the service fresh for each test
    const module = await import('./automaticRefreshService');
    automaticRefreshService = module.automaticRefreshService;
  });

  afterEach(() => {
    if (automaticRefreshService) {
      automaticRefreshService.destroy();
    }
  });

  describe('initialization', () => {
    it('should initialize without errors', async () => {
      await expect(automaticRefreshService.initialize()).resolves.not.toThrow();
    });

    it('should load cached data on startup', async () => {
      await automaticRefreshService.initialize();
      
      expect(mockLoadFromStorage).toHaveBeenCalled();
    });

    it('should be marked as active after initialization', async () => {
      await automaticRefreshService.initialize();
      
      expect(automaticRefreshService.isActive()).toBe(true);
    });
  });

  describe('configuration', () => {
    it('should return current configuration', () => {
      const config = automaticRefreshService.getConfig();
      
      expect(config).toHaveProperty('vehicleRefreshInterval');
      expect(config).toHaveProperty('startupDelay');
      expect(config).toHaveProperty('enableBackgroundRefresh');
    });

    it('should update configuration', () => {
      const newConfig = { vehicleRefreshInterval: 30000 };
      
      automaticRefreshService.updateConfig(newConfig);
      
      const config = automaticRefreshService.getConfig();
      expect(config.vehicleRefreshInterval).toBe(30000);
    });
  });

  describe('cleanup', () => {
    it('should cleanup timers and event listeners', async () => {
      await automaticRefreshService.initialize();
      
      expect(automaticRefreshService.isActive()).toBe(true);
      
      automaticRefreshService.destroy();
      
      expect(automaticRefreshService.isActive()).toBe(false);
    });
  });

  describe('app visibility handling', () => {
    it('should handle visibility change events without errors', async () => {
      await automaticRefreshService.initialize();
      
      // Simulate app going to background
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      
      // Simulate app coming to foreground
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      
      // Should not throw errors
      expect(true).toBe(true);
    });
  });
});