/**
 * GPS-First Data Loader Tests
 * 
 * Tests the GPS-first data isLoading approach to ensure reliable data validation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GpsFirstDataLoader } from './gpsFirstDataLoader';
import type { Coordinates, Station } from '../../types';
import type { StopTime, Trip, Route } from '../types/tranzyApi';
import type { CoreVehicle } from '../types/coreVehicle';

// Mock the enhanced API service
vi.mock('../api/tranzyApiService', () => ({
  enhancedTranzyApi: {
    getStops: vi.fn(),
    getStopTimes: vi.fn(),
    getTrips: vi.fn(),
    getRoutes: vi.fn(),
    getVehicles: vi.fn(),
  }
}));

describe('GpsFirstDataLoader', () => {
  let loader: GpsFirstDataLoader;
  const mockUserLocation: Coordinates = { latitude: 46.7712, longitude: 23.6236 }; // Cluj-Napoca center
  const mockAgencyId = 2;

  beforeEach(() => {
    loader = new GpsFirstDataLoader();
    vi.clearAllMocks();
  });

  describe('loadValidatedData', () => {
    it('should return empty result when no stops are available', async () => {
      const { enhancedTranzyApi } = await import('../api/tranzyApiService');
      
      // Mock empty stops response
      vi.mocked(enhancedTranzyApi.getStops).mockResolvedValue([]);
      vi.mocked(enhancedTranzyApi.getStopTimes).mockResolvedValue([]);

      const result = await loader.loadValidatedData({
        userLocation: mockUserLocation,
        agencyId: mockAgencyId
      });

      expect(result.primaryStop).toBeNull();
      expect(result.secondaryStop).toBeNull();
      expect(result.availableTrips).toHaveLength(0);
      expect(result.availableRoutes).toHaveLength(0);
      expect(result.vehicles).toHaveLength(0);
    });

    it('should find primary stop with valid trip_ids', async () => {
      const { enhancedTranzyApi } = await import('../api/tranzyApiService');
      
      // Mock stops data
      const mockStops: Station[] = [
        {
          id: '1',
          name: 'Test Stop 1',
          coordinates: { latitude: 46.7712, longitude: 23.6236 }, // Same as user location
          isFavorite: false
        },
        {
          id: '2',
          name: 'Test Stop 2',
          coordinates: { latitude: 46.7800, longitude: 23.6300 }, // Further away
          isFavorite: false
        }
      ];

      // Mock stop times with valid trip_ids
      const mockStopTimes: StopTime[] = [
        {
          tripId: 'trip_1',
          stopId: '1',
          arrivalTime: '10:00:00',
          departureTime: '10:01:00',
          sequence: 1,
          headsign: 'Test Destination',
          isPickupAvailable: true,
          isDropOffAvailable: true
        },
        {
          tripId: 'trip_2',
          stopId: '1',
          arrivalTime: '10:15:00',
          departureTime: '10:16:00',
          sequence: 1,
          headsign: 'Another Destination',
          isPickupAvailable: true,
          isDropOffAvailable: true
        }
      ];

      // Mock trips data
      const mockTrips: Trip[] = [
        {
          id: 'trip_1',
          routeId: 'route_1',
          serviceId: 'service_1',
          headsign: 'Test Destination',
          shortName: '',
          direction: 'inbound',
          blockId: '',
          shapeId: '',
          isWheelchairAccessible: false,
          areBikesAllowed: false
        }
      ];

      // Mock routes data
      const mockRoutes: Route[] = [
        {
          id: 'route_1',
          agencyId: '2',
          routeName: '42',
          routeDesc: 'Test Route',
          type: 'bus',
          color: 'FF0000',
          textColor: 'FFFFFF',
          url: ''
        }
      ];

      // Mock vehicles data
      const mockVehicles: CoreVehicle[] = [
        {
          id: 'vehicle_1',
          routeId: 'route_1',
          tripId: 'trip_1',
          label: 'Bus 42',
          position: {
            latitude: 46.7712,
            longitude: 23.6236,
            bearing: 90
          },
          timestamp: new Date(),
          speed: 25,
          occupancy: 'MANY_SEATS_AVAILABLE',
          isWheelchairAccessible: false,
          isBikeAccessible: false
        }
      ];

      // Setup mocks
      vi.mocked(enhancedTranzyApi.getStops).mockResolvedValue(mockStops);
      vi.mocked(enhancedTranzyApi.getStopTimes).mockResolvedValue(mockStopTimes);
      vi.mocked(enhancedTranzyApi.getTrips).mockResolvedValue(mockTrips);
      vi.mocked(enhancedTranzyApi.getRoutes).mockResolvedValue(mockRoutes);
      vi.mocked(enhancedTranzyApi.getVehicles).mockResolvedValue(mockVehicles);

      const result = await loader.loadValidatedData({
        userLocation: mockUserLocation,
        agencyId: mockAgencyId
      });

      // Verify primary stop was found
      expect(result.primaryStop).not.toBeNull();
      expect(result.primaryStop?.stop.id).toBe('1');
      expect(result.primaryStop?.stop.name).toBe('Test Stop 1');
      expect(result.primaryStop?.validTripIds).toContain('trip_1');
      expect(result.primaryStop?.validTripIds).toContain('trip_2');

      // Verify related data was filtered correctly
      expect(result.availableTrips).toHaveLength(1);
      expect(result.availableTrips[0].id).toBe('trip_1');
      expect(result.availableRoutes).toHaveLength(1);
      expect(result.availableRoutes[0].id).toBe('route_1');
      expect(result.vehicles).toHaveLength(1);
      expect(result.vehicles[0].tripId).toBe('trip_1');

      // Verify metadata
      expect(result.validationMetadata.totalStopsEvaluated).toBe(2);
      expect(result.validationMetadata.stopsWithValidTrips).toBe(1);
      expect(result.validationMetadata.tripsFound).toBe(1);
      expect(result.validationMetadata.vehiclesFound).toBe(1);
      expect(result.validationMetadata.processingTime).toBeGreaterThan(0);
    });

    it('should find second stop within radius', async () => {
      const { enhancedTranzyApi } = await import('../api/tranzyApiService');
      
      // Mock stops data - two stops close to each other
      const mockStops: Station[] = [
        {
          id: '1',
          name: 'Primary Stop',
          coordinates: { latitude: 46.7712, longitude: 23.6236 },
          isFavorite: false
        },
        {
          id: '2',
          name: 'Secondary Stop',
          coordinates: { latitude: 46.7714, longitude: 23.6238 }, // ~150m away
          isFavorite: false
        }
      ];

      // Mock stop times for both stops
      const mockStopTimes: StopTime[] = [
        {
          tripId: 'trip_1',
          stopId: '1',
          arrivalTime: '10:00:00',
          departureTime: '10:01:00',
          sequence: 1,
          headsign: 'Test Destination',
          isPickupAvailable: true,
          isDropOffAvailable: true
        },
        {
          tripId: 'trip_2',
          stopId: '2',
          arrivalTime: '10:05:00',
          departureTime: '10:06:00',
          sequence: 2,
          headsign: 'Test Destination',
          isPickupAvailable: true,
          isDropOffAvailable: true
        }
      ];

      const mockTrips: Trip[] = [
        {
          id: 'trip_1',
          routeId: 'route_1',
          serviceId: 'service_1',
          headsign: 'Test Destination',
          shortName: '',
          direction: 'inbound',
          blockId: '',
          shapeId: '',
          isWheelchairAccessible: false,
          areBikesAllowed: false
        },
        {
          id: 'trip_2',
          routeId: 'route_1',
          serviceId: 'service_1',
          headsign: 'Test Destination',
          shortName: '',
          direction: 'inbound',
          blockId: '',
          shapeId: '',
          isWheelchairAccessible: false,
          areBikesAllowed: false
        }
      ];

      const mockRoutes: Route[] = [
        {
          id: 'route_1',
          agencyId: '2',
          routeName: '42',
          routeDesc: 'Test Route',
          type: 'bus',
          color: 'FF0000',
          textColor: 'FFFFFF',
          url: ''
        }
      ];

      const mockVehicles: CoreVehicle[] = [];

      // Setup mocks
      vi.mocked(enhancedTranzyApi.getStops).mockResolvedValue(mockStops);
      vi.mocked(enhancedTranzyApi.getStopTimes).mockResolvedValue(mockStopTimes);
      vi.mocked(enhancedTranzyApi.getTrips).mockResolvedValue(mockTrips);
      vi.mocked(enhancedTranzyApi.getRoutes).mockResolvedValue(mockRoutes);
      vi.mocked(enhancedTranzyApi.getVehicles).mockResolvedValue(mockVehicles);

      const result = await loader.loadValidatedData({
        userLocation: mockUserLocation,
        agencyId: mockAgencyId,
        secondStopRadius: 200 // 200m radius for second stop
      });

      // Verify both stops were found
      expect(result.primaryStop).not.toBeNull();
      expect(result.primaryStop?.stop.id).toBe('1');
      expect(result.secondaryStop).not.toBeNull();
      expect(result.secondaryStop?.stop.id).toBe('2');

      // Verify metadata
      expect(result.validationMetadata.stopsWithValidTrips).toBe(2);
      expect(result.validationMetadata.tripsFound).toBe(2);
    });

    it('should filter out stops without valid trip_ids', async () => {
      const { enhancedTranzyApi } = await import('../api/tranzyApiService');
      
      const mockStops: Station[] = [
        {
          id: '1',
          name: 'Stop with valid trips',
          coordinates: { latitude: 46.7712, longitude: 23.6236 },
          isFavorite: false
        },
        {
          id: '2',
          name: 'Stop without valid trips',
          coordinates: { latitude: 46.7710, longitude: 23.6234 },
          isFavorite: false
        }
      ];

      // Only provide stop times for stop 1
      const mockStopTimes: StopTime[] = [
        {
          tripId: 'trip_1',
          stopId: '1',
          arrivalTime: '10:00:00',
          departureTime: '10:01:00',
          sequence: 1,
          headsign: 'Test Destination',
          isPickupAvailable: true,
          isDropOffAvailable: true
        }
      ];

      const mockTrips: Trip[] = [
        {
          id: 'trip_1',
          routeId: 'route_1',
          serviceId: 'service_1',
          headsign: 'Test Destination',
          shortName: '',
          direction: 'inbound',
          blockId: '',
          shapeId: '',
          isWheelchairAccessible: false,
          areBikesAllowed: false
        }
      ];

      const mockRoutes: Route[] = [
        {
          id: 'route_1',
          agencyId: '2',
          routeName: '42',
          routeDesc: 'Test Route',
          type: 'bus',
          color: 'FF0000',
          textColor: 'FFFFFF',
          url: ''
        }
      ];

      const mockVehicles: CoreVehicle[] = [];

      // Setup mocks
      vi.mocked(enhancedTranzyApi.getStops).mockResolvedValue(mockStops);
      vi.mocked(enhancedTranzyApi.getStopTimes).mockResolvedValue(mockStopTimes);
      vi.mocked(enhancedTranzyApi.getTrips).mockResolvedValue(mockTrips);
      vi.mocked(enhancedTranzyApi.getRoutes).mockResolvedValue(mockRoutes);
      vi.mocked(enhancedTranzyApi.getVehicles).mockResolvedValue(mockVehicles);

      const result = await loader.loadValidatedData({
        userLocation: mockUserLocation,
        agencyId: mockAgencyId
      });

      // Should only find stop 1 (with valid trips), not stop 2
      expect(result.primaryStop).not.toBeNull();
      expect(result.primaryStop?.stop.id).toBe('1');
      expect(result.secondaryStop).toBeNull(); // Stop 2 has no valid trips
      expect(result.validationMetadata.stopsWithValidTrips).toBe(1);
    });
  });
});