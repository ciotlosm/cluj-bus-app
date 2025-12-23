/**
 * DistanceCalculator Tests
 * Tests for the DistanceCalculator class and its core functionality
 */

import { describe, it, expect } from 'vitest';
import { DistanceCalculator, distanceCalculator } from './DistanceCalculator.ts';
import type { TranzyStopResponse, RouteShape, Coordinates } from '../../types/arrivalTime.ts';

describe('DistanceCalculator', () => {
  // Test coordinates (Bucharest area)
  const vehiclePosition: Coordinates = { lat: 44.4268, lon: 26.1025 };
  const stopPosition: Coordinates = { lat: 44.4378, lon: 26.1125 };
  
  const testStop: TranzyStopResponse = {
    stop_id: 1,
    stop_name: 'Test Stop',
    stop_lat: stopPosition.lat,
    stop_lon: stopPosition.lon,
    location_type: 0,
    stop_code: null
  };

  const testRouteShape: RouteShape = {
    id: 'shape1',
    points: [
      { lat: 44.4268, lon: 26.1025 },
      { lat: 44.4300, lon: 26.1050 },
      { lat: 44.4350, lon: 26.1100 },
      { lat: 44.4378, lon: 26.1125 }
    ],
    segments: [
      {
        start: { lat: 44.4268, lon: 26.1025 },
        end: { lat: 44.4300, lon: 26.1050 },
        distance: 500
      },
      {
        start: { lat: 44.4300, lon: 26.1050 },
        end: { lat: 44.4350, lon: 26.1100 },
        distance: 700
      },
      {
        start: { lat: 44.4350, lon: 26.1100 },
        end: { lat: 44.4378, lon: 26.1125 },
        distance: 400
      }
    ]
  };

  describe('class instantiation', () => {
    it('should create a new DistanceCalculator instance', () => {
      const calculator = new DistanceCalculator();
      expect(calculator).toBeInstanceOf(DistanceCalculator);
    });

    it('should provide a default instance', () => {
      expect(distanceCalculator).toBeInstanceOf(DistanceCalculator);
    });
  });

  describe('calculateDistanceAlongShape', () => {
    it('should calculate distance along route shape', () => {
      const result = distanceCalculator.calculateDistanceAlongShape(
        vehiclePosition,
        testStop,
        testRouteShape
      );

      expect(result).toHaveProperty('totalDistance');
      expect(result).toHaveProperty('method', 'route_shape');
      expect(result).toHaveProperty('confidence');
      expect(result.totalDistance).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(result.confidence);
    });
  });

  describe('calculateDistanceViaStops', () => {
    it('should calculate distance via intermediate stops', () => {
      const intermediateStops: Coordinates[] = [
        { lat: 44.4320, lon: 26.1070 }
      ];

      const result = distanceCalculator.calculateDistanceViaStops(
        vehiclePosition,
        testStop,
        intermediateStops
      );

      expect(result).toHaveProperty('totalDistance');
      expect(result).toHaveProperty('method', 'stop_segments');
      expect(result).toHaveProperty('confidence');
      expect(result.totalDistance).toBeGreaterThan(0);
    });

    it('should handle empty intermediate stops', () => {
      const result = distanceCalculator.calculateDistanceViaStops(
        vehiclePosition,
        testStop,
        []
      );

      expect(result.method).toBe('stop_segments');
      expect(result.confidence).toBe('low');
      expect(result.totalDistance).toBeGreaterThan(0);
    });
  });

  describe('projectPointToShape', () => {
    it('should project point to route shape', () => {
      const result = distanceCalculator.projectPointToShape(
        vehiclePosition,
        testRouteShape
      );

      expect(result).toHaveProperty('closestPoint');
      expect(result).toHaveProperty('distanceToShape');
      expect(result).toHaveProperty('segmentIndex');
      expect(result).toHaveProperty('positionAlongSegment');
      expect(result.segmentIndex).toBeGreaterThanOrEqual(0);
      expect(result.positionAlongSegment).toBeGreaterThanOrEqual(0);
      expect(result.positionAlongSegment).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateDistance (automatic method selection)', () => {
    it('should prefer route shape method when available', () => {
      const result = distanceCalculator.calculateDistance(
        vehiclePosition,
        testStop,
        testRouteShape,
        []
      );

      expect(result.method).toBe('route_shape');
    });

    it('should fall back to stop segments when route shape is not available', () => {
      const result = distanceCalculator.calculateDistance(
        vehiclePosition,
        testStop,
        undefined,
        []
      );

      expect(result.method).toBe('stop_segments');
    });

    it('should fall back to stop segments when route shape is empty', () => {
      const emptyShape: RouteShape = {
        id: 'empty',
        points: [],
        segments: []
      };

      const result = distanceCalculator.calculateDistance(
        vehiclePosition,
        testStop,
        emptyShape,
        []
      );

      expect(result.method).toBe('stop_segments');
    });
  });
});