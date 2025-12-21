import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  isValidUserConfig, 
  isValidCoordinates,
  isValidFavorites
} from './validation';

// **Feature: bus-tracker, Property 14: Configuration round-trip integrity**
// **Validates: Requirements 1.2**
describe('Configuration round-trip integrity', () => {
  // Generator for valid coordinates
  const coordinatesArb = fc.record({
    latitude: fc.double({ min: -90, max: 90, noNaN: true }),
    longitude: fc.double({ min: -180, max: 180, noNaN: true })
  });

  // Generator for valid user configuration
  const userConfigArb = fc.record({
    city: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    homeLocation: coordinatesArb,
    workLocation: coordinatesArb,
    apiKey: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    refreshRate: fc.integer({ min: 1000, max: 300000 }) // 1 second to 5 minutes
  });

  it('should preserve configuration data through serialization round-trip', () => {
    fc.assert(
      fc.property(userConfigArb, (originalConfig) => {
        // Simulate saving configuration (serialize to JSON and back)
        const serialized = JSON.stringify(originalConfig);
        const deserialized = JSON.parse(serialized);
        
        // Validate that the deserialized config is still valid
        expect(isValidUserConfig(deserialized)).toBe(true);
        
        // Verify all properties are preserved
        expect(deserialized.city).toBe(originalConfig.city);
        expect(deserialized.apiKey).toBe(originalConfig.apiKey);
        expect(deserialized.refreshRate).toBe(originalConfig.refreshRate);
        
        // For coordinates, check functional equivalence (JSON normalizes -0 to 0)
        expect(deserialized.homeLocation.latitude).toBeCloseTo(originalConfig.homeLocation.latitude, 10);
        expect(deserialized.homeLocation.longitude).toBeCloseTo(originalConfig.homeLocation.longitude, 10);
        expect(deserialized.workLocation.latitude).toBeCloseTo(originalConfig.workLocation.latitude, 10);
        expect(deserialized.workLocation.longitude).toBeCloseTo(originalConfig.workLocation.longitude, 10);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve configuration through localStorage round-trip', () => {
    fc.assert(
      fc.property(userConfigArb, (originalConfig) => {
        // Simulate localStorage save/load cycle
        const key = 'test-config';
        localStorage.setItem(key, JSON.stringify(originalConfig));
        const retrieved = JSON.parse(localStorage.getItem(key) || '{}');
        
        // Clean up
        localStorage.removeItem(key);
        
        // Validate that the retrieved config is still valid
        expect(isValidUserConfig(retrieved)).toBe(true);
        
        // Verify all properties are preserved
        expect(retrieved.city).toBe(originalConfig.city);
        expect(retrieved.apiKey).toBe(originalConfig.apiKey);
        expect(retrieved.refreshRate).toBe(originalConfig.refreshRate);
        
        // For coordinates, check functional equivalence (JSON normalizes -0 to 0)
        expect(retrieved.homeLocation.latitude).toBeCloseTo(originalConfig.homeLocation.latitude, 10);
        expect(retrieved.homeLocation.longitude).toBeCloseTo(originalConfig.homeLocation.longitude, 10);
        expect(retrieved.workLocation.latitude).toBeCloseTo(originalConfig.workLocation.latitude, 10);
        expect(retrieved.workLocation.longitude).toBeCloseTo(originalConfig.workLocation.longitude, 10);
      }),
      { numRuns: 100 }
    );
  });
});

// Additional unit tests for validation functions
describe('Validation functions', () => {
  describe('isValidCoordinates', () => {
    it('should accept valid coordinates', () => {
      expect(isValidCoordinates({ latitude: 0, longitude: 0 })).toBe(true);
      expect(isValidCoordinates({ latitude: 90, longitude: 180 })).toBe(true);
      expect(isValidCoordinates({ latitude: -90, longitude: -180 })).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      expect(isValidCoordinates({ latitude: 91, longitude: 0 })).toBe(false);
      expect(isValidCoordinates({ latitude: 0, longitude: 181 })).toBe(false);
      expect(isValidCoordinates({ latitude: 'invalid', longitude: 0 })).toBe(false);
      expect(isValidCoordinates(null)).toBe(false);
    });
  });

  describe('isValidUserConfig', () => {
    const validConfig = {
      city: 'Cluj-Napoca',
      homeLocation: { latitude: 46.7712, longitude: 23.6236 },
      workLocation: { latitude: 46.7712, longitude: 23.6236 },
      apiKey: 'test-key',
      refreshRate: 30000
    };

    it('should accept valid configuration', () => {
      expect(isValidUserConfig(validConfig)).toBe(true);
    });

    it('should reject invalid configuration', () => {
      expect(isValidUserConfig({ ...validConfig, city: '' })).toBe(false);
      expect(isValidUserConfig({ ...validConfig, apiKey: '' })).toBe(false);
      expect(isValidUserConfig({ ...validConfig, refreshRate: 0 })).toBe(false);
      expect(isValidUserConfig({ ...validConfig, refreshRate: 400000 })).toBe(false);
    });
  });

  describe('isValidFavorites', () => {
    it('should accept valid favorites', () => {
      expect(isValidFavorites({ buses: [], stations: [] })).toBe(true);
      expect(isValidFavorites({ buses: ['bus1'], stations: ['station1'] })).toBe(true);
    });

    it('should reject invalid favorites', () => {
      expect(isValidFavorites({ buses: [''], stations: [] })).toBe(false);
      expect(isValidFavorites({ buses: [123], stations: [] })).toBe(false);
      expect(isValidFavorites({ buses: 'invalid', stations: [] })).toBe(false);
    });
  });
});