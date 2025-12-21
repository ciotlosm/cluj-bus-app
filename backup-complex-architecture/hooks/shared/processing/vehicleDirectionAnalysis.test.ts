import { describe, it, expect } from 'vitest';
import { analyzeVehicleDirection } from './vehicleDirectionAnalysis';
import type { Station, StopTime } from '../../../types';
import type { CoreVehicle } from '../../../types/coreVehicle';

describe('analyzeVehicleDirection', () => {
  const mockVehicle: CoreVehicle = {
    id: 'vehicle-1',
    routeId: 'route-1',
    tripId: 'trip-1',
    label: 'Bus 1',
    position: { latitude: 46.7712, longitude: 23.6236 },
    timestamp: new Date(),
    speed: 30,
    isWheelchairAccessible: false,
    isBikeAccessible: false
  };

  const mockStation: Station = {
    id: 'station-1',
    name: 'Test Station',
    coordinates: { latitude: 46.7712, longitude: 23.6236 },
    routeIds: ['route-1']
  };

  const mockStopTimes: StopTime[] = [
    {
      tripId: 'trip-1',
      stopId: 'station-0',
      sequence: 1,
      arrivalTime: '10:00:00',
      departureTime: '10:00:00'
    },
    {
      tripId: 'trip-1',
      stopId: 'station-1',
      sequence: 2,
      arrivalTime: '10:05:00',
      departureTime: '10:05:00'
    },
    {
      tripId: 'trip-1',
      stopId: 'station-2',
      sequence: 3,
      arrivalTime: '10:10:00',
      departureTime: '10:10:00'
    }
  ];

  it('should return unknown direction for invalid inputs', () => {
    const result = analyzeVehicleDirection(null as any, mockStation, mockStopTimes);
    expect(result.direction).toBe('unknown');
    expect(result.confidence).toBe('low');
  });

  it('should return unknown direction when no stop times match', () => {
    const result = analyzeVehicleDirection(mockVehicle, mockStation, []);
    expect(result.direction).toBe('unknown');
    expect(result.confidence).toBe('low');
  });

  it('should analyze direction when stop times are available', () => {
    const result = analyzeVehicleDirection(mockVehicle, mockStation, mockStopTimes);
    expect(result.direction).toBeOneOf(['arriving', 'departing', 'unknown']);
    expect(result.confidence).toBeOneOf(['high', 'medium', 'low']);
    expect(typeof result.estimatedMinutes).toBe('number');
  });

  it('should return unknown when target station not in trip', () => {
    const differentStation: Station = {
      ...mockStation,
      id: 'station-999'
    };
    
    const result = analyzeVehicleDirection(mockVehicle, differentStation, mockStopTimes);
    expect(result.direction).toBe('unknown');
    expect(result.confidence).toBe('low');
  });

  it('should include stop sequence when available', () => {
    const result = analyzeVehicleDirection(mockVehicle, mockStation, mockStopTimes);
    
    if (result.stopSequence) {
      expect(Array.isArray(result.stopSequence)).toBe(true);
      expect(result.stopSequence.length).toBeGreaterThan(0);
      expect(result.stopSequence[0]).toHaveProperty('stopId');
      expect(result.stopSequence[0]).toHaveProperty('sequence');
    }
  });
});