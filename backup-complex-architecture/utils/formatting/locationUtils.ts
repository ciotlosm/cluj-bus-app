import type { Coordinates } from '../../types';

/**
 * Utility functions for location-related operations
 */

/**
 * Validate if coordinates are valid
 */
const isValidCoordinates = (coords: Coordinates): boolean => {
  return (
    coords.latitude >= -90 &&
    coords.latitude <= 90 &&
    coords.longitude >= -180 &&
    coords.longitude <= 180
  );
};

/**
 * Format coordinates for display
 */
export const formatCoordinates = (coords: Coordinates, precision: number = 4): string => {
  if (!isValidCoordinates(coords)) {
    return 'Invalid coordinates';
  }
  return `${coords.latitude.toFixed(precision)}, ${coords.longitude.toFixed(precision)}`;
};

/**
 * Format coordinates for short display
 */
export const formatCoordinatesShort = (coords: Coordinates): string => {
  return `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
};

/**
 * Convert degrees to radians
 */
export const degreesToRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Convert radians to degrees
 */
export const radiansToDegrees = (radians: number): number => {
  return radians * (180 / Math.PI);
};

/**
 * Calculate bearing between two coordinates
 */
export const calculateBearing = (from: Coordinates, to: Coordinates): number => {
  if (!isValidCoordinates(from) || !isValidCoordinates(to)) {
    throw new Error('Invalid coordinates provided for bearing calculation');
  }

  const lat1 = degreesToRadians(from.latitude);
  const lat2 = degreesToRadians(to.latitude);
  const deltaLng = degreesToRadians(to.longitude - from.longitude);

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  const bearing = radiansToDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360; // Normalize to 0-360
};

/**
 * Bounding box interface
 */
export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Check if coordinates are within bounding box
 */
export const isWithinBounds = (coords: Coordinates, bounds: BoundingBox): boolean => {
  if (!isValidCoordinates(coords)) {
    return false;
  }

  return (
    coords.latitude >= bounds.south &&
    coords.latitude <= bounds.north &&
    coords.longitude >= bounds.west &&
    coords.longitude <= bounds.east
  );
};

/**
 * Create bounding box around center point
 */
export const createBoundingBox = (center: Coordinates, radiusKm: number): BoundingBox => {
  if (!isValidCoordinates(center)) {
    throw new Error('Invalid center coordinates provided');
  }

  if (radiusKm <= 0) {
    throw new Error('Radius must be positive');
  }

  // Approximate degrees per kilometer
  const latDegreesPerKm = 1 / 111.32;
  const lngDegreesPerKm = 1 / (111.32 * Math.cos(degreesToRadians(center.latitude)));

  const latOffset = radiusKm * latDegreesPerKm;
  const lngOffset = radiusKm * lngDegreesPerKm;

  return {
    north: Math.min(90, center.latitude + latOffset),
    south: Math.max(-90, center.latitude - latOffset),
    east: center.longitude + lngOffset,
    west: center.longitude - lngOffset,
  };
};

/**
 * Find closest coordinate result
 */
export interface ClosestCoordinateResult {
  coordinate: Coordinates;
  distance: number;
  index: number;
}

/**
 * Find closest coordinate from a list
 */
export const findClosestCoordinate = (
  target: Coordinates,
  coordinates: Coordinates[],
  calculateDistance: (from: Coordinates, to: Coordinates) => number
): ClosestCoordinateResult | null => {
  if (!isValidCoordinates(target) || coordinates.length === 0) {
    return null;
  }

  let closest: ClosestCoordinateResult | null = null;

  coordinates.forEach((coord, index) => {
    if (!isValidCoordinates(coord)) {
      return; // Skip invalid coordinates
    }

    const distance = calculateDistance(target, coord);

    if (closest === null || distance < closest.distance) {
      closest = {
        coordinate: coord,
        distance,
        index,
      };
    }
  });

  return closest;
};

/**
 * Check if two coordinates are equal within tolerance
 */
export const coordinatesEqual = (
  coord1: Coordinates,
  coord2: Coordinates,
  toleranceMeters: number = 10
): boolean => {
  if (!isValidCoordinates(coord1) || !isValidCoordinates(coord2)) {
    return false;
  }

  // Simple distance calculation for tolerance check
  const latDiff = Math.abs(coord1.latitude - coord2.latitude);
  const lngDiff = Math.abs(coord1.longitude - coord2.longitude);

  // Convert tolerance from meters to approximate degrees
  const toleranceDegrees = toleranceMeters / 111320; // Approximate meters per degree

  return latDiff <= toleranceDegrees && lngDiff <= toleranceDegrees;
};

/**
 * Normalize coordinates to valid ranges
 */
export const normalizeCoordinates = (coords: Coordinates): Coordinates => {
  if (coords.latitude < -90 || coords.latitude > 90) {
    throw new Error('Invalid coordinates provided');
  }

  let normalizedLng = coords.longitude;

  // Normalize longitude to -180 to 180 range
  while (normalizedLng > 180) {
    normalizedLng -= 360;
  }
  while (normalizedLng < -180) {
    normalizedLng += 360;
  }

  return {
    latitude: coords.latitude,
    longitude: normalizedLng,
  };
};

/**
 * Convert map click position to coordinates
 */
export const mapClickToCoordinates = (
  clickX: number,
  clickY: number,
  mapWidth: number,
  mapHeight: number,
  centerLat: number = 46.7712, // Cluj-Napoca center (Piața Unirii)
  centerLng: number = 23.6236
): Coordinates => {
  // Simple coordinate calculation with better scaling for Cluj area
  const latRange = 0.05; // Approximately 5.5km north-south
  const lngRange = 0.08; // Approximately 5.5km east-west
  
  const lat = centerLat + ((mapHeight / 2 - clickY) / mapHeight) * latRange;
  const lng = centerLng + ((clickX - mapWidth / 2) / mapWidth) * lngRange;
  
  return { latitude: lat, longitude: lng };
};

/**
 * Popular locations in Cluj-Napoca
 */
export const CLUJ_POPULAR_LOCATIONS = [
  { name: 'Piața Unirii', lat: 46.7712, lng: 23.6236 },
  { name: 'Gara CFR', lat: 46.7854, lng: 23.5986 },
  { name: 'Iulius Mall', lat: 46.7318, lng: 23.5644 },
  { name: 'FSEGA', lat: 46.7596, lng: 23.5847 },
  { name: 'Polus Center', lat: 46.8008, lng: 23.6267 },
  { name: 'The Office', lat: 46.7580, lng: 23.6050 },
] as const;

/**
 * Convert popular location to coordinates
 */
export const popularLocationToCoordinates = (locationName: string): Coordinates | null => {
  const location = CLUJ_POPULAR_LOCATIONS.find(loc => loc.name === locationName);
  if (!location) return null;
  
  return { latitude: location.lat, longitude: location.lng };
};

/**
 * Validate if coordinates are within Cluj-Napoca bounds (approximate)
 */
export const isWithinClujBounds = (coords: Coordinates): boolean => {
  const clujBounds = {
    north: 46.82,
    south: 46.72,
    east: 23.68,
    west: 23.55
  };
  
  return (
    coords.latitude >= clujBounds.south &&
    coords.latitude <= clujBounds.north &&
    coords.longitude >= clujBounds.west &&
    coords.longitude <= clujBounds.east
  );
};

/**
 * Get effective location with fallback priority:
 * 1. Current GPS location
 * 2. Home location
 * 3. Work location  
 * 4. Default/fallback location
 * 5. Cluj-Napoca center as final fallback
 */
export const getEffectiveLocation = (
  currentLocation: Coordinates | null,
  homeLocation?: Coordinates,
  workLocation?: Coordinates,
  defaultLocation?: Coordinates
): Coordinates | null => {
  // Priority 1: Current GPS location
  if (currentLocation && isValidCoordinates(currentLocation)) {
    return currentLocation;
  }

  // Priority 2: Home location
  if (homeLocation && isValidCoordinates(homeLocation)) {
    return homeLocation;
  }

  // Priority 3: Work location
  if (workLocation && isValidCoordinates(workLocation)) {
    return workLocation;
  }

  // Priority 4: Default/fallback location
  if (defaultLocation && isValidCoordinates(defaultLocation)) {
    return defaultLocation;
  }

  // Priority 5: Cluj-Napoca center as final fallback
  const clujCenter: Coordinates = { latitude: 46.7712, longitude: 23.6236 };
  return clujCenter;
};