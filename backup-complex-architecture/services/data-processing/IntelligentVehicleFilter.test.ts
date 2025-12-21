/**
 * Unit Tests for IntelligentVehicleFilter Service
 * 
 * Tests the core functionality of intelligent route-based vehicle filtering
 * including filtering decisions, user feedback generation, and edge cases.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  IntelligentVehicleFilter,
  type FilteringContext,
  type FilteringResult,
  intelligentVehicleFilter
} from './IntelligentVehicleFilter';
import { RouteClassification } from './RouteActivityAnalyzer';
import type { RouteActivityInfo } from './RouteActivityAnalyzer';
import type { CoreVehicle } from '../types/coreVehicle';
import { ConfidenceLevel } from '../types/coreVehicle';
import type { TransformationStation, TransformationContext } from '../types/presentationLayer';

describe('IntelligentVehicleFilter', () => {
  let filter: IntelligentVehicleFilter;
  let mockVehicles: CoreVehicle[];
  let mockStations: TransformationStation[];
  let mockContext: FilteringContext;
  let mockRouteActivity: Map<string, RouteActivityInfo>;

  beforeEach(() => {
    filter = new IntelligentVehicleFilter();
    
    // Create mock vehicles
    mockVehicles = [
      {
        id: 'vehicle1',
        routeId: 'route1',
        tripId: 'trip1',
        label: 'Bus 1',
        position: { latitude: 46.7712, longitude: 23.6236 }, // Close to station
        timestamp: new Date(),
        speed: 15,
        bearing: 90,
        isWheelchairAccessible: true,
        isBikeAccessible: false
      },
      {
        id: 'vehicle2',
        routeId: 'route1',
        tripId: 'trip2',
        label: 'Bus 2',
        position: { latitude: 46.8000, longitude: 23.6500 }, // Far from station
        timestamp: new Date(),
        speed: 20,
        bearing: 180,
        isWheelchairAccessible: false,
        isBikeAccessible: true
      },
      {
        id: 'vehicle3',
        routeId: 'route2',
        tripId: 'trip3',
        label: 'Bus 3',
        position: { latitude: 46.7700, longitude: 23.6200 }, // Close to station
        timestamp: new Date(),
        speed: 10,
        bearing: 270,
        isWheelchairAccessible: true,
        isBikeAccessible: true
      }
    ];

    // Create mock stations
    mockStations = [
      {
        id: 'station1',
        name: 'Central Station',
        coordinates: { latitude: 46.7712, longitude: 23.6236 },
        routeIds: ['route1', 'route2'],
        isFavorite: false,
        accessibility: {
          wheelchairAccessible: true,
          bikeRacks: true,
          audioAnnouncements: true
        }
      }
    ];

    // Create mock transformation context
    const mockTransformationContext: TransformationContext = {
      timestamp: new Date(),
      apiConfig: {
        apiKey: 'test-key',
        agencyId: 'test-agency',
        timeout: 10000
      },
      preferences: {
        timeFormat: '24h',
        distanceUnit: 'metric',
        language: 'en',
        maxWalkingDistance: 1000,
        arrivalBuffer: 5,
        wheelchairAccessibleOnly: false,
        bikeAccessibleOnly: false,
        preferredRouteTypes: [],
        preferRealTimeData: true,
        confidenceThreshold: ConfidenceLevel.MEDIUM
      },
      targetStations: mockStations,
      favoriteRoutes: ['route1'],
      userContext: 'home',
      timezone: 'Europe/Bucharest',
      maxVehiclesPerRoute: 10,
      maxRoutes: 20,
      includeScheduleData: true,
      includeDirectionAnalysis: true
    };

    // Create mock filtering context
    mockContext = {
      targetStations: mockStations,
      busyRouteThreshold: 5,
      distanceFilterThreshold: 2000,
      debugMode: false,
      transformationContext: mockTransformationContext
    };

    // Create mock route activity
    mockRouteActivity = new Map([
      ['route1', {
        routeId: 'route1',
        vehicleCount: 6, // Busy route
        classification: RouteClassification.BUSY,
        lastUpdated: new Date(),
        validVehicleCount: 6
      }],
      ['route2', {
        routeId: 'route2',
        vehicleCount: 2, // Quiet route
        classification: RouteClassification.QUIET,
        lastUpdated: new Date(),
        validVehicleCount: 2
      }]
    ]);
  });

  describe('filterVehicles', () => {
    it('should apply distance filtering to busy routes only', () => {
      const result = filter.filterVehicles(mockVehicles, mockRouteActivity, mockContext);
      
      expect(result).toBeDefined();
      expect(result.filteredVehicles).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.userFeedback).toBeDefined();
      
      // Check that filtering decisions were made
      expect(result.metadata.filteringDecisions.size).toBe(3);
      
      // Vehicle on quiet route should be included regardless of distance
      const vehicle3Decision = result.metadata.filteringDecisions.get('vehicle3');
      expect(vehicle3Decision?.included).toBe(true);
      expect(vehicle3Decision?.distanceFilterApplied).toBe(false);
      expect(vehicle3Decision?.reason).toContain('Quiet route');
    });

    it('should include all vehicles for quiet routes regardless of distance', () => {
      // Make route2 have a vehicle far from station
      mockVehicles[2].position = { latitude: 47.0000, longitude: 24.0000 }; // Very far
      
      const result = filter.filterVehicles(mockVehicles, mockRouteActivity, mockContext);
      
      // Vehicle on quiet route should still be included
      const vehicle3Decision = result.metadata.filteringDecisions.get('vehicle3');
      expect(vehicle3Decision?.included).toBe(true);
      expect(vehicle3Decision?.distanceFilterApplied).toBe(false);
    });

    it('should filter vehicles on busy routes by distance', () => {
      // Make vehicle2 very far from station
      mockVehicles[1].position = { latitude: 47.0000, longitude: 24.0000 }; // Very far
      
      const result = filter.filterVehicles(mockVehicles, mockRouteActivity, mockContext);
      
      // Vehicle on busy route should be filtered out if too far
      const vehicle2Decision = result.metadata.filteringDecisions.get('vehicle2');
      expect(vehicle2Decision?.included).toBe(false);
      expect(vehicle2Decision?.distanceFilterApplied).toBe(true);
      expect(vehicle2Decision?.reason).toContain('beyond');
    });

    it('should include vehicles with no route activity data', () => {
      // Add vehicle with unknown route
      const unknownVehicle: CoreVehicle = {
        id: 'vehicle4',
        routeId: 'unknown-route',
        tripId: 'trip4',
        label: 'Bus 4',
        position: { latitude: 46.7712, longitude: 23.6236 },
        timestamp: new Date(),
        speed: 15,
        bearing: 90,
        isWheelchairAccessible: true,
        isBikeAccessible: false
      };
      
      const vehiclesWithUnknown = [...mockVehicles, unknownVehicle];
      const result = filter.filterVehicles(vehiclesWithUnknown, mockRouteActivity, mockContext);
      
      // Unknown route vehicle should be included
      const unknownDecision = result.metadata.filteringDecisions.get('vehicle4');
      expect(unknownDecision?.included).toBe(true);
      expect(unknownDecision?.reason).toContain('No route activity data');
    });

    it('should not apply distance filtering to routes with 0-1 vehicles', () => {
      // Update route1 to have only 1 vehicle but still be classified as busy
      mockRouteActivity.set('route1', {
        routeId: 'route1',
        vehicleCount: 1,
        classification: RouteClassification.BUSY, // Still busy but only 1 vehicle
        lastUpdated: new Date(),
        validVehicleCount: 1
      });
      
      const result = filter.filterVehicles(mockVehicles, mockRouteActivity, mockContext);
      
      // Vehicles on route with 1 vehicle should not have distance filtering applied
      const vehicle1Decision = result.metadata.filteringDecisions.get('vehicle1');
      const vehicle2Decision = result.metadata.filteringDecisions.get('vehicle2');
      
      expect(vehicle1Decision?.distanceFilterApplied).toBe(false);
      expect(vehicle2Decision?.distanceFilterApplied).toBe(false);
      expect(vehicle1Decision?.reason).toContain('0-1 vehicles');
      expect(vehicle2Decision?.reason).toContain('0-1 vehicles');
    });
  });

  describe('shouldApplyDistanceFilter', () => {
    it('should return true for busy routes', () => {
      const result = filter.shouldApplyDistanceFilter('route1', mockRouteActivity);
      expect(result).toBe(true);
    });

    it('should return false for quiet routes', () => {
      const result = filter.shouldApplyDistanceFilter('route2', mockRouteActivity);
      expect(result).toBe(false);
    });

    it('should return false for unknown routes', () => {
      const result = filter.shouldApplyDistanceFilter('unknown-route', mockRouteActivity);
      expect(result).toBe(false);
    });
  });

  describe('filterByDistance', () => {
    it('should filter vehicles beyond distance threshold', () => {
      // Make vehicle2 far from station
      mockVehicles[1].position = { latitude: 47.0000, longitude: 24.0000 };
      
      const result = filter.filterByDistance(mockVehicles, mockStations, 2000);
      
      // Should only include vehicles within 2000m
      expect(result.length).toBeLessThan(mockVehicles.length);
      expect(result.some(v => v.id === 'vehicle1')).toBe(true); // Close vehicle included
      expect(result.some(v => v.id === 'vehicle2')).toBe(false); // Far vehicle excluded
    });

    it('should return all vehicles when no stations provided', () => {
      const result = filter.filterByDistance(mockVehicles, [], 2000);
      expect(result).toEqual(mockVehicles);
    });

    it('should include vehicles within distance threshold', () => {
      const result = filter.filterByDistance(mockVehicles, mockStations, 5000);
      
      // All vehicles should be included with large threshold
      expect(result.length).toBe(mockVehicles.length);
    });
  });

  describe('generateUserFeedback', () => {
    it('should generate correct route counts', () => {
      const feedback = filter.generateUserFeedback(mockRouteActivity, mockVehicles, mockVehicles);
      
      expect(feedback.totalRoutes).toBe(2);
      expect(feedback.busyRoutes).toBe(1);
      expect(feedback.quietRoutes).toBe(1);
      expect(feedback.distanceFilteredVehicles).toBe(0); // No vehicles filtered
    });

    it('should generate route status messages', () => {
      const feedback = filter.generateUserFeedback(mockRouteActivity, mockVehicles, mockVehicles);
      
      expect(feedback.routeStatusMessages.size).toBe(2);
      
      const route1Message = feedback.routeStatusMessages.get('route1');
      const route2Message = feedback.routeStatusMessages.get('route2');
      
      expect(route1Message).toContain('Busy');
      expect(route1Message).toContain('Distance filtering applied');
      expect(route2Message).toContain('Quiet');
      expect(route2Message).toContain('All vehicles shown');
    });

    it('should generate empty state message when no vehicles', () => {
      const feedback = filter.generateUserFeedback(mockRouteActivity, [], mockVehicles);
      
      expect(feedback.emptyStateMessage).toBeDefined();
      expect(feedback.emptyStateMessage).toContain('filtered due to distance');
    });

    it('should generate appropriate empty state message when no original vehicles', () => {
      const feedback = filter.generateUserFeedback(mockRouteActivity, [], []);
      
      expect(feedback.emptyStateMessage).toBeDefined();
      expect(feedback.emptyStateMessage).toContain('No vehicles are currently active');
    });
  });

  describe('singleton instance', () => {
    it('should provide a working singleton instance', () => {
      expect(intelligentVehicleFilter).toBeInstanceOf(IntelligentVehicleFilter);
      
      // Test that the singleton works
      const result = intelligentVehicleFilter.shouldApplyDistanceFilter('route1', mockRouteActivity);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('edge cases', () => {
    it('should handle empty vehicle array', () => {
      const result = filter.filterVehicles([], mockRouteActivity, mockContext);
      
      expect(result.filteredVehicles).toEqual([]);
      expect(result.metadata.filteringDecisions.size).toBe(0);
      expect(result.userFeedback.totalRoutes).toBe(2);
    });

    it('should handle empty route activity', () => {
      const result = filter.filterVehicles(mockVehicles, new Map(), mockContext);
      
      // All vehicles should be included when no route activity data
      expect(result.filteredVehicles.length).toBe(mockVehicles.length);
      
      // All decisions should include vehicles
      for (const decision of result.metadata.filteringDecisions.values()) {
        expect(decision.included).toBe(true);
        expect(decision.reason).toContain('No route activity data');
      }
    });

    it('should handle debug mode logging', () => {
      const debugContext = { ...mockContext, debugMode: true };
      
      // Should not throw error with debug mode enabled
      expect(() => {
        filter.filterVehicles(mockVehicles, mockRouteActivity, debugContext);
      }).not.toThrow();
    });
  });
});