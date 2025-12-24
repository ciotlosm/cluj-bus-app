/**
 * Station Display Utilities
 * Formatting and display helpers for station UI components
 */

/**
 * Format distance for display
 */
export const formatDistance = (distance: number): string => {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }
  return `${(distance / 1000).toFixed(1)}km`;
};

/**
 * Get Material-UI color for station type
 */
export const getStationTypeColor = (stationType: 'primary' | 'secondary' | 'all'): 'primary' | 'secondary' | 'default' => {
  if (stationType === 'primary') return 'primary';
  if (stationType === 'secondary') return 'secondary';
  return 'default';
};

/**
 * Get display label for station type
 */
export const getStationTypeLabel = (stationType: 'primary' | 'secondary' | 'all'): string => {
  if (stationType === 'primary') return 'Closest';
  if (stationType === 'secondary') return 'Nearby';
  return ''; // No label for filtered view
};

/**
 * Get readable station type name for display
 * Moved from StationLayer component for reusability
 */
export const getStationTypeName = (type: 'default' | 'user-location' | 'terminus' | 'nearby'): string => {
  switch (type) {
    case 'user-location':
      return 'User Location';
    case 'terminus':
      return 'Terminus';
    case 'nearby':
      return 'Nearby Station';
    case 'default':
    default:
      return 'Transit Stop';
  }
};

/**
 * Get location type description for GTFS location types
 * Moved from StationLayer component for reusability
 */
export const getLocationTypeDescription = (locationType: number): string => {
  switch (locationType) {
    case 0:
      return 'Stop/Platform';
    case 1:
      return 'Station';
    case 2:
      return 'Station Entrance/Exit';
    case 3:
      return 'Generic Node';
    case 4:
      return 'Boarding Area';
    default:
      return 'Transit Location';
  }
};