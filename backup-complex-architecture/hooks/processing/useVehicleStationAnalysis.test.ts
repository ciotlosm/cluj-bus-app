import { renderHook } from '@testing-library/react';
import { useVehicleStationAnalysis } from './useVehicleStationAnalysis';
import type { Station } from '../../types';
import type { CoreVehicle } from '../../types/coreVehicle';

// Use CoreVehicle directly - no need for legacy CoreVehicle interface

// Mock data generators
const createMockVehicle = (overrides: Partial<CoreVehicle> = {}): CoreVehicle => ({
  id: 'v1',
  routeId: 'route-1',
  tripId: 'trip-1',
  label: 'Bus 1',
  position: { latitude: 46.7712, longitude: 23.6236, bearing: 90 },
  timestamp: new Date(),
  speed: 30,
  occupancy: 'MANY_SEATS_AVAILABLE',
  isWheelchairAccessible: true,
  isBikeAccessible: false,
  latitude: 46.7712,
  longitude: 23.6236,
  bearing: 90,
  ...overrides
});

const createMockStation = (overrides: Partial<Station> = {}): Station => ({
  id: 'station-1',
  name: 'Test Station',
  coordinates: { latitude: 46.7712, longitude: 23.6236 },
  isFavorite: false,
  ...overrides
});

describe('useVehicleStationAnalysis', () => {
  describe('At Station Detection', () => {
    it('should detect vehicle at station when close and stopped', () => {
      const vehicles: CoreVehicle[] = [
        createMockVehicle({
          id: 'v1',
          position: { latitude: 46.7712, longitude: 23.6236, bearing: 90 }, // Same as station
          speed: 0 // Stopped
        })
      ];

      const stations: Station[] = [
        createMockStation({
          id: 'station-1',
          coordinates: { latitude: 46.7712, longitude: 23.6236 }
        })
      ];

      const { result } = renderHook(() => 
        useVehicleStationAnalysis(vehicles, stations, {
          atStationThreshold: 100,
          requireStoppedForAtStation: true
        })
      );

      expect(result.current.analyzedVehicles).toHaveLength(1);
      expect(result.current.analyzedVehicles[0].isAtStation).toBe(true);
      expect(result.current.analyzedVehicles[0].isBetweenStations).toBe(false);
      expect(result.current.analysisStats.vehiclesAtStations).toBe(1);
      expect(result.current.analysisStats.vehiclesBetweenStations).toBe(0);
    });

    it('should not detect vehicle at station when close but moving', () => {
      const vehicles: CoreVehicle[] = [
        createMockVehicle({
          id: 'v1',
          position: { latitude: 46.7712, longitude: 23.6236, bearing: 90 }, // Same as station
          speed: 25 // Moving
        })
      ];

      const stations: Station[] = [
        createMockStation({
          id: 'station-1',
          coordinates: { latitude: 46.7712, longitude: 23.6236 }
        })
      ];

      const { result } = renderHook(() => 
        useVehicleStationAnalysis(vehicles, stations, {
          atStationThreshold: 100,
          requireStoppedForAtStation: true
        })
      );

      expect(result.current.analyzedVehicles[0].isAtStation).toBe(false);
      expect(result.current.analyzedVehicles[0].isCloseToStation).toBe(true);
      expect(result.current.analyzedVehicles[0].isBetweenStations).toBe(false);
      expect(result.current.analysisStats.vehiclesAtStations).toBe(0);
      expect(result.current.analyzedVehicles[0].stationStatus).toBe('close_to_station');
      expect(result.current.analysisStats.vehiclesCloseToStations).toBe(1);
      expect(result.current.analysisStats.vehiclesBetweenStations).toBe(0);
    });

    it('should not detect vehicle at station when far away', () => {
      const vehicles: CoreVehicle[] = [
        createMockVehicle({
          id: 'v1',
          position: { latitude: 46.8, longitude: 23.7, bearing: 90 }, // Far from station
          speed: 0 // Stopped
        })
      ];

      const stations: Station[] = [
        createMockStation({
          id: 'station-1',
          coordinates: { latitude: 46.7712, longitude: 23.6236 }
        })
      ];

      const { result } = renderHook(() => 
        useVehicleStationAnalysis(vehicles, stations, {
          atStationThreshold: 100,
          requireStoppedForAtStation: true
        })
      );

      expect(result.current.analyzedVehicles[0].isAtStation).toBe(false);
      expect(result.current.analyzedVehicles[0].isBetweenStations).toBe(true);
      expect(result.current.analysisStats.vehiclesAtStations).toBe(0);
      expect(result.current.analysisStats.vehiclesBetweenStations).toBe(1);
    });
  });

  describe('Nearest Station Detection', () => {
    it('should find nearest station correctly', () => {
      const vehicles: CoreVehicle[] = [
        createMockVehicle({
          id: 'v1',
          position: { latitude: 46.7715, longitude: 23.6240, bearing: 90 } // Closer to station2
        })
      ];

      const stations: Station[] = [
        createMockStation({
          id: 'station-1',
          coordinates: { latitude: 46.7712, longitude: 23.6236 }
        }),
        createMockStation({
          id: 'station-2',
          coordinates: { latitude: 46.7715, longitude: 23.6240 } // Closer
        })
      ];

      const { result } = renderHook(() => 
        useVehicleStationAnalysis(vehicles, stations)
      );

      expect(result.current.analyzedVehicles[0].nearestStation?.station.id).toBe('station-2');
      expect(result.current.analyzedVehicles[0].nearestStation?.distance).toBeLessThan(50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty vehicles array', () => {
      const vehicles: CoreVehicle[] = [];
      const stations: Station[] = [createMockStation()];

      const { result } = renderHook(() => 
        useVehicleStationAnalysis(vehicles, stations)
      );

      expect(result.current.analyzedVehicles).toHaveLength(0);
      expect(result.current.analysisStats.totalVehicles).toBe(0);
    });

    it('should handle empty stations array', () => {
      const vehicles: CoreVehicle[] = [createMockVehicle()];
      const stations: Station[] = [];

      const { result } = renderHook(() => 
        useVehicleStationAnalysis(vehicles, stations)
      );

      expect(result.current.analyzedVehicles[0].nearestStation).toBeNull();
      expect(result.current.analyzedVehicles[0].isAtStation).toBe(false);
      expect(result.current.analyzedVehicles[0].isBetweenStations).toBe(true);
    });

    it('should handle invalid input gracefully', () => {
      const { result } = renderHook(() => 
        useVehicleStationAnalysis(null as any, null as any)
      );

      expect(result.current.analyzedVehicles).toHaveLength(0);
      expect(result.current.analysisStats.totalVehicles).toBe(0);
    });
  });

  describe('Configuration Options', () => {
    it('should respect custom atStationThreshold', () => {
      const vehicles: CoreVehicle[] = [
        createMockVehicle({
          position: { latitude: 46.7712, longitude: 23.6250, bearing: 90 }, // ~150m from station
          speed: 0
        })
      ];

      const stations: Station[] = [
        createMockStation({
          coordinates: { latitude: 46.7712, longitude: 23.6236 }
        })
      ];

      // With 100m threshold - should not be at station (vehicle is ~150m away)
      const { result: result100 } = renderHook(() => 
        useVehicleStationAnalysis(vehicles, stations, { atStationThreshold: 100 })
      );

      // With 200m threshold - should be at station (vehicle is ~150m away)
      const { result: result200 } = renderHook(() => 
        useVehicleStationAnalysis(vehicles, stations, { atStationThreshold: 200 })
      );

      expect(result100.current.analyzedVehicles[0].isAtStation).toBe(false);
      expect(result200.current.analyzedVehicles[0].isAtStation).toBe(true);
    });

    it('should respect requireStoppedForAtStation setting', () => {
      const vehicles: CoreVehicle[] = [
        createMockVehicle({
          position: { latitude: 46.7712, longitude: 23.6236, bearing: 90 }, // Same as station
          speed: 25 // Moving
        })
      ];

      const stations: Station[] = [
        createMockStation({
          coordinates: { latitude: 46.7712, longitude: 23.6236 }
        })
      ];

      // With requireStoppedForAtStation: true - should not be at station
      const { result: resultStopped } = renderHook(() => 
        useVehicleStationAnalysis(vehicles, stations, { requireStoppedForAtStation: true })
      );

      // With requireStoppedForAtStation: false - should be at station
      const { result: resultMoving } = renderHook(() => 
        useVehicleStationAnalysis(vehicles, stations, { requireStoppedForAtStation: false })
      );

      expect(resultStopped.current.analyzedVehicles[0].isAtStation).toBe(false);
      expect(resultMoving.current.analyzedVehicles[0].isAtStation).toBe(true);
    });
  });
});