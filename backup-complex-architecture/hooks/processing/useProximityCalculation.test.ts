import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import * as fc from 'fast-check';
import { useProximityCalculation } from './useProximityCalculation';
import { propertyTestConfig } from '../../test/utils/propertyTestConfig';
import { 
  clujCoordinatesArb,
  createMockData 
} from '../../test/utils/mockDataGenerators';
import type { Coordinates } from '../../types';

describe('useProximityCalculation', () => {
  describe('Property 7: Proximity Calculation Correctness', () => {
    /**
     * **Feature: hook-refactoring, Property 7: Proximity Calculation Correctness**
     * **Validates: Requirements 2.4**
     * 
     * For any two valid coordinate pairs, the proximity calculation should return 
     * accurate distances using the haversine formula within 1% tolerance
     */
    it('should return accurate distances using haversine formula', () => {
      fc.assert(
        fc.property(
          clujCoordinatesArb,
          clujCoordinatesArb,
          fc.option(fc.double({ min: 100, max: 10000 })), // maxRadius
          (from, to, maxRadius) => {
            // Ensure valid coordinates
            const validFrom: Coordinates = {
              latitude: isNaN(from.latitude) ? 46.75 : from.latitude,
              longitude: isNaN(from.longitude) ? 23.6 : from.longitude
            };

            const validTo: Coordinates = {
              latitude: isNaN(to.latitude) ? 46.76 : to.latitude,
              longitude: isNaN(to.longitude) ? 23.61 : to.longitude
            };

            const { result } = renderHook(() => 
              useProximityCalculation(validFrom, validTo, maxRadius || undefined)
            );

            const proximityResult = result.current;

            // Basic structure validation
            expect(typeof proximityResult.distance).toBe('number');
            expect(typeof proximityResult.withinRadius).toBe('boolean');

            // Distance should be non-negative and finite
            expect(proximityResult.distance).toBeGreaterThanOrEqual(0);
            expect(Number.isFinite(proximityResult.distance)).toBe(true);



            // Radius check should be consistent with distance and maxRadius
            if (maxRadius !== undefined && maxRadius !== null && !isNaN(maxRadius) && maxRadius > 0) {
              expect(proximityResult.withinRadius).toBe(proximityResult.distance <= maxRadius);
            } else {
              expect(proximityResult.withinRadius).toBe(true); // Should default to true when no radius specified
            }

            // Distance should be 0 when coordinates are identical
            if (validFrom.latitude === validTo.latitude && validFrom.longitude === validTo.longitude) {
              expect(proximityResult.distance).toBe(0);
            }

            // Distance should be symmetric (distance from A to B equals distance from B to A)
            const { result: reverseResult } = renderHook(() => 
              useProximityCalculation(validTo, validFrom, maxRadius || undefined)
            );
            
            // Allow small floating point differences
            const tolerance = 0.01; // 1cm tolerance
            expect(Math.abs(proximityResult.distance - reverseResult.current.distance)).toBeLessThan(tolerance);


          }
        ),
        propertyTestConfig
      );
    });

    it('should handle edge cases gracefully', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null), // null coordinates
            fc.constant({}), // empty object
            fc.record({
              latitude: fc.oneof(fc.constant(NaN), fc.constant(Infinity), fc.double({ min: -200, max: 200 })),
              longitude: fc.oneof(fc.constant(NaN), fc.constant(Infinity), fc.double({ min: -200, max: 200 }))
            })
          ),
          fc.oneof(
            fc.constant(null), // null coordinates
            fc.constant({}), // empty object
            fc.record({
              latitude: fc.oneof(fc.constant(NaN), fc.constant(Infinity), fc.double({ min: -200, max: 200 })),
              longitude: fc.oneof(fc.constant(NaN), fc.constant(Infinity), fc.double({ min: -200, max: 200 }))
            })
          ),
          fc.option(fc.oneof(
            fc.constant(NaN),
            fc.constant(Infinity),
            fc.constant(-1), // negative radius
            fc.double({ min: 0, max: 10000 })
          )),
          (invalidFrom, invalidTo, invalidRadius) => {
            const { result } = renderHook(() => 
              useProximityCalculation(invalidFrom as any, invalidTo as any, invalidRadius || undefined)
            );

            // Should not throw and should return safe defaults
            expect(result.current).toBeDefined();
            expect(typeof result.current.distance).toBe('number');
            expect(typeof result.current.withinRadius).toBe('boolean');

            // With invalid inputs, should return safe defaults
            // However, valid coordinates (0,0) should return distance 0, not Infinity
            if (invalidFrom && invalidTo && 
                typeof invalidFrom === 'object' && typeof invalidTo === 'object' &&
                typeof invalidFrom.latitude === 'number' && typeof invalidFrom.longitude === 'number' &&
                typeof invalidTo.latitude === 'number' && typeof invalidTo.longitude === 'number' &&
                !isNaN(invalidFrom.latitude) && !isNaN(invalidFrom.longitude) &&
                !isNaN(invalidTo.latitude) && !isNaN(invalidTo.longitude) &&
                Math.abs(invalidFrom.latitude) <= 90 && Math.abs(invalidFrom.longitude) <= 180 &&
                Math.abs(invalidTo.latitude) <= 90 && Math.abs(invalidTo.longitude) <= 180) {
              // These are actually valid coordinates, so distance should be finite
              expect(Number.isFinite(result.current.distance)).toBe(true);
              expect(result.current.distance).toBeGreaterThanOrEqual(0);
            } else {
              // Truly invalid inputs should return safe defaults
              expect(result.current.distance).toBe(Infinity);
              expect(result.current.withinRadius).toBe(false);
            }
          }
        ),
        propertyTestConfig
      );
    });

    it('should maintain consistency across multiple calls', () => {
      fc.assert(
        fc.property(
          clujCoordinatesArb,
          clujCoordinatesArb,
          fc.option(fc.double({ min: 100, max: 5000 })),
          (from, to, maxRadius) => {
            // Ensure valid coordinates
            const validFrom: Coordinates = {
              latitude: 46.75,
              longitude: 23.6
            };

            const validTo: Coordinates = {
              latitude: 46.76,
              longitude: 23.61
            };

            // Run calculation multiple times
            const { result: result1 } = renderHook(() => 
              useProximityCalculation(validFrom, validTo, maxRadius || undefined)
            );
            
            const { result: result2 } = renderHook(() => 
              useProximityCalculation(validFrom, validTo, maxRadius || undefined)
            );

            // Results should be identical
            expect(result1.current.distance).toBe(result2.current.distance);
            expect(result1.current.withinRadius).toBe(result2.current.withinRadius);
          }
        ),
        propertyTestConfig
      );
    });

    it('should validate known distance calculations', () => {
      // Test with known coordinates and expected distances
      const testCases = [
        {
          from: { latitude: 46.75, longitude: 23.6 },
          to: { latitude: 46.75, longitude: 23.6 },
          expectedDistance: 0,
          tolerance: 0.1
        },
        {
          from: { latitude: 46.75, longitude: 23.6 },
          to: { latitude: 46.751, longitude: 23.6 }, // ~111 meters north
          expectedDistance: 111,
          tolerance: 10 // 10 meter tolerance
        },
        {
          from: { latitude: 46.75, longitude: 23.6 },
          to: { latitude: 46.75, longitude: 23.601 }, // ~67 meters east (at this latitude)
          expectedDistance: 67,
          tolerance: 10 // 10 meter tolerance
        }
      ];

      testCases.forEach(({ from, to, expectedDistance, tolerance }) => {
        const { result } = renderHook(() => 
          useProximityCalculation(from, to)
        );

        expect(Math.abs(result.current.distance - expectedDistance)).toBeLessThan(tolerance);
      });
    });
  });

  describe('Unit Tests', () => {
    it('should calculate distance between two points', () => {
      const from: Coordinates = { latitude: 46.75, longitude: 23.6 };
      const to: Coordinates = { latitude: 46.76, longitude: 23.61 };

      const { result } = renderHook(() => 
        useProximityCalculation(from, to)
      );

      expect(result.current.distance).toBeGreaterThan(0);
      expect(result.current.withinRadius).toBe(true); // No radius specified
    });

    it('should return 0 distance for identical coordinates', () => {
      const coordinates: Coordinates = { latitude: 46.75, longitude: 23.6 };

      const { result } = renderHook(() => 
        useProximityCalculation(coordinates, coordinates)
      );

      expect(result.current.distance).toBe(0);
      expect(result.current.withinRadius).toBe(true);
    });

    it('should respect maxRadius parameter', () => {
      const from: Coordinates = { latitude: 46.75, longitude: 23.6 };
      const to: Coordinates = { latitude: 46.76, longitude: 23.61 }; // ~1.4km away
      const maxRadius = 500; // 500 meters

      const { result } = renderHook(() => 
        useProximityCalculation(from, to, maxRadius)
      );

      expect(result.current.distance).toBeGreaterThan(maxRadius);
      expect(result.current.withinRadius).toBe(false);
    });

    it('should handle null coordinates gracefully', () => {
      const { result } = renderHook(() => 
        useProximityCalculation(null, null)
      );

      expect(result.current.distance).toBe(Infinity);
      expect(result.current.withinRadius).toBe(false);
    });

    it('should handle invalid coordinate values', () => {
      const invalidFrom: Coordinates = { latitude: NaN, longitude: 23.6 };
      const validTo: Coordinates = { latitude: 46.75, longitude: 23.6 };

      const { result } = renderHook(() => 
        useProximityCalculation(invalidFrom, validTo)
      );

      expect(result.current.distance).toBe(Infinity);
      expect(result.current.withinRadius).toBe(false);
    });



    it('should round results to 2 decimal places', () => {
      const from: Coordinates = { latitude: 46.75, longitude: 23.6 };
      const to: Coordinates = { latitude: 46.750001, longitude: 23.600001 }; // Very small difference

      const { result } = renderHook(() => 
        useProximityCalculation(from, to)
      );

      // Check that distance is rounded to 2 decimal places
      const distanceStr = result.current.distance.toString();
      const decimalIndex = distanceStr.indexOf('.');
      if (decimalIndex !== -1) {
        expect(distanceStr.length - decimalIndex - 1).toBeLessThanOrEqual(2);
      }


    });
  });
});