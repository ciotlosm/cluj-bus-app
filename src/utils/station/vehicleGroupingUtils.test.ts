/**
 * Vehicle Grouping Utilities Tests
 * Tests for intelligent vehicle grouping and selection logic
 */

import { describe, it, expect } from 'vitest';
import { groupVehiclesForDisplay, selectBestVehiclePerStatus } from './vehicleGroupingUtils';
import type { StationVehicle } from '../../types/stationFilter';
import type { ArrivalStatus } from '../../types/arrivalTime';

// Helper to create mock StationVehicle
const createMockVehicle = (
  id: number,
  routeId: number,
  status: ArrivalStatus,
  statusMessage: string,
  estimatedMinutes: number
): StationVehicle => ({
  vehicle: { 
    id, 
    route_id: routeId,
    latitude: 0,
    longitude: 0,
    bearing: 0,
    speed: null,
    trip_id: null,
    timestamp: Date.now()
  },
  route: { 
    route_id: routeId,
    route_short_name: `Route ${routeId}`,
    route_long_name: `Route ${routeId} Long Name`,
    route_type: 3,
    route_color: '000000',
    route_text_color: 'FFFFFF'
  },
  trip: null,
  arrivalTime: {
    status,
    statusMessage,
    confidence: 'high' as const,
    estimatedMinutes
  }
});

describe('selectBestVehiclePerStatus', () => {
  it('should select vehicle with earliest arrival time', () => {
    const vehicles = [
      createMockVehicle(1, 100, 'in_minutes', 'In 10 minutes', 10),
      createMockVehicle(2, 100, 'in_minutes', 'In 5 minutes', 5),
      createMockVehicle(3, 100, 'in_minutes', 'In 7 minutes', 7)
    ];

    const best = selectBestVehiclePerStatus(vehicles, 'in_minutes');
    expect(best?.vehicle.id).toBe(2); // Vehicle with 5 minutes
  });

  it('should return null for empty array', () => {
    const best = selectBestVehiclePerStatus([], 'in_minutes');
    expect(best).toBeNull();
  });

  it('should return null when no vehicles match status', () => {
    const vehicles = [createMockVehicle(1, 100, 'at_stop', 'At stop', 0)];
    const best = selectBestVehiclePerStatus(vehicles, 'in_minutes');
    expect(best).toBeNull();
  });
});

describe('groupVehiclesForDisplay', () => {
  it('should not apply grouping for single route stations', () => {
    const vehicles = [
      createMockVehicle(1, 100, 'in_minutes', 'In 5 minutes', 5),
      createMockVehicle(2, 100, 'in_minutes', 'In 10 minutes', 10),
      createMockVehicle(3, 100, 'at_stop', 'At stop', 0)
    ];

    const result = groupVehiclesForDisplay(vehicles, {
      maxVehicles: 2,
      includeOffRoute: false,
      routeCount: 1
    });

    expect(result.groupingApplied).toBe(false);
    expect(result.displayed).toHaveLength(3);
    expect(result.hidden).toHaveLength(0);
  });

  it('should not apply grouping when under threshold', () => {
    const vehicles = [
      createMockVehicle(1, 100, 'in_minutes', 'In 5 minutes', 5),
      createMockVehicle(2, 200, 'in_minutes', 'In 10 minutes', 10)
    ];

    const result = groupVehiclesForDisplay(vehicles, {
      maxVehicles: 5,
      includeOffRoute: false,
      routeCount: 2
    });

    expect(result.groupingApplied).toBe(false);
    expect(result.displayed).toHaveLength(2);
    expect(result.hidden).toHaveLength(0);
  });

  it('should apply grouping when over threshold with multiple routes', () => {
    const vehicles = [
      createMockVehicle(1, 100, 'at_stop', 'At stop', 0),
      createMockVehicle(2, 100, 'at_stop', 'At stop', 0), // Should be hidden (duplicate status)
      createMockVehicle(3, 200, 'in_minutes', 'In 5 minutes', 5),
      createMockVehicle(4, 200, 'in_minutes', 'In 10 minutes', 10), // Should be hidden (duplicate status)
      createMockVehicle(5, 300, 'arriving_soon', 'Arriving soon', 1),
      createMockVehicle(6, 300, 'just_left', 'Just left', -1)
    ];

    const result = groupVehiclesForDisplay(vehicles, {
      maxVehicles: 3,
      includeOffRoute: false,
      routeCount: 3
    });

    expect(result.groupingApplied).toBe(true);
    expect(result.displayed.length).toBeLessThanOrEqual(4); // Max 1 per route per status
    expect(result.hidden.length).toBeGreaterThan(0);
  });

  it('should filter out off-route vehicles when not included', () => {
    const vehicles = [
      createMockVehicle(1, 100, 'in_minutes', 'In 5 minutes', 5),
      createMockVehicle(2, 100, 'off_route', 'Off route', 999)
    ];

    const result = groupVehiclesForDisplay(vehicles, {
      maxVehicles: 5,
      includeOffRoute: false,
      routeCount: 2
    });

    expect(result.displayed).toHaveLength(1);
    expect(result.displayed[0].vehicle.id).toBe(1);
  });

  it('should include off-route vehicles when requested', () => {
    const vehicles = [
      createMockVehicle(1, 100, 'in_minutes', 'In 5 minutes', 5),
      createMockVehicle(2, 100, 'off_route', 'Off route', 999)
    ];

    const result = groupVehiclesForDisplay(vehicles, {
      maxVehicles: 5,
      includeOffRoute: true,
      routeCount: 2
    });

    expect(result.displayed).toHaveLength(2);
  });

  it('should enforce overall vehicle limit even after grouping', () => {
    // Create 8 vehicles across 8 different routes with different statuses
    // This should result in 8 displayed vehicles after grouping (1 per route)
    // But should be limited to maxVehicles (3 in this test)
    const vehicles = [
      createMockVehicle(1, 100, 'at_stop', 'At stop', 0),
      createMockVehicle(2, 200, 'arriving_soon', 'Arriving soon', 1),
      createMockVehicle(3, 300, 'in_minutes', 'In 5 minutes', 5),
      createMockVehicle(4, 400, 'in_minutes', 'In 7 minutes', 7),
      createMockVehicle(5, 500, 'just_left', 'Just left', -1),
      createMockVehicle(6, 600, 'departed', 'Departed', -5),
      createMockVehicle(7, 700, 'at_stop', 'At stop', 0),
      createMockVehicle(8, 800, 'arriving_soon', 'Arriving soon', 2)
    ];

    const result = groupVehiclesForDisplay(vehicles, {
      maxVehicles: 3, // Limit to 3 vehicles
      includeOffRoute: false,
      routeCount: 8 // Multiple routes
    });

    expect(result.groupingApplied).toBe(true);
    expect(result.displayed).toHaveLength(3); // Should be limited to maxVehicles
    expect(result.hidden).toHaveLength(5); // Remaining 5 vehicles should be hidden
  });
});