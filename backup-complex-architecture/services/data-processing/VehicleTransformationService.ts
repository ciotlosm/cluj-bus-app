/**
 * Vehicle Transformation Service
 * 
 * This service implements the main transformation pipeline for converting raw API data
 * into UI-ready formats. It serves as the single entry point for all vehicle data
 * transformations, eliminating duplicate transformation logic across the codebase.
 * 
 * Requirements: 2.1, 2.4
 * 
 * @module VehicleTransformationService
 */

import type { 
  CoreVehicle, 
  Coordinates, 
  RouteType 
} from '../../types/coreVehicle';
import { 
  DirectionStatus, 
  ConfidenceLevel 
} from '../../types/coreVehicle';
import type { 
  VehicleSchedule, 
  VehicleDirection, 
  RouteInfo 
} from '../../types/businessLogic';
import type { 
  TransformationContext, 
  VehicleDisplayData, 
  TransformedVehicleData,
  TransformationStation
} from '../../types/presentationLayer';
import { createEmptyTransformedVehicleData } from '../../types/presentationLayer';
import type { 
  TranzyVehicleResponse,
  TranzyRouteResponse,
  TranzyStopResponse,
  TranzyStopTimeResponse,
  TranzyTripResponse
} from '../../types/tranzyApi';
import { 
  TransformationPipeline, 
  TransformationError,
  createSuccessValidation,
  createFailureValidation,
  createValidationError
} from '../../types/transformationPipeline';
import type { TransformationStep } from '../../types/transformationPipeline';
import { DataValidator } from './DataValidator';
import { transformationRetryManager } from './TransformationRetryManager';
import { routeFilteringConfigurationManager } from '../business-logic/RouteFilteringConfigurationManager';
import { routeActivityAnalyzer } from '../business-logic/RouteActivityAnalyzer';
import { intelligentVehicleFilter } from '../data-processing/IntelligentVehicleFilter';
import { realTimeConfigurationManager } from '../business-logic/RealTimeConfigurationManager';
import type { FilteringContext } from '../data-processing/IntelligentVehicleFilter';
import { logger } from '../../utils/shared/logger';

// ============================================================================
// PERFORMANCE OPTIMIZATION TYPES
// ============================================================================

/**
 * Cache entry with metadata for performance tracking
 */
interface CacheEntry<T> {
  data: T;
  expiry: Date;
  createdAt: Date;
  accessCount: number;
  lastAccessed: Date;
  size: number; // Estimated memory size in bytes
}

/**
 * Cache statistics for monitoring performance
 */
interface CacheStats {
  size: number;
  totalEntries: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  averageAccessCount: number;
  totalMemoryUsage: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}

/**
 * Lazy evaluation wrapper for expensive calculations
 */
class LazyValue<T> {
  private _value: T | undefined;
  private _computed = false;
  private readonly _factory: () => T;

  constructor(factory: () => T) {
    this._factory = factory;
  }

  get value(): T {
    if (!this._computed) {
      this._value = this._factory();
      this._computed = true;
    }
    return this._value!;
  }

  get isComputed(): boolean {
    return this._computed;
  }

  reset(): void {
    this._value = undefined;
    this._computed = false;
  }
}

// ============================================================================
// ENHANCED TRANSFORMATION CACHE CLASS
// ============================================================================

/**
 * Enhanced cache for transformation results with performance optimizations
 * 
 * Features:
 * - TTL-based expiration
 * - LRU eviction policy
 * - Memory usage tracking
 * - Hit/miss rate monitoring
 * - Efficient data structures for fast lookups
 * - Automatic cleanup of expired entries
 */
class TransformationCache {
  private cache = new Map<string, CacheEntry<any>>();
  private accessOrder = new Map<string, number>(); // For LRU tracking
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ENTRIES = 1000; // Maximum cache entries
  private readonly MAX_MEMORY_MB = 50; // Maximum memory usage in MB
  
  // Performance tracking
  private hitCount = 0;
  private missCount = 0;
  private accessCounter = 0;

  /**
   * Store data in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const now = new Date();
    const expiry = new Date(now.getTime() + ttl);
    const size = this.estimateSize(data);

    // Check if we need to evict entries
    this.evictIfNecessary(size);

    const entry: CacheEntry<T> = {
      data,
      expiry,
      createdAt: now,
      accessCount: 0,
      lastAccessed: now,
      size
    };

    this.cache.set(key, entry);
    this.accessOrder.set(key, this.accessCounter++);
  }

  /**
   * Retrieve data from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check if expired
    if (entry.expiry < new Date()) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.missCount++;
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = new Date();
    this.accessOrder.set(key, this.accessCounter++);
    this.hitCount++;

    return entry.data as T;
  }

  /**
   * Check if key exists in cache (without updating access stats)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (entry.expiry < new Date()) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Remove specific key from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.accessOrder.delete(key);
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.hitCount = 0;
    this.missCount = 0;
    this.accessCounter = 0;
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalAccesses = this.hitCount + this.missCount;
    
    return {
      size: this.cache.size,
      totalEntries: this.cache.size,
      hitRate: totalAccesses > 0 ? this.hitCount / totalAccesses : 0,
      missRate: totalAccesses > 0 ? this.missCount / totalAccesses : 0,
      totalHits: this.hitCount,
      totalMisses: this.missCount,
      averageAccessCount: entries.length > 0 
        ? entries.reduce((sum, entry) => sum + entry.accessCount, 0) / entries.length 
        : 0,
      totalMemoryUsage: entries.reduce((sum, entry) => sum + entry.size, 0),
      oldestEntry: entries.length > 0 
        ? new Date(Math.min(...entries.map(e => e.createdAt.getTime())))
        : undefined,
      newestEntry: entries.length > 0 
        ? new Date(Math.max(...entries.map(e => e.createdAt.getTime())))
        : undefined
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = new Date();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }
  
  /**
   * Alias for cleanup() method for consistency
   * 
   * Requirements 5.3: Add selective cache invalidation for vehicle data updates
   */
  cleanupExpired(): number {
    return this.cleanup();
  }

  /**
   * Get cache keys sorted by access order (most recent first)
   */
  getKeysByAccessOrder(): string[] {
    return Array.from(this.accessOrder.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([key]) => key);
  }

  /**
   * Evict entries if cache is too large
   */
  private evictIfNecessary(newEntrySize: number): void {
    // Check memory limit
    const currentMemory = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    const maxMemoryBytes = this.MAX_MEMORY_MB * 1024 * 1024;
    
    // Evict LRU entries if we exceed limits
    while (
      (this.cache.size >= this.MAX_ENTRIES) ||
      (currentMemory + newEntrySize > maxMemoryBytes)
    ) {
      const lruKey = this.findLRUKey();
      if (lruKey) {
        this.cache.delete(lruKey);
        this.accessOrder.delete(lruKey);
      } else {
        break; // No more entries to evict
      }
    }
  }

  /**
   * Find least recently used key
   */
  private findLRUKey(): string | null {
    let lruKey: string | null = null;
    let lruOrder = Infinity;

    for (const [key, order] of this.accessOrder.entries()) {
      if (order < lruOrder) {
        lruOrder = order;
        lruKey = key;
      }
    }

    return lruKey;
  }

  /**
   * Estimate memory size of data (rough approximation)
   */
  private estimateSize(data: any): number {
    if (data === null || data === undefined) return 8;
    
    switch (typeof data) {
      case 'boolean': return 4;
      case 'number': return 8;
      case 'string': return data.length * 2; // UTF-16
      case 'object':
        if (data instanceof Date) return 8;
        if (data instanceof Map) {
          let size = 0;
          for (const [key, value] of data.entries()) {
            size += this.estimateSize(key) + this.estimateSize(value);
          }
          return size + 32; // Map overhead
        }
        if (data instanceof Set) {
          let size = 0;
          for (const value of data.values()) {
            size += this.estimateSize(value);
          }
          return size + 32; // Set overhead
        }
        if (Array.isArray(data)) {
          return data.reduce((sum, item) => sum + this.estimateSize(item), 16);
        }
        // Regular object
        return Object.entries(data).reduce(
          (sum, [key, value]) => sum + this.estimateSize(key) + this.estimateSize(value),
          16
        );
      default:
        return 16; // Default size for unknown types
    }
  }
}

// ============================================================================
// DATA VALIDATOR CLASS
// ============================================================================

// DataValidator is now imported from separate module

// ============================================================================
// TRANSFORMATION STEPS
// ============================================================================

/**
 * Step 1: Normalize API data to CoreVehicle format
 */
class NormalizeApiDataStep implements TransformationStep<TranzyVehicleResponse[], CoreVehicle[]> {
  name = 'normalize-api-data';

  validate(input: TranzyVehicleResponse[]) {
    if (!Array.isArray(input)) {
      return createFailureValidation([
        createValidationError('input', 'Input must be an array', 'INVALID_INPUT_TYPE')
      ]);
    }

    const errors = [];
    for (let i = 0; i < input.length; i++) {
      const vehicle = input[i];
      if (!vehicle.id) {
        errors.push(createValidationError(`[${i}].id`, 'Vehicle ID is required', 'MISSING_ID'));
      }
      if (typeof vehicle.latitude !== 'number' || vehicle.latitude < -90 || vehicle.latitude > 90) {
        errors.push(createValidationError(`[${i}].latitude`, 'Invalid latitude', 'INVALID_LATITUDE'));
      }
      if (typeof vehicle.longitude !== 'number' || vehicle.longitude < -180 || vehicle.longitude > 180) {
        errors.push(createValidationError(`[${i}].longitude`, 'Invalid longitude', 'INVALID_LONGITUDE'));
      }
    }

    return errors.length > 0 
      ? createFailureValidation(errors)
      : createSuccessValidation();
  }

  transform(input: TranzyVehicleResponse[], context: TransformationContext): CoreVehicle[] {
    return input
      .filter(vehicle => 
        vehicle.latitude != null && 
        vehicle.longitude != null &&
        vehicle.route_id != null
      )
      .map(vehicle => {
        // Look up route name from context if available
        const routeName = this.getRouteNameFromContext(vehicle.route_id.toString(), context);
        
        return {
          id: vehicle.id,
          routeId: vehicle.route_id.toString(),
          routeName: routeName,
          tripId: vehicle.trip_id,
          label: vehicle.label,
          position: {
            latitude: vehicle.latitude,
            longitude: vehicle.longitude,
            accuracy: undefined
          },
          timestamp: vehicle.timestamp ? new Date(vehicle.timestamp) : new Date(),
          speed: vehicle.speed,
          bearing: vehicle.bearing,
          isWheelchairAccessible: vehicle.wheelchair_accessible === 'WHEELCHAIR_ACCESSIBLE',
          isBikeAccessible: vehicle.bike_accessible === 'BIKE_ACCESSIBLE'
        };
      });
  }

  private getRouteNameFromContext(routeId: string, context: TransformationContext): string | undefined {
    // Look up route name from route data in context
    if (context.routeData && context.routeData.length > 0) {
      // Try exact match first
      let route = context.routeData.find(r => r.id === routeId);
      
      // If no exact match, try with string conversion (in case of type mismatch)
      if (!route) {
        route = context.routeData.find(r => r.id.toString() === routeId.toString());
      }
      
      // If still no match, try parsing as number (in case route ID is numeric)
      if (!route && !isNaN(Number(routeId))) {
        route = context.routeData.find(r => r.id === Number(routeId).toString());
      }
      
      return route?.routeName;
    }
    return undefined;
  }
}

/**
 * Step 2: Enrich vehicles with schedule data
 */
class EnrichWithScheduleStep implements TransformationStep<CoreVehicle[], Map<string, VehicleSchedule>> {
  name = 'enrich-with-schedule';

  transform(input: CoreVehicle[], context: TransformationContext): Map<string, VehicleSchedule> {
    const schedules = new Map<string, VehicleSchedule>();
    const now = context.timestamp;

    for (const vehicle of input) {
      // Find target station for this vehicle
      const targetStation = this.findTargetStation(vehicle, context.targetStations);
      if (!targetStation) continue;

      // Calculate estimated arrival
      const estimatedArrival = this.calculateEstimatedArrival(vehicle, targetStation, now);
      const minutesUntilArrival = Math.max(0, Math.round((estimatedArrival.getTime() - now.getTime()) / 60000));

      const schedule: VehicleSchedule = {
        vehicleId: vehicle.id,
        tripId: vehicle.tripId || `generated-${vehicle.id}`,
        routeId: vehicle.routeId,
        stationId: targetStation.id,
        scheduledArrival: estimatedArrival, // In real implementation, this would come from GTFS data
        estimatedArrival,
        minutesUntilArrival,
        isRealTime: true,
        isScheduled: false, // Would be true if we had GTFS schedule data
        confidence: this.calculateConfidence(vehicle, now),
        stopSequence: 1, // Would be calculated from GTFS data
        isFinalStop: false,
        lastUpdated: now
      };

      schedules.set(vehicle.id, schedule);
    }

    return schedules;
  }

  private findTargetStation(vehicle: CoreVehicle, stations: TransformationStation[]): TransformationStation | null {
    if (stations.length === 0) return null;

    // Find closest station without hardcoded distance filtering
    // Distance filtering is now handled by IntelligentVehicleFilter based on route activity
    let closest: TransformationStation | null = null;
    let minDistance = Infinity;

    for (const station of stations) {
      const distance = this.calculateDistance(vehicle.position, station.coordinates);
      if (distance < minDistance) {
        minDistance = distance;
        closest = station;
      }
    }

    return closest; // Return closest station regardless of distance
  }

  private calculateDistance(pos1: Coordinates, pos2: Coordinates): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = pos1.latitude * Math.PI / 180;
    const φ2 = pos2.latitude * Math.PI / 180;
    const Δφ = (pos2.latitude - pos1.latitude) * Math.PI / 180;
    const Δλ = (pos2.longitude - pos1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private calculateEstimatedArrival(vehicle: CoreVehicle, station: TransformationStation, now: Date): Date {
    const distance = this.calculateDistance(vehicle.position, station.coordinates);
    const speed = vehicle.speed || 15; // Default 15 km/h if no speed data
    const estimatedMinutes = Math.max(1, distance / (speed * 16.67)); // Convert km/h to m/s
    
    return new Date(now.getTime() + estimatedMinutes * 60000);
  }

  private calculateConfidence(vehicle: CoreVehicle, now: Date): ConfidenceLevel {
    const age = now.getTime() - vehicle.timestamp.getTime();
    
    if (age < 60000) return ConfidenceLevel.HIGH; // Less than 1 minute old
    if (age < 300000) return ConfidenceLevel.MEDIUM; // Less than 5 minutes old
    return ConfidenceLevel.LOW; // Older than 5 minutes
  }
}

/**
 * Step 3: Analyze vehicle directions
 */
class AnalyzeDirectionsStep implements TransformationStep<CoreVehicle[], Map<string, VehicleDirection>> {
  name = 'analyze-directions';

  transform(input: CoreVehicle[], context: TransformationContext): Map<string, VehicleDirection> {
    const directions = new Map<string, VehicleDirection>();

    for (const vehicle of input) {
      const targetStation = this.findTargetStation(vehicle, context.targetStations);
      if (!targetStation) continue;

      const direction: VehicleDirection = {
        vehicleId: vehicle.id,
        stationId: targetStation.id,
        routeId: vehicle.routeId,
        tripId: vehicle.tripId || `generated-${vehicle.id}`,
        direction: this.determineDirectionStatus(vehicle, targetStation),
        estimatedMinutes: this.calculateEstimatedMinutes(vehicle, targetStation),
        confidence: this.calculateDirectionConfidence(vehicle),
        distanceToStation: this.calculateDistance(vehicle.position, targetStation.coordinates),
        bearing: vehicle.bearing,
        speed: vehicle.speed,
        isAtStation: this.isVehicleAtStation(vehicle, targetStation),
        analyzedAt: context.timestamp
      };

      directions.set(vehicle.id, direction);
    }

    return directions;
  }

  private findTargetStation(vehicle: CoreVehicle, stations: TransformationStation[]): TransformationStation | null {
    if (stations.length === 0) return null;

    // Find closest station without hardcoded distance filtering
    // Distance filtering is now handled by IntelligentVehicleFilter based on route activity
    let closest: TransformationStation | null = null;
    let minDistance = Infinity;

    for (const station of stations) {
      const distance = this.calculateDistance(vehicle.position, station.coordinates);
      if (distance < minDistance) {
        minDistance = distance;
        closest = station;
      }
    }

    return closest; // Return closest station regardless of distance
  }

  private calculateDistance(pos1: Coordinates, pos2: Coordinates): number {
    const R = 6371e3;
    const φ1 = pos1.latitude * Math.PI / 180;
    const φ2 = pos2.latitude * Math.PI / 180;
    const Δφ = (pos2.latitude - pos1.latitude) * Math.PI / 180;
    const Δλ = (pos2.longitude - pos1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private determineDirectionStatus(vehicle: CoreVehicle, station: TransformationStation): DirectionStatus {
    const distance = this.calculateDistance(vehicle.position, station.coordinates);
    
    if (distance < 100) return DirectionStatus.ARRIVING; // Within 100m
    if (vehicle.speed && vehicle.speed > 5) return DirectionStatus.ARRIVING; // Moving towards
    return DirectionStatus.UNKNOWN;
  }

  private calculateEstimatedMinutes(vehicle: CoreVehicle, station: TransformationStation): number {
    const distance = this.calculateDistance(vehicle.position, station.coordinates);
    const speed = vehicle.speed || 15; // Default 15 km/h
    return Math.max(1, distance / (speed * 16.67)); // Convert to minutes
  }

  private calculateDirectionConfidence(vehicle: CoreVehicle): ConfidenceLevel {
    if (vehicle.bearing && vehicle.speed && vehicle.speed > 0) {
      return ConfidenceLevel.HIGH;
    }
    if (vehicle.speed && vehicle.speed > 0) {
      return ConfidenceLevel.MEDIUM;
    }
    return ConfidenceLevel.LOW;
  }

  private isVehicleAtStation(vehicle: CoreVehicle, station: TransformationStation): boolean {
    const distance = this.calculateDistance(vehicle.position, station.coordinates);
    return distance < 50; // Within 50 meters
  }
}

/**
 * Step 4: Generate display data for UI
 */
class GenerateDisplayDataStep implements TransformationStep<
  { vehicles: CoreVehicle[]; schedules: Map<string, VehicleSchedule>; directions: Map<string, VehicleDirection> },
  Map<string, VehicleDisplayData>
> {
  name = 'generate-display-data';

  transform(
    input: { vehicles: CoreVehicle[]; schedules: Map<string, VehicleSchedule>; directions: Map<string, VehicleDirection> },
    context: TransformationContext
  ): Map<string, VehicleDisplayData> {
    const displayData = new Map<string, VehicleDisplayData>();

    for (const vehicle of input.vehicles) {
      const schedule = input.schedules.get(vehicle.id);
      const direction = input.directions.get(vehicle.id);

      const display: VehicleDisplayData = {
        vehicleId: vehicle.id,
        displayName: `${vehicle.routeName || vehicle.routeId} - ${vehicle.label}`,
        routeName: vehicle.routeName || `Route ${vehicle.routeId}`,
        routeShortName: vehicle.routeId, // Use routeId as the short name/code for the badge
        vehicleLabel: vehicle.label,
        destination: this.getDestination(vehicle, direction),
        arrivalText: this.formatArrivalTime(schedule, context),
        statusColor: this.getStatusColor(schedule, direction),
        backgroundColor: '#ffffff',
        textColor: '#000000',
        confidenceIndicator: this.getConfidenceIndicator(schedule, direction),
        isRealTime: schedule?.isRealTime || false,
        isScheduled: schedule?.isScheduled || false,
        isDelayed: this.isDelayed(schedule),
        isEarly: this.isEarly(schedule),
        isWheelchairAccessible: vehicle.isWheelchairAccessible,
        isBikeAccessible: vehicle.isBikeAccessible,
        distanceText: this.formatDistance(direction?.distanceToStation),
        directionText: this.getDirectionText(direction, context),
        statusMessages: this.getStatusMessages(vehicle, schedule, direction),
        warningMessages: this.getWarningMessages(vehicle, schedule, direction),
        errorMessages: [],
        iconName: this.getIconName(vehicle),
        displayPriority: this.calculateDisplayPriority(schedule, direction),
        isHighlighted: this.shouldHighlight(vehicle, context),
        isFavorite: context.favoriteRoutes.includes(vehicle.routeId),
        delayText: this.formatDelay(schedule),
        confidenceText: this.formatConfidence(schedule, direction),
        accessibilityIndicators: {
          wheelchair: vehicle.isWheelchairAccessible,
          bike: vehicle.isBikeAccessible,
          audio: false // Would be determined from route/station data
        },
        routeColor: {
          primary: '#2196f3',
          secondary: '#e3f2fd',
          text: '#ffffff'
        },
        animationState: 'stable',
        lastUpdated: context.timestamp
      };

      displayData.set(vehicle.id, display);
    }

    return displayData;
  }

  private getDestination(vehicle: CoreVehicle, direction?: VehicleDirection): string {
    // In a real implementation, this would come from route/trip data
    return `Route ${vehicle.routeId}`;
  }

  private formatArrivalTime(schedule?: VehicleSchedule, context?: TransformationContext): string {
    if (!schedule) return 'Unknown';
    
    if (schedule.minutesUntilArrival < 1) return 'Now';
    if (schedule.minutesUntilArrival < 60) return `${schedule.minutesUntilArrival} min`;
    
    const hours = Math.floor(schedule.minutesUntilArrival / 60);
    const minutes = schedule.minutesUntilArrival % 60;
    return `${hours}h ${minutes}m`;
  }

  private getStatusColor(schedule?: VehicleSchedule, direction?: VehicleDirection): string {
    if (schedule?.isRealTime) return '#4caf50'; // Green for real-time
    if (schedule?.isScheduled) return '#2196f3'; // Blue for scheduled
    return '#757575'; // Grey for unknown
  }

  private getConfidenceIndicator(schedule?: VehicleSchedule, direction?: VehicleDirection): string {
    if (schedule?.isRealTime) return 'Real-time';
    if (schedule?.isScheduled) return 'Scheduled';
    return 'Estimated';
  }

  private isDelayed(schedule?: VehicleSchedule): boolean {
    return schedule?.delayMinutes ? schedule.delayMinutes > 2 : false;
  }

  private isEarly(schedule?: VehicleSchedule): boolean {
    return schedule?.delayMinutes ? schedule.delayMinutes < -2 : false;
  }

  private formatDistance(distance?: number): string | undefined {
    if (!distance) return undefined;
    
    if (distance < 1000) return `${Math.round(distance)}m`;
    return `${(distance / 1000).toFixed(1)}km`;
  }

  private getDirectionText(direction?: VehicleDirection, context?: TransformationContext): string | undefined {
    if (!direction) return undefined;
    
    switch (context?.userContext) {
      case 'work': return 'Towards work';
      case 'home': return 'Towards home';
      default: return 'Direction unknown';
    }
  }

  private getStatusMessages(vehicle: CoreVehicle, schedule?: VehicleSchedule, direction?: VehicleDirection): string[] {
    const messages: string[] = [];
    
    if (schedule?.isRealTime) {
      messages.push('Live tracking');
    }
    
    if (direction?.isAtStation) {
      messages.push('At station');
    }
    
    return messages;
  }

  private getWarningMessages(vehicle: CoreVehicle, schedule?: VehicleSchedule, direction?: VehicleDirection): string[] {
    const messages: string[] = [];
    
    if (schedule?.confidence === ConfidenceLevel.LOW) {
      messages.push('Low confidence data');
    }
    
    if (schedule?.delayMinutes && schedule.delayMinutes > 5) {
      messages.push(`Delayed by ${schedule.delayMinutes} minutes`);
    }
    
    return messages;
  }

  private getIconName(vehicle: CoreVehicle): string {
    return 'directions_bus'; // Default bus icon
  }

  private calculateDisplayPriority(schedule?: VehicleSchedule, direction?: VehicleDirection): number {
    let priority = 0;
    
    if (schedule?.isRealTime) priority += 100;
    if (schedule?.minutesUntilArrival && schedule.minutesUntilArrival < 10) priority += 50;
    if (direction?.isAtStation) priority += 200;
    
    return priority;
  }

  private shouldHighlight(vehicle: CoreVehicle, context: TransformationContext): boolean {
    return context.favoriteRoutes.includes(vehicle.routeId);
  }

  private formatDelay(schedule?: VehicleSchedule): string | undefined {
    if (!schedule?.delayMinutes) return undefined;
    
    const delay = schedule.delayMinutes;
    if (delay > 0) return `+${delay} min`;
    if (delay < 0) return `${delay} min`;
    return undefined;
  }

  private formatConfidence(schedule?: VehicleSchedule, direction?: VehicleDirection): string {
    const confidence = schedule?.confidence || direction?.confidence || ConfidenceLevel.LOW;
    
    switch (confidence) {
      case ConfidenceLevel.HIGH: return 'High confidence';
      case ConfidenceLevel.MEDIUM: return 'Medium confidence';
      case ConfidenceLevel.LOW: return 'Low confidence';
      default: return 'Unknown confidence';
    }
  }
}

// ============================================================================
// MAIN VEHICLE TRANSFORMATION SERVICE
// ============================================================================

// ============================================================================
// PERFORMANCE-OPTIMIZED LOOKUP STRUCTURES
// ============================================================================

/**
 * Efficient lookup structures for fast data access
 */
class PerformanceLookups {
  // Vehicle lookups
  private vehiclesByRoute = new Map<string, Set<string>>();
  private vehiclesByStation = new Map<string, Set<string>>();
  private vehiclePositions = new Map<string, Coordinates>();
  
  // Route lookups
  private routeInfo = new Map<string, RouteInfo>();
  private routeVehicleCount = new Map<string, number>();
  
  // Station lookups
  private stationVehicles = new Map<string, Map<string, VehicleSchedule>>();
  private nearbyStations = new Map<string, string[]>(); // vehicleId -> nearby station IDs
  
  // Lazy computed values
  private lazyDistanceMatrix = new Map<string, LazyValue<Map<string, number>>>();
  private lazyRouteStats = new Map<string, LazyValue<any>>();

  /**
   * Update vehicle position and related lookups
   */
  updateVehiclePosition(vehicleId: string, position: Coordinates, routeId: string): void {
    this.vehiclePositions.set(vehicleId, position);
    
    // Update route associations
    if (!this.vehiclesByRoute.has(routeId)) {
      this.vehiclesByRoute.set(routeId, new Set());
    }
    this.vehiclesByRoute.get(routeId)!.add(vehicleId);
    
    // Update route vehicle count
    this.routeVehicleCount.set(routeId, this.vehiclesByRoute.get(routeId)!.size);
    
    // Invalidate lazy calculations that depend on this vehicle
    this.invalidateLazyCalculations(vehicleId);
  }

  /**
   * Get vehicles for a specific route (O(1) lookup)
   */
  getVehiclesByRoute(routeId: string): Set<string> {
    return this.vehiclesByRoute.get(routeId) || new Set();
  }

  /**
   * Get vehicles for a specific station (O(1) lookup)
   */
  getVehiclesByStation(stationId: string): Set<string> {
    return this.vehiclesByStation.get(stationId) || new Set();
  }

  /**
   * Get vehicle position (O(1) lookup)
   */
  getVehiclePosition(vehicleId: string): Coordinates | undefined {
    return this.vehiclePositions.get(vehicleId);
  }

  /**
   * Get route vehicle count (O(1) lookup)
   */
  getRouteVehicleCount(routeId: string): number {
    return this.routeVehicleCount.get(routeId) || 0;
  }

  /**
   * Get or compute distance matrix for a vehicle (lazy evaluation)
   */
  getDistanceMatrix(vehicleId: string, stations: TransformationStation[]): Map<string, number> {
    const key = `${vehicleId}-${stations.length}`;
    
    if (!this.lazyDistanceMatrix.has(key)) {
      this.lazyDistanceMatrix.set(key, new LazyValue(() => {
        const vehiclePos = this.getVehiclePosition(vehicleId);
        if (!vehiclePos) return new Map();
        
        const distances = new Map<string, number>();
        for (const station of stations) {
          const distance = this.calculateDistance(vehiclePos, station.coordinates);
          distances.set(station.id, distance);
        }
        return distances;
      }));
    }
    
    return this.lazyDistanceMatrix.get(key)!.value;
  }

  /**
   * Associate vehicle with station
   */
  associateVehicleWithStation(vehicleId: string, stationId: string, schedule: VehicleSchedule): void {
    if (!this.vehiclesByStation.has(stationId)) {
      this.vehiclesByStation.set(stationId, new Set());
    }
    this.vehiclesByStation.get(stationId)!.add(vehicleId);
    
    if (!this.stationVehicles.has(stationId)) {
      this.stationVehicles.set(stationId, new Map());
    }
    this.stationVehicles.get(stationId)!.set(vehicleId, schedule);
  }

  /**
   * Get route statistics (lazy evaluation)
   */
  getRouteStats(routeId: string): any {
    if (!this.lazyRouteStats.has(routeId)) {
      this.lazyRouteStats.set(routeId, new LazyValue(() => {
        const vehicles = this.getVehiclesByRoute(routeId);
        const positions = Array.from(vehicles)
          .map(id => this.getVehiclePosition(id))
          .filter(pos => pos !== undefined);
        
        if (positions.length === 0) {
          return { vehicleCount: 0, averageSpeed: 0, coverage: 0 };
        }
        
        // Calculate route statistics
        const bounds = this.calculateBounds(positions);
        const coverage = this.calculateCoverage(bounds);
        
        return {
          vehicleCount: vehicles.size,
          coverage,
          bounds,
          lastUpdated: new Date()
        };
      }));
    }
    
    return this.lazyRouteStats.get(routeId)!.value;
  }

  /**
   * Clear all lookups
   */
  clear(): void {
    this.vehiclesByRoute.clear();
    this.vehiclesByStation.clear();
    this.vehiclePositions.clear();
    this.routeInfo.clear();
    this.routeVehicleCount.clear();
    this.stationVehicles.clear();
    this.nearbyStations.clear();
    this.lazyDistanceMatrix.clear();
    this.lazyRouteStats.clear();
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return {
      vehiclesByRoute: this.vehiclesByRoute.size,
      vehiclesByStation: this.vehiclesByStation.size,
      vehiclePositions: this.vehiclePositions.size,
      routeInfo: this.routeInfo.size,
      lazyDistanceMatrices: this.lazyDistanceMatrix.size,
      lazyRouteStats: this.lazyRouteStats.size,
      computedDistanceMatrices: Array.from(this.lazyDistanceMatrix.values())
        .filter(lazy => lazy.isComputed).length,
      computedRouteStats: Array.from(this.lazyRouteStats.values())
        .filter(lazy => lazy.isComputed).length
    };
  }

  // Private helper methods
  private calculateDistance(pos1: Coordinates, pos2: Coordinates): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = pos1.latitude * Math.PI / 180;
    const φ2 = pos2.latitude * Math.PI / 180;
    const Δφ = (pos2.latitude - pos1.latitude) * Math.PI / 180;
    const Δλ = (pos2.longitude - pos1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private calculateBounds(positions: Coordinates[]) {
    if (positions.length === 0) return null;
    
    let minLat = positions[0].latitude;
    let maxLat = positions[0].latitude;
    let minLng = positions[0].longitude;
    let maxLng = positions[0].longitude;
    
    for (const pos of positions) {
      minLat = Math.min(minLat, pos.latitude);
      maxLat = Math.max(maxLat, pos.latitude);
      minLng = Math.min(minLng, pos.longitude);
      maxLng = Math.max(maxLng, pos.longitude);
    }
    
    return { minLat, maxLat, minLng, maxLng };
  }

  private calculateCoverage(bounds: any): number {
    if (!bounds) return 0;
    
    const latDiff = bounds.maxLat - bounds.minLat;
    const lngDiff = bounds.maxLng - bounds.minLng;
    
    // Simple coverage calculation (area in square degrees)
    return latDiff * lngDiff;
  }

  private invalidateLazyCalculations(vehicleId: string): void {
    // Remove lazy calculations that depend on this vehicle
    for (const [key, _] of this.lazyDistanceMatrix.entries()) {
      if (key.startsWith(vehicleId)) {
        this.lazyDistanceMatrix.delete(key);
      }
    }
  }
  
  /**
   * Invalidate all data for a specific vehicle
   * 
   * Requirements 5.3: Add selective cache invalidation for vehicle data updates
   */
  invalidateVehicle(vehicleId: string): void {
    // Find which route this vehicle belongs to
    let vehicleRouteId: string | null = null;
    for (const [routeId, vehicles] of this.vehiclesByRoute.entries()) {
      if (vehicles.has(vehicleId)) {
        vehicleRouteId = routeId;
        vehicles.delete(vehicleId);
        if (vehicles.size === 0) {
          this.vehiclesByRoute.delete(routeId);
        }
        break;
      }
    }
    
    // Remove from position tracking
    this.vehiclePositions.delete(vehicleId);
    
    // Remove from station associations
    for (const [stationId, vehicles] of this.vehiclesByStation.entries()) {
      vehicles.delete(vehicleId);
      if (vehicles.size === 0) {
        this.vehiclesByStation.delete(stationId);
      }
    }
    
    // Remove from station vehicle schedules
    for (const [stationId, vehicleSchedules] of this.stationVehicles.entries()) {
      vehicleSchedules.delete(vehicleId);
      if (vehicleSchedules.size === 0) {
        this.stationVehicles.delete(stationId);
      }
    }
    
    // Remove from nearby stations
    this.nearbyStations.delete(vehicleId);
    
    // Invalidate lazy calculations
    this.invalidateLazyCalculations(vehicleId);
    
    logger.debug('Vehicle invalidated from performance lookups', { 
      vehicleId, 
      routeId: vehicleRouteId 
    });
  }
}

/**
 * Main vehicle transformation service class with performance optimizations
 * 
 * This service implements the transformation pipeline for converting raw API data
 * into UI-ready formats. It serves as the single entry point for all vehicle
 * data transformations with enhanced caching and performance optimizations.
 */
export class VehicleTransformationService {
  private pipeline: TransformationPipeline;
  private cache: TransformationCache;
  private validator: DataValidator;
  private lookups: PerformanceLookups;
  
  // Performance tracking
  private transformationCount = 0;
  private totalTransformationTime = 0;

  constructor() {
    this.pipeline = new TransformationPipeline();
    this.cache = new TransformationCache();
    this.validator = new DataValidator();
    this.lookups = new PerformanceLookups();
    
    this.setupPipeline();
    
    // Start periodic cache cleanup
    this.startCacheCleanup();
    
    logger.info('VehicleTransformationService initialized with comprehensive error handling', {}, 'TRANSFORMATION');
  }

  /**
   * Main transformation method with performance optimizations
   * 
   * Transforms raw API data through the complete pipeline to produce
   * UI-ready vehicle data with all necessary information. Uses caching,
   * efficient data structures, and lazy evaluation for optimal performance.
   */
  async transform(
    rawData: TranzyVehicleResponse[],
    context: TransformationContext
  ): Promise<TransformedVehicleData> {
    const startTime = Date.now();
    this.transformationCount++;
    
    try {
      // Comprehensive input validation with detailed error reporting
      const apiValidation = this.validator.validateApiResponse(rawData);
      
      // Handle validation results more gracefully
      if (!apiValidation.isValid) {
        // Check if we have recoverable data
        const filteredData = this.validator.filterValidVehicles(rawData);
        
        if (filteredData.length > 0) {
          const recoveryRate = filteredData.length / rawData.length;
          
          if (recoveryRate >= 0.5) {
            // Good recovery rate - log as info and continue
            logger.info('API validation recovered data by filtering invalid vehicles', {
              originalCount: rawData.length,
              recoveredCount: filteredData.length,
              recoveryRate: Math.round(recoveryRate * 100) + '%',
              errors: apiValidation.errors.length,
              warnings: apiValidation.warnings.length
            }, 'TRANSFORMATION');
            
            // Only report systemic errors, not individual vehicle issues
            for (const error of apiValidation.errors) {
              if (error.code === 'SYSTEMIC_DATA_ISSUE') {
                logger.error('Systemic data issue detected', {
                  error: error.message,
                  code: error.code,
                  field: error.field
                });
              }
            }
          } else {
            // Poor recovery rate - log as warning and report errors
            logger.warn('API validation recovered some data but with significant data loss', {
              originalCount: rawData.length,
              recoveredCount: filteredData.length,
              recoveryRate: Math.round(recoveryRate * 100) + '%',
              errors: apiValidation.errors.length,
              warnings: apiValidation.warnings.length
            }, 'TRANSFORMATION');
            
            // Report all validation errors for poor recovery
            for (const error of apiValidation.errors) {
              logger.error('API validation error', {
                error: error.message,
                code: error.code,
                field: error.field
              });
            }
          }
          
          // Use filtered data for transformation
          rawData = filteredData;
        } else {
          throw new TransformationError(
            'API validation failed and no recoverable data found',
            'input-validation',
            { 
              recoverable: false, 
              context: { 
                dataLength: rawData?.length,
                errors: apiValidation.errors,
                recoverySuggestions: apiValidation.recoverySuggestions
              } 
            }
          );
        }
      } else if (apiValidation.warnings.length > 0) {
        // Log warnings for valid data with minor issues
        logger.debug('API validation passed with warnings', {
          dataCount: rawData.length,
          warnings: apiValidation.warnings.length
        }, 'TRANSFORMATION');
      }

      const contextValidation = this.validator.validateTransformationContext(context);
      if (!contextValidation.isValid) {
        // Apply fallback values for context validation
        if (contextValidation.fallbackValues && Object.keys(contextValidation.fallbackValues).length > 0) {
          logger.warn('Context validation failed but recovered with fallback values', {
            errors: contextValidation.errors.length,
            fallbackValues: Object.keys(contextValidation.fallbackValues)
          }, 'TRANSFORMATION');
          
          // Apply fallback values to context
          Object.assign(context, contextValidation.fallbackValues);
          
          // Report validation errors
          for (const error of contextValidation.errors) {
            logger.error('Context validation error', {
              error: error.message,
              code: error.code,
              field: error.field
            });
          }
        } else {
          // Create detailed error message
          const errorDetails = contextValidation.errors.map(e => `${e.field}: ${e.message}`).join(', ');
          const errorMessage = `Invalid transformation context: ${errorDetails}`;
          
          logger.error('Context validation failed without recovery', {
            errorCount: contextValidation.errors.length,
            errors: contextValidation.errors,
            recoverySuggestions: contextValidation.recoverySuggestions,
            contextSnapshot: {
              hasApiConfig: !!context.apiConfig,
              apiKeyPresent: !!(context.apiConfig?.apiKey),
              apiKeyLength: context.apiConfig?.apiKey?.length || 0,
              agencyId: context.apiConfig?.agencyId,
              hasPreferences: !!context.preferences,
              targetStationsCount: context.targetStations?.length || 0,
              favoriteRoutesCount: context.favoriteRoutes?.length || 0
            }
          }, 'TRANSFORMATION');
          
          throw new TransformationError(
            errorMessage,
            'context-validation',
            { 
              recoverable: false,
              context: {
                errors: contextValidation.errors,
                recoverySuggestions: contextValidation.recoverySuggestions,
                validationDetails: errorDetails
              }
            }
          );
        }
      }

      // Check cache first (performance optimization)
      const cacheKey = this.generateCacheKey(rawData, context);
      const cached = this.cache.get<TransformedVehicleData>(cacheKey);
      if (cached) {
        logger.debug('Returning cached transformation result', { 
          cacheKey, 
          cacheStats: this.cache.getStats() 
        }, 'TRANSFORMATION');
        return cached;
      }

      // Execute transformation pipeline with retry logic and error handling
      const vehicles = await transformationRetryManager.executeTransformationStep(
        'normalize-api-data',
        (data) => this.normalizeApiDataOptimized(data, context),
        rawData,
        { contextId: context.timestamp.getTime() }
      );
      
      // Update performance lookups for fast access
      this.updatePerformanceLookups(vehicles);
      
      // Use efficient parallel processing with graceful degradation
      const [schedules, directions] = await Promise.all([
        transformationRetryManager.executeWithGracefulDegradation(
          () => this.enrichWithScheduleOptimized(vehicles, context),
          () => this.enrichWithScheduleFallback(vehicles, context),
          'enrich-with-schedule',
          { vehicleCount: vehicles.length }
        ),
        transformationRetryManager.executeWithGracefulDegradation(
          () => this.analyzeDirectionsOptimized(vehicles, context),
          () => this.analyzeDirectionsFallback(vehicles, context),
          'analyze-directions',
          { vehicleCount: vehicles.length }
        )
      ]);
      
      const displayData = await transformationRetryManager.executeTransformationStep(
        'generate-display-data',
        (input) => this.generateDisplayDataOptimized(input.vehicles, input.schedules, input.directions, input.context),
        { vehicles, schedules, directions, context },
        { vehicleCount: vehicles.length }
      );

      // Build final result with minimal copying
      const result = this.buildTransformedResultOptimized(
        vehicles,
        schedules,
        directions,
        displayData,
        context,
        startTime
      );

      // Cache the result with appropriate TTL based on data freshness
      const cacheTTL = this.calculateOptimalCacheTTL(vehicles, context);
      this.cache.set(cacheKey, result, cacheTTL);

      // Update performance metrics
      const duration = Date.now() - startTime;
      this.totalTransformationTime += duration;

      logger.info('Vehicle transformation completed with optimizations', {
        vehiclesProcessed: vehicles.length,
        duration,
        averageDuration: this.totalTransformationTime / this.transformationCount,
        cacheHitRate: this.cache.getStats().hitRate,
        lookupStats: this.lookups.getPerformanceStats()
      }, 'TRANSFORMATION');

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.totalTransformationTime += duration;
      
      // Pass the error directly as the second parameter
      const errorToLog = error instanceof Error ? error : new Error(String(error));
      logger.error('Vehicle transformation failed', errorToLog, 'TRANSFORMATION');
      logger.info('Transformation details', {
        duration,
        transformationCount: this.transformationCount
      }, 'TRANSFORMATION');

      // Report error through logger
      if (error instanceof TransformationError) {
        logger.error('Transformation error details', {
          step: error.step,
          recoverable: error.recoverable,
          vehicleId: error.vehicleId
        });
        throw error;
      } else if (error instanceof Error) {
        logger.error('Vehicle transformation error details', {
          operation: 'vehicle-transformation',
          duration,
          transformationCount: this.transformationCount,
          vehicleCount: rawData?.length || 0
        });
      }

      const transformationError = new TransformationError(
        'Unexpected error during transformation',
        'unknown-error',
        {
          recoverable: false,
          cause: error instanceof Error ? error : undefined,
          context: {
            duration,
            transformationCount: this.transformationCount,
            vehicleCount: rawData?.length || 0
          }
        }
      );

      logger.error('Unexpected transformation error', {
        step: transformationError.step,
        recoverable: transformationError.recoverable,
        duration,
        transformationCount: this.transformationCount,
        vehicleCount: rawData?.length || 0
      });
      throw transformationError;
    }
  }

  /**
   * Normalize API data to CoreVehicle format (optimized version)
   */
  async normalizeApiDataOptimized(
    rawData: TranzyVehicleResponse[],
    context: TransformationContext
  ): Promise<CoreVehicle[]> {
    // Use pre-allocated array to minimize memory allocations
    const vehicles: CoreVehicle[] = new Array(rawData.length);
    let validCount = 0;

    // Process in batches to avoid blocking the event loop
    const batchSize = 100;
    for (let i = 0; i < rawData.length; i += batchSize) {
      const batch = rawData.slice(i, i + batchSize);
      
      for (const vehicle of batch) {
        // Skip invalid vehicles early - only require position data
        if (!vehicle.latitude || !vehicle.longitude) {
          continue;
        }

        // Create vehicle object with minimal copying
        vehicles[validCount++] = {
          id: vehicle.id,
          routeId: vehicle.route_id ? vehicle.route_id.toString() : null,
          tripId: vehicle.trip_id,
          label: vehicle.label,
          position: {
            latitude: vehicle.latitude,
            longitude: vehicle.longitude,
            accuracy: undefined
          },
          timestamp: vehicle.timestamp ? new Date(vehicle.timestamp) : new Date(),
          speed: vehicle.speed,
          bearing: vehicle.bearing,
          isWheelchairAccessible: vehicle.wheelchair_accessible === 'WHEELCHAIR_ACCESSIBLE',
          isBikeAccessible: vehicle.bike_accessible === 'BIKE_ACCESSIBLE'
        };
      }

      // Yield control periodically for large datasets
      if (i % (batchSize * 10) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    // Trim array to actual size
    vehicles.length = validCount;
    return vehicles;
  }

  /**
   * Enrich vehicles with schedule information (optimized version)
   */
  async enrichWithScheduleOptimized(
    vehicles: CoreVehicle[],
    context: TransformationContext
  ): Promise<Map<string, VehicleSchedule>> {
    const schedules = new Map<string, VehicleSchedule>();
    const now = context.timestamp;

    // Get current route filtering configuration
    const filteringConfig = routeFilteringConfigurationManager.getRouteFilteringConfig();
    
    // Analyze route activity for intelligent filtering
    const routeActivity = routeActivityAnalyzer.analyzeRouteActivity(vehicles);
    
    // Create filtering context
    const filteringContext: FilteringContext = {
      targetStations: context.targetStations,
      busyRouteThreshold: filteringConfig.busyRouteThreshold,
      distanceFilterThreshold: filteringConfig.distanceFilterThreshold,
      debugMode: filteringConfig.enableDebugLogging,
      transformationContext: context
    };
    
    // Apply intelligent filtering
    const filteringResult = intelligentVehicleFilter.filterVehicles(
      vehicles,
      routeActivity,
      filteringContext
    );
    
    const filteredVehicles = filteringResult.filteredVehicles;
    
    // Log filtering results if debug mode is enabled
    if (filteringConfig.enableDebugLogging) {
      logger.debug('Intelligent filtering applied in enrichWithScheduleOptimized', {
        originalVehicles: vehicles.length,
        filteredVehicles: filteredVehicles.length,
        busyRoutes: filteringResult.userFeedback.busyRoutes,
        quietRoutes: filteringResult.userFeedback.quietRoutes,
        distanceFilteredVehicles: filteringResult.userFeedback.distanceFilteredVehicles
      });
    }

    // Pre-compute station distances for filtered vehicles (lazy evaluation)
    const stationDistances = new Map<string, Map<string, number>>();
    
    for (const vehicle of filteredVehicles) {
      // Use efficient lookup for distance calculations
      const distances = this.lookups.getDistanceMatrix(vehicle.id, context.targetStations);
      stationDistances.set(vehicle.id, distances);

      // Find closest station efficiently
      let closestStation: TransformationStation | null = null;
      let minDistance = Infinity;

      for (const station of context.targetStations) {
        const distance = distances.get(station.id) || Infinity;
        if (distance < minDistance) {
          minDistance = distance;
          closestStation = station;
        }
      }

      if (!closestStation) continue;

      // Calculate schedule with minimal object creation
      const estimatedArrival = this.calculateEstimatedArrivalFast(vehicle, minDistance, now);
      const minutesUntilArrival = Math.max(0, Math.round((estimatedArrival.getTime() - now.getTime()) / 60000));

      const schedule: VehicleSchedule = {
        vehicleId: vehicle.id,
        tripId: vehicle.tripId || `generated-${vehicle.id}`,
        routeId: vehicle.routeId,
        stationId: closestStation.id,
        scheduledArrival: estimatedArrival,
        estimatedArrival,
        minutesUntilArrival,
        isRealTime: true,
        isScheduled: false,
        confidence: this.calculateConfidenceFast(vehicle, now),
        stopSequence: 1,
        isFinalStop: false,
        lastUpdated: now
      };

      schedules.set(vehicle.id, schedule);
      
      // Update performance lookups
      this.lookups.associateVehicleWithStation(vehicle.id, closestStation.id, schedule);
    }

    return schedules;
  }

  /**
   * Analyze vehicle directions and movement (optimized version)
   */
  async analyzeDirectionsOptimized(
    vehicles: CoreVehicle[],
    context: TransformationContext
  ): Promise<Map<string, VehicleDirection>> {
    const directions = new Map<string, VehicleDirection>();

    // Get current route filtering configuration
    const filteringConfig = routeFilteringConfigurationManager.getRouteFilteringConfig();
    
    // Analyze route activity for intelligent filtering
    const routeActivity = routeActivityAnalyzer.analyzeRouteActivity(vehicles);
    
    // Create filtering context
    const filteringContext: FilteringContext = {
      targetStations: context.targetStations,
      busyRouteThreshold: filteringConfig.busyRouteThreshold,
      distanceFilterThreshold: filteringConfig.distanceFilterThreshold,
      debugMode: filteringConfig.enableDebugLogging,
      transformationContext: context
    };
    
    // Apply intelligent filtering
    const filteringResult = intelligentVehicleFilter.filterVehicles(
      vehicles,
      routeActivity,
      filteringContext
    );
    
    const filteredVehicles = filteringResult.filteredVehicles;
    
    // Log filtering results if debug mode is enabled
    if (filteringConfig.enableDebugLogging) {
      logger.debug('Intelligent filtering applied in analyzeDirectionsOptimized', {
        originalVehicles: vehicles.length,
        filteredVehicles: filteredVehicles.length,
        busyRoutes: filteringResult.userFeedback.busyRoutes,
        quietRoutes: filteringResult.userFeedback.quietRoutes,
        distanceFilteredVehicles: filteringResult.userFeedback.distanceFilteredVehicles
      });
    }

    // Batch process filtered vehicles for efficiency
    for (const vehicle of filteredVehicles) {
      // Use cached distance calculations from lookups
      const distances = this.lookups.getDistanceMatrix(vehicle.id, context.targetStations);
      
      let closestStation: TransformationStation | null = null;
      let minDistance = Infinity;

      for (const station of context.targetStations) {
        const distance = distances.get(station.id) || Infinity;
        if (distance < minDistance) {
          minDistance = distance;
          closestStation = station;
        }
      }

      if (!closestStation) continue;

      // Create direction object efficiently
      const direction: VehicleDirection = {
        vehicleId: vehicle.id,
        stationId: closestStation.id,
        routeId: vehicle.routeId,
        tripId: vehicle.tripId || `generated-${vehicle.id}`,
        direction: this.determineDirectionStatusFast(minDistance, vehicle.speed),
        estimatedMinutes: this.calculateEstimatedMinutesFast(minDistance, vehicle.speed),
        confidence: this.calculateDirectionConfidenceFast(vehicle),
        distanceToStation: minDistance,
        bearing: vehicle.bearing,
        speed: vehicle.speed,
        isAtStation: minDistance < 50,
        analyzedAt: context.timestamp
      };

      directions.set(vehicle.id, direction);
    }

    return directions;
  }

  /**
   * Generate UI display data (optimized version)
   */
  async generateDisplayDataOptimized(
    vehicles: CoreVehicle[],
    schedules: Map<string, VehicleSchedule>,
    directions: Map<string, VehicleDirection>,
    context: TransformationContext
  ): Promise<Map<string, VehicleDisplayData>> {
    const displayData = new Map<string, VehicleDisplayData>();

    // Pre-compute common values
    const favoriteRoutesSet = new Set(context.favoriteRoutes);

    for (const vehicle of vehicles) {
      const schedule = schedules.get(vehicle.id);
      const direction = directions.get(vehicle.id);

      // Create display data with minimal string operations
      const display: VehicleDisplayData = {
        vehicleId: vehicle.id,
        displayName: `${vehicle.routeId} - ${vehicle.label}`,
        routeName: vehicle.routeId,
        routeShortName: vehicle.routeId,
        vehicleLabel: vehicle.label,
        destination: `Route ${vehicle.routeId}`, // Simplified for performance
        arrivalText: this.formatArrivalTimeFast(schedule),
        statusColor: schedule?.isRealTime ? '#4caf50' : schedule?.isScheduled ? '#2196f3' : '#757575',
        backgroundColor: '#ffffff',
        textColor: '#000000',
        confidenceIndicator: schedule?.isRealTime ? 'Real-time' : schedule?.isScheduled ? 'Scheduled' : 'Estimated',
        isRealTime: schedule?.isRealTime || false,
        isScheduled: schedule?.isScheduled || false,
        isDelayed: (schedule?.delayMinutes || 0) > 2,
        isEarly: (schedule?.delayMinutes || 0) < -2,
        isWheelchairAccessible: vehicle.isWheelchairAccessible,
        isBikeAccessible: vehicle.isBikeAccessible,
        distanceText: direction?.distanceToStation ? this.formatDistanceFast(direction.distanceToStation) : undefined,
        directionText: this.getDirectionTextFast(context.userContext),
        statusMessages: schedule?.isRealTime ? ['Live tracking'] : [],
        warningMessages: schedule?.confidence === ConfidenceLevel.LOW ? ['Low confidence data'] : [],
        errorMessages: [],
        iconName: 'directions_bus',
        displayPriority: this.calculateDisplayPriorityFast(schedule, direction),
        isHighlighted: favoriteRoutesSet.has(vehicle.routeId),
        isFavorite: favoriteRoutesSet.has(vehicle.routeId),
        delayText: schedule?.delayMinutes ? this.formatDelayFast(schedule.delayMinutes) : undefined,
        confidenceText: this.formatConfidenceFast(schedule?.confidence || ConfidenceLevel.LOW),
        accessibilityIndicators: {
          wheelchair: vehicle.isWheelchairAccessible,
          bike: vehicle.isBikeAccessible,
          audio: false
        },
        routeColor: {
          primary: '#2196f3',
          secondary: '#e3f2fd',
          text: '#ffffff'
        },
        animationState: 'stable',
        lastUpdated: context.timestamp
      };

      displayData.set(vehicle.id, display);
    }

    return displayData;
  }

  /**
   * Fallback method for schedule enrichment with minimal data
   */
  async enrichWithScheduleFallback(
    vehicles: CoreVehicle[],
    context: TransformationContext
  ): Promise<Map<string, VehicleSchedule>> {
    const schedules = new Map<string, VehicleSchedule>();
    const now = context.timestamp;

    logger.warn('Using fallback schedule enrichment - limited functionality', {
      vehicleCount: vehicles.length
    }, 'TRANSFORMATION');

    for (const vehicle of vehicles) {
      // Create minimal schedule with estimated data
      const schedule: VehicleSchedule = {
        vehicleId: vehicle.id,
        tripId: vehicle.tripId || `fallback-${vehicle.id}`,
        routeId: vehicle.routeId,
        stationId: 'unknown',
        scheduledArrival: new Date(now.getTime() + 5 * 60 * 1000), // 5 minutes from now
        estimatedArrival: new Date(now.getTime() + 5 * 60 * 1000),
        minutesUntilArrival: 5,
        isRealTime: false,
        isScheduled: false,
        confidence: ConfidenceLevel.LOW,
        stopSequence: 1,
        isFinalStop: false,
        lastUpdated: now
      };

      schedules.set(vehicle.id, schedule);
    }

    return schedules;
  }

  /**
   * Fallback method for direction analysis with minimal data
   */
  async analyzeDirectionsFallback(
    vehicles: CoreVehicle[],
    context: TransformationContext
  ): Promise<Map<string, VehicleDirection>> {
    const directions = new Map<string, VehicleDirection>();

    logger.warn('Using fallback direction analysis - limited functionality', {
      vehicleCount: vehicles.length
    }, 'TRANSFORMATION');

    for (const vehicle of vehicles) {
      // Create minimal direction with unknown status
      const direction: VehicleDirection = {
        vehicleId: vehicle.id,
        stationId: 'unknown',
        routeId: vehicle.routeId,
        tripId: vehicle.tripId || `fallback-${vehicle.id}`,
        direction: DirectionStatus.UNKNOWN,
        estimatedMinutes: 5,
        confidence: ConfidenceLevel.LOW,
        distanceToStation: 0,
        bearing: vehicle.bearing,
        speed: vehicle.speed,
        isAtStation: false,
        analyzedAt: context.timestamp
      };

      directions.set(vehicle.id, direction);
    }

    return directions;
  }

  /**
   * Legacy methods for backward compatibility
   */
  async normalizeApiData(rawData: TranzyVehicleResponse[], context: TransformationContext): Promise<CoreVehicle[]> {
    return this.normalizeApiDataOptimized(rawData, context);
  }

  async enrichWithSchedule(vehicles: CoreVehicle[], context: TransformationContext): Promise<Map<string, VehicleSchedule>> {
    return this.enrichWithScheduleOptimized(vehicles, context);
  }

  async analyzeDirections(vehicles: CoreVehicle[], context: TransformationContext): Promise<Map<string, VehicleDirection>> {
    return this.analyzeDirectionsOptimized(vehicles, context);
  }

  async generateDisplayData(
    vehicles: CoreVehicle[],
    schedules: Map<string, VehicleSchedule>,
    directions: Map<string, VehicleDirection>,
    context: TransformationContext
  ): Promise<Map<string, VehicleDisplayData>> {
    return this.generateDisplayDataOptimized(vehicles, schedules, directions, context);
  }

  /**
   * Clear transformation cache and performance lookups
   */
  clearCache(): void {
    this.cache.clear();
    this.lookups.clear();
    logger.info('Transformation cache and lookups cleared', {}, 'TRANSFORMATION');
  }

  /**
   * Get comprehensive performance statistics
   */
  getPerformanceStats() {
    return {
      cache: this.cache.getStats(),
      lookups: this.lookups.getPerformanceStats(),
      transformations: {
        totalCount: this.transformationCount,
        totalTime: this.totalTransformationTime,
        averageTime: this.transformationCount > 0 ? this.totalTransformationTime / this.transformationCount : 0
      }
    };
  }

  /**
   * Get cache statistics (legacy method for backward compatibility)
   */
  getCacheStats() {
    const stats = this.cache.getStats();
    // Maintain backward compatibility with old interface
    return {
      size: stats.size,
      keys: this.cache.getKeysByAccessOrder(), // Return keys array as expected by tests
      hitRate: stats.hitRate,
      missRate: stats.missRate,
      totalHits: stats.totalHits,
      totalMisses: stats.totalMisses
    };
  }

  /**
   * Force cache cleanup
   */
  cleanupCache(): number {
    return this.cache.cleanup();
  }

  /**
   * Optimize cache and lookups
   */
  optimize(): void {
    // Cleanup expired cache entries
    const removedEntries = this.cache.cleanup();
    
    // Log optimization results
    logger.info('Cache optimization completed', {
      removedEntries,
      cacheStats: this.cache.getStats(),
      lookupStats: this.lookups.getPerformanceStats()
    }, 'TRANSFORMATION');
  }

  // Private helper methods

  private setupPipeline(): void {
    // Pipeline is set up with individual steps for flexibility
    // Each method calls the appropriate step directly
  }

  /**
   * Start periodic cache cleanup
   */
  private startCacheCleanup(): void {
    // Cleanup every 5 minutes
    setInterval(() => {
      const removed = this.cache.cleanup();
      if (removed > 0) {
        logger.debug('Periodic cache cleanup', { removedEntries: removed }, 'TRANSFORMATION');
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Update performance lookups with vehicle data
   */
  private updatePerformanceLookups(vehicles: CoreVehicle[]): void {
    for (const vehicle of vehicles) {
      this.lookups.updateVehiclePosition(vehicle.id, vehicle.position, vehicle.routeId);
    }
  }

  /**
   * Calculate optimal cache TTL based on data freshness
   */
  private calculateOptimalCacheTTL(vehicles: CoreVehicle[], context: TransformationContext): number {
    if (vehicles.length === 0) return 60000; // 1 minute for empty results

    // Calculate average data age
    const now = context.timestamp.getTime();
    const avgAge = vehicles.reduce((sum, v) => sum + (now - v.timestamp.getTime()), 0) / vehicles.length;

    // Shorter TTL for fresher data (more likely to change)
    if (avgAge < 60000) return 30000; // 30 seconds for very fresh data
    if (avgAge < 300000) return 60000; // 1 minute for fresh data
    return 300000; // 5 minutes for older data
  }

  /**
   * Fast arrival time formatting
   */
  private formatArrivalTimeFast(schedule?: VehicleSchedule): string {
    if (!schedule) return 'Unknown';
    
    const minutes = schedule.minutesUntilArrival;
    if (minutes < 1) return 'Now';
    if (minutes < 60) return `${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  /**
   * Fast distance formatting
   */
  private formatDistanceFast(distance: number): string {
    if (distance < 1000) return `${Math.round(distance)}m`;
    return `${(distance / 1000).toFixed(1)}km`;
  }

  /**
   * Fast direction text generation
   */
  private getDirectionTextFast(userContext?: string): string | undefined {
    switch (userContext) {
      case 'work': return 'Towards work';
      case 'home': return 'Towards home';
      default: return undefined;
    }
  }

  /**
   * Fast display priority calculation
   */
  private calculateDisplayPriorityFast(schedule?: VehicleSchedule, direction?: VehicleDirection): number {
    let priority = 0;
    
    if (schedule?.isRealTime) priority += 100;
    if (schedule && schedule.minutesUntilArrival < 10) priority += 50;
    if (direction?.isAtStation) priority += 200;
    
    return priority;
  }

  /**
   * Fast delay formatting
   */
  private formatDelayFast(delayMinutes: number): string | undefined {
    if (delayMinutes > 0) return `+${delayMinutes} min`;
    if (delayMinutes < 0) return `${delayMinutes} min`;
    return undefined;
  }

  /**
   * Fast confidence formatting
   */
  private formatConfidenceFast(confidence: ConfidenceLevel): string {
    switch (confidence) {
      case ConfidenceLevel.HIGH: return 'High confidence';
      case ConfidenceLevel.MEDIUM: return 'Medium confidence';
      case ConfidenceLevel.LOW: return 'Low confidence';
      default: return 'Unknown confidence';
    }
  }

  /**
   * Fast estimated arrival calculation
   */
  private calculateEstimatedArrivalFast(vehicle: CoreVehicle, distance: number, now: Date): Date {
    const speed = vehicle.speed || 15; // Default 15 km/h
    const estimatedMinutes = Math.max(1, distance / (speed * 16.67)); // Convert km/h to m/s
    return new Date(now.getTime() + estimatedMinutes * 60000);
  }

  /**
   * Fast confidence calculation
   */
  private calculateConfidenceFast(vehicle: CoreVehicle, now: Date): ConfidenceLevel {
    const age = now.getTime() - vehicle.timestamp.getTime();
    
    if (age < 60000) return ConfidenceLevel.HIGH;
    if (age < 300000) return ConfidenceLevel.MEDIUM;
    return ConfidenceLevel.LOW;
  }

  /**
   * Fast direction status determination
   */
  private determineDirectionStatusFast(distance: number, speed?: number): DirectionStatus {
    if (distance < 100) return DirectionStatus.ARRIVING;
    if (speed && speed > 5) return DirectionStatus.ARRIVING;
    return DirectionStatus.UNKNOWN;
  }

  /**
   * Fast estimated minutes calculation
   */
  private calculateEstimatedMinutesFast(distance: number, speed?: number): number {
    const effectiveSpeed = speed || 15;
    return Math.max(1, distance / (effectiveSpeed * 16.67));
  }

  /**
   * Fast direction confidence calculation
   */
  private calculateDirectionConfidenceFast(vehicle: CoreVehicle): ConfidenceLevel {
    if (vehicle.bearing && vehicle.speed && vehicle.speed > 0) {
      return ConfidenceLevel.HIGH;
    }
    if (vehicle.speed && vehicle.speed > 0) {
      return ConfidenceLevel.MEDIUM;
    }
    return ConfidenceLevel.LOW;
  }

  private generateCacheKey(rawData: TranzyVehicleResponse[], context: TransformationContext): string {
    const dataHash = this.hashData(rawData);
    const contextHash = this.hashContext(context);
    return `transform:${dataHash}:${contextHash}`;
  }

  private hashData(data: TranzyVehicleResponse[]): string {
    // Simple hash based on data length and first/last vehicle IDs
    if (data.length === 0) return 'empty';
    
    const firstId = data[0]?.id || '';
    const lastId = data[data.length - 1]?.id || '';
    return `${data.length}-${firstId}-${lastId}`;
  }

  private hashContext(context: TransformationContext): string {
    // Simple hash based on key context properties
    return [
      context.favoriteRoutes.length,
      context.targetStations.length,
      context.userContext,
      Math.floor(context.timestamp.getTime() / 60000) // Round to minute
    ].join('-');
  }

  /**
   * Build transformed result with performance optimizations
   */
  private buildTransformedResultOptimized(
    vehicles: CoreVehicle[],
    schedules: Map<string, VehicleSchedule>,
    directions: Map<string, VehicleDirection>,
    displayData: Map<string, VehicleDisplayData>,
    context: TransformationContext,
    startTime: number
  ): TransformedVehicleData {
    const result = createEmptyTransformedVehicleData();

    // Use efficient Map construction
    result.vehicles = new Map(vehicles.map(v => [v.id, v]));
    result.schedules = schedules;
    result.directions = directions;
    result.displayData = displayData;

    // Use performance lookups for efficient grouping
    result.vehiclesByRoute = new Map();
    result.vehiclesByStation = new Map();

    // Build lookup maps efficiently
    const favoriteRoutesSet = new Set(context.favoriteRoutes);
    const realTimeVehicles = new Set<string>();
    const scheduledVehicles = new Set<string>();
    const favoriteVehicles = new Set<string>();

    for (const vehicle of vehicles) {
      // Group by route using existing lookups
      const routeVehicles = this.lookups.getVehiclesByRoute(vehicle.routeId);
      result.vehiclesByRoute.set(vehicle.routeId, Array.from(routeVehicles));

      // Group by station using schedule data
      const schedule = schedules.get(vehicle.id);
      if (schedule) {
        const stationVehicles = this.lookups.getVehiclesByStation(schedule.stationId);
        result.vehiclesByStation.set(schedule.stationId, Array.from(stationVehicles));

        // Categorize vehicles efficiently
        if (schedule.isRealTime) realTimeVehicles.add(vehicle.id);
        if (schedule.isScheduled) scheduledVehicles.add(vehicle.id);
      }

      // Mark favorites
      if (favoriteRoutesSet.has(vehicle.routeId)) {
        favoriteVehicles.add(vehicle.id);
      }
    }

    result.favoriteVehicles = favoriteVehicles;
    result.realTimeVehicles = realTimeVehicles;
    result.scheduledVehicles = scheduledVehicles;

    // CRITICAL FIX: Populate stationInfo map with target stations from context
    // This was missing and causing the UI to show "No Vehicles Found"
    for (const station of context.targetStations) {
      result.stationInfo.set(station.id, station);
    }

    // Efficient sorting using pre-computed values
    result.sortedByArrival = Array.from(schedules.entries())
      .sort(([, a], [, b]) => a.minutesUntilArrival - b.minutesUntilArrival)
      .map(([vehicleId]) => vehicleId);

    result.sortedByPriority = Array.from(displayData.entries())
      .sort(([, a], [, b]) => b.displayPriority - a.displayPriority)
      .map(([vehicleId]) => vehicleId);

    // Update metadata efficiently
    const duration = Date.now() - startTime;
    result.metadata.transformedAt = context.timestamp;
    result.metadata.transformationDuration = duration;
    result.metadata.vehiclesProcessed = vehicles.length;
    result.metadata.vehiclesTransformed = vehicles.length;
    result.metadata.vehiclesFailed = 0;
    result.metadata.stepsExecuted = ['normalize-api-data', 'enrich-with-schedule', 'analyze-directions', 'generate-display-data'];
    result.metadata.dataSources.realTimeVehicles = realTimeVehicles.size;
    result.metadata.dataSources.scheduledVehicles = scheduledVehicles.size;
    result.metadata.contextSnapshot = {
      favoriteRoutesCount: context.favoriteRoutes.length,
      targetStationsCount: context.targetStations.length,
      timestamp: context.timestamp
    };

    return result;
  }

  /**
   * Legacy method for backward compatibility
   */
  private buildTransformedResult(
    vehicles: CoreVehicle[],
    schedules: Map<string, VehicleSchedule>,
    directions: Map<string, VehicleDirection>,
    displayData: Map<string, VehicleDisplayData>,
    context: TransformationContext,
    startTime: number
  ): TransformedVehicleData {
    return this.buildTransformedResultOptimized(vehicles, schedules, directions, displayData, context, startTime);
  }

  /**
   * Apply real-time configuration updates to current vehicle data
   * 
   * @param configChange - Partial configuration changes to apply
   * @param currentVehicles - Current vehicle data to reprocess
   * @returns Promise resolving to update result
   * 
   * Requirements 2.5, 3.3, 5.1: Real-time configuration updates with immediate effect
   */
  async applyRealTimeConfigurationUpdate(
    configChange: Partial<import('../../types/routeFiltering').RouteFilteringConfig>,
    currentVehicles: CoreVehicle[]
  ): Promise<import('../business-logic/RealTimeConfigurationManager').RealTimeUpdateResult> {
    logger.info('Applying real-time configuration update to VehicleTransformationService', {
      configChange,
      vehicleCount: currentVehicles.length
    });

    try {
      // Delegate to the real-time configuration manager
      const result = await realTimeConfigurationManager.applyConfigurationUpdate(
        configChange,
        currentVehicles
      );

      // Log the result for monitoring
      if (result.success) {
        logger.info('Real-time configuration update applied successfully', {
          routeTransitions: result.routeTransitions.length,
          performanceMetrics: result.performanceMetrics,
          routesRecalculated: result.performanceMetrics.routesRecalculated,
          vehiclesReprocessed: result.performanceMetrics.vehiclesReprocessed
        });
      } else {
        logger.error('Real-time configuration update failed', {
          error: result.error?.message,
          performanceMetrics: result.performanceMetrics
        });
      }

      return result;

    } catch (error) {
      logger.error('Unexpected error during real-time configuration update', {
        error,
        configChange,
        vehicleCount: currentVehicles.length
      });

      // Return failure result
      return {
        success: false,
        routeTransitions: [],
        performanceMetrics: realTimeConfigurationManager.getPerformanceMetrics(),
        updatedRouteActivity: new Map(),
        error: error as Error
      };
    }
  }

  /**
   * Get current route filtering configuration
   * 
   * @returns Current route filtering configuration
   */
  getRouteFilteringConfig(): import('../../types/routeFiltering').RouteFilteringConfig {
    return routeFilteringConfigurationManager.getRouteFilteringConfig();
  }

  /**
   * Subscribe to route transition events
   * 
   * @param callback - Callback function to call on transitions
   * @returns Unsubscribe function
   */
  onRouteTransition(
    callback: (transition: import('../business-logic/RealTimeConfigurationManager').RouteTransitionEvent) => void
  ): () => void {
    return realTimeConfigurationManager.onRouteTransition(callback);
  }

  /**
   * Get real-time configuration performance metrics
   * 
   * @returns Current performance metrics
   */
  getRealTimePerformanceMetrics(): import('../business-logic/RealTimeConfigurationManager').RealTimePerformanceMetrics {
    return realTimeConfigurationManager.getPerformanceMetrics();
  }

  /**
   * Get circuit breaker state for real-time updates
   * 
   * @returns Current circuit breaker state
   */
  getCircuitBreakerState(): import('../business-logic/RealTimeConfigurationManager').CircuitBreakerState {
    return realTimeConfigurationManager.getCircuitBreakerState();
  }
  
  // ============================================================================
  // CACHE MANAGEMENT AND PERFORMANCE OPTIMIZATION
  // ============================================================================
  
  /**
   * Get comprehensive cache statistics for performance monitoring
   * 
   * Requirements 5.2: Implement route activity classification caching
   */
  getCacheStatistics() {
    const transformationStats = this.cache.getStats();
    const routeActivityStats = routeActivityAnalyzer.getPerformanceMetrics();
    const intelligentFilterStats = intelligentVehicleFilter.getCacheStats();
    const lookupStats = this.lookups.getPerformanceStats();
    
    return {
      transformation: transformationStats,
      routeActivity: routeActivityStats,
      intelligentFilter: intelligentFilterStats,
      lookups: lookupStats,
      overall: {
        transformationCount: this.transformationCount,
        averageTransformationTime: this.transformationCount > 0 
          ? this.totalTransformationTime / this.transformationCount 
          : 0
      }
    };
  }
  
  /**
   * Clear all caches for fresh start
   * 
   * Requirements 5.3: Add selective cache invalidation for vehicle data updates
   */
  clearAllCaches(): void {
    this.cache.clear();
    routeActivityAnalyzer.clearCache();
    intelligentVehicleFilter.clearCache();
    this.lookups.clear();
    
    logger.info('All caches cleared for VehicleTransformationService');
  }
  
  /**
   * Selective cache invalidation for specific vehicles
   * 
   * This method invalidates cache entries that are affected by updates
   * to specific vehicles, allowing for efficient cache management.
   * 
   * Requirements 5.3: Add selective cache invalidation for vehicle data updates
   */
  invalidateCacheForVehicles(vehicleIds: string[]): void {
    // Invalidate transformation cache entries for affected vehicles
    const cacheKeys = this.cache.getKeysByAccessOrder();
    const keysToRemove: string[] = [];
    
    for (const key of cacheKeys) {
      // Check if cache key contains any of the affected vehicle IDs
      const hasAffectedVehicle = vehicleIds.some(id => key.includes(id));
      if (hasAffectedVehicle) {
        keysToRemove.push(key);
      }
    }
    
    // Remove affected cache entries
    for (const key of keysToRemove) {
      this.cache.delete(key);
    }
    
    // Invalidate intelligent filter cache
    intelligentVehicleFilter.invalidateCacheForVehicles(vehicleIds);
    
    // Clear lookup structures for affected vehicles
    for (const vehicleId of vehicleIds) {
      this.lookups.invalidateVehicle(vehicleId);
    }
    
    logger.debug('Selective cache invalidation completed', {
      affectedVehicles: vehicleIds.length,
      removedTransformationEntries: keysToRemove.length
    });
  }
  
  /**
   * Performance optimization check
   * 
   * Ensures the service meets the 50ms performance target for 1000 vehicles
   * 
   * Requirements 5.4: Ensure 50ms performance target for 1000 vehicles
   */
  async performanceCheck(vehicleCount: number = 1000): Promise<{
    success: boolean;
    averageTime: number;
    target: number;
    recommendations: string[];
  }> {
    const TARGET_TIME_MS = 50;
    const recommendations: string[] = [];
    
    // Get current performance metrics
    const stats = this.getCacheStatistics();
    const averageTime = stats.overall.averageTransformationTime;
    
    // Check if we're meeting the target
    const success = averageTime <= TARGET_TIME_MS;
    
    if (!success) {
      // Provide optimization recommendations
      if (stats.transformation.hitRate < 0.8) {
        recommendations.push('Increase transformation cache hit rate (currently ' + 
          (stats.transformation.hitRate * 100).toFixed(1) + '%)');
      }
      
      if (stats.intelligentFilter.hitRate < 0.7) {
        recommendations.push('Improve intelligent filter cache efficiency (currently ' + 
          (stats.intelligentFilter.hitRate * 100).toFixed(1) + '%)');
      }
      
      if (stats.routeActivity.cacheHitRate < 0.9) {
        recommendations.push('Optimize route activity analysis caching (currently ' + 
          (stats.routeActivity.cacheHitRate * 100).toFixed(1) + '%)');
      }
      
      recommendations.push('Consider increasing cache TTL values');
      recommendations.push('Review distance calculation optimization');
    }
    
    logger.info('Performance check completed', {
      vehicleCount,
      averageTime,
      target: TARGET_TIME_MS,
      success,
      recommendations: recommendations.length
    });
    
    return {
      success,
      averageTime,
      target: TARGET_TIME_MS,
      recommendations
    };
  }
  
  /**
   * Optimize caches for better performance
   * 
   * Requirements 5.2, 5.3, 5.4: Performance optimization
   */
  optimizeCaches(): void {
    // Clean up expired entries
    this.cache.cleanupExpired();
    
    // Get cache statistics to identify optimization opportunities
    const stats = this.getCacheStatistics();
    
    // Log optimization results
    logger.info('Cache optimization completed', {
      transformationCacheSize: stats.transformation.size,
      transformationHitRate: stats.transformation.hitRate,
      intelligentFilterHitRate: stats.intelligentFilter.hitRate,
      routeActivityHitRate: stats.routeActivity.cacheHitRate
    });
  }
}

// Export singleton instance
export const vehicleTransformationService = new VehicleTransformationService();