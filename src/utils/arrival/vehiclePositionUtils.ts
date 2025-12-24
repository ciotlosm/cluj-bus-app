/**
 * Vehicle Position Utilities
 * GPS-based logic for determining vehicle position relative to stops using route shapes and position analysis
 */

import { calculateDistance } from '../location/distanceUtils.ts';
import { projectPointToShape } from './distanceUtils.ts';
import type { 
  TranzyVehicleResponse, 
  TranzyStopResponse, 
  TranzyTripResponse, 
  TranzyStopTimeResponse, 
  Coordinates,
  RouteShape,
  ProjectionResult
} from '../../types/arrivalTime.ts';

/**
 * Determine the next stop for a vehicle using GPS position and route shape analysis
 * Enhanced implementation that considers vehicle's actual position along the route
 */
export function determineNextStop(
  vehicle: TranzyVehicleResponse,
  trips: TranzyTripResponse[],
  stopTimes: TranzyStopTimeResponse[],
  stops: TranzyStopResponse[],
  routeShape?: RouteShape
): TranzyStopResponse | null {
  if (!vehicle.trip_id) return null;
  
  // Get stop times for this trip, sorted by sequence
  const tripStopTimes = stopTimes
    .filter(st => st.trip_id === vehicle.trip_id)
    .sort((a, b) => a.stop_sequence - b.stop_sequence);

  if (tripStopTimes.length === 0) return null;

  // If no route shape available, fall back to simplified logic
  if (!routeShape || routeShape.segments.length === 0) {
    return determineNextStopSimple(tripStopTimes, stops);
  }

  // Use GPS-based analysis with route shape
  const gpsBasedNextStop = determineNextStopWithGPS(vehicle, tripStopTimes, stops, routeShape);
  
  // CRITICAL: Validate that the GPS-detected stop is actually in this trip
  if (gpsBasedNextStop) {
    const isStopInTrip = tripStopTimes.some(st => st.stop_id === gpsBasedNextStop.stop_id);
    if (isStopInTrip) {
      return gpsBasedNextStop;
    } else {
      // GPS detected a stop that's not in this trip - this indicates GPS error
      console.warn(`GPS detected stop ${gpsBasedNextStop.stop_id} not in trip ${vehicle.trip_id} - using fallback`);
    }
  }
  
  // GPS failed or returned invalid stop - use intelligent fallback
  return determineNextStopIntelligentFallback(vehicle, tripStopTimes, stops);
}

/**
 * Fallback method when route shape is not available
 * Uses the original simplified logic
 */
function determineNextStopSimple(
  tripStopTimes: TranzyStopTimeResponse[],
  stops: TranzyStopResponse[]
): TranzyStopResponse | null {
  // Assume the first stop in sequence is the next stop
  const nextStopTime = tripStopTimes[0];
  return stops.find(s => s.stop_id === nextStopTime.stop_id) || null;
}

/**
 * GPS-based method using route shape analysis
 * Determines which stops have been passed based on vehicle position
 */
function determineNextStopWithGPS(
  vehicle: TranzyVehicleResponse,
  tripStopTimes: TranzyStopTimeResponse[],
  stops: TranzyStopResponse[],
  routeShape: RouteShape
): TranzyStopResponse | null {
  const vehiclePosition: Coordinates = { 
    lat: vehicle.latitude, 
    lon: vehicle.longitude 
  };

  // Project vehicle position onto route shape
  const vehicleProjection = projectPointToShape(vehiclePosition, routeShape);
  
  // If vehicle is too far from route (>200m), fall back to simple method
  if (vehicleProjection.distanceToShape > 200) {
    return determineNextStopSimple(tripStopTimes, stops);
  }

  // Calculate position along route for each stop and find the next unvisited one
  const stopsWithPositions = tripStopTimes
    .map(stopTime => {
      const stop = stops.find(s => s.stop_id === stopTime.stop_id);
      if (!stop) return null;

      const stopPosition: Coordinates = { 
        lat: stop.stop_lat, 
        lon: stop.stop_lon 
      };
      const stopProjection = projectPointToShape(stopPosition, routeShape);
      
      return {
        stop,
        stopTime,
        projection: stopProjection,
        routePosition: calculateRoutePosition(stopProjection, routeShape)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a!.routePosition - b!.routePosition);

  if (stopsWithPositions.length === 0) {
    return determineNextStopSimple(tripStopTimes, stops);
  }

  // Calculate vehicle's position along the route
  const vehicleRoutePosition = calculateRoutePosition(vehicleProjection, routeShape);

  // Find the first stop that's ahead of the vehicle
  const nextStopData = stopsWithPositions.find(stopData => 
    stopData!.routePosition > vehicleRoutePosition
  );

  // If no stop is ahead, vehicle might be past all stops or at the end
  if (!nextStopData) {
    // Check if vehicle is very close to the last stop (within 100m)
    const lastStop = stopsWithPositions[stopsWithPositions.length - 1];
    if (lastStop && vehicleProjection.distanceToShape < 100) {
      const distanceToLastStop = calculateDistance(
        vehiclePosition,
        { lat: lastStop.stop.stop_lat, lon: lastStop.stop.stop_lon }
      );
      
      // If very close to last stop, consider it the next stop
      if (distanceToLastStop < 100) {
        return lastStop.stop;
      }
    }
    
    // Vehicle is past all stops - return null to indicate this
    return null;
  }

  return nextStopData.stop;
}

/**
 * Intelligent fallback when GPS-based detection fails
 * Uses distance-based analysis to find the closest upcoming stop
 */
function determineNextStopIntelligentFallback(
  vehicle: TranzyVehicleResponse,
  tripStopTimes: TranzyStopTimeResponse[],
  stops: TranzyStopResponse[]
): TranzyStopResponse | null {
  const vehiclePosition: Coordinates = { 
    lat: vehicle.latitude, 
    lon: vehicle.longitude 
  };

  // Calculate distance to each stop in the trip
  const stopsWithDistances = tripStopTimes
    .map(stopTime => {
      const stop = stops.find(s => s.stop_id === stopTime.stop_id);
      if (!stop) return null;

      const stopPosition: Coordinates = { 
        lat: stop.stop_lat, 
        lon: stop.stop_lon 
      };
      const distance = calculateDistance(vehiclePosition, stopPosition);
      
      return {
        stop,
        stopTime,
        distance,
        sequence: stopTime.stop_sequence
      };
    })
    .filter(Boolean)
    .sort((a, b) => a!.distance - b!.distance); // Sort by distance

  if (stopsWithDistances.length === 0) return null;

  // Find the closest stop
  const closestStop = stopsWithDistances[0];
  
  // If vehicle is very close to the closest stop (within 100m), it's likely the next stop
  if (closestStop!.distance <= 100) {
    return closestStop!.stop;
  }
  
  // If vehicle is far from all stops, find the stop with the lowest sequence number
  // This handles cases where vehicle is between stops or at the beginning of route
  const earliestStop = stopsWithDistances
    .sort((a, b) => a!.sequence - b!.sequence)[0];
  
  return earliestStop!.stop;
}

/**
 * Calculate a stop's position along the route (0 = start, higher = further along)
 * Combines segment index and position within segment for accurate ordering
 */
function calculateRoutePosition(projection: ProjectionResult, routeShape: RouteShape): number {
  let position = 0;
  
  // Add distances of all segments before this one
  for (let i = 0; i < projection.segmentIndex; i++) {
    position += routeShape.segments[i].distance;
  }
  
  // Add partial distance within the current segment
  if (projection.segmentIndex < routeShape.segments.length) {
    const segmentDistance = routeShape.segments[projection.segmentIndex].distance;
    position += projection.positionAlongSegment * segmentDistance;
  }
  
  return position;
}