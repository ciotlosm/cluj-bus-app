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