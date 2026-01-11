/**
 * Vehicle Data Enhancement Utilities
 * Extends vehicle data with position predictions while preserving original API coordinates
 */

import { predictVehiclePosition } from './positionPredictionUtils';
import type { 
  TranzyVehicleResponse, 
  TranzyStopResponse, 
  TranzyStopTimeResponse,
  RouteShape 
} from '../../types/arrivalTime';

// ============================================================================
// Enhanced Vehicle Data Interface
// ============================================================================

export interface EnhancedVehicleData extends TranzyVehicleResponse {
  // Override coordinates with predicted values (transparent to consumers)
  latitude: number;  // Predicted latitude (or original if no prediction)
  longitude: number; // Predicted longitude (or original if no prediction)
  
  // Original API coordinates preserved for debugging
  apiLatitude: number;
  apiLongitude: number;
  
  // Prediction metadata (optional - only present when prediction was applied)
  predictionMetadata?: {
    predictedDistance: number; // meters moved
    stationsEncountered: number;
    totalDwellTime: number; // milliseconds
    predictionMethod: 'route_shape' | 'fallback';
    predictionApplied: boolean;
    timestampAge: number; // milliseconds
  };
}

// ============================================================================
// Vehicle Enhancement Functions
// ============================================================================

/**
 * Enhance a single vehicle with position prediction
 * Preserves original API coordinates and adds predicted position
 */
export function enhanceVehicleWithPrediction(
  vehicle: TranzyVehicleResponse,
  routeShape?: RouteShape,
  stopTimes?: TranzyStopTimeResponse[],
  stops?: TranzyStopResponse[]
): EnhancedVehicleData {
  // Preserve original API coordinates
  const apiLatitude = vehicle.latitude;
  const apiLongitude = vehicle.longitude;
  
  // Calculate predicted position
  const predictionResult = predictVehiclePosition(vehicle, routeShape, stopTimes, stops);
  
  // Create enhanced vehicle data
  const enhancedVehicle: EnhancedVehicleData = {
    ...vehicle,
    // Preserve original API coordinates
    apiLatitude,
    apiLongitude,
    // Use predicted coordinates for calculations
    latitude: predictionResult.predictedPosition.lat,
    longitude: predictionResult.predictedPosition.lon,
    // Add prediction metadata
    predictionMetadata: {
      predictedDistance: predictionResult.metadata.predictedDistance,
      stationsEncountered: predictionResult.metadata.stationsEncountered,
      totalDwellTime: predictionResult.metadata.totalDwellTime,
      predictionMethod: predictionResult.metadata.method,
      predictionApplied: predictionResult.metadata.success,
      timestampAge: predictionResult.metadata.timestampAge
    }
  };
  
  return enhancedVehicle;
}

/**
 * Enhance multiple vehicles with position predictions
 * Applies prediction to each vehicle individually
 */
export function enhanceVehiclesWithPredictions(
  vehicles: TranzyVehicleResponse[],
  routeShapes?: Map<string, RouteShape>,
  stopTimesByTrip?: Map<string, TranzyStopTimeResponse[]>,
  stops?: TranzyStopResponse[]
): EnhancedVehicleData[] {
  return vehicles.map(vehicle => {
    // Get route shape for this vehicle's trip
    let routeShape: RouteShape | undefined;
    if (routeShapes && vehicle.trip_id) {
      // Try to find route shape by trip_id or route_id
      routeShape = routeShapes.get(vehicle.trip_id) || 
                   (vehicle.route_id ? routeShapes.get(vehicle.route_id.toString()) : undefined);
    }
    
    // Get stop times for this vehicle's trip
    let stopTimes: TranzyStopTimeResponse[] | undefined;
    if (stopTimesByTrip && vehicle.trip_id) {
      stopTimes = stopTimesByTrip.get(vehicle.trip_id);
    }
    
    return enhanceVehicleWithPrediction(vehicle, routeShape, stopTimes, stops);
  });
}

/**
 * Check if a vehicle has prediction applied
 * Utility function for conditional logic based on prediction status
 */
export function hasPredictionApplied(vehicle: EnhancedVehicleData): boolean {
  return vehicle.predictionMetadata?.predictionApplied === true;
}

/**
 * Get original API coordinates from enhanced vehicle
 * Utility function for debug visualization and fallback scenarios
 */
export function getOriginalCoordinates(vehicle: EnhancedVehicleData): { lat: number; lon: number } {
  return {
    lat: vehicle.apiLatitude,
    lon: vehicle.apiLongitude
  };
}

/**
 * Get prediction summary for debugging and monitoring
 * Provides aggregate statistics about prediction performance
 */
export function getPredictionSummary(vehicles: EnhancedVehicleData[]): {
  totalVehicles: number;
  predictionsApplied: number;
  predictionRate: number;
  averageTimestampAge: number;
  averagePredictedDistance: number;
  methodBreakdown: Record<string, number>;
} {
  const totalVehicles = vehicles.length;
  let predictionsApplied = 0;
  let totalTimestampAge = 0;
  let totalPredictedDistance = 0;
  const methodCounts: Record<string, number> = {};
  
  for (const vehicle of vehicles) {
    if (vehicle.predictionMetadata) {
      const { predictionApplied, timestampAge, predictedDistance, predictionMethod } = vehicle.predictionMetadata;
      
      if (predictionApplied) {
        predictionsApplied++;
        totalPredictedDistance += predictedDistance;
      }
      
      totalTimestampAge += timestampAge;
      methodCounts[predictionMethod] = (methodCounts[predictionMethod] || 0) + 1;
    }
  }
  
  return {
    totalVehicles,
    predictionsApplied,
    predictionRate: totalVehicles > 0 ? predictionsApplied / totalVehicles : 0,
    averageTimestampAge: totalVehicles > 0 ? totalTimestampAge / totalVehicles : 0,
    averagePredictedDistance: predictionsApplied > 0 ? totalPredictedDistance / predictionsApplied : 0,
    methodBreakdown: methodCounts
  };
}