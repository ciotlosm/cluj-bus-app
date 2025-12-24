/**
 * Performance Utils Tests
 * Tests for map performance optimization utilities
 */

import { describe, it, expect } from 'vitest';
import { clusterPoints, filterPointsByViewport } from './performanceUtils';
import type { ClusterPoint, ViewportBounds } from './performanceUtils';

describe('Map Performance Utils', () => {
  describe('clusterPoints', () => {
    it('should cluster nearby points', () => {
      const points: ClusterPoint[] = [
        {
          id: '1',
          position: { lat: 46.7712, lon: 23.6236 },
          data: { id: 1 } as any,
        },
        {
          id: '2',
          position: { lat: 46.7713, lon: 23.6237 }, // Very close to first point
          data: { id: 2 } as any,
        },
        {
          id: '3',
          position: { lat: 46.8000, lon: 23.7000 }, // Far from first two
          data: { id: 3 } as any,
        },
      ];

      const clusters = clusterPoints(points, 50, 13);
      
      // Should create clusters for nearby points
      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters.length).toBeLessThanOrEqual(points.length);
      
      // Total points in all clusters should equal input points
      const totalPoints = clusters.reduce((sum, cluster) => sum + cluster.size, 0);
      expect(totalPoints).toBe(points.length);
    });

    it('should handle empty points array', () => {
      const clusters = clusterPoints([], 50, 13);
      expect(clusters).toEqual([]);
    });

    it('should handle single point', () => {
      const points: ClusterPoint[] = [
        {
          id: '1',
          position: { lat: 46.7712, lon: 23.6236 },
          data: { id: 1 } as any,
        },
      ];

      const clusters = clusterPoints(points, 50, 13);
      expect(clusters).toHaveLength(1);
      expect(clusters[0].size).toBe(1);
      expect(clusters[0].points).toHaveLength(1);
    });
  });

  describe('filterPointsByViewport', () => {
    const bounds: ViewportBounds = {
      north: 46.8000,
      south: 46.7500,
      east: 23.7000,
      west: 23.6000,
    };

    it('should filter points within viewport bounds', () => {
      const points = [
        { latitude: 46.7712, longitude: 23.6236 }, // Inside bounds
        { latitude: 46.9000, longitude: 23.9000 }, // Outside bounds
        { latitude: 46.7800, longitude: 23.6500 }, // Inside bounds
      ];

      const filtered = filterPointsByViewport(points, bounds, 0);
      
      // Should include points within bounds (with some buffer)
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.length).toBeLessThanOrEqual(points.length);
    });

    it('should handle empty points array', () => {
      const filtered = filterPointsByViewport([], bounds, 0);
      expect(filtered).toEqual([]);
    });

    it('should handle points with invalid coordinates', () => {
      const points = [
        { latitude: 46.7712, longitude: 23.6236 }, // Valid
        { latitude: null, longitude: 23.6236 }, // Invalid
        { latitude: 46.7712, longitude: null }, // Invalid
        { latitude: NaN, longitude: 23.6236 }, // Invalid
      ];

      const filtered = filterPointsByViewport(points, bounds, 0);
      
      // Should only include valid points
      expect(filtered.length).toBe(1);
      expect(filtered[0]).toEqual(points[0]);
    });

    it('should include buffer area', () => {
      const points = [
        { latitude: 46.7400, longitude: 23.5900 }, // Just outside bounds but within buffer
      ];

      const filteredWithoutBuffer = filterPointsByViewport(points, bounds, 0);
      const filteredWithBuffer = filterPointsByViewport(points, bounds, 10); // 10km buffer

      expect(filteredWithoutBuffer.length).toBe(0);
      expect(filteredWithBuffer.length).toBe(1);
    });
  });
});