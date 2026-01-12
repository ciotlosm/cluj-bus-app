/**
 * Speed Prediction Utilities
 * Dynamic speed prediction system for enhanced vehicle arrival time accuracy
 * 
 * This module implements a hierarchical speed prediction system that:
 * 1. Validates and uses API speed data when available
 * 2. Falls back to nearby vehicle speed averaging
 * 3. Uses location-based speed estimation
 * 4. Provides static fallback as last resort
 */

import { calculateDistance, type Coordinates } from '../location/distanceUtils';
import { projectPointToShape } from '../arrival/distanceUtils';
import { SPEED_PREDICTION_CONFIG, ARRIVAL_CONFIG } from '../core/constants';
import type { TranzyVehicleResponse, TranzyStopResponse, TranzyStopTimeResponse } from '../../types/rawTranzyApi';
import type { RouteShape, ProjectionResult } from '../../types/arrivalTime';
import type { MovementSimulation, RouteMovementData } from './positionPredictionUtils';

// ============================================================================
// Speed Prediction Interfaces
// ============================================================================

/**
 * Result of speed prediction calculation
 * Contains all metadata for debugging and confidence assessment
 */
export interface SpeedPredictionResult {
  predictedSpeed: number; // km/h - main speed result
  speedMethod: 'api_speed' | 'nearby_average' | 'location_based' | 'static_fallback';
  speedConfidence: 'high' | 'medium' | 'low' | 'very_low';
  speedApplied: boolean;
  apiSpeed?: number; // original API speed value
  nearbyVehicleCount?: number;
  nearbyAverageSpeed?: number;
  distanceToCenter?: number; // meters from station density center
  locationBasedSpeed?: number; // calculated location-based speed
  speedCalculationTimeMs?: number; // performance tracking
}

/**
 * Enhanced movement simulation result with speed prediction data
 * Extends the base MovementSimulation with speed-specific metadata
 */
export interface EnhancedMovementSimulation extends MovementSimulation {
  speedPredictionData: {
    predictedSpeed: number;
    speedMethod: string;
    speedConfidence: string;
  };
  speedChanges: Array<{
    position: Coordinates;
    newSpeed: number;
    reason: 'station_departure' | 'traffic_change' | 'api_update';
  }>;
}
/**
 * Station density calculation result
 * Cached result for geographic center calculation
 */
export interface StationDensityResult {
  center: Coordinates;
  totalStations: number;
  averageDistance: number;
  calculatedAt: Date;
}

// ============================================================================
// Station Density Calculator
// ============================================================================

/**
 * Calculates the geographic center weighted by station density
 * Used for location-based speed estimation
 */
export class StationDensityCalculator {
  /**
   * Calculate the density center as the geographic centroid of all stations
   * @param stops Array of transit stops
   * @returns Station density calculation result
   */
  calculateDensityCenter(stops: TranzyStopResponse[]): StationDensityResult {
    if (stops.length === 0) {
      throw new Error('Cannot calculate density center with no stops');
    }

    const center = this.calculateWeightedCentroid(stops);
    
    // Calculate average distance from center for metadata
    const totalDistance = stops.reduce((sum, stop) => {
      return sum + calculateDistance(center, { lat: stop.stop_lat, lon: stop.stop_lon });
    }, 0);
    
    return {
      center,
      totalStations: stops.length,
      averageDistance: totalDistance / stops.length,
      calculatedAt: new Date()
    };
  }

  /**
   * Calculate the weighted centroid of all station positions
   * @param stops Array of transit stops
   * @returns Geographic centroid coordinates
   */
  private calculateWeightedCentroid(stops: TranzyStopResponse[]): Coordinates {
    let totalLat = 0;
    let totalLon = 0;
    
    for (const stop of stops) {
      totalLat += stop.stop_lat;
      totalLon += stop.stop_lon;
    }
    
    return {
      lat: totalLat / stops.length,
      lon: totalLon / stops.length
    };
  }
}

// ============================================================================
// Speed Predictor Class
// ============================================================================

/**
 * Main speed prediction component
 * Orchestrates hierarchical speed prediction with intelligent fallbacks
 */
export class SpeedPredictor {
  private densityCalculator: StationDensityCalculator;
  private densityCache: Map<string, StationDensityResult>;

  constructor() {
    this.densityCalculator = new StationDensityCalculator();
    this.densityCache = new Map();
  }

  /**
   * Main prediction function - returns speed prediction data
   * Implements hierarchical fallback logic as specified in requirements
   * 
   * @param vehicle Target vehicle for speed prediction
   * @param nearbyVehicles Array of nearby vehicles for averaging
   * @param stationDensityCenter Geographic center of station density
   * @returns Complete speed prediction result with metadata
   */
  predictSpeed(
    vehicle: TranzyVehicleResponse,
    nearbyVehicles: TranzyVehicleResponse[],
    stationDensityCenter: Coordinates
  ): SpeedPredictionResult {
    const startTime = performance.now();
    
    try {
      // Perform speed prediction synchronously for performance
      return this.performSpeedPrediction(vehicle, nearbyVehicles, stationDensityCenter, startTime);
    } catch (error) {
      // Graceful error handling (8.3, 8.4)
      console.warn('Speed prediction error:', error);
      return this.handleCalculationError(error as Error, vehicle, startTime);
    }
  }

  /**
   * Perform the actual speed prediction with hierarchical fallback
   * @param vehicle Target vehicle
   * @param nearbyVehicles Nearby vehicles for averaging
   * @param stationDensityCenter Station density center
   * @param startTime Calculation start time for performance tracking
   * @returns Speed prediction result
   */
  private performSpeedPrediction(
    vehicle: TranzyVehicleResponse,
    nearbyVehicles: TranzyVehicleResponse[],
    stationDensityCenter: Coordinates,
    startTime: number
  ): SpeedPredictionResult {
    // Priority 1: API Speed (Requirements 1.1, 1.2, 1.3, 4.2)
    if (this.validateApiSpeed(vehicle.speed)) {
      const apiSpeed = vehicle.speed;
      
      // Check if above threshold (1.2)
      if (apiSpeed > SPEED_PREDICTION_CONFIG.SPEED_THRESHOLD) {
        return {
          predictedSpeed: apiSpeed,
          speedMethod: 'api_speed',
          speedConfidence: 'high',
          speedApplied: true,
          apiSpeed,
          speedCalculationTimeMs: performance.now() - startTime
        };
      } else {
        // Below threshold - classified as stationary (1.3)
        // Fall through to other methods for better estimation
      }
    }

    // Priority 2: Nearby Vehicle Average (Requirements 2.1, 2.2, 2.3, 4.3)
    const nearbyResult = this.calculateNearbyAverage(nearbyVehicles, vehicle);
    if (nearbyResult.averageSpeed !== null && nearbyResult.count >= SPEED_PREDICTION_CONFIG.MIN_NEARBY_VEHICLES) {
      return {
        predictedSpeed: nearbyResult.averageSpeed,
        speedMethod: 'nearby_average',
        speedConfidence: nearbyResult.count >= 5 ? 'high' : 'medium',
        speedApplied: true,
        apiSpeed: vehicle.speed || undefined,
        nearbyVehicleCount: nearbyResult.count,
        nearbyAverageSpeed: nearbyResult.averageSpeed,
        speedCalculationTimeMs: performance.now() - startTime
      };
    }

    // Priority 3: Location-Based Estimation (Requirements 3.2, 3.3, 3.4, 3.5, 4.4)
    const vehiclePosition: Coordinates = { lat: vehicle.latitude, lon: vehicle.longitude };
    const distanceToCenter = calculateDistance(vehiclePosition, stationDensityCenter);
    const locationBasedSpeed = this.calculateLocationBasedSpeed(distanceToCenter);

    return {
      predictedSpeed: locationBasedSpeed,
      speedMethod: 'location_based',
      speedConfidence: 'medium',
      speedApplied: true,
      apiSpeed: vehicle.speed || undefined,
      nearbyVehicleCount: nearbyResult.count,
      nearbyAverageSpeed: nearbyResult.averageSpeed,
      distanceToCenter,
      locationBasedSpeed,
      speedCalculationTimeMs: performance.now() - startTime
    };
  }

  // ============================================================================
  // API Speed Processing (Requirements 1.1, 1.2, 1.5)
  // ============================================================================

  /**
   * Validate API speed data
   * @param speed Speed value from API (may be null/undefined)
   * @returns true if speed is valid and usable
   */
  private validateApiSpeed(speed: number | null | undefined): boolean {
    return (
      speed !== null &&
      speed !== undefined &&
      typeof speed === 'number' &&
      !isNaN(speed) &&
      speed >= 0 // non-negative requirement (1.1)
    );
  }

  /**
   * Convert speed units from km/h to m/s for distance calculations
   * @param speedKmh Speed in km/h
   * @returns Speed in m/s
   */
  convertSpeedUnits(speedKmh: number): number {
    return speedKmh / 3.6; // km/h to m/s conversion
  }

  // ============================================================================
  // Nearby Vehicle Analysis (Requirements 2.1, 2.2, 2.3, 2.5)
  // ============================================================================

  /**
   * Filter nearby vehicles within configured radius
   * @param targetVehicle Vehicle to find neighbors for
   * @param allVehicles All available vehicles
   * @returns Array of nearby vehicles with valid speeds
   */
  private filterNearbyVehicles(
    targetVehicle: TranzyVehicleResponse,
    allVehicles: TranzyVehicleResponse[]
  ): TranzyVehicleResponse[] {
    const targetPosition: Coordinates = { lat: targetVehicle.latitude, lon: targetVehicle.longitude };
    
    return allVehicles.filter(vehicle => {
      // Exclude target vehicle itself (2.5)
      if (vehicle.id === targetVehicle.id) {
        return false;
      }
      
      // Only include vehicles with valid speeds above threshold (2.2)
      if (!this.validateApiSpeed(vehicle.speed) || vehicle.speed <= SPEED_PREDICTION_CONFIG.SPEED_THRESHOLD) {
        return false;
      }
      
      // Check distance within radius (2.1)
      const vehiclePosition: Coordinates = { lat: vehicle.latitude, lon: vehicle.longitude };
      const distance = calculateDistance(targetPosition, vehiclePosition);
      
      return distance <= SPEED_PREDICTION_CONFIG.NEARBY_RADIUS;
    }).slice(0, SPEED_PREDICTION_CONFIG.MAX_NEARBY_VEHICLES); // Performance limit
  }

  /**
   * Calculate average speed of nearby moving vehicles
   * @param vehicles All vehicles to consider
   * @param targetVehicle Target vehicle (excluded from calculation)
   * @returns Average speed result with metadata
   */
  private calculateNearbyAverage(
    vehicles: TranzyVehicleResponse[],
    targetVehicle: TranzyVehicleResponse
  ): { averageSpeed: number | null; count: number } {
    const nearbyVehicles = this.filterNearbyVehicles(targetVehicle, vehicles);
    
    if (nearbyVehicles.length === 0) {
      return { averageSpeed: null, count: 0 };
    }
    
    // Calculate mathematical mean (2.3)
    const totalSpeed = nearbyVehicles.reduce((sum, vehicle) => sum + vehicle.speed, 0);
    const averageSpeed = totalSpeed / nearbyVehicles.length;
    
    return {
      averageSpeed: Math.round(averageSpeed * 10) / 10, // Round to 1 decimal place
      count: nearbyVehicles.length
    };
  }

  // ============================================================================
  // Location-Based Estimation (Requirements 3.2, 3.3, 3.4, 3.5)
  // ============================================================================

  /**
   * Calculate location-based speed using distance from station density center
   * @param distanceToCenter Distance in meters from station density center
   * @returns Estimated speed in km/h
   */
  private calculateLocationBasedSpeed(distanceToCenter: number): number {
    const { BASE_SPEED, DENSITY_FACTOR, MAX_DISTANCE } = SPEED_PREDICTION_CONFIG.LOCATION_SPEED;
    
    // Apply speed formula (3.5)
    // base_speed * (1 - density_factor * max(0, (max_distance - distance_to_center) / max_distance))
    const distanceRatio = Math.max(0, (MAX_DISTANCE - distanceToCenter) / MAX_DISTANCE);
    const speedReduction = DENSITY_FACTOR * distanceRatio;
    const locationBasedSpeed = BASE_SPEED * (1 - speedReduction);
    
    // Ensure minimum reasonable speed
    return Math.max(locationBasedSpeed, SPEED_PREDICTION_CONFIG.SPEED_THRESHOLD);
  }

  // ============================================================================
  // Fallback and Error Handling (Requirements 4.5, 8.3, 8.4)
  // ============================================================================

  /**
   * Get static fallback speed from existing constants
   * @returns Static fallback speed in km/h
   */
  private getStaticFallbackSpeed(): number {
    return ARRIVAL_CONFIG.AVERAGE_SPEED;
  }

  /**
   * Handle calculation errors gracefully
   * @param error The error that occurred
   * @param vehicle Vehicle being processed
   * @param startTime Calculation start time
   * @returns Fallback speed prediction result
   */
  private handleCalculationError(
    error: Error,
    vehicle: TranzyVehicleResponse,
    startTime: number = performance.now()
  ): SpeedPredictionResult {
    console.error('Speed prediction calculation error:', {
      vehicleId: vehicle.id,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    return {
      predictedSpeed: this.getStaticFallbackSpeed(),
      speedMethod: 'static_fallback',
      speedConfidence: 'very_low',
      speedApplied: true,
      apiSpeed: vehicle.speed || undefined,
      speedCalculationTimeMs: performance.now() - startTime
    };
  }

  // ============================================================================
  // Performance and Caching (Requirements 8.1, 8.2)
  // ============================================================================

  /**
   * Get cached density center result
   * @param agencyId Agency identifier for caching
   * @returns Cached result or null if not found/expired
   */
  private getCachedDensityCenter(agencyId: string): StationDensityResult | null {
    const cached = this.densityCache.get(agencyId);
    
    if (!cached) {
      return null;
    }
    
    // Check if cache is expired
    const now = new Date();
    const cacheAge = now.getTime() - cached.calculatedAt.getTime();
    
    if (cacheAge > SPEED_PREDICTION_CONFIG.DENSITY_CACHE_DURATION) {
      this.densityCache.delete(agencyId);
      return null;
    }
    
    return cached;
  }

  /**
   * Cache density center result
   * @param agencyId Agency identifier
   * @param result Density calculation result
   */
  private setCachedDensityCenter(agencyId: string, result: StationDensityResult): void {
    this.densityCache.set(agencyId, result);
  }

  /**
   * Calculate or retrieve cached station density center
   * @param stops Array of transit stops
   * @param agencyId Agency identifier for caching
   * @returns Station density center coordinates
   */
  getStationDensityCenter(stops: TranzyStopResponse[], agencyId: string): Coordinates {
    // Try to get from cache first
    const cached = this.getCachedDensityCenter(agencyId);
    if (cached) {
      return cached.center;
    }
    
    // Calculate new density center
    const result = this.densityCalculator.calculateDensityCenter(stops);
    this.setCachedDensityCenter(agencyId, result);
    
    return result.center;
  }
}

// ============================================================================
// Enhanced Movement Estimator
// ============================================================================

/**
 * Enhanced movement estimator that uses dynamic speed predictions
 * Integrates with existing movement simulation while using predicted speeds
 */
export class EnhancedMovementEstimator {
  private speedPredictor: SpeedPredictor;

  constructor() {
    this.speedPredictor = new SpeedPredictor();
  }

  /**
   * Simulate vehicle movement with dynamic speed prediction
   * Uses predictionMetadata.predictedSpeed instead of static constants
   * 
   * @param elapsedTimeMs Time elapsed since vehicle timestamp
   * @param movementData Route movement data including shape and stops
   * @param vehicle Enhanced vehicle data with speed prediction metadata
   * @returns Enhanced movement simulation with speed prediction data
   */
  simulateMovementWithDynamicSpeed(
    elapsedTimeMs: number,
    movementData: RouteMovementData,
    vehicle: { 
      predictionMetadata?: { 
        predictedSpeed?: number; 
        speedMethod?: string; 
        speedConfidence?: string; 
      } 
    }
  ): EnhancedMovementSimulation {
    const { routeShape, tripStopTimes, stops, vehicleProjection } = movementData;
    
    // Get predicted speed from vehicle metadata (Requirement 5.1)
    const predictedSpeed = vehicle.predictionMetadata?.predictedSpeed || ARRIVAL_CONFIG.AVERAGE_SPEED;
    const speedMethod = vehicle.predictionMetadata?.speedMethod || 'static_fallback';
    const speedConfidence = vehicle.predictionMetadata?.speedConfidence || 'very_low';
    
    // Convert elapsed time to seconds for calculations
    const elapsedTimeSeconds = elapsedTimeMs / 1000;
    
    // Convert predicted speed from km/h to m/s (Requirement 5.3)
    const speedMs = (predictedSpeed * 1000) / 3600;
    let remainingDistance = elapsedTimeSeconds * speedMs;
    
    // Initialize simulation state
    let currentProjection = vehicleProjection;
    let currentPosition = vehicleProjection.closestPoint;
    let totalDistanceTraveled = 0;
    let stationsEncountered: TranzyStopTimeResponse[] = [];
    let totalDwellTime = 0;
    let speedChanges: Array<{
      position: Coordinates;
      newSpeed: number;
      reason: 'station_departure' | 'traffic_change' | 'api_update';
    }> = [];
    
    // Check if vehicle is stationary (Requirement 5.2)
    if (predictedSpeed <= SPEED_PREDICTION_CONFIG.SPEED_THRESHOLD) {
      // Apply dwell time for stationary vehicles near stations
      const nearestStation = this.findNearestStation(currentPosition, stops);
      if (nearestStation && this.isNearStation(currentPosition, nearestStation)) {
        const dwellTimeMs = this.applyDwellTime(vehicle as any, nearestStation);
        totalDwellTime = dwellTimeMs;
        
        // Vehicle remains at current position during dwell
        return {
          startPosition: vehicleProjection.closestPoint,
          endPosition: currentPosition,
          distanceTraveled: 0,
          stationsEncountered: [],
          totalDwellTime,
          speedPredictionData: {
            predictedSpeed,
            speedMethod,
            speedConfidence
          },
          speedChanges
        };
      }
    }
    
    // Find stations ahead along the route
    const stationsAhead = this.findStationsAhead(currentProjection, tripStopTimes, stops, routeShape);
    
    // Simulate movement through each station (Requirement 5.4)
    for (const stationData of stationsAhead) {
      const { stopTime, stop, projection: stationProjection } = stationData;
      
      // Calculate distance to this station
      const distanceToStation = this.calculateDistanceToProjection(
        currentProjection,
        stationProjection,
        routeShape
      );
      
      // Check if we have enough remaining distance to reach this station
      if (remainingDistance >= distanceToStation) {
        // Vehicle reaches this station
        remainingDistance -= distanceToStation;
        totalDistanceTraveled += distanceToStation;
        currentProjection = stationProjection;
        currentPosition = stationProjection.closestPoint;
        stationsEncountered.push(stopTime);
        
        // Apply dwell time at station
        const dwellTimeSeconds = ARRIVAL_CONFIG.DWELL_TIME;
        const dwellTimeMs = dwellTimeSeconds * 1000;
        totalDwellTime += dwellTimeMs;
        
        // Recalculate speed after station departure (Requirement 5.4)
        const recalculatedSpeed = this.recalculateSpeedAtStation(vehicle as any, stop);
        if (recalculatedSpeed.predictedSpeed !== predictedSpeed) {
          speedChanges.push({
            position: currentPosition,
            newSpeed: recalculatedSpeed.predictedSpeed,
            reason: 'station_departure'
          });
        }
        
        // Update remaining distance calculation with potentially new speed
        const newSpeedMs = (recalculatedSpeed.predictedSpeed * 1000) / 3600;
        const remainingTimeAfterDwell = elapsedTimeSeconds - (totalDistanceTraveled / speedMs) - (totalDwellTime / 1000);
        
        if (remainingTimeAfterDwell > 0) {
          remainingDistance = remainingTimeAfterDwell * newSpeedMs;
        } else {
          // Vehicle is still dwelling at this station
          remainingDistance = 0;
          break;
        }
      } else {
        // Vehicle doesn't reach this station, move partway
        const finalPosition = this.moveAlongShape(
          currentProjection,
          remainingDistance,
          routeShape
        );
        
        totalDistanceTraveled += remainingDistance;
        currentPosition = finalPosition;
        break;
      }
    }
    
    // If no stations ahead or remaining distance after all stations
    if (stationsAhead.length === 0 && remainingDistance > 0) {
      const finalPosition = this.moveAlongShape(
        currentProjection,
        remainingDistance,
        routeShape
      );
      
      totalDistanceTraveled += remainingDistance;
      currentPosition = finalPosition;
    }
    
    return {
      startPosition: vehicleProjection.closestPoint,
      endPosition: currentPosition,
      distanceTraveled: totalDistanceTraveled,
      stationsEncountered,
      totalDwellTime,
      speedPredictionData: {
        predictedSpeed,
        speedMethod,
        speedConfidence
      },
      speedChanges
    };
  }

  /**
   * Apply dwell time for stationary vehicles near stations
   * @param vehicle Vehicle data
   * @param nearestStation Nearest station
   * @returns Dwell time in milliseconds
   */
  private applyDwellTime(vehicle: TranzyVehicleResponse, nearestStation: TranzyStopResponse): number {
    // Use standard dwell time for stationary vehicles at stations
    return ARRIVAL_CONFIG.DWELL_TIME * 1000; // Convert to milliseconds
  }

  /**
   * Recalculate speed at station based on current traffic conditions
   * @param vehicle Vehicle data
   * @param station Station where speed recalculation occurs
   * @returns Updated speed prediction result
   */
  private recalculateSpeedAtStation(
    vehicle: TranzyVehicleResponse, 
    station: TranzyStopResponse
  ): SpeedPredictionResult {
    // For now, return the same speed - this could be enhanced with real-time traffic data
    // In a full implementation, this would re-run speed prediction with updated conditions
    return {
      predictedSpeed: vehicle.speed || ARRIVAL_CONFIG.AVERAGE_SPEED,
      speedMethod: 'api_speed',
      speedConfidence: 'medium',
      speedApplied: true,
      speedCalculationTimeMs: 0
    };
  }

  /**
   * Find the nearest station to a given position
   * @param position Current position
   * @param stops Array of all stops
   * @returns Nearest station or null if none found
   */
  private findNearestStation(position: Coordinates, stops: TranzyStopResponse[]): TranzyStopResponse | null {
    if (stops.length === 0) return null;
    
    let nearestStation = stops[0];
    let minDistance = calculateDistance(position, { lat: nearestStation.stop_lat, lon: nearestStation.stop_lon });
    
    for (const stop of stops.slice(1)) {
      const distance = calculateDistance(position, { lat: stop.stop_lat, lon: stop.stop_lon });
      if (distance < minDistance) {
        minDistance = distance;
        nearestStation = stop;
      }
    }
    
    return nearestStation;
  }

  /**
   * Check if a position is near a station (within proximity threshold)
   * @param position Current position
   * @param station Station to check proximity to
   * @returns true if near station, false otherwise
   */
  private isNearStation(position: Coordinates, station: TranzyStopResponse): boolean {
    const distance = calculateDistance(position, { lat: station.stop_lat, lon: station.stop_lon });
    return distance <= ARRIVAL_CONFIG.PROXIMITY_THRESHOLD;
  }

  /**
   * Find stations ahead of current vehicle position along route shape
   * Reuses logic from positionPredictionUtils with enhanced error handling
   */
  private findStationsAhead(
    vehicleProjection: ProjectionResult,
    tripStopTimes: TranzyStopTimeResponse[],
    stops: TranzyStopResponse[],
    routeShape: RouteShape
  ): Array<{ stopTime: TranzyStopTimeResponse; stop: TranzyStopResponse; projection: ProjectionResult }> {
    const stationsAhead: Array<{ stopTime: TranzyStopTimeResponse; stop: TranzyStopResponse; projection: ProjectionResult }> = [];
    
    for (const stopTime of tripStopTimes) {
      const stop = stops.find(s => s.stop_id === stopTime.stop_id);
      if (!stop) continue;
      
      const stopPosition = { lat: stop.stop_lat, lon: stop.stop_lon };
      const stopProjection = projectPointToShape(stopPosition, routeShape);
      
      // Check if this station is ahead of the vehicle
      if (this.isProjectionAhead(vehicleProjection, stopProjection, routeShape)) {
        stationsAhead.push({ stopTime, stop, projection: stopProjection });
      }
    }
    
    // Sort by distance along route
    stationsAhead.sort((a, b) => {
      const distanceA = this.calculateDistanceToProjection(vehicleProjection, a.projection, routeShape);
      const distanceB = this.calculateDistanceToProjection(vehicleProjection, b.projection, routeShape);
      return distanceA - distanceB;
    });
    
    return stationsAhead;
  }

  /**
   * Check if projection B is ahead of projection A along route shape
   */
  private isProjectionAhead(
    projectionA: ProjectionResult,
    projectionB: ProjectionResult,
    routeShape: RouteShape
  ): boolean {
    // If on different segments, compare segment indices
    if (projectionA.segmentIndex !== projectionB.segmentIndex) {
      return projectionB.segmentIndex > projectionA.segmentIndex;
    }
    
    // If on same segment, compare positions along segment
    return projectionB.positionAlongSegment > projectionA.positionAlongSegment;
  }

  /**
   * Calculate distance to a projection along route shape
   */
  private calculateDistanceToProjection(
    fromProjection: ProjectionResult,
    toProjection: ProjectionResult,
    routeShape: RouteShape
  ): number {
    // If both projections are on the same segment, use simple calculation
    if (fromProjection.segmentIndex === toProjection.segmentIndex) {
      const segment = routeShape.segments[fromProjection.segmentIndex];
      const segmentLength = segment.distance;
      return Math.abs(toProjection.positionAlongSegment - fromProjection.positionAlongSegment) * segmentLength;
    }

    // For different segments, use direct distance as approximation
    return calculateDistance(fromProjection.closestPoint, toProjection.closestPoint);
  }

  /**
   * Move a specific distance along route shape from current projection
   */
  private moveAlongShape(
    startProjection: ProjectionResult,
    distance: number,
    routeShape: RouteShape
  ): Coordinates {
    let remainingDistance = distance;
    let currentSegmentIndex = startProjection.segmentIndex;
    let currentPosition = startProjection.positionAlongSegment;
    
    // Move through segments until distance is consumed
    while (remainingDistance > 0 && currentSegmentIndex < routeShape.segments.length) {
      const segment = routeShape.segments[currentSegmentIndex];
      const remainingSegmentDistance = (1 - currentPosition) * segment.distance;
      
      if (remainingDistance <= remainingSegmentDistance) {
        // Final position is within current segment
        const additionalPosition = remainingDistance / segment.distance;
        const finalPosition = currentPosition + additionalPosition;
        
        // Interpolate position along segment
        return this.interpolateAlongSegment(segment.start, segment.end, finalPosition);
      } else {
        // Move to next segment
        remainingDistance -= remainingSegmentDistance;
        currentSegmentIndex++;
        currentPosition = 0;
      }
    }
    
    // If we've reached the end of the route, return the last point
    const lastSegment = routeShape.segments[routeShape.segments.length - 1];
    return lastSegment.end;
  }

  /**
   * Interpolate position along a segment
   */
  private interpolateAlongSegment(
    start: Coordinates,
    end: Coordinates,
    position: number // 0-1
  ): Coordinates {
    const lat = start.lat + (end.lat - start.lat) * position;
    const lon = start.lon + (end.lon - start.lon) * position;
    return { lat, lon };
  }
}