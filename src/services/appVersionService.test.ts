import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appVersionService } from './appVersionService';

// Mock the logger
vi.mock('../utils/loggerFixed', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock navigator.serviceWorker
const mockServiceWorker = {
  getRegistration: vi.fn(),
  controller: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

Object.defineProperty(navigator, 'serviceWorker', {
  value: mockServiceWorker,
  writable: true,
});

// Mock caches API
const mockCaches = {
  keys: vi.fn(),
  delete: vi.fn(),
};

Object.defineProperty(window, 'caches', {
  value: mockCaches,
  writable: true,
});

describe('AppVersionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockServiceWorker.controller = null;
  });

  describe('getVersionInfo', () => {
    it('should return version info with current version', async () => {
      mockServiceWorker.getRegistration.mockResolvedValue(null);
      
      const versionInfo = await appVersionService.getVersionInfo();
      
      expect(versionInfo).toMatchObject({
        current: '1.0.0',
        serviceWorker: 'unknown',
        isUpdateAvailable: false,
      });
      expect(versionInfo.lastChecked).toBeInstanceOf(Date);
    });

    it('should detect update available when service worker is waiting', async () => {
      const mockRegistration = {
        waiting: { postMessage: vi.fn() },
        update: vi.fn(),
      };
      mockServiceWorker.getRegistration.mockResolvedValue(mockRegistration);
      
      const versionInfo = await appVersionService.getVersionInfo();
      
      expect(versionInfo.isUpdateAvailable).toBe(true);
    });
  });

  describe('clearAllCaches', () => {
    it('should clear all browser caches', async () => {
      const mockCacheNames = ['cache1', 'cache2'];
      mockCaches.keys.mockResolvedValue(mockCacheNames);
      mockCaches.delete.mockResolvedValue(true);
      
      // Mock localStorage
      const mockLocalStorage = {
        getItem: vi.fn().mockReturnValue('{"test": "config"}'),
        clear: vi.fn(),
        setItem: vi.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      });
      
      // Mock sessionStorage
      const mockSessionStorage = {
        clear: vi.fn(),
      };
      Object.defineProperty(window, 'sessionStorage', {
        value: mockSessionStorage,
        writable: true,
      });
      
      // Mock service worker controller for message sending
      mockServiceWorker.controller = { 
        postMessage: vi.fn((message, ports) => {
          // Simulate successful response
          setTimeout(() => {
            if (ports && ports[0] && ports[0].onmessage) {
              ports[0].onmessage({ data: { success: true } });
            }
          }, 0);
        })
      };
      
      await appVersionService.clearAllCaches();
      
      expect(mockCaches.delete).toHaveBeenCalledWith('cache1');
      expect(mockCaches.delete).toHaveBeenCalledWith('cache2');
      expect(mockLocalStorage.clear).toHaveBeenCalled();
      expect(mockSessionStorage.clear).toHaveBeenCalled();
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('config-store', '{"test": "config"}');
    });
  });

  describe('checkForUpdates', () => {
    it('should check for updates and return version info', async () => {
      mockServiceWorker.getRegistration.mockResolvedValue({
        waiting: null,
        update: vi.fn(),
      });
      
      const result = await appVersionService.checkForUpdates();
      
      expect(result).toMatchObject({
        current: '1.0.0',
        isUpdateAvailable: false,
      });
      expect(result.lastChecked).toBeInstanceOf(Date);
    });
  });
});