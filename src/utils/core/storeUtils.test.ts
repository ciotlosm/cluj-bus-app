// Tests for store utilities
// Ensures the shared utilities work correctly and eliminate duplication

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createStorageMethods, createRefreshMethod, createFreshnessChecker } from './storeUtils';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('storeUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createStorageMethods', () => {
    it('should create persistToStorage method that saves to localStorage', () => {
      const { persistToStorage } = createStorageMethods('test', 'data');
      const mockGetState = vi.fn(() => ({
        data: ['item1', 'item2'],
        lastUpdated: 123456789,
        error: null
      }));

      persistToStorage(mockGetState);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'neary_cache_test',
        JSON.stringify({
          data: ['item1', 'item2'],
          lastUpdated: 123456789,
          error: null
        })
      );
    });

    it('should create loadFromStorage method that loads from localStorage', () => {
      const { loadFromStorage } = createStorageMethods('test', 'data');
      const mockSetState = vi.fn();
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        data: ['item1', 'item2'],
        lastUpdated: 123456789,
        error: null
      }));

      loadFromStorage(mockSetState);

      expect(localStorageMock.getItem).toHaveBeenCalledWith('neary_cache_test');
      expect(mockSetState).toHaveBeenCalledWith({
        data: ['item1', 'item2'],
        lastUpdated: 123456789,
        error: null
      });
    });

    it('should handle localStorage errors gracefully', () => {
      const { persistToStorage, loadFromStorage } = createStorageMethods('test', 'data');
      const mockGetState = vi.fn(() => ({ data: [], lastUpdated: null, error: null }));
      const mockSetState = vi.fn();
      
      // Mock localStorage to throw error
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      // Should not throw errors
      expect(() => persistToStorage(mockGetState)).not.toThrow();
      expect(() => loadFromStorage(mockSetState)).not.toThrow();
    });
  });

  describe('createRefreshMethod', () => {
    it('should create refresh method that calls service and updates state', async () => {
      const mockService = { getData: vi.fn().mockResolvedValue(['new', 'data']) };
      const mockServiceImport = vi.fn().mockResolvedValue(mockService);
      const mockGetState = vi.fn().mockReturnValue({ loading: false, data: [] });
      const mockSetState = vi.fn();
      const mockPersistToStorage = vi.fn();

      const refreshMethod = createRefreshMethod('test', 'data', mockServiceImport, 'getData');

      await refreshMethod(mockGetState, mockSetState, mockPersistToStorage);

      // Should set loading state
      expect(mockSetState).toHaveBeenCalledWith({ loading: true, error: null });
      
      // Should call service
      expect(mockServiceImport).toHaveBeenCalled();
      expect(mockService.getData).toHaveBeenCalled();
      
      // Should update state with data
      expect(mockSetState).toHaveBeenCalledWith({
        data: ['new', 'data'],
        loading: false,
        error: null,
        lastUpdated: expect.any(Number)
      });
      
      // Should persist to storage
      expect(mockPersistToStorage).toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      const mockServiceImport = vi.fn().mockRejectedValue(new Error('Service error'));
      const mockGetState = vi.fn().mockReturnValue({ loading: false, data: [] });
      const mockSetState = vi.fn();
      const mockPersistToStorage = vi.fn();

      const refreshMethod = createRefreshMethod('test', 'data', mockServiceImport, 'getData');

      await refreshMethod(mockGetState, mockSetState, mockPersistToStorage);

      // Should set error state (no cached data available)
      expect(mockSetState).toHaveBeenCalledWith({
        loading: false,
        error: 'Service error'
      });
      
      // Should not persist on error
      expect(mockPersistToStorage).not.toHaveBeenCalled();
    });

    it('should use retry and cached data by default', async () => {
      const mockServiceImport = vi.fn().mockRejectedValue(new Error('Network error'));
      const mockGetState = vi.fn().mockReturnValue({ 
        loading: false, 
        data: ['cached', 'data'] // Has cached data
      });
      const mockSetState = vi.fn();
      const mockPersistToStorage = vi.fn();

      const refreshMethod = createRefreshMethod('test', 'data', mockServiceImport, 'getData');

      await refreshMethod(mockGetState, mockSetState, mockPersistToStorage);

      // Should use cached data on error (default behavior)
      expect(mockSetState).toHaveBeenCalledWith({
        loading: false,
        error: 'Network error during refresh: Network error. Using cached data.'
      });
      
      // Should not persist on error
      expect(mockPersistToStorage).not.toHaveBeenCalled();
    });
  });

  describe('createFreshnessChecker', () => {
    it('should create freshness checker that works correctly', () => {
      const freshnessChecker = createFreshnessChecker(5 * 60 * 1000); // 5 minutes
      const now = Date.now();

      // Fresh data
      const mockGetStateFresh = vi.fn(() => ({ lastUpdated: now - 2 * 60 * 1000 })); // 2 minutes ago
      expect(freshnessChecker(mockGetStateFresh)).toBe(true);

      // Stale data
      const mockGetStateStale = vi.fn(() => ({ lastUpdated: now - 10 * 60 * 1000 })); // 10 minutes ago
      expect(freshnessChecker(mockGetStateStale)).toBe(false);

      // No data
      const mockGetStateNoData = vi.fn(() => ({ lastUpdated: null }));
      expect(freshnessChecker(mockGetStateNoData)).toBe(false);
    });

    it('should use custom maxAge when provided', () => {
      const freshnessChecker = createFreshnessChecker(5 * 60 * 1000); // 5 minutes default
      const now = Date.now();

      const mockGetState = vi.fn(() => ({ lastUpdated: now - 2 * 60 * 1000 })); // 2 minutes ago

      // Should be fresh with default (5 minutes)
      expect(freshnessChecker(mockGetState)).toBe(true);

      // Should be stale with custom 1 minute threshold
      expect(freshnessChecker(mockGetState, 1 * 60 * 1000)).toBe(false);
    });
  });
});