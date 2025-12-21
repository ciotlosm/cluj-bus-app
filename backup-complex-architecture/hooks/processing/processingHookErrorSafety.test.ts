import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import * as fc from 'fast-check';
import { useVehicleFiltering } from './useVehicleFiltering';
import { useVehicleGrouping } from './useVehicleGrouping';
import { useDirectionAnalysis } from './useDirectionAnalysis';
import { useProximityCalculation } from './useProximityCalculation';
import { propertyTestConfig } from '../../test/utils/propertyTestConfig';

describe('Processing Hook Error Safety', () => {
  describe('Property 8: Processing Hook Error Safety', () => {
    /**
     * **Feature: hook-refactoring, Property 8: Processing Hook Error Safety**
     * **Validates: Requirements 2.5, 8.2**
     * 
     * For any processing hook receiving invalid or null data, the hook should 
     * return safe defaults and not throw exceptions
     */
    it('should handle all types of invalid inputs without throwing', () => {
      fc.assert(
        fc.property(
          // Generate various types of invalid inputs
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constant('invalid'),
            fc.constant(123),
            fc.constant(true),
            fc.constant({}),
            fc.constant([]),
            fc.array(fc.oneof(
              fc.constant(null),
              fc.constant(undefined),
              fc.constant('invalid'),
              fc.constant({}),
              fc.record({
                id: fc.oneof(fc.constant(null), fc.constant(''), fc.constant(123)),
                routeId: fc.oneof(fc.constant(null), fc.constant(''), fc.constant({})),
                position: fc.oneof(
                  fc.constant(null),
                  fc.constant({}),
                  fc.record({
                    latitude: fc.oneof(fc.constant(NaN), fc.constant(Infinity), fc.constant('invalid')),
                    longitude: fc.oneof(fc.constant(NaN), fc.constant(Infinity), fc.constant('invalid'))
                  })
                )
              })
            ), { minLength: 0, maxLength: 3 })
          ),
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constant('invalid'),
            fc.constant(123),
            fc.constant({}),
            fc.array(fc.oneof(
              fc.constant(null),
              fc.constant({}),
              fc.record({
                id: fc.oneof(fc.constant(null), fc.constant(''), fc.constant(123)),
                coordinates: fc.oneof(
                  fc.constant(null),
                  fc.constant({}),
                  fc.record({
                    latitude: fc.oneof(fc.constant(NaN), fc.constant(Infinity), fc.constant('invalid')),
                    longitude: fc.oneof(fc.constant(NaN), fc.constant(Infinity), fc.constant('invalid'))
                  })
                )
              })
            ), { minLength: 0, maxLength: 3 })
          ),
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constant('invalid'),
            fc.constant({}),
            fc.record({
              latitude: fc.oneof(fc.constant(NaN), fc.constant(Infinity), fc.constant('invalid')),
              longitude: fc.oneof(fc.constant(NaN), fc.constant(Infinity), fc.constant('invalid'))
            })
          ),
          (invalidVehicles, invalidStations, invalidLocation) => {
            // Test useVehicleFiltering with invalid inputs
            expect(() => {
              const { result } = renderHook(() => 
                useVehicleFiltering(invalidVehicles as any, {
                  filterByFavorites: true,
                  favoriteRoutes: invalidStations as any,
                  userLocation: invalidLocation as any
                })
              );
              
              // Should return a valid result structure
              expect(result.current).toBeDefined();
              expect(Array.isArray(result.current.filteredVehicles)).toBe(true);
              expect(typeof result.current.filterStats).toBe('object');
              expect(typeof result.current.filterStats.totalVehicles).toBe('number');
              expect(typeof result.current.filterStats.filteredCount).toBe('number');
              expect(Array.isArray(result.current.filterStats.appliedFilters)).toBe(true);
            }).not.toThrow();

            // Test useVehicleGrouping with invalid inputs
            expect(() => {
              const { result } = renderHook(() => 
                useVehicleGrouping(
                  invalidVehicles as any,
                  invalidStations as any,
                  invalidLocation as any,
                  {}
                )
              );
              
              // Should return a valid result structure
              expect(result.current).toBeDefined();
              expect(Array.isArray(result.current.stationGroups)).toBe(true);
              expect(typeof result.current.totalStations).toBe('number');
              expect(typeof result.current.totalVehicles).toBe('number');
              expect(typeof result.current.groupingStats).toBe('object');
            }).not.toThrow();

            // Test useDirectionAnalysis with invalid inputs
            expect(() => {
              const { result } = renderHook(() => 
                useDirectionAnalysis(
                  invalidVehicles as any,
                  invalidStations as any,
                  invalidLocation as any
                )
              );
              
              // Should return a valid result structure
              expect(result.current).toBeDefined();
              expect(['arriving', 'departing', 'unknown']).toContain(result.current.direction);
              expect(typeof result.current.estimatedMinutes).toBe('number');
              expect(['high', 'medium', 'low']).toContain(result.current.confidence);
            }).not.toThrow();

            // Test useProximityCalculation with invalid inputs
            expect(() => {
              const { result } = renderHook(() => 
                useProximityCalculation(
                  invalidLocation as any,
                  invalidStations as any,
                  invalidVehicles as any
                )
              );
              
              // Should return a valid result structure
              expect(result.current).toBeDefined();
              expect(typeof result.current.distance).toBe('number');
              expect(typeof result.current.withinRadius).toBe('boolean');
            }).not.toThrow();
          }
        ),
        propertyTestConfig
      );
    });

    it('should return consistent safe defaults for invalid inputs', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constant('not-an-array'),
            fc.constant(123),
            fc.constant({}),
            fc.array(fc.constant(null), { minLength: 1, maxLength: 3 })
          ),
          (invalidInput) => {
            // Test that all hooks return consistent safe defaults
            
            // useVehicleFiltering should return empty results
            const { result: filteringResult } = renderHook(() => 
              useVehicleFiltering(invalidInput as any, {})
            );
            
            expect(filteringResult.current.filteredVehicles).toEqual([]);
            expect(filteringResult.current.filterStats.totalVehicles).toBeGreaterThanOrEqual(0);
            expect(filteringResult.current.filterStats.filteredCount).toBe(0);
            
            // Only check for 'invalid-input' filter when input is truly invalid (not an array)
            if (!Array.isArray(invalidInput)) {
              expect(filteringResult.current.filterStats.appliedFilters).toContain('invalid-input');
            }

            // useVehicleGrouping should return empty results
            const { result: groupingResult } = renderHook(() => 
              useVehicleGrouping(invalidInput as any, invalidInput as any, invalidInput as any, {})
            );
            
            expect(groupingResult.current.stationGroups).toEqual([]);
            expect(groupingResult.current.totalStations).toBe(0);
            expect(groupingResult.current.totalVehicles).toBe(0);
            expect(groupingResult.current.groupingStats.stationsWithVehicles).toBe(0);

            // useDirectionAnalysis should return unknown direction
            const { result: directionResult } = renderHook(() => 
              useDirectionAnalysis(invalidInput as any, invalidInput as any, invalidInput as any)
            );
            
            expect(directionResult.current.direction).toBe('unknown');
            expect(directionResult.current.estimatedMinutes).toBe(0);
            expect(directionResult.current.confidence).toBe('low');

            // useProximityCalculation should return infinite distance
            const { result: proximityResult } = renderHook(() => 
              useProximityCalculation(invalidInput as any, invalidInput as any)
            );
            
            expect(proximityResult.current.distance).toBe(Infinity);
            expect(proximityResult.current.withinRadius).toBe(false);
            expect(proximityResult.current.bearing).toBeUndefined();
          }
        ),
        propertyTestConfig
      );
    });

    it('should handle mixed valid and invalid data gracefully', () => {
      fc.assert(
        fc.property(
          fc.array(fc.oneof(
            // Valid vehicle
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 10 }),
              routeId: fc.string({ minLength: 1, maxLength: 10 }),
              position: fc.record({
                latitude: fc.double({ min: 46.7, max: 46.8 }),
                longitude: fc.double({ min: 23.5, max: 23.7 })
              }),
              timestamp: fc.date(),
              speed: fc.double({ min: 0, max: 80 }),
              isWheelchairAccessible: fc.boolean(),
              isBikeAccessible: fc.boolean()
            }),
            // Invalid vehicle
            fc.oneof(
              fc.constant(null),
              fc.constant({}),
              fc.record({
                id: fc.constant(''),
                routeId: fc.constant(null),
                position: fc.record({
                  latitude: fc.constant(NaN),
                  longitude: fc.constant(Infinity)
                })
              })
            )
          ), { minLength: 1, maxLength: 5 }),
          (mixedVehicles) => {
            // useVehicleFiltering should filter out invalid vehicles and process valid ones
            const { result } = renderHook(() => 
              useVehicleFiltering(mixedVehicles as any, {})
            );

            // Should not throw
            expect(result.current).toBeDefined();
            expect(Array.isArray(result.current.filteredVehicles)).toBe(true);
            
            // All returned vehicles should be valid
            result.current.filteredVehicles.forEach(vehicle => {
              expect(vehicle.id).toBeTruthy();
              expect(vehicle.routeId).toBeTruthy();
              expect(typeof vehicle.position.latitude).toBe('number');
              expect(typeof vehicle.position.longitude).toBe('number');
              expect(!isNaN(vehicle.position.latitude)).toBe(true);
              expect(!isNaN(vehicle.position.longitude)).toBe(true);
            });

            // Filter stats should reflect the filtering
            expect(result.current.filterStats.filteredCount).toBe(result.current.filteredVehicles.length);
            expect(result.current.filterStats.filteredCount).toBeLessThanOrEqual(result.current.filterStats.totalVehicles);
          }
        ),
        propertyTestConfig
      );
    });

    it('should maintain type safety with malformed objects', () => {
      // Test with objects that have the right shape but wrong types
      const malformedData = [
        {
          id: 123, // should be string
          routeId: true, // should be string
          position: {
            latitude: '46.75', // should be number
            longitude: [23.6] // should be number
          },
          timestamp: 'not-a-date',
          speed: 'fast'
        },
        {
          id: null,
          routeId: undefined,
          position: {
            latitude: {},
            longitude: function() {}
          }
        }
      ];

      expect(() => {
        const { result } = renderHook(() => 
          useVehicleFiltering(malformedData as any, {})
        );
        
        // Should handle type mismatches gracefully
        expect(result.current.filteredVehicles).toEqual([]);
        // Malformed objects in arrays don't trigger 'invalid-input' since the array itself is valid
      }).not.toThrow();

      expect(() => {
        const { result } = renderHook(() => 
          useVehicleGrouping(malformedData as any, malformedData as any, malformedData as any, {})
        );
        
        // Should handle type mismatches gracefully
        expect(result.current.stationGroups).toEqual([]);
      }).not.toThrow();
    });

    it('should handle circular references and complex objects', () => {
      // Create objects with circular references
      const circularObj: any = { id: 'test' };
      circularObj.self = circularObj;
      
      const complexData = [circularObj, { nested: { deep: { object: { with: { many: { levels: 'value' } } } } } }];

      expect(() => {
        const { result } = renderHook(() => 
          useVehicleFiltering(complexData as any, {})
        );
        
        // Should not crash on circular references
        expect(result.current).toBeDefined();
      }).not.toThrow();

      expect(() => {
        const { result } = renderHook(() => 
          useDirectionAnalysis(circularObj, circularObj, complexData as any)
        );
        
        // Should not crash on circular references
        expect(result.current.direction).toBe('unknown');
      }).not.toThrow();
    });
  });
});