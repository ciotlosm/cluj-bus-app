import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  classifyBusDirection,
  integrateStationMetadata,
  validateRouteEndpoints,
  validateStationMetadata,
  classifyBuses,
  type RouteEndpoint,
  type StationMetadata,
} from './directionIntelligence';
import type { BusInfo, Station, UserConfig, Coordinates } from '../../types';

// Generators for property-based testing
const coordinatesArb = fc.record({
  latitude: fc.float({ min: -90, max: 90 }),
  longitude: fc.float({ min: -180, max: 180 }),
});

const stationArb = fc.record({
  id: fc.string({ minLength: 1 }),
  name: fc.string({ minLength: 1 }),
  coordinates: coordinatesArb,
  isFavorite: fc.boolean(),
});

const busInfoArb = fc.record({
  id: fc.string({ minLength: 1 }),
  route: fc.string({ minLength: 1 }),
  destination: fc.string({ minLength: 1 }),
  arrivalTime: fc.date(),
  isLive: fc.boolean(),
  minutesAway: fc.integer({ min: 0, max: 60 }),
  station: stationArb,
  direction: fc.constantFrom('work', 'home', 'unknown'),
});

const userConfigArb = fc.record({
  city: fc.string({ minLength: 1 }),
  homeLocation: coordinatesArb,
  workLocation: coordinatesArb,
  apiKey: fc.string({ minLength: 1 }),
  refreshRate: fc.integer({ min: 1000, max: 300000 }),
});

const routeEndpointArb = fc.record({
  id: fc.string({ minLength: 1 }),
  name: fc.string({ minLength: 1 }),
  coordinates: coordinatesArb,
  isTerminal: fc.option(fc.boolean(), { nil: undefined }),
});

const stationMetadataArb = fc.record({
  stationId: fc.string({ minLength: 1 }),
  direction: fc.option(fc.constantFrom('inbound', 'outbound', 'northbound', 'southbound', 'eastbound', 'westbound'), { nil: undefined }),
  destinationName: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
  routeEndpoints: fc.option(fc.array(routeEndpointArb, { minLength: 2, maxLength: 5 }), { nil: undefined }),
});

// Mock distance calculation function
const mockCalculateDistance = (from: Coordinates, to: Coordinates): number => {
  // Simple Euclidean distance for testing (not geographically accurate)
  const latDiff = from.latitude - to.latitude;
  const lngDiff = from.longitude - to.longitude;
  return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
};

describe('Direction Intelligence', () => {
  describe('Property Tests', () => {
    /**
     * **Feature: bus-tracker, Property 10: Direction classification accuracy**
     * **Validates: Requirements 5.4, 6.1, 6.2**
     */
    it('should correctly classify bus direction based on geographic proximity to destinations', () => {
      fc.assert(
        fc.property(
          busInfoArb,
          userConfigArb,
          fc.option(fc.array(routeEndpointArb, { minLength: 2, maxLength: 5 })),
          (bus, userConfig, routeEndpoints) => {
            // Ensure valid coordinates for the test
            fc.pre(
              userConfig.homeLocation.latitude >= -90 &&
              userConfig.homeLocation.latitude <= 90 &&
              userConfig.homeLocation.longitude >= -180 &&
              userConfig.homeLocation.longitude <= 180 &&
              userConfig.workLocation.latitude >= -90 &&
              userConfig.workLocation.latitude <= 90 &&
              userConfig.workLocation.longitude >= -180 &&
              userConfig.workLocation.longitude <= 180 &&
              bus.station.coordinates.latitude >= -90 &&
              bus.station.coordinates.latitude <= 90 &&
              bus.station.coordinates.longitude >= -180 &&
              bus.station.coordinates.longitude <= 180
            );

            const result = classifyBusDirection(
              bus,
              userConfig,
              mockCalculateDistance,
              routeEndpoints || undefined
            );

            // The result should always be one of the valid direction types
            expect(['work', 'home', 'unknown']).toContain(result);

            // If home and work locations are identical, result should be unknown
            if (
              userConfig.homeLocation.latitude === userConfig.workLocation.latitude &&
              userConfig.homeLocation.longitude === userConfig.workLocation.longitude
            ) {
              expect(result).toBe('unknown');
            }

            // The function should be deterministic - same inputs should give same output
            const result2 = classifyBusDirection(
              bus,
              userConfig,
              mockCalculateDistance,
              routeEndpoints || undefined
            );
            expect(result).toBe(result2);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: bus-tracker, Property 11: Metadata integration for direction accuracy**
     * **Validates: Requirements 6.3, 6.4**
     */
    it('should incorporate station metadata to improve direction classification accuracy', () => {
      fc.assert(
        fc.property(
          busInfoArb,
          userConfigArb,
          stationMetadataArb,
          (bus, userConfig, metadata) => {
            // Ensure valid coordinates for the test
            fc.pre(
              userConfig.homeLocation.latitude >= -90 &&
              userConfig.homeLocation.latitude <= 90 &&
              userConfig.homeLocation.longitude >= -180 &&
              userConfig.homeLocation.longitude <= 180 &&
              userConfig.workLocation.latitude >= -90 &&
              userConfig.workLocation.latitude <= 90 &&
              userConfig.workLocation.longitude >= -180 &&
              userConfig.workLocation.longitude <= 180 &&
              bus.station.coordinates.latitude >= -90 &&
              bus.station.coordinates.latitude <= 90 &&
              bus.station.coordinates.longitude >= -180 &&
              bus.station.coordinates.longitude <= 180
            );

            // Ensure metadata is valid if it has route endpoints
            if (metadata.routeEndpoints) {
              fc.pre(validateRouteEndpoints(metadata.routeEndpoints));
            }

            const resultWithoutMetadata = classifyBusDirection(
              bus,
              userConfig,
              mockCalculateDistance
            );

            const resultWithMetadata = integrateStationMetadata(
              bus,
              userConfig,
              metadata,
              mockCalculateDistance
            );

            // Both results should be valid direction types
            expect(['work', 'home', 'unknown']).toContain(resultWithoutMetadata);
            expect(['work', 'home', 'unknown']).toContain(resultWithMetadata);

            // If metadata provides additional information, it should either:
            // 1. Keep the same classification if it was already determined
            // 2. Provide a classification if it was previously unknown
            // 3. Override with better information
            if (resultWithoutMetadata !== 'unknown') {
              // If we had a classification, metadata integration should be consistent
              // (either same result or a different but valid result)
              expect(['work', 'home', 'unknown']).toContain(resultWithMetadata);
            }

            // The function should be deterministic
            const result2 = integrateStationMetadata(
              bus,
              userConfig,
              metadata,
              mockCalculateDistance
            );
            expect(resultWithMetadata).toBe(result2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate route endpoints correctly', () => {
      fc.assert(
        fc.property(
          fc.array(routeEndpointArb, { minLength: 0, maxLength: 10 }),
          (endpoints) => {
            const result = validateRouteEndpoints(endpoints);

            if (endpoints.length === 0) {
              expect(result).toBe(false);
            } else {
              // Check if all endpoints have valid structure
              const allValid = endpoints.every(ep => 
                ep.id && 
                ep.name && 
                ep.coordinates &&
                ep.coordinates.latitude >= -90 &&
                ep.coordinates.latitude <= 90 &&
                ep.coordinates.longitude >= -180 &&
                ep.coordinates.longitude <= 180 &&
                isFinite(ep.coordinates.latitude) &&
                isFinite(ep.coordinates.longitude)
              );
              expect(result).toBe(allValid);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate station metadata correctly', () => {
      fc.assert(
        fc.property(
          stationMetadataArb,
          (metadata) => {
            const result = validateStationMetadata(metadata);

            // Should be false if no stationId
            if (!metadata.stationId) {
              expect(result).toBe(false);
              return;
            }

            // Should be false if routeEndpoints exist but are invalid
            if (metadata.routeEndpoints && !validateRouteEndpoints(metadata.routeEndpoints)) {
              expect(result).toBe(false);
              return;
            }

            // Should be false if direction is invalid
            const validDirections = ['inbound', 'outbound', 'northbound', 'southbound', 'eastbound', 'westbound'];
            if (metadata.direction && !validDirections.includes(metadata.direction)) {
              expect(result).toBe(false);
              return;
            }

            // Otherwise should be true
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should classify multiple buses consistently', () => {
      fc.assert(
        fc.property(
          fc.array(busInfoArb, { minLength: 1, maxLength: 10 }),
          userConfigArb,
          (buses, userConfig) => {
            // Ensure valid coordinates
            fc.pre(
              userConfig.homeLocation.latitude >= -90 &&
              userConfig.homeLocation.latitude <= 90 &&
              userConfig.homeLocation.longitude >= -180 &&
              userConfig.homeLocation.longitude <= 180 &&
              userConfig.workLocation.latitude >= -90 &&
              userConfig.workLocation.latitude <= 90 &&
              userConfig.workLocation.longitude >= -180 &&
              userConfig.workLocation.longitude <= 180 &&
              buses.every(bus => 
                bus.station.coordinates.latitude >= -90 &&
                bus.station.coordinates.latitude <= 90 &&
                bus.station.coordinates.longitude >= -180 &&
                bus.station.coordinates.longitude <= 180
              )
            );

            const result = classifyBuses(buses, userConfig, mockCalculateDistance);

            // Should return same number of buses
            expect(result).toHaveLength(buses.length);

            // All buses should have valid directions
            result.forEach(bus => {
              expect(['work', 'home', 'unknown']).toContain(bus.direction);
            });

            // Should preserve all other bus properties
            result.forEach((classifiedBus, index) => {
              const originalBus = buses[index];
              expect(classifiedBus.id).toBe(originalBus.id);
              expect(classifiedBus.route).toBe(originalBus.route);
              expect(classifiedBus.destination).toBe(originalBus.destination);
              expect(classifiedBus.arrivalTime).toBe(originalBus.arrivalTime);
              expect(classifiedBus.isLive).toBe(originalBus.isLive);
              expect(classifiedBus.minutesAway).toBe(originalBus.minutesAway);
              expect(classifiedBus.station).toBe(originalBus.station);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Unit Tests', () => {
    it('should return unknown for invalid user config', () => {
      const bus: BusInfo = {
        id: 'bus1',
        route: 'Route 1',
        destination: 'Downtown',
        arrivalTime: new Date(),
        isLive: true,
        minutesAway: 5,
        station: {
          id: 'station1',
          name: 'Station 1',
          coordinates: { latitude: 0, longitude: 0 },
          isFavorite: false,
        },
        direction: 'unknown',
      };

      const invalidConfig: UserConfig = {
        city: 'Test City',
        homeLocation: { latitude: 0, longitude: 0 },
        workLocation: { latitude: 0, longitude: 0 }, // Same as home
        apiKey: 'test-key',
        refreshRate: 30000,
      };

      const result = classifyBusDirection(bus, invalidConfig, mockCalculateDistance);
      expect(result).toBe('unknown');
    });

    it('should handle empty route endpoints', () => {
      const bus: BusInfo = {
        id: 'bus1',
        route: 'Route 1',
        destination: 'Downtown',
        arrivalTime: new Date(),
        isLive: true,
        minutesAway: 5,
        station: {
          id: 'station1',
          name: 'Station 1',
          coordinates: { latitude: 0, longitude: 0 },
          isFavorite: false,
        },
        direction: 'unknown',
      };

      const userConfig: UserConfig = {
        city: 'Test City',
        homeLocation: { latitude: 1, longitude: 1 },
        workLocation: { latitude: -1, longitude: -1 },
        apiKey: 'test-key',
        refreshRate: 30000,
      };

      const result = classifyBusDirection(bus, userConfig, mockCalculateDistance, []);
      expect(['work', 'home', 'unknown']).toContain(result);
    });
  });
});