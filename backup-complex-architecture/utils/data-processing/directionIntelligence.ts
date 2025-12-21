import type { Coordinates, BusInfo, UserConfig } from '../../types';
import { calculateBearing, findClosestCoordinate } from '../formatting/locationUtils';
import { validateCoordinates } from '../../stores/locationStore';

/**
 * Direction intelligence utilities for determining bus directions
 * based on user locations and route endpoints
 */

export interface RouteEndpoint {
  id: string;
  name: string;
  coordinates: Coordinates;
  isTerminal?: boolean;
}

export interface StationMetadata {
  stationId: string;
  direction?: 'inbound' | 'outbound' | 'northbound' | 'southbound' | 'eastbound' | 'westbound';
  destinationName?: string;
  routeEndpoints?: RouteEndpoint[];
}

export type DirectionClassification = 'work' | 'home' | 'unknown';

/**
 * Classifies bus direction based on user locations and route endpoints
 */
export const classifyBusDirection = (
  bus: BusInfo,
  userConfig: UserConfig,
  calculateDistance: (from: Coordinates, to: Coordinates) => number,
  routeEndpoints?: RouteEndpoint[]
): DirectionClassification => {
  if (!userConfig.homeLocation || !userConfig.workLocation) {
    return 'unknown';
  }

  if (!validateCoordinates(userConfig.homeLocation) || !validateCoordinates(userConfig.workLocation)) {
    return 'unknown';
  }

  // If we have route endpoints, use them for more accurate classification
  if (routeEndpoints && routeEndpoints.length >= 2) {
    return classifyByRouteEndpoints(bus, userConfig, calculateDistance, routeEndpoints);
  }

  // Fallback to station-based classification
  return classifyByStationProximity(bus, userConfig, calculateDistance);
};

/**
 * Classifies direction based on route endpoints
 */
const classifyByRouteEndpoints = (
  bus: BusInfo,
  userConfig: UserConfig,
  calculateDistance: (from: Coordinates, to: Coordinates) => number,
  routeEndpoints: RouteEndpoint[]
): DirectionClassification => {
  // Find the closest endpoint to home and work locations
  const homeClosest = findClosestCoordinate(
    userConfig.homeLocation,
    routeEndpoints.map(ep => ep.coordinates),
    calculateDistance
  );

  const workClosest = findClosestCoordinate(
    userConfig.workLocation,
    routeEndpoints.map(ep => ep.coordinates),
    calculateDistance
  );

  if (!homeClosest || !workClosest) {
    return 'unknown';
  }

  // Determine which endpoint the bus is heading towards
  // This is a simplified approach - in reality, we'd need more route data
  const busStationToHome = calculateDistance(bus.station.coordinates, userConfig.homeLocation);
  const busStationToWork = calculateDistance(bus.station.coordinates, userConfig.workLocation);

  // If the bus station is closer to home and the closest endpoint to work is farther,
  // the bus is likely going to work
  if (busStationToHome < busStationToWork && workClosest.distance > homeClosest.distance) {
    return 'work';
  }

  // If the bus station is closer to work and the closest endpoint to home is farther,
  // the bus is likely going home
  if (busStationToWork < busStationToHome && homeClosest.distance > workClosest.distance) {
    return 'home';
  }

  return 'unknown';
};

/**
 * Classifies direction based on station proximity to user locations
 */
const classifyByStationProximity = (
  bus: BusInfo,
  userConfig: UserConfig,
  calculateDistance: (from: Coordinates, to: Coordinates) => number
): DirectionClassification => {
  const distanceToHome = calculateDistance(bus.station.coordinates, userConfig.homeLocation);
  const distanceToWork = calculateDistance(bus.station.coordinates, userConfig.workLocation);

  // Simple heuristic: if station is much closer to one location, 
  // assume buses go towards the other location
  const threshold = 0.5; // 500 meters difference threshold

  if (Math.abs(distanceToHome - distanceToWork) < threshold) {
    return 'unknown'; // Too close to determine
  }

  // If station is closer to home, buses likely go to work
  if (distanceToHome < distanceToWork) {
    return 'work';
  }

  // If station is closer to work, buses likely go home
  return 'home';
};

/**
 * Integrates station metadata for improved direction accuracy
 */
export const integrateStationMetadata = (
  bus: BusInfo,
  userConfig: UserConfig,
  metadata: StationMetadata,
  calculateDistance: (from: Coordinates, to: Coordinates) => number
): DirectionClassification => {
  // Start with basic classification
  let classification = classifyBusDirection(bus, userConfig, calculateDistance, metadata.routeEndpoints);

  // Use directional metadata to refine classification
  if (metadata.direction && classification === 'unknown') {
    classification = refineWithDirectionalMetadata(bus, userConfig, metadata, calculateDistance);
  }

  // Use destination name if available
  if (metadata.destinationName && classification === 'unknown') {
    classification = refineWithDestinationName(bus, userConfig, metadata.destinationName);
  }

  return classification;
};

/**
 * Refines classification using directional metadata (inbound/outbound, compass directions)
 */
const refineWithDirectionalMetadata = (
  bus: BusInfo,
  userConfig: UserConfig,
  metadata: StationMetadata,
  calculateDistance: (from: Coordinates, to: Coordinates) => number
): DirectionClassification => {
  if (!metadata.direction) {
    return 'unknown';
  }

  // For inbound/outbound, we need to determine what "inbound" means for this route
  if (metadata.direction === 'inbound' || metadata.direction === 'outbound') {
    // This is route-specific and would need additional context
    // For now, return unknown as we can't determine without more data
    return 'unknown';
  }

  // For compass directions, use bearing analysis
  const homeBearing = calculateBearing(bus.station.coordinates, userConfig.homeLocation);
  const workBearing = calculateBearing(bus.station.coordinates, userConfig.workLocation);

  const directionBearing = getDirectionBearing(metadata.direction);
  if (directionBearing === null) {
    return 'unknown';
  }

  // Check which user location aligns better with the metadata direction
  const homeBearingDiff = Math.abs(normalizeAngle(homeBearing - directionBearing));
  const workBearingDiff = Math.abs(normalizeAngle(workBearing - directionBearing));

  // Allow for 45-degree tolerance
  const tolerance = 45;

  if (homeBearingDiff <= tolerance && workBearingDiff > tolerance) {
    return 'home';
  }

  if (workBearingDiff <= tolerance && homeBearingDiff > tolerance) {
    return 'work';
  }

  return 'unknown';
};

/**
 * Refines classification using destination name matching
 */
const refineWithDestinationName = (
  bus: BusInfo,
  userConfig: UserConfig,
  destinationName: string
): DirectionClassification => {
  const destination = destinationName.toLowerCase();
  
  // Simple keyword matching - in reality, this would be more sophisticated
  const workKeywords = ['downtown', 'city', 'center', 'business', 'office', 'station'];
  const homeKeywords = ['residential', 'suburb', 'mall', 'shopping', 'park'];

  const hasWorkKeywords = workKeywords.some(keyword => destination.includes(keyword));
  const hasHomeKeywords = homeKeywords.some(keyword => destination.includes(keyword));

  if (hasWorkKeywords && !hasHomeKeywords) {
    return 'work';
  }

  if (hasHomeKeywords && !hasWorkKeywords) {
    return 'home';
  }

  return 'unknown';
};

/**
 * Converts compass direction to bearing in degrees
 */
const getDirectionBearing = (direction: string): number | null => {
  switch (direction) {
    case 'northbound':
      return 0;
    case 'eastbound':
      return 90;
    case 'southbound':
      return 180;
    case 'westbound':
      return 270;
    default:
      return null;
  }
};

/**
 * Normalizes angle to -180 to 180 range
 */
const normalizeAngle = (angle: number): number => {
  while (angle > 180) {
    angle -= 360;
  }
  while (angle < -180) {
    angle += 360;
  }
  return angle;
};

/**
 * Validates route endpoints
 */
export const validateRouteEndpoints = (endpoints: RouteEndpoint[]): boolean => {
  if (!Array.isArray(endpoints) || endpoints.length === 0) {
    return false;
  }

  return endpoints.every(endpoint => 
    endpoint.id &&
    endpoint.name &&
    validateCoordinates(endpoint.coordinates)
  );
};

/**
 * Validates station metadata
 */
export const validateStationMetadata = (metadata: StationMetadata): boolean => {
  if (!metadata.stationId) {
    return false;
  }

  if (metadata.routeEndpoints && !validateRouteEndpoints(metadata.routeEndpoints)) {
    return false;
  }

  const validDirections = ['inbound', 'outbound', 'northbound', 'southbound', 'eastbound', 'westbound'];
  if (metadata.direction && !validDirections.includes(metadata.direction)) {
    return false;
  }

  return true;
};

/**
 * Geographic routing validation using coordinate analysis
 */
export const validateDirectionWithGeography = (
  bus: BusInfo,
  userConfig: UserConfig,
  calculateDistance: (from: Coordinates, to: Coordinates) => number,
  routeEndpoints?: RouteEndpoint[]
): { isValid: boolean; confidence: number; suggestedDirection?: DirectionClassification } => {
  if (!routeEndpoints || routeEndpoints.length < 2) {
    return { isValid: false, confidence: 0 };
  }

  // Calculate distances from bus station to all endpoints
  const endpointDistances = routeEndpoints.map(endpoint => ({
    endpoint,
    distance: calculateDistance(bus.station.coordinates, endpoint.coordinates),
  }));

  // Find closest and farthest endpoints
  const sortedByDistance = endpointDistances.sort((a, b) => a.distance - b.distance);
  const closestEndpoint = sortedByDistance[0];
  const farthestEndpoint = sortedByDistance[sortedByDistance.length - 1];

  // Calculate distances from user locations to endpoints
  const homeToClosest = calculateDistance(userConfig.homeLocation, closestEndpoint.endpoint.coordinates);
  const homeToFarthest = calculateDistance(userConfig.homeLocation, farthestEndpoint.endpoint.coordinates);
  const workToClosest = calculateDistance(userConfig.workLocation, closestEndpoint.endpoint.coordinates);
  const workToFarthest = calculateDistance(userConfig.workLocation, farthestEndpoint.endpoint.coordinates);

  // Determine which endpoint is closer to which user location
  let suggestedDirection: DirectionClassification = 'unknown';
  let confidence = 0;

  // If the bus is at a station closer to one endpoint, it's likely going to the other
  const distanceThreshold = 1.0; // 1km threshold for meaningful difference

  if (Math.abs(homeToClosest - workToClosest) > distanceThreshold) {
    if (homeToClosest < workToClosest) {
      // Closest endpoint is near home, so buses likely go to work
      suggestedDirection = 'work';
      confidence = Math.min(0.9, (workToClosest - homeToClosest) / workToClosest);
    } else {
      // Closest endpoint is near work, so buses likely go home
      suggestedDirection = 'home';
      confidence = Math.min(0.9, (homeToClosest - workToClosest) / homeToClosest);
    }
  }

  // Cross-validate with farthest endpoint
  if (suggestedDirection !== 'unknown' && Math.abs(homeToFarthest - workToFarthest) > distanceThreshold) {
    const farthestSuggestion = homeToFarthest > workToFarthest ? 'work' : 'home';
    if (farthestSuggestion === suggestedDirection) {
      confidence = Math.min(0.95, confidence + 0.2); // Boost confidence if both endpoints agree
    } else {
      confidence = Math.max(0.1, confidence - 0.3); // Reduce confidence if endpoints disagree
    }
  }

  return {
    isValid: confidence > 0.5,
    confidence,
    suggestedDirection: confidence > 0.5 ? suggestedDirection : undefined,
  };
};

/**
 * Enhanced classification with geographic validation
 */
export const classifyBusDirectionWithValidation = (
  bus: BusInfo,
  userConfig: UserConfig,
  calculateDistance: (from: Coordinates, to: Coordinates) => number,
  routeEndpoints?: RouteEndpoint[]
): { direction: DirectionClassification; confidence: number; method: string } => {
  // Start with basic classification
  const basicDirection = classifyBusDirection(bus, userConfig, calculateDistance, routeEndpoints);
  
  // Validate with geographic analysis if endpoints are available
  if (routeEndpoints && routeEndpoints.length >= 2) {
    const validation = validateDirectionWithGeography(bus, userConfig, calculateDistance, routeEndpoints);
    
    if (validation.isValid && validation.suggestedDirection) {
      return {
        direction: validation.suggestedDirection,
        confidence: validation.confidence,
        method: 'geographic_validation',
      };
    }
  }

  // Return basic classification with lower confidence
  return {
    direction: basicDirection,
    confidence: basicDirection === 'unknown' ? 0 : 0.6,
    method: 'basic_proximity',
  };
};

/**
 * Batch classifies multiple buses
 */
export const classifyBuses = (
  buses: BusInfo[],
  userConfig: UserConfig,
  calculateDistance: (from: Coordinates, to: Coordinates) => number,
  metadataMap?: Map<string, StationMetadata>
): BusInfo[] => {
  return buses.map(bus => {
    const metadata = metadataMap?.get(bus.station.id);
    
    const direction = metadata
      ? integrateStationMetadata(bus, userConfig, metadata, calculateDistance)
      : classifyBusDirection(bus, userConfig, calculateDistance);

    return {
      ...bus,
      direction,
    };
  });
};