/**
 * Vehicle Progress Estimation Utilities
 * Advanced logic for determining vehicle position along route
 */

import { projectPointToShape } from './distanceUtils.ts';
import { isProjectionBetween, calculateSegmentConfidence } from './geometryUtils.ts';
import { calculateDistance } from '../location/distanceUtils.ts';
import { getTripStopSequence } from './tripUtils.ts';
import type {
  TranzyVehicleResponse,
  TranzyStopResponse,
  TranzyStopTimeResponse,
  RouteShape,
  VehicleProgressEstimation
} from '../../types/arrivalTime.ts';

/**
 * Estimate vehicle progress using route shape projection (most accurate)
 */
export function estimateVehicleProgressWithShape(
  vehicle: TranzyVehicleResponse,
  tripStopTimes: TranzyStopTimeResponse[],
  stops: TranzyStopResponse[],
  routeShape: RouteShape
): VehicleProgressEstimation {
  const vehiclePosition = { lat: vehicle.latitude, lon: vehicle.longitude };
  
  // Project vehicle position onto route shape
  const vehicleProjection = projectPointToShape(vehiclePosition, routeShape);
  
  // Use already sorted stop times (no need to re-sort)
  const sortedStopTimes = tripStopTimes;
  
  if (sortedStopTimes.length < 2) {
    return {
      projectionPoint: vehicleProjection.closestPoint,
      segmentBetweenStops: null,
      confidence: 'low',
      method: 'route_projection'
    };
  }
  
  // Find which segment the vehicle is on by comparing projection positions
  let bestSegment: { previousStop: TranzyStopTimeResponse; nextStop: TranzyStopTimeResponse; confidence: number } | null = null;
  
  for (let i = 0; i < sortedStopTimes.length - 1; i++) {
    const stopTimeA = sortedStopTimes[i];
    const stopTimeB = sortedStopTimes[i + 1];
    
    // Find the actual stop data
    const stopA = stops.find(s => s.stop_id === stopTimeA.stop_id);
    const stopB = stops.find(s => s.stop_id === stopTimeB.stop_id);
    
    if (!stopA || !stopB) continue;
    
    const stopAPosition = { lat: stopA.stop_lat, lon: stopA.stop_lon };
    const stopBPosition = { lat: stopB.stop_lat, lon: stopB.stop_lon };
    
    // Project both stops to route shape
    const stopAProjection = projectPointToShape(stopAPosition, routeShape);
    const stopBProjection = projectPointToShape(stopBPosition, routeShape);
    
    // Check if vehicle projection is between these two stop projections
    const isVehicleBetweenStops = isProjectionBetween(
      vehicleProjection,
      stopAProjection,
      stopBProjection,
      routeShape
    );
    
    if (isVehicleBetweenStops) {
      const confidence = calculateSegmentConfidence(vehicleProjection, stopAProjection, stopBProjection);
      
      if (!bestSegment || confidence > bestSegment.confidence) {
        bestSegment = {
          previousStop: stopTimeA,
          nextStop: stopTimeB,
          confidence
        };
      }
    }
  }
  
  if (bestSegment) {
    return {
      projectionPoint: vehicleProjection.closestPoint,
      segmentBetweenStops: {
        previousStop: bestSegment.previousStop,
        nextStop: bestSegment.nextStop
      },
      confidence: bestSegment.confidence > 0.7 ? 'high' : 'medium',
      method: 'route_projection'
    };
  }
  
  // No clear segment identified
  return {
    projectionPoint: vehicleProjection.closestPoint,
    segmentBetweenStops: null,
    confidence: 'low',
    method: 'route_projection'
  };
}

/**
 * Estimate vehicle progress using stop-to-stop GPS segments (fallback)
 */
export function estimateVehicleProgressWithStops(
  vehicle: TranzyVehicleResponse,
  tripStopTimes: TranzyStopTimeResponse[],
  stops: TranzyStopResponse[]
): VehicleProgressEstimation {
  const vehiclePosition = { lat: vehicle.latitude, lon: vehicle.longitude };
  
  // Use already sorted stop times (no need to re-sort)
  const sortedStopTimes = tripStopTimes;
  
  if (sortedStopTimes.length < 2) {
    return {
      projectionPoint: vehiclePosition,
      segmentBetweenStops: null,
      confidence: 'low',
      method: 'stop_segments'
    };
  }
  
  // Find the segment with minimum sum of distances to both endpoints
  let bestSegment: { previousStop: TranzyStopTimeResponse; nextStop: TranzyStopTimeResponse; totalDistance: number } | null = null;
  
  for (let i = 0; i < sortedStopTimes.length - 1; i++) {
    const stopTimeA = sortedStopTimes[i];
    const stopTimeB = sortedStopTimes[i + 1];
    
    // Find the actual stop data
    const stopA = stops.find(s => s.stop_id === stopTimeA.stop_id);
    const stopB = stops.find(s => s.stop_id === stopTimeB.stop_id);
    
    if (!stopA || !stopB) continue;
    
    const stopAPosition = { lat: stopA.stop_lat, lon: stopA.stop_lon };
    const stopBPosition = { lat: stopB.stop_lat, lon: stopB.stop_lon };
    
    const distanceToA = calculateDistance(vehiclePosition, stopAPosition);
    const distanceToB = calculateDistance(vehiclePosition, stopBPosition);
    const totalDistance = distanceToA + distanceToB;
    
    if (!bestSegment || totalDistance < bestSegment.totalDistance) {
      bestSegment = {
        previousStop: stopTimeA,
        nextStop: stopTimeB,
        totalDistance
      };
    }
  }
  
  if (bestSegment) {
    // Verify the vehicle is reasonably close to the segment
    const stopA = stops.find(s => s.stop_id === bestSegment.previousStop.stop_id);
    const stopB = stops.find(s => s.stop_id === bestSegment.nextStop.stop_id);
    
    if (stopA && stopB) {
      const stopAPosition = { lat: stopA.stop_lat, lon: stopA.stop_lon };
      const stopBPosition = { lat: stopB.stop_lat, lon: stopB.stop_lon };
      
      const segmentLength = calculateDistance(stopAPosition, stopBPosition);
      
      // If sum of distances is much larger than segment length, vehicle might be off-route
      const tolerance = 0.5; // 50% tolerance
      const isReasonablyClose = bestSegment.totalDistance <= segmentLength * (1 + tolerance);
      
      return {
        projectionPoint: vehiclePosition,
        segmentBetweenStops: {
          previousStop: bestSegment.previousStop,
          nextStop: bestSegment.nextStop
        },
        confidence: isReasonablyClose ? 'medium' : 'low',
        method: 'stop_segments'
      };
    }
  }
  
  // No clear segment identified
  return {
    projectionPoint: vehiclePosition,
    segmentBetweenStops: null,
    confidence: 'low',
    method: 'stop_segments'
  };
}