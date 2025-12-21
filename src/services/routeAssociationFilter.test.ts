/**
 * Tests for Route Association Filter Component
 * 
 * These tests verify the core functionality of determining stations with valid
 * route relationships and route data validation logic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Station } from '../../types';
import type { Route, StopTime, Trip } from '../types/tranzyApi';
import {
  determineStationRouteAssociations,
  filterStationsWithValidRoutes,
  getStationRouteAssociation,
  validateStationForDisplay,
  validateRouteData,
  validateStopTimesData,
  validateTripsData,
  getRouteAssociationStatistics
} from './routeAssociationFilter';

describe('Route Association Filter', () => {
  let mockStations: Station[];
  let mockRoutes: Route[];
  let mockStopTimes: StopTime[];
  let mockTrips: Trip[];

  beforeEach(() => {
    // Mock stations
    mockStations = [
      {
        id: '1',
        name: 'Station A',
        coordinates: { latitude: 46.7712, longitude: 23.6236 },
        isFavorite: false
      },
      {
        id: '2',
        name: 'Station B',
        coordinates: { latitude: 46.7722, longitude: 23.6246 },
        isFavorite: false
      },
      {
        id: '3',
        name: 'Station C',
        coordinates: { latitude: 46.7732, longitude: 23.6256 },
        isFavorite: false
      }
    ];

    // Mock routes
    mockRoutes = [
      {
        id: '101',
        agencyId: '1',
        routeName: '42',
        routeDesc: 'Route 42 Description',
        type: 'bus'
      },
      {
        id: '102',
        agencyId: '1',
        routeName: '43B',
        routeDesc: 'Route 43B Description',
        type: 'bus'
      }
    ];

    // Mock trips
    mockTrips = [
      {
        id: 'trip_1',
        routeId: '101',
        serviceId: 'service_1',
        direction: 'inbound',
        isWheelchairAccessible: false,
        areBikesAllowed: false
      },
      {
        id: 'trip_2',
        routeId: '102',
        serviceId: 'service_1',
        direction: 'outbound',
        isWheelchairAccessible: false,
        areBikesAllowed: false
      }
    ];

    // Mock stop times
    mockStopTimes = [
      {
        tripId: 'trip_1',
        stopId: '1',
        arrivalTime: '08:00:00',
        departureTime: '08:00:00',
        sequence: 1,
        isPickupAvailable: true,
        isDropOffAvailable: true
      },
      {
        tripId: 'trip_1',
        stopId: '2',
        arrivalTime: '08:05:00',
        departureTime: '08:05:00',
        sequence: 2,
        isPickupAvailable: true,
        isDropOffAvailable: true
      },
      {
        tripId: 'trip_2',
        stopId: '2',
        arrivalTime: '08:10:00',
        departureTime: '08:10:00',
        sequence: 1,
        isPickupAvailable: true,
        isDropOffAvailable: true
      }
    ];
  });

  describe('Route Data Validation', () => {
    it('should validate correct route data', () => {
      const result = validateRouteData(mockRoutes);
      
      expect(result.isValid).toBe(true);
      expect(result.validRoutes).toHaveLength(2);
      expect(result.invalidRoutes).toHaveLength(0);
      expect(result.validationErrors).toHaveLength(0);
    });

    it('should detect invalid route data', () => {
      const invalidRoutes = [
        { id: '', routeName: '42', agencyId: '1', routeDesc: 'Test', type: 'bus' },
        { id: '101', routeName: '', agencyId: '1', routeDesc: 'Test', type: 'bus' },
        { id: '102', routeName: '43B', agencyId: '', routeDesc: 'Test', type: 'bus' }
      ] as Route[];

      const result = validateRouteData(invalidRoutes);
      
      expect(result.isValid).toBe(false);
      expect(result.validRoutes).toHaveLength(0);
      expect(result.invalidRoutes).toHaveLength(3);
      expect(result.validationErrors.length).toBeGreaterThan(0);
    });

    it('should validate stop times data', () => {
      expect(validateStopTimesData(mockStopTimes)).toBe(true);
      expect(validateStopTimesData([])).toBe(false);
      expect(validateStopTimesData(undefined)).toBe(false);
    });

    it('should validate trips data', () => {
      expect(validateTripsData(mockTrips)).toBe(true);
      expect(validateTripsData([])).toBe(false);
      expect(validateTripsData(undefined)).toBe(false);
    });
  });

  describe('Route Association Determination', () => {
    it('should determine route associations with GTFS data', () => {
      const associations = determineStationRouteAssociations(
        mockStations,
        mockRoutes,
        mockStopTimes,
        mockTrips
      );

      expect(associations.size).toBe(3);
      
      // Station 1 should have route 101 (via trip_1)
      const station1Association = associations.get('1');
      expect(station1Association?.hasRoutes).toBe(true);
      expect(station1Association?.routeCount).toBe(1);
      expect(station1Association?.associatedRoutes[0].id).toBe('101');

      // Station 2 should have both routes (via trip_1 and trip_2)
      const station2Association = associations.get('2');
      expect(station2Association?.hasRoutes).toBe(true);
      expect(station2Association?.routeCount).toBe(2);

      // Station 3 should have no routes (no stop times)
      const station3Association = associations.get('3');
      expect(station3Association?.hasRoutes).toBe(false);
      expect(station3Association?.routeCount).toBe(0);
    });

    it('should fallback to all routes when no GTFS data available', () => {
      const associations = determineStationRouteAssociations(
        mockStations,
        mockRoutes,
        undefined,
        undefined,
        { requireActiveRoutes: false }
      );

      expect(associations.size).toBe(3);
      
      // All stations should have all routes in fallback mode
      for (const [stationId, association] of associations) {
        expect(association.hasRoutes).toBe(true);
        expect(association.routeCount).toBe(2);
      }
    });

    it('should return no associations when requiring active routes but no GTFS data', () => {
      const associations = determineStationRouteAssociations(
        mockStations,
        mockRoutes,
        undefined,
        undefined,
        { requireActiveRoutes: true }
      );

      expect(associations.size).toBe(3);
      
      // All stations should have no routes when requiring active routes but no GTFS data
      for (const [stationId, association] of associations) {
        expect(association.hasRoutes).toBe(false);
        expect(association.routeCount).toBe(0);
      }
    });
  });

  describe('Station Filtering', () => {
    it('should filter stations with valid routes', () => {
      const stationsWithRoutes = filterStationsWithValidRoutes(
        mockStations,
        mockRoutes,
        mockStopTimes,
        mockTrips
      );

      // Only stations 1 and 2 should have routes based on mock data
      expect(stationsWithRoutes).toHaveLength(2);
      expect(stationsWithRoutes.map(s => s.id)).toEqual(['1', '2']);
      
      // Check that route associations are properly attached
      const station1 = stationsWithRoutes.find(s => s.id === '1');
      expect(station1?.associatedRoutes).toHaveLength(1);
      expect(station1?.isValidForDisplay).toBe(true);
      
      const station2 = stationsWithRoutes.find(s => s.id === '2');
      expect(station2?.associatedRoutes).toHaveLength(2);
      expect(station2?.isValidForDisplay).toBe(true);
    });
  });

  describe('Individual Station Analysis', () => {
    it('should get route association for single station', () => {
      const station1Association = getStationRouteAssociation(
        mockStations[0],
        mockRoutes,
        mockStopTimes,
        mockTrips
      );

      expect(station1Association.hasRoutes).toBe(true);
      expect(station1Association.routeCount).toBe(1);
      expect(station1Association.associatedRoutes[0].routeName).toBe('42');
    });

    it('should validate station for display', () => {
      // Station 1 should be valid (has 1 route)
      expect(validateStationForDisplay(
        mockStations[0],
        mockRoutes,
        mockStopTimes,
        mockTrips,
        1
      )).toBe(true);

      // Station 3 should be invalid (has 0 routes)
      expect(validateStationForDisplay(
        mockStations[2],
        mockRoutes,
        mockStopTimes,
        mockTrips,
        1
      )).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should generate route association statistics', () => {
      const stats = getRouteAssociationStatistics(
        mockStations,
        mockRoutes,
        mockStopTimes,
        mockTrips
      );

      expect(stats.totalStations).toBe(3);
      expect(stats.stationsWithRoutes).toBe(2);
      expect(stats.stationsWithoutRoutes).toBe(1);
      expect(stats.totalRoutes).toBe(2);
      expect(stats.hasGTFSData).toBe(true);
      expect(stats.averageRoutesPerStation).toBe(1.5); // (1 + 2) / 2 = 1.5
      expect(stats.maxRoutesPerStation).toBe(2);
      expect(stats.minRoutesPerStation).toBe(1);
    });
  });
});