import { describe, it, expect } from 'vitest';
import { InputValidator } from './InputValidator';
import { validateArray } from './arrayValidators';
import { validateCoordinates } from './coordinateValidators';
import { createSafeDefaults } from './safeDefaults';

describe('InputValidator', () => {
  describe('basic validation methods', () => {
    it('should validate strings correctly', () => {
      const result = InputValidator.validateString('test', 'testField');
      expect(result.isValid).toBe(true);
      expect(result.data).toBe('test');
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid strings', () => {
      const result = InputValidator.validateString('', 'testField');
      expect(result.isValid).toBe(false);
      expect(result.data).toBe(null);
      expect(result.errors).toHaveLength(1);
    });

    it('should validate numbers correctly', () => {
      const result = InputValidator.validateNumber(42, 'testField');
      expect(result.isValid).toBe(true);
      expect(result.data).toBe(42);
    });

    it('should validate numbers with bounds', () => {
      const result = InputValidator.validateNumber(5, 'testField', 1, 10);
      expect(result.isValid).toBe(true);
      expect(result.data).toBe(5);
    });

    it('should reject numbers outside bounds', () => {
      const result = InputValidator.validateNumber(15, 'testField', 1, 10);
      expect(result.isValid).toBe(false);
      expect(result.data).toBe(null);
    });
  });

  describe('coordinate validation', () => {
    it('should validate valid coordinates', () => {
      const coords = { latitude: 46.7712, longitude: 23.6236 };
      const result = validateCoordinates(coords);
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(coords);
    });

    it('should reject invalid coordinates', () => {
      const coords = { latitude: 200, longitude: 23.6236 };
      const result = validateCoordinates(coords);
      expect(result.isValid).toBe(false);
      expect(result.data).toBe(null);
    });
  });

  describe('array validation', () => {
    it('should validate empty arrays when allowed', () => {
      const result = validateArray([], () => InputValidator.success('item'), 'testArray', true);
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should reject non-arrays', () => {
      const result = validateArray('not-array', () => InputValidator.success('item'), 'testArray');
      expect(result.isValid).toBe(false);
      expect(result.data).toBe(null);
    });
  });

  describe('safe defaults', () => {
    it('should create safe coordinate defaults', () => {
      const coords = createSafeDefaults<{ latitude: number; longitude: number }>('coordinates');
      expect(coords).toHaveProperty('latitude');
      expect(coords).toHaveProperty('longitude');
      expect(typeof coords.latitude).toBe('number');
      expect(typeof coords.longitude).toBe('number');
    });

    it('should create safe array defaults', () => {
      const array = createSafeDefaults<unknown[]>('array');
      expect(Array.isArray(array)).toBe(true);
      expect(array).toHaveLength(0);
    });
  });
});