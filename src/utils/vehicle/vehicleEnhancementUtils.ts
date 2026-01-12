/**
 * Vehicle Data Enhancement Utilities
 * Extends vehicle data with position predictions while preserving original API coordinates
 */

import { predictVehiclePosition } from './positionPredictionUtils';
import { SpeedPredictor, type SpeedPredictionResult } from './speedPredictionUtils';
import type { 
  TranzyVehicleResponse, 
  TranzyStopResponse, 
  TranzyStopTimeResponse,
  RouteShape 
} from '../../types/arrivalTime';
import type { Coordinates } from '../location/distanceUtils';

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
  
  // UNIFIED prediction metadata combining position and speed predictions
  predictionMetadata?: {
    // Position prediction data
    predictedDistance: number; // meters moved from position prediction
    stationsEncountered: number;
    totalDwellTime: number; // milliseconds
    positionMethod: 'route_shape' | 'fallback';
    positionApplied: boolean;
    timestampAge: number; // milliseconds
    
    // Speed prediction data
    predictedSpeed?: number; // km/h - main speed result
    speedMethod?: 'api_speed' | 'nearby_average' | 'location_based' | 'static_fallback';
    speedConfidence?: 'high' | 'medium' | 'low' | 'very_low';
    speedApplied?: boolean;
    apiSpeed?: number; // original API speed value
    nearbyVehicleCount?: number;
    nearbyAverageSpeed?: number;
    distanceToCenter?: number; // meters from station density center
    locationBasedSpeed?: number; // calculated location-based speed
    speedCalculationTimeMs?: number; // performance tracking
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
    // Add unified prediction metadata
    predictionMetadata: {
      // Position prediction data
      predictedDistance: predictionResult.metadata.predictedDistance,
      stationsEncountered: predictionResult.metadata.stationsEncountered,
      totalDwellTime: predictionResult.metadata.totalDwellTime,
      positionMethod: predictionResult.metadata.method,
      positionApplied: predictionResult.metadata.success,
      timestampAge: predictionResult.metadata.timestampAge,
      
      // Speed prediction data (will be populated by speed prediction functions)
      predictedSpeed: undefined,
      speedMethod: undefined,
      speedConfidence: undefined,
      speedApplied: false,
      apiSpeed: vehicle.speed || undefined,
      nearbyVehicleCount: undefined,
      nearbyAverageSpeed: undefined,
      distanceToCenter: undefined,
      locationBasedSpeed: undefined,
      speedCalculationTimeMs: undefined
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
 * Check if a vehicle has position prediction applied
 * Utility function for conditional logic based on prediction status
 */
export function hasPredictionApplied(vehicle: EnhancedVehicleData): boolean {
  return vehicle.predictionMetadata?.positionApplied === true;
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
 * Enhance a single vehicle with speed prediction
 * Merges speed prediction data into existing predictionMetadata
 * @param vehicle Enhanced vehicle (already has position prediction)
 * @param nearbyVehicles Array of nearby vehicles for speed averaging
 * @param stationDensityCenter Geographic center of station density
 * @returns Enhanced vehicle with speed prediction data merged
 */
export function enhanceVehicleWithSpeedPrediction(
  vehicle: EnhancedVehicleData,
  nearbyVehicles: TranzyVehicleResponse[],
  stationDensityCenter: Coordinates
): EnhancedVehicleData {
  const speedPredictor = new SpeedPredictor();
  
  // Convert enhanced vehicle back to TranzyVehicleResponse for speed prediction
  const vehicleForPrediction: TranzyVehicleResponse = {
    ...vehicle,
    // Use original API coordinates for speed prediction calculations
    latitude: vehicle.apiLatitude,
    longitude: vehicle.apiLongitude
  };
  
  // Get speed prediction result
  const speedPredictionData = speedPredictor.predictSpeed(
    vehicleForPrediction,
    nearbyVehicles,
    stationDensityCenter
  );
  
  // Merge speed prediction data into existing predictionMetadata
  return {
    ...vehicle,
    predictionMetadata: {
      ...vehicle.predictionMetadata,
      // Merge speed prediction fields
      predictedSpeed: speedPredictionData.predictedSpeed,
      speedMethod: speedPredictionData.speedMethod,
      speedConfidence: speedPredictionData.speedConfidence,
      speedApplied: speedPredictionData.speedApplied,
      apiSpeed: speedPredictionData.apiSpeed,
      nearbyVehicleCount: speedPredictionData.nearbyVehicleCount,
      nearbyAverageSpeed: speedPredictionData.nearbyAverageSpeed,
      distanceToCenter: speedPredictionData.distanceToCenter,
      locationBasedSpeed: speedPredictionData.locationBasedSpeed,
      speedCalculationTimeMs: speedPredictionData.speedCalculationTimeMs
    }
  };
}

/**
 * Enhance multiple vehicles with speed predictions
 * Applies speed prediction to each vehicle using shared station density center
 * @param vehicles Array of enhanced vehicles (already have position predictions)
 * @param stationDensityCenter Geographic center of station density
 * @returns Array of enhanced vehicles with speed prediction data merged
 */
export function enhanceVehiclesWithSpeedPredictions(
  vehicles: EnhancedVehicleData[],
  stationDensityCenter: Coordinates
): EnhancedVehicleData[] {
  // Convert enhanced vehicles to TranzyVehicleResponse array for nearby vehicle analysis
  const vehiclesForPrediction: TranzyVehicleResponse[] = vehicles.map(vehicle => ({
    ...vehicle,
    // Use original API coordinates for speed prediction calculations
    latitude: vehicle.apiLatitude,
    longitude: vehicle.apiLongitude
  }));
  
  // Apply speed prediction to each vehicle
  return vehicles.map(vehicle => 
    enhanceVehicleWithSpeedPrediction(vehicle, vehiclesForPrediction, stationDensityCenter)
  );
}

/**
 * Check if a vehicle has speed prediction applied
 * Utility function for conditional logic based on speed prediction status
 */
export function hasSpeedPredictionApplied(vehicle: EnhancedVehicleData): boolean {
  return vehicle.predictionMetadata?.speedApplied === true;
}

/**
 * Get speed prediction summary for debugging and monitoring
 * Provides aggregate statistics about speed prediction performance
 */
export function getSpeedPredictionSummary(vehicles: EnhancedVehicleData[]): {
  totalVehicles: number;
  speedPredictionsApplied: number;
  speedPredictionRate: number;
  speedMethodBreakdown: Record<string, number>;
  averageSpeedConfidence: number;
} {
  const totalVehicles = vehicles.length;
  let speedPredictionsApplied = 0;
  const speedMethodCounts: Record<string, number> = {};
  let totalSpeedConfidence = 0;
  let speedConfidenceCount = 0;
  
  for (const vehicle of vehicles) {
    if (vehicle.predictionMetadata?.speedApplied) {
      speedPredictionsApplied++;
      
      const { speedMethod, speedConfidence } = vehicle.predictionMetadata;
      
      if (speedMethod) {
        speedMethodCounts[speedMethod] = (speedMethodCounts[speedMethod] || 0) + 1;
      }
      
      if (speedConfidence) {
        const confidenceValue = speedConfidence === 'high' ? 1 : 
                               speedConfidence === 'medium' ? 0.75 : 
                               speedConfidence === 'low' ? 0.5 : 0.25;
        totalSpeedConfidence += confidenceValue;
        speedConfidenceCount++;
      }
    }
  }
  
  return {
    totalVehicles,
    speedPredictionsApplied,
    speedPredictionRate: totalVehicles > 0 ? speedPredictionsApplied / totalVehicles : 0,
    speedMethodBreakdown: speedMethodCounts,
    averageSpeedConfidence: speedConfidenceCount > 0 ? totalSpeedConfidence / speedConfidenceCount : 0
  };
}
export function getPredictionSummary(vehicles: EnhancedVehicleData[]): {
  totalVehicles: number;
  positionPredictionsApplied: number;
  positionPredictionRate: number;
  speedPredictionsApplied: number;
  speedPredictionRate: number;
  averageTimestampAge: number;
  averagePredictedDistance: number;
  positionMethodBreakdown: Record<string, number>;
  speedMethodBreakdown: Record<string, number>;
  averageSpeedConfidence: number;
} {
  const totalVehicles = vehicles.length;
  let positionPredictionsApplied = 0;
  let speedPredictionsApplied = 0;
  let totalTimestampAge = 0;
  let totalPredictedDistance = 0;
  const positionMethodCounts: Record<string, number> = {};
  const speedMethodCounts: Record<string, number> = {};
  let totalSpeedConfidence = 0;
  let speedConfidenceCount = 0;
  
  for (const vehicle of vehicles) {
    if (vehicle.predictionMetadata) {
      const { 
        positionApplied, 
        timestampAge, 
        predictedDistance, 
        positionMethod,
        speedApplied,
        speedMethod,
        speedConfidence
      } = vehicle.predictionMetadata;
      
      // Position prediction stats
      if (positionApplied) {
        positionPredictionsApplied++;
        totalPredictedDistance += predictedDistance;
      }
      
      // Speed prediction stats
      if (speedApplied) {
        speedPredictionsApplied++;
      }
      
      totalTimestampAge += timestampAge;
      
      // Method breakdowns
      if (positionMethod) {
        positionMethodCounts[positionMethod] = (positionMethodCounts[positionMethod] || 0) + 1;
      }
      
      if (speedMethod) {
        speedMethodCounts[speedMethod] = (speedMethodCounts[speedMethod] || 0) + 1;
      }
      
      // Speed confidence stats
      if (speedConfidence) {
        const confidenceValue = speedConfidence === 'high' ? 1 : 
                               speedConfidence === 'medium' ? 0.75 : 
                               speedConfidence === 'low' ? 0.5 : 0.25;
        totalSpeedConfidence += confidenceValue;
        speedConfidenceCount++;
      }
    }
  }
  
  return {
    totalVehicles,
    positionPredictionsApplied,
    positionPredictionRate: totalVehicles > 0 ? positionPredictionsApplied / totalVehicles : 0,
    speedPredictionsApplied,
    speedPredictionRate: totalVehicles > 0 ? speedPredictionsApplied / totalVehicles : 0,
    averageTimestampAge: totalVehicles > 0 ? totalTimestampAge / totalVehicles : 0,
    averagePredictedDistance: positionPredictionsApplied > 0 ? totalPredictedDistance / positionPredictionsApplied : 0,
    positionMethodBreakdown: positionMethodCounts,
    speedMethodBreakdown: speedMethodCounts,
    averageSpeedConfidence: speedConfidenceCount > 0 ? totalSpeedConfidence / speedConfidenceCount : 0
  };
}