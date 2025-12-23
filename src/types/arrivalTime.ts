/**
 * Vehicle Arrival Time TypeScript interfaces and types
 * Core interfaces for arrival time calculations, distance calculations, and configuration
 * Reuses existing coordinate types from distanceUtils
 */

import type { Coordinates } from '../utils/location/distanceUtils.ts';
import type { TranzyStopResponse, TranzyVehicleResponse, TranzyTripResponse, TranzyStopTimeResponse } from './rawTranzyApi.ts';

// Re-export types for use in arrival modules
export type { Coordinates, TranzyStopResponse, TranzyVehicleResponse, TranzyTripResponse, TranzyStopTimeResponse };

// ============================================================================
// Geometric Types
// ============================================================================

export interface ProjectionResult {
  closestPoint: Coordinates;
  distanceToShape: number;
  segmentIndex: number;
  positionAlongSegment: number; // 0-1
}

// ============================================================================
// Route Shape and Trip Data
// ============================================================================

export interface RouteShape {
  id: string;
  points: Coordinates[];
  segments: ShapeSegment[];
}

export interface ShapeSegment {
  start: Coordinates;
  end: Coordinates;
  distance: number;
}

// Vehicle, Trip, and TripStop interfaces removed - using raw API types directly

export interface DistanceResult {
  totalDistance: number;
  method: 'route_shape' | 'stop_segments';
  confidence: 'high' | 'medium' | 'low';
}

export interface ArrivalTimeResult {
  vehicleId: number;
  estimatedMinutes: number; // Always positive - actual time value
  status: ArrivalStatus;    // Determines sort order and display
  statusMessage: string;
  confidence: 'high' | 'medium' | 'low';
  calculationMethod: 'route_shape' | 'stop_segments';
  rawDistance?: number;
}

// ============================================================================
// Status Types and Sort Order
// ============================================================================

export type ArrivalStatus = 
  | 'at_stop'          // within proximity threshold, speed = 0 OR no progress along segment
  | 'arriving_soon'    // within proximity threshold, speed > 0, is next station
  | 'in_minutes'       // on route, heading to station
  | 'just_left'        // within proximity threshold, speed > 0, not next station
  | 'departed'         // not on route to this station anymore
  | 'off_route';       // way off expected path

// Sort order: lower number = higher priority
export const ARRIVAL_STATUS_SORT_ORDER: Record<ArrivalStatus, number> = {
  'at_stop': 0,
  'arriving_soon': 1,
  'in_minutes': 2,
  'just_left': 3,
  'departed': 4,
  'off_route': 5
};

export interface StatusMessageConfig {
  arrivingSoonThreshold: number; // minutes
  maxDisplayMinutes: number; // maximum minutes to display
  proximityThreshold: number; // meters
  recentDepartureWindow: number; // minutes
}

export const DEFAULT_STATUS_CONFIG: StatusMessageConfig = {
  arrivingSoonThreshold: 1, // 1 minute
  maxDisplayMinutes: 30, // 30 minutes
  proximityThreshold: 50, // 50 meters
  recentDepartureWindow: 2 // 2 minutes
};