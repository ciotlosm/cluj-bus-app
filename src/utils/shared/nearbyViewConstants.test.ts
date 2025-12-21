/**
 * Tests for nearby view constants and utility functions
 */

import { describe, it, expect } from 'vitest';
import type { Station, Coordinates } from '../../types';
import {
  NEARBY_STATION_DISTANCE_THRESHOLD,
  MAX_NEARBY_SEARCH_RADIUS,
  STATION_STABILITY_THRESHOLD,
  isWithinNearbyThreshold,
  calculateStationProximity,
  calculateUserToStationDistance,
  isStationWithinSearchRadius,
  isSignificantLocationChange,
  calculateStationDistanceInfo,
  shouldDisplaySecondStation,
  createStationDistanceInfo,
  sortStationsByDistance,
  getStationsWithinRadius
} from './nearbyViewConstants';

describe('Nearby View Constants', () => {
  it('should have correct default constant values', () => {
    expect(NEARBY_STATION_DISTANCE_THRESHOLD).toBe(200);
    expect(MAX_NEARBY_SEARCH_RADIUS).toBe(5000);
    expect(STATION_STABILITY_THRESHOLD).toBe(50);
  });
});

describe('Distance Threshold Functions', () => {
  describe('isWithinNearbyThreshold', () => {
    it('should return true for distances within threshold', () => {
      expect(isWithinNearbyThreshold(150)).toBe(true);
      expect(isWithinNearbyThreshold(200)).toBe(true);
      expect(isWithinNearbyThreshold(100, 150)).toBe(true);
    });

    it('should return false for distances exceeding threshold', () => {
      expect(isWithinNearbyThreshold(250)).toBe(false);
      expect(isWithinNearbyThreshold(201)).toBe(false);
      expect(isWithinNearbyThreshold(200, 150)).toBe(false);
    });
  });

  describe('calculateStationProximity', () => {
    const station1: Station = {
      id: '1',
      name: 'Station 1',
      coordinates: { latitude: 46.7712, longitude: 23.6236 },
      isFavorite: false
    };

    const station2: Station = {
      id: '2',
      name: 'Station 2',
      coordinates: { latitude: 46.7722, longitude: 23.6246 },
      isFavorite: false
    };

    it('should calculate distance between two stations', () => {
      const distance = calculateStationProximity(station1, station2);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(200); // Should be close stations
    });

    it('should return 0 for identical station coordinates', () => {
      const distance = calculateStationProximity(station1, station1);
      expect(distance).toBe(0);
    });
  });

  describe('calculateUserToStationDistance', () => {
    const userLocation: Coordinates = { latitude: 46.7712, longitude: 23.6236 };
    const station: Station = {
      id: '1',
      name: 'Station 1',
      coordinates: { latitude: 46.7722, longitude: 23.6246 },
      isFavorite: false
    };

    it('should calculate distance from user to station', () => {
      const distance = calculateUserToStationDistance(userLocation, station);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(200);
    });
  });
});

describe('Station Search Functions', () => {
  const userLocation: Coordinates = { latitude: 46.7712, longitude: 23.6236 };
  
  const nearStation: Station = {
    id: '1',
    name: 'Near Station',
    coordinates: { latitude: 46.7722, longitude: 23.6246 },
    isFavorite: false
  };

  const farStation: Station = {
    id: '2',
    name: 'Far Station',
    coordinates: { latitude: 46.8000, longitude: 23.7000 },
    isFavorite: false
  };

  describe('isStationWithinSearchRadius', () => {
    it('should return true for stations within search radius', () => {
      expect(isStationWithinSearchRadius(userLocation, nearStation)).toBe(true);
    });

    it('should return false for stations outside search radius', () => {
      expect(isStationWithinSearchRadius(userLocation, farStation, 1000)).toBe(false);
    });
  });

  describe('sortStationsByDistance', () => {
    it('should sort stations by distance from user', () => {
      const stations = [farStation, nearStation];
      const sorted = sortStationsByDistance(userLocation, stations);
      
      expect(sorted[0].id).toBe(nearStation.id);
      expect(sorted[1].id).toBe(farStation.id);
    });
  });

  describe('getStationsWithinRadius', () => {
    it('should filter and sort stations within radius', () => {
      const stations = [farStation, nearStation];
      const filtered = getStationsWithinRadius(userLocation, stations, 1000);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(nearStation.id);
    });
  });
});

describe('GPS Stability Functions', () => {
  describe('isSignificantLocationChange', () => {
    const location1: Coordinates = { latitude: 46.7712, longitude: 23.6236 };
    const location2: Coordinates = { latitude: 46.7713, longitude: 23.6237 }; // Very close
    const location3: Coordinates = { latitude: 46.7800, longitude: 23.6300 }; // Far

    it('should return false for small location changes', () => {
      expect(isSignificantLocationChange(location1, location2)).toBe(false);
    });

    it('should return true for significant location changes', () => {
      expect(isSignificantLocationChange(location1, location3)).toBe(true);
    });
  });
});

describe('Second Station Evaluation', () => {
  const closestStation: Station = {
    id: '1',
    name: 'Closest Station',
    coordinates: { latitude: 46.7712, longitude: 23.6236 },
    isFavorite: false
  };

  const nearbyStation: Station = {
    id: '2',
    name: 'Nearby Station',
    coordinates: { latitude: 46.7722, longitude: 23.6246 }, // ~150m away
    isFavorite: false
  };

  const distantStation: Station = {
    id: '3',
    name: 'Distant Station',
    coordinates: { latitude: 46.7800, longitude: 23.6300 }, // >1km away
    isFavorite: false
  };

  describe('shouldDisplaySecondStation', () => {
    it('should return true for stations within threshold', () => {
      expect(shouldDisplaySecondStation(closestStation, nearbyStation)).toBe(true);
    });

    it('should return false for stations exceeding threshold', () => {
      expect(shouldDisplaySecondStation(closestStation, distantStation)).toBe(false);
    });
  });
});

describe('Distance Information Functions', () => {
  const userLocation: Coordinates = { latitude: 46.7712, longitude: 23.6236 };
  const station: Station = {
    id: '1',
    name: 'Test Station',
    coordinates: { latitude: 46.7722, longitude: 23.6246 },
    isFavorite: false
  };

  describe('calculateStationDistanceInfo', () => {
    it('should return comprehensive distance information', () => {
      const result = calculateStationDistanceInfo(userLocation, station);
      
      expect(result.distance).toBeGreaterThan(0);
      expect(result.withinThreshold).toBe(true); // Should be within 200m
      expect(result.calculationMethod).toBe('haversine');
    });
  });

  describe('createStationDistanceInfo', () => {
    it('should create station distance info without reference station', () => {
      const result = createStationDistanceInfo(userLocation, station);
      
      expect(result.station).toBe(station);
      expect(result.distanceFromUser).toBeGreaterThan(0);
      expect(result.distanceBetweenStations).toBeUndefined();
    });

    it('should create station distance info with reference station', () => {
      const referenceStation: Station = {
        id: '2',
        name: 'Reference Station',
        coordinates: { latitude: 46.7700, longitude: 23.6220 },
        isFavorite: false
      };

      const result = createStationDistanceInfo(userLocation, station, referenceStation);
      
      expect(result.station).toBe(station);
      expect(result.distanceFromUser).toBeGreaterThan(0);
      expect(result.distanceBetweenStations).toBeGreaterThan(0);
    });
  });
});