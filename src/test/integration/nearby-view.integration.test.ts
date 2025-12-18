/**
 * End-to-End Integration Tests for Nearby View Stabilization System
 * 
 * This test suite validates the complete nearby view functionality from user location
 * input through station selection, vehicle processing, and error handling scenarios.
 * 
 * Requirements: All requirements validation (Task 11)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NearbyViewController, createNearbyViewController } from '../../controllers/nearbyViewController';
import { stationSelector } from '../../services/stationSelector';
import { 
  filterStationsWithValidRoutes,
  getRouteAssociationStatistics 
} from '../../services/routeAssociationFilter';
import {
  NEARBY_STATION_DISTANCE_THRESHOLD,
  MAX_NEARBY_SEARCH_RADIUS,
  STATION_STABILITY_THRESHOLD,
  calculateUserToStationDistance,
  calculateStationProximity,
  shouldDisplaySecondStation,
  isSignificantLocationChange
} from '../../utils/nearbyViewConstants';
import type { Coordinates, Station, LiveVehicle } from '../../types';
import type { Route, StopTime, Trip } from '../../types/tranzyApi';

// Mock logger to avoid console output during tests
vi.mock('./utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    getLogLevel: vi.fn(() => 1) // Return INFO level to avoid debug logging
  }
}));

describe('Nearby View Stabilization - End-to-End Integration Tests', () => {
  let controller: NearbyViewController;
  
  // Test data representing a realistic Cluj-Napoca scenario
  const userLocation: Coordinates = { latitude: 46.7712, longitude: 23.6236 }; // Piața Unirii area
  const userNearbyLocation: Coordinates = { latitude: 46.7713, longitude: 23.6237 }; // 15m away
  const userDistantLocation: Coordinates = { latitude: 46.7833, longitude: 23.6167 }; // Near Marasti station
  
  const stations: Station[] = [
    {
      id: 'station_unirii_1',
      name: 'Piața Unirii 1',
      coordinates: { latitude: 46.7715, longitude: 23.6238 },
      isFavorite: false
    },
    {
      id: 'station_unirii_2', 
      name: 'Piața Unirii 2',
      coordinates: { latitude: 46.7718, longitude: 23.6241 }, // ~50m from station 1
      isFavorite: false
    },
    {
      id: 'station_marasti',
      name: 'Piața Mărăști',
      coordinates: { latitude: 46.7833, longitude: 23.6167 }, // ~2km away
      isFavorite: false
    },
    {
      id: 'station_no_routes',
      name: 'Isolated Station',
      coordinates: { latitude: 46.7720, longitude: 23.6245 },
      isFavorite: false
    }
  ];
  
  const routes: Route[] = [
    {
      id: 'route_24',
      routeName: '24',
      routeDesc: 'Zorilor - Mănăștur',
      agencyId: 'ctp_cluj',
      type: 'bus'
    },
    {
      id: 'route_35',
      routeName: '35',
      routeDesc: 'Gheorgheni - Mărăști',
      agencyId: 'ctp_cluj',
      type: 'bus'
    },
    {
      id: 'route_42',
      routeName: '42',
      routeDesc: 'Centru - Florești',
      agencyId: 'ctp_cluj',
      type: 'bus'
    }
  ];
  
  const trips: Trip[] = [
    {
      id: 'trip_24_morning',
      routeId: 'route_24',
      serviceId: 'weekday',
      direction: 'inbound',
      isWheelchairAccessible: false,
      areBikesAllowed: false
    },
    {
      id: 'trip_35_morning',
      routeId: 'route_35',
      serviceId: 'weekday',
      direction: 'outbound',
      isWheelchairAccessible: false,
      areBikesAllowed: false
    },
    {
      id: 'trip_42_morning',
      routeId: 'route_42',
      serviceId: 'weekday',
      direction: 'inbound',
      isWheelchairAccessible: false,
      areBikesAllowed: false
    }
  ];
  
  const stopTimes: StopTime[] = [
    // Route 24 serves both Unirii stations
    {
      tripId: 'trip_24_morning',
      stopId: 'station_unirii_1',
      arrivalTime: '08:00:00',
      departureTime: '08:00:00',
      sequence: 1,
      isPickupAvailable: true,
      isDropOffAvailable: true
    },
    {
      tripId: 'trip_24_morning',
      stopId: 'station_unirii_2',
      arrivalTime: '08:02:00',
      departureTime: '08:02:00',
      sequence: 2,
      isPickupAvailable: true,
      isDropOffAvailable: true
    },
    // Route 35 serves Unirii 1 and Marasti
    {
      tripId: 'trip_35_morning',
      stopId: 'station_unirii_1',
      arrivalTime: '08:05:00',
      departureTime: '08:05:00',
      sequence: 1,
      isPickupAvailable: true,
      isDropOffAvailable: true
    },
    {
      tripId: 'trip_35_morning',
      stopId: 'station_marasti',
      arrivalTime: '08:15:00',
      departureTime: '08:15:00',
      sequence: 5,
      isPickupAvailable: true,
      isDropOffAvailable: true
    },
    // Route 42 serves only Unirii 2
    {
      tripId: 'trip_42_morning',
      stopId: 'station_unirii_2',
      arrivalTime: '08:10:00',
      departureTime: '08:10:00',
      sequence: 3,
      isPickupAvailable: true,
      isDropOffAvailable: true
    }
    // Note: station_no_routes has no stop times, so no route associations
  ];
  
  const vehicles: LiveVehicle[] = [
    {
      id: 'bus_24_001',
      routeId: 'route_24',
      tripId: 'trip_24_morning',
      label: '24',
      position: { latitude: 46.7710, longitude: 23.6230 },
      timestamp: new Date().toISOString(),
      speed: 25,
      isWheelchairAccessible: false,
      isBikeAccessible: false
    },
    {
      id: 'bus_35_001',
      routeId: 'route_35',
      tripId: 'trip_35_morning',
      label: '35',
      position: { latitude: 46.7720, longitude: 23.6250 },
      timestamp: new Date().toISOString(),
      speed: 30,
      isWheelchairAccessible: true,
      isBikeAccessible: false
    },
    {
      id: 'bus_42_001',
      routeId: 'route_42',
      tripId: 'trip_42_morning',
      label: '42',
      position: { latitude: 46.7725, longitude: 23.6255 },
      timestamp: new Date().toISOString(),
      speed: 20,
      isWheelchairAccessible: false,
      isBikeAccessible: true
    }
  ];

  beforeEach(() => {
    controller = createNearbyViewController({
      enableSecondStation: true,
      customDistanceThreshold: NEARBY_STATION_DISTANCE_THRESHOLD,
      stabilityMode: 'normal',
      maxSearchRadius: MAX_NEARBY_SEARCH_RADIUS,
      enableStabilityTracking: true
    });
  });

  describe('Complete User Journey - Location to Station Selection', () => {
    it('should complete full nearby view processing workflow', async () => {
      // Process nearby view with complete data
      const result = await controller.processNearbyView(
        userLocation,
        stations,
        routes,
        vehicles,
        stopTimes,
        trips
      );

      // Verify successful processing
      expect(result.error).toBeUndefined();
      expect(result.isLoading).toBe(false);
      expect(result.effectiveLocationForDisplay).toEqual(userLocation);
      expect(result.thresholdUsed).toBe(NEARBY_STATION_DISTANCE_THRESHOLD);

      // Verify station selection
      expect(result.selectedStations.closestStation).toBeDefined();
      expect(result.selectedStations.closestStation?.id).toBe('station_unirii_1'); // Closest to user
      
      // Verify second station logic (should be station_unirii_2 if within threshold)
      const closestStation = result.selectedStations.closestStation!;
      const secondStation = result.selectedStations.secondStation;
      
      if (secondStation) {
        const distanceBetweenStations = calculateStationProximity(closestStation, secondStation);
        expect(distanceBetweenStations).toBeLessThanOrEqual(NEARBY_STATION_DISTANCE_THRESHOLD);
      }

      // Verify vehicle processing
      expect(result.stationVehicleGroups.length).toBeGreaterThan(0);
      
      // Verify metadata
      expect(result.selectionMetadata.totalStationsEvaluated).toBe(stations.length);
      expect(result.selectionMetadata.stationsWithRoutes).toBe(3); // All except station_no_routes
      expect(result.selectionMetadata.selectionTime).toBeGreaterThan(0);
      expect(result.selectionMetadata.stabilityApplied).toBe(false); // First run
    });

    it('should handle route association filtering correctly', () => {
      // Test route association filtering independently
      const stationsWithRoutes = filterStationsWithValidRoutes(
        stations,
        routes,
        stopTimes,
        trips
      );

      // Should filter out station_no_routes (no stop times)
      expect(stationsWithRoutes.length).toBe(3);
      expect(stationsWithRoutes.map(s => s.id)).toEqual([
        'station_unirii_1',
        'station_unirii_2', 
        'station_marasti'
      ]);

      // Verify route associations
      const unirii1 = stationsWithRoutes.find(s => s.id === 'station_unirii_1')!;
      expect(unirii1.associatedRoutes.length).toBe(2); // Routes 24 and 35
      expect(unirii1.associatedRoutes.map(r => r.routeName)).toEqual(['24', '35']);

      const unirii2 = stationsWithRoutes.find(s => s.id === 'station_unirii_2')!;
      expect(unirii2.associatedRoutes.length).toBe(2); // Routes 24 and 42
      expect(unirii2.associatedRoutes.map(r => r.routeName)).toEqual(['24', '42']);

      const marasti = stationsWithRoutes.find(s => s.id === 'station_marasti')!;
      expect(marasti.associatedRoutes.length).toBe(1); // Route 35 only
      expect(marasti.associatedRoutes.map(r => r.routeName)).toEqual(['35']);
    });

    it('should apply distance threshold logic correctly', () => {
      // Test distance threshold evaluation
      const station1 = stations.find(s => s.id === 'station_unirii_1')!;
      const station2 = stations.find(s => s.id === 'station_unirii_2')!;
      const stationMarasti = stations.find(s => s.id === 'station_marasti')!;

      // Distance between Unirii stations should be within threshold
      const distanceUnirii = calculateStationProximity(station1, station2);
      expect(distanceUnirii).toBeLessThan(NEARBY_STATION_DISTANCE_THRESHOLD);
      expect(shouldDisplaySecondStation(station1, station2)).toBe(true);

      // Distance to Marasti should exceed threshold
      const distanceMarasti = calculateStationProximity(station1, stationMarasti);
      expect(distanceMarasti).toBeGreaterThan(NEARBY_STATION_DISTANCE_THRESHOLD);
      expect(shouldDisplaySecondStation(station1, stationMarasti)).toBe(false);
    });
  });

  describe('GPS Stability Integration', () => {
    it('should maintain stability for small GPS movements', async () => {
      // First selection
      const result1 = await controller.processNearbyView(
        userLocation,
        stations,
        routes,
        vehicles,
        stopTimes,
        trips
      );

      expect(result1.selectionMetadata.stabilityApplied).toBe(false);
      const firstSelection = result1.selectedStations.closestStation;

      // Small movement - should potentially apply stability
      const result2 = await controller.processNearbyView(
        userNearbyLocation,
        stations,
        routes,
        vehicles,
        stopTimes,
        trips
      );

      // Check if location change is considered significant
      const isSignificant = isSignificantLocationChange(
        userLocation,
        userNearbyLocation,
        STATION_STABILITY_THRESHOLD
      );
      expect(isSignificant).toBe(false); // 15m should be within stability threshold

      // Verify stability tracking is working
      const metrics = controller.getStabilityMetrics();
      expect(metrics.locationHistoryLength).toBeGreaterThan(0);
      expect(metrics.stabilityScore).toBeGreaterThanOrEqual(0);
      expect(metrics.stabilityScore).toBeLessThanOrEqual(1);
    });

    it('should force new selection for large GPS movements', async () => {
      // First selection
      await controller.processNearbyView(
        userLocation,
        stations,
        routes,
        vehicles,
        stopTimes,
        trips
      );

      // Large movement - should force new selection
      const result = await controller.processNearbyView(
        userDistantLocation,
        stations,
        routes,
        vehicles,
        stopTimes,
        trips
      );

      expect(result.selectionMetadata.stabilityApplied).toBe(false); // New selection due to large movement
      
      // Should select different closest station (Marasti is closer to distant location)
      expect(result.selectedStations.closestStation?.id).toBe('station_marasti');
    });

    it('should handle different stability modes correctly', async () => {
      // Test strict mode
      const strictController = createNearbyViewController({
        stabilityMode: 'strict',
        enableStabilityTracking: true
      });

      await strictController.processNearbyView(
        userLocation,
        stations,
        routes,
        vehicles,
        stopTimes,
        trips
      );

      const strictMetrics = strictController.getStabilityMetrics();
      expect(strictMetrics.maxConsecutiveOverrides).toBe(10); // Strict allows more overrides

      // Test flexible mode
      const flexibleController = createNearbyViewController({
        stabilityMode: 'flexible',
        enableStabilityTracking: true
      });

      await flexibleController.processNearbyView(
        userLocation,
        stations,
        routes,
        vehicles,
        stopTimes,
        trips
      );

      const flexibleMetrics = flexibleController.getStabilityMetrics();
      expect(flexibleMetrics.maxConsecutiveOverrides).toBe(3); // Flexible allows fewer overrides
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle no GPS location gracefully', async () => {
      const result = await controller.processNearbyView(
        null,
        stations,
        routes,
        vehicles,
        stopTimes,
        trips
      );

      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('no_gps_location');
      expect(result.error?.message).toContain('GPS location is required');
      expect(result.error?.fallbackAction).toBe('show_message');
      expect(result.error?.retryable).toBe(false);
    });

    it('should handle invalid GPS coordinates', async () => {
      const invalidLocation: Coordinates = { latitude: 999, longitude: 999 };
      
      const result = await controller.processNearbyView(
        invalidLocation,
        stations,
        routes,
        vehicles,
        stopTimes,
        trips
      );

      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('no_gps_location');
      expect(result.error?.message).toContain('Invalid GPS coordinates');
    });

    it('should handle no stations in range', async () => {
      const result = await controller.processNearbyView(
        userLocation,
        [], // No stations
        routes,
        vehicles,
        stopTimes,
        trips
      );

      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('no_stations_in_range');
      expect(result.error?.retryable).toBe(true);
    });

    it('should handle no routes available', async () => {
      const result = await controller.processNearbyView(
        userLocation,
        stations,
        [], // No routes
        vehicles,
        stopTimes,
        trips
      );

      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('no_routes_available');
      expect(result.error?.retryable).toBe(true);
    });

    it('should handle stations with no route associations', async () => {
      // Use only the station with no routes
      const stationWithoutRoutes = [stations.find(s => s.id === 'station_no_routes')!];
      
      const result = await controller.processNearbyView(
        userLocation,
        stationWithoutRoutes,
        routes,
        vehicles,
        stopTimes,
        trips
      );

      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('no_routes_available');
      expect(result.error?.message).toContain('No stations have active route associations');
    });

    it('should display stations without live vehicles', async () => {
      // Process with no vehicles
      const result = await controller.processNearbyView(
        userLocation,
        stations,
        routes,
        [], // No vehicles
        stopTimes,
        trips
      );

      // Should still select stations even without vehicles
      expect(result.error).toBeUndefined();
      expect(result.selectedStations.closestStation).toBeDefined();
      
      // Vehicle groups should exist but be empty
      expect(result.stationVehicleGroups.length).toBeGreaterThan(0);
      result.stationVehicleGroups.forEach(group => {
        expect(group.vehicles.length).toBe(0); // No vehicles
        expect(group.allRoutes.length).toBeGreaterThan(0); // But routes should be shown
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('should complete processing within performance thresholds', async () => {
      const startTime = performance.now();
      
      const result = await controller.processNearbyView(
        userLocation,
        stations,
        routes,
        vehicles,
        stopTimes,
        trips
      );
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(processingTime).toBeLessThan(100); // 100ms threshold
      
      // Verify performance metrics are captured
      expect(result.performanceMetrics).toBeDefined();
      expect(result.performanceMetrics?.totalProcessingTime).toBeGreaterThan(0);
      expect(result.performanceMetrics?.stationSelectionTime).toBeGreaterThan(0);
    });

    it('should handle large datasets efficiently', async () => {
      // Create larger dataset
      const largeStations = Array.from({ length: 100 }, (_, i) => ({
        id: `station_${i}`,
        name: `Station ${i}`,
        coordinates: { 
          latitude: 46.7712 + (i * 0.001), 
          longitude: 23.6236 + (i * 0.001) 
        },
        isFavorite: false
      }));

      // Create GTFS data for large stations (link first 50 stations to route_24)
      const largeStopTimes = Array.from({ length: 50 }, (_, i) => ({
        tripId: 'trip_24_morning',
        stopId: `station_${i}`,
        arrivalTime: '08:00:00',
        departureTime: '08:00:00',
        sequence: i + 1,
        isPickupAvailable: true,
        isDropOffAvailable: true
      }));

      const largeVehicles = Array.from({ length: 50 }, (_, i) => ({
        id: `vehicle_${i}`,
        routeId: 'route_24',
        tripId: 'trip_24_morning',
        label: '24',
        position: { 
          latitude: 46.7712 + (i * 0.0005), 
          longitude: 23.6236 + (i * 0.0005) 
        },
        timestamp: new Date().toISOString(),
        speed: 25,
        isWheelchairAccessible: false,
        isBikeAccessible: false
      }));

      const startTime = performance.now();
      
      const result = await controller.processNearbyView(
        userLocation,
        largeStations,
        routes,
        largeVehicles,
        largeStopTimes,
        trips
      );
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should still complete within reasonable time even with large dataset
      expect(processingTime).toBeLessThan(500); // 500ms threshold for large dataset
      expect(result.selectionMetadata.totalStationsEvaluated).toBe(100);
      // Should have found stations with routes (first 50 have GTFS data)
      expect(result.selectionMetadata.stationsWithRoutes).toBeGreaterThan(0);
    });
  });

  describe('Configuration and Customization', () => {
    it('should respect custom distance threshold', async () => {
      const customController = createNearbyViewController({
        customDistanceThreshold: 100 // Smaller threshold
      });

      const result = await customController.processNearbyView(
        userLocation,
        stations,
        routes,
        vehicles,
        stopTimes,
        trips
      );

      expect(result.thresholdUsed).toBe(100);
      
      // With smaller threshold, second station might not be selected
      if (result.selectedStations.secondStation) {
        const distance = calculateStationProximity(
          result.selectedStations.closestStation!,
          result.selectedStations.secondStation
        );
        expect(distance).toBeLessThanOrEqual(100);
      }
    });

    it('should respect second station disable option', async () => {
      const noSecondStationController = createNearbyViewController({
        enableSecondStation: false
      });

      const result = await noSecondStationController.processNearbyView(
        userLocation,
        stations,
        routes,
        vehicles,
        stopTimes,
        trips
      );

      expect(result.selectedStations.secondStation).toBeNull();
      expect(result.stationVehicleGroups.length).toBeLessThanOrEqual(1);
    });

    it('should respect custom search radius', async () => {
      const smallRadiusController = createNearbyViewController({
        maxSearchRadius: 500 // 500m radius
      });

      const result = await smallRadiusController.processNearbyView(
        userLocation,
        stations,
        routes,
        vehicles,
        stopTimes,
        trips
      );

      // Should only find nearby stations within 500m
      if (result.selectedStations.closestStation) {
        const distance = calculateUserToStationDistance(
          userLocation,
          result.selectedStations.closestStation
        );
        expect(distance).toBeLessThanOrEqual(500);
      }
    });
  });

  describe('Data Consistency and Validation', () => {
    it('should maintain data consistency across multiple calls', async () => {
      // Multiple calls with same data should produce consistent results
      const results = await Promise.all([
        controller.processNearbyView(userLocation, stations, routes, vehicles, stopTimes, trips),
        controller.processNearbyView(userLocation, stations, routes, vehicles, stopTimes, trips),
        controller.processNearbyView(userLocation, stations, routes, vehicles, stopTimes, trips)
      ]);

      // All results should have same closest station (ignoring stability effects)
      const closestStationIds = results.map(r => r.selectedStations.closestStation?.id);
      expect(new Set(closestStationIds).size).toBeLessThanOrEqual(2); // Allow for stability variations
    });

    it('should validate route association statistics', () => {
      const stats = getRouteAssociationStatistics(stations, routes, stopTimes, trips);

      expect(stats.totalStations).toBe(4);
      expect(stats.stationsWithRoutes).toBe(3); // All except station_no_routes
      expect(stats.stationsWithoutRoutes).toBe(1);
      expect(stats.totalRoutes).toBe(3);
      expect(stats.hasGTFSData).toBe(true);
      expect(stats.averageRoutesPerStation).toBeCloseTo(1.67, 1); // (2+2+1)/3 ≈ 1.67
      expect(stats.maxRoutesPerStation).toBe(2);
      expect(stats.minRoutesPerStation).toBe(1);
    });
  });

  describe('Integration with Existing Systems', () => {
    it('should work with station selector independently', () => {
      const selectionResult = stationSelector.selectStations({
        userLocation,
        availableStations: stations,
        routeData: routes,
        stopTimesData: stopTimes,
        tripsData: trips,
        maxSearchRadius: MAX_NEARBY_SEARCH_RADIUS
      });

      expect(selectionResult.closestStation).toBeDefined();
      expect(selectionResult.closestStation?.id).toBe('station_unirii_1');
      expect(selectionResult.rejectedStations.length).toBeGreaterThan(0);
      
      // Verify rejection reasons
      const rejectionReasons = new Set(selectionResult.rejectedStations.map(r => r.rejectionReason));
      expect(rejectionReasons.has('no_routes')).toBe(true); // station_no_routes should be rejected
    });

    it('should integrate with vehicle processing systems', async () => {
      const result = await controller.processNearbyView(
        userLocation,
        stations,
        routes,
        vehicles,
        stopTimes,
        trips
      );

      // Verify vehicle groups are properly structured
      result.stationVehicleGroups.forEach(group => {
        expect(group.station).toBeDefined();
        expect(group.station.station).toBeDefined();
        expect(group.station.distance).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(group.vehicles)).toBe(true);
        expect(Array.isArray(group.allRoutes)).toBe(true);
        
        // Verify vehicle structure
        group.vehicles.forEach(vehicle => {
          expect(vehicle.id).toBeDefined();
          expect(vehicle.routeId).toBeDefined();
          expect(vehicle.isLive).toBeDefined();
          expect(vehicle.confidence).toBeDefined();
        });
        
        // Verify route summary structure
        group.allRoutes.forEach(route => {
          expect(route.routeId).toBeDefined();
          expect(route.routeName).toBeDefined();
          expect(route.vehicleCount).toBeGreaterThanOrEqual(0);
        });
      });
    });
  });
});