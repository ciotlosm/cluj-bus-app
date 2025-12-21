/**
 * Tests for Station Selection Core Logic
 * 
 * This test file validates the core station selection functionality
 * including route association filtering, distance calculations, and
 * threshold evaluation logic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Coordinates, Station } from '../../types';
import type { Route, StopTime, Trip } from '../types/tranzyApi';
import {
  StationSelector,
  filterStationsByRouteAssociation,
  getStationsWithRoutes,
  type StationSelectionCriteria,
  type StationSelectionResult
} from './stationSelector';

describe('StationSelector', () => {
  let stationSelector: StationSelector;
  let mockUserLocation: Coordinates;
  let mockStations: Station[];
  let mockRoutes: Route[];
  let mockStopTimes: StopTime[];
  let mockTrips: Trip[];

  beforeEach(() => {
    stationSelector = new StationSelector();
    
    mockUserLocation = {
      latitude: 46.7712,
      longitude: 23.6236
    };

    mockStations = [
      {
        id: '1',
        name: 'Piața Unirii',
        coordinates: { latitude: 46.7712, longitude: 23.6236 },
        isFavorite: false
      },
      {
        id: '2', 
        name: 'Gara CFR',
        coordinates: { latitude: 46.7854, longitude: 23.5986 },
        isFavorite: false
      },
      {
        id: '3',
        name: 'Iulius Mall',
        coordinates: { latitude: 46.7318, longitude: 23.5644 },
        isFavorite: false
      }
    ];

    mockRoutes = [
      {
        id: '42',
        agencyId: '2',
        routeName: '42',
        routeDesc: 'Mănăștur - Zorilor',
        type: 'bus'
      },
      {
        id: '43',
        agencyId: '2', 
        routeName: '43B',
        routeDesc: 'Mănăștur - Centru',
        type: 'bus'
      }
    ];

    mockTrips = [
      {
        id: 'trip_42_morning',
        routeId: '42',
        serviceId: 'weekday',
        direction: 'outbound',
        isWheelchairAccessible: false,
        areBikesAllowed: false
      },
      {
        id: 'trip_43_morning',
        routeId: '43',
        serviceId: 'weekday',
        direction: 'inbound',
        isWheelchairAccessible: false,
        areBikesAllowed: false
      }
    ];

    mockStopTimes = [
      {
        tripId: 'trip_42_morning',
        stopId: '1',
        arrivalTime: '10:00:00',
        departureTime: '10:01:00',
        sequence: 1,
        isPickupAvailable: true,
        isDropOffAvailable: true
      },
      {
        tripId: 'trip_43_morning',
        stopId: '1',
        arrivalTime: '10:05:00',
        departureTime: '10:06:00',
        sequence: 1,
        isPickupAvailable: true,
        isDropOffAvailable: true
      },
      {
        tripId: 'trip_42_morning',
        stopId: '2',
        arrivalTime: '10:10:00',
        departureTime: '10:11:00',
        sequence: 2,
        isPickupAvailable: true,
        isDropOffAvailable: true
      }
    ];
  });

  describe('filterStationsByRouteAssociation', () => {
    it('should identify stations with route associations using stop times and trips data', () => {
      const result = filterStationsByRouteAssociation(mockStations, mockRoutes, mockStopTimes, mockTrips);
      
      expect(result.size).toBe(3);
      
      // Station 1 should have routes (appears in stop times)
      const station1Result = result.get('1');
      expect(station1Result?.hasRoutes).toBe(true);
      expect(station1Result?.routeCount).toBeGreaterThan(0);
      
      // Station 2 should have routes (appears in stop times)
      const station2Result = result.get('2');
      expect(station2Result?.hasRoutes).toBe(true);
      expect(station2Result?.routeCount).toBeGreaterThan(0);
      
      // Station 3 should not have routes (doesn't appear in stop times)
      const station3Result = result.get('3');
      expect(station3Result?.hasRoutes).toBe(false);
      expect(station3Result?.routeCount).toBe(0);
    });

    it('should fallback to all routes when no stop times data provided', () => {
      const result = filterStationsByRouteAssociation(mockStations, mockRoutes);
      
      expect(result.size).toBe(3);
      
      // All stations should have all routes as fallback
      for (const station of mockStations) {
        const stationResult = result.get(station.id);
        expect(stationResult?.hasRoutes).toBe(true);
        expect(stationResult?.routeCount).toBe(mockRoutes.length);
      }
    });
  });

  describe('getStationsWithRoutes', () => {
    it('should return only stations that have route associations', () => {
      const result = getStationsWithRoutes(mockStations, mockRoutes, mockStopTimes, mockTrips);
      
      // Should return stations 1 and 2 (have routes), but not station 3
      expect(result.length).toBe(2);
      expect(result.map(s => s.id)).toContain('1');
      expect(result.map(s => s.id)).toContain('2');
      expect(result.map(s => s.id)).not.toContain('3');
      
      // Each returned station should have associated routes
      for (const station of result) {
        expect(station.associatedRoutes).toBeDefined();
        expect(station.associatedRoutes.length).toBeGreaterThan(0);
        expect(station.distanceFromUser).toBe(0); // Will be calculated later
      }
    });
  });

  describe('selectStations', () => {
    it('should select closest station with route associations', () => {
      const criteria: StationSelectionCriteria = {
        userLocation: mockUserLocation,
        availableStations: mockStations,
        routeData: mockRoutes,
        stopTimesData: mockStopTimes,
        tripsData: mockTrips
      };

      const result: StationSelectionResult = stationSelector.selectStations(criteria);
      
      expect(result.closestStation).toBeDefined();
      expect(result.closestStation?.id).toBe('1'); // Piața Unirii is closest to user location
      expect(result.closestStation?.associatedRoutes.length).toBeGreaterThan(0);
      expect(result.closestStation?.distanceFromUser).toBeGreaterThanOrEqual(0);
    });

    it('should select second station when within distance threshold', () => {
      // Create a scenario where two stations are close to each other
      const closeStations: Station[] = [
        {
          id: '1',
          name: 'Station A',
          coordinates: { latitude: 46.7712, longitude: 23.6236 },
          isFavorite: false
        },
        {
          id: '2',
          name: 'Station B', 
          coordinates: { latitude: 46.7714, longitude: 23.6238 }, // Very close to Station A
          isFavorite: false
        }
      ];

      const closeStopTimes: StopTime[] = [
        {
          tripId: 'trip_42_morning',
          stopId: '1',
          arrivalTime: '10:00:00',
          departureTime: '10:01:00',
          sequence: 1,
          isPickupAvailable: true,
          isDropOffAvailable: true
        },
        {
          tripId: 'trip_42_morning',
          stopId: '2',
          arrivalTime: '10:05:00',
          departureTime: '10:06:00',
          sequence: 2,
          isPickupAvailable: true,
          isDropOffAvailable: true
        }
      ];

      const criteria: StationSelectionCriteria = {
        userLocation: mockUserLocation,
        availableStations: closeStations,
        routeData: mockRoutes,
        stopTimesData: closeStopTimes,
        tripsData: mockTrips
      };

      const result: StationSelectionResult = stationSelector.selectStations(criteria);
      
      expect(result.closestStation).toBeDefined();
      expect(result.secondStation).toBeDefined();
      expect(result.closestStation?.id).not.toBe(result.secondStation?.id);
    });

    it('should not select second station when beyond distance threshold', () => {
      const criteria: StationSelectionCriteria = {
        userLocation: mockUserLocation,
        availableStations: mockStations, // These stations are far apart
        routeData: mockRoutes,
        stopTimesData: mockStopTimes,
        tripsData: mockTrips
      };

      const result: StationSelectionResult = stationSelector.selectStations(criteria);
      
      expect(result.closestStation).toBeDefined();
      expect(result.secondStation).toBeNull(); // Should be null due to distance threshold
    });

    it('should handle no stations with routes', () => {
      const stationsWithoutRoutes: Station[] = [
        {
          id: '99',
          name: 'Isolated Station',
          coordinates: { latitude: 46.7712, longitude: 23.6236 },
          isFavorite: false
        }
      ];

      // Create stop times and trips data that don't include station 99
      const emptyStopTimes: StopTime[] = []; // No stop times for station 99
      const emptyTrips: Trip[] = []; // No trips data

      const criteria: StationSelectionCriteria = {
        userLocation: mockUserLocation,
        availableStations: stationsWithoutRoutes,
        routeData: mockRoutes,
        stopTimesData: emptyStopTimes,
        tripsData: emptyTrips
      };

      const result: StationSelectionResult = stationSelector.selectStations(criteria);
      
      expect(result.closestStation).toBeNull();
      expect(result.secondStation).toBeNull();
      expect(result.rejectedStations.length).toBe(1);
      expect(result.rejectedStations[0].rejectionReason).toBe('no_routes');
    });

    it('should handle stations outside search radius', () => {
      const farStations: Station[] = [
        {
          id: '1',
          name: 'Far Station',
          coordinates: { latitude: 47.0000, longitude: 24.0000 }, // Very far from user
          isFavorite: false
        }
      ];

      const farStopTimes: StopTime[] = [
        {
          tripId: 'route_42_trip_1',
          stopId: '1',
          arrivalTime: '10:00:00',
          departureTime: '10:01:00',
          sequence: 1,
          isPickupAvailable: true,
          isDropOffAvailable: true
        }
      ];

      const criteria: StationSelectionCriteria = {
        userLocation: mockUserLocation,
        availableStations: farStations,
        routeData: mockRoutes,
        stopTimesData: farStopTimes,
        maxSearchRadius: 1000 // 1km radius
      };

      const result: StationSelectionResult = stationSelector.selectStations(criteria);
      
      expect(result.closestStation).toBeNull();
      expect(result.secondStation).toBeNull();
      expect(result.rejectedStations.length).toBe(1);
      expect(result.rejectedStations[0].rejectionReason).toBe('too_far');
    });
  });

  describe('StationSelector configuration', () => {
    it('should use custom distance threshold', () => {
      const customSelector = new StationSelector(50); // 50m threshold instead of default 200m
      
      const closeStations: Station[] = [
        {
          id: '1',
          name: 'Station A',
          coordinates: { latitude: 46.7712, longitude: 23.6236 },
          isFavorite: false
        },
        {
          id: '2',
          name: 'Station B',
          coordinates: { latitude: 46.7720, longitude: 23.6240 }, // ~100m away
          isFavorite: false
        }
      ];

      const closeStopTimes: StopTime[] = [
        {
          tripId: 'route_42_trip_1',
          stopId: '1',
          arrivalTime: '10:00:00',
          departureTime: '10:01:00',
          sequence: 1,
          isPickupAvailable: true,
          isDropOffAvailable: true
        },
        {
          tripId: 'route_42_trip_1',
          stopId: '2',
          arrivalTime: '10:05:00',
          departureTime: '10:06:00',
          sequence: 2,
          isPickupAvailable: true,
          isDropOffAvailable: true
        }
      ];

      const criteria: StationSelectionCriteria = {
        userLocation: mockUserLocation,
        availableStations: closeStations,
        routeData: mockRoutes,
        stopTimesData: closeStopTimes
      };

      const result = customSelector.selectStations(criteria);
      
      // With 50m threshold, the second station should not be selected
      expect(result.closestStation).toBeDefined();
      expect(result.secondStation).toBeNull();
    });

    it('should use custom search radius', () => {
      const customSelector = new StationSelector(200, 500); // 500m search radius
      
      const criteria: StationSelectionCriteria = {
        userLocation: mockUserLocation,
        availableStations: mockStations,
        routeData: mockRoutes,
        stopTimesData: mockStopTimes
      };

      const result = customSelector.selectStations(criteria);
      
      // Should still find stations within 500m
      expect(result.closestStation).toBeDefined();
    });
  });
});