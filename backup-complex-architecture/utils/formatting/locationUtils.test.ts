import { describe, it, expect } from 'vitest';
import {
  formatCoordinates,
  degreesToRadians,
  radiansToDegrees,
  calculateBearing,
  isWithinBounds,
  createBoundingBox,
  findClosestCoordinate,
  coordinatesEqual,
  normalizeCoordinates,
} from './locationUtils';
import type { Coordinates } from '../../types';

describe('locationUtils', () => {
  const validCoords: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
  const invalidCoords: Coordinates = { latitude: 91, longitude: -74.0060 };

  describe('formatCoordinates', () => {
    it('should format valid coordinates with default precision', () => {
      const result = formatCoordinates(validCoords);
      expect(result).toBe('40.7128, -74.0060');
    });

    it('should format coordinates with custom precision', () => {
      const result = formatCoordinates(validCoords, 2);
      expect(result).toBe('40.71, -74.01');
    });

    it('should return error message for invalid coordinates', () => {
      const result = formatCoordinates(invalidCoords);
      expect(result).toBe('Invalid coordinates');
    });
  });

  describe('degreesToRadians and radiansToDegrees', () => {
    it('should convert degrees to radians correctly', () => {
      expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
      expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2);
      expect(degreesToRadians(0)).toBe(0);
    });

    it('should convert radians to degrees correctly', () => {
      expect(radiansToDegrees(Math.PI)).toBeCloseTo(180);
      expect(radiansToDegrees(Math.PI / 2)).toBeCloseTo(90);
      expect(radiansToDegrees(0)).toBe(0);
    });

    it('should be inverse operations', () => {
      const degrees = 45;
      expect(radiansToDegrees(degreesToRadians(degrees))).toBeCloseTo(degrees);
    });
  });

  describe('calculateBearing', () => {
    it('should calculate bearing between two points', () => {
      const from: Coordinates = { latitude: 0, longitude: 0 };
      const to: Coordinates = { latitude: 1, longitude: 0 };
      const bearing = calculateBearing(from, to);
      expect(bearing).toBeCloseTo(0, 1); // North
    });

    it('should calculate bearing for eastward direction', () => {
      const from: Coordinates = { latitude: 0, longitude: 0 };
      const to: Coordinates = { latitude: 0, longitude: 1 };
      const bearing = calculateBearing(from, to);
      expect(bearing).toBeCloseTo(90, 1); // East
    });

    it('should throw error for invalid coordinates', () => {
      expect(() => calculateBearing(invalidCoords, validCoords)).toThrow(
        'Invalid coordinates provided for bearing calculation'
      );
    });
  });

  describe('isWithinBounds', () => {
    const bounds = {
      north: 41,
      south: 40,
      east: -73,
      west: -75,
    };

    it('should return true for coordinates within bounds', () => {
      const coord: Coordinates = { latitude: 40.5, longitude: -74 };
      expect(isWithinBounds(coord, bounds)).toBe(true);
    });

    it('should return false for coordinates outside bounds', () => {
      const coord: Coordinates = { latitude: 42, longitude: -74 };
      expect(isWithinBounds(coord, bounds)).toBe(false);
    });

    it('should return false for invalid coordinates', () => {
      expect(isWithinBounds(invalidCoords, bounds)).toBe(false);
    });
  });

  describe('createBoundingBox', () => {
    it('should create bounding box around center point', () => {
      const center: Coordinates = { latitude: 40, longitude: -74 };
      const radiusKm = 10;
      const bounds = createBoundingBox(center, radiusKm);

      expect(bounds.north).toBeGreaterThan(center.latitude);
      expect(bounds.south).toBeLessThan(center.latitude);
      expect(bounds.east).toBeGreaterThan(center.longitude);
      expect(bounds.west).toBeLessThan(center.longitude);
    });

    it('should throw error for invalid center coordinates', () => {
      expect(() => createBoundingBox(invalidCoords, 10)).toThrow(
        'Invalid center coordinates provided'
      );
    });

    it('should throw error for negative radius', () => {
      expect(() => createBoundingBox(validCoords, -5)).toThrow(
        'Radius must be positive'
      );
    });

    it('should respect latitude bounds', () => {
      const center: Coordinates = { latitude: 89, longitude: 0 };
      const bounds = createBoundingBox(center, 200); // Large radius
      expect(bounds.north).toBeLessThanOrEqual(90);
      expect(bounds.south).toBeGreaterThanOrEqual(-90);
    });
  });

  describe('findClosestCoordinate', () => {
    const mockCalculateDistance = (from: Coordinates, to: Coordinates): number => {
      // Simple Euclidean distance for testing
      const latDiff = from.latitude - to.latitude;
      const lngDiff = from.longitude - to.longitude;
      return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
    };

    it('should find closest coordinate', () => {
      const target: Coordinates = { latitude: 40, longitude: -74 };
      const coordinates: Coordinates[] = [
        { latitude: 41, longitude: -74 },
        { latitude: 40.1, longitude: -74 },
        { latitude: 39, longitude: -74 },
      ];

      const result = findClosestCoordinate(target, coordinates, mockCalculateDistance);
      expect(result).not.toBeNull();
      expect(result!.coordinate).toEqual({ latitude: 40.1, longitude: -74 });
    });

    it('should return null for empty coordinates array', () => {
      const result = findClosestCoordinate(validCoords, [], mockCalculateDistance);
      expect(result).toBeNull();
    });

    it('should return null for invalid target coordinates', () => {
      const coordinates: Coordinates[] = [validCoords];
      const result = findClosestCoordinate(invalidCoords, coordinates, mockCalculateDistance);
      expect(result).toBeNull();
    });

    it('should skip invalid coordinates in the list', () => {
      const target: Coordinates = { latitude: 40, longitude: -74 };
      const coordinates: Coordinates[] = [
        invalidCoords,
        { latitude: 40.1, longitude: -74 },
      ];

      const result = findClosestCoordinate(target, coordinates, mockCalculateDistance);
      expect(result).not.toBeNull();
      expect(result!.coordinate).toEqual({ latitude: 40.1, longitude: -74 });
    });
  });

  describe('coordinatesEqual', () => {
    it('should return true for identical coordinates', () => {
      expect(coordinatesEqual(validCoords, validCoords)).toBe(true);
    });

    it('should return true for coordinates within tolerance', () => {
      const coord1: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const coord2: Coordinates = { latitude: 40.7129, longitude: -74.0061 };
      expect(coordinatesEqual(coord1, coord2, 100)).toBe(true);
    });

    it('should return false for coordinates outside tolerance', () => {
      const coord1: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const coord2: Coordinates = { latitude: 41.7128, longitude: -74.0060 };
      expect(coordinatesEqual(coord1, coord2, 10)).toBe(false);
    });

    it('should return false for invalid coordinates', () => {
      expect(coordinatesEqual(invalidCoords, validCoords)).toBe(false);
    });
  });

  describe('normalizeCoordinates', () => {
    it('should return coordinates unchanged if already normalized', () => {
      const result = normalizeCoordinates(validCoords);
      expect(result).toEqual(validCoords);
    });

    it('should normalize longitude greater than 180', () => {
      const coords: Coordinates = { latitude: 40, longitude: 190 };
      const result = normalizeCoordinates(coords);
      expect(result.longitude).toBeCloseTo(-170);
    });

    it('should normalize longitude less than -180', () => {
      const coords: Coordinates = { latitude: 40, longitude: -190 };
      const result = normalizeCoordinates(coords);
      expect(result.longitude).toBeCloseTo(170);
    });

    it('should throw error for invalid coordinates', () => {
      expect(() => normalizeCoordinates(invalidCoords)).toThrow(
        'Invalid coordinates provided'
      );
    });

    it('should handle multiple wraps around', () => {
      const coords: Coordinates = { latitude: 40, longitude: 540 }; // 540 = 180 + 360
      const result = normalizeCoordinates(coords);
      expect(result.longitude).toBeCloseTo(180);
    });
  });
});