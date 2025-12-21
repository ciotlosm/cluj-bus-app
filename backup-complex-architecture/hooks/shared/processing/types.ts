import type { VehicleDisplayData } from '../../../types/presentationLayer';
import type { Route } from '../../../types/tranzyApi';
import type { DirectionStatus, ConfidenceLevel } from '../../../types/coreVehicle';

/**
 * Result of direction analysis for a vehicle
 */
export interface DirectionAnalysisResult {
  direction: DirectionStatus;
  estimatedMinutes: number;
  confidence: ConfidenceLevel;
  stopSequence?: Array<{
    stopId: string;
    stopName: string;
    sequence: number;
    isCurrent: boolean;
    isDestination: boolean;
  }>;
}

/**
 * Enhanced vehicle with direction analysis
 */
export interface EnhancedVehicleWithDirection extends VehicleDisplayData {
  _internalDirection?: DirectionStatus;
  stopSequence?: DirectionAnalysisResult['stopSequence'];
  /** Route ID for filtering and grouping */
  routeId: string;
  /** Minutes until arrival */
  minutesAway: number;
  /** Estimated arrival time */
  estimatedArrival: Date;
}

/**
 * Result of vehicle enhancement with route information
 */
export interface VehicleEnhancementResult {
  enhancedVehicle: EnhancedVehicleWithDirection;
  routeInfo: {
    route?: Route;
    destination: string;
  };
  directionAnalysis: DirectionAnalysisResult;
}

/**
 * Options for vehicle transformation pipeline
 */
export interface VehicleTransformationOptions {
  maxVehiclesPerStation?: number;
  showAllVehiclesPerRoute?: boolean;
  sortByPriority?: boolean;
}

/**
 * Vehicle transformation pipeline function type
 */
export type VehicleTransformationPipeline = (
  vehicles: EnhancedVehicleWithDirection[],
  options?: VehicleTransformationOptions
) => EnhancedVehicleWithDirection[];