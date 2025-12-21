import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateCoordinates, LocationService } from './locationStore';
import type { Coordinates } from '../types';

// Mock the geolocation API
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

const mockPermissions = {
  query: vi.fn(),
};

// Setup global mocks
Object.defineProperty(global, 'navigator', {
  value: {
    geolocation: mockGeolocation,
    permissions: mockPermissions,
  },
  writable: true,
});

describe('validateCoordinates', () => {
  it('should validate correct coordinates', () => {
    const validCoords: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
    expect(validateCoordinates(validCoords)).toBe(true);
  });

  it('should reject coordinates with invalid latitude', () => {
    const invalidCoords: Coordinates = { latitude: 91, longitude: -74.0060 };
    expect(validateCoordinates(invalidCoords)).toBe(false);
  });

  it('should reject coordinates with invalid longitude', () => {
    const invalidCoords: Coordinates = { latitude: 40.7128, longitude: 181 };
    expect(validateCoordinates(invalidCoords)).toBe(false);
  });

  it('should reject coordinates with NaN values', () => {
    const invalidCoords: Coordinates = { latitude: NaN, longitude: -74.0060 };
    expect(validateCoordinates(invalidCoords)).toBe(false);
  });

  it('should reject coordinates with Infinity values', () => {
    const invalidCoords: Coordinates = { latitude: 40.7128, longitude: Infinity };
    expect(validateCoordinates(invalidCoords)).toBe(false);
  });

  it('should reject coordinates with non-number values', () => {
    const invalidCoords = { latitude: '40.7128' as any, longitude: -74.0060 };
    expect(validateCoordinates(invalidCoords)).toBe(false);
  });

  it('should validate boundary coordinates', () => {
    expect(validateCoordinates({ latitude: 90, longitude: 180 })).toBe(true);
    expect(validateCoordinates({ latitude: -90, longitude: -180 })).toBe(true);
    expect(validateCoordinates({ latitude: 0, longitude: 0 })).toBe(true);
  });
});

describe('LocationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCurrentPosition', () => {
    it('should resolve with valid coordinates', async () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const result = await LocationService.getCurrentPosition();
      expect(result).toEqual({ latitude: 40.7128, longitude: -74.0060 });
    });

    it('should reject when geolocation is not supported', async () => {
      // Temporarily remove geolocation
      const originalGeolocation = global.navigator.geolocation;
      // @ts-ignore
      global.navigator.geolocation = undefined;

      await expect(LocationService.getCurrentPosition()).rejects.toThrow(
        'Geolocation is not supported by this browser'
      );

      // Restore geolocation
      global.navigator.geolocation = originalGeolocation;
    });

    it('should reject with permission denied error', async () => {
      const mockError = {
        code: 1, // PERMISSION_DENIED
        message: 'User denied geolocation',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      await expect(LocationService.getCurrentPosition()).rejects.toThrow(
        'Location error: Location access denied by user'
      );
    });

    it('should reject with timeout error', async () => {
      const mockError = {
        code: 3, // TIMEOUT
        message: 'Timeout',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      await expect(LocationService.getCurrentPosition()).rejects.toThrow(
        'Location error: Location request timed out'
      );
    });

    it('should reject with invalid coordinates', async () => {
      const mockPosition = {
        coords: {
          latitude: 91, // Invalid latitude
          longitude: -74.0060,
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      await expect(LocationService.getCurrentPosition()).rejects.toThrow(
        'Invalid coordinates received from GPS'
      );
    });
  });

  describe('watchPosition', () => {
    it('should return watch ID and call callback with valid coordinates', async () => {
      const mockWatchId = 123;
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
      };

      mockGeolocation.watchPosition.mockImplementation((success) => {
        success(mockPosition);
        return mockWatchId;
      });

      const callback = vi.fn();
      const watchId = await LocationService.watchPosition(callback);

      expect(watchId).toBe(mockWatchId);
      expect(callback).toHaveBeenCalledWith({ latitude: 40.7128, longitude: -74.0060 });
    });

    it('should call error callback with invalid coordinates', async () => {
      const mockWatchId = 123;
      const mockPosition = {
        coords: {
          latitude: 91, // Invalid
          longitude: -74.0060,
        },
      };

      mockGeolocation.watchPosition.mockImplementation((success) => {
        success(mockPosition);
        return mockWatchId;
      });

      const callback = vi.fn();
      const errorCallback = vi.fn();
      await LocationService.watchPosition(callback, errorCallback);

      expect(callback).not.toHaveBeenCalled();
      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid coordinates received from GPS',
        })
      );
    });
  });

  describe('checkPermission', () => {
    it('should return permission state when permissions API is available', async () => {
      mockPermissions.query.mockResolvedValue({ state: 'granted' });

      const result = await LocationService.checkPermission();
      expect(result).toBe('granted');
    });

    it('should return prompt when permissions API is not available', async () => {
      // Temporarily remove permissions API
      const originalPermissions = global.navigator.permissions;
      // @ts-ignore
      global.navigator.permissions = undefined;

      const result = await LocationService.checkPermission();
      expect(result).toBe('prompt');

      // Restore permissions API
      global.navigator.permissions = originalPermissions;
    });

    it('should return prompt when permissions query fails', async () => {
      mockPermissions.query.mockRejectedValue(new Error('Query failed'));

      const result = await LocationService.checkPermission();
      expect(result).toBe('prompt');
    });
  });

  describe('clearWatch', () => {
    it('should call navigator.geolocation.clearWatch', () => {
      const watchId = 123;
      LocationService.clearWatch(watchId);
      expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(watchId);
    });

    it('should handle missing geolocation gracefully', () => {
      const originalGeolocation = global.navigator.geolocation;
      // @ts-ignore
      global.navigator.geolocation = undefined;

      expect(() => LocationService.clearWatch(123)).not.toThrow();

      global.navigator.geolocation = originalGeolocation;
    });
  });
});