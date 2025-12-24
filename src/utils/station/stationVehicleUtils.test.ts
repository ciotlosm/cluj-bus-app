// Station Vehicle Utilities Tests
// Tests for arrival time sorting functionality

import { describe, it, expect } from 'vitest';
import { sortStationVehiclesByArrival } from './stationVehicleUtils';
import type { StationVehicle } from '../../types/stationFilter';
import type { ArrivalStatus } from '../../types/arrivalTime';

// Mock data for testing
const createMockStationVehicle = (
  vehicleId: number, 
  arrivalTime?: { status: ArrivalStatus; statusMessage: string; confidence: 'high' | 'medium' | 'low'; estimatedMinutes: number }
): StationVehicle => ({
  vehicle: {
    id: vehicleId,
    label: `Vehicle ${vehicleId}`,
    latitude: 46.7712,
    longitude: 23.6236,
    speed: 25,
    timestamp: '2023-01-01T12:00:00Z',
    route_id: 1,
    trip_id: 'trip_1'
  },
  route: null,
  trip: null,
  arrivalTime
});

describe('sortStationVehiclesByArrival', () => {
  it('should sort vehicles with arrival times before vehicles without', () => {
    const vehicles: StationVehicle[] = [
      createMockStationVehicle(1), // No arrival time
      createMockStationVehicle(2, { status: 'in_minutes', statusMessage: 'In 5 minutes', confidence: 'high', estimatedMinutes: 5 }),
      createMockStationVehicle(3), // No arrival time
    ];

    const sorted = sortStationVehiclesByArrival(vehicles);
    
    expect(sorted[0].vehicle.id).toBe(2); // Vehicle with arrival time comes first
    expect(sorted[1].vehicle.id).toBe(1); // Vehicles without arrival time come after
    expect(sorted[2].vehicle.id).toBe(3);
  });

  it('should sort vehicles by estimated minutes when both have arrival times', () => {
    const vehicles: StationVehicle[] = [
      createMockStationVehicle(1, { status: 'in_minutes', statusMessage: 'In 10 minutes', confidence: 'high', estimatedMinutes: 10 }),
      createMockStationVehicle(2, { status: 'in_minutes', statusMessage: 'In 3 minutes', confidence: 'high', estimatedMinutes: 3 }),
      createMockStationVehicle(3, { status: 'in_minutes', statusMessage: 'In 7 minutes', confidence: 'medium', estimatedMinutes: 7 }),
    ];

    const sorted = sortStationVehiclesByArrival(vehicles);
    
    expect(sorted[0].vehicle.id).toBe(2); // 3 minutes
    expect(sorted[1].vehicle.id).toBe(3); // 7 minutes  
    expect(sorted[2].vehicle.id).toBe(1); // 10 minutes
  });

  it('should handle mixed scenarios with different status messages', () => {
    const vehicles: StationVehicle[] = [
      createMockStationVehicle(1, { status: 'departed', statusMessage: 'Departed', confidence: 'high', estimatedMinutes: -5 }),
      createMockStationVehicle(2, { status: 'at_stop', statusMessage: 'At stop', confidence: 'high', estimatedMinutes: 0 }),
      createMockStationVehicle(3, { status: 'in_minutes', statusMessage: 'In 2 minutes', confidence: 'medium', estimatedMinutes: 2 }),
      createMockStationVehicle(4), // No arrival time
    ];

    const sorted = sortStationVehiclesByArrival(vehicles);
    
    // Should be sorted by arrival priority: At stop, In minutes, Departed, No arrival time
    expect(sorted[0].arrivalTime?.statusMessage).toBe('At stop');
    expect(sorted[1].arrivalTime?.statusMessage).toBe('In 2 minutes');
    expect(sorted[2].arrivalTime?.statusMessage).toBe('Departed');
    expect(sorted[3].arrivalTime).toBeUndefined();
  });

  it('should maintain stable sort order for vehicles with same arrival time', () => {
    const vehicles: StationVehicle[] = [
      createMockStationVehicle(3, { status: 'in_minutes', statusMessage: 'In 5 minutes', confidence: 'high', estimatedMinutes: 5 }),
      createMockStationVehicle(1, { status: 'in_minutes', statusMessage: 'In 5 minutes', confidence: 'high', estimatedMinutes: 5 }),
      createMockStationVehicle(2, { status: 'in_minutes', statusMessage: 'In 5 minutes', confidence: 'high', estimatedMinutes: 5 }),
    ];

    const sorted = sortStationVehiclesByArrival(vehicles);
    
    // Should maintain original order when arrival times and status are equal
    expect(sorted[0].vehicle.id).toBe(1);
    expect(sorted[1].vehicle.id).toBe(2);
    expect(sorted[2].vehicle.id).toBe(3);
  });
});