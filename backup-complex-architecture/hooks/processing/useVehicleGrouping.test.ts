import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import * as fc from 'fast-check';
import { useVehicleGrouping } from './useVehicleGrouping';
import { propertyTestConfig } from '../../test/utils/propertyTestConfig';
import { 
  coreVehicleArb, 
  stationArb,
  clujCoordinatesArb,
  createMockData 
} from '../../test/utils/mockDataGenerators';
import type { Station, Coordinates } from '../../types';
import type { CoreVehicle } from '../../types/coreVehicle';

describe('useVehicleGrouping', () => {
  describe('Property 5: Vehicle Grouping Consistency', () => {
    /**
     * **Feature: hook-refactoring, Property 5: Vehicle Grouping Consistency**
     * **Validates: Requirements 2.2**
     * 
     * For any set of vehicles and stations, the grouping hook should produce 
     * consistent groupings that respect distance and capacity constraints
     */
    it('should produce consistent groupings that respect constraints', () => {
      fc.assert(
        fc.property(
          fc.array(coreVehicleArb, { minLength: 0, maxLength: 15 }),
          fc.array(stationArb, { minLength: 1, maxLength: 10 }),
          clujCoordinatesArb, // userLocation
          fc.integer({ min: 1, max: 5 }), // maxStations
          fc.integer({ min: 1, max: 8 }), // maxVehiclesPerStation
          fc.double({ min: 50, max: 1000 }), // proximityThreshold
          (vehicles, stations, userLocation, maxStations, maxVehiclesPerStation, proximityThreshold) => {
            // Ensure valid data for consistent testing
            const validVehicles = vehicles.map((vehicle, index) => ({
              ...vehicle,
              id: vehicle.id || `vehicle-${index}`,
              routeId: vehicle.routeId || `route-${index % 3}`,
              position: {
                ...vehicle.position,
                latitude: isNaN(vehicle.position.latitude) ? 46.75 : vehicle.position.latitude,
                longitude: isNaN(vehicle.position.longitude) ? 23.6 : vehicle.position.longitude
              }
            }));

            const validStations = stations.map((station, index) => ({
              ...station,
              id: station.id || `station-${index}`,
              name: station.name || `Station ${index}`,
              coordinates: {
                ...station.coordinates,
                latitude: isNaN(station.coordinates.latitude) ? 46.75 + (index * 0.01) : station.coordinates.latitude,
                longitude: isNaN(station.coordinates.longitude) ? 23.6 + (index * 0.01) : station.coordinates.longitude
              }
            }));

            const validUserLocation: Coordinates = {
              latitude: isNaN(userLocation.latitude) ? 46.75 : userLocation.latitude,
              longitude: isNaN(userLocation.longitude) ? 23.6 : userLocation.longitude
            };

            const options = {
              maxStations,
              maxVehiclesPerStation,
              proximityThreshold
            };

            const { result } = renderHook(() => 
              useVehicleGrouping(validVehicles, validStations, validUserLocation, options)
            );

            const groupingResult = result.current;

            // Basic structure validation
            expect(Array.isArray(groupingResult.stationGroups)).toBe(true);
            expect(typeof groupingResult.totalStations).toBe('number');
            expect(typeof groupingResult.totalVehicles).toBe('number');
            expect(typeof groupingResult.groupingStats).toBe('object');

            // Constraint validation: maxStations
            expect(groupingResult.stationGroups.length).toBeLessThanOrEqual(maxStations);

            // Constraint validation: maxVehiclesPerStation
            groupingResult.stationGroups.forEach(group => {
              expect(group.vehicles.length).toBeLessThanOrEqual(maxVehiclesPerStation);
              expect(group.vehicles.length).toBeGreaterThan(0); // Only stations with vehicles should be included
            });

            // Consistency validation: all vehicles in groups should exist in original array
            const allGroupedVehicles = groupingResult.stationGroups.flatMap(group => group.vehicles);
            allGroupedVehicles.forEach(groupedVehicle => {
              expect(validVehicles.some(v => v.id === groupedVehicle.id)).toBe(true);
            });

            // Consistency validation: no duplicate vehicles across groups
            const vehicleIds = allGroupedVehicles.map(v => v.id);
            const uniqueVehicleIds = new Set(vehicleIds);
            expect(vehicleIds.length).toBe(uniqueVehicleIds.size);

            // Consistency validation: all stations in groups should exist in original array
            groupingResult.stationGroups.forEach(group => {
              expect(validStations.some(s => s.id === group.station.station.id)).toBe(true);
              expect(typeof group.station.distance).toBe('number');
              expect(group.station.distance).toBeGreaterThanOrEqual(0);
            });

            // Route aggregation validation
            groupingResult.stationGroups.forEach(group => {
              expect(Array.isArray(group.allRoutes)).toBe(true);
              
              // Each route should have valid properties
              group.allRoutes.forEach(route => {
                expect(typeof route.routeId).toBe('string');
                expect(typeof route.routeName).toBe('string');
                expect(typeof route.vehicleCount).toBe('number');
                expect(route.vehicleCount).toBeGreaterThan(0);
              });

              // Route counts should match actual vehicles
              const totalRouteVehicles = group.allRoutes.reduce((sum, route) => sum + route.vehicleCount, 0);
              expect(totalRouteVehicles).toBeGreaterThanOrEqual(group.vehicles.length);
            });

            // Statistics validation
            expect(groupingResult.groupingStats.stationsWithVehicles).toBe(groupingResult.stationGroups.length);
            expect(groupingResult.groupingStats.averageVehiclesPerStation).toBeGreaterThanOrEqual(0);
            expect(groupingResult.groupingStats.maxDistanceIncluded).toBeGreaterThanOrEqual(0);

            // Distance ordering validation (stations should be ordered by distance)
            for (let i = 1; i < groupingResult.stationGroups.length; i++) {
              const prevDistance = groupingResult.stationGroups[i - 1].station.distance;
              const currDistance = groupingResult.stationGroups[i].station.distance;
              expect(currDistance).toBeGreaterThanOrEqual(prevDistance);
            }
          }
        ),
        propertyTestConfig
      );
    });

    it('should handle edge cases gracefully', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant([]), // empty vehicles
            fc.constant(null as any), // null vehicles
            fc.array(fc.oneof(
              fc.constant(null), // null vehicle
              fc.constant({}), // empty object
              fc.record({
                id: fc.constant(''),
                routeId: fc.constant(''),
                position: fc.record({
                  latitude: fc.oneof(fc.constant(NaN), fc.constant(Infinity)),
                  longitude: fc.oneof(fc.constant(NaN), fc.constant(Infinity))
                })
              })
            ), { minLength: 1, maxLength: 3 })
          ),
          fc.oneof(
            fc.constant([]), // empty stations
            fc.constant(null as any), // null stations
            fc.array(fc.oneof(
              fc.constant(null), // null station
              fc.constant({}), // empty object
              fc.record({
                id: fc.constant(''),
                name: fc.constant(''),
                coordinates: fc.record({
                  latitude: fc.oneof(fc.constant(NaN), fc.constant(Infinity)),
                  longitude: fc.oneof(fc.constant(NaN), fc.constant(Infinity))
                })
              })
            ), { minLength: 1, maxLength: 3 })
          ),
          fc.oneof(
            fc.constant(null as any), // null location
            fc.record({
              latitude: fc.oneof(fc.constant(NaN), fc.constant(Infinity), fc.double({ min: -200, max: 200 })),
              longitude: fc.oneof(fc.constant(NaN), fc.constant(Infinity), fc.double({ min: -200, max: 200 }))
            })
          ),
          (invalidVehicles, invalidStations, invalidLocation) => {
            const { result } = renderHook(() => 
              useVehicleGrouping(invalidVehicles, invalidStations, invalidLocation, {})
            );

            // Should not throw and should return safe defaults
            expect(result.current).toBeDefined();
            expect(Array.isArray(result.current.stationGroups)).toBe(true);
            expect(typeof result.current.totalStations).toBe('number');
            expect(typeof result.current.totalVehicles).toBe('number');
            expect(typeof result.current.groupingStats).toBe('object');
            expect(result.current.groupingStats.stationsWithVehicles).toBeGreaterThanOrEqual(0);
            expect(result.current.groupingStats.averageVehiclesPerStation).toBeGreaterThanOrEqual(0);
            expect(result.current.groupingStats.maxDistanceIncluded).toBeGreaterThanOrEqual(0);
          }
        ),
        propertyTestConfig
      );
    });

    it('should maintain deterministic ordering', () => {
      fc.assert(
        fc.property(
          fc.array(coreVehicleArb, { minLength: 2, maxLength: 8 }),
          fc.array(stationArb, { minLength: 2, maxLength: 5 }),
          clujCoordinatesArb,
          (vehicles, stations, userLocation) => {
            // Ensure valid data
            const validVehicles = vehicles.map((vehicle, index) => ({
              ...vehicle,
              id: `vehicle-${index}`,
              routeId: `route-${index % 2}`,
              position: {
                latitude: 46.75 + (index * 0.001),
                longitude: 23.6 + (index * 0.001)
              }
            }));

            const validStations = stations.map((station, index) => ({
              ...station,
              id: `station-${index}`,
              name: `Station ${index}`,
              coordinates: {
                latitude: 46.75 + (index * 0.01),
                longitude: 23.6 + (index * 0.01)
              }
            }));

            const validUserLocation: Coordinates = {
              latitude: 46.75,
              longitude: 23.6
            };

            // Run grouping twice with identical inputs
            const { result: result1 } = renderHook(() => 
              useVehicleGrouping(validVehicles, validStations, validUserLocation, {})
            );
            
            const { result: result2 } = renderHook(() => 
              useVehicleGrouping(validVehicles, validStations, validUserLocation, {})
            );

            // Results should be identical
            expect(result1.current.stationGroups).toEqual(result2.current.stationGroups);
            expect(result1.current.groupingStats).toEqual(result2.current.groupingStats);

            // Stations should be ordered by distance (closest first)
            for (let i = 1; i < result1.current.stationGroups.length; i++) {
              const prevDistance = result1.current.stationGroups[i - 1].station.distance;
              const currDistance = result1.current.stationGroups[i].station.distance;
              expect(currDistance).toBeGreaterThanOrEqual(prevDistance);
            }
          }
        ),
        propertyTestConfig
      );
    });
  });

  describe('Unit Tests', () => {
    it('should group vehicles by nearest stations', () => {
      const userLocation: Coordinates = { latitude: 46.75, longitude: 23.6 };
      
      const stations: Station[] = [
        createMockData.station({ 
          id: 'station1', 
          name: 'Station 1',
          coordinates: { latitude: 46.75, longitude: 23.6 } // Same as user
        }),
        createMockData.station({ 
          id: 'station2', 
          name: 'Station 2',
          coordinates: { latitude: 46.76, longitude: 23.61 } // Further away
        })
      ];

      const vehicles: CoreVehicle[] = [
        createMockData.coreVehicle({ 
          id: 'v1', 
          routeId: 'route-42',
          position: { latitude: 46.75, longitude: 23.6 } // Near station1
        }),
        createMockData.coreVehicle({ 
          id: 'v2', 
          routeId: 'route-43',
          position: { latitude: 46.76, longitude: 23.61 } // Near station2
        })
      ];

      const { result } = renderHook(() => 
        useVehicleGrouping(vehicles, stations, userLocation, {})
      );

      expect(result.current.stationGroups).toHaveLength(2);
      expect(result.current.stationGroups[0].station.station.id).toBe('station1'); // Closest first
      expect(result.current.stationGroups[0].vehicles).toHaveLength(1);
      expect(result.current.stationGroups[0].vehicles[0].id).toBe('v1');
    });

    it('should respect maxStations constraint', () => {
      const userLocation: Coordinates = { latitude: 46.75, longitude: 23.6 };
      
      const stations: Station[] = [
        createMockData.station({ id: 'station1', coordinates: { latitude: 46.75, longitude: 23.6 } }),
        createMockData.station({ id: 'station2', coordinates: { latitude: 46.751, longitude: 23.601 } }),
        createMockData.station({ id: 'station3', coordinates: { latitude: 46.752, longitude: 23.602 } })
      ];

      const vehicles: CoreVehicle[] = [
        createMockData.coreVehicle({ id: 'v1', position: { latitude: 46.75, longitude: 23.6 } }),
        createMockData.coreVehicle({ id: 'v2', position: { latitude: 46.751, longitude: 23.601 } }),
        createMockData.coreVehicle({ id: 'v3', position: { latitude: 46.752, longitude: 23.602 } })
      ];

      const { result } = renderHook(() => 
        useVehicleGrouping(vehicles, stations, userLocation, { maxStations: 2 })
      );

      expect(result.current.stationGroups.length).toBeLessThanOrEqual(2);
    });

    it('should respect maxVehiclesPerStation constraint', () => {
      const userLocation: Coordinates = { latitude: 46.75, longitude: 23.6 };
      
      const stations: Station[] = [
        createMockData.station({ 
          id: 'station1', 
          coordinates: { latitude: 46.75, longitude: 23.6 }
        })
      ];

      const vehicles: CoreVehicle[] = [
        createMockData.coreVehicle({ id: 'v1', position: { latitude: 46.75, longitude: 23.6 } }),
        createMockData.coreVehicle({ id: 'v2', position: { latitude: 46.75, longitude: 23.6 } }),
        createMockData.coreVehicle({ id: 'v3', position: { latitude: 46.75, longitude: 23.6 } })
      ];

      const { result } = renderHook(() => 
        useVehicleGrouping(vehicles, stations, userLocation, { maxVehiclesPerStation: 2 })
      );

      expect(result.current.stationGroups[0].vehicles.length).toBeLessThanOrEqual(2);
    });

    it('should handle invalid inputs gracefully', () => {
      const { result } = renderHook(() => 
        useVehicleGrouping(null as any, null as any, null as any, {})
      );

      expect(result.current.stationGroups).toEqual([]);
      expect(result.current.totalStations).toBe(0);
      expect(result.current.totalVehicles).toBe(0);
    });

    it('should aggregate routes correctly', () => {
      const userLocation: Coordinates = { latitude: 46.75, longitude: 23.6 };
      
      const stations: Station[] = [
        createMockData.station({ 
          id: 'station1', 
          coordinates: { latitude: 46.75, longitude: 23.6 }
        })
      ];

      const vehicles: CoreVehicle[] = [
        createMockData.coreVehicle({ 
          id: 'v1', 
          routeId: 'route-42',
          label: '42',
          position: { latitude: 46.75, longitude: 23.6 }
        }),
        createMockData.coreVehicle({ 
          id: 'v2', 
          routeId: 'route-42',
          label: '42',
          position: { latitude: 46.75, longitude: 23.6 }
        }),
        createMockData.coreVehicle({ 
          id: 'v3', 
          routeId: 'route-43',
          label: '43',
          position: { latitude: 46.75, longitude: 23.6 }
        })
      ];

      const { result } = renderHook(() => 
        useVehicleGrouping(vehicles, stations, userLocation, {})
      );

      const group = result.current.stationGroups[0];
      expect(group.allRoutes).toHaveLength(2);
      
      const route42 = group.allRoutes.find(r => r.routeId === 'route-42');
      const route43 = group.allRoutes.find(r => r.routeId === 'route-43');
      
      expect(route42?.vehicleCount).toBe(2);
      expect(route43?.vehicleCount).toBe(1);
    });
  });
});